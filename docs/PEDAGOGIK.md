# Pedagogisk grund

Varje designval i Barnens Plugg vilar på etablerad inlärningsforskning.
Här är kopplingen mellan forskning och implementation.

| Princip | Forskningsgrund | I appen |
|---|---|---|
| **Mastery learning** | Bloom (1984); barn går vidare när färdigheten sitter, inte efter x uppgifter | Moment låses upp av förkunskaper; bossen kräver ~80 % (10/12); repetitionsprov kan öppna momentet igen |
| **Proximala utvecklingszonen** | Vygotskij; optimal inlärning strax över nuvarande nivå | Elo-rating per färdighet väljer nivå med ~70–80 % förväntad lyckandegrad (`rating.ts`) |
| **Retrieval practice** | Roediger & Karpicke (2006); att plocka fram ur minnet stärker mer än att läsa om | Allt är aktiv övning; repetitionsproven är riktiga prov, inte genomläsning |
| **Spaced repetition** | Ebbinghaus; Cepeda m.fl. (2006); växande intervall slår massed practice | Intervall 3→7→14→30→60→120 dagar per behärskat moment (`spaced-repetition.ts`) |
| **Interleaving** | Rohrer & Taylor (2007); blandade uppgiftstyper ger bättre långtidsinlärning | "Blandat"-delen i varje pass drar från alla behärskade moment; bossen blandar in förkunskaper |
| **CRA-progression** | Concrete–Representational–Abstract (specialpedagogisk standard) | Tiobasblock, tallinjer, grupper och bråkfigurer på låga nivåer; trappas ner mot ren symbolräkning |
| **Omedelbar korrektiv feedback** | Hattie & Timperley (2007) | Fel svar ⇒ missuppfattningsspecifik ledtråd + pedagogisk förklaring, direkt |
| **Missuppfattningsdiagnostik** | Diagnostisk taxonomi à la DfE/NCETM; distraktorer som avslöjar tänkandet | Varje distraktor taggas (glömd växling, likhetstecken-som-resultat …); motorn ser *varför* det blev fel (`misconceptions.ts`) |
| **Growth mindset-feedback** | Dweck; Mueller & Dweck (1998): beröm processen, inte personen | "Bra kämpat — varje försök gör dig starkare", aldrig "vad smart du är" |
| **Ingen tidspress på bossar/koll** | Boaler (2014): tidspress är starkt kopplad till matteångest | Bossen och nodens kunskapskoll har inga klockor; sköldarna är bossens, fel svar bestraffas inte |
| **Belöna träning, inte fart** | Deci m.fl.; yttre belöningar för hastighet urholkar noggrannhet | Belöningar kopplas till moment/pass/terminsmål — aldrig poäng eller tid |
| **Rimlighet & självkontroll** | Ingår i Lgr22:s centrala innehåll | Egna moment: "Är det rimligt?", "Kontrollera svaret", "Överslagsräkning"; slarvfelsdetektorn särskiljer slarv från kunskapslucka |
| **Korta pass** | Uppmärksamhetsspann; distributed practice | Dagens pass ≈ 15 min: uppvärmning → nytt → blandat; tidsgräns per dag |
| **Inga syskonjämförelser** | Social jämförelse demotiverar den som halkar efter | Varje barn ser bara sina egna mål och streaks; jämförelsen finns bara i föräldravyn |
| **Adaptiv startdiagnos** | Computerized adaptive testing (CAT), förenklad | Binärsökning längs läroplansryggraden; inga rätt/fel visas; delas i korta pass för yngre barn |
| **Lösta exempel först** | Worked examples / cognitive load theory (Sweller); nybörjare lär bäst av exempel före övning | "Pi visar först": två lösta exempel med förklaring första gången ett nytt moment öppnas (`PiVisar.tsx`) |
| **Flyt som krav — men aldrig skadligt** | Automaticitet avlastar arbetsminnet (Sweller, cognitive load theory); **mastery learning** (Bloom): gå vidare först när steget sitter, med obegränsade omförsök; retrieval practice (Roediger & Karpicke). Tidspressens ångestrisk (Boaler 2014; Ashcraft & Kirk 2001; Beilock) doseras efter ålder i stället för att slopas | Blixtpassen är **KRAV-grindar**: momentet efter öppnas först när blixten klarats (`BLIXT_GATE`), men med *obegränsade omförsök* och aldrig "underkänt" ("nästan — försök igen"). **FK: ingen synlig klocka** ("gör så snabbt du kan", tiden mäts tyst för föräldern); **åk1+: skolans minutklocka.** Svårigheten trappar från lätt och stiger när målet nås (`blixt.ts`). Beslut med föräldern juli 2026. |

## Svårighetsskalan (nivå 1–10 per moment)

- **1–3:** introduktion med visuellt stöd (CRA: konkret)
- **4–7:** årskursnivå, visuella stöd trappas ner, textuppgifter dyker upp
- **8–10 (stjärnnivån 💎):** över årskursnivå — flerstegsproblem, öppna utsagor,
  överflödig information, baklängesuppgifter. Låses upp efter besegrad boss.
  Det är stjärnnivån + repetitionsproven som gör att det *sitter ordentligt*.

