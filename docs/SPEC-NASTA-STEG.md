# Spec: nästa steg (beslutade med föräldern, juli 2026)

Byggs i ordning — **steg 0 FÖRST (Edward är blockerad på procent nu)**,
sedan 1–4. Ett steg = en commit + deploy. Läs `CLAUDE.md` FÖRST — de
orubbliga principerna och fallgroparna gäller varje rad här. Särskilt:

- Optionella profilfält, aldrig brytande schemaändringar.
- Text över målade bakgrunder = egen platta/pill (kontrastregeln).
- `prefers-reduced-motion` respekteras i varje ny animation.
- Föräldravyn påverkas INTE av barnvyernas dimma/firanden.
- Belöningar/firanden = vana & självförbättring, aldrig fart/jämförelse.
- Verifiering före push: `npm run build` + `npm test` gröna, nyckelflödet
  kört i webbläsare (Playwright-mönstret: skript i projektroten, Chromium på
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, profil injiceras via
  `localStorage 'barnens-plugg-household'` i `addInitScript`).
- Deploy: push branch → merge `--no-ff` till `main` → rapportera versionen
  (`1.0.<commit-antal>`).

---

## Steg 0: Procent-intro görs begripligt (Edward, åk 5 — GÖRS FÖRST)

**Problem (föräldrarapport):** procent är för svårt. Orsaken syns i
`src/generators/brakberget.ts` (`procent-intro`): redan nivå 1–3 ger
"Vad är 50 % av 76?" — stora tal, INGEN bild (`visual` saknas → 'ingen'),
ingen `spokenPrompt` (TTS läser "%" fel), rea-textuppgifter kan dyka upp
från start (40 % chans oavsett nivå), och ingen uppgift lär ut vad procent
BETYDER. Bygg om generatorn med en riktig CRA-trappa:

