# Grafikbeställning — etapp 2 och 3

Uppdrag till ChatGPT (som har tillgång till repot och minns appen och
bilderna den gjort tidigare, bland annat lägret, husdjuren, hjältarna och
bossarnas stridsrutor på grenen `feature/character-battle-prototype`).

## Leverans

- **45 bilder**, listade nedan med exakta filnamn.
- **Format:** PNG med transparent bakgrund (alfa), storlek enligt listan.
- **Var:** committa alla filer till mappen `leverans/` på en ny gren
  `grafik/leverans`, skapad från `main`. **Inte** till `main` och inte
  till `public/` — Claude hämtar bilderna därifrån, konverterar till webp,
  kontrollerar storlek och tar in dem i appen.
- Leverera gärna i omgångar: **etapp 3 först** (13 bilder + 7 bossreliker),
  sedan lägret och etapp 2 (1 + 24 bilder). En commit per omgång räcker.
- Avvik inte från filnamnen; koden letar efter exakt dessa.
- **Redan gjort? Hoppa över det.** Finns en bild redan på `grafik/leverans`,
  eller har du redan genererat den tidigare i vårt samarbete, behöver den
  inte göras om — leverera den befintliga med rätt filnamn i stället, och
  lägg bara tid på det som saknas. Skriv i commit-meddelandet vilka filer
  som är nya och vilka som är återanvända.

## Referensbilder (läs dem i repot innan du ritar)

- Husdjur, stadium 3 "vuxen" (finns redan och ska INTE göras om):
  `public/art/camp/{woodland-frog,dune-fox,reef-axolotl}-poster-v1.webp` på `main`,
  draken: `public/art/camp/crystal-dragon-poster-v3.webp` på
  `feature/character-battle-prototype`.
- Hjältar: `public/art/hero/{bagskytt,riddare,trollkarl}.webp` på `main`, och
  stridsposerna `public/art/hero/poses/{hjälte}-{attack,block,victory}.webp`
  (finns på `main` när etapp 3 är mergad, annars `public/art/prototype-v16..v19/`
  på `feature/character-battle-prototype`). Viloposen ska ha samma skala,
  beskärning och fotposition som attack-posen.
- Bossar: `public/art/boss/{id}.webp` på `main`.
- Stridsscenen: hjälten står till **vänster** och vänder sig åt höger,
  bossen står till **höger** och vänder sig åt vänster. Hjältens anfall
  flyger åt höger, bossarnas åt vänster.

## Stil (gäller alla bilder)

```
You are creating art for a Swedish children's math app ("Räknarnas rike") for kids aged 6–10. Match the attached reference image exactly in style: soft painterly digital fantasy illustration, warm and friendly, rich but gentle colours, clean readable shapes, soft rim light from the left (warm campfire glow) and a faint cool moonlight from the right. Always: transparent background (PNG with alpha), no ground shadow, no text, no frame, no border, the whole figure visible with a little empty space around it, one single subject per image. Keep every character's colours, markings and accessories identical to its reference image.
```

## Etapp 3 · Hjältarnas vilopose

### `hero-bagskytt-idle.png` — 1024×1536 (stående)

Referens: https://boboax.github.io/Barnens-Plugg/art/hero/bagskytt.webp, https://raw.githubusercontent.com/Boboax/Barnens-Plugg/feature/character-battle-prototype/public/art/prototype-v16/bagskytt-attack-v1.png

```
The same child archer as in the attached references (same face, hair, glasses if any, clothes and bow). Full body, standing in a relaxed but ready battle stance, weight on both feet, bow held low and ready, turned three-quarters to the RIGHT (facing an enemy on the right side of the screen). Same scale, framing and foot position as the attached attack pose. Calm, brave, friendly expression.
```

### `hero-riddare-idle.png` — 1024×1536 (stående)

Referens: https://boboax.github.io/Barnens-Plugg/art/hero/riddare.webp, https://raw.githubusercontent.com/Boboax/Barnens-Plugg/feature/character-battle-prototype/public/art/prototype-v17/riddare-attack-v1.png

```
The same child knight as in the attached references (same face, hair, glasses if any, clothes and sword and shield). Full body, standing in a relaxed but ready battle stance, weight on both feet, sword and shield held low and ready, turned three-quarters to the RIGHT (facing an enemy on the right side of the screen). Same scale, framing and foot position as the attached attack pose. Calm, brave, friendly expression.
```

### `hero-trollkarl-idle.png` — 1024×1536 (stående)

Referens: https://boboax.github.io/Barnens-Plugg/art/hero/trollkarl.webp, https://raw.githubusercontent.com/Boboax/Barnens-Plugg/feature/character-battle-prototype/public/art/prototype-v18/trollkarl-attack-v1.png

```
The same child wizard as in the attached references (same face, hair, glasses if any, clothes and staff). Full body, standing in a relaxed but ready battle stance, weight on both feet, staff held low and ready, turned three-quarters to the RIGHT (facing an enemy on the right side of the screen). Same scale, framing and foot position as the attached attack pose. Calm, brave, friendly expression.
```

## Etapp 3 · Hjältarnas anfall (flyger åt höger)

### `proj-pil.png` — 1536×1024 (liggande)

Referens: https://boboax.github.io/Barnens-Plugg/art/hero/bagskytt.webp

```
A single magical arrow flying horizontally to the RIGHT: wooden shaft, feathered fletching on the left, a softly glowing golden arrowhead pointing right and a short trail of warm light sparkles behind it. Seen from the side. Nothing else in the image.
```

### `proj-svardsvag.png` — 1536×1024 (liggande)

Referens: https://boboax.github.io/Barnens-Plugg/art/hero/riddare.webp

```
A crescent-shaped wave of bright silver-blue sword energy travelling horizontally to the RIGHT, curved like a sword slash, with a few small sparkles trailing behind on the left. Seen from the side. Nothing else in the image.
```

### `proj-trollkula.png` — 1536×1024 (liggande)

Referens: https://boboax.github.io/Barnens-Plugg/art/hero/trollkarl.webp

```
A round orb of swirling violet and teal magic with small floating star sparks, flying horizontally to the RIGHT with a soft comet-like glowing trail on its left side. Seen from the side. Nothing else in the image.
```

## Etapp 3 · Bossarnas anfall (flyger åt vänster)

### `proj-vaxlartrollet.png` — 1536×1024 (liggande)

Referens: https://boboax.github.io/Barnens-Plugg/art/boss/vaxlartrollet.webp

```
The attack of the boss in the attached image (Växlartrollet): a big spinning golden coin with the number 10 stamped on it, motion blur rings around it, flying horizontally to the LEFT (towards a hero on the left), with its trail on the right side. Same painterly style and colour palette as the boss. Child-friendly: dramatic but never scary or gory. Nothing else in the image.
```

### `proj-tabelldraken.png` — 1536×1024 (liggande)

Referens: https://boboax.github.io/Barnens-Plugg/art/boss/tabelldraken.webp

