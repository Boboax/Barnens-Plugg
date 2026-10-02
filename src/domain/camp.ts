import type { ChildProfile } from './types'
import { FURNITURE, campPets, type PetHome, type CampItemInstance } from './pet-home'
export type CampKind = 'bed' | 'rug' | 'light' | 'toy' | 'storage'
export type CampUnlock =
 | { kind:'always' }
 | { kind:'pet-count'; count:number }
 | { kind:'pet-species'; species:string }
 | { kind:'world-seen'; worldId:string }
 | { kind:'world-conquered'; worldId:string }
export interface CampCatalogItem { id:string; name:string; price:number; kind:CampKind; art:string; description:string; unlock:CampUnlock; maxOwned:number|'pets' }
export const CAMP_CATALOG = [
 { id:'fern-bed', name:'Ormbunksbädd', price:40, kind:'bed', art:'moss-bed', description:'Flätad bädd med mjuk mossa och en varm filt.', unlock:{kind:'always'}, maxOwned:'pets' },
 { id:'moon-bed', name:'Månkudde', price:60, kind:'bed', art:'moon-bed', description:'En mjuk plats under en broderad måne.', unlock:{kind:'world-seen',worldId:'monsterskogen'}, maxOwned:'pets' },
 { id:'pet-tent', name:'Husdjurstält', price:100, kind:'bed', art:'pet-tent', description:'Ett eget litet krypin med öppen dörr.', unlock:{kind:'pet-count',count:2}, maxOwned:1 },
 { id:'sun-rug', name:'Solmatta', price:40, kind:'rug', art:'camp-rug', description:'Samla vännerna på en mjuk vävd matta.', unlock:{kind:'always'}, maxOwned:1 },
 { id:'camp-lantern', name:'Lägerlykta', price:40, kind:'light', art:'camp-lantern', description:'Ett varmt litet ljus vid en sovplats.', unlock:{kind:'always'}, maxOwned:2 },
 { id:'star-lights', name:'Stjärnlyktor', price:80, kind:'light', art:'star-lights', description:'Fem stjärnor som lyser tillsammans.', unlock:{kind:'world-conquered',worldId:'monsterskogen'}, maxOwned:1 },
 { id:'play-log', name:'Lekstock', price:60, kind:'toy', art:'play-log', description:'En tunnel och en hängande leksak.', unlock:{kind:'pet-count',count:1}, maxOwned:2 },
 { id:'treasure-chest', name:'Skattkista', price:80, kind:'storage', art:'treasure-chest', description:'En plats för lägrets små skatter.', unlock:{kind:'world-conquered',worldId:'monsterskogen'}, maxOwned:1 },
 // Äldre köp behåller sina identiteter, namn och värden.
 ...FURNITURE.filter(f=>!['fern-bed','moon-bed','sun-rug'].includes(f.id)).map(f=>({id:f.id,name:f.name,price:f.price,kind:({bed:'bed',rug:'rug',shelf:'storage',toy:'toy'} as const)[f.slot],art:f.art,description:f.description,unlock:{kind:'always'} as const,maxOwned:1})),
] satisfies CampCatalogItem[]
export const CAMP_POINTS: {id:string;name:string;kind:CampKind;x:number;y:number;width:number}[] = [
 {id:'bed-1',name:'Sovplats vid tältet',kind:'bed',x:24,y:67,width:19},
 {id:'bed-2',name:'Sovplats vid stigen',kind:'bed',x:45,y:78,width:19},
 {id:'bed-3',name:'Sovplats vid stenen',kind:'bed',x:77,y:77,width:18},
 {id:'bed-4',name:'Sovplats vid ormbunken',kind:'bed',x:15,y:85,width:17},
 {id:'rug-1',name:'Samlingsplatsen',kind:'rug',x:47,y:86,width:31},
 {id:'light-1',name:'Ljuset vid tältet',kind:'light',x:12,y:58,width:13},
 {id:'light-2',name:'Ljuset vid skogsbrynet',kind:'light',x:86,y:58,width:19},
 {id:'toy-1',name:'Lekplats vid stigen',kind:'toy',x:61,y:80,width:16},
 {id:'toy-2',name:'Lekplats vid tältet',kind:'toy',x:32,y:84,width:13},
 {id:'storage-1',name:'Skattplatsen',kind:'storage',x:88,y:80,width:18},
 {id:'storage-2',name:'Bokplatsen',kind:'storage',x:36,y:55,width:12},
]
const oldPoints={bed:'bed-1',rug:'rug-1',shelf:'storage-1',toy:'toy-1'} as const
export function campItems(home?:PetHome):CampItemInstance[] {
 if(home?.items) return home.items
 return Object.entries(home?.owned??{}).map(([itemId,owner])=>({id:`legacy-${itemId}`,itemId,...owner,
  point:Object.entries(home?.equipped??{}).find(([,v])=>v===itemId)?.[0] ? oldPoints[Object.entries(home!.equipped).find(([,v])=>v===itemId)![0] as keyof typeof oldPoints] : undefined }))
}
export const campItemsForChild = (home:PetHome|undefined,childId:string) => campItems(home).filter(item=>item.childId===childId)
export function isCampUnlockMet(unlock:CampUnlock,child:ChildProfile):boolean {
 const pets=campPets(child.petProgress)
 if(unlock.kind==='always')return true
 if(unlock.kind==='pet-count')return pets.length>=unlock.count
 if(unlock.kind==='pet-species')return pets.some(pet=>pet.species===unlock.species)
 if(unlock.kind==='world-seen')return child.seenWorlds?.includes(unlock.worldId)??false
 return child.conqueredWorlds?.includes(unlock.worldId)??false
}
export const campItemLimit = (item:CampCatalogItem,child:ChildProfile) => item.maxOwned==='pets'?campPets(child.petProgress).length:item.maxOwned
export const itemArt = (art:string) => `${import.meta.env.BASE_URL}art/${art.includes('/')?`${art}.webp`:`camp/items/${art}.png`}`
export const OUTFITS = [
 {id:'traveller',name:'Resenärens mantel',color:'#33694c',trim:'#c9ac68',price:0,unlock:{kind:'always'}},
 {id:'starlight',name:'Stjärnmantel',color:'#544078',trim:'#e4cba0',price:80,unlock:{kind:'world-seen',worldId:'monsterskogen'}},
 {id:'sunset',name:'Solnedgångsmantel',color:'#a74f32',trim:'#f0bf63',price:100,unlock:{kind:'world-conquered',worldId:'monsterskogen'}},
 {id:'moss-companion',name:'Skogsgrodans mantel',color:'#477044',trim:'#b9d47a',price:120,unlock:{kind:'pet-species',species:'woodland-frog'}},
 {id:'crystal-companion',name:'Kristalldrakens mantel',color:'#426d82',trim:'#c69bea',price:160,unlock:{kind:'pet-species',species:'crystal-dragon'}},
 {id:'dune-companion',name:'Sandrävens mantel',color:'#9a6338',trim:'#f0cd79',price:140,unlock:{kind:'pet-species',species:'dune-fox'}},
 {id:'reef-companion',name:'Korallaxolotlens mantel',color:'#39777c',trim:'#f09b9c',price:180,unlock:{kind:'pet-species',species:'reef-axolotl'}},
] satisfies {id:string;name:string;color:string;trim:string;price:number;unlock:CampUnlock}[]
export const visibleOutfits = (child:ChildProfile) => OUTFITS.filter(outfit=>child.petProgress?.outfits?.includes(outfit.id)||isCampUnlockMet(outfit.unlock,child))

