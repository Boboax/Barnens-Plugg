export function CinematicAttackStudy({ reducedMotion = false }: { reducedMotion?: boolean }) {
  return <div
    className={`cinematic-attack-study${reducedMotion ? ' cinematic-attack-study--paused' : ''}`}
    role="img"
    aria-label={reducedMotion ? 'Stillpose från filmisk bågattack' : 'Filmisk bågattack i fyra anatomiska faser'}
  />
}