```
The attack of the boss in the attached image (Tabelldraken): a fireball made of warm orange flame with small glowing multiplication signs (×) dancing inside it, flying horizontally to the LEFT (towards a hero on the left), with its trail on the right side. Same painterly style and colour palette as the boss. Child-friendly: dramatic but never scary or gory. Nothing else in the image.
```

### `proj-brakbjorren.png` — 1536×1024 (liggande)

Referens: https://boboax.github.io/Barnens-Plugg/art/boss/brakbjorren.webp

```
The attack of the boss in the attached image (Bråkbjörnen): a thrown round honey cake cut into fraction slices, one slice glowing, crumbs flying behind it, flying horizontally to the LEFT (towards a hero on the left), with its trail on the right side. Same painterly style and colour palette as the boss. Child-friendly: dramatic but never scary or gory. Nothing else in the image.
```

### `proj-monsterormen.png` — 1536×1024 (liggande)

Referens: https://boboax.github.io/Barnens-Plugg/art/boss/monsterormen.webp

```
The attack of the boss in the attached image (Mönsterormen): a glowing emerald-green rune projectile shaped like a repeating spiral pattern, trailing small repeating shapes, flying horizontally to the LEFT (towards a hero on the left), with its trail on the right side. Same painterly style and colour palette as the boss. Child-friendly: dramatic but never scary or gory. Nothing else in the image.
```

### `proj-stenjatten.png` — 1536×1024 (liggande)

Referens: https://boboax.github.io/Barnens-Plugg/art/boss/stenjatten.webp

```
The attack of the boss in the attached image (Stenjätten Kant): a hurled grey runestone with glowing geometric carvings (triangle, square, circle), small rock chips trailing behind it, flying horizontally to the LEFT (towards a hero on the left), with its trail on the right side. Same painterly style and colour palette as the boss. Child-friendly: dramatic but never scary or gory. Nothing else in the image.
```

### `proj-plottrig.png` — 1536×1024 (liggande)

Referens: https://boboax.github.io/Barnens-Plugg/art/boss/plottrig.webp

```
The attack of the boss in the attached image (Bläckfisken Plottrig): a messy flying ink blob shaped like a scribbled bar chart with dripping ink splashes trailing behind it, flying horizontally to the LEFT (towards a hero on the left), with its trail on the right side. Same painterly style and colour palette as the boss. Child-friendly: dramatic but never scary or gory. Nothing else in the image.
```

### `proj-procentspoket.png` — 1536×1024 (liggande)

Referens: https://boboax.github.io/Barnens-Plugg/art/boss/procentspoket.webp

```
The attack of the boss in the attached image (Procentspöket): a ghostly pale-blue wisp shaped like a percent sign (%), semi-transparent with a faint misty tail, flying horizontally to the LEFT (towards a hero on the left), with its trail on the right side. Same painterly style and colour palette as the boss. Child-friendly: dramatic but never scary or gory. Nothing else in the image.
```


## Etapp 3 · Bossrelikerna (7) — måste kännas EPISKA

Varje världsboss lämnar en unik relik när den besegras. Det här är spelets
största trofé: legendarisk, glänsande, magisk — men barnvänlig.
Gemensamt för alla sju: ensamt föremål i centrum, svag tre-kvarts vinkel,
tydlig magisk aura och små ljusgnistor runt föremålet, rik detaljerad
målning (mer detaljerad än lägrets föremål), transparent bakgrund, ingen text.

### `relic-dalen-sigill.png` — 1024×1024

Referens: https://boboax.github.io/Barnens-Plugg/art/boss/vaxlartrollet.webp (bossens färger och tema)

```
A legendary relic dropped by the defeated boss in the attached image (Växlartrollets brosigill): a heavy ancient bronze-and-gold bridge seal: a round medallion with a stone bridge arching over a river engraved on it, the number 10 in glowing runes around the rim, a broken troll chain link hanging from it. Epic treasure feel: rich gold and gem details, a strong glowing magical aura in the boss's colours, small floating light sparks around it, dramatic rim light. One single object, centered, three-quarter view, transparent background, no text, child-friendly and wondrous rather than scary.
```

### `relic-skogen-relik.png` — 1024×1024

Referens: https://boboax.github.io/Barnens-Plugg/art/boss/tabelldraken.webp (bossens färger och tema)

```
A legendary relic dropped by the defeated boss in the attached image (Tabelldrakens guldskala): a single large dragon scale of polished gold and emerald, shaped like a shield, with a glowing multiplication table (×) pattern etched across it like a treasure map. Epic treasure feel: rich gold and gem details, a strong glowing magical aura in the boss's colours, small floating light sparks around it, dramatic rim light. One single object, centered, three-quarter view, transparent background, no text, child-friendly and wondrous rather than scary.
```

### `relic-brak-relik.png` — 1024×1024

Referens: https://boboax.github.io/Barnens-Plugg/art/boss/brakbjorren.webp (bossens färger och tema)

```
A legendary relic dropped by the defeated boss in the attached image (Bråkbjörnens guldkvart): a perfect quarter slice of a giant golden honey cake turned into solid gold, with glowing fraction marks (¼) on its crust and a drop of shining honey. Epic treasure feel: rich gold and gem details, a strong glowing magical aura in the boss's colours, small floating light sparks around it, dramatic rim light. One single object, centered, three-quarter view, transparent background, no text, child-friendly and wondrous rather than scary.
```

### `relic-monster-relik.png` — 1024×1024

Referens: https://boboax.github.io/Barnens-Plugg/art/boss/monsterormen.webp (bossens färger och tema)

```
A legendary relic dropped by the defeated boss in the attached image (Mönsterormens skimrande fjäll): an iridescent serpent scale whose colours repeat in an endless glowing spiral pattern (green, teal, violet), set in a delicate silver frame like a pendant. Epic treasure feel: rich gold and gem details, a strong glowing magical aura in the boss's colours, small floating light sparks around it, dramatic rim light. One single object, centered, three-quarter view, transparent background, no text, child-friendly and wondrous rather than scary.
```

### `relic-former-relik.png` — 1024×1024

Referens: https://boboax.github.io/Barnens-Plugg/art/boss/stenjatten.webp (bossens färger och tema)

```
A legendary relic dropped by the defeated boss in the attached image (Stenjätten Kants prism): an ancient crystal prism with perfect geometric facets (triangle, square, hexagon) splitting light into a small rainbow, resting on a carved runestone base. Epic treasure feel: rich gold and gem details, a strong glowing magical aura in the boss's colours, small floating light sparks around it, dramatic rim light. One single object, centered, three-quarter view, transparent background, no text, child-friendly and wondrous rather than scary.
```

### `relic-diagram-relik.png` — 1024×1024

Referens: https://boboax.github.io/Barnens-Plugg/art/boss/plottrig.webp (bossens färger och tema)

```
A legendary relic dropped by the defeated boss in the attached image (Plottrigs kartkompass): an ornate brass explorer compass whose glass face shows a tiny glowing bar chart instead of a needle, with ink-blue tentacle-shaped filigree around the rim. Epic treasure feel: rich gold and gem details, a strong glowing magical aura in the boss's colours, small floating light sparks around it, dramatic rim light. One single object, centered, three-quarter view, transparent background, no text, child-friendly and wondrous rather than scary.
```

