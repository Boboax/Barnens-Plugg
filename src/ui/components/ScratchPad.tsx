import { useEffect, useRef, useState } from 'react'

/* ============================================================
   Kladdytan — rita uträkningen med finger eller penna.

   Sparas som liten PNG ihop med svaret så föräldern kan se HUR
   barnet räknade, och så att Pi (fas 5) kan analysera uträkningen.
   ============================================================ */

const COLORS = ['#2E3350', '#FF7A6E', '#4A56C6'] as const

export interface ScratchPadHandle {
  /** PNG-dataURL om något ritats, annars undefined. */
  snapshot(): string | undefined
  clear(): void
}

export function ScratchPad({ onReady }: { onReady?: (handle: ScratchPadHandle) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const hasInk = useRef(false)
  const [color, setColor] = useState<string>(COLORS[0])
  const colorRef = useRef(color)
  colorRef.current = color

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement!
    const scale = Math.min(window.devicePixelRatio || 1, 2)
    const resize = (): void => {
      // Bevara innehållet vid resize genom att rita om den gamla bitmappen.
      const old = document.createElement('canvas')
      old.width = canvas.width
      old.height = canvas.height
      old.getContext('2d')?.drawImage(canvas, 0, 0)
      canvas.width = parent.clientWidth * scale
      canvas.height = parent.clientHeight * scale
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(old, 0, 0, canvas.width, canvas.height)
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(parent)

    const pos = (e: PointerEvent): [number, number] => {
      const rect = canvas.getBoundingClientRect()
      return [((e.clientX - rect.left) / rect.width) * canvas.width, ((e.clientY - rect.top) / rect.height) * canvas.height]
    }
    const down = (e: PointerEvent): void => {
      drawing.current = true
      hasInk.current = true
      const ctx = canvas.getContext('2d')!
      const [x, y] = pos(e)
      ctx.beginPath()
      ctx.moveTo(x, y)
      canvas.setPointerCapture(e.pointerId)
    }
    const move = (e: PointerEvent): void => {
      if (!drawing.current) return
      const ctx = canvas.getContext('2d')!
      ctx.strokeStyle = colorRef.current
      ctx.lineWidth = 3 * scale
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      const [x, y] = pos(e)
      ctx.lineTo(x, y)
      ctx.stroke()
      e.preventDefault()
    }
    const up = (): void => {
      drawing.current = false
    }
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', up)

    onReady?.({
      snapshot: () => {
        if (!hasInk.current) return undefined
        // Skala ner till max 480 px bredd — lagringsvänligt.
        const out = document.createElement('canvas')
        const ratio = Math.min(1, 480 / canvas.width)
        out.width = Math.round(canvas.width * ratio)
        out.height = Math.round(canvas.height * ratio)
        const octx = out.getContext('2d')!
        octx.fillStyle = '#F1E8D2' // pergamentton — matchar kladdytan barnet ritade på
        octx.fillRect(0, 0, out.width, out.height)
        octx.drawImage(canvas, 0, 0, out.width, out.height)
        return out.toDataURL('image/png')
      },
      clear: () => {
        const ctx = canvas.getContext('2d')!
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        hasInk.current = false
      },
    })

    return () => {
      observer.disconnect()
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', up)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="card" style={{
      display: 'flex', flexDirection: 'column', padding: 0,
      borderRadius: 16, overflow: 'hidden', height: '100%', minHeight: 200,
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '6px 12px', borderBottom: '2px dashed var(--line)', fontSize: 13, fontWeight: 800, color: '#6E6656',
      }}>
        <span>Min uträkning</span>
        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              aria-label={`Pennfärg ${c}`}
              style={{
                width: 20, height: 20, borderRadius: '50%', background: c,
                border: '2px solid #fff', boxShadow: color === c ? `0 0 0 2.5px ${c}` : '0 0 0 1.5px var(--line)',
              }}
            />
          ))}
          <button
            onClick={() => {
              const canvas = canvasRef.current
              if (!canvas) return
              canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
              hasInk.current = false
            }}
            style={{ fontSize: 12, fontWeight: 800, color: '#6E6656', padding: '2px 8px' }}
          >Sudda allt</button>
        </span>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'none' }} />
      </div>
    </div>
  )
}
