import { useEffect, useRef, useState } from 'react'
import type { ChildProfile, SchoolYear } from '../../domain/types'
import { areaName, weeklyReport } from '../../engine/report'
import { rewardProgress } from '../../engine/rewards'
import { BLIXT_TESTS, blixtTarget } from '../../engine/blixt'
import { pingProvider } from '../../chat/providers'
import { CLOUD_VOICE, cloudTtsAvailable, kickVoiceList, preferredVoiceURI, setPreferredVoice, speakSample, swedishVoices, ttsAvailable } from '../../tts'
import { daysSinceBackup, exportHousehold, importHousehold } from '../../storage/backup'
import { KID_COLORS, nowISO, useStore } from '../store'

/* ============================================================
   Föräldraläget — sakligt och vuxet, inga spelelement.
   Flikar: Översikt · Barn & tid · Belöningar · Säkerhet
   ============================================================ */

type Tab = 'oversikt' | 'barn' | 'beloningar' | 'sakerhet'

export function ParentScreen() {
  const store = useStore()
  if (!store.parentUnlocked) return <PinGate />
  return <ParentInner />
}

/* ---------- PIN-grind ---------- */

function PinGate() {
  const store = useStore()
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const firstRun = !store.hasPin

  const submit = async (): Promise<void> => {
    if (pin.length < 4) return setError('Minst 4 siffror.')
    if (firstRun) {
      if (pin !== confirm) return setError('Koderna stämmer inte överens.')
      await store.setPin(pin)
    } else if (!(await store.tryUnlockParent(pin))) {
      setPin('')
      return setError('Fel kod — prova igen.')
    }
  }

  return (
    <div className="screen-fade" style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
      <h2 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>🔒 Föräldraläge</h2>
      <p style={{ color: 'var(--muted)', fontWeight: 700, textAlign: 'center', maxWidth: 380, margin: 0 }}>
        {firstRun ? 'Välj en PIN-kod (den skyddar inställningar, tidsgränser och rapporter).' : 'Ange din PIN-kod.'}
      </p>
      <input
        type="password" inputMode="numeric" autoFocus value={pin}
        onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }}
        onKeyDown={(e) => { if (e.key === 'Enter' && !firstRun) void submit() }}
        style={inputStyle}
        placeholder="PIN-kod"
        aria-label="PIN-kod"
      />
      {firstRun && (
        <input
          type="password" inputMode="numeric" value={confirm}
          onChange={(e) => { setConfirm(e.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }}
          onKeyDown={(e) => { if (e.key === 'Enter') void submit() }}
          style={inputStyle}
          placeholder="Upprepa koden"
          aria-label="Upprepa PIN-kod"
        />
      )}
      {error && <span style={{ color: 'var(--err)', fontWeight: 700, fontSize: 14 }}>{error}</span>}
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-quiet" onClick={() => store.go('profiles')}>Avbryt</button>
        <button className="btn btn-primary" onClick={() => void submit()}>{firstRun ? 'Spara kod →' : 'Lås upp'}</button>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  fontSize: 24, fontWeight: 900, textAlign: 'center', letterSpacing: 6, width: 200,
  padding: '10px 14px', borderRadius: 14, border: '2px solid var(--line)', background: 'var(--card)', color: 'var(--ink)',
}

/* ---------- Själva föräldraläget ---------- */

function ParentInner() {
  const store = useStore()
  const [tab, setTab] = useState<Tab>(store.household.children.length === 0 ? 'barn' : 'oversikt')

  const TABS: [Tab, string][] = [
    ['oversikt', 'Översikt'], ['barn', 'Barn & tid'], ['beloningar', 'Belöningar'], ['sakerhet', 'Säkerhet'],
  ]

  return (
    <div className="screen-fade" style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', background: '#F4F3EF' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', background: '#2E3350', color: '#fff', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 800, fontSize: 15 }}>🔒 Föräldraläge</span>
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto', flexWrap: 'wrap' }}>
          {TABS.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              fontSize: 13, fontWeight: 700, padding: '6px 13px', borderRadius: 99, fontFamily: 'inherit',
              background: tab === id ? '#fff' : 'transparent', color: tab === id ? '#2E3350' : '#B9BEDA',
            }}>{label}</button>
          ))}
          <button
            onClick={() => { store.lockParent(); store.go('profiles') }}
            style={{ fontSize: 13, fontWeight: 700, padding: '6px 13px', borderRadius: 99, color: '#FFC94D', fontFamily: 'inherit' }}
          >Lås & stäng</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', color: '#2A2F3A' }}>
        {tab === 'oversikt' && <OverviewTab />}
        {tab === 'barn' && <ChildrenTab />}
        {tab === 'beloningar' && <RewardsTab />}
        {tab === 'sakerhet' && <SafetyTab />}
      </div>
    </div>
  )
}