### `relic-samband-relik.png` — 1024×1024

Referens: https://boboax.github.io/Barnens-Plugg/art/boss/procentspoket.webp (bossens färger och tema)

```
A legendary relic dropped by the defeated boss in the attached image (Procentspökets hundraprocentiga sigill): a translucent ghost-blue crystal seal shaped like a perfect circle with a glowing 100% engraved in the middle, a soft ghostly mist swirling around it. Epic treasure feel: rich gold and gem details, a strong glowing magical aura in the boss's colours, small floating light sparks around it, dramatic rim light. One single object, centered, three-quarter view, transparent background, no text, child-friendly and wondrous rather than scary.
```

## Kvällslägret · Vännernas lya (1)

Vännerna bor i en mysig lya tills barnet köper husdjurstältet; då flyttar
de in i tältet. Lyan är en målad bakgrund (inte transparent).

### `pet-den-interior.png` — 1536×1024 (liggande, ogenomskinlig)

Referens: https://boboax.github.io/Barnens-Plugg/art/camp/pet-tent-interior-v1.webp och https://boboax.github.io/Barnens-Plugg/art/camp/evening-camp.webp

```
A cosy hollow under the roots of a huge old tree at the edge of the evening camp, seen from inside at the animals' eye level: soft moss floor, curling roots forming the walls and ceiling, a few fireflies and tiny glowing mushrooms, warm campfire light spilling in through the opening on the left and the lake under moonlight visible outside. Four natural nesting spots on the floor (two in the back, two in the front, left and right) where small pets could sleep. Same painterly style, palette and lighting as the attached camp images. No animals, no people, no text. Opaque background (this is a backdrop).
```

## Etapp 2 · Frog: stadier

### `woodland-frog-stage-1.png` — 1024×1024

Referens: https://boboax.github.io/Barnens-Plugg/art/camp/woodland-frog-poster-v1.webp

```
The same a friendly green frog with orange spots, big amber eyes and a red leaf-shaped scarf with a small leaf pin as in the attached reference, shown as a newborn baby: much smaller, very round, oversized head and eyes, short limbs, extra soft and cute; accessories tiny or just a hint of them. Sitting, facing slightly to the right, happy and gentle expression.
```

### `woodland-frog-stage-1-sleep.png` — 1024×1024

Referens: https://boboax.github.io/Barnens-Plugg/art/camp/woodland-frog-poster-v1.webp

```
The same a friendly green frog with orange spots, big amber eyes and a red leaf-shaped scarf with a small leaf pin as in the attached reference, shown as a newborn baby: much smaller, very round, oversized head and eyes, short limbs, extra soft and cute; accessories tiny or just a hint of them. Curled up asleep, eyes peacefully closed, cosy and calm. Same size and proportions as the awake version of this stage.
```

### `woodland-frog-stage-2.png` — 1024×1024

Referens: https://boboax.github.io/Barnens-Plugg/art/camp/woodland-frog-poster-v1.webp

```
The same a friendly green frog with orange spots, big amber eyes and a red leaf-shaped scarf with a small leaf pin as in the attached reference, shown as a young child: a bit smaller and rounder than the reference, playful and curious, same accessories. Sitting, facing slightly to the right, happy and gentle expression.
```

### `woodland-frog-stage-2-sleep.png` — 1024×1024

Referens: https://boboax.github.io/Barnens-Plugg/art/camp/woodland-frog-poster-v1.webp

```
The same a friendly green frog with orange spots, big amber eyes and a red leaf-shaped scarf with a small leaf pin as in the attached reference, shown as a young child: a bit smaller and rounder than the reference, playful and curious, same accessories. Curled up asleep, eyes peacefully closed, cosy and calm. Same size and proportions as the awake version of this stage.
```

### `woodland-frog-stage-4.png` — 1024×1024

Referens: https://boboax.github.io/Barnens-Plugg/art/camp/woodland-frog-poster-v1.webp

```
The same a friendly green frog with orange spots, big amber eyes and a red leaf-shaped scarf with a small leaf pin as in the attached reference, shown as a grown, confident companion: same size or slightly larger than the reference, proud calm pose, same markings and accessories, plus ONE small special detail: a tiny glowing lantern hanging from its scarf. Not a different animal. Sitting, facing slightly to the right, happy and gentle expression.
```

### `woodland-frog-stage-4-sleep.png` — 1024×1024

Referens: https://boboax.github.io/Barnens-Plugg/art/camp/woodland-frog-poster-v1.webp

```
The same a friendly green frog with orange spots, big amber eyes and a red leaf-shaped scarf with a small leaf pin as in the attached reference, shown as a grown, confident companion: same size or slightly larger than the reference, proud calm pose, same markings and accessories, plus ONE small special detail: a tiny glowing lantern hanging from its scarf. Not a different animal. Curled up asleep, eyes peacefully closed, cosy and calm. Same size and proportions as the awake version of this stage.
```

## Etapp 2 · Fox: stadier

### `dune-fox-stage-1.png` — 1024×1024

Referens: https://boboax.github.io/Barnens-Plugg/art/camp/dune-fox-poster-v1.webp

```
The same a sandy fennec fox with very large ears, a fluffy tail, a teal diamond mark on its forehead and a teal bandana with golden tassels as in the attached reference, shown as a newborn baby: much smaller, very round, oversized head and eyes, short limbs, extra soft and cute; accessories tiny or just a hint of them. Sitting, facing slightly to the right, happy and gentle expression.
```

### `dune-fox-stage-1-sleep.png` — 1024×1024

Referens: https://boboax.github.io/Barnens-Plugg/art/camp/dune-fox-poster-v1.webp

```
The same a sandy fennec fox with very large ears, a fluffy tail, a teal diamond mark on its forehead and a teal bandana with golden tassels as in the attached reference, shown as a newborn baby: much smaller, very round, oversized head and eyes, short limbs, extra soft and cute; accessories tiny or just a hint of them. Curled up asleep, eyes peacefully closed, cosy and calm. Same size and proportions as the awake version of this stage.
```

### `dune-fox-stage-2.png` — 1024×1024

Referens: https://boboax.github.io/Barnens-Plugg/art/camp/dune-fox-poster-v1.webp

```
The same a sandy fennec fox with very large ears, a fluffy tail, a teal diamond mark on its forehead and a teal bandana with golden tassels as in the attached reference, shown as a young child: a bit smaller and rounder than the reference, playful and curious, same accessories. Sitting, facing slightly to the right, happy and gentle expression.
```

### `dune-fox-stage-2-sleep.png` — 1024×1024

Referens: https://boboax.github.io/Barnens-Plugg/art/camp/dune-fox-poster-v1.webp

```
The same a sandy fennec fox with very large ears, a fluffy tail, a teal diamond mark on its forehead and a teal bandana with golden tassels as in the attached reference, shown as a young child: a bit smaller and rounder than the reference, playful and curious, same accessories. Curled up asleep, eyes peacefully closed, cosy and calm. Same size and proportions as the awake version of this stage.
```

