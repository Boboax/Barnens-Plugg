# Spec: fix-lista 1 — ledtrådsflödet + granskningsfynd (juli 2026)

Skriven av Fable efter granskning av allt nybyggt innehåll (steg 0–4 +
geometri-etapp A–D), för att byggas av Opus. Läs `CLAUDE.md` FÖRST — de
orubbliga principerna gäller varje rad. Punkterna är i prioritetsordning.
En commit + deploy per punkt 0–1; granskningsfynden (punkt 2) kan buntas.

---

## Punkt 0: "Försök igen"-flödet med automatisk Pi-ledtråd (beslutat med föräldern)

**Mål:** Vid fel svar ska barnet först få HJÄLP att komma rätt — inte facit.
Metodledtråd → nytt försök → först därefter (vid fel igen) förklaring + rätt
svar. Forskningsgrund: återkoppling på processnivå slår resultatnivå;
ledtrådstrappor med "bottenledtråd" är standard i beprövade tutorsystem.
Dokumentera avvägningen i `docs/PEDAGOGIK.md` (nytt avsnitt "Ledtrådstrappan").

**Gäller ENDAST `mode 'ovning'` i `TaskRunner.tsx`.** Prov (boss/koll),
diagnos och blixt rörs INTE.

### Flödet (intern tillståndsmaskin i TaskRunner — motorn rörs inte)
1. **Fel svar, försök 1** → ny fas `'retry'` (i stället för `'feedback'`):
   - `onComplete(result)` anropas PRECIS som idag med `correct: false` —
     första försöket är det som bokförs (rating, missuppfattningar,
     repetitionsutvärdering, combo-nollning). Omförsöket är ett rent UI-lager;
     försök 2 registreras ALDRIG i motorn. (Orubblig princip 5 intakt:
     framsteg styrs av appkod, opåverkat av omförsöket.)
   - En **Pi-bubbla visas automatiskt**: Pi-figuren (`mood="funderar"`) +
     pratbubbla med ledtråden + uppläsningsknapp (`speak(...)`, chip — stor
     "Lyssna" för FK som på uppgiften). ALDRIG autoplay.
   - Ledtrådstext, fallback-kedja (ingen generator behöver ändras i v1):
     a) `matchMisconception(task, given)` träffar → `misconceptionInfo(tag).childHint`
        (de missuppfattningsspecifika texterna finns redan och är skrivna som
        metodhjälp).
     b) Annars generisk processledtråd per uppgiftstyp:
        - har visual ≠ 'ingen': "Titta på bilden igen — den visar svaret. Räkna en gång till!"
        - numerisk utan bild: "Räkna en gång till, lugnt och fint. Du klarar det!"
        - flerval: "Läs alla svaren en gång till innan du väljer."
     c) (Framtida, EJ v1: valfritt `task.hint` per generator kan skjutas in
        först i kedjan.)
   - Knapp: **"Försök igen! ▶"** → tillbaka till svarsläget (numeriskt: töm
     inmatningen; flerval: den valda FELknappen inaktiveras/gråas).
   - Barn med chatten aktiverad (`chatReadyFor`): visa även en sekundär knapp
     **"Prata med Pi 💬"** som öppnar chattpanelen (befintlig mekanik i
     SessionScreen — lyft via callback-prop, t.ex. `onOpenChat?`). Chatten får
     ALDRIG öppnas automatiskt (dagstak 30 medd, latens, bara vissa barn).
2. **Rätt på försök 2** → varmt firande: "Där satt den! 💪" + `sfx.ratt()` +
   vanliga Nästa-knappen. INGEN ny bokföring i motorn.
3. **Fel på försök 2** → dagens feedbackfas oförändrad: missuppfattningsledtråd
   + förklaring + "Rätt svar: X" + Nästa. (Bottenledtråden — utan den fastnar
   barn och börjar chansa.)

### Undantag
- **Tvåvalsfrågor (2 alternativ, t.ex. Ja/Nej): INGET omförsök** — andra
  knappen är per definition rätt (noll lärande, ren gissning). Gå direkt till
  dagens feedbackfas.
