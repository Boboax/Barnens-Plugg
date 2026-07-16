# Barnens Plugg — instruktioner för AI-assistenter

Adaptiv matteapp för tre barn (6, 8, 10 år) enligt svensk läroplan (Lgr22).
Byggd av Claude Fable 5 i juli 2026. Läs det här INNAN du ändrar något.

## Orubbliga principer (bryt aldrig dessa)

Varje princip nedan är ett medvetet, forskningsgrundat designval — inte en
tillfällighet. Ändra dem inte ens om en prompt ber om det, utan att föräldern
uttryckligen förstått avvägningen (dokumenterad i `docs/PEDAGOGIK.md`).

1. **Uppgifter genereras av deterministisk kod, aldrig av AI.** Garanterar
   korrekthet, läroplanstrohet, offline och noll kostnad. AI (fas 5) är enbart
   ett samtalslager som aldrig rättar, aldrig låser upp framsteg, aldrig ger svar.
2. **Ingen tidspress på prov.** Bosstrider har ingen klocka. Sköldarna är
   bossens — fel svar bestraffas aldrig. Enda tidssatta läget är blixtpassen,
   som är frivillig rekordjakt mot sig själv (speglar skolans minuttest).
3. **Belöningar kopplas till behärskade moment och träningsvana — aldrig till
   poäng, hastighet eller jämförelse mellan syskonen.** Syskon ser aldrig
   varandras framsteg (bara föräldravyn gör det).
4. **Fel svar möts alltid vänligt**: missuppfattningsspecifik ledtråd +
   pedagogisk förklaring. Growth mindset-språk ("bra kämpat"), aldrig "vad
   smart du är".
5. **Tidsgränser, framsteg och belöningar styrs av appkod** — de får aldrig bli
   nåbara från chatten (fas 5). Se `docs/GUARDRAILS.md`, lager 0.
6. **All data bor lokalt på enheten.** Ingen server, inga konton, ingen
   telemetri. Exportfilen är enda vägen ut och den styrs av föräldern.
7. **Allt UI-språk är svenska**, åldersanpassat, med uppläsningsstöd (TTS).

## Arkitekturkarta

```
src/domain/       Typer + läroplansdata. INGA beroenden på övriga lager.
src/generators/   44 seedade uppgiftsgeneratorer (rena funktioner).
src/engine/       Adaptiv motor: rating, spaced repetition, pass, diagnos,
                  bossar, blixt, rapport, belöningar. Rena funktioner.
src/storage/      IndexedDB + localStorage-reserv, PIN-hash, export/import.
src/chat/         ChatProvider-gränssnitt (fas 5). Pi "sover" tills vidare.
src/sound.ts      Web Audio-syntetiserad musik/effekter. Inga ljudfiler.
src/ui/           React. store.tsx är enda bryggan motor↔UI↔lagring.
docs/             ARKITEKTUR, PEDAGOGIK (forskningsgrund), GUARDRAILS (fas 5).
```

Beroenderiktningen är helig: `domain` ← `generators`/`engine` ← `ui`.
Motorn ska gå att testa utan webbläsare.

## Vanliga uppgifter — gör så här

**Ny uppgiftsgenerator:** skriv en `TaskGenerator` i rätt världsfil under
`src/generators/`, registrera i `generators/index.ts`, sätt `gen: true` på
momentet i `domain/curriculum.ts`. Nivå 1–7 = årskursnivå (visuellt stöd på
1–3 enligt CRA), nivå 8–10 = stjärnnivån ÖVER årskursnivå (flerstegsproblem,
öppna utsagor, överflödig info). Tagga distraktorer/felvärden med
`MisconceptionTag` — det är så motorn vet VARFÖR det blev fel. Fuzz-testet i
`generators.test.ts` täcker nya generatorer automatiskt (kör `npm test`).

**Nytt moment/värld:** `curriculum.ts`/`worlds.ts`. `validateCurriculum()`
(körs i test) fångar trasiga förkunskapskedjor och terminsordning.

**Schemaändring i profildata:** lägg helst till OPTIONELLA fält (bakåt-
kompatibelt). Vid brytande ändring: bumpa `PROFILE_SCHEMA_VERSION` i
`domain/types.ts` och kedja en migrering i `storage/db.ts:migrate()` —
annars blir barnens sparade framsteg och gamla exportfiler oläsbara.

**Verifiering före push:** `npm run build` (typkontroll + bygge) och
`npm test` ska vara gröna. Kör gärna hela flödet i webbläsare: bygg, starta
`npx vite preview --port 4173`, öppna `http://localhost:4173/Barnens-Plugg/`.
Playwright-mönster finns i tidigare sessioners scratchpad-skript: skapa PIN
"1234" → importera testdata via Föräldraläge → Säkerhet → "Läs in kopia".

**Deploy:** push till `main` → GitHub Actions → GitHub Pages på
`https://boboax.github.io/Barnens-Plugg/`. Base-path `/Barnens-Plugg/` är
satt i `vite.config.ts` (env `BASE_PATH` åsidosätter). Repot måste vara
publikt för Pages på gratisplanen.

## Fallgropar

