# Barnens Plugg 🐧

Adaptiv matteträning för barn i förskoleklass–åk 6, byggd på svensk läroplan (Lgr22)
och etablerad inlärningsforskning. Barnen reser genom **Matteriket** med maskoten
Pingvinen Pi, tränar korta dagliga pass och utmanar bossar för att bemästra moment.

## Så funkar det

- **Läroplanen som karta:** 53 moment i 7 världar, ordnade som Lgr22:s centrala
  innehåll med förkunskapskrav. Varje mästarprov är en bosstrid.
- **Adaptiv motor:** Elo-liknande rating per färdighet håller barnet i sin
  proximala utvecklingszon (~70–80 % rätt). Nivå 8–10 ("stjärnnivån" 💎) ligger
  medvetet över årskursnivå.
- **Spaced repetition + interleaving:** behärskade moment återkommer med växande
  intervall; missad repetition öppnar momentet igen.
- **Uppgifterna genereras av kod, aldrig AI** — 44 procedurella generatorer med
  distraktorer byggda kring kända missuppfattningar (glömd växling, likhetstecknet
  som "här kommer svaret", större nämnare = större bråk …).
- **Kladdyta** på varje uppgift (finger/penna), sparas med svaret.
- **"Pi visar först":** lösta exempel innan varje nytt moment (worked examples).
- **Blixtpass:** skolans minuttest som rekordjakt — 1 minut, plus/minus 0–10,
  0–20 och tabellerna, med skolans mål (konfigurerbart) som ribba.
- **Föräldraläge bakom PIN:** veckorapport i klarspråk, tidsgräns per barn och dag,
  verkliga belöningar (kupongflöde, terminsmål enligt läroplanen), export/import av
  all data.
- **Helt lokal:** all data bor på enheten (IndexedDB). Ingen server, inga konton.
  AI-chatten "Mattekompisen Pi" är förberedd som fas 5 — se `docs/GUARDRAILS.md`.

## Kom igång

```bash
npm install
npm run dev      # utvecklingsserver
npm test         # motor- och generatortester
npm run build    # produktionsbygge (typkontroll + Vite + PWA)
```

Deploy: push till `main` bygger och publicerar till GitHub Pages via
`.github/workflows/deploy.yml` (aktivera Pages → Source: GitHub Actions i repo-
inställningarna första gången). På iPad: öppna sidan i Safari → Dela →
**Lägg till på hemskärmen**. Appen fungerar därefter offline.

## Dokumentation

- `docs/ARKITEKTUR.md` — moduler, dataflöde, lagringsformat
- `docs/PEDAGOGIK.md` — forskningsgrunden bakom varje designval
- `docs/GUARDRAILS.md` — säkerhetsdesignen för AI-chatten (fas 5)