const pcard: React.CSSProperties = {
  background: '#fff', borderRadius: 14, padding: '14px 16px',
  boxShadow: '0 2px 8px rgba(40,40,60,.06)', marginBottom: 12,
}
const h4: React.CSSProperties = { margin: '0 0 10px', fontSize: 14.5, fontWeight: 800 }

/* ---------- Översikt ---------- */

function OverviewTab() {
  const store = useStore()
  const { children } = store.household
  if (children.length === 0) return <p style={{ fontWeight: 700 }}>Lägg till ett barn under "Barn & tid" så kommer rapporterna hit.</p>
  return (
    <div style={{ maxWidth: 760 }}>
      {children.map((child) => <ChildReport key={child.id} child={child} />)}
    </div>
  )
}

function ChildReport({ child }: { child: ChildProfile }) {
  const store = useStore()
  const report = weeklyReport(child, nowISO())
  const scratches = child.answers.filter((a) => a.scratchPng).slice(-4).reverse()
  const [showScratch, setShowScratch] = useState(false)
  return (
    <div style={pcard}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ width: 34, height: 34, borderRadius: '50%', background: child.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
          {child.name.charAt(0).toUpperCase()}
        </span>
        <strong style={{ fontSize: 15 }}>{child.name}</strong>
        <span style={{ color: '#8B8FA0', fontSize: 13, fontWeight: 700 }}>
          senaste 7 dagarna · {report.activeDays} {report.activeDays === 1 ? 'dag' : 'dagar'} · {report.totalMinutes} min
        </span>
      </div>

      {!child.diagnosis.done ? (
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
          Startdiagnosen pågår ({child.diagnosis.passesDone} av {child.diagnosis.passesTotal} pass klara).
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13.5, fontWeight: 700, marginBottom: 8 }}>
            <span>✏️ {report.answers} uppgifter</span>
            <span>✅ {Math.round(report.accuracy * 100)} % rätt</span>
            <span>⚔️ {report.bossesWon} bossar</span>
            <span>💎 {report.starsWon} stjärnnivåer</span>
            {report.answers > 0 && <span>😴 slarvfel: {Math.round(report.slarvRatio * 100)} % av felen</span>}
          </div>
          {report.perArea.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              {report.perArea.map((a) => (
                <span key={a.area} style={{ fontSize: 12, fontWeight: 700, background: '#F4F3EF', borderRadius: 99, padding: '3px 10px' }}>
                  {areaName(a.area)}: {Math.round(a.accuracy * 100)} %
                </span>
              ))}
            </div>
          )}
          {child.blixt && Object.keys(child.blixt).length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              {BLIXT_TESTS.filter((t) => child.blixt?.[t.kind]).map((t) => {
                const record = child.blixt![t.kind]!
                const target = blixtTarget(t.kind, store.household.blixtTargets)
                return (
                  <span key={t.kind} style={{
                    fontSize: 12, fontWeight: 700, borderRadius: 99, padding: '3px 10px',
                    background: record.best >= target ? '#E4F4EC' : '#F4F3EF',
                    color: record.best >= target ? '#1F7A50' : '#2A2F3A',
                  }}>
                    {t.emoji} {t.title}: {record.best}/min {record.best >= target ? '· skolmålet nått 🎯' : `(mål ${target})`}
                  </span>
                )
              })}
            </div>
          )}
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.6 }}>
            {report.notes.map((note, i) => <li key={i}>{note}</li>)}
          </ul>
          {scratches.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <button onClick={() => setShowScratch(!showScratch)} style={{ fontSize: 13, fontWeight: 800, color: '#4A56C6' }}>
                ✏️ Senaste uträkningarna {showScratch ? '▲' : '▼'}
              </button>
              {showScratch && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                  {scratches.map((a, i) => (
                    <img key={i} src={a.scratchPng} alt="Kladdyta" style={{ width: 150, borderRadius: 8, border: '1px solid #EDEAE2' }} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ---------- Barn & tid ---------- */

const YEARS: SchoolYear[] = ['F', '1', '2', '3', '4', '5', '6']

function ChildrenTab() {
  const store = useStore()
  const [showForm, setShowForm] = useState(store.household.children.length === 0)

  return (
    <div style={{ maxWidth: 640 }}>
      {store.household.children.map((child) => <ChildSettings key={child.id} child={child} />)}

      {showForm ? <NewChildForm onDone={() => setShowForm(false)} /> : (
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Lägg till barn</button>
      )}

      {store.household.children.length > 0 && <BlixtTargets />}
      {store.household.children.length > 0 && <VoicePicker />}
      {store.household.children.length > 0 && <ChatConfig />}
    </div>
  )
}

/* ---------- Uppläsningsrösten (per enhet) ---------- */

function VoicePicker() {
  const [voices, setVoices] = useState(swedishVoices())
  const [selected, setSelected] = useState(preferredVoiceURI() ?? '')

  // Röstlistan kan ladda asynkront — och Safari lämnar den TOM tills
  // något faktiskt talat. Väck den och håll utkik så länge fliken visas.
  useEffect(() => {
    if (voices.length > 0 || !ttsAvailable()) return
    kickVoiceList()
    const timer = window.setInterval(() => {
      const found = swedishVoices()
      if (found.length > 0) {
        setVoices(found)
        window.clearInterval(timer)
      }
    }, 700)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // I en tryckgest (iOS-krav): väck listan och läs om den.
  const searchAgain = (): void => {
    kickVoiceList()
    window.setTimeout(() => setVoices(swedishVoices()), 600)
  }

  return (
    <div style={{ ...pcard, marginTop: 12 }}>
      <h4 style={h4}>🔊 Uppläsningsröst</h4>
      <p style={{ margin: '0 0 8px', fontSize: 13, color: '#8B8FA0', fontWeight: 600, lineHeight: 1.5 }}>
        <strong>Bäst kvalitet:</strong> lägg in en Gemini-nyckel (under AI-chatten nedan) och välj
        "Pi:s molnröst" — mänsklig röst, kräver internet (lokal röst tar över offline).
        <br /><strong>Bra offline-röst:</strong> hämta "Alva (förbättrad)" på iPaden gratis via
        Inställningar → Tillgänglighet → Talat innehåll → Röster → Svenska, och starta om appen.
        Röstvalet sparas per enhet.
      </p>
      {/* Väljaren visas alltid när något finns att välja — molnrösten får
          aldrig gömmas bara för att de lokala rösterna inte laddat än. */}
      {(voices.length > 0 || cloudTtsAvailable()) && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={selected}
            onChange={(e) => {
              const uri = e.target.value
              setSelected(uri)
              setPreferredVoice(uri || null)
              speakSample(uri || undefined)
            }}
            style={{ flex: 1, minWidth: 220, fontSize: 14, fontWeight: 700, padding: '8px 12px', borderRadius: 10, border: '2px solid #EDEAE2' }}
          >
            <option value="">Automatiskt (bästa tillgängliga)</option>
            {cloudTtsAvailable() && (
              <option value={CLOUD_VOICE}>🌟 Pi:s molnröst — bäst kvalitet (Gemini, kräver internet)</option>
            )}
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name}{v.localService ? '' : ' (kräver internet)'}
              </option>
            ))}
          </select>
          <button className="btn btn-ghost" onClick={() => speakSample(selected || undefined)}>
            ▶ Lyssna
          </button>
        </div>
      )}
      {ttsAvailable() && voices.length === 0 && (
        <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 700, color: '#B4552E' }}>
          Inga lokala svenska röster hittade ännu.{' '}
          <button onClick={searchAgain} style={{ fontWeight: 800, color: '#4A56C6', textDecoration: 'underline' }}>
            Sök igen
          </button>
          {cloudTtsAvailable() ? ' — Pi:s molnröst ovan fungerar ändå!' : ''}
        </p>
      )}
    </div>
  )
}