### `dune-fox-stage-4.png` — 1024×1024

Referens: https://boboax.github.io/Barnens-Plugg/art/camp/dune-fox-poster-v1.webp

```
The same a sandy fennec fox with very large ears, a fluffy tail, a teal diamond mark on its forehead and a teal bandana with golden tassels as in the attached reference, shown as a grown, confident companion: same size or slightly larger than the reference, proud calm pose, same markings and accessories, plus ONE small special detail: a small golden star charm on its bandana and a golden trim on the bandana. Not a different animal. Sitting, facing slightly to the right, happy and gentle expression.
```

### `dune-fox-stage-4-sleep.png` — 1024×1024

Referens: https://boboax.github.io/Barnens-Plugg/art/camp/dune-fox-poster-v1.webp

```
The same a sandy fennec fox with very large ears, a fluffy tail, a teal diamond mark on its forehead and a teal bandana with golden tassels as in the attached reference, shown as a grown, confident companion: same size or slightly larger than the reference, proud calm pose, same markings and accessories, plus ONE small special detail: a small golden star charm on its bandana and a golden trim on the bandana. Not a different animal. Curled up asleep, eyes peacefully closed, cosy and calm. Same size and proportions as the awake version of this stage.
```

## Etapp 2 · Axolotl: stadier

### `reef-axolotl-stage-1.png` — 1024×1024

Referens: https://boboax.github.io/Barnens-Plugg/art/camp/reef-axolotl-poster-v1.webp

```
The same a turquoise axolotl with glowing light-blue speckles, coral-pink frilly gills and a pale belly as in the attached reference, shown as a newborn baby: much smaller, very round, oversized head and eyes, short limbs, extra soft and cute; accessories tiny or just a hint of them. Sitting, facing slightly to the right, happy and gentle expression.
```

### `reef-axolotl-stage-1-sleep.png` — 1024×1024

Referens: https://boboax.github.io/Barnens-Plugg/art/camp/reef-axolotl-poster-v1.webp

```
The same a turquoise axolotl with glowing light-blue speckles, coral-pink frilly gills and a pale belly as in the attached reference, shown as a newborn baby: much smaller, very round, oversized head and eyes, short limbs, extra soft and cute; accessories tiny or just a hint of them. Curled up asleep, eyes peacefully closed, cosy and calm. Same size and proportions as the awake version of this stage.
```

### `reef-axolotl-stage-2.png` — 1024×1024

Referens: https://boboax.github.io/Barnens-Plugg/art/camp/reef-axolotl-poster-v1.webp

```
The same a turquoise axolotl with glowing light-blue speckles, coral-pink frilly gills and a pale belly as in the attached reference, shown as a young child: a bit smaller and rounder than the reference, playful and curious, same accessories. Sitting, facing slightly to the right, happy and gentle expression.
```

### `reef-axolotl-stage-2-sleep.png` — 1024×1024

Referens: https://boboax.github.io/Barnens-Plugg/art/camp/reef-axolotl-poster-v1.webp

```
The same a turquoise axolotl with glowing light-blue speckles, coral-pink frilly gills and a pale belly as in the attached reference, shown as a young child: a bit smaller and rounder than the reference, playful and curious, same accessories. Curled up asleep, eyes peacefully closed, cosy and calm. Same size and proportions as the awake version of this stage.
```

### `reef-axolotl-stage-4.png` — 1024×1024

Referens: https://boboax.github.io/Barnens-Plugg/art/camp/reef-axolotl-poster-v1.webp

```
The same a turquoise axolotl with glowing light-blue speckles, coral-pink frilly gills and a pale belly as in the attached reference, shown as a grown, confident companion: same size or slightly larger than the reference, proud calm pose, same markings and accessories, plus ONE small special detail: a small necklace with one softly glowing pearl. Not a different animal. Sitting, facing slightly to the right, happy and gentle expression.
```

### `reef-axolotl-stage-4-sleep.png` — 1024×1024

Referens: https://boboax.github.io/Barnens-Plugg/art/camp/reef-axolotl-poster-v1.webp

```
The same a turquoise axolotl with glowing light-blue speckles, coral-pink frilly gills and a pale belly as in the attached reference, shown as a grown, confident companion: same size or slightly larger than the reference, proud calm pose, same markings and accessories, plus ONE small special detail: a small necklace with one softly glowing pearl. Not a different animal. Curled up asleep, eyes peacefully closed, cosy and calm. Same size and proportions as the awake version of this stage.
```

## Etapp 2 · Dragon: stadier

### `crystal-dragon-stage-1.png` — 1024×1024

Referens: https://raw.githubusercontent.com/Boboax/Barnens-Plugg/feature/character-battle-prototype/public/art/camp/crystal-dragon-poster-v3.webp

```
The same a small lilac crystal dragon with violet crystal horns and spikes, amber eyes, small wings and a curled tail as in the attached reference, shown as a newborn baby: much smaller, very round, oversized head and eyes, short limbs, extra soft and cute; accessories tiny or just a hint of them. Sitting, facing slightly to the right, happy and gentle expression.
```

### `crystal-dragon-stage-1-sleep.png` — 1024×1024

Referens: https://raw.githubusercontent.com/Boboax/Barnens-Plugg/feature/character-battle-prototype/public/art/camp/crystal-dragon-poster-v3.webp

```
The same a small lilac crystal dragon with violet crystal horns and spikes, amber eyes, small wings and a curled tail as in the attached reference, shown as a newborn baby: much smaller, very round, oversized head and eyes, short limbs, extra soft and cute; accessories tiny or just a hint of them. Curled up asleep, eyes peacefully closed, cosy and calm. Same size and proportions as the awake version of this stage.
```

### `crystal-dragon-stage-2.png` — 1024×1024

Referens: https://raw.githubusercontent.com/Boboax/Barnens-Plugg/feature/character-battle-prototype/public/art/camp/crystal-dragon-poster-v3.webp

```
The same a small lilac crystal dragon with violet crystal horns and spikes, amber eyes, small wings and a curled tail as in the attached reference, shown as a young child: a bit smaller and rounder than the reference, playful and curious, same accessories. Sitting, facing slightly to the right, happy and gentle expression.
```

### `crystal-dragon-stage-2-sleep.png` — 1024×1024

Referens: https://raw.githubusercontent.com/Boboax/Barnens-Plugg/feature/character-battle-prototype/public/art/camp/crystal-dragon-poster-v3.webp

```
The same a small lilac crystal dragon with violet crystal horns and spikes, amber eyes, small wings and a curled tail as in the attached reference, shown as a young child: a bit smaller and rounder than the reference, playful and curious, same accessories. Curled up asleep, eyes peacefully closed, cosy and calm. Same size and proportions as the awake version of this stage.
```

### `crystal-dragon-stage-4.png` — 1024×1024

Referens: https://raw.githubusercontent.com/Boboax/Barnens-Plugg/feature/character-battle-prototype/public/art/camp/crystal-dragon-poster-v3.webp

