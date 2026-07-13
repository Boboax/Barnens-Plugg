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
  { label: '💡 Ge mig en ledtråd', text: 'Kan jag få en ledtråd?' },
  { label: '🤔 Jag förstår inte', text: 'Jag förstår inte uppgiften. Kan du förklara vad den betyder?' },
  { label: '✏️ Visa min uträkning', text: 'Här är min uträkning — kan du titta på den?', withScratch: true },
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
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, waiting])

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
    const reply = await getChatProvider().send(context, history, { skipFilter: preApproved })
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
      background: 'var(--bg)', borderLeft: '2px solid var(--line)', boxShadow: '-8px 0 24px rgba(40,30,10,.12)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '2px dashed var(--line)' }}>
        <Pi mood="glad" size={34} />
        <strong style={{ fontSize: 15 }}>Mattekompisen Pi</strong>
        <span className="chip" style={{ marginLeft: 'auto', borderColor: 'var(--mint)', color: '#1F7A50', fontSize: 11 }}>● Bara matte här!</span>
        <button className="chip" onClick={onClose} aria-label="Stäng chatten">✕</button>
      </div>

      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.length === 0 && (
          <div style={bubbleAi}>
            Hej {child.name}! 🐧 Jag är Pi. Fråga mig om uppgiften, be om en ledtråd — eller visa mig din uträkning!
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
        {waiting && <div style={{ ...bubbleAi, color: 'var(--muted)' }}>Pi funderar …</div>}
      </div>

      <div style={{ display: 'flex', gap: 6, padding: '8px 14px 4px', flexWrap: 'wrap' }}>
        {QUICK_CHIPS.map((chip) => (
          <button
            key={chip.label}
            className="chip"
            style={{ borderColor: 'var(--primary)', color: 'var(--primary)', fontSize: 12 }}
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
            flex: 1, background: 'var(--card)', border: '2px solid var(--line)', borderRadius: 999,
            padding: '10px 16px', fontSize: 14, fontWeight: 600, color: 'var(--ink)',
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

const bubbleAi: React.CSSProperties = {
  background: 'var(--card)', border: '2px solid var(--line)', borderRadius: 16, borderBottomLeftRadius: 4,
  padding: '9px 13px', fontSize: 14, fontWeight: 600, lineHeight: 1.45, maxWidth: '85%', alignSelf: 'flex-start',
}
const bubbleMe: React.CSSProperties = {
  background: 'var(--primary)', color: '#fff', borderRadius: 16, borderBottomRightRadius: 4,
  padding: '9px 13px', fontSize: 14, fontWeight: 600, lineHeight: 1.45, maxWidth: '85%', alignSelf: 'flex-end',
}