/* ---------- AI-chatten: leverantör + nyckel (bor bara på enheten) ---------- */

function ChatConfig() {
  const store = useStore()
  const current = store.household.chat
  const [provider, setProvider] = useState<'gemini' | 'claude'>(current?.provider ?? 'gemini')
  const [key, setKey] = useState('')
  const [saved, setSaved] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; detail: string } | null>(null)
  const [testing, setTesting] = useState(false)

  const runTest = async (): Promise<void> => {
    if (!current?.apiKey) return
    setTesting(true)
    setTestResult(null)
    setTestResult(await pingProvider(current.provider, current.apiKey))
    setTesting(false)
  }

  return (
    <div style={{ ...pcard, marginTop: 12 }}>
      <h4 style={h4}>🐧 AI-chatten "Mattekompisen Pi"</h4>
      <p style={{ margin: '0 0 8px', fontSize: 13, color: '#8B8FA0', fontWeight: 600, lineHeight: 1.5 }}>
        Pi svarar sokratiskt (ledtrådar, aldrig facit), pratar bara matte och loggar allt under Säkerhet.
        Nyckeln sparas <strong>enbart på den här enheten</strong> — den hamnar aldrig i någon kod, på någon
        server eller i backupfiler. Gemini har en gratis nivå (skaffa nyckel på aistudio.google.com);
        Claude-nyckel skapas på console.anthropic.com.
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button className="chip" onClick={() => setProvider('gemini')} style={provider === 'gemini' ? activeChip : {}}>Gemini (gratis nivå)</button>
        <button className="chip" onClick={() => setProvider('claude')} style={provider === 'claude' ? activeChip : {}}>Claude</button>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          type="password"
          value={key}
          onChange={(e) => { setKey(e.target.value); setSaved(false) }}
          placeholder={current?.apiKey ? 'Nyckel inlagd — klistra in ny för att byta' : 'Klistra in API-nyckeln här'}
          style={{ flex: 1, minWidth: 220, fontSize: 14, fontWeight: 600, padding: '9px 14px', borderRadius: 10, border: '2px solid #EDEAE2' }}
        />
        <button
          className="btn btn-primary"
          disabled={key.trim().length < 10}
          onClick={() => { store.setChatConfig({ provider, apiKey: key.trim() }); setKey(''); setSaved(true) }}
        >Spara ✔</button>
        {current?.apiKey && (
          <>
            <button className="btn btn-ghost" disabled={testing} onClick={() => void runTest()}>
              {testing ? 'Testar …' : 'Testa anslutningen'}
            </button>
            <button className="btn btn-quiet" onClick={() => { store.setChatConfig(null); setSaved(false); setTestResult(null) }}>
              Ta bort nyckeln
            </button>
          </>
        )}
      </div>
      {testResult && (
        <p style={{
          margin: '8px 0 0', fontSize: 13, fontWeight: 700, lineHeight: 1.5,
          color: testResult.ok ? '#1F7A50' : '#B4552E',
          overflowWrap: 'anywhere',
        }}>
          {testResult.ok ? '✓ Anslutningen fungerar! ' : '✗ Fel: '}{testResult.detail}
        </p>
      )}
      <p style={{ margin: '8px 0 0', fontSize: 12.5, fontWeight: 700, color: current?.apiKey ? '#1F7A50' : '#8B8FA0' }}>
        {saved ? 'Sparat! Slå nu på chatten per barn ovan.' : current?.apiKey ? `✓ ${current.provider === 'gemini' ? 'Gemini' : 'Claude'}-nyckel finns på enheten. Chatten slås på per barn ovan.` : 'Ingen nyckel inlagd — Pi sover tills vidare.'}
      </p>
      <p style={{ margin: '6px 0 0', fontSize: 12, color: '#8B8FA0', fontWeight: 600 }}>
        Max 30 meddelanden per barn och dag. Chatten är alltid avstängd under bosstrider och prov.
      </p>
    </div>
  )
}