```
The same a small lilac crystal dragon with violet crystal horns and spikes, amber eyes, small wings and a curled tail as in the attached reference, shown as a grown, confident companion: same size or slightly larger than the reference, proud calm pose, same markings and accessories, plus ONE small special detail: a tiny sparkling crystal crown and faint glitter on its wings. Not a different animal. Sitting, facing slightly to the right, happy and gentle expression.
```

### `crystal-dragon-stage-4-sleep.png` — 1024×1024

Referens: https://raw.githubusercontent.com/Boboax/Barnens-Plugg/feature/character-battle-prototype/public/art/camp/crystal-dragon-poster-v3.webp

```
The same a small lilac crystal dragon with violet crystal horns and spikes, amber eyes, small wings and a curled tail as in the attached reference, shown as a grown, confident companion: same size or slightly larger than the reference, proud calm pose, same markings and accessories, plus ONE small special detail: a tiny sparkling crystal crown and faint glitter on its wings. Not a different animal. Curled up asleep, eyes peacefully closed, cosy and calm. Same size and proportions as the awake version of this stage.
```

## Tillägg (okt 2026) · Lyans lekscen (5)

Lyan är nu en lekscen där barnet leker direkt med vännen. Fem saker i rummet
ritas i dag enkelt i appen (emoji och CSS) och ska bytas mot målade bilder.
Leverera dem på samma sätt som ovan: `leverans/` på grenen `grafik/leverans`,
PNG med transparent bakgrund. Alla fem står på lyans mossgolv och ska passa
i ljuset från https://boboax.github.io/Barnens-Plugg/art/camp/pet-den-interior-v1.webp
(varmt lägereldsljus från vänster, svagt månljus från höger).

### `den-hide-mushroom.png` — 1024×1024

Ett av tittutens tre gömställen. En vän (stor som en liten groda) ska kunna
gömma sig bakom det så att bara öronen sticker upp.

```
A cluster of two or three plump, friendly forest mushrooms with soft red-brown caps and cream spots, growing from a small tuft of moss — big enough for a small animal to hide behind. Seen from the front at a small animal's eye level. Same painterly style, palette and lighting as the attached den image. Transparent background, no ground shadow, no text, no animals.
```

### `den-hide-bush.png` — 1024×1024

```
A small round fern-and-leaf bush with lush green fronds and a few tiny glowing flowers, dense enough for a small animal to hide behind. Seen from the front at a small animal's eye level. Same painterly style, palette and lighting as the attached den image. Transparent background, no ground shadow, no text, no animals.
```

### `den-hide-log.png` — 1024×1024

```
A short, mossy hollow log lying on its side with a few tiny mushrooms and ivy on top, big enough for a small animal to hide behind. Seen from the front at a small animal's eye level. Same painterly style, palette and lighting as the attached den image. Transparent background, no ground shadow, no text, no animals.
```

### `den-toy-ball.png` — 512×512

Bollen barnet kastar och vännen hämtar. Ska läsas tydligt även liten (ca 60 px).

```
A soft, slightly worn play ball for a small pet, woven from leather patches in warm orange and cream with simple stitched seams, round and friendly. Centered, whole ball visible. Same painterly style and lighting as the attached den image. Transparent background, no ground shadow, no text.
```

### `den-treat-bowl.png` — 768×512 (liggande)

Godbitsskålen. Godbitarna själva läggs på av appen — skålen ska vara TOM.

```
An empty, shallow carved wooden bowl with a soft rim, warm honey-brown wood with a few carved leaf patterns, seen slightly from above so the inside is visible. Empty — no food in it. Same painterly style and lighting as the attached den image. Transparent background, no ground shadow, no text.
```

## Tillägg 2 (okt 2026) · Godis och ikoner i lyan (15)

Lyan ritar i dag godiset och sina knappar som emoji. De ska bytas mot målade
bilder i samma stil som lyan, bollen och godisskålen. Leverera som förut:
`leverans/` på grenen `grafik/leverans`, PNG med transparent bakgrund, exakt
dessa filnamn. Referenser för stil och ljus:
- Lyan: https://boboax.github.io/Barnens-Plugg/art/camp/pet-den-interior-v1.webp
- Godisskålen: https://boboax.github.io/Barnens-Plugg/art/camp/den-treat-bowl.webp
- Bollen: https://boboax.github.io/Barnens-Plugg/art/camp/den-toy-ball.webp

**Gemensamt för all mat:** en enda godbit per bild, centrerad, liten nog att
ligga i godisskålen och tydlig även när den visas i 40 px. Aptitlig, varm och
lekfull — som ett godis i en barnbok. Inga djur, ingen text, ingen tallrik.

### Grundgodiset (gratis, alltid i skålen)

### `treat-blueberry.png` — 512×512
```
Three plump, glossy wild blueberries with a tiny green leaf, grouped together as one small treat. Soft painterly digital fantasy illustration, warm campfire light from the left and faint cool moonlight from the right, matching the attached den image. Centered, transparent background, no ground shadow, no text.
```

### `treat-strawberry.png` — 512×512
```
One ripe, juicy wild strawberry with a fresh green top and tiny golden seeds. Soft painterly digital fantasy illustration, warm campfire light from the left and faint cool moonlight from the right, matching the attached den image. Centered, transparent background, no ground shadow, no text.
```

### `treat-shrimp.png` — 512×512
```
One small, cute curled pink shrimp treat, friendly and appetising (not realistic or scary), with a soft sheen. Soft painterly digital fantasy illustration, warm campfire light from the left and faint cool moonlight from the right, matching the attached den image. Centered, transparent background, no ground shadow, no text.
```

### Favoritgodiset (köps i handelsboden)

### `treat-frog-fly-cake.png` — 512×512
Grodans favorit. Ska vara gulligt och roligt, inte äckligt.
```
A small round crunchy honey-coloured biscuit shaped like a cute cartoon fly with tiny translucent sugar-glass wings and two little candy eyes — a playful frog treat, charming and appetising, not a real insect. Soft painterly digital fantasy illustration matching the attached den image. Centered, transparent background, no ground shadow, no text.
```

### `treat-frog-lily-nectar.png` — 512×512
```
A tiny pink water-lily flower used as a cup, filled with glowing golden nectar, with a single dewdrop on one petal. Soft painterly digital fantasy illustration matching the attached den image. Centered, transparent background, no ground shadow, no text.
```

### `treat-fox-honey-cake.png` — 512×512
```
A small round golden honey cake with honey dripping down its sides and a little wooden honey dipper resting against it. Soft painterly digital fantasy illustration matching the attached den image. Centered, transparent background, no ground shadow, no text.
```

### `treat-fox-cactus-fig.png` — 512×512
```
A ripe desert cactus fig cut in half, showing the juicy magenta inside with tiny seeds — smooth skin, no spines. Soft painterly digital fantasy illustration matching the attached den image. Centered, transparent background, no ground shadow, no text.
```

### `treat-axolotl-mussel.png` — 512×512
```
A small open seashell shaped like a mussel holding a round, glossy pearl-like candy, with a few tiny water droplets. Soft painterly digital fantasy illustration matching the attached den image. Centered, transparent background, no ground shadow, no text.
```