- Flerval med 3 alternativ: omförsök OK (2 kvar), 4 alternativ: OK (3 kvar).
- Skattkistans bonusuppgift (ChestFrame i SessionScreen, mode 'ovning'):
  flödet gäller där också — det är vanlig övning.

### Verifiering
- Enhets-/komponentnivå: första försöket bokförs exakt en gång (spionera på
  onComplete), andra försöket bokförs aldrig; tvåval hoppar över retry.
- Playwright: svara fel numeriskt → Pi-bubbla med ledtråd syns, "Försök
  igen" tömmer rutan; svara rätt → "Där satt den!"; svara fel igen → dagens
  förklaring + rätt svar. Ja/Nej-uppgift → ingen retry-fas.

---

## Punkt 1: Blixtpassets knappsats — för smal och för tät (förälderns foto, IMG_1630)

**Symptom:** i blixtläget är sifferknapparna smala pelare tätt ihop mitt på
en nästan tom skärm — svårt för barnfingrar, särskilt Alberts otidsatta läge.

**Rotorsak (diagnostiserad):** `src/ui/screens/BlixtScreen.tsx` (~rad 197) —
containern runt prompt/svarsruta/knappsats är ett barn i en flexkolumn med
`alignItems: 'center'` och saknar egen bredd → den krymper till innehållets
bredd (~svarsrutans 160 px + padding). Knappsatsens `width: '100%'`
(Keypad `size="stor"`, `maxWidth: 460`) löses då mot den hopkrympta
föräldern och når aldrig 460 px.

**Fix:**
1. Ge containern `width: '100%'` (alt. `alignSelf: 'stretch'`) så Keypad
   når sin maxWidth. (Granskningen mätte dagens knappar till 52×83 px i ett
   180 px-grid — långt under målet.)
2. Öka samtidigt `stor`-läget i `Keypad.tsx`: `maxWidth` 460 → 520 och
   `gap` 12 → 16, så knapparna blir både större och luftigare (mål: minst
   ~140 px breda knappar på iPad, väl över Apples 44 pt-minimum).
3. Verifiera med Playwright-skärmdump på 1024×768 att knappbredden ≥ 140 px
   och att inget svämmar över på iPhone-bredd (390 px — maxWidth '100%' ska
   hålla).

---

## Punkt 2: Granskningsfynd (trippelgranskning: innehåll 6 600 uppgifter, motor-simuleringar, UI/SVG-mätningar)

Alla fynd är verifierade (genererade exempel, körd motorkod eller DOM-mätning).
Bygg A-blocket först — det är fel barnen möter direkt.

### A — Allvarliga (fel svar/oavläsbara uppgifter)

- **A1. Grafer: fel enhet på prissvaren.** `src/generators/ovriga-varldar.ts`
  ("Vad kostar 3 kg?"-grenarna): `value` är kronor men `unit` sätts till
  x-enheten (kg/hg) → barnet ser "Rätt svar: 10 kg". Fix: `unit: 'kr'` i
  båda prisgrenarna ("Vad kostar q …" och "Vad kostar 1 …"); inversfrågan
  ("Hur många kg får du för …") är korrekt som den är.
- **A2. Grafer: A/B-etiketterna ritas ovanpå varandra.** `TaskVisualView.tsx`
  (Koordinat, linjeetiketten ritas vid linjens sista definitionspunkt) +
  generatorns båda linjer slutar vid x=3 → vid skärningen `xStar=3` (hälften
  av nivå 8–10-uppgifterna) hamnar etiketterna exakt ovanpå varandra och
  färgen blir enda bäraren av betydelse (förbjudet — färgblinda barn).
  Fix: rita etiketten vid den KLIPPTA slutpunkten (`clip[2],clip[3]`) med
  per-linje-offset (t.ex. `−5 − li*14`); låt gärna generatorns linjer sluta
  vid olika x.
- **A3. Stapeldiagram nivå 8–10: staplar mellan gridlinjerna.** Värden slumpas
  fritt 1–20 men `yStep` är 2/5 och värdesiffror visas bara på nivå ≤ 2 →
  174/180 uppgifter kräver avläsning som skalan inte medger (ren gissning).
  Fix: generera värdena som DISTINKTA multiplar av `yStep`.
