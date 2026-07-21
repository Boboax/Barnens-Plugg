# Spec: geometri- och diagramvisualerna (de tio "kommer snart"-momenten)

Skriven av Fable (juli 2026) för att byggas av Opus, ETAPP för etapp — samma
arbetsflöde som `SPEC-NASTA-STEG.md` (som nu är helt byggd). Läs `CLAUDE.md`
FÖRST: de orubbliga principerna gäller varje rad. Särskilt:

- **Uppgifter genereras av deterministisk kod.** Allt slumpat via seedad
  `createRng(seed)` — aldrig `Math.random()`/`Date.now()` i generatorinnehåll.
- **Matematisk korrekthet framför allt.** Varje visual måste rita EXAKT det
  uppgiften påstår. Hellre färre nivåvarianter än en enda felritad vinkel.
- **Text över målade bakgrunder** = pergamentplatta (kontrastregeln). De nya
  visualerna ritas som de befintliga i `TaskVisualView.tsx`: ljust kort, mörk
  text `#35302E`, accenter i `var(--coral)`/`var(--mint)`/`var(--primary)`.
- **Färg får aldrig bära betydelse ensam** (färgblinda barn): staplar/punkter
  får färg + ETIKETT, aldrig "den röda stapeln" i uppgiftstexten.
- Nivå 1–3 = visuellt stöd (CRA), 4–7 = årskursnivå, 8–10 = stjärnnivå
  (flerstegsproblem, öppna utsagor, överflödig info).
- `spokenPrompt` på ALLT som TTS läser fel: "(3, 4)" → "punkten 3, 4",
  "1:100" → "skala ett till hundra", "90°" → "90 grader", "x" → "x".
- Fuzz-testet i `generators.test.ts` täcker nya generatorer automatiskt.
  Riktade extra-guards anges per etapp nedan.
- Efter varje etapp: `gen: true` på momenten i `curriculum.ts`, build + test
  gröna, Playwright-titt på visualerna (skript i projektroten, radera efteråt),
  commit → merge till `main` → rapportera versionen.

**Missuppfattningar: ÅTERANVÄND befintliga taggar** — inga nya behövs:

| Fel | Tagg |
| --- | --- |
| Byter plats på x och y, läser fel axel/rad | `positionsfel` |
| Adderar när det ska vara skillnad, gångrar i stället för delar (skala) | `fel-raknesatt` |
| Räknar streck/staplar i stället för att läsa skalan (±1, ±steg) | `en-fel` |
| cm/m-förväxling i skala | `enhet-fel` |
| "svaret står efter =" i ekvationer | `likhetstecken-resultat` |

---

## Nya TaskVisual-typer (6 st, `domain/types.ts` + `TaskVisualView.tsx`)

Alla ritas som SVG i samma stil som `Brak`/`Klocka`/`Rektangel`: max ~560 px
bred, skalbar `viewBox`, `aria-hidden` (uppgiftstexten bär betydelsen).

```ts
// Stapeldiagram OCH piktogram (bildtabell). pictogram: true ritar raden som
// upprepade objekt-ikoner i stället för en stapel (åk 1-nivån).
| { kind: 'stapel'; categories: { label: string; value: number; icon?: string }[];
    yStep?: number; pictogram?: boolean }

// Linjediagram över kategorier (månader, dagar): punkter förbundna med linje.
| { kind: 'linje'; points: { label: string; value: number }[]; unit?: string }

// Koordinatsystem: rutnät min..max på båda axlarna, namngivna punkter, ev. en
// rät linje (två punkter räcker — ritas genom hela rutnätet).
| { kind: 'koordinat'; min: number; max: number;
    points: { x: number; y: number; label?: string }[];
    line?: { x: number; y: number }[] }

// En vinkel: två strålar från ett hörn + gradbåge. degrees ∈ [10, 350].
// Rotationen (rot) slumpas seedat så barnet inte lär sig "rät = alltid uppåt".
| { kind: 'vinkel'; degrees: number; rot?: number }

// 3D-kropp, ritad med enkla skuggade SVG-former.
| { kind: 'kropp'; body: 'klot' | 'kub' | 'cylinder' | 'kon' | 'pyramid' | 'ratblock' }

// Figur med RITAD spegellinje — korrektheten beräknas av generatorn (nedan).
| { kind: 'spegel'; shape: 'cirkel' | 'kvadrat' | 'rektangel' | 'triangel' | 'hjarta';
    axis: 'lodrat' | 'vagrat' | 'diagonal' }
```

