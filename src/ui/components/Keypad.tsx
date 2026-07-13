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
}

export function Keypad({ value, onChange, onSubmit, allowNegative, allowDecimal, disabled }: KeypadProps) {
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

  const keyStyle: React.CSSProperties = {
    background: 'var(--card)', border: '2px solid var(--line)', borderRadius: 14,
    fontSize: 24, fontWeight: 800, padding: '12px 0', boxShadow: '0 3px 0 var(--line)',
    fontFamily: 'inherit', color: 'var(--ink)',
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, maxWidth: 290, width: '100%' }}>
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
        <button key={k} style={keyStyle} onClick={() => press(k)} disabled={disabled}>{k}</button>
      ))}
      <button
        style={{ ...keyStyle, color: 'var(--muted)' }}
        onClick={() => press(allowNegative ? '−' : allowDecimal ? ',' : '⌫')}
        disabled={disabled || (!allowNegative && !allowDecimal && value === '')}
      >
        {allowNegative ? '−' : allowDecimal ? ',' : '⌫'}
      </button>
      <button style={keyStyle} onClick={() => press('0')} disabled={disabled}>0</button>
      {(allowNegative || allowDecimal) ? (
        <button style={{ ...keyStyle, color: 'var(--muted)' }} onClick={() => press('⌫')} disabled={disabled}>⌫</button>
      ) : (
        <button
          style={{ ...keyStyle, background: 'var(--mint)', borderColor: 'var(--mint)', color: '#fff', boxShadow: '0 3px 0 var(--mint-shadow)' }}
          onClick={onSubmit}
          disabled={disabled || value === '' || value === '−'}
        >✓</button>
      )}
      {(allowNegative || allowDecimal) && (
        <button
          style={{ ...keyStyle, gridColumn: 'span 3', background: 'var(--mint)', borderColor: 'var(--mint)', color: '#fff', boxShadow: '0 3px 0 var(--mint-shadow)' }}
          onClick={onSubmit}
          disabled={disabled || value === '' || value === '−'}
        >Svara ✓</button>
      )}
    </div>
  )
}
