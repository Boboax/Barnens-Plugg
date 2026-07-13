/* ============================================================
   Konfettikanonen — canvas-partiklar utan beroenden.
   Respekterar prefers-reduced-motion (då händer inget).
   ============================================================ */

const COLORS = ['#FFC94D', '#FF7A6E', '#4A56C6', '#3FBF87', '#8C6BC8', '#FFFFFF']

interface Particle {
  x: number; y: number; vx: number; vy: number
  size: number; color: string; rot: number; vrot: number; shape: 'rect' | 'circle'
}

export function fireConfetti(opts: { count?: number; origin?: { x: number; y: number } } = {}): void {
  if (typeof window === 'undefined') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const canvas = document.createElement('canvas')
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;'
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')!

  const count = opts.count ?? 90
  const ox = opts.origin?.x ?? canvas.width / 2
  const oy = opts.origin?.y ?? canvas.height * 0.45
  const particles: Particle[] = Array.from({ length: count }, () => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1
    const speed = 7 + Math.random() * 9
    return {
      x: ox + (Math.random() - 0.5) * 60,
      y: oy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 5 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rot: Math.random() * Math.PI,
      vrot: (Math.random() - 0.5) * 0.3,
      shape: Math.random() < 0.7 ? 'rect' : 'circle',
    }
  })

  const start = performance.now()
  const DURATION = 1700
  const frame = (now: number): void => {
    const t = now - start
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const fade = Math.max(0, 1 - t / DURATION)
    for (const p of particles) {
      p.vy += 0.32 // gravitation
      p.vx *= 0.99
      p.x += p.vx
      p.y += p.vy
      p.rot += p.vrot
      ctx.save()
      ctx.globalAlpha = fade
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.fillStyle = p.color
      if (p.shape === 'rect') ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
      else { ctx.beginPath(); ctx.arc(0, 0, p.size / 2.6, 0, Math.PI * 2); ctx.fill() }
      ctx.restore()
    }
    if (t < DURATION) requestAnimationFrame(frame)
    else canvas.remove()
  }
  requestAnimationFrame(frame)
}