**Ritregler (matematisk korrekthet):**
- `koordinat`: kvadratiska rutor, origo markerat, axelpilar + siffror på VARJE
  heltalssteg (≤ 10 steg per axel, annars vartannat). Punkter = fylld cirkel
  + bokstavsetikett INTILL (aldrig ovanpå). Negativa axlar bara när min < 0.
- `vinkel`: gradbågen ritas med korrekt öppning; rät vinkel (90°) markeras
  med kvadratsymbol i hörnet i stället för båge (svensk konvention).
- `stapel`: y-axel med skalstreck på varje `yStep` (default 1); stapelns höjd
  EXAKT proportionell; värdesiffran skrivs ALDRIG ut på stapeln (då försvinner
  avläsningsövningen) — utom på nivå 1–2 där den får stå ovanför som stöd.
- `spegel`: streckad linje genom figurens centrum. Facit per (shape, axis):
  cirkel → alla axlar sanna; kvadrat → lodrät/vågrät/diagonal sanna;
  rektangel → lodrät/vågrät sanna, **diagonal FALSK** (den klassiska
  missuppfattningen — rita rektangeln tydligt avlång, ~2:1); triangel
  (liksidig, spets uppåt) → lodrät sann, vågrät/diagonal falska; hjärta →
  lodrät sann, övriga falska. Denna tabell är facit — testa den.
- `kropp`: klot = cirkel + glansellips; kub/rätblock = tre synliga ytor i
  olika ljushet; cylinder = ellips-topp + rektangelkropp + bågbotten; kon =
  triangel + ellipsbotten; pyramid = två synliga triangelytor. Rätblocket
  ritas tydligt avlångt så det skiljer sig från kuben.

---

## Etapp A — Diagramöarna, grunden (Nikolai åk 2 + Edwards bakfyllnad)

### `sortera-tabeller` (åk 1 VT) — piktogram
- **Nivå 1–3:** `stapel` med `pictogram: true`, 2–3 kategorier, värden 1–6,
  frukt-/leksaksikoner ur `pickThing`. "Hur många äpplen?" (numeriskt, räkna
  raden) och "Vilken frukt finns det flest av?" (flerval med kategorinamnen).
- **Nivå 4–7:** 3–4 kategorier, värden 2–10. "Hur många fler kulor än kottar?"
  (skillnad — `[a+b]: 'fel-raknesatt'`), "Hur många är det sammanlagt?"
- **Nivå 8–10:** överflödig info ("Titta bara på frukterna…"), tvåsteg
  ("Hur många fler måste kotten få för att bli lika många som kulan?").
- Förklaringar: "Räkna bilderna i raden: en, två, tre …" — pekande, konkret.

### `stapeldiagram` (åk 2 VT)
- **Nivå 1–3:** 3 kategorier, värden 1–8, `yStep: 1`, värdesiffra som stöd på
  nivå 1–2. "Hur många röstade på katt?" (numeriskt).
- **Nivå 4–7:** 4 kategorier, `yStep` 1 eller 2 (avläsning MELLAN streck ger
  `en-fel`-distraktorer: värdet ±1 och ±yStep). "Hur många fler valde hund än
  katt?" (`[summa]: 'fel-raknesatt'`), "Hur många barn frågades det?" (summa).
- **Nivå 8–10:** `yStep` 2/5, "Vilka två djur fick tillsammans lika många
  röster som hunden?" (flerval), öppen utsaga ("Katten fick hälften så många
  som …").
