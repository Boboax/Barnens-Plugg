import type { World } from './types'

/**
 * Matterikets världar. Varje värld motsvarar ett stråk i läroplanen
 * och har en egen berättelse och en boss som vaktar utgången.
 * Bossen besegras genom momentens mästarprov (bosstrider).
 */
export const WORLDS: World[] = [
  {
    id: 'talens-dal',
    name: 'Talens dal',
    emoji: '🏔',
    tagline: 'Där alla tal bor — från de allra minsta till de största.',
    boss: {
      id: 'vaxlartrollet',
      name: 'Växlartrollet',
      emoji: '🧌',
      taunt: 'Grrr! Ingen räknar sig över MIN bro!',
      defeatLine: 'Hmpf … du kan ju växla bättre än jag. Bron är din!',
    },
    chapters: [
      'Pi landar i Talens dal, där talen växer på träden.',
      'Tiofloden porlar — men något stort trampar på bron …',
      'Växlartrollet har tagit bron över Tiofloden! Lär dig växlingens hemlighet för att ta dig förbi.',
      'Med trollet besegrat öppnar sig vägen mot Multiplikationsskogen.',
    ],
  },
  {
    id: 'multiplikationsskogen',
    name: 'Multiplikationsskogen',
    emoji: '🌲',
    tagline: 'Skogen där allt växer i grupper — två och två, fem och fem.',
    boss: {
      id: 'tabelldraken',
      name: 'Tabelldraken',
      emoji: '🐉',
      taunt: 'Mina tabeller kan ingen! Sju gånger åtta, snabbt!',
      defeatLine: 'Femtiosex … rätt igen! Du kan tabellerna bättre än en drake.',
    },
    chapters: [
      'I Multiplikationsskogen växer kottarna i lika stora högar.',
      'Ekorrarna behöver hjälp att räkna sina förråd — grupp för grupp.',
      'Djupt inne i skogen ruvar Tabelldraken på sina gånger-skatter.',
      'Draken besegrad! Stigen mot Bråkberget skymtar mellan träden.',
    ],
  },
  {
    id: 'brakberget',
    name: 'Bråkberget',
    emoji: '⛰',
    tagline: 'Berget där allt delas i bitar — halvor, tredjedelar och hundradelar.',
    boss: {
      id: 'brakbjorren',
      name: 'Bråkbjörnen',
      emoji: '🐻',
      taunt: 'MIN kaka! Jag delar aldrig rättvist!',
      defeatLine: 'Okej, okej … du delar rättvisare än jag. Ta en tredjedel. Eller två.',
    },
    chapters: [
      'Bråkberget är fullt av kakor, pizzor och skatter som måste delas rättvist.',
      'Halvvägs upp börjar decimalerna glittra i bergväggen.',
      'På toppen vaktar Bråkbjörnen den stora kakan — och delar aldrig rättvist.',
      'Björnen blidkad! Från toppen syns hela Matteriket.',
    ],
  },
  {
    id: 'monsterskogen',
    name: 'Mönsterskogen',
    emoji: '🌀',
    tagline: 'Här upprepar sig allt — om man bara ser mönstret.',
    boss: {
      id: 'monsterormen',
      name: 'Mönsterormen',
      emoji: '🐍',
      taunt: 'Ssssäg mitt nässsta steg — om du kan!',
      defeatLine: 'Sss … du såg mönstret. Ormen ringlar åt sidan.',
    },
    chapters: [
      'I Mönsterskogen går stigarna i mönster: röd, blå, röd, blå …',
      'Likhetstecknets gamla vågskål står mitt i skogen — båda sidor måste väga lika.',
      'Mönsterormen ringlar runt utgången och kräver nästa tal i följden.',
      'Ormen övervunnen! Ekvationernas port står öppen.',
    ],
  },
  {
    id: 'formernas-berg',
    name: 'Formernas berg',
    emoji: '🔷',
    tagline: 'Trianglar, cirklar och vinklar så långt ögat når.',
    boss: {
      id: 'stenjatten',
      name: 'Stenjätten Kant',
      emoji: '🗿',
      taunt: 'Ingen passerar utan att kunna mina hörn och kanter!',
      defeatLine: 'Rätt igen … du kan formerna bättre än berget självt.',
    },
    chapters: [
      'Formernas berg är byggt av trianglar, kvadrater och cirklar.',
      'Klocktornet på klippan visar tiden för hela Matteriket.',
      'Stenjätten Kant vaktar passet och frågar om hörn, sidor och vinklar.',
      'Jätten bugar! Vägen över berget ligger öppen.',
    ],
  },
  {
    id: 'diagramoarna',
    name: 'Diagramöarna',
    emoji: '🏝',
    tagline: 'Öar av staplar, tabeller och tärningar.',
    boss: {
      id: 'plottrig',
      name: 'Bläckfisken Plottrig',
      emoji: '🐙',
      taunt: 'Åtta armar, åtta diagram — vad säger de? Ingen aning? Hihi!',
      defeatLine: 'Du läste alla mina diagram … jag plottrar iväg nu.',
    },
    chapters: [
      'På Diagramöarna sorterar papegojorna allt i tabeller.',
      'Staplarna växer på stranden — vem har flest snäckor?',
      'Bläckfisken Plottrig rör ihop alla diagram i sitt bläck.',
      'Plottrig besegrad! Öarnas hemligheter är kartlagda.',
    ],
  },
  {
    id: 'sambandsgrottan',
    name: 'Sambandsgrottan',
    emoji: '🕳',
    tagline: 'Grottan där allt hänger ihop — dubbelt, hälften och procent.',
    boss: {
      id: 'procentspoket',
      name: 'Procentspöket',
      emoji: '👻',
      taunt: 'Buuu! Femtio procent av mig är osynligt — hur mycket ser du?',
      defeatLine: 'Hundra procent besegrad! Spöket tonar bort med ett fniss.',
    },
    chapters: [
      'I Sambandsgrottan ekar allt dubbelt — och ibland hälften.',
      'Kristallerna växer proportionellt: dubbelt så djupt, dubbelt så många.',
      'Längst in svävar Procentspöket och gömmer delar av sig självt.',
      'Grottan genomlyst! Alla samband ligger i dagen.',
    ],
  },
]

export const worldById = (id: string): World => {
  const w = WORLDS.find((w) => w.id === id)
  if (!w) throw new Error(`Okänd värld: ${id}`)
  return w
}
