import type { CharacterMotion } from '../../domain/character'

/** Provisorisk delad SVG-rigg. Ersätts med målad konst först när poser godkänts. */
export function PrototypeBoss({ motion, reducedMotion = false, className = '' }: { motion: CharacterMotion; reducedMotion?: boolean; className?: string }) {
  const pose = reducedMotion ? 'idle' : motion
  return <svg viewBox="0 0 390 330" role="img" aria-label="Provisorisk kristalldrake" className={`prototype-boss prototype-boss--${pose} ${className}`}>
    <ellipse cx="207" cy="285" rx="128" ry="18" fill="#151224" opacity=".36"/>
    <g className="prototype-boss__tail"><path d="M225 223 Q341 223 330 278 Q304 299 277 271 Q303 258 279 253 Q251 251 224 248Z" fill="#684584" stroke="#301f51" strokeWidth="7"/></g>
    <g className="prototype-boss__wing prototype-boss__wing--back"><path d="M186 178 Q226 49 341 83 Q296 176 229 224Z" fill="#a67bd1" stroke="#42245e" strokeWidth="8"/><path d="M213 174 L293 101 M226 199 L319 116" stroke="#e6c9ff" strokeWidth="5" opacity=".65"/></g>
    <g className="prototype-boss__body"><ellipse cx="189" cy="210" rx="91" ry="68" fill="#8060ad" stroke="#382457" strokeWidth="8"/><path d="M128 221 Q178 248 246 223" stroke="#d6b4ed" strokeWidth="8" fill="none" opacity=".5"/></g>
    <g className="prototype-boss__head"><path d="M111 191 Q77 142 117 99 Q162 67 199 112 Q221 151 190 193 Q150 214 111 191Z" fill="#9d78c9" stroke="#382457" strokeWidth="8"/><path d="M111 102 118 54 144 96 M153 92 181 48 181 110" fill="#bf93ec" stroke="#382457" strokeWidth="7" strokeLinejoin="round"/><ellipse cx="125" cy="140" rx="10" ry="13" fill="#fff1ae"/><ellipse cx="170" cy="140" rx="10" ry="13" fill="#fff1ae"/><path d="M127 171 Q148 184 174 170" stroke="#43245c" strokeWidth="6" fill="none" strokeLinecap="round"/></g>
    <g className="prototype-boss__wing prototype-boss__wing--front"><path d="M211 192 Q275 97 358 148 Q297 230 224 242Z" fill="#b58bdf" stroke="#42245e" strokeWidth="8"/><path d="M236 196 L320 156 M244 217 L336 170" stroke="#f0d7ff" strokeWidth="5" opacity=".65"/></g>
    <g className="prototype-boss__crystals" fill="#d6b7ff"><path d="m242 83 16-39 12 47z"/><path d="m270 103 22-34 3 45z"/><path d="m216 73 5-34 18 38z"/></g>
    <g className="prototype-boss__blast" fill="#f3d0ff"><circle cx="55" cy="132" r="13"/><circle cx="28" cy="119" r="7"/><circle cx="42" cy="157" r="8"/></g>
  </svg>
}