function BlixtTargets() {
  const store = useStore()
  return (
    <div style={{ ...pcard, marginTop: 12 }}>
      <h4 style={h4}>⚡ Skolans minutmål (blixtpassen)</h4>
      <p style={{ margin: '0 0 8px', fontSize: 13, color: '#8B8FA0', fontWeight: 600 }}>
        Antal rätt på en minut som skolan kräver. Barnen ser målet som en ribba att nå — rekordjakten är mot sig själva.
      </p>
      {BLIXT_TESTS.map((test) => (
        <div key={test.kind} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', fontSize: 14, fontWeight: 700 }}>
          <span>{test.emoji} {test.title}</span>
          <select
            value={blixtTarget(test.kind, store.household.blixtTargets)}
            onChange={(e) => store.setBlixtTarget(test.kind, Number(e.target.value))}
            style={{ fontSize: 14, fontWeight: 700, padding: '4px 10px', borderRadius: 8, border: '1.5px solid #EDEAE2' }}
          >
            {[10, 12, 15, 18, 20, 22, 25, 28, 30, 35, 40].map((n) => <option key={n} value={n}>{n} rätt</option>)}
          </select>
        </div>
      ))}
    </div>
  )
}

function ChildSettings({ child }: { child: ChildProfile }) {
  const store = useStore()
  return (
    <div style={pcard}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ width: 30, height: 30, borderRadius: '50%', background: child.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14 }}>
          {child.name.charAt(0).toUpperCase()}
        </span>
        <strong>{child.name}</strong>
        <span style={{ color: '#8B8FA0', fontSize: 13, fontWeight: 700 }}>f. {child.birthYear} · åk {child.schoolYear}</span>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 14, fontWeight: 700, padding: '6px 0' }}>
        <span>⏱ Tid per dag: <strong>{child.dailyLimitMinutes} min</strong></span>
        <input
          type="range" min={10} max={60} step={5} value={child.dailyLimitMinutes}
          onChange={(e) => store.updateChild(child.id, { dailyLimitMinutes: Number(e.target.value) })}
          style={{ flex: 1, maxWidth: 260, accentColor: '#4A56C6' }}
        />
      </label>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, padding: '6px 0' }}>
        <span>💬 Mattekompisen Pi (AI-chatt)</span>
        <button
          onClick={() => store.updateChild(child.id, { chatEnabled: !child.chatEnabled })}
          aria-label={child.chatEnabled ? 'Stäng av chatten' : 'Sätt på chatten'}
          style={{
            width: 40, height: 22, borderRadius: 99, position: 'relative', transition: 'background 0.2s',
            background: child.chatEnabled ? '#3FBF87' : '#C9C5B8',
          }}
        >
          <span style={{
            position: 'absolute', top: 2, left: child.chatEnabled ? 20 : 2, width: 18, height: 18,
            borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
          }} />
        </button>
      </div>
      {child.chatEnabled && !store.household.chat?.apiKey && (
        <p style={{ margin: '0 0 6px', fontSize: 12.5, color: '#B4552E', fontWeight: 700 }}>
          Chatten är på för {child.name}, men ingen AI-nyckel är inlagd ännu — se "AI-chatten" nedan.
        </p>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, padding: '6px 0' }}>
        <span>🎓 Skolår (styr terminsmålen)</span>
        <select
          value={child.schoolYear}
          onChange={(e) => store.updateChild(child.id, { schoolYear: e.target.value as SchoolYear })}
          style={{ fontSize: 14, fontWeight: 700, padding: '4px 10px', borderRadius: 8, border: '1.5px solid #EDEAE2' }}
        >
          {YEARS.map((y) => <option key={y} value={y}>{y === 'F' ? 'Förskoleklass' : `Åk ${y}`}</option>)}
        </select>
      </div>
    </div>
  )
}

