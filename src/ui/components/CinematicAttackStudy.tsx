export function CinematicAttackStudy({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const frames = [1, 2, 3, 4].map((frame) => `${import.meta.env.BASE_URL}art/prototype-v2/hero-bow-attack-frame-${frame}.webp`)

  return <div
    className={`cinematic-attack-study${reducedMotion ? ' cinematic-attack-study--paused' : ''}`}
    role="img"
    aria-label={reducedMotion ? 'Stillpose från filmisk bågattack' : 'Filmisk bågattack i fyra anatomiska faser'}
  >
    {frames.map((src, index) => <img key={src} src={src} alt="" aria-hidden="true" className={`cinematic-attack-study__frame cinematic-attack-study__frame--${index + 1}`} />)}
  </div>
}