- Förklaring lär AVLÄSNINGEN: "Följ stapelns topp med fingret till axeln: 6."

### `diagram-lasa` (åk 4 VT) — linje- och cirkeldiagram
- **Nivå 1–3:** `linje` med 4–5 punkter (månader, temperatur/växthöjd, heltal
  0–20). "Vilken månad var det varmast?" (flerval), "Vad var temperaturen i
  mars?" (numeriskt).
- **Nivå 4–7:** skillnad/förändring: "Hur mycket växte plantan mellan mars och
  maj?" (`fel-raknesatt` för summan, `positionsfel` för fel månad läst).
  Cirkeldiagram: ÅTERANVÄND `brak` (cirkeln ÄR ett cirkeldiagram):
  "Cirkeldiagrammet visar klassens val. Hälften valde fotboll. Hur många av
  24 elever?" — knyter an till procent-trappan (steg 0).
- **Nivå 8–10:** tolkning: "Mellan vilka två månader ökade det MEST?"
  (flerval), kombination linje+beräkning i två steg.

**Test-guards etapp A:** stapel-/linjevärden alltid heltal ≥ 0; svaret på
"skillnads"-frågor alltid ≥ 0; kategorietiketter unika; `pictogram`-nivåer
(≤ 3) har värden ≤ 8 (räknebart med finger).

---

## Etapp B — Sambandsgrottan (Edward åk 5 NU — bygg denna först om han hinner ikapp)

### `koordinatsystem` (åk 5 VT, förkunskap negativa-tal)
- **Nivå 1–3:** första kvadranten, 0–5. Fyra namngivna punkter (A–D).
  "Vilken punkt ligger på (3, 4)?" — flerval A–D där EN distraktor alltid är
  punkten på **(4, 3)** taggad `positionsfel` (x/y-förväxlingen är HELA
  poängen med momentet). "Vad är x-koordinaten för punkt B?" (numeriskt).
- **Nivå 4–7:** 0–10, även "Vilka koordinater har punkt C?" som flerval av
  koordinatpar-strängar ("(2, 7)" m.fl., distraktor "(7, 2)" → `positionsfel`).
  Från nivå 6: alla fyra kvadranter, −5..5 (förkunskapen negativa tal).
- **Nivå 8–10:** "Tre hörn av en rektangel ligger på (1,1), (5,1), (1,4).
  Var ligger det fjärde hörnet?" (flerval), speglingar ("Punkten (3, −2)
  speglas i x-axeln — var hamnar den?").
- Förklaring med minnesregeln: "Gå först längs golvet (x), sedan upp (y) —
  som att gå in i ett rum innan man klättrar på stegen."
- `spokenPrompt`: "(3, 4)" → "punkten 3, 4"; "x-koordinaten" läses som det står.

### `grafer` (åk 6 VT, förkunskap koordinatsystem + proportionalitet)
- **Nivå 1–3:** proportionell linje genom origo i första kvadranten
  (`line: [{x:0,y:0},{x:5,y:10}]` t.ex., k ∈ {1,2,3,5,10}), snälla heltal.
  "Grafen visar priset på äpplen. Vad kostar 3 kg?" (läs av — numeriskt).
- **Nivå 4–7:** åt andra hållet ("Hur många kg får du för 12 kr?"), hitta k
  ("Vad kostar 1 kg?" — `en-fel` på ±1). Punkter PÅ linjen markeras nivå ≤ 5,
  därefter läser barnet gittret självt.
- **Nivå 8–10:** två linjer i samma diagram (etiketter "A"/"B"): "Vilken
  affär är billigast om du köper 4 kg?" (flerval), "Vid vilken vikt kostar de
  lika mycket?" (skärningspunkt med heltalskoordinater — konstruera baklänges
  från skärningen så svaret ALLTID är ett snällt heltal).
- Alla priser/värden konstrueras så avläsningar landar på HELA gitterpunkter.

**Test-guards etapp B:** varje efterfrågad avläsning ligger exakt på en
heltalsgitterpunkt; `positionsfel`-distraktorn (y, x) ≠ rätta svaret (skippa
punkter där x = y); alla punkter inom min..max.

