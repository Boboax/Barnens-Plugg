import type { SchoolYear } from './types'

/**
 * Årsväktarna — Expeditionsmodellens hårda grind mellan årskurserna
 * (beslutad med föräldern, juli 2026). Läroplanen är en spiral: varje läsår
 * besöker flera världar. Därför är det ÅRET, inte världen, som bossas:
 * när alla moment i en årskurs är behärskade vaknar årets väktare, och
 * nästa årskurs öppnas först när väktaren är besegrad.
 *
 * Världsbossarna finns kvar som TROFÉSTRIDER (när en hel värld är klar,
 * oavsett år) — så ett återbesök i en värld aldrig betyder samma boss igen.
 *
 * Som alla prov: ingen klocka, sköldarna är väktarens, fel straffas aldrig,
 * obegränsade omförsök.
 */
export interface YearGuardian {
  year: SchoolYear
  name: string
  /** Kort epitet till striden ("vaktar talens gryning"). */
  title: string
  /** Runan på väktarens sköld (årskursens tecken). */
  rune: string
  taunt: string
  defeatLine: string
  /** Repliker som roteras när sköldar knäcks (samma mekanik som bossarna). */
  taunts: string[]
  /** Grundton (HSL-hue) för väktarens dräkt — varje år har sin färg. */
  hue: number
}

export const YEAR_GUARDIANS: Record<SchoolYear, YearGuardian> = {
  F: {
    year: 'F', name: 'Gryningsvakten', title: 'vaktar talens gryning', rune: 'F', hue: 45,
    taunt: 'Stopp, lilla vandrare! Visa att du känner talens allra första hemligheter.',
    defeatLine: 'Du kan räkna som morgonens första ljus … porten är din. Vandra vidare!',
    taunts: ['Oj! Du räknar snabbare än solen går upp!', 'En sköld till borta … du kan ju det här!'],
  },
  '1': {
    year: '1', name: 'Stigvakten', title: 'vaktar ettans stig', rune: 'I', hue: 130,
    taunt: 'Denna stig är bara för den som kan plus och minus. Bevisa dig!',
    defeatLine: 'Stigen ligger öppen — du räknade dig hela vägen förbi mig.',
    taunts: ['Mina snåriga tal … du löste dem!', 'Sköldarna håller inte för sådan räknekonst!'],
  },
  '2': {
    year: '2', name: 'Brovakten', title: 'vaktar tvåans bro', rune: 'II', hue: 205,
    taunt: 'Ingen korsar min bro utan att kunna tiotal, gånger och klockan. Visa vad du kan!',
    defeatLine: 'Bron är din, unga mästare. På andra sidan väntar trean!',
    taunts: ['Brädorna skakar — du räknar för bra!', 'Ännu en sköld i floden … otroligt!'],
  },
  '3': {
    year: '3', name: 'Portvakten', title: 'vaktar treans port', rune: 'III', hue: 275,
    taunt: 'Bakom min port väntar de stora talen. Bara den som behärskar trean går igenom!',
    defeatLine: 'Porten gnisslar upp … du har förtjänat varje steg. In med dig!',
    taunts: ['Nyckeln vrider sig … du kan ju allt det här!', 'Mina gåtor biter inte på dig!'],
  },
  '4': {
    year: '4', name: 'Tornvakten', title: 'vaktar fyrans torn', rune: 'IV', hue: 18,
    taunt: 'Från mitt torn ser jag alla som räknar fel. Dig ska jag granska noga!',
    defeatLine: 'Från tornets topp ser jag det nu: du är redo för femman.',
    taunts: ['Jag ser inga fel … hur är det möjligt?!', 'Tornet darrar av dina svar!'],
  },
  '5': {
    year: '5', name: 'Stjärnvakten', title: 'vaktar femmans stjärnvalv', rune: 'V', hue: 235,
    taunt: 'Stjärnorna räknar med decimaler och procent. Kan du följa deras banor?',
    defeatLine: 'Stjärnorna lyser för dig — vägen mot sexan är utstakad.',
    taunts: ['En stjärna slocknar för varje rätt … lysande!', 'Du räknar i stjärnklass!'],
  },
  '6': {
    year: '6', name: 'Kronvakten', title: 'vaktar rikets krona', rune: 'VI', hue: 48,
    taunt: 'Jag är den siste väktaren. Besegra mig, och Matterikets krona är din!',
    defeatLine: 'Riket har en ny mästare. Kronan är din — du har erövrat hela Matteriket!',
    taunts: ['Kronjuvelerna skimrar … du är nära nu!', 'Ingen har svarat så säkert inför kronan!'],
  },
}

export const guardianForYear = (year: SchoolYear): YearGuardian => YEAR_GUARDIANS[year]

/** Barnvänligt årsnamn: "förskoleklassen" / "årskurs 2". */
export const yearLabel = (year: SchoolYear): string =>
  year === 'F' ? 'förskoleklassen' : `årskurs ${year}`
