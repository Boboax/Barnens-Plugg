import { useEffect, useState } from 'react'

export function CinematicAttackStudy({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const frames = [1, 2, 3, 4].map((frame) => `${import.meta.env.BASE_URL}art/prototype-v2/hero-bow-attack-frame-${frame}.webp`)
  const [systemReducedMotion, setSystemReducedMotion] = useState(false)
  const [frame, setFrame] = useState(0)
  const paused = reducedMotion || systemReducedMotion

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setSystemReducedMotion(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (paused) {
      setFrame(2)
      return
    }
    setFrame(0)
    const timers = [
      window.setTimeout(() => setFrame(1), 250),
      window.setTimeout(() => setFrame(2), 600),
      window.setTimeout(() => setFrame(3), 890),
    ]
    return () => timers.forEach(window.clearTimeout)
  }, [paused])

  return <div
    className={`cinematic-attack-study${reducedMotion ? ' cinematic-attack-study--paused' : ''}`}
    role="img"
    aria-label={paused ? 'Stillpose från filmisk bågattack' : 'Filmisk bågattack i fyra anatomiska faser'}
  >
    <img src={frames[frame]} alt="" aria-hidden="true" className="cinematic-attack-study__frame" />
  </div>
}