---

## Etapp C — Formernas berg (Albert nästa läsår + Edwards/Nikolais bakfyllnad)

### `former-3d` (åk 1 HT) — OBS: 7-åringar, flerval + bild, korta ord
- **Nivå 1–3:** `kropp`-visual, "Vad heter formen?" (flerval: Klot, Kub,
  Cylinder, Kon). "Vilken form är en boll?" (flerval av kroppsnamn, ingen
  bild — kopplingen vardagsobjekt→namn).
- **Nivå 4–7:** fler kroppar (pyramid, rätblock). Egenskaper: "Kan formen
  rulla?" (Ja/Nej — klot/cylinder/kon JA), "Hur många sidoytor har en kub?"
  (numeriskt: 6). Facit-tabell i koden: kub 6 ytor/8 hörn/12 kanter, rätblock
  samma, pyramid (kvadratisk bas) 5/5/8, cylinder 3 ytor, kon 2 ytor, klot 1.
  TABELLEN ÄR FACIT — enhetstesta den, gissa aldrig.
- **Nivå 8–10:** gåtor: "Jag har 6 lika stora sidoytor. Vad är jag?" (flerval,
  distraktor rätblock — "lika stora" är nyckeln), "Vilka två former har ingen
  platt sida alls?" — fortfarande korta meningar (åk 1-språk även på stjärnan).

### `symmetri` (åk 3 VT)
- **Nivå 1–3:** `spegel`-visual, "Är den streckade linjen en spegellinje?"
  (Ja/Nej). Slumpa (shape, axis) seedat ur facittabellen i ritreglerna ovan;
  väg in rektangel+diagonal ofta (den lärorika fällan).
- **Nivå 4–7:** "Hur många spegellinjer har figuren?" (numeriskt: kvadrat 4,
  rektangel 2, liksidig triangel 3, cirkel → ställ ALDRIG som numerisk fråga,
  oändligt många — använd cirkeln bara i Ja/Nej-frågorna). Bokstäver som
  flerval UTAN bild: "Vilken bokstav har en lodrät spegellinje?" (rätt ur
  {A, H, M, O, T, U, V}, distraktorer ur {F, G, J, L, P, R}).
- **Nivå 8–10:** kombinationer ("Vilken figur har FLER spegellinjer än
  rektangeln?"), vriden diagonal på kvadraten (sann! — kontrast mot
  rektangelns falska diagonal, taggad via Ja/Nej).

### `vinklar` (åk 6 HT)
- **Nivå 1–3:** `vinkel`-visual med benchmark-vinklar {45, 90, 135, 180}:
  "Är vinkeln rät, spetsig eller trubbig?" (flerval; rät = kvadratmarkering).
  Slumpad rotation (seedat) så "rät" inte alltid pekar uppåt.
- **Nivå 4–7:** grader utan gradskiva — härledning från riktmärken: "Vinkeln
  är en halv rät vinkel. Hur många grader?" (45), "Två räta vinklar
  tillsammans?" (180). Sedan: "Vinklarna 90° och 35° sitter ihop på en rak
  linje. Hur stor är den tredje?" (nej — håll till TVÅ vinklar på rak linje:
  180 − a).
- **Nivå 8–10:** triangelns vinkelsumma: "En triangel har vinklarna 90° och
  35°. Hur stor är den tredje?" (numeriskt, 180 − a − b, konstruera så svaret
  ∈ [20, 120]), fyrhörningens 360 på högsta nivån.
- Förklaringar bygger på riktmärket: "Rät vinkel = 90°, som hörnet på ett
  papper. Trubbig = större än så."

**Test-guards etapp C:** egenskapstabellen för kroppar (ytor/hörn/kanter)
enhetstestas mot facit ovan; spegel-facit (shape × axis) enhetstestas;
vinkelsvar alltid i (0, 180] för numeriska frågor.

---