### `treat-axolotl-bubble-jelly.png` — 512×512
```
A wobbly, translucent turquoise jelly treat with little bubbles trapped inside and two small bubbles floating above it. Soft painterly digital fantasy illustration matching the attached den image. Centered, transparent background, no ground shadow, no text.
```

### Ikoner för lyans knappar

**Gemensamt för ikonerna:** målade spelikoner som står på lyans golv eller
sitter på en pergamentknapp. En tydlig, enkel form som barn känner igen i
44–60 px. Mjuk, varm målarstil som lyan. Ingen text, ingen ram, ingen platta
bakom — appen lägger själv en ljus platta under.

### `icon-peekaboo.png` — 512×512
Knappen som startar tittut.
```
A small leafy fern bush with two big curious cartoon eyes peeking out between the leaves — a playful hide-and-seek symbol for children. Simple bold readable shape, soft painterly game-icon style matching the attached den image. Centered, transparent background, no text, no frame.
```

### `icon-lantern-lit.png` — 512×512
Godnatt-knappen (lyktan är tänd — tryck för att släcka och säga godnatt).
```
A small old wooden camp lantern with a warm glowing flame inside and a soft golden halo. Simple bold readable shape, soft painterly game-icon style matching the attached den image. Centered, transparent background, no text, no frame.
```

### `icon-lantern-moon.png` — 512×512
Väck-knappen (natt — tryck för att väcka vännen).
```
The same small wooden camp lantern, now dark, with a sleepy crescent moon and two tiny stars floating above it. Simple bold readable shape, soft painterly game-icon style matching the attached den image. Centered, transparent background, no text, no frame.
```

### `icon-memory-book.png` — 512×512
Minnesboken om vännen.
```
A small cosy leather-bound book with a pressed leaf and a little paw print on the cover and a ribbon bookmark. Simple bold readable shape, soft painterly game-icon style matching the attached den image. Centered, transparent background, no text, no frame.
```

### `icon-sound-on.png` — 512×512
```
A small brass hand bell ringing, with three soft curved sound lines next to it. Simple bold readable shape, soft painterly game-icon style matching the attached den image. Centered, transparent background, no text, no frame.
```

### `icon-sound-off.png` — 512×512
```
The same small brass hand bell, still and quiet, with a soft sleepy "shh" feeling: a tiny cloth wrapped around the clapper, no sound lines. Simple bold readable shape, soft painterly game-icon style matching the attached den image. Centered, transparent background, no text, no frame.
```


## Tillägg 3 (okt 2026) · Vännerna åldras och blir mäktigare (24)

De förra stadiebilderna (`*-stage-*.png`) blev nästan samma djur i olika
storlek, så i appen ser det ut som att vännen bara skalas upp. Nu ska varje
vän **åldras och bli mäktigare**: ungen är en riktig bebis, den unga en
tonåring, och följeslagaren en äldre, stark och vis väktare med egna
detaljer. Samma färger, mönster och accessoarer genom alla stadier — men
tydligt olika ålder och kraft. **Ingen kopia i annan storlek.**

Stadie 3 ("vuxen") finns redan och är referensbilden för varje art.

**Storlek i bilden (viktigt):** alla bilder 1024×1024 med samma zoom, fötterna
nära nederkanten. Figuren fyller ungefär **45 % av höjden som unge, 65 % som
ung och 95 % som följeslagare** — då syns tillväxten utan att appen behöver
skala bilderna. Sovbilden har samma storlek som vakenbilden i samma stadie.

**Leverans:** `leverans/` på grenen `grafik/leverans`, PNG med transparent
bakgrund, exakt dessa filnamn (nya namn — de gamla `*-stage-*` ska inte
skrivas över). Stil och ljus enligt "Stil (gäller alla bilder)" ovan.


### Skogsgrodan

Referens (stadie 3): https://boboax.github.io/Barnens-Plugg/art/camp/woodland-frog-poster-v1.webp

#### `woodland-frog-age-1.png` — 1024×1024
```
The same cheerful green woodland frog with yellow spots, big amber eyes and a red leaf scarf as in the attached reference, now shown as a tiny, round froglet just out of the pond: oversized head and huge eyes, very short stubby legs, a little leftover tadpole tail, softer and paler green skin, only a few faint spots, a tiny red leaf tied around its neck like a bib. Wobbly and clumsy, utterly cute. Sitting, facing slightly to the right, happy and gentle expression. The figure fills about 45 % of the image height, feet near the bottom edge. Transparent background, no ground shadow, no text.
```

#### `woodland-frog-age-1-sleep.png` — 1024×1024
```
The same cheerful green woodland frog with yellow spots, big amber eyes and a red leaf scarf as in the attached reference, now shown as a tiny, round froglet just out of the pond: oversized head and huge eyes, very short stubby legs, a little leftover tadpole tail, softer and paler green skin, only a few faint spots, a tiny red leaf tied around its neck like a bib. Wobbly and clumsy, utterly cute. Curled up asleep, eyes peacefully closed, cosy and calm — same age, size and details as the awake version. The figure fills about 45 % of the image height, feet near the bottom edge. Transparent background, no ground shadow, no text.
```

#### `woodland-frog-age-2.png` — 1024×1024
```
The same cheerful green woodland frog with yellow spots, big amber eyes and a red leaf scarf as in the attached reference, now shown as a lanky young frog, a teenager: long thin legs it has not grown into yet, spots getting darker, the red leaf scarf now properly tied, a small acorn-cap backpack, an eager adventurous pose ready to jump. Standing, facing slightly to the right, happy and gentle expression. The figure fills about 65 % of the image height, feet near the bottom edge. Transparent background, no ground shadow, no text.
```

#### `woodland-frog-age-2-sleep.png` — 1024×1024
```
The same cheerful green woodland frog with yellow spots, big amber eyes and a red leaf scarf as in the attached reference, now shown as a lanky young frog, a teenager: long thin legs it has not grown into yet, spots getting darker, the red leaf scarf now properly tied, a small acorn-cap backpack, an eager adventurous pose ready to jump. Curled up asleep, eyes peacefully closed, cosy and calm — same age, size and details as the awake version. The figure fills about 65 % of the image height, feet near the bottom edge. Transparent background, no ground shadow, no text.
```

#### `woodland-frog-age-4.png` — 1024×1024
```
The same cheerful green woodland frog with yellow spots, big amber eyes and a red leaf scarf as in the attached reference, now shown as an older, strong and wise forest guardian frog: broad shoulders and powerful legs, calm wise eyes, a short moss-and-fern cloak over its back fastened with a wooden clasp, faint glowing green leaf-runes along its back, a slim walking staff with a tiny lantern, an ornate version of the red leaf scarf. Heroic and confident, still warm and friendly — never scary. Standing tall, facing slightly to the right, happy and gentle expression. The figure fills about 95 % of the image height, feet near the bottom edge. Transparent background, no ground shadow, no text.
```