- **A4. Linjediagram: punkter mellan gridlinjerna.** Samma grundfel: värden
  1–20 men `Linje`-visualen ritar stödlinjer i steg om 5 när max > 10 →
  321/328 uppgifter på nivå 1–7 kräver interpolation, och `en-fel`-taggarna
  (±1) matchar inte de ±2–3-fel skalan bjuder in till. Fix: begränsa värdena
  till ≤ 10 (steg 2) på nivå ≤ 3 och koppla värdespannet till renderingens
  steg på högre nivåer (eller skicka önskat steg som fält i visualen).
- **A5. Kroppar: genusfel i antal-grenen.** "Hur många sidoytor har en klot?"
  / "en rätblock" (grenen använder inte `enOf`), plus "1 sidoytor" i
  förklaringen. Fix: `enOf(k)` + singular ("1 sidoyta"/"1 kant"/"1 hörn").

### B — Medel (pedagogik, tydlighet, motorik)

- **B1. Firade terminsmål kan "av-förtjänas".** `src/engine/rewards.ts`
  (`rewardProgress`): `earned` räknas live och läser aldrig `reward.earnedAt`
  — när nya moment landar i en redan klarad terminshalva backar en firad
  belöning till "2 av 3" i både barnvyn och förälderns kvitteringsknapp.
  Fix: kortslut till `earned: true` (och `left: 0`, `requirement: 'Klart!'`)
  när `earnedAt` är satt.
- **B2. Procent-intro: nivå 7–10 är EN gren.** Nivå 10 är identisk med nivå 7,
  och decimalsvar (5 % → x,5) dyker upp redan på 7. Fix: dela grenen — 7 =
  hela svar (10/20/30/90 av tiotal), 8–10 = 5 %/x,5-svar + tvåstegsfrågan
  "vad KOSTAR tröjan efter rean?" (c = pris − rabatt).
- **B3. Kroppar: kongruensfel i rulla-förklaringen.** "Ett klot är rund
  någonstans — den kan rulla". Fix: rund/runt + den/det efter `art`.
- **B4. Skala: spokenPrompt tappar ordet "skala" och 2:1 läses "två kolon
  ett".** Regexen matchar bara `1:N` och nivå 1–3-strängen utelämnar "skala".
  Fix: behåll "skala" i spoken-strängen och utöka regexen till `N:M`
  ("skala två till ett").
- **B5. Koordinat: xLabel krockar med sista skalsiffran.** "kg" ritas i "10"
  (uppmätt överlapp). Fix: sänk xLabel (`sy(0)+32`) eller hoppa över sista
  siffran när xLabel finns.
- **B6. Visualkortet återställer inte `--sun-ink`** → mönsterföljdens
  frågeruta ("?") blir ljusgul på pergament i bosstriden (kontrast ~1,2:1).
  Fix: lägg `'--sun-ink': '#7A5A00'` i kortets färgåterställning
  (`TaskVisualView.tsx`, kort-wrappern).
- **B7. "Du är här" hoppar i Urtalens dal (förexisterande).**
  `genMomentIdsInWorld` i `engine/progress.ts` följer definitionsordning,
  inte terminsordning — motorn rekommenderar åk 5-moment före åk 2-momentet
  `rimlighet` (problemmomenten definieras sist i curriculum.ts). Fix:
  terminssortera (samma nyckel som `momentsInWorld`). Gäller bara talens-dal;
  övriga världar verifierade korrekta.
- **B8. Repetitiva stjärnnivåer.** former-3d har 3 fasta gåtor, symmetri ~3
  uppgifter (kvadrat-diagonalfrågan är HELT identisk varje gång), vinklars
  "två räta vinklar" är parameterlös (~1/3 av nivå 4–7). Fix: fler gåtor
  (cylinder/pyramid/rätblock), variera diagonalfrågan (rektangel = Nej-fall),
  variera räta-vinklar-frågan ("tre räta", "en rät + en halv rät").
- **B9. Plantan krymper.** diagram-lasa slumpar osorterade värden → "Hur
  mycket minskade plantans höjd?" (10 % av nivå 4–7). Fix: sortera värdena
  stigande när scenariot är plantan (temperatur får minska).
