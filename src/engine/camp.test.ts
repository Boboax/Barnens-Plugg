import {describe,it,expect} from 'vitest'
import type {Household} from '../domain/types'
import {campItems, campItemsForChild, equippedWeapon, visibleOutfits, visibleWeapons} from '../domain/camp'
import {campPets} from '../domain/pet-home'
import {changeCamp} from './camp'
import {completePetPractice,adoptPet} from './pet-home'
import {migrate} from '../storage/db'
const at=new Date(2026,8,9,15)
const fixture=():Household=>({schemaVersion:1,rewards:[],chatLog:[],children:[{id:'a',name:'A',color:'#446633',birthYear:2018,schoolYear:'2',createdAt:at.toISOString(),skills:{},answers:[],diagnosis:{done:true,passesDone:1,passesTotal:1,probes:[]},dailyLimitMinutes:20,usageSeconds:{},chatEnabled:false,streak:{days:0,lastActiveDate:''},seenWorlds:['monsterskogen'],petProgress:{coins:200,lastPracticeDay:'2026-09-09',pet:{name:'Mossa',species:'woodland-frog',foundAt:'2026-09-08T15:00:00.000Z'}}}]})
describe('lägrets samlingar',()=>{
 it('sparar omsorg för äldre husdjur utan att debitera mynt eller ändra skolarbetet',()=>{
  const h=fixture()
  let next=changeCamp(h,'a',{type:'care',petId:'first-pet',activity:'feed'},at)
  next=changeCamp(next,'a',{type:'care',petId:'first-pet',activity:'pet'},at)
  const reloaded=migrate(JSON.parse(JSON.stringify(next)))
  expect(campPets(reloaded.children[0].petProgress)[0]).toMatchObject({name:'Mossa',care:{lastFedAt:at.toISOString(),lastPettedAt:at.toISOString()}})
  expect(next.children[0].petProgress?.coins).toBe(200)
  expect(next.children[0].skills).toBe(h.children[0].skills)
  expect(next.children[0].answers).toBe(h.children[0].answers)
  expect(next.children[0].petProgress?.pet).toEqual(h.children[0].petProgress?.pet)
 })
 it('låter ett valt djur vila tills det väcks och behåller övriga djurs omsorg',()=>{
  const h=fixture()
  h.children[0].petProgress!.pets=[...campPets(h.children[0].petProgress),{id:'fox',name:'Saffran',species:'dune-fox',foundAt:'old',care:{lastFedAt:'old'}}]
  let next=changeCamp(h,'a',{type:'care',petId:'first-pet',activity:'rest'},at)
  next=migrate(JSON.parse(JSON.stringify(next)))
  expect(campPets(next.children[0].petProgress)[0].care?.resting).toBe(true)
  expect(changeCamp(next,'a',{type:'care',petId:'first-pet',activity:'feed'},at)).toBe(next)
  expect(changeCamp(next,'a',{type:'care',petId:'first-pet',activity:'pet'},at)).toBe(next)
  next=changeCamp(next,'a',{type:'care',petId:'first-pet',activity:'wake'},at)
  expect(campPets(next.children[0].petProgress)[0].care?.resting).toBe(false)
  expect(campPets(next.children[0].petProgress)[1].care).toEqual({lastFedAt:'old'})
 })
 it('nekar omsorg för saknade djur och när besökstiden är slut',()=>{
  const h=fixture()
  expect(changeCamp(h,'a',{type:'care',petId:'missing',activity:'feed'},at)).toBe(h)
  h.children[0].petProgress!.visit={day:'2026-09-09',seconds:180}
  for(const activity of ['feed','pet','rest','wake'] as const)expect(changeCamp(h,'a',{type:'care',petId:'first-pet',activity},at)).toBe(h)
 })
 it('bevarar äldre djur och möbler vid första ändringen och omladdning',()=>{
  const h=fixture();h.petHome={owned:{'fern-bed':{childId:'a',boughtAt:'old'}},equipped:{bed:'fern-bed'}}
  expect(campPets(h.children[0].petProgress)[0].name).toBe('Mossa')
  const next=changeCamp(h,'a',{type:'buy',itemId:'camp-lantern',purchaseId:'light'},at)
  expect(campItems(next.petHome)).toHaveLength(2)
  expect(campItems(next.petHome)[0]).toMatchObject({id:'legacy-fern-bed',point:'bed-1'})
  const reloaded=migrate(JSON.parse(JSON.stringify(next)))
  expect(reloaded.petHome).toEqual(next.petHome)
  expect(reloaded.children[0].petProgress?.coins).toBe(160)
 })
 it('kan äga två bäddar men samma köp-id debiteras aldrig två gånger',()=>{
  const h=fixture();h.children[0].petProgress!.pets=[...campPets(h.children[0].petProgress),{id:'fox',name:'Saffran',species:'dune-fox',foundAt:'old'}]
  const action={type:'buy',itemId:'fern-bed',purchaseId:'one'} as const
  const once=changeCamp(h,'a',action,at)
  expect(changeCamp(once,'a',action,at)).toBe(once)
  const twice=changeCamp(once,'a',{...action,purchaseId:'two'},at)
  expect(campItems(twice.petHome).map(i=>i.itemId)).toEqual(['fern-bed','fern-bed'])
  expect(twice.children[0].petProgress?.coins).toBe(120)
 })
 it('placerar kompatibelt, nekar upptagna platser och packar undan utan att förlora saker',()=>{
  let h=fixture();h.children[0].petProgress!.pets=[...campPets(h.children[0].petProgress),{id:'fox',name:'Saffran',species:'dune-fox',foundAt:'old'}]
  h=changeCamp(h,'a',{type:'buy',itemId:'fern-bed',purchaseId:'one'},at)
  h=changeCamp(h,'a',{type:'buy',itemId:'moon-bed',purchaseId:'two'},at)
  h=changeCamp(h,'a',{type:'place',instanceId:'one',point:'bed-1'},at)
  expect(changeCamp(h,'a',{type:'place',instanceId:'two',point:'bed-1'},at)).toBe(h)
  expect(changeCamp(h,'a',{type:'place',instanceId:'two',point:'light-1'},at)).toBe(h)
  h=changeCamp(h,'a',{type:'place',instanceId:'two',point:'bed-2'},at)
  h=changeCamp(h,'a',{type:'place',instanceId:'one'},at)
  expect(campItems(h.petHome)).toHaveLength(2)
  expect(campItems(h.petHome).find(i=>i.id==='two')?.point).toBe('bed-2')
 })
 it('hittar en ny art utan att ersätta tidigare vän och byter sovplatser atomiskt',()=>{
  let h=completePetPractice(fixture(),'a',8,8,new Date(2026,8,10,15),'brakberget')
  h=adoptPet(h,'a','Glimmer',new Date(2026,8,10,15))
  const pets=campPets(h.children[0].petProgress)
  expect(pets.map(p=>p.name)).toEqual(['Mossa','Glimmer'])
  expect(adoptPet(h,'a','Extra',new Date(2026,8,10,15))).toBe(h)
  h=changeCamp(h,'a',{type:'bed',petId:pets[1].id,point:'bed-1'},new Date(2026,8,10,15))
  expect(campPets(h.children[0].petProgress).map(p=>p.bedPoint)).toEqual(['bed-2','bed-1'])
 })
 it('behåller garderoben, debiterar ett plagg en gång och påverkar aldrig färdigheter',()=>{
  const h=fixture(),once=changeCamp(h,'a',{type:'outfit',outfitId:'starlight'},at)
  const twice=changeCamp(once,'a',{type:'outfit',outfitId:'starlight'},at)
  expect(twice.children[0].petProgress?.coins).toBe(120)
  expect(twice.children[0].skills).toBe(h.children[0].skills)
 })
 it('döljer och nekar låsta varor tills rätt framsteg eller husdjur finns',()=>{
  const h=fixture();h.children[0].seenWorlds=[]
  expect(changeCamp(h,'a',{type:'buy',itemId:'moon-bed',purchaseId:'locked'},at)).toBe(h)
  expect(visibleOutfits(h.children[0]).map(o=>o.id)).toEqual(['traveller','moss-companion'])
  expect(changeCamp(h,'a',{type:'outfit',outfitId:'crystal-companion'},at)).toBe(h)
  h.children[0].petProgress!.pets=[...campPets(h.children[0].petProgress),{id:'dragon',name:'Glimmer',species:'crystal-dragon',foundAt:'old'}]
  const next=changeCamp(h,'a',{type:'outfit',outfitId:'crystal-companion'},at)
  expect(next.children[0].petProgress).toMatchObject({coins:40,outfit:'crystal-companion'})
 })
 it('låter bara repeterbara saker köpas till sin gräns',()=>{
  let h=fixture()
  h=changeCamp(h,'a',{type:'buy',itemId:'sun-rug',purchaseId:'rug-1'},at)
  expect(changeCamp(h,'a',{type:'buy',itemId:'sun-rug',purchaseId:'rug-2'},at)).toBe(h)
  h=changeCamp(h,'a',{type:'buy',itemId:'camp-lantern',purchaseId:'lamp-1'},at)
  h=changeCamp(h,'a',{type:'buy',itemId:'camp-lantern',purchaseId:'lamp-2'},at)
  expect(changeCamp(h,'a',{type:'buy',itemId:'camp-lantern',purchaseId:'lamp-3'},at)).toBe(h)
 })
 it('håller syskons packningar och placeringar åtskilda',()=>{
  const h=fixture(),sibling={...h.children[0],id:'b',name:'B',petProgress:{...h.children[0].petProgress!,coins:200}}
  h.children.push(sibling)
  let next=changeCamp(h,'a',{type:'buy',itemId:'camp-lantern',purchaseId:'a-light'},at)
  next=changeCamp(next,'b',{type:'buy',itemId:'camp-lantern',purchaseId:'b-light'},at)
  next=changeCamp(next,'a',{type:'place',instanceId:'a-light',point:'light-1'},at)
  next=changeCamp(next,'b',{type:'place',instanceId:'b-light',point:'light-1'},at)
  expect(campItemsForChild(next.petHome,'a')).toMatchObject([{id:'a-light',point:'light-1'}])
  expect(campItemsForChild(next.petHome,'b')).toMatchObject([{id:'b-light',point:'light-1'}])
  expect(changeCamp(next,'a',{type:'place',instanceId:'b-light',point:'light-2'},at)).toBe(next)
 })
 it('döljer och nekar Spiralbågen innan Mönsterormen är besegrad',()=>{
  const h=fixture()
  expect(visibleWeapons(h.children[0]).map(weapon=>weapon.id)).toEqual(['standard-bow'])
  expect(changeCamp(h,'a',{type:'weapon',weaponId:'spiral-bow'},at)).toBe(h)
  expect(changeCamp(h,'a',{type:'weapon',weaponId:'standard-sword'},at)).toBe(h)
 })
 it('köper Spiralbågen en gång, utrustar gratis igen och behåller den efter omladdning',()=>{
  const h=fixture();h.children[0].conqueredWorlds=['monsterskogen'];h.children[0].petProgress!.coins=500
  expect(visibleWeapons(h.children[0]).map(weapon=>weapon.id)).toEqual(['standard-bow','spiral-bow'])
  const once=changeCamp(h,'a',{type:'weapon',weaponId:'spiral-bow'},at)
  expect(once.children[0].petProgress).toMatchObject({coins:280,weapon:'spiral-bow',weapons:['spiral-bow']})
  const twice=changeCamp(once,'a',{type:'weapon',weaponId:'spiral-bow'},at)
  expect(twice.children[0].petProgress?.coins).toBe(280)
  const reloaded=migrate(JSON.parse(JSON.stringify(twice)))
  expect(equippedWeapon(reloaded.children[0])).toBe('spiral-bow')
 })
 it('nekar ändringar efter besökstiden och utan tillräckligt med mynt',()=>{
  const h=fixture();h.children[0].petProgress!.coins=0
  expect(changeCamp(h,'a',{type:'buy',itemId:'camp-lantern',purchaseId:'x'},at)).toBe(h)
  h.children[0].petProgress!.coins=200;h.children[0].petProgress!.visit={day:'2026-09-09',seconds:180}
  expect(changeCamp(h,'a',{type:'outfit',outfitId:'starlight'},at)).toBe(h)
 })
})