function NewChildForm({ onDone }: { onDone(): void }) {
  const store = useStore()
  const thisYear = new Date().getFullYear()
  const [name, setName] = useState('')
  const [birthYear, setBirthYear] = useState(thisYear - 8)
  const [schoolYear, setSchoolYear] = useState<SchoolYear>('2')
  const [color, setColor] = useState<string>(KID_COLORS[store.household.children.length % KID_COLORS.length])
  const [minutes, setMinutes] = useState(20)

  const save = (): void => {
    if (!name.trim()) return
    store.addChild({ name: name.trim(), color, birthYear, schoolYear, dailyLimitMinutes: minutes })
    onDone()
  }

  return (
    <div style={pcard}>
      <h4 style={h4}>Nytt barn</h4>
      <div style={{ display: 'grid', gap: 10 }}>
        <input
          value={name} onChange={(e) => setName(e.target.value)} placeholder="Namn"
          style={{ fontSize: 16, fontWeight: 700, padding: '10px 14px', borderRadius: 10, border: '2px solid #EDEAE2' }}
        />
        <label style={{ fontSize: 14, fontWeight: 700, display: 'flex', gap: 10, alignItems: 'center' }}>
          Födelseår:
          <select value={birthYear} onChange={(e) => setBirthYear(Number(e.target.value))} style={{ fontSize: 14, fontWeight: 700, padding: '4px 10px', borderRadius: 8 }}>
            {Array.from({ length: 10 }).map((_, i) => {
              const y = thisYear - 5 - i
              return <option key={y} value={y}>{y}</option>
            })}
          </select>
          Börjar i:
          <select value={schoolYear} onChange={(e) => setSchoolYear(e.target.value as SchoolYear)} style={{ fontSize: 14, fontWeight: 700, padding: '4px 10px', borderRadius: 8 }}>
            {YEARS.map((y) => <option key={y} value={y}>{y === 'F' ? 'Förskoleklass' : `Åk ${y}`}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 14, fontWeight: 700, display: 'flex', gap: 10, alignItems: 'center' }}>
          Tid per dag: {minutes} min
          <input type="range" min={10} max={60} step={5} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} style={{ flex: 1, accentColor: '#4A56C6' }} />
        </label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 700 }}>
          Färg:
          {KID_COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)} aria-label={`Färg ${c}`} style={{
              width: 26, height: 26, borderRadius: '50%', background: c,
              border: '2px solid #fff', boxShadow: color === c ? `0 0 0 3px ${c}` : '0 0 0 1px #EDEAE2',
            }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-quiet" onClick={onDone}>Avbryt</button>
          <button className="btn btn-primary" onClick={save} disabled={!name.trim()}>Spara barnet ✔</button>
        </div>
      </div>
    </div>
  )
}

