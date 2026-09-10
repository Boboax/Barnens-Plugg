import { FURNITURE, type PetHome, type CampItemInstance } from './pet-home'
export type CampKind = 'bed' | 'rug' | 'light' | 'toy' | 'storage'
export const CAMP_CATALOG = [
 { id:'fern-bed', name:'Ormbunksbädd', price:20, kind:'bed', art:'moss-bed', description:'Flätad bädd med mjuk mossa och en varm filt.' },
 { id:'moon-bed', name:'Månkudde', price:40, kind:'bed', art:'moon-bed', description:'En mjuk plats under en broderad måne.' },
 { id:'pet-tent', name:'Husdjurstält', price:60, kind:'bed', art:'pet-tent', description:'Ett eget litet krypin med öppen dörr.' },
 { id:'sun-rug', name:'Solmatta', price:20, kind:'rug', art:'camp-rug', description:'Samla vännerna på en mjuk vävd matta.' },
 { id:'camp-lantern', name:'Lägerlykta', price:20, kind:'light', art:'camp-lantern', description:'Ett varmt litet ljus vid en sovplats.' },
 { id:'star-lights', name:'Stjärnlyktor', price:50, kind:'light', art:'star-lights', description:'Fem stjärnor som lyser tillsammans.' },
 { id:'play-log', name:'Lekstock', price:40, kind:'toy', art:'play-log', description:'En tunnel och en hängande leksak.' },
 { id:'treasure-chest', name:'Skattkista', price:40, kind:'storage', art:'treasure-chest', description:'En plats för lägrets små skatter.' },
 // Äldre köp behåller sina identiteter, namn och värden.
 ...FURNITURE.filter(f=>!['fern-bed','moon-bed','sun-rug'].includes(f.id)).map(f=>({id:f.id,name:f.name,price:f.price,kind:({bed:'bed',rug:'rug',shelf:'storage',toy:'toy'} as const)[f.slot],art:f.art,description:f.description})),
] satisfies { id:string; name:string; price:number; kind:CampKind; art:string; description:string }[]
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
export const itemArt = (art:string) => `${import.meta.env.BASE_URL}art/${art.includes('/')?`${art}.webp`:`camp/items/${art}.png`}`
export const OUTFITS = [
 {id:'traveller',name:'Resenärens mantel',color:'#33694c',trim:'#c9ac68',price:0},
 {id:'starlight',name:'Stjärnmantel',color:'#544078',trim:'#e4cba0',price:40},
 {id:'sunset',name:'Solnedgångsmantel',color:'#a74f32',trim:'#f0bf63',price:40},
]

