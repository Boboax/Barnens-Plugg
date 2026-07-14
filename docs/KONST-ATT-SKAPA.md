# Konst att skapa (Gemini) — så byter vi ut sista emojierna

Beslut 2026-07-14: kvarvarande emojis ersätts med målad konst. Nedan är exakt
vad som behövs, var filerna ska ligga och hur de ska se ut. När du lagt in en
fil i `public/…` säger du till, så bygger jag in den.

**Gemensam stil för allt:** samma måleriska sagostil som resten av spelet,
**genomskinlig bakgrund** (PNG/WebP med alpha), fyrkantig canvas, mjuk
ljussättning uppifrån, tydlig även i litet format. Spara som `.webp`.

---

## 1. UI-ikoner — `public/art/icons/` (~256×256)

Matchar de befintliga ikonerna (guld/mässing på mörkt, samma som `skold.webp`,
`blixt.webp` osv.).

- [ ] `ljud.webp` — högtalare med ljudvågor (ljud PÅ). Uppläsnings- och ljudknapp.
- [ ] `ljud-av.webp` — samma högtalare överkryssad (ljud AV / tyst).
- [ ] `karta.webp` — hoprullad äventyrskarta. Knappen "Hela Matteriket".

(Ej valda nu, men kandidater om du vill senare: `mal.webp` = pilmål för
blixtpassen, `ledtrad.webp` = glödlampa för Pi:s tips.)

---

## 2. Räkneobjekt — `public/art/objekt/` (~160×160)

Används INNE i matteuppgifterna (räkna föremål, fortsätt mönstret). Behöver vara
enkla och lätta att räkna/känna igen i rad. Två grupper:

**Räkneföremål (ur `src/generators/helpers.ts`):**
- [ ] `kula.webp` — blå glaskula
- [ ] `kort.webp` — spelkort
- [ ] `apple.webp` — rött äpple
- [ ] `klistermarke.webp` — stjärnklistermärke
- [ ] `snacka.webp` — snäcka
- [ ] `kotte.webp` — grankotte
- [ ] `boll.webp` — fotboll
- [ ] `bulle.webp` — kanelbulle

**Mönsterfigurer (ur `src/generators/monsterskogen.ts`):**
- [ ] `cirkel-rod.webp`, `cirkel-bla.webp`
- [ ] `stjarna-guld.webp`, `mane.webp`
- [ ] `groda.webp`, `anka.webp`
- [ ] `ruta-gul.webp`, `ruta-gron.webp`, `ruta-bla.webp`
- [ ] `frukt-apple.webp`, `frukt-paron.webp`, `frukt-citron.webp`

> Obs: när dessa finns bygger jag även in ett litet renderingslager så att
> generatorerna kan visa bilderna i stället för emoji-tecken (idag ligger
> emojin som text i uppgiften). Det är en liten pipeline-ändring — inget du
> behöver tänka på, men det görs samtidigt som konsten läggs in.

---

## 3. Belöningsikoner — `public/art/beloning/` (~200×200)

Föräldern väljer en per belöning. Åtta stycken (ur `REWARD_EMOJI`):
- [ ] `bio.webp` (film), `glass.webp`, `boll.webp`, `spel.webp` (handkontroll),
      `bok.webp`, `bakverk.webp` (muffins), `simning.webp`, `konst.webp` (palett)

(Vill du fler valmöjligheter lägger vi bara till fler filer + namn i listan.)

---

## Så bygger vi in det

1. Du målar och lägger filerna i rätt `public/art/…`-mapp (committas — de är
   inte känsliga).
2. Säg till vilka som är klara.
3. Jag kopplar in dem: UI-ikonerna direkt i `Icon`, räkneobjekten via ett nytt
   `TaskVisual`-läge + uppdaterade generatorer, belöningarna i väljaren.
4. `npm run build` + tester gröna → deploy.
