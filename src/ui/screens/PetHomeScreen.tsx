import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { DAILY_PET_COINS, PET_SPECIES, campPets, petSpecies } from '../../domain/pet-home'
import { CAMP_CATALOG, CAMP_POINTS, OUTFITS, campItems, itemArt } from '../../domain/camp'
import { homeSecondsLeft, petDay } from '../../engine/pet-home'
import { speak, stopSpeaking } from '../../tts'
import { useStore } from '../store'
import { useDocumentBackground } from '../useDocumentBackground'
import { CampHero } from '../components/CampHero'
import { PetSprite } from '../components/PetSprite'
import { PetHouse } from '../components/PetHouse'
import '../../styles/pet-home.css'
import '../../styles/camp.css'
import '../../styles/camp-stations.css'

const art=(name:string)=>`${import.meta.env.BASE_URL}art/${name}.webp`
const petArt=(species?:string)=>`${import.meta.env.BASE_URL}art/camp/${petSpecies(species).art}.png`
type View='camp'|'pets'|'wardrobe'|'gear'|'books'|'packing'
const STATIONS: {id:Exclude<View,'camp'>;name:string;hint:string;x:number;y:number}[]=[
 {id:'pets',name:'Husdjurstältet',hint:'Dina vänner och deras sovplatser',x:48,y:45},
 {id:'wardrobe',name:'Garderobstältet',hint:'Klä din hjälte',x:22,y:30},
 {id:'gear',name:'Utrustningen',hint:'Svärd, sköldar och trollstavar',x:82,y:37},
 {id:'books',name:'Bokhörnan',hint:'Dina upptäckter',x:36,y:48},
 {id:'packing',name:'Packningen',hint:'Inred och flytta saker',x:86,y:88},
]
export function PetHomeScreen(){
 const store=useStore(),child=store.activeChild,p=child?.petProgress
 const [view,setView]=useState<View>('camp'),[moving,setMoving]=useState(true)
 const [clock,setClock]=useState(()=>new Date()),[finding,setFinding]=useState(false),[revealed,setRevealed]=useState(false)
 const [name,setName]=useState(''),[message,setMessage]=useState(''),[happy,setHappy]=useState('')
 const [tab,setTab]=useState<'shop'|'owned'>('owned'),[selected,setSelected]=useState(''),[placing,setPlacing]=useState('')
 const [outfitPreview,setOutfitPreview]=useState<string>()
 const heading=useRef<HTMLHeadingElement>(null)
 useDocumentBackground('#121c27')
 useEffect(()=>{const timer=window.setInterval(()=>{setClock(new Date());if(document.visibilityState==='visible')store.spendHomeTime(1)},1000);return()=>{window.clearInterval(timer);stopSpeaking()}},[child?.id])
 useEffect(()=>{heading.current?.focus();setSelected('');setOutfitPreview(undefined)},[view])
 useEffect(()=>{if(!happy)return;const timer=window.setTimeout(()=>setHappy(''),2300);return()=>window.clearTimeout(timer)},[happy])
 if(!child)return null
 const pets=campPets(p),left=homeSecondsLeft(store.household,child.id,clock),ready=p?.lastPracticeDay===petDay(clock)
 const pending=p?.encounterSpecies&&!pets.some(pet=>pet.species===p.encounterSpecies)?p.encounterSpecies:undefined
 const discovery=(!pets.length&&ready)||(finding&&!!pending)
 const species=petSpecies(pending),items=campItems(store.household.petHome)
 const chosen=CAMP_CATALOG.find(i=>i.id===selected),instance=items.find(i=>i.id===placing)
 const placingItem=CAMP_CATALOG.find(i=>i.id===instance?.itemId)
 const freePoint=chosen?CAMP_POINTS.find(s=>s.kind===chosen.kind&&!items.some(i=>i.point===s.id)):undefined
 const back=()=>{if(discovery&&pets.length){setFinding(false);return}if(view!=='camp'){setView('camp');setPlacing('');return}store.go(store.secondsLeftToday(child)<=0?'time-up':'home')}
 const story=revealed?`En ${species.name.toLowerCase()} från ${species.world}! Vill du ge din nya vän ett namn?`:`På vägen tillbaka från ${species.world} hör du något bakom en sten …`
 const activeOutfit=OUTFITS.find(o=>o.id===(outfitPreview??p?.outfit))??OUTFITS[0]
 const outfitOwned=activeOutfit.price===0||p?.outfits?.includes(activeOutfit.id)
 const open=(v:View)=>{setView(v);setPlacing('');setFinding(false)}
 return <main className={`pet-page screen-fade ${moving?'':'pet-still'}`}>
  <header className="wood-bar pet-topbar">
   <button className="chip" onClick={back}>← {view==='camp'&&!finding?'Till kartan':'Till lägret'}</button>
   <h1 className="display">Kvällslägret</h1>
   <button className="chip pet-motion-toggle" aria-pressed={!moving} onClick={()=>setMoving(!moving)}>{moving?'Pausa rörelser':'Starta rörelser'}</button>
   <span className="pet-wallet" aria-label={`${p?.coins??0} mynt`}>● {p?.coins??0} mynt</span>
  </header>
  {!pets.length&&!ready?<section className="pet-welcome card"><h2 className="display">Vem väntar på dig?</h2><p>Gör klart ett övningspass. På vägen tillbaka kan du hitta en vän från världen du besökt.</p><p>Dagens första färdiga pass ger {DAILY_PET_COINS} mynt till lägret.</p><button className="btn btn-primary" onClick={back}>Till äventyret</button></section>
  :discovery?<section className="pet-discovery" style={{backgroundImage:`url(${art(`world/${species.worldId}`)})`}}>
   <div className="pet-find-scene" aria-hidden="true"><div className="pet-moss-stone"/><img className={revealed?'pet-found':'pet-peeking'} src={petArt(species.id)} alt=""/></div>
   <div className="card pet-story"><span className="pet-eyebrow">En ny vän från {species.world}</span><h2 className="display">{revealed?'Vill du följa med?':'Vem gömmer sig där?'}</h2><p>{story}</p>
    <button className="chip" onClick={()=>speak(story)}>Lyssna</button>
    {!revealed?<button className="btn btn-primary" onClick={()=>setRevealed(true)}>Titta bakom stenen</button>:<form onSubmit={e=>{e.preventDefault();store.adoptPet(name);setFinding(false);setRevealed(false);setName('')}}><label htmlFor="pet-name">Vad heter din nya vän?</label><input id="pet-name" value={name} maxLength={24} onChange={e=>setName(e.target.value)} autoComplete="off"/><button className="btn btn-primary" disabled={!name.trim()}>Följ med till lägret!</button></form>}
    <button className="chip" onClick={back}>Vi ses snart igen</button>
   </div>
  </section>:<div className="camp-workspace">
   <nav className="camp-navigation" aria-label="Platser i lägret"><button className="chip" aria-current={view==='camp'?'page':undefined} onClick={()=>open('camp')}>Vid elden</button>{STATIONS.map(s=><button key={s.id} className="chip" aria-current={view===s.id?'page':undefined} onClick={()=>open(s.id)}>{s.name}</button>)}</nav>
   <h2 className="display camp-view-heading" tabIndex={-1} ref={heading}>{view==='camp'?'En stund tillsammans':STATIONS.find(s=>s.id===view)?.name}</h2>
   {pending&&<button className="camp-discovery-call" onClick={()=>{setFinding(true);setRevealed(false);setName('')}}>Någon följde dina fotspår … Upptäck en ny vän</button>}
   {(view==='camp'||view==='packing')&&<>
    <div className="pet-room camp-overview" aria-label="Ditt läger med husdjur och inredning">
     <img className="pet-camp-background" src={art('camp/evening-camp')} alt="Ett tält vid en sjö i skymningen"/>
     <div className="pet-camp-glow" aria-hidden="true"/><div className="pet-fire" aria-hidden="true"><i/><i/><i/><b/><b/><b/></div>
     <div className="pet-fireflies" aria-hidden="true">{Array.from({length:9},(_,i)=><i key={i} style={{'--i':i} as CSSProperties}/>)}</div>
     <button className="camp-den-building" aria-label="Öppna husdjurstältet" onClick={()=>open('pets')}><img src={itemArt('pet-tent')} alt=""/></button>
     {items.filter(i=>i.point).map(i=>{const point=CAMP_POINTS.find(s=>s.id===i.point),item=CAMP_CATALOG.find(f=>f.id===i.itemId);return point&&item?<button key={i.id} className={`camp-placed ${item.kind==='light'?'camp-light':''}`} style={{left:`${point.x}%`,top:`${point.y}%`,width:`${point.width}%`}} onClick={()=>{setView('packing');setTab('owned');setPlacing(i.id);setSelected('')}} aria-label={`${item.name}, ${point.name}. Flytta eller packa undan`}><img src={itemArt(item.art)} alt=""/></button>:null})}
     {chosen&&freePoint&&<img className="camp-placement-preview" style={{left:`${freePoint.x}%`,top:`${freePoint.y}%`,width:`${freePoint.width}%`}} src={itemArt(chosen.art)} alt={`Förhandsvisning av ${chosen.name}, inte köpt`}/>}
     {pets.slice(0,4).map((pet,i)=>{const point=CAMP_POINTS.find(s=>s.id===pet.bedPoint)??CAMP_POINTS[i];return <button key={pet.id} className="camp-pet" style={{left:`${point.x}%`,top:`${point.y-4}%`}} disabled={left<=0} onClick={()=>{setHappy(pet.id);setMessage(pet.care?.resting?`${pet.name} sover tryggt.`:`${pet.name} blir glad att se dig!`)}} aria-label={`Hälsa på ${pet.name}`}><PetSprite species={pet.species} greeting={happy===pet.id} resting={pet.care?.resting}/><span>{pet.name}</span></button>})}
     <button className="camp-player" aria-label="Öppna garderoben" onClick={()=>open('wardrobe')}><CampHero child={child}/></button>

     {placingItem&&CAMP_POINTS.filter(s=>s.kind===placingItem.kind).map(point=><button key={point.id} className="camp-placement-target" style={{left:`${point.x}%`,top:`${point.y}%`}} disabled={left<=0||items.some(i=>i.point===point.id&&i.id!==placing)} onClick={()=>{store.changeCamp({type:'place',instanceId:placing,point:point.id});setMessage(`${placingItem.name} står nu på ${point.name.toLowerCase()}.`);setPlacing('')}} aria-label={`Placera på ${point.name}`}>＋<span>{point.name}</span></button>)}
    </div>
    {placingItem&&<div className="camp-placement-bar"><strong>Välj en ledig plats för {placingItem.name.toLowerCase()}.</strong><button className="chip" disabled={left<=0} onClick={()=>{store.changeCamp({type:'place',instanceId:placing});setPlacing('');setMessage('Saken ligger nu i packningen.')}}>Packa undan</button><button className="chip" onClick={()=>setPlacing('')}>Avbryt</button></div>}
   </>}
   {view==='pets'&&<PetHouse onCare={(petId,activity)=>store.changeCamp({type:'care',petId,activity})} pets={pets} items={items} canInteract={left>0} onRename={(petId,name)=>store.changeCamp({type:'rename',petId,name})} onBed={(petId,point)=>store.changeCamp({type:'bed',petId,point})} onPacking={()=>{open('packing');setTab('owned')}}/>}
   {view==='wardrobe'&&<section className="camp-wardrobe"><div className="camp-fitting"><CampHero child={child} outfitId={activeOutfit.id}/><span>{outfitPreview?'Provar · inget köpt ännu':child.name}</span></div><div><p>Prova en mantel. Den följer med din hjälte till lägret och påverkar inte matteäventyren.</p><div className="camp-outfits">{OUTFITS.map(o=><button className="camp-outfit-option" key={o.id} aria-pressed={activeOutfit.id===o.id} onClick={()=>setOutfitPreview(o.id)}><span className="camp-fabric" style={{background:o.color,borderColor:o.trim}}/>{o.name}<small>{o.price===0||p?.outfits?.includes(o.id)?'I garderoben':`${o.price} mynt`}</small></button>)}</div><h3>{activeOutfit.name}</h3><button className="btn btn-primary" disabled={left<=0||(!outfitOwned&&(p?.coins??0)<activeOutfit.price)} onClick={()=>{store.changeCamp({type:'outfit',outfitId:activeOutfit.id});setOutfitPreview(undefined);setMessage(`${activeOutfit.name} är på!`)}}>{outfitOwned?'Ta på manteln':(p?.coins??0)<activeOutfit.price?`Spara ${activeOutfit.price-(p?.coins??0)} mynt till`:`Köp och ta på · ${activeOutfit.price} mynt`}</button><button className="chip" onClick={()=>setOutfitPreview(undefined)}>Tillbaka till mina kläder</button></div></section>}
   {view==='gear'&&<section className="camp-gear"><div className="camp-equipment-rack" aria-hidden="true"><img src={art('icons/svards')} alt=""/><img src={art('icons/skold')} alt=""/><img src={art('icons/kristall')} alt=""/></div><h3 className="display">Äventyrarens utrustningsplats</h3><p>Här finns plats för framtida svärd, sköldar och trollstavar. Din hjälte har kvar sin vanliga utrustning.</p><p className="camp-note">Samlande och byte av utrustning kommer i en senare version.</p></section>}
   {view==='books'&&<section className="camp-library"><p>Upptäckter från världarna du och dina följeslagare har besökt.</p><div className="camp-book-grid">{PET_SPECIES.filter(s=>pets.some(p=>p.species===s.id)).map(s=><article className="camp-book" key={s.id}><img src={petArt(s.id)} alt=""/><h3 className="display">{s.world}</h3><p>Här hittade du {pets.filter(p=>p.species===s.id).map(p=>p.name).join(', ')}.</p><span>{s.name}</span></article>)}</div><p className="camp-note">Fler böcker och berättelser kommer senare.</p></section>}
   {view==='packing'&&<section className="camp-pack-panel"><div className="pet-tabs"><button className="chip" aria-pressed={tab==='owned'} onClick={()=>{setTab('owned');setSelected('')}}>Packningen ({items.length})</button><button className="chip" aria-pressed={tab==='shop'} onClick={()=>{setTab('shop');setPlacing('')}}>Handelsboden</button></div>
    {tab==='shop'?<><p>Alla saker får stanna. Köp fler bäddar och lyktor om du vill.</p><div className="camp-shop-grid">{CAMP_CATALOG.filter(item=>!item.art.includes('/')).map(item=><button className="pet-product" key={item.id} aria-pressed={selected===item.id} onClick={()=>setSelected(item.id)}><img src={itemArt(item.art)} alt=""/><span>{item.name}</span><small>{item.price} mynt · {items.filter(i=>i.itemId===item.id).length} ägda</small></button>)}</div>{chosen&&<div className="camp-buy-confirm"><img src={itemArt(chosen.art)} alt=""/><div><h3>{chosen.name}</h3><p>{chosen.description}</p><p>{freePoint?'Du ser ett exempel på placering i lägret ovan.':'Den sparas i packningen tills du gör plats.'}</p><button className="btn btn-primary" disabled={left<=0||(p?.coins??0)<chosen.price} onClick={()=>{store.changeCamp({type:'buy',itemId:chosen.id,purchaseId:crypto.randomUUID()});setSelected('');setTab('owned');setMessage(`${chosen.name} finns i packningen. Välj en plats när du vill.`)}}>{(p?.coins??0)<chosen.price?`Spara ${chosen.price-(p?.coins??0)} mynt till`:`Köp till packningen · ${chosen.price} mynt`}</button><button className="chip" onClick={()=>setSelected('')}>Avbryt</button></div></div>}</>
    :<>{!items.length&&<p>Packningen är tom. I handelsboden kan du hitta något till lägret.</p>}<div className="camp-shop-grid">{items.map(i=>{const item=CAMP_CATALOG.find(f=>f.id===i.itemId);return item?<button className="pet-product" key={i.id} disabled={left<=0} onClick={()=>{setPlacing(i.id);setMessage('Välj en markerad plats i lägret ovan.')}}><img src={itemArt(item.art)} alt=""/><span>{item.name}</span><small>{CAMP_POINTS.find(s=>s.id===i.point)?.name??'I packningen'}</small><small>Placera / flytta</small></button>:null})}</div></>}
   </section>}
   <footer className="pet-room-footer"><p role="status">{message||'Vännerna har det bra här. Dina saker finns alltid kvar.'}</p><span>{left>0?`${Math.ceil(left/60)} min lägertid kvar idag`:'Lägret vilar. Du kan titta runt och fortsätta efter nästa dags pass.'}</span></footer>
  </div>}
 </main>
}