/* ---------- Belöningar ---------- */

const REWARD_EMOJI = ['🎬', '🍦', '⚽', '🎮', '📚', '🧁', '🏊', '🎨'] as const

function RewardsTab() {
  const store = useStore()
  const { children, rewards } = store.household
  const [childId, setChildId] = useState(children[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [emoji, setEmoji] = useState<string>(REWARD_EMOJI[0])
  const [targetType, setTargetType] = useState<'moments' | 'sessions' | 'term-goal'>('moments')
  const [count, setCount] = useState(5)

  if (children.length === 0) return <p style={{ fontWeight: 700 }}>Lägg till ett barn först.</p>

  const create = (): void => {
    if (!title.trim() || !childId) return
    const child = children.find((c) => c.id === childId)!
    const target =
      targetType === 'term-goal'
        ? ({ type: 'term-goal', year: child.schoolYear, term: currentTerm(), half: currentHalf() } as const)
        : ({ type: targetType, count } as const)
    store.addReward(childId, title.trim(), emoji, target)
    setTitle('')
  }

  return (
    <div style={{ maxWidth: 640 }}>
      {rewards.filter((r) => !r.redeemedAt).map((reward) => {
        const child = children.find((c) => c.id === reward.childId)
        if (!child) return null
        const progress = rewardProgress(reward, child)
        return (
          <div key={reward.id} style={{ ...pcard, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 26 }}>{reward.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ fontSize: 14 }}>{reward.title}</strong>
              <span style={{ color: '#8B8FA0', fontSize: 13, fontWeight: 700 }}> · {child.name}</span>
              <div style={{ fontSize: 12.5, color: '#8B8FA0', fontWeight: 700 }}>
                {progress.label}{!progress.earned ? ` — ${progress.requirement.toLowerCase()}` : ''}
              </div>
              <div style={{ height: 7, borderRadius: 99, background: '#EDEAE2', overflow: 'hidden', marginTop: 4 }}>
                <i style={{ display: 'block', height: '100%', width: `${progress.ratio * 100}%`, background: progress.earned ? '#3FBF87' : '#FFC94D', borderRadius: 99 }} />
              </div>
            </div>
            {progress.earned ? (
              <button className="btn btn-ok" style={{ fontSize: 13, padding: '8px 16px' }} onClick={() => store.redeemReward(reward.id)}>
                Kvittera kupong ✔
              </button>
            ) : (
              <button onClick={() => store.deleteReward(reward.id)} style={{ fontSize: 12, fontWeight: 700, color: '#8B8FA0' }}>Ta bort</button>
            )}
          </div>
        )
      })}

      <div style={pcard}>
        <h4 style={h4}>Ny belöning</h4>
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {children.map((c) => (
              <button key={c.id} className="chip" onClick={() => setChildId(c.id)} style={childId === c.id ? { borderColor: c.color, color: c.color } : {}}>
                {c.name}
              </button>
            ))}
          </div>
          <input
            value={title} onChange={(e) => setTitle(e.target.value)} placeholder='T.ex. "Biokväll med pappa"'
            style={{ fontSize: 15, fontWeight: 700, padding: '10px 14px', borderRadius: 10, border: '2px solid #EDEAE2' }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            {REWARD_EMOJI.map((e) => (
              <button key={e} onClick={() => setEmoji(e)} style={{ fontSize: 22, padding: 4, borderRadius: 8, background: emoji === e ? '#EDEAE2' : 'transparent' }}>{e}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 14, fontWeight: 700 }}>
            <button className="chip" onClick={() => setTargetType('moments')} style={targetType === 'moments' ? activeChip : {}}>Klarade moment</button>
            <button className="chip" onClick={() => setTargetType('sessions')} style={targetType === 'sessions' ? activeChip : {}}>Träningsdagar</button>
            <button className="chip" onClick={() => setTargetType('term-goal')} style={targetType === 'term-goal' ? activeChip : {}}>Terminsmål (läroplan)</button>
            {targetType !== 'term-goal' && (
              <label>
                Antal:{' '}
                <select value={count} onChange={(e) => setCount(Number(e.target.value))} style={{ fontSize: 14, fontWeight: 700, padding: '3px 8px', borderRadius: 8 }}>
                  {[3, 5, 8, 10, 15, 20].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            )}
          </div>
          {targetType === 'term-goal' && (
            <p style={{ margin: 0, fontSize: 13, color: '#8B8FA0', fontWeight: 600 }}>
              Kopplas till innevarande terminshalva enligt läroplanen för barnets skolår — appen räknar själv ut vilka moment som ingår.
            </p>
          )}
          <button className="btn btn-primary" onClick={create} disabled={!title.trim()}>Skapa belöning ✔</button>
        </div>
      </div>
    </div>
  )
}

const activeChip: React.CSSProperties = { borderColor: '#4A56C6', color: '#4A56C6' }

const currentTerm = (): 'HT' | 'VT' => (new Date().getMonth() >= 6 ? 'HT' : 'VT')
const currentHalf = (): 1 | 2 => {
  const m = new Date().getMonth()
  if (m >= 6) return m <= 9 ? 1 : 2 // HT: aug–okt / nov–dec
  return m <= 2 ? 1 : 2 // VT: jan–mars / april–juni
}

/* ---------- Chattloggen: full föräldrainsyn, inkl. avböjda försök ---------- */

function ChatLogCard() {
  const store = useStore()
  const { chatLog, children } = store.household
  const [showAll, setShowAll] = useState(false)
  const entries = [...chatLog].reverse()
  const shown = showAll ? entries.slice(0, 200) : entries.slice(0, 12)
  const nameOf = (id: string): string => children.find((c) => c.id === id)?.name ?? '?'

  return (
    <div style={pcard}>
      <h4 style={h4}>💬 Chattlogg ({chatLog.length})</h4>
      {chatLog.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55 }}>
          Alla samtal med Pi hamnar här — inklusive avböjda försök att byta ämne. Varje meddelande
          passerar ett ämnesfilter innan det besvaras, och chatten slås på per barn under "Barn & tid".
        </p>
      ) : (
        <>
          {shown.map((e, i) => (
            <div key={i} style={{
              padding: '6px 0', borderBottom: '1px dashed #EDEAE2', fontSize: 13, lineHeight: 1.5,
              color: e.refusedOffTopic ? '#B4552E' : '#5B6070',
            }}>
              <strong style={{ color: '#2A2F3A' }}>
                {e.role === 'child' ? nameOf(e.childId) : 'Pi'}
              </strong>
              <span style={{ color: '#B0B4C2', fontSize: 11.5 }}> · {e.at.slice(5, 16).replace('T', ' ')}</span>
              {e.refusedOffTopic && <strong> · avböjt av ämnesfiltret</strong>}
              <br />
              {e.text}
              {e.scratchPng && (
                <img src={e.scratchPng} alt="Kladdyta" style={{ display: 'block', width: 120, borderRadius: 6, marginTop: 4, border: '1px solid #EDEAE2' }} />
              )}
            </div>
          ))}
          {entries.length > 12 && (
            <button onClick={() => setShowAll(!showAll)} style={{ marginTop: 8, fontSize: 13, fontWeight: 800, color: '#4A56C6' }}>
              {showAll ? 'Visa färre ▲' : `Visa alla (${entries.length}) ▼`}
            </button>
          )}
        </>
      )}
    </div>
  )
}

/* ---------- Säkerhet ---------- */

function SafetyTab() {
  const store = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  const days = daysSinceBackup(store.household, nowISO())

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={pcard}>
        <h4 style={h4}>💾 Säkerhetskopia</h4>
        <p style={{ margin: '0 0 10px', fontSize: 13.5, lineHeight: 1.55 }}>
          All data bor lokalt på den här enheten. Exportera regelbundet till en fil (sparas via Filer/AirDrop) —
          det är skyddet om plattan rensas eller byts, och sättet att flytta ett barn till en ny enhet.
        </p>
        <p style={{ margin: '0 0 10px', fontSize: 13.5, fontWeight: 700, color: days === null || days > 14 ? '#B4552E' : '#8B8FA0' }}>
          {days === null ? 'Ingen säkerhetskopia gjord ännu.' : `Senaste kopian: för ${days} ${days === 1 ? 'dag' : 'dagar'} sedan.`}
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => { exportHousehold(store.household); store.noteBackup() }}>
            Exportera nu ↓
          </button>
          <button className="btn btn-quiet" onClick={() => fileRef.current?.click()}>Läs in kopia …</button>
          <input
            ref={fileRef} type="file" accept="application/json" style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              void importHousehold(file)
                .then((h) => { store.replaceHousehold(h); setMessage('Kopian är inläst! ✔') })
                .catch((err: Error) => setMessage(err.message))
              e.target.value = ''
            }}
          />
        </div>
        {message && <p style={{ margin: '10px 0 0', fontWeight: 700, fontSize: 13.5 }}>{message}</p>}
      </div>

      <ChatLogCard />

      <div style={pcard}>
        <h4 style={h4}>ℹ️ Om appen</h4>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55 }}>
          Barnens Plugg följer Lgr22:s centrala innehåll för matematik F–åk 6. Uppgifterna genereras av appens egen kod
          (aldrig AI), svårigheten anpassas efter varje barn, och repetition schemaläggs med växande intervall.
          Ingen data lämnar enheten.
        </p>
      </div>
    </div>
  )
}
