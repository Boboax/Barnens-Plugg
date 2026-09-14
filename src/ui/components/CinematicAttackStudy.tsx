export function CinematicAttackStudy({ reducedMotion = false }: { reducedMotion?: boolean }) {
  return <div
    className={`cinematic-attack-study${reducedMotion ? ' cinematic-attack-study--paused' : ''}`}
    style={{ backgroundImage: `url(${import.meta.env.BASE_URL}art/prototype-v2/hero-bow-attack-study-v1.webp)` }}
    role="img"
    aria-label={reducedMotion ? 'Stillpose från filmisk bågattack' : 'Filmisk bågattack i fyra anatomiska faser'}
  />
}
