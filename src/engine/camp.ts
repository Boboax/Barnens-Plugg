import type { Household } from '../domain/types'
import { campPets } from '../domain/pet-home'
import { CAMP_CATALOG, CAMP_POINTS, OUTFITS, campItems } from '../domain/camp'
import { homeSecondsLeft } from './pet-home'
export type CampAction =
 | {type:'buy';itemId:string;purchaseId:string}
 | {type:'place';instanceId:string;point?:string}
 | {type:'rename';petId:string;name:string}
 | {type:'bed';petId:string;point:string}
 | {type:'outfit';outfitId:string}

/** Alla lägerändringar görs atomiskt och behåller äldre sparade fält. */
export function changeCamp(h:Household,childId:string,action:CampAction,at:Date):Household {
 const child=h.children.find(c=>c.id===childId), p=child?.petProgress
 if(!p || !campPets(p).length || homeSecondsLeft(h,childId,at)<=0) return h
 const items=campItems(h.petHome)
 const home={owned:{},equipped:{},...h.petHome,items}
 const updateChild=(patch:Partial<typeof p>)=>({...h,children:h.children.map(c=>c.id===childId?{...c,updatedAt:at.toISOString(),petProgress:{...p,...patch}}:c)})
 if(action.type==='buy') {
  const item=CAMP_CATALOG.find(f=>f.id===action.itemId)
  if(!item||p.coins<item.price||!action.purchaseId||items.some(i=>i.id===action.purchaseId))return h
  return {...updateChild({coins:p.coins-item.price}),petHome:{...home,items:[...items,{id:action.purchaseId,itemId:item.id,childId,boughtAt:at.toISOString()}]}}
 }
 if(action.type==='place') {
  const owned=items.find(i=>i.id===action.instanceId)
  const item=CAMP_CATALOG.find(f=>f.id===owned?.itemId)
  const point=CAMP_POINTS.find(s=>s.id===action.point)
  if(!owned||!item||(action.point&&(!point||point.kind!==item.kind||items.some(i=>i.id!==owned.id&&i.point===point.id))))return h
  return {...h,petHome:{...home,items:items.map(i=>i.id===owned.id?{...i,point:action.point}:i)}}
 }
 if(action.type==='rename'||action.type==='bed') {
  const pets=campPets(p),pet=pets.find(v=>v.id===action.petId)
  if(!pet)return h
  if(action.type==='rename') {
   const name=action.name.trim().slice(0,24)
   if(!name)return h
   return updateChild({pets:pets.map(v=>v.id===pet.id?{...v,name}:v),...(pet.id===pets[0].id&&p.pet?{pet:{...p.pet,name}}:{})})
  }
  if(!CAMP_POINTS.some(s=>s.id===action.point&&s.kind==='bed'))return h
  const occupied=pets.find(v=>v.id!==pet.id&&v.bedPoint===action.point)
  return updateChild({pets:pets.map(v=>v.id===pet.id?{...v,bedPoint:action.point}:v.id===occupied?.id?{...v,bedPoint:pet.bedPoint}:v)})
 }
 const outfit=OUTFITS.find(o=>o.id===action.outfitId)
 if(!outfit)return h
 const owned=p.outfits??['traveller']
 const price=owned.includes(outfit.id)?0:outfit.price
 if(p.coins<price)return h
 return updateChild({coins:p.coins-price,outfit:outfit.id,outfits:Array.from(new Set([...owned,outfit.id]))})
}

