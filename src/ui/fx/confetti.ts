/* ============================================================
   Segerfyrverkeriet — canvas-partiklar utan beroenden.

   Episkt men smakfullt: guld och juveler (matchar den målade
   skattkonsten), pappersremsor + gniststjärnor, tre kanoner
   (mitten + två nedre hörn) och en kort ljusblixt i mitten.
   Respekterar prefers-reduced-motion (då händer inget).
   ============================================================ */

// Varmt guld dominerar (skatt/seger), juveltoner kryddar.
const GOLD = ['#FFC94D', '#F6B733', '#E8A13C', '#FFE7A8', '#FBF3DE']
const JEWELS = ['#8C6BC8', '#3FBF87', '#FF7A6E', '#4A56C6']

type Shape = 'rect' | 'circle' | 'star' | 'ribbon'

interface Particle {
  x: number; y: number; vx: number; vy: number
  size: number; color: string; rot: number; vrot: number
  shape: Shape; wob: number; wphase: number; twinkle: boolean
}

/** Fyrkantig gniststjärna (4 uddar) — den "magiska glitter"-formen. */
function drawSparkle(ctx: CanvasRenderingContext2D, r: number): void {
  ctx.beginPath()
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i
    const rad = i % 2 === 0 ? r : r * 0.34
    const x = Math.cos(a) * rad
    const y = Math.sin(a) * rad
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fill()
}

export function fireConfetti(opts: { count?: number; power?: number } = {}): void {
  if (typeof window === 'undefined') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const canvas = document.createElement('canvas')
  const W = (canvas.width = window.innerWidth)
  const H = (canvas.height = window.innerHeight)
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;'
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')!

  const power = opts.power ?? 1
  // Skala mängden efter skärmyta så stora iPads också fylls.
  const base = opts.count ?? Math.round(150 * Math.min(1.6, Math.max(0.9, W / 900)))

  // Tre utskjut: bred mittfontän + två nedre hörn som skjuter inåt-uppåt.
  const bursts = [
    { x: W * 0.5, y: H * 0.44, aim: -Math.PI / 2, spread: Math.PI * 1.05, n: 0.5, spd: 10 },
    { x: W * 0.06, y: H * 0.98, aim: -Math.PI / 3, spread: Math.PI * 0.5, n: 0.25, spd: 15 },
    { x: W * 0.94, y: H * 0.98, aim: -Math.PI * 2 / 3, spread: Math.PI * 0.5, n: 0.25, spd: 15 },
  ]

  const pick = (): string => (Math.random() < 0.66 ? GOLD : JEWELS)[Math.floor(Math.random() * (Math.random() < 0.66 ? GOLD.length : JEWELS.length))]
  const rollShape = (): Shape => {
    const r = Math.random()
    return r < 0.42 ? 'rect' : r < 0.66 ? 'ribbon' : r < 0.86 ? 'star' : 'circle'
  }

  const particles: Particle[] = []
  for (const b of bursts) {
    const n = Math.round(base * b.n)
    for (let i = 0; i < n; i++) {
      const angle = b.aim + (Math.random() - 0.5) * b.spread
      const speed = (b.spd + Math.random() * b.spd) * power
      const shape = rollShape()
      particles.push({
        x: b.x + (Math.random() - 0.5) * 40,
        y: b.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: shape === 'ribbon' ? 10 + Math.random() * 10 : 6 + Math.random() * 7,
        color: pick(),
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.34,
        shape,
        wob: 0.5 + Math.random() * 1.4,
        wphase: Math.random() * Math.PI * 2,
        twinkle: Math.random() < 0.5,
      })
    }
  }

  const start = performance.now()
  const DURATION = 2600
  const frame = (now: number): void => {
    const t = now - start
    ctx.clearRect(0, 0, W, H)

    // Kort gyllene ljusblixt i mitten (≈300 ms) — dramatisk "smäll".
    if (t < 320) {
      const fa = (1 - t / 320) * 0.5
      const g = ctx.createRadialGradient(W / 2, H * 0.44, 0, W / 2, H * 0.44, Math.max(W, H) * 0.5)
      g.addColorStop(0, `rgba(255,231,168,${fa})`)
      g.addColorStop(1, 'rgba(255,231,168,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
    }

    const fade = t > DURATION - 500 ? Math.max(0, (DURATION - t) / 500) : 1
    for (const p of particles) {
      p.vy += 0.3 // gravitation
      p.vx *= 0.992 // luftmotstånd
      p.vy *= 0.992
      p.x += p.vx
      p.y += p.vy
      p.rot += p.vrot
      p.wphase += 0.12 * p.wob

      ctx.save()
      ctx.globalAlpha = p.twinkle && p.shape === 'star'
        ? fade * (0.45 + 0.55 * Math.abs(Math.sin(p.wphase))) // gnistrande stjärnor
        : fade
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.fillStyle = p.color
      if (p.shape === 'rect') {
        // Fladder: pappret vänder sig i luften (scaleX pulserar).
        ctx.scale(Math.cos(p.wphase), 1)
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
      } else if (p.shape === 'ribbon') {
        ctx.scale(1, Math.cos(p.wphase))
        ctx.fillRect(-p.size / 2, -p.size / 7, p.size, p.size / 3.5)
      } else if (p.shape === 'star') {
        ctx.shadowColor = p.color
        ctx.shadowBlur = 6
        drawSparkle(ctx, p.size / 1.7)
      } else {
        ctx.beginPath()
        ctx.arc(0, 0, p.size / 2.6, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }
    if (t < DURATION) requestAnimationFrame(frame)
    else canvas.remove()
  }
  requestAnimationFrame(frame)
}