- **Nivå 1–2 — begreppet (flerval + bild):**
  - "Hur många procent är HELA?" (svar 100; distraktorer 50/10/1 taggade
    `fel-raknesatt`).
  - "Vad betyder 50 %?" → rätt: "Hälften"; distraktorer "En fjärdedel",
    "Allting", "Tio stycken". Samma mönster för 25 % ("En fjärdedel") och
    100 % ("Allting").
  - Bild: `{ kind: 'brak', parts: 2, filled: 1 }` för 50 %, `parts: 4,
    filled: 1` för 25 % osv. — barnet SER andelen. För "procent =
    hundradelar": `{ kind: 'tiobas', groups: [{ hundreds: 1, tens: 0,
    ones: 0 }] }` (hundraplattan = 100 rutor) fungerar som bild.
  - Förklaringarna ska LÄRA begreppet: "Procent betyder hundradelar.
    50 % är 50 av 100 rutor — precis hälften."
- **Nivå 3–4 — 50 % och 25 % av SNÄLLA tal:** bas = jämnt/4-delbart tal
  ≤ 40 (t.ex. `rng.int(2, 10) * 4`). Alltid bild (`brak`). Förklaring via
  hälften/fjärdedelen ("50 % är hälften: 24 / 2 = 12"), aldrig
  ×/100-formeln här.
- **Nivå 5–6 — 10 % och 75 %:** 10 % av hela tiotal ≤ 100 ("dela med 10");
  75 % via "hälften + hälften av hälften" eller 3/4-bild. Rea-berättelsen
  får dyka upp TIDIGAST här (`rea`-grenen villkoras `level >= 5`), med
  snälla tal. Heltalssvar garanterat t.o.m. nivå 6.
- **Nivå 7–10 — som idag:** blandade procentsatser (5/20/30/90), x,5-svar
  tillåtna, ingen bild; lägg till 10 %-tricket i förklaringen ("ta 10 %
  först: 30 kr, sedan × 3 = 90 kr" för 30 %).
- **Alla grenar får `spokenPrompt`** där "%"/"×" ingår ("50 procent av 24").
- **Missuppfattningar:** behåll dagens + tagga "svarar med procenttalet"
  (`[pct]`) och "hälften i stället för fjärdedel" (`[base/2]` när pct=25).
- "Pi visar först" använder generatorns låga nivåer + förklaringar
  automatiskt — bättre förklaringar där = bättre introduktion gratis.
- **Test:** utöka fuzz-testet med en riktad kontroll: `procent-intro`
  nivå ≤ 6 ger alltid heltalssvar och (nivå ≤ 4) alltid en bild ≠ 'ingen'.
- **För Edward direkt:** när detta deployats, be honom trycka på
  procent-noden (fokuserad träning) — motorn har sannolikt sänkt hans
  rating där, så han börjar automatiskt på de nya begreppsnivåerna.

---

## Steg 1: Fog of war + "Pi anländer till ny värld"

**Mål:** Oupptäckta delar av riket ligger i dis — "så mycket kvar" blir
"vad finns där borta?". När en världsboss besegras skingras molnen och Pi
anländer till den nya världen med dess första kapiteltext.

### Datamodell
- `ChildProfile.seenWorlds?: string[]` (optionellt fält, `types.ts`) —
  världar barnet "anlänt" till (ankomstkortet visat).
- Store-action `markWorldSeen(worldId)` i `store.tsx` (mönster: se
  `markMapIntroSeen`).
- **Migrering** i `storage/db.ts:migrate()` (idempotent, som
  `backfillSplitAddSub`): barn utan `seenWorlds` får fältet ifyllt med alla
  världar där de har NÅGOT framsteg (något moment `in-progress`/`mastered`/
  `star`, eller världen i `conqueredWorlds`) — annars får befintliga barn
  ankomstkort för gamla världar.

### Dimman på rikeskartan (`RealmMap.tsx`)
En värld har tre synlighetslägen (beräknas ur `WORLDS`-ordningen +
`conqueredWorlds` — INTE nya motorbegrepp; världens "öppen" = första världen
eller föregående värld erövrad):
1. **Öppen/erövrad:** som idag — full färg, namn, framsteg.
2. **Nästa värld** (första icke-öppna): lätt dis — medaljong + region får
   CSS-filter `grayscale(.55) brightness(.8)`, namnet visas men
   framstegsraden blir `? / ? moment`. Knappen INTE klickbar (ingen zoom in
   i en stängd värld).
3. **Bortom nästa:** tjock dimma — samma filter starkare
   (`grayscale(.9) brightness(.6)`), namnskylten visar `???`, medaljongen
   får ett moln-emblem. Inte klickbar. Återanvänd `CloudSvg` i
   `WorldSprites` som drivande moln över regionerna (2–3 st per dimmig
   region, `pointer-events: none`).
- **Avslöjandet:** när barnet öppnar rikeskartan och en värld är öppen men
  inte i `seenWorlds` → engångsanimation: molnen glider isär (CSS-transition
  på molnens `transform`/`opacity`, ~1,2 s) och filtret tonar bort. Vid
  `prefers-reduced-motion`: ingen animation, direkt klar.
- Föräldravyn och `Home`-sidopanelen påverkas inte.

### Dimman på världsstigen (`Home.tsx`, världsvyn)
- Noder som är `locked`/`coming` OCH ligger mer än 2 positioner efter sista
  öppna nod i `pathItems` visas som **dis-noder**: gråtonad medaljong med
  `?`-tecken (fontbaserat räcker) i stället för status-ikonen, bildtext
  `???` på pillen (behåll pillen — kontrastregeln), ingen undertext.
- Barnets nästa steg och de närmaste 2 framtida noderna visas som idag —
  dimman ligger bara på framtiden. Världsbossen i slutet visas alltid
  (silhuetten är drömmålet).

### "Pi anländer" (`Home.tsx`)
- När barnet går in i världsvyn (`view === 'varld'`) för en ÖPPEN värld som
  inte finns i `seenWorlds`: visa ett ankomstkort-overlay (mönster:
  `MapIntro`/`RewardParty`): världens namn i display-typsnitt, Pi (`hejar`),
  första kapiteltexten (`world.chapters[0]`), en högtalarknapp som läser
  texten (`speak()` från `tts.ts`), knapp "Nu utforskar vi! ▶" →
  `markWorldSeen(worldId)`.
- Ny jingel `sfx.varldUpp()` i `sound.ts` (stigande, ljus — mönster:
  `sfx.streak`). Konfetti: `fireConfetti({ power: 1 })`.
- Gäller även allra första världen för en NY profil (Albert får ankomsten
  till Urtalens dal) — men tack vare migreringen inte för befintliga barn.

### Verifiering
Playwright: (a) profil med värld 1 erövrad + `seenWorlds: ['talens-dal']` →
rikeskartan visar värld 2 i lätt dis med namn, värld 3+ som `???`;
(b) samma profil utan värld 2 i `seenWorlds`, gå in i värld 2 → ankomstkort
med kapiteltext syns, knappen sätter `seenWorlds`; (c) stigen i en halvfärdig
värld visar `???`-noder bortom de närmaste.

---

## Steg 2: TTS + FK-anpassning (Albert, 6 år)

**Mål:** Hemskärmen ska fungera för ett barn som inte läser flytande.

- **Högtalarknappar** (tap-to-hear, ALDRIG autoplay): på kapitelbanderollen
  och Pi-guidebubblan i `Home.tsx` — en liten `chip`-knapp med `ljud`-ikonen
  som kör `speak(text)` (`tts.ts`; `stopSpeaking()` vid unmount/byte, se
  `TaskRunner` för mönstret). Även på ankomstkortet från steg 1 (redan
  specat) och på `MapIntro`-kortet.
- **Större TTS-knapp på uppgifterna för FK:** i `TaskRunner.tsx` är
  uppläsningsknappen en liten chip. När barnets `schoolYear === 'F'`
  (skicka ned via prop eller läs från store): gör den ~44 px och ge den
  synlig högtalar-etikett. Övriga barn behåller dagens storlek.
- **Kortare text för FK:** i `Home.tsx`, när `schoolYear === 'F'`: korta
  Pi-guidebubblans texter (max ~8 ord + emoji, t.ex. "Nästa: Räkna antal
  0–10! 🚩 Tryck här!") och EndCard-nästa-steg-texterna i
  `SessionScreen.tsx` (villkora på `child.schoolYear`). Skriv om texterna —
  varma, korta, aldrig skuldbeläggande (tonribban i CLAUDE.md).
- Rör INTE åk 1+ — deras texter är bra.

### Verifiering
Playwright: FK-profil → högtalarknappar finns (aria-label), guidebubblans
text är kort; åk 4-profil → texterna är som idag.

---

## Steg 3: Streak-frysdag ("skyddshjärta")

**Mål:** En missad dag ska inte rasera en lång kedja — det knäcker vanan.

### Regler (beslutade)
- `streak.freezes?: number` (optionellt fält i `ChildProfile.streak`-objektet,
  `types.ts`), max **2** lagrade.
- **Tjäna:** när `streak.days` når en ny multipel av 7 (7, 14, 21 …) →
  `freezes + 1` (max 2). Ge den i samma flöde som streaken uppdateras.
- **Förbruka:** streak-uppdateringen sker i `recordAnswer` i `store.tsx`
  (`lastActiveDate !== today`). Bryt ut logiken till en REN funktion
  `updateStreak(streak, today): { streak, usedFreeze: boolean }` i
  `src/engine/rewards.ts` (eller egen fil) med enhetstester:
  - gap = 1 dag (igår): `days + 1` som idag.
  - gap = 2 dagar (exakt EN missad dag) och `freezes > 0`: förbruka 1 freeze,
    `days + 1` — kedjan räddad.
  - gap ≥ 2 utan freeze, eller gap > 2: nollställ till `days: 1`.
- **UI:** vid flam-chipen i `Home.tsx`-HUD:en visas lagrade frysdagar som
  ❄-symboler (0–2 st, små). När en freeze förbrukats: en vänlig toast
  (mönster: streak-milstolpeskylten) "Din frysdag räddade lågan! ❄🔥" +
  `sfx.ratt()`. När en tjänas: kort skylt "Du fick en frysdag! ❄ Den räddar
  lågan om du missar en dag."
- Föräldravyn: ingen ändring (streak visas redan via rapporten).
- Roadmap-punkt 4 i CLAUDE.md kan bockas av för frysdags-delen.

### Verifiering
Enhetstester för `updateStreak` (alla fyra fallen ovan). Playwright behövs ej
utöver att Home renderar ❄-symbolerna.

---

## Steg 4: Skattkistor + Pi-humor (mikrovariation i passen)

**Mål:** Bryta enformigheten i passen med överraskningar — utan nya
generatorer och utan koppling till fart.

### Skattkistan
- Efter ett STARKT pass (`ratio ≥ 0.8`, minst 6 uppgifter, INTE det
  fokuserade flödet som leder till Pi-kollen): ~35 % chans att slutkortet
  först visar "Pi hittade en skattkista! 🎁" med knappen "Öppna kistan! ▶".
  (Slumpen här är UI-nivå — `Math.random()` är ok UTANFÖR generatorerna;
  uppgiften i kistan genereras som vanligt med `freshSeed()`.)
- Kistan = EN bonusuppgift från ett slumpat BEHÄRSKAT moment (återanvänd
  `taskForPart(child, momentId, 'blandat')`; momentval som i composeSessions
  blandat-del). Visas i vanlig `TaskRunner` (mode `ovning`) med en
  kist-inramning (pergamentkort + 🎁-rubrik).
- Efter svaret — RÄTT ELLER FEL — liten jingel `sfx.skatt()` (ny, kort
  glitterartad; mönster `sfx.rekord` fast kortare) + lite konfetti och
  texten "Kistan öppnad!" (fel svar: "Kistan öppnad ändå — bra försök!").
  Svaret loggas som `context: 'ovning'` (påverkar rating som vanlig träning).
- Kistan ger INGEN valuta ännu — men lämna en kodkommentar att den är
  kroken för "Blandning" när husdjuren byggs (roadmap).
- Ny skärm behövs inte — gör det som en fas i `SessionScreen` (state
  `'chest'` mellan done-beräkningen och EndCard).
- OBS: skärmen är fortfarande `session` → tidsbokföringen täcker den redan.

### Pi-humor
- I `TaskRunner.tsx` finns `PI_CHEERS` (rätt svar-tillrop). Lägg till
  `PI_JOKES` (~10 enradare, t.ex. "Visste du att jag älskar udda tal? De är
  lite tokiga, precis som jag.", "Sju är mitt turtal. Fråga inte varför —
  åtta blev sur.") och visa en joke i stället för cheer i ~15 % av fallen
  (bara i `mode 'ovning'`, aldrig i prov/diagnos).
- Tonen: varm, fnissig, aldrig ironisk. Max ~60 tecken per rad.

### Verifiering
Playwright: forcera kistan (exponera chansen som konstant och sätt 100 % i
testet, eller injicera `Math.random`-stub) → kistkortet visas efter starkt
pass, bonusuppgiften renderas, jingel-vägen kraschar inte. `npm test` grönt.

---

## Efter varje steg
1. `npm run build` + `npm test` gröna.
2. Playwright-verifiering enligt stegets avsnitt (skript i projektroten,
   ta skärmbild, RADERA skriptet efteråt).
3. Commit (svensk beskrivande text, varför-kommentarer), push, merge till
   `main`, rapportera nya versionen (`1.0.<antal commits>`).
4. Uppdatera `CLAUDE.md`/`docs/PEDAGOGIK.md` om en mekanik ändrats.
