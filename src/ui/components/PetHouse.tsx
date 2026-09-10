import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { CampPet, CampItemInstance, PetCareActivity } from '../../domain/pet-home'
import { petSpecies } from '../../domain/pet-home'
import { CAMP_CATALOG, CAMP_POINTS, itemArt } from '../../domain/camp'
import { PetSprite } from './PetSprite'
import { PetSounds } from '../pet-sounds'
import '../../styles/pet-house.css'

const spots = [{x:32,y:52},{x:69,y:52},{x:25,y:78},{x:75,y:78}]
export function PetHouse({pets,items,canInteract,onRename,onBed,onPacking,onCare}:{
 pets:CampPet[];items:CampItemInstance[];canInteract:boolean
 onRename:(id:string,name:string)=>void;onBed:(id:string,point:string)=>void;onPacking:()=>void
 onCare:(id:string,activity:PetCareActivity)=>void
}) {
 const [selected,setSelected]=useState(pets[0]?.id)
 const [stroke,setStroke]=useState<{id:string;key:number;activity:PetCareActivity}|null>(null)
 const sounds=useRef<PetSounds|null>(null)
 const [muted,setMuted]=useState(()=>{try{return localStorage.getItem('pet-sounds-muted')==='true'}catch{return false}})
 useEffect(()=>{
  const quiet=()=>{if(document.hidden)sounds.current?.stop()}
  document.addEventListener('visibilitychange',quiet)
  return()=>{document.removeEventListener('visibilitychange',quiet);sounds.current?.dispose();sounds.current=null}
 },[])
 const [editing,setEditing]=useState(false),[name,setName]=useState('')
 const pet=pets.find(p=>p.id===selected)??pets[0]
 useEffect(()=>{if(!stroke)return;const t=window.setTimeout(()=>setStroke(null),2200);return()=>window.clearTimeout(t)},[stroke])
 if(!pet)return null
 const petImage=(p:CampPet)=><PetSprite species={p.species} greeting={stroke?.id===p.id} resting={p.care?.resting}/>
 const care=(activity:PetCareActivity)=>{
  if(!canInteract||stroke||(pet.care?.resting&&(activity==='pet'||activity==='feed')))return
  onCare(pet.id,activity);setStroke({id:pet.id,key:Date.now(),activity})
  if(activity==='rest')sounds.current?.stop()
  else if(!muted){sounds.current??=new PetSounds();sounds.current.play(pet.species)}
 }
 const toggleSound=()=>{const next=!muted;setMuted(next);if(next)sounds.current?.stop();try{localStorage.setItem('pet-sounds-muted',String(next))}catch{/* optional preference */}}
 const select=(p:CampPet)=>{setSelected(p.id);setEditing(false);setStroke(null)}
 return <section className="pet-house-interior" aria-label="Husdjurens mysiga hem">
  <div className="pet-house-toolbar"><p className="pet-house-intro">Välkommen in. Tryck på en vän för en stund tillsammans.</p><button className="chip" aria-label="Stäng av djurljud" aria-pressed={muted} onClick={toggleSound}>{muted?'Ljud av':'Ljud på'}</button></div>
  <div className="pet-house-room">
   <img className="pet-house-backdrop" src={`${import.meta.env.BASE_URL}art/camp/pet-tent-interior-v1.webp`} alt="Ett litet ombonat husdjurstält med tygväggar, lyktor och fyra sovhörnor"/>
   <div className="pet-house-firelight" aria-hidden="true"/>
   {pets.slice(0,4).map((p,i)=>{
    const index=Math.max(0,CAMP_POINTS.filter(s=>s.kind==='bed').findIndex(s=>s.id===(p.bedPoint??`bed-${i+1}`)))
    const spot=spots[index]??spots[i]
    const owned=items.find(item=>item.point===(p.bedPoint??`bed-${i+1}`))
    const bed=CAMP_CATALOG.find(item=>item.id===owned?.itemId&&item.kind==='bed')
    return <button key={p.id} className={`pet-house-resident ${index>1?'pet-house-front':''}`} aria-label={`Välj ${p.name}`} aria-pressed={pet.id===p.id} style={{left:`${spot.x}%`,top:`${spot.y}%`} as CSSProperties} onClick={()=>select(p)}>
     {bed&&<img className="pet-house-bed" src={itemArt(bed.art)} alt={bed.name}/>}
     <div className="pet-house-animal">{petImage(p)}</div>
     {stroke?.id===p.id&&stroke.activity==='pet'&&<div key={stroke.key} className="pet-house-hearts" aria-hidden="true">♥ <i>♥</i> ♥</div>}
     {stroke?.id===p.id&&stroke.activity==='feed'&&<div className="pet-food-bowl" aria-hidden="true"><i/><i/><i/></div>}
    </button>
   })}
  </div>
  <div className="pet-house-friends" aria-label="Välj husdjur">{pets.map(p=><button className="chip" key={p.id} aria-pressed={pet.id===p.id} onClick={()=>select(p)}>{p.name}</button>)}</div>
  <div className="pet-house-care">
   <div className="pet-house-closeup" aria-hidden="true">{petImage(pet)}</div>
   <div className="pet-house-care-copy"><span className="pet-house-eyebrow">En stund med din vän</span><h3 className="display">{pet.name}</h3><p>{petSpecies(pet.species).name} · {petSpecies(pet.species).world}</p>
    <div className="pet-care-actions">
     <button className="btn btn-primary" disabled={!canInteract||!!stroke||pet.care?.resting} onClick={()=>care('pet')}>♡ Klappa {pet.name}</button>
     <button className="chip" disabled={!canInteract||!!stroke||pet.care?.resting} onClick={()=>care('feed')}>Ge en godbit</button>
     <button className="chip" disabled={!canInteract||!!stroke} onClick={()=>care(pet.care?.resting?'wake':'rest')}>{pet.care?.resting?'Väck försiktigt':'Säg godnatt'}</button>
    </div>
    <p className="pet-house-response" role="status">{pet.care?.resting?`${pet.name} sover tryggt i sin sovhörna.`:stroke?.id===pet.id?(stroke.activity==='feed'?`${pet.name} mumsar glatt på sin godbit.`:stroke.activity==='wake'?`${pet.name} vaknar och är glad att se dig.`:`${pet.name} njuter av din klapp och känner sig trygg.`):canInteract?'En godbit, en klapp eller en mysig tupplur. Du väljer.':'Vännerna har det bra. Kom tillbaka efter nästa övningspass.'}</p>
    <p className="pet-care-note">Godbitarna är gratis. Dina vänner har det alltid bra, även när du inte är här.</p>
    <details><summary>Namn och sovplats</summary>
     {editing?<form onSubmit={e=>{e.preventDefault();if(canInteract&&name.trim()){onRename(pet.id,name);setEditing(false)}}}><label>Nytt namn<input value={name} maxLength={24} onChange={e=>setName(e.target.value)}/></label><button className="chip" disabled={!canInteract||!name.trim()}>Spara namn</button><button className="chip" type="button" onClick={()=>setEditing(false)}>Avbryt</button></form>:<button className="chip" disabled={!canInteract} onClick={()=>{setName(pet.name);setEditing(true)}}>Byt namn</button>}
     <label>Sovplats<select value={pet.bedPoint??'bed-1'} disabled={!canInteract} onChange={e=>onBed(pet.id,e.target.value)}>{spots.map((_,i)=><option key={i} value={`bed-${i+1}`}>{['Bakre vänstra hörnet','Bakre högra hörnet','Främre vänstra hörnet','Främre högra hörnet'][i]}</option>)}</select></label>
     <p>Bädden som du placerar på samma sovplats i lägret syns också här. Två vänner byter plats om de väljer samma hörn.</p><button className="chip" onClick={onPacking}>Välj bädd i packningen</button>
    </details>
   </div>
  </div>
 </section>
}

