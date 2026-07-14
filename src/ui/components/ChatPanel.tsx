import { useEffect, useRef, useState } from 'react'
import type { ChatContext, ChatMessage } from '../../chat/adapter'
import { getChatProvider } from '../../chat/adapter'
import { messagesLeftToday } from '../../chat'
import { sfx } from '../../sound'
import { Pi } from './Pi'
import { nowISO, todayISO, useStore } from '../store'

/* ============================================================
   Mattekompisen Pi — chattpanelen i träningspasset.

   Sokratisk tutor: ledtrådar och motfrågor, aldrig facit.
   "Visa min uträkning" skickar kladdytan som bild. Allt loggas
   till föräldraläget, inklusive avböjda försök att byta ämne.
   Chatten finns bara i övningspass — aldrig i bosstrider.
   ============================================================ */

const QUICK_CHIPS = [
  { label: 'Ge mig en ledtråd', text: 'Kan jag få en ledtråd?' },
  { label: 'Jag förstår inte', text: 'Jag förstår inte uppgiften. Kan du förklara vad den betyder?' },
  { label: 'Visa min uträkning', text: 'Här är min uträkning — kan du titta på den?', withScratch: true },
] as const

interface ChatPanelProps {
  context: ChatContext
  /** Hämtar kladdytans PNG (eller undefined om inget ritats). */
  getScratch(): string | undefined
  onClose(): void
}

