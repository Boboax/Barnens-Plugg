/* ============================================================
   Appens egen sifferknappsats — stora tryckytor, täcker aldrig
   uppgiften (till skillnad från iPad-tangentbordet).
   Stöder minustecken och decimalkomma när uppgiften kräver det.
   ============================================================ */

import { sfx } from '../../sound'

interface KeypadProps {
  value: string
  onChange(next: string): void
  onSubmit(): void
  allowNegative?: boolean
  allowDecimal?: boolean
  disabled?: boolean
  /** 'stor' = blixtpassen: stora tryckytor för snabba, säkra tryck. */
  size?: 'normal' | 'stor'
}

export function Keypad({ value, onChange, onSubmit, allowNegative, allowDecimal, disabled, size = 'normal' }: KeypadProps) {
  const press = (key: string): void => {
    if (disabled) return
    sfx.klick()
    if (key === '⌫') return onChange(value.slice(0, -1))
    if (key === '−') return onChange(value.startsWith('−') ? value.slice(1) : `−${value}`)
    if (key === ',') {
      if (value.includes(',')) return
      return onChange(value === '' || value === '−' ? `${value}0,` : `${value},`)
    }
    if (value.replace('−', '').replace(',', '').length >= 7) return
    onChange(value + key)
  }

  const stor = size === 'stor'
  // Infattad speltangent i ben/brons: mörk siffra på ljus yta (läsbarhet),
  // mässingskant + bronssockel som trycks ihop vid klick (.keycap).
  const keyStyle: React.CSSProperties = {
    background: 'linear-gradient(180deg, #FBF4E2 0%, #E7D8B8 100%)',
    border: '2px solid #8A6A38', borderRadius: stor ? 18 : 14,
    fontSize: stor ? 34 : 24, fontWeight: 800, padding: stor ? '20px 0' : '12px 0',
    boxShadow: 'inset 0 2px 0 rgba(255,255,255,.75), 0 4px 0 #8A6A38, 0 5px 6px rgba(30,22,8,.22)',
    fontFamily: 'inherit', color: '#46351E',
  }
  const gemStyle: React.CSSProperties = {
    ...keyStyle,
    background: 'linear-gradient(180deg, #5FCE9C 0%, var(--mint) 52%, #237552 100%)',
    border: '2px solid #6E5426', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,.45)',
    boxShadow: 'inset 0 2px 0 rgba(255,255,255,.4), 0 4px 0 #574321, 0 5px 6px rgba(30,22,8,.3)',
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: stor ? 12 : 8, maxWidth: stor ? 460 : 290, width: '100%' }}>
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
        <button key={k} className="keycap" style={keyStyle} onClick={() => press(k)} disabled={disabled}>{k}</button>
      ))}
      <button
        className="keycap"
        style={{ ...keyStyle, color: '#7A6338' }}
        onClick={() => press(allowNegative ? '−' : allowDecimal ? ',' : '⌫')}
        disabled={disabled || (!allowNegative && !allowDecimal && value === '')}
      >
        {allowNegative ? '−' : allowDecimal ? ',' : '⌫'}
      </button>
      <button className="keycap" style={keyStyle} onClick={() => press('0')} disabled={disabled}>0</button>
      {(allowNegative || allowDecimal) ? (
        <button className="keycap" style={{ ...keyStyle, color: '#7A6338' }} onClick={() => press('⌫')} disabled={disabled}>⌫</button>
      ) : (
        <button
          className="keycap"
          style={gemStyle}
          onClick={onSubmit}
          disabled={disabled || value === '' || value === '−'}
        >✓</button>
      )}
      {(allowNegative || allowDecimal) && (
        <button
          className="keycap"
          style={{ ...gemStyle, gridColumn: 'span 3' }}
          onClick={onSubmit}
          disabled={disabled || value === '' || value === '−'}
        >Svara ✓</button>
      )}
    </div>
  )
}
