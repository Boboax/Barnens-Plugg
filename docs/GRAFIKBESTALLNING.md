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
