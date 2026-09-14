import { useEffect, useState } from 'react'
import { petSpecies } from '../../domain/pet-home'
import { CrystalDragon } from './CrystalDragon'
import '../../styles/pet-sprite.css'

/** Individually drawn anatomical poses; sleeping pets remain still. */
export function PetSprite({species,greeting=false,resting=false}:{species:string;greeting?:boolean;resting?:boolean}) {
 const kind=petSpecies(species)
 const url=`${import.meta.env.BASE_URL}art/camp/${kind.id}-motion-v1.webp`
 const [loaded,setLoaded]=useState('')
 useEffect(()=>{
  if(kind.id==='crystal-dragon')return
  let active=true
  const img=new Image()
  img.onload=()=>{if(active)setLoaded(url)}
  img.src=url
  return()=>{active=false;img.onload=null}
 },[url,kind.id])
 if(resting)return <img className="pet-sleep-pose" src={`${import.meta.env.BASE_URL}art/camp/${kind.id}-sleep-v1.webp`} alt={`${kind.name} sover`}/>
 if(kind.id==='crystal-dragon')return <CrystalDragon greeting={greeting}/>
 const ready=loaded===url
 return <div role="img" aria-label={kind.name} className={`pet-sprite pet-sprite-${kind.id} ${ready?'pet-sprite-ready':''} ${greeting?'pet-sprite-greeting':''}`} style={{backgroundImage:`url(${ready?url:`${import.meta.env.BASE_URL}art/camp/${kind.id}-poster-v1.webp`})`}}/>
}