#### `woodland-frog-age-4-sleep.png` — 1024×1024
```
The same cheerful green woodland frog with yellow spots, big amber eyes and a red leaf scarf as in the attached reference, now shown as an older, strong and wise forest guardian frog: broad shoulders and powerful legs, calm wise eyes, a short moss-and-fern cloak over its back fastened with a wooden clasp, faint glowing green leaf-runes along its back, a slim walking staff with a tiny lantern, an ornate version of the red leaf scarf. Heroic and confident, still warm and friendly — never scary. Curled up asleep, eyes peacefully closed, cosy and calm — same age, size and details as the awake version. The figure fills about 95 % of the image height, feet near the bottom edge. Transparent background, no ground shadow, no text.
```


### Sandräven

Referens (stadie 3): https://boboax.github.io/Barnens-Plugg/art/camp/dune-fox-poster-v1.webp

#### `dune-fox-age-1.png` — 1024×1024
```
The same sandy fennec fox with huge ears, cream fur and a teal bandana with a golden bell as in the attached reference, now shown as a tiny fluffy fox kit: a round ball of fluff, enormous floppy ears it cannot hold up yet, big shiny eyes, short stubby legs, a tiny teal bandana. Stumbling and adorable. Sitting, facing slightly to the right, happy and gentle expression. The figure fills about 45 % of the image height, feet near the bottom edge. Transparent background, no ground shadow, no text.
```

#### `dune-fox-age-1-sleep.png` — 1024×1024
```
The same sandy fennec fox with huge ears, cream fur and a teal bandana with a golden bell as in the attached reference, now shown as a tiny fluffy fox kit: a round ball of fluff, enormous floppy ears it cannot hold up yet, big shiny eyes, short stubby legs, a tiny teal bandana. Stumbling and adorable. Curled up asleep, eyes peacefully closed, cosy and calm — same age, size and details as the awake version. The figure fills about 45 % of the image height, feet near the bottom edge. Transparent background, no ground shadow, no text.
```

#### `dune-fox-age-2.png` — 1024×1024
```
The same sandy fennec fox with huge ears, cream fur and a teal bandana with a golden bell as in the attached reference, now shown as a slim young fox: ears now standing tall, longer legs and a longer tail, the teal bandana with the golden bell, alert and curious, mid-trot. Standing, facing slightly to the right, happy and gentle expression. The figure fills about 65 % of the image height, feet near the bottom edge. Transparent background, no ground shadow, no text.
```

#### `dune-fox-age-2-sleep.png` — 1024×1024
```
The same sandy fennec fox with huge ears, cream fur and a teal bandana with a golden bell as in the attached reference, now shown as a slim young fox: ears now standing tall, longer legs and a longer tail, the teal bandana with the golden bell, alert and curious, mid-trot. Curled up asleep, eyes peacefully closed, cosy and calm — same age, size and details as the awake version. The figure fills about 65 % of the image height, feet near the bottom edge. Transparent background, no ground shadow, no text.
```

#### `dune-fox-age-4.png` — 1024×1024
```
The same sandy fennec fox with huge ears, cream fur and a teal bandana with a golden bell as in the attached reference, now shown as a majestic desert guardian fox: a thick, flowing ruff of fur around the neck like a mane, a long elegant tail with a glowing golden tip, sun-gold markings on the forehead and paws that softly shine, desert jewellery (a golden circlet with a small teal gem), a proud noble stance. Powerful and wise, still warm and friendly — never scary. Standing tall, facing slightly to the right, happy and gentle expression. The figure fills about 95 % of the image height, feet near the bottom edge. Transparent background, no ground shadow, no text.
```

#### `dune-fox-age-4-sleep.png` — 1024×1024
```
The same sandy fennec fox with huge ears, cream fur and a teal bandana with a golden bell as in the attached reference, now shown as a majestic desert guardian fox: a thick, flowing ruff of fur around the neck like a mane, a long elegant tail with a glowing golden tip, sun-gold markings on the forehead and paws that softly shine, desert jewellery (a golden circlet with a small teal gem), a proud noble stance. Powerful and wise, still warm and friendly — never scary. Curled up asleep, eyes peacefully closed, cosy and calm — same age, size and details as the awake version. The figure fills about 95 % of the image height, feet near the bottom edge. Transparent background, no ground shadow, no text.
```


### Axolotln

Referens (stadie 3): https://boboax.github.io/Barnens-Plugg/art/camp/reef-axolotl-poster-v1.webp

#### `reef-axolotl-age-1.png` — 1024×1024
```
The same turquoise axolotl with coral-pink frilly gills and tiny white spots as in the attached reference, now shown as a tiny baby axolotl: small and slightly translucent, very short stubby gill-buds, a big round head with huge eyes, tiny legs, a short tail. Bubbly and adorable. Sitting, facing slightly to the right, happy and gentle expression. The figure fills about 45 % of the image height, feet near the bottom edge. Transparent background, no ground shadow, no text.
```

#### `reef-axolotl-age-1-sleep.png` — 1024×1024
```
The same turquoise axolotl with coral-pink frilly gills and tiny white spots as in the attached reference, now shown as a tiny baby axolotl: small and slightly translucent, very short stubby gill-buds, a big round head with huge eyes, tiny legs, a short tail. Bubbly and adorable. Curled up asleep, eyes peacefully closed, cosy and calm — same age, size and details as the awake version. The figure fills about 45 % of the image height, feet near the bottom edge. Transparent background, no ground shadow, no text.
```

#### `reef-axolotl-age-2.png` — 1024×1024
```
The same turquoise axolotl with coral-pink frilly gills and tiny white spots as in the attached reference, now shown as a young axolotl: longer body and tail, gills fuller and fluffier, spots more visible, a small pearl on a string, playful pose. Standing, facing slightly to the right, happy and gentle expression. The figure fills about 65 % of the image height, feet near the bottom edge. Transparent background, no ground shadow, no text.
```

#### `reef-axolotl-age-2-sleep.png` — 1024×1024
```
The same turquoise axolotl with coral-pink frilly gills and tiny white spots as in the attached reference, now shown as a young axolotl: longer body and tail, gills fuller and fluffier, spots more visible, a small pearl on a string, playful pose. Curled up asleep, eyes peacefully closed, cosy and calm — same age, size and details as the awake version. The figure fills about 65 % of the image height, feet near the bottom edge. Transparent background, no ground shadow, no text.
```

#### `reef-axolotl-age-4.png` — 1024×1024
```
The same turquoise axolotl with coral-pink frilly gills and tiny white spots as in the attached reference, now shown as a grand reef guardian axolotl: large, feathery, softly glowing gills that look like a coral crown, bioluminescent spots that shine along its body, long flowing fins on the tail, a pearl necklace, a calm regal pose. Powerful and magical, still warm and friendly — never scary. Standing tall, facing slightly to the right, happy and gentle expression. The figure fills about 95 % of the image height, feet near the bottom edge. Transparent background, no ground shadow, no text.
```