## Etapp D — Monsterskogen + skala (åk 6 — Edwards nästa läsår, lägst brådska)

### `skala` (åk 6 VT)
- **Nivå 1–3:** förstora/förminska med `rektangel`-visualen: "Rektangeln är
  4 cm bred. I skala 2:1 — hur bred blir den?" (dubbelt/hälften, skala 1:2
  och 2:1 endast).
- **Nivå 4–7:** kartor: "Kartan har skala 1:100. Vägen är 3 cm på kartan.
  Hur lång är den i verkligheten?" (svar i cm nivå 4–5; nivå 6–7 i meter →
  `enhet-fel`-distraktor på cm-värdet). Skalor {1:10, 1:100, 1:1000}.
  Omvänt håll ("verkligheten → ritningen") från nivå 6, `fel-raknesatt` på
  gångrat-i-stället-för-delat.
- **Nivå 8–10:** blandade enheter (km), jämförelser ("Vilken karta visar
  mest verklighet på 1 cm — 1:100 eller 1:1000?"), tvåsteg (skala + omkrets).
- Heltalssvar garanterat t.o.m. nivå 7 (välj baser som delar jämnt).
- `spokenPrompt`: "1:100" → "skala ett till hundra".

### `ekvationer-tva-steg` (åk 6 VT, förkunskap enkla-ekvationer)
- Ingen visual (abstrakt nivå är poängen i åk 6) — kvaliteten bor i
  FÖRKLARINGEN: alltid två tydliga steg. "2x + 3 = 11. Ta bort 3 från båda
  sidor: 2x = 8. Dela båda sidor med 2: x = 4."
- **Nivå 1–3:** repetition av ett steg (x + a = b, ax = b) med små tal —
  bron från förkunskapen.
- **Nivå 4–7:** ax + b = c och ax − b = c, a ∈ [2,5], svar heltal ∈ [2,12].
  Konstruera BAKLÄNGES från x (välj x, a, b → beräkna c) så svaret alltid är
  ett snällt heltal. Missuppfattningar: `[c - b]: 'likhetstecken-resultat'`
  (glömde dela), `[(c + b) / a när det blir heltal]: 'fel-raknesatt'`
  (adderade i stället för subtraherade).
- **Nivå 8–10:** b − ax = c med x positivt, textform ("Ali köper 3 pennor och
  betalar 5 kr i påse. Allt kostar 26 kr. Vad kostar en penna?"), x på båda
  sidor ENDAST nivå 10 (2x + 3 = x + 9).

**Test-guards etapp D:** ekvationssvar alltid positiva heltal ≤ nivå 7;
skala-svar heltal ≤ nivå 7; enhets-distraktorer ≠ rätt svar.

---

## Byggordning och bakfyllnad

1. **Etapp A** (stapel/linje-visualerna + tre generatorer) — ger Nikolai nytt
   innehåll direkt och öppnar Diagramöarna.
2. **Etapp B** (koordinat + två generatorer) — Edwards pågående läsår.
   *Om Edward är blockerad i Sambandsgrottan just nu: ta B före A.*
3. **Etapp C** (kropp/spegel/vinkel + tre generatorer).
4. **Etapp D** (skala + ekvationer, ingen ny visual).

En etapp = en commit + deploy + versionrapport. Efter VARJE etapp: sätt
`gen: true`, kör `validateCurriculum` (testet), och kontrollera i webbläsaren
att momenten dykt upp som riktiga noder (inte "kommer snart") och att
visualerna är läsbara på pergamentkortet (kontrastregeln).

**Diagnos/placering:** när `gen: true` sätts blir momenten automatiskt del av
tillgänglighetsgrafen. Barn som redan passerat världen (t.ex. Edward förbi
Diagramöarna åk 1–4-moment) får dem som VANLIGA olästa noder bakåt — det är
avsiktligt och konsistent med boss-/blixtgrindarna (beslutet "grindar gäller
även bakåt"). Nämn i versionrapporten till föräldern att barnens "Du är här"
kan flytta bakåt en bit när en etapp landar.