export function ChatPanel({ context, getScratch, onClose }: ChatPanelProps) {
  const store = useStore()
  const child = store.activeChild
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [waiting, setWaiting] = useState(false)
  const [streamText, setStreamText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, waiting, streamText])

  if (!child) return null
  const left = messagesLeftToday(child, store.household, todayISO())

  const send = async (text: string, withScratch = false, preApproved = false): Promise<void> => {
    let trimmed = text.trim()
    if (!trimmed || waiting || left <= 0) return
    sfx.klick()
    const scratchPng = withScratch ? getScratch() : undefined
    // Tom kladdyta + "visa min uträkning" → be om hjälp i stället för att
    // skicka en påstådd bild som inte finns (förvirrar modellen).
    if (withScratch && !scratchPng) trimmed = 'Jag har inte ritat något än — kan du hjälpa mig komma igång med uppgiften?'
    const childMsg: ChatMessage = { role: 'child', text: trimmed, imagePngDataUrl: scratchPng }
    const history = [...messages, childMsg]
    setMessages(history)
    setInput('')
    setWaiting(true)
    store.appendChatLog({ at: nowISO(), childId: child.id, role: 'child', text: trimmed, scratchPng })

    // Snabbknapparnas texter är appens egna — de behöver inget ämnesfilter.
    // Svaret strömmas ord för ord så Pi känns kvick.
    const reply = await getChatProvider().send(context, history, {
      skipFilter: preApproved,
      onDelta: (chunk) => setStreamText((s) => s + chunk),
    })
    setStreamText('')
    setMessages((m) => [...m, { role: 'ai', text: reply.text }])
    setWaiting(false)
    sfx.ratt()
    store.appendChatLog({
      at: nowISO(), childId: child.id, role: 'ai',
      text: reply.text, refusedOffTopic: reply.refusedOffTopic || undefined,
    })
  }

  return (
    <div className="screen-fade" style={{
      position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(400px, 92vw)', zIndex: 20,
      // Pergamentrulle med snidad mässingskant — matchar panelramarna, inte platt panel.
      background: 'var(--tex-parchment, none) center / cover, var(--bg)',
      borderLeft: '3px solid #8A6A38', boxShadow: '-12px 0 30px rgba(30,20,8,.34)',
      display: 'flex', flexDirection: 'column',
      // Home-indikatorns yta nedtill fylls av panelens eget pergament (ingen ljus remsa).
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {/* Snidad trä-list som rubrik — env(safe-area-inset-top) håller knapparna
          nedanför iOS-klockan/batteriet. */}
      <div className="wood-bar" style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: 'calc(10px + env(safe-area-inset-top)) calc(12px + env(safe-area-inset-right)) 10px 14px',
      }}>
        <Pi mood="glad" size={32} />
        <strong style={{ fontSize: 15, color: '#F6EFDF', textShadow: '0 1px 2px rgba(0,0,0,.6)' }}>Mattekompisen Pi</strong>
        <span className="chip" style={{ marginLeft: 'auto', background: 'linear-gradient(180deg,#2E6B4C,#1F5238)', borderColor: '#4FA97C', color: '#EAFBF1', fontSize: 11 }}>● Bara matte här!</span>
        <button className="chip" onClick={onClose} aria-label="Stäng chatten">✕</button>
      </div>

      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.length === 0 && (
          <div style={bubbleAi}>
            Hej {child.name}! Jag är Pi. Fråga mig om uppgiften, be om en ledtråd — eller visa mig din uträkning!
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={m.role === 'ai' ? bubbleAi : bubbleMe}>
            {m.imagePngDataUrl && (
              <img src={m.imagePngDataUrl} alt="Min uträkning" style={{ width: '100%', borderRadius: 8, marginBottom: 6, border: '1px solid var(--line)' }} />
            )}
            {m.text}
          </div>
        ))}
        {waiting && (
          <div style={streamText ? bubbleAi : { ...bubbleAi, color: 'var(--muted)' }}>
            {streamText || 'Pi funderar …'}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, padding: '8px 14px 4px', flexWrap: 'wrap' }}>
        {QUICK_CHIPS.map((chip) => (
          <button
            key={chip.label}
            className="chip"
            style={{ fontSize: 12 }}
            disabled={waiting || left <= 0}
            onClick={() => void send(chip.text, 'withScratch' in chip && chip.withScratch, true)}
          >{chip.label}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '6px 14px 12px', alignItems: 'center' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void send(input) }}
          placeholder={left > 0 ? 'Skriv till Pi …' : 'Pi behöver vila — imorgon igen!'}
          disabled={waiting || left <= 0}
          style={{
            flex: 1, background: 'var(--card)', border: '2px solid #C9B489', borderRadius: 999,
            padding: '10px 16px', fontSize: 14, fontWeight: 600, color: 'var(--ink)',
            boxShadow: 'inset 0 1px 3px rgba(90,66,30,.18)',
          }}
        />
        <button
          className="btn btn-primary"
          style={{ padding: '10px 16px' }}
          disabled={waiting || input.trim() === '' || left <= 0}
          onClick={() => void send(input)}
          aria-label="Skicka"
        >➤</button>
      </div>
      {left <= 5 && left > 0 && (
        <p style={{ margin: '0 14px 10px', fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', textAlign: 'center' }}>
          {left} meddelanden kvar idag
        </p>
      )}
    </div>
  )
}

/* Pis repliker: ljust pergament (som en lapp hon räcker fram). */
const bubbleAi: React.CSSProperties = {
  background: 'linear-gradient(180deg, #FBF4E2, #F1E6CB)', border: '1.5px solid #C9B489',
  borderRadius: 15, borderBottomLeftRadius: 4, padding: '9px 13px', fontSize: 14, fontWeight: 600,
  lineHeight: 1.45, maxWidth: '85%', alignSelf: 'flex-start', color: '#3A322A',
  boxShadow: '0 1px 2px rgba(60,44,20,.18)',
}
/* Barnets repliker: graverad bronsplatta (matchar chip/HUD) i stället för blått glas. */
const bubbleMe: React.CSSProperties = {
  background: 'linear-gradient(180deg, #4A3A26, #372819)', color: '#F3E4C4',
  border: '1.5px solid #8A6A38', borderRadius: 15, borderBottomRightRadius: 4,
  padding: '9px 13px', fontSize: 14, fontWeight: 600, lineHeight: 1.45, maxWidth: '85%',
  alignSelf: 'flex-end', textShadow: '0 1px 1px rgba(0,0,0,.4)',
  boxShadow: 'inset 0 1px 0 rgba(255,220,160,.25), 0 2px 4px rgba(0,0,0,.28)',
}
