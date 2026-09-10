import { useEffect, useState } from 'react'
import '../../styles/crystal-dragon.css'

/** Eight registered, individually drawn poses. No whole-image bob or rotation. */
export function CrystalDragon({ greeting = false }: { greeting?: boolean }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let active = true
    const atlas = new Image()
    atlas.onload = () => { if (active) setReady(true) }
    atlas.src = `${import.meta.env.BASE_URL}art/camp/crystal-dragon-idle-v2.webp`
    return () => { active = false; atlas.onload = null }
  }, [])
  return <div
    className={`crystal-dragon ${ready ? 'crystal-dragon-ready' : ''} ${greeting ? 'crystal-dragon-greeting' : ''}`}
    role="img" aria-label="Kristalldrake"
    style={{ backgroundImage: `url(${import.meta.env.BASE_URL}art/camp/${ready ? 'crystal-dragon-idle-v2' : 'crystal-dragon-idle-poster-v1'}.webp)` }}
  />
}

