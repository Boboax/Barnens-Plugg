# Arkitektur

## Översikt

```
src/
├── domain/          Ryggraden: typer + läroplansdata (inga beroenden inåt)
│   ├── types.ts         Hela domänmodellen. PROFILE_SCHEMA_VERSION vid brytande ändring!
│   ├── curriculum.ts    53 moment F–åk 6 med förkunskaper och terminsmappning
│   └── worlds.ts        Matterikets 7 världar, bossar och berättelsekapitel
├── generators/      Procedurella uppgiftsgeneratorer (rena funktioner, seedade)
│   ├── rng.ts           Seedad slump (mulberry32) — samma frö ⇒ samma uppgift
│   ├── helpers.ts       numericTask/choiceTask, distraktorskydd, namn/saker
│   └── <värld>.ts       44 generatorer, nivå 1–10, registreras i index.ts
├── engine/          Adaptiva motorn (rena funktioner över profildata)
│   ├── rating.ts        Elo-variant, nivåval (~70 % förväntad lyckandegrad)
│   ├── progress.ts      Mastery-tillståndsmaskin, svarsbokföring, slarvklassning
│   ├── spaced-repetition.ts  Intervall 3→7→14→30→60→120 dagar
│   ├── session.ts       Passkomponering + boss-/stjärn-/repetitionsprov
│   ├── diagnosis.ts     Startdiagnos som binärsökning längs ryggraden
│   ├── misconceptions.ts Taxonomi med barn- och föräldratexter
│   ├── report.ts        Veckorapporten i klarspråk
│   └── rewards.ts       Belöningsprogress (moment/pass/terminsmål)
├── storage/         IndexedDB (+localStorage-reserv), PIN-hash, export/import
├── chat/            ChatProvider-gränssnittet (fas 5) — Pi "sover" tills vidare
├── tts.ts           Talsyntes sv-SE (Web Speech API)
└── ui/              React: store (context) + komponenter + skärmar
```

## Dataflöde

1. **UI** anropar motorfunktioner (rena) och skickar resultatet till **store**.
2. Store uppdaterar `Household` (immutabelt) och autosparar till IndexedDB.
3. Ingen modul under `domain/`, `generators/`, `engine/` importerar från `ui/`
   eller `storage/` — motorn är testbar utan webbläsare.

## Lagringsformat

Allt lagras som ett enda `Household`-dokument (se `types.ts`):
barnprofiler (färdigheter, svarshistorik, diagnos, tid, streak),
belöningar, chattlogg, PIN-hash. Export = samma JSON till fil.
Svarshistoriken är en ringbuffert (1500 svar/barn, 20 kladdbilder/barn).

**Brytande ändringar:** bumpa `PROFILE_SCHEMA_VERSION` och kedja en migrering i
`storage/db.ts:migrate()` — annars blir gamla exports/profiler oläsbara.

## Tidsgränser

Tickas av `App.tsx` (5 s-intervall) enbart på träningsskärmar och bokförs per
dag i profilen. Kontrollen ligger i appkod — utom räckhåll för både barnet och
(i fas 5) AI:n. Gränsen sätts per barn i föräldraläget.

## Att bygga vidare (nästa faser)

- **Fler generatorer:** skriv en `TaskGenerator` i rätt världsfil, registrera i
  `generators/index.ts`, sätt `gen: true` på momentet i `curriculum.ts`.
  Fuzz-testet i `generators.test.ts` täcker den automatiskt.
- **Nya moment/världar:** lägg till i `curriculum.ts`/`worlds.ts` —
  `validateCurriculum()` fångar trasiga förkunskapskedjor.
- **Fas 5 (chatten):** implementera `ChatProvider` mot en serverless-proxy och
  registrera med `setChatProvider()`. UI-ytor och loggformat finns redan.
