/* Vännernas lya under trädrötterna — där de bor tills barnet köper
   husdjurstältet. Ritad i SVG tills ChatGPT:s målade lya levereras
   (pet-den-interior.png → art/camp/pet-den-interior-v1.webp); sätt då
   DEN_ART_READY till true. Samma fyra sovhörnor som tältet (bed-1..4). */

export const DEN_ART_READY = false

const MUSHROOMS = [
  { x: 120, y: 520, s: 1 }, { x: 175, y: 540, s: .7 }, { x: 1330, y: 500, s: 1.1 },
  { x: 1400, y: 530, s: .8 }, { x: 760, y: 300, s: .6 }, { x: 980, y: 290, s: .5 },
]
const FIREFLIES = [[300, 260], [520, 180], [700, 240], [910, 170], [1120, 230], [1260, 320], [420, 380], [1000, 400]]

export function DenScene() {
  return (
    <svg className="pet-house-backdrop pet-den" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice"
      role="img" aria-label="En mysig lya under ett stort träds rötter, med mossgolv och lysande svampar">
      <defs>
        <radialGradient id="den-glow" cx="22%" cy="62%" r="70%">
          <stop offset="0" stopColor="#FFB45A" stopOpacity=".55" />
          <stop offset=".45" stopColor="#7A4320" stopOpacity=".35" />
          <stop offset="1" stopColor="#1B110C" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="den-earth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2A1A12" />
          <stop offset="1" stopColor="#3E2717" />
        </linearGradient>
        <radialGradient id="den-moss" cx="50%" cy="40%" r="65%">
          <stop offset="0" stopColor="#6E8F3E" />
          <stop offset="1" stopColor="#2F4A22" />
        </radialGradient>
        <radialGradient id="den-mush" cx="50%" cy="40%" r="60%">
          <stop offset="0" stopColor="#E9FFF4" />
          <stop offset=".5" stopColor="#7FE3C6" />
          <stop offset="1" stopColor="#2C8C7A" />
        </radialGradient>
      </defs>
      <rect width="1536" height="1024" fill="url(#den-earth)" />
      {/* Öppningen mot lägret: kvällshimmel och sjön i månsken. */}
      <path d="M560 40 C640 -10 900 -10 980 40 C1010 160 990 260 950 300 L590 300 C550 260 530 160 560 40 Z" fill="#1E2C48" />
      <path d="M590 250 L950 250 L950 300 L590 300 Z" fill="#2E4566" opacity=".8" />
      <circle cx="880" cy="90" r="22" fill="#F6F1D8" opacity=".9" />
      <rect width="1536" height="1024" fill="url(#den-glow)" />
      {/* Rötterna som bildar väggar och tak. */}
      {[
        'M0 120 C220 60 420 120 560 40', 'M1536 140 C1300 60 1100 110 980 40',
        'M0 300 C180 260 300 330 420 420 C470 470 440 560 380 640', 'M1536 300 C1360 270 1240 330 1120 430 C1070 480 1100 570 1160 650',
        'M300 0 C330 120 300 220 220 330', 'M1250 0 C1220 120 1250 220 1330 330',
        'M560 40 C520 160 540 260 600 320', 'M980 40 C1020 160 1000 260 940 320',
      ].map((d) => <path key={d} d={d} fill="none" stroke="#5A3A22" strokeWidth="46" strokeLinecap="round" opacity=".95" />)}
      {[
        'M0 120 C220 60 420 120 560 40', 'M1536 140 C1300 60 1100 110 980 40',
        'M0 300 C180 260 300 330 420 420 C470 470 440 560 380 640', 'M1536 300 C1360 270 1240 330 1120 430 C1070 480 1100 570 1160 650',
      ].map((d) => <path key={`h-${d}`} d={d} fill="none" stroke="#8A5E36" strokeWidth="10" strokeLinecap="round" opacity=".55" transform="translate(-6 -10)" />)}
      {/* Mossgolvet med fyra mjuka sovgropar. */}
      <ellipse cx="768" cy="900" rx="900" ry="300" fill="url(#den-moss)" />
      {[[490, 600], [1060, 600], [380, 820], [1150, 820]].map(([x, y]) => (
        <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="150" ry="46" fill="#3D5A2A" opacity=".75" />
      ))}
      {MUSHROOMS.map((m) => (
        <g key={`${m.x}-${m.y}`} transform={`translate(${m.x} ${m.y}) scale(${m.s})`}>
          <rect x="-6" y="0" width="12" height="40" rx="5" fill="#E8DCC0" />
          <ellipse cx="0" cy="2" rx="34" ry="20" fill="url(#den-mush)" />
          <ellipse cx="0" cy="0" rx="60" ry="40" fill="#7FE3C6" opacity=".18" />
        </g>
      ))}
      {FIREFLIES.map(([x, y], i) => (
        <circle key={i} className="pet-den-firefly" cx={x} cy={y} r="5" fill="#E3EEA1" style={{ animationDelay: `${-i * 0.9}s` }} />
      ))}
    </svg>
  )
}