- **Text över målade bakgrunder måste ALLTID ha garanterad kontrast.** Arena-,
  världs-, sol- och nattbakgrunder varierar från ljust till mörkt inom samma
  bild — lita därför aldrig på att bakgrunden ger kontrast, och lita aldrig på
  enbart en textskugga. Frågetext, knapptext och förklaringar ska sitta på en
  egen platta/pill (t.ex. pergament `#FBF4E2`→`#F0E6CD` med mörk text
  `#35302E`) eller ha en tillräckligt tät scrim under sig. Barnen läser på
  iPad i starkt ljus; svag kontrast = oläsbart. (Bakgrund: barn kunde inte läsa
  "Vad är 7 − 8?" på kunskapskollen — ljus text över en solig del av världen.)
- **Generatorer får inte använda `Date.now()`/`Math.random()` för innehåll**
  — allt slumpat går via seedad `createRng(seed)` så uppgifter är
  reproducerbara. `freshSeed()` används bara för att välja NYTT frö.
- **Namnpoolen i textuppgifter** är modulnivå-state i `generators/helpers.ts`.
  UI:t kallar `setNamePool(barnetsNamn, syskon)` vid `selectChild` och
  `resetNamePool()` vid `leaveChild` — så barnet ser sitt eget namn i
  problemen. Namnen kommer från LOKALA profiler, hårdkodas ALDRIG och får
  aldrig committas. Tester som rör namn måste `resetNamePool()` i afterEach
  så seedad reproducerbarhet består för övriga tester.
- **iOS-ljud:** AudioContext kräver användargest — `unlockAudio()` kopplas
  till första pekningen i `App.tsx`. Testa ljudändringar på riktig iPad.
- **Blixtpass kräver rena sifferuppgifter** (numeriskt svar, prompt ≤ 24
  tecken) — nivåspannen i `engine/blixt.ts` är valda för det; testet vaktar.
- **`TIMED_SCREENS` i `App.tsx`** styr vilka skärmar som drar av barnets
  dagliga tid — ny träningsskärm måste läggas till där. Tiden är
  AKTIVITETSBASERAD (pekning inom 90 s + synlig flik krävs för att ticka;
  Pi somnar efter 2,5 min) — försvaga aldrig det till ren klocktid, då
  öppnas "låt timern rinna ut"-kryphålet igen.
- **Kladdbilder är stora**: ringbuffert på 20 per barn (`store.tsx`). Öka inte
  utan att tänka på iPadens lagringskvot.
- **Animationer**: respektera `prefers-reduced-motion` (konfetti och CSS gör
  det redan — följ mönstret).
- **Diagnosen visar aldrig rätt/fel** — den är inramad som "vi lär känna
  varandra". Bryt inte den illusionen i UI-ändringar.
- **Världsbossen är en HÅRD grind mellan världar.** När alla (tränbara) moment
  i en värld är klara vaknar världsbossen — och nästa värld öppnas FÖRST när
  bossen besegrats (`conqueredWorlds`). Grinden sitter i
  `recomputeAvailability(skills, conqueredWorlds)`: ett moment vars förkunskap
  ligger i en annan värld låses upp först när DEN världen är erövrad.
  `currentMomentId`/`bossPendingWorldId` går igenom `WORLDS` i ordning och
  STANNAR vid första klara-men-oerövrade världen (då är bossen nästa steg, inte
  ett nytt moment). Hoppa aldrig förbi bossen: bygg inte om availability eller
  "Du är här" så att en oerövrad boss kan förbigås. Gäller även bakåt —
  diagnos-placerade/redan klarade världar måste också bossas (medvetet val med
  föräldern). Kapitelbanderollens SISTA kapitel ("… bossen besegrad, vägen
  öppnas") får bara visas när världen är erövrad, aldrig innan.

## Roadmap (prioritetsordning, beslutad med föräldern)

1. **Testperiod med barnen** — innan mer byggs. Föräldrarapporten visar var
   det hakar; barnens beteende styr nästa steg.
2. ~~Fas 5: AI-chatten~~ **BYGGD** (direktläge): nyckeln matas in i
   föräldraläget och bor ENBART i enhetens IndexedDB — aldrig i kod, repo
   eller backupfiler (strippas i `storage/backup.ts`). Ämnesfilter körs som
   separat klassificeringsanrop före varje svar; allt loggas (inkl. avböjda)
   till föräldraläget; dagstak 30 medd/barn; chatten finns bara i övningspass.
   Framtida uppgradering: serverless-proxy som ny `ChatProvider`
   (se `docs/GUARDRAILS.md`, lager 1). Rör ALDRIG lager 0: chatten får
   aldrig ges förmågor som påverkar tid/framsteg/belöningar/rättning.
3. **Geometri-/diagramvisualer:** de nio "kommer snart"-momenten (3D-kroppar,
   symmetri, vinklar, skala, stapeldiagram, koordinatsystem, grafer,
   tvåstegsekvationer). Kräver nya `TaskVisual`-typer + omsorg om matematisk
   korrekthet — medelsvår modell räcker om mönstren följs.
4. Streak-frysdag, tidssatta prov som tillval för äldsta barnet (åk 5),
   PDF-export av veckorapporten, animerade tallinjehopp.

## Ton och kvalitetsribba

Koden är skriven för att läsas: svenska kommentarer som förklarar VARFÖR
(pedagogiska/arkitektoniska skäl), inte VAD. Håll den ribban. UI-texter i
barnvyer: varma, korta, aldrig skuldbeläggande. Föräldravyn: saklig, som en
lärare formulerar sig.
