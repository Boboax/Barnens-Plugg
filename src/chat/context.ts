import type { TaskVisual } from '../domain/types'
import { momentIntro } from '../domain/intros'
import { lessonFor } from '../domain/lessons'

/* ============================================================
   Vad Pi behöver veta för att hjälpa på riktigt.

   Förr fick chatten bara momentets namn och uppgiftstexten. Den visste
   inte hur appen förklarar momentet, och den såg inte diagrammet i en
   uppgift som "Grafen visar priset på godis". Då förklarade den på sitt
   eget sätt — eller gissade (förälderns önskan okt 2026: barnet ska få
   allt ordentligt förklarat och bra hjälp av chatten).

   Två rena funktioner, inga sidoeffekter:
   - momentMethod: appens egen förklaring (begreppskortet + filmens
     scener), så att Pi använder samma ord och samma bilder som barnet
     redan sett. Texterna är handskrivna (princip 1); chatten återger dem
     bara som stöd.
   - describeVisual: det som syns i bilden, i ord. Pi får det bara för
     att förstå vad barnet tittar på — systemprompten förbjuder Pi att
     läsa upp talen, så barnet läser av själv (ofta är det själva
     uppgiften).
   ============================================================ */

/** Appens förklaring av momentet, eller undefined om det inte finns någon. */
export function momentMethod(momentId: string): string | undefined {
  const parts: string[] = []
  const intro = momentIntro(momentId)
  if (intro) parts.push(intro.idea)
  const lesson = lessonFor(momentId)
  if (lesson) parts.push(`Filmen barnet sett, scen för scen: ${lesson.scenes.map((s, i) => `(${i + 1}) ${s.text}`).join(' ')}`)
  return parts.length ? parts.join('\n') : undefined
}

const list = (xs: string[]): string => xs.join(', ')

/** Bilden i uppgiften i ord, eller undefined när det inte finns någon. */
export function describeVisual(v: TaskVisual | undefined): string | undefined {
  if (!v) return undefined
  switch (v.kind) {
    case 'ingen': return undefined
    case 'tiobas':
      return `Tiobasklossar: ${list(v.groups.map((g) => `${g.hundreds ? `${g.hundreds} hundraplattor, ` : ''}${g.tens} tiostavar och ${g.ones} entalskuber`))}${v.op === '−' ? ' (den andra gruppen tas bort)' : ''}.`
    case 'tallinje':
      return `En tallinje från ${v.min} till ${v.max}${v.marks?.length ? ` med markeringar vid ${list(v.marks.map(String))}` : ''}${v.highlight !== undefined ? `, talet ${v.highlight} är markerat` : ''}${v.hops?.length ? `, hopp via ${list(v.hops.map(String))}` : ''}.`
    case 'grupper': return `${v.groupCount} grupper med ${v.itemsPerGroup} saker i varje.`
    case 'foljd': return `En mönsterföljd: ${list(v.items)}.`
    case 'brak': return `En figur delad i ${v.parts} lika delar där ${v.filled} är färgade${v.secondary ? `, och en till delad i ${v.secondary.parts} delar där ${v.secondary.filled} är färgade` : ''}.`
    // Visarnas lägen, inte klockslaget — att läsa klockan är ofta själva
    // uppgiften. Samma skäl för form, vinkel och kropp nedan: namnet är svaret.
    case 'klocka': {
      const big = v.minutes === 0 ? 12 : v.minutes / 5
      const small = v.minutes === 0 ? `på ${v.hours}` : `mellan ${v.hours} och ${v.hours % 12 + 1}`
      return `En analog klocka: lilla visaren (timmar) pekar ${small}, stora visaren (minuter) pekar på siffran ${Number.isInteger(big) ? big : `strax efter ${Math.floor(big) || 12}`}.`
    }
    case 'form': return 'En geometrisk figur.'
    case 'rektangel': return `En rektangel som är ${v.w} ${v.unit} lång och ${v.h} ${v.unit} bred.`
    case 'stapel': return `Ett stapeldiagram: ${list(v.categories.map((c) => `${c.label} ${c.value}`))}.`
    case 'linje': return `Ett linjediagram: ${list(v.points.map((p) => `${p.label} ${p.value}${v.unit ? ` ${v.unit}` : ''}`))}.`
    case 'koordinat': {
      const axes = v.xLabel || v.yLabel ? ` x-axeln: ${v.xLabel ?? 'x'}, y-axeln: ${v.yLabel ?? 'y'}.` : ''
      const pts = v.points.length ? ` Punkter: ${list(v.points.map((p) => `${p.label ? `${p.label} ` : ''}(${p.x}, ${p.y})`))}.` : ''
      const lines = v.lines?.length ? ` Linjer genom: ${list(v.lines.map((l) => l.points.map((p) => `(${p.x}, ${p.y})`).join(' och ')))}.` : ''
      return `Ett koordinatsystem från ${v.min} till ${v.max}.${axes}${pts}${lines}`
    }
    case 'vinkel': return 'En vinkel mellan två strålar.'
    case 'kropp': return 'En tredimensionell kropp.'
    case 'spegel': return `En figur med en streckad linje (${v.axis === 'lodrat' ? 'lodrät' : v.axis === 'vagrat' ? 'vågrät' : 'diagonal'}) — frågan gäller om linjen är en spegellinje.`
    case 'stapelmodell':
      return `En stapelmodell: ${list(v.rows.map((r) => `${r.label} = ${r.parts.filter((p) => !p.removed).map((p) => p.text).join(' + ')}`))}${v.total ? `; tillsammans ${v.total.text}` : ''}${v.diff ? `; skillnaden ${v.diff.text}` : ''}.`
    case 'hundraruta': return `En hundraruta där ${list(v.highlight.map(String))} är markerade${v.hidden?.length ? ` och ${v.hidden.length} rutor är gömda (?)` : ''}.`
  }
}