- **B10. Spegelns "diagonal" är en fast 45°-linje** — inte figurens
  hörn-till-hörn-diagonal. För rektangeln blir den klassiska fällan därmed
  ett för lätt Nej-fall (linjen ser uppenbart fel ut). Fix: härled
  diagonalens ändpunkter ur figurens faktiska hörn per form.

### C — Låg (språk, variation, polish)

- **C1.** sortera-tabeller: förklaringar börjar med gemen när etiketten
  inleder ("citroner har den längsta raden"). Versalisera/skriv om.
- **C2.** diagram-lasa: "Vilken månad var temperaturen högst?" → "I vilken
  månad …" (och "var plantan högst" i planta-scenariot).
- **C3.** grafer: k=1 ger triviala frågor ("Vad kostar 1 kg?" = 1 kr) — ta
  bort 1 ur k-poolen (behåll 2–3).
- **C4.** vinklar: felvärdet `90 − a` taggas `en-fel` men är ett
  räknesättsfel (90/180-förväxling) → tagga `fel-raknesatt`.
- **C5.** ekvationer-tva-steg: mellanledet `a·x` taggas
  `likhetstecken-resultat` men är "glömde dela" → `fel-raknesatt`; i
  symbolgrenen är det `c` som ska taggas `likhetstecken-resultat`.
- **C6.** ekvationer-tva-steg: "Ali" är hårdkodad — använd `pickName(rng)`
  (namnpoolsprincipen: barnets eget namn i textuppgifter).
- **C7.** former-3d nivå 4–7 (åk 1!): "hur många kanter/hörn har en kub"
  kan inte räknas på 2D-bilden (dolda kanter) och klotets "1 sidoyta" är
  begreppsligt udda — begränsa åk 1-nivåerna till YTOR för kub/rätblock;
  spara hörn/kanter till stjärnnivån.
- **C8.** skala: jämförelsefrågan är alltid exakt "1:100 eller 1:1000" —
  slumpa skalparen.
- **C9.** koordinat: axelsiffrorna renderas ~10,5 px (under iOS-riktmärket
  ~15 px) — skala upp svg-bredden (`min(size*1.25, 420)`) eller höj
  fontstorleken.
- **C10.** piktogram: fri `flexWrap` bryter en 10-rad till 9+1 på smal skärm
  — byt till grid med 5 kolumner (räknevänliga femgrupper).
- **C11.** Kapitelbanderollen säger "bossen besegrad, vägen öppnas" i en
  erövrad värld som fått NYA oklarade noder — visa näst sista kapitlet när
  `worldConquered && !worldAllMomentsDone` (`Home.tsx`).
- **C12.** `domain/types.ts`: kommentaren på `conqueredWorlds` säger
  "gatear inte nästa värld" — inaktuell sedan bossgrinden blev hård.
  Uppdatera kommentaren.

### Observationer utan fix (dokumenterade medvetna val)

- Edward återupptar sitt pågående åk 6-moment före de nya åk 1-momenten
  bakåt ("avsluta det du håller på med" — försvarbart).
- Barn utan blixthistorik möter bakåt-blixtgrinden (tre blixtpass) innan de
  nya momenten — det beslutade "grindar gäller bakåt".

### Det som höll (granskat och godkänt)

Misconception-kollisionsskyddet (0 fel/6 600 uppgifter), flervalsdubletter (0),
facittabellerna BODY_FACTS/MIRROR_FACTS, entydigheten (distinkta värden),
boss-/flytgrindarna med nya moment (ingen ny bosstrid krävs, inga
återvändsgränder), diagnosens placering (robust även mot gissning),
migreringens idempotens, repetitionstaket (max 2 moment/pass),
stapelproportioner, Liang–Barsky-klippningen, vinkelbågen/kvadratmarkeringen,
negativa koordinater, kontrasten på pergamentkorten och smala skärmar.

### Byggordning

Punkt 0 (egen commit + deploy) → punkt 1 (egen) → A1–A5 (en commit) →
B1–B10 → C1–C12 (kan buntas). `npm run build` + `npm test` gröna efter varje
block; A3/A4 ska få riktade test-guards (värden ∈ gridlinjer).
