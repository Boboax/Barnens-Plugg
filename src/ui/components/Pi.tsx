/* Maskoten Pingvinen Pi. Ritas i SVG så den kan skalas och få humör. */

export type PiMood = 'glad' | 'hejar' | 'sover' | 'funderar'

export function Pi({ mood = 'glad', size = 90 }: { mood?: PiMood; size?: number }) {
  const sleeping = mood === 'sover'
  return (
    <svg width={size} height={size * 1.07} viewBox="0 0 86 92" aria-hidden="true">
      {mood === 'hejar' && (
        <>
          <ellipse cx="10" cy="46" rx="9" ry="4.5" fill="#2E3350" transform="rotate(-40 10 46)" />
          <ellipse cx="76" cy="46" rx="9" ry="4.5" fill="#2E3350" transform="rotate(40 76 46)" />
        </>
      )}
      <ellipse cx="43" cy="56" rx="30" ry="34" fill="#2E3350" />
      <ellipse cx="43" cy="62" rx="20" ry="25" fill="#fff" />
      {sleeping ? (
        <>
          <path d="M29,42 q5,4 10,0" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M47,42 q5,4 10,0" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <text x="62" y="26" fontSize="13" fill="#8A8FA8" fontWeight="700">z</text>
          <text x="70" y="16" fontSize="10" fill="#8A8FA8" fontWeight="700">z</text>
        </>
      ) : (
        <>
          <circle cx="34" cy="42" r="4.5" fill="#fff" />
          <circle cx="52" cy="42" r="4.5" fill="#fff" />
          <circle cx="35" cy="43" r="2.2" fill="#2E3350" />
          <circle cx="51" cy="43" r="2.2" fill="#2E3350" />
        </>
      )}
      {mood === 'funderar' && <circle cx="63" cy="30" r="3" fill="none" stroke="#8A8FA8" strokeWidth="1.5" />}
      <polygon points="43,48 37,54 49,54" fill="#FFC94D" />
      {mood === 'hejar' && <path d="M35,58 q8,6 16,0" stroke="#2E3350" strokeWidth="2.5" fill="none" strokeLinecap="round" />}
      <ellipse cx="33" cy="88" rx="9" ry="4" fill="#FFC94D" />
      <ellipse cx="53" cy="88" rx="9" ry="4" fill="#FFC94D" />
    </svg>
  )
}
