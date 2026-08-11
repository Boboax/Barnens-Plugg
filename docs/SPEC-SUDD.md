# SPEC: Suddgummi i kladdytan

Förälderns önskemål (aug 2026): i "Min uträkning"-rutan går det i dag bara
att ta bort ALLT ("Sudda allt") — barnen vill kunna sudda där de drar,
som ett riktigt suddgummi.

Läs `CLAUDE.md` först. Hela ändringen bor i EN fil:
`src/ui/components/ScratchPad.tsx`. Rör ingenting i motor/lagring.

## Implementation

1. **Verktygsläge.** Ny state: `const [tool, setTool] = useState<'penna' | 'sudd'>('penna')`
   plus `toolRef` med samma ref-mönster som `colorRef` (rad ~28–29) —
   pointer-lyssnarna binds EN gång i effekten, så utan ref läser `move`
   ett inaktuellt verktyg.

2. **Sudda i `move`-hanteraren** (rad ~69–80). Per anrop, före `stroke()`:
   - sudd: `ctx.globalCompositeOperation = 'destination-out'` och
     `ctx.lineWidth = 22 * scale` (fingerbrett).
   - penna: `ctx.globalCompositeOperation = 'source-over'`,
     `lineWidth = 3 * scale`, `strokeStyle = colorRef.current` (som i dag).
   Canvasen är transparent ovanpå pergamentytan, så destination-out
   suddar till genomskinligt = pergamentet syns igen. `snapshot()` fyller
   redan `#F1E8D2` under bitmappen (rad ~98), så sparade bilder blir rätt.

3. **Suddknapp i listen** (rad ~130–141, mellan färgprickarna och
   "Sudda allt"): en knapp med t.ex. 🧽 (aria-label "Suddgummi"),
   markering när vald med samma boxShadow-ring som färgprickarna.
   Att trycka på en FÄRG växlar alltid tillbaka till pennan
   (barn som väljer färg vill rita).

4. **`hasInk`-detaljen** (rad ~61): sätt `hasInk.current = true` i `down`
   BARA när `tool === 'penna'` — att sudda på en tom yta ska inte göra
   att en tom PNG sparas med svaret.

5. **Rör inte:** `onDraw`-callbacken i `down` (stänger Pi-panelen — ska
   trigga även vid sudd), `touchAction: 'none'`, resize-logiken,
   ringbufferten för kladdbilder (store), "Sudda allt"-knappen (behålls).

## Verifiering

- `npm run build` + `npm test` gröna (inga nya enhetstester behövs).
- Playwright (mönster i tidigare sessioners scratchpad, t.ex.
  `verify-draw.mjs`; testdata + PIN-flöde beskrivs i CLAUDE.md):
  starta ett pass, rita ett streck på kladdytan, växla till sudd, dra
  över strecket, och verifiera via `page.evaluate` + `getImageData` att
  pixlarna i det suddade området är transparenta igen — och att ett
  KVARVARANDE streck fortfarande har pigment (suddet får inte radera allt).
- Kontrast: knappen sitter på den ljusa listen — samma mörka ton
  (`#6E6656`) som övriga listknappar.

## Deploy (samma rutin som alltid)

`npm run build` + `npm test` → commit på
`claude/math-learning-environment-7y4ypa` (svenskt meddelande, VARFÖR) →
push → `git checkout main` → `git merge --no-ff` → push → rapportera
versionen (`1.0.$(git rev-list --count HEAD)`) → tillbaka till branchen.
