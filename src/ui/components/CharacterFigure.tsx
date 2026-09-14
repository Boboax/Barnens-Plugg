import type { CharacterMotion, PrototypeCloakId, PrototypeWeaponId } from '../../domain/character'
import { PROTOTYPE_CLOAKS } from '../../domain/character'

export interface CharacterFigureProps {
  weapon: PrototypeWeaponId
  cloak: PrototypeCloakId
  motion: CharacterMotion
  reducedMotion?: boolean
  className?: string
}

/**
 * Delad SVG-rigg för prototypen. Armar, kropp, mantel och vapen har egna
 * fästpunkter; därför går det senare att använda samma figur i garderob,
 * läger och strid utan att flytta en hel statisk bild.
 */
export function CharacterFigure({ weapon, cloak: cloakId, motion, reducedMotion = false, className = '' }: CharacterFigureProps) {
  const cloak = PROTOTYPE_CLOAKS.find((item) => item.id === cloakId) ?? PROTOTYPE_CLOAKS[0]
  const pose = reducedMotion ? 'idle' : motion
  const bow = weapon === 'moon-bow'
  return (
    <svg viewBox="0 0 360 430" role="img" aria-label={`Prototyphjälte med ${bow ? 'Månbågen' : 'Solklingan'} i ${cloak.name.toLowerCase()}`} className={`character-figure character-figure--${pose} ${className}`}>
      <defs>
        <linearGradient id="hero-skin" x1="0" x2="1"><stop stopColor="#e7a97f"/><stop offset="1" stopColor="#f7c59e"/></linearGradient>
        <linearGradient id="hero-tunic" x1="0" x2="1"><stop stopColor="#d8d4be"/><stop offset="1" stopColor="#f0ead4"/></linearGradient>
        <linearGradient id="hero-cape" x1="0" x2="1"><stop stopColor={cloak.color}/><stop offset=".55" stopColor={cloak.color}/><stop offset="1" stopColor="#20283c"/></linearGradient>
      </defs>
      <g className="character-figure__shadow"><ellipse cx="183" cy="389" rx="99" ry="17" fill="#171525" opacity=".32"/></g>
      <g className="character-figure__cape">
        <path d="M139 126 Q181 108 224 126 Q277 213 283 365 Q245 394 202 369 Q165 394 111 368 Q118 223 139 126Z" fill="url(#hero-cape)" stroke={cloak.trim} strokeWidth="6" strokeLinejoin="round"/>
        <path d="M154 151 Q142 253 133 355 M211 144 Q231 260 255 360" stroke="#fff" opacity=".16" fill="none" strokeWidth="7" strokeLinecap="round"/>
        {cloakId === 'star-cloak' && <g fill={cloak.trim}><path d="m130 252 4 10 10 4-10 4-4 10-4-10-10-4 10-4z"/><path d="m254 289 3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/></g>}
      </g>
      <g className="character-figure__back-arm" transform="rotate(-8 142 180)">
        <path d="M151 166 Q118 205 122 267" stroke="#5c4a42" strokeWidth="31" strokeLinecap="round"/>
        <circle cx="123" cy="272" r="16" fill="url(#hero-skin)"/>
      </g>
      <g className="character-figure__body">
        <path d="M145 152 Q179 133 215 153 L238 300 Q181 331 124 300Z" fill="url(#hero-tunic)" stroke="#62563f" strokeWidth="6"/>
        <path d="M130 264 Q179 282 231 264 L233 286 Q180 305 128 286Z" fill="#7d5730" stroke="#4f351e" strokeWidth="5"/>
        <path d="M157 300 L142 372 M204 300 L220 372" stroke="#475466" strokeWidth="37" strokeLinecap="round"/>
        <path d="M131 376 Q148 363 166 379 M199 379 Q218 362 238 377" stroke="#4d3328" strokeWidth="18" strokeLinecap="round"/>
      </g>
      <g className="character-figure__head">
        <circle cx="181" cy="105" r="51" fill="url(#hero-skin)" stroke="#704a3e" strokeWidth="5"/>
        <path d="M134 100 Q136 43 183 47 Q233 46 231 102 Q208 75 181 79 Q151 76 134 100Z" fill="#51392f"/>
        <path d="M162 111 Q169 116 176 111 M189 111 Q196 116 203 111" fill="none" stroke="#453642" strokeWidth="5" strokeLinecap="round"/>
        <path d="M169 133 Q181 143 194 133" fill="none" stroke="#a54d50" strokeWidth="4" strokeLinecap="round"/>
      </g>
      <g className="character-figure__front-arm" transform="rotate(7 218 176)">
        <path d="M211 165 Q244 203 237 258" stroke="#725f50" strokeWidth="31" strokeLinecap="round"/>
        <circle cx="237" cy="263" r="16" fill="url(#hero-skin)"/>
        <g className="character-figure__weapon" transform="translate(237 263)">
          {bow ? <Bow /> : <Blade />}
        </g>
      </g>
      <g className="character-figure__spark" aria-hidden="true"><circle cx="287" cy="154" r="8"/><circle cx="310" cy="131" r="4"/><circle cx="302" cy="176" r="5"/></g>
    </svg>
  )
}

function Bow() {
  return <g className="character-figure__bow"><path d="M8 -67 Q-51 -25 3 29 Q45 -22 8 -67Z" fill="none" stroke="#ba8a43" strokeWidth="10" strokeLinecap="round"/><path d="M7 -65 L3 30" stroke="#f4e8ca" strokeWidth="3"/><path d="M3 -20 L88 -20" stroke="#d7e4ff" strokeWidth="5" strokeLinecap="round"/><path d="M92 -20 l-18 -10 5 10 -5 10z" fill="#d7e4ff"/></g>
}

function Blade() {
  return <g className="character-figure__blade"><path d="M4 -10 L71 -94 L47 -5Z" fill="#d9edfb" stroke="#536f87" strokeWidth="6" strokeLinejoin="round"/><path d="M-23 3 L37 17" stroke="#d9ae55" strokeWidth="13" strokeLinecap="round"/><path d="M-11 13 L-31 42" stroke="#684328" strokeWidth="15" strokeLinecap="round"/></g>
}