## Ledtrådstrappan (fel svar → hjälp före facit)

Beslutat med föräldern (juli 2026). När ett barn svarar fel i **övningsläget**
visas INTE rätt svar direkt. I stället kliver Pi in automatiskt med en
**metodledtråd** — en pekning mot *hur* man tänker, aldrig svaret — och barnet
får ett nytt försök. Först om det blir fel igen visas den fulla förklaringen
och rätt svar ("bottenledtråden").

**Varför:** återkoppling på processnivå ("titta på det här, räkna så här") lär
ut mer än återkoppling på resultatnivå ("svaret var 12"). Beprövade
tutorsystem använder ledtrådstrappor med en garanterad bottenledtråd — utan
den fastnar barn och börjar chansa; med obegränsade försök uppstår
frustrationsloopar (särskilt i FK). Därför: exakt ETT extra försök, sedan facit.

**Orubbliga avgränsningar:**
- Bara övningsläget. Prov (boss/kunskapskoll), diagnos och blixt rörs inte.
- **Endast första försöket bokförs i motorn** (rating, missuppfattningar,
  repetitionsutvärdering). Omförsöket är ett rent pedagogiskt UI-lager —
  annars skulle ratingen blåsas upp och adaptiviteten/rapporten ljuga
  (orubblig princip 5: framsteg styrs av appkod).
- **Tvåvalsfrågor (Ja/Nej) får inget omförsök** — andra knappen är per
  definition rätt (ren gissning). De går direkt till facit.
- Ledtråden är appens EGNA deterministiska text (missuppfattningsspecifik när
  motorn känner igen felet, annars en processledtråd efter uppgiftstyp) — inte
  AI-chatten. Barn med chatten på får en frivillig "Prata med Pi 💬"-knapp i
  ledtrådssteget; chatten öppnas ALDRIG automatiskt (lager 0 orört).

## Expeditionsmodellen: årsgrind i stället för världsgrind

Beslutat med föräldern (juli 2026), efter en verklig observation: Nikolai
(åk 2) hade klarat allt åk 2-innehåll i Urtalens dal och matades då vidare
UPPÅT i dalen — "Räkna till 1000" (åk 3), stora tal (åk 4), negativa tal
(åk 5) — medan multiplikationen (åk 2 VT, nästa värld) förblev låst av den
gamla världsboss-grinden. Appen och skolan gick i otakt.

**Roten:** Lgr22 är en spiralläroplan — varje läsår återbesöker flera
områden. Världarna är tematiska (taluppfattning, geometri, statistik …), så
en grind PER VÄRLD tvingar barnet att göra klart ett tema flera år framåt
innan nästa tema ens börjar. En grind PER ÅRSKURS följer spiralen.

**Modellen:**
- **Resan går år för år.** Rekommendationen (`currentMomentId`) följer
  terminsordningen genom hela årskursen, över världsgränserna. Att "hoppa
  mellan världar" är expeditionens natur — Pi bär berättelsen ("nu reser vi
  till skogen; dalen väntar tills vi blivit starkare").
- **Årsväktaren är den hårda grinden.** När årskursens alla tränbara moment
  är behärskade vaknar årets väktare (Gryningsvakten i F … Kronvakten i 6).
  Striden är byggd som världsbossen: frågor från hela årets läroplan,
  sköldar, ingen klocka, fel straffas aldrig, obegränsade omförsök. Vinst
  öppnar nästa årskurs.
- **Grinden gäller bakåt — men bara de närmaste två åren.** Ett
  diagnosplacerat barn möter väktarna för de senaste åren under sin årskurs
  (snabbt för den som kan, och segrarna ger placeringen legitimitet), men
  **fjärranår** — tre år eller mer under barnets årskurs — auto-erövras
  (`grantedYears`). Mjukats upp på förälderns begäran (juli 2026): en
  tioåring ska inte behöva bossa förskoleklassen; sju strider i rad innan
  eget innehåll vore ett hinder, inte ett mål. Luckor i fjärranåren tränas
  fortfarande (rekommendationen fyller ofullständiga år först) — det är
  enbart väktarstriden som skänks.
- **Världsbossarna blev troféer.** De vaknar när en HEL värld är klar (alla
  årskurser) — en sällsynt, frivillig klimax som inte grindar något. Så är
  ett återbesök i en värld aldrig "samma boss igen": världens boss möter man
  EN gång, när världen verkligen är färdig.
- **Påbörjade moment över årskursen förstörs inte** (t.ex. Nikolais 0–1000):
  de behåller sitt tillstånd och sin rating, syns på kartan, men
  rekommendationen pekar dit först när deras år är öppet.

**Varför inte årskurstak utan väktare?** Ett osynligt tak känns som ett
stopp; en väktare är ett MÅL. Att erövra sitt läsår ger samma "jag klarade
tvåan!"-stolthet som skolavslutningen — kopplad till behärskning, aldrig
till hastighet eller jämförelse (orubblig princip 3).