#### `reef-axolotl-age-4-sleep.png` — 1024×1024
```
The same turquoise axolotl with coral-pink frilly gills and tiny white spots as in the attached reference, now shown as a grand reef guardian axolotl: large, feathery, softly glowing gills that look like a coral crown, bioluminescent spots that shine along its body, long flowing fins on the tail, a pearl necklace, a calm regal pose. Powerful and magical, still warm and friendly — never scary. Curled up asleep, eyes peacefully closed, cosy and calm — same age, size and details as the awake version. The figure fills about 95 % of the image height, feet near the bottom edge. Transparent background, no ground shadow, no text.
```


### Kristalldraken

Referens (stadie 3): https://raw.githubusercontent.com/Boboax/Barnens-Plugg/feature/etapp-2/public/art/camp/crystal-dragon-poster-v1.webp

#### `crystal-dragon-age-1.png` — 1024×1024
```
The same small lilac crystal dragon with violet crystal horns and spikes, amber eyes, small wings and a curled tail as in the attached reference, now shown as a newly hatched baby dragon still sitting in half of a sparkling crystal eggshell: round body, tiny nub horns, little stubby wings it cannot use yet, huge eyes, a short curled tail. Sleepy-cute. Sitting, facing slightly to the right, happy and gentle expression. The figure fills about 45 % of the image height, feet near the bottom edge. Transparent background, no ground shadow, no text.
```

#### `crystal-dragon-age-1-sleep.png` — 1024×1024
```
The same small lilac crystal dragon with violet crystal horns and spikes, amber eyes, small wings and a curled tail as in the attached reference, now shown as a newly hatched baby dragon still sitting in half of a sparkling crystal eggshell: round body, tiny nub horns, little stubby wings it cannot use yet, huge eyes, a short curled tail. Sleepy-cute. Curled up asleep, eyes peacefully closed, cosy and calm — same age, size and details as the awake version. The figure fills about 45 % of the image height, feet near the bottom edge. Transparent background, no ground shadow, no text.
```

#### `crystal-dragon-age-2.png` — 1024×1024
```
The same small lilac crystal dragon with violet crystal horns and spikes, amber eyes, small wings and a curled tail as in the attached reference, now shown as a young dragon: longer neck and tail, wings bigger but still a bit too small, crystal horns starting to grow, a few crystal spikes along the back, a playful, bouncy pose. Standing, facing slightly to the right, happy and gentle expression. The figure fills about 65 % of the image height, feet near the bottom edge. Transparent background, no ground shadow, no text.
```

#### `crystal-dragon-age-2-sleep.png` — 1024×1024
```
The same small lilac crystal dragon with violet crystal horns and spikes, amber eyes, small wings and a curled tail as in the attached reference, now shown as a young dragon: longer neck and tail, wings bigger but still a bit too small, crystal horns starting to grow, a few crystal spikes along the back, a playful, bouncy pose. Curled up asleep, eyes peacefully closed, cosy and calm — same age, size and details as the awake version. The figure fills about 65 % of the image height, feet near the bottom edge. Transparent background, no ground shadow, no text.
```

#### `crystal-dragon-age-4.png` — 1024×1024
```
The same small lilac crystal dragon with violet crystal horns and spikes, amber eyes, small wings and a curled tail as in the attached reference, now shown as a grand crystal dragon: big wings spread proudly, tall glowing crystal horns, shining crystal plates on chest and back like armour, a long elegant tail with a crystal tip, a regal confident pose with a soft violet glow and sparkles. Powerful and majestic, still warm and friendly — never scary. Standing tall, facing slightly to the right, happy and gentle expression. The figure fills about 95 % of the image height, feet near the bottom edge. Transparent background, no ground shadow, no text.
```

#### `crystal-dragon-age-4-sleep.png` — 1024×1024
```
The same small lilac crystal dragon with violet crystal horns and spikes, amber eyes, small wings and a curled tail as in the attached reference, now shown as a grand crystal dragon: big wings spread proudly, tall glowing crystal horns, shining crystal plates on chest and back like armour, a long elegant tail with a crystal tip, a regal confident pose with a soft violet glow and sparkles. Powerful and majestic, still warm and friendly — never scary. Curled up asleep, eyes peacefully closed, cosy and calm — same age, size and details as the awake version. The figure fills about 95 % of the image height, feet near the bottom edge. Transparent background, no ground shadow, no text.
```

## Tillägg 4 (okt 2026) · Rörelser för varje ålder (12)

Den vuxna vännen har en rörelseatlas med 16 bildrutor (blinkar, tittar,
puffar, myser) — se https://boboax.github.io/Barnens-Plugg/art/camp/woodland-frog-motion-v1.webp.
Unge, ung och följeslagare har i dag bara EN bild var och känns därför
stela. Leverera för varje ålder ett **poseark**: en bild med fyra poser i ett
2×2-rutnät. Appen bygger sedan rörelsen av poserna (blinkar, tittar åt
sidan, blir glad), på samma sätt som den vuxna.

**Förutsättning:** gör detta EFTER Tillägg 3 (`*-age-*.png`) och använd den
vakna åldersbilden som referens, så att djuret är exakt detsamma.

**Format:** `{art}-age-{1|2|4}-poses.png`, 2048×2048, transparent bakgrund,
fyra lika stora rutor (1024×1024 var). Djuret står på exakt samma plats och i
samma storlek i alla fyra rutor — fötterna på samma höjd, samma vinkel —
bara ansikte, huvud och lite av kroppen ändras. Ingen text, inga ramar eller
linjer mellan rutorna.

| Ruta | Pose |
|---|---|
| Uppe till vänster | Grundpose (samma som åldersbilden) |
| Uppe till höger | Blinkar — ögonen glatt stängda, i övrigt identisk |
| Nere till vänster | Tittar nyfiket åt sidan, huvudet lite vridet |
| Nere till höger | Glad — munnen öppen i ett leende, lite upprest |

Rörelsen ska passa åldern: ungen får gärna vara lite vinglig och klumpig
(öronen/gälarna åt olika håll), den unga pigg, följeslagaren lugn och värdig.

**Filer (12):**
`woodland-frog-age-1-poses.png`, `woodland-frog-age-2-poses.png`, `woodland-frog-age-4-poses.png`,
`dune-fox-age-1-poses.png`, `dune-fox-age-2-poses.png`, `dune-fox-age-4-poses.png`,
`reef-axolotl-age-1-poses.png`, `reef-axolotl-age-2-poses.png`, `reef-axolotl-age-4-poses.png`,
`crystal-dragon-age-1-poses.png`, `crystal-dragon-age-2-poses.png`, `crystal-dragon-age-4-poses.png`.

Prompt (byt art och ålder, och bifoga den vakna åldersbilden):
```
Using the attached image of this exact character at this exact age as the reference, create one 2048×2048 image divided into a 2×2 grid of four equal 1024×1024 cells with a transparent background and no lines between them. The character is identical in every cell — same size, same position, feet at the same height, same angle — only the face, head and a little of the body change: top-left the normal pose (same as the reference); top-right blinking with eyes happily closed, otherwise identical; bottom-left looking curiously to the side with the head slightly turned; bottom-right happy with an open-mouthed smile, standing a little taller. Match the character's age in how it moves (baby: slightly wobbly and clumsy; young: lively; guardian: calm and dignified). Same painterly style and lighting as the reference. No text, no frames.
```
