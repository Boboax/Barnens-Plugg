# Plan: läger, husdjur, strid och synk — från preview till `main`

Utgångspunkt: granskningen i `docs/GRANSKNING-PREVIEW-2026-10-09.md` av `feature/character-battle-prototype` (`58e3609`).
Målet är att få in ChatGPT:s arbete i `main` utan att bryta appens principer, med en
husdjursmodell som följer barnets egen resa och ett synkflöde som inte raderar något.

Planen är skriven så att den kan lämnas över rakt av till den som bygger. Varje etapp
har ett tydligt "klart när", och etapperna byggs i ordning på egna grenar från `main`.
Ingen etapp mergas förrän `npm run build`, `npm test` och ett iPad-test är gröna.

## Beslut som styr allt

1. **Lägrets data bor på barnet.** Alla föremål, husdjur, mantlar, vapen och mynt ligger i
   `child.petProgress`. `Household.petHome` tas bort. Då följer allt den befintliga
   krockregeln (nyaste barn vinner) och inget särskilt synk-arbete behövs för lägret.
2. **Husdjur följer milstolpar, inte världar.** Första vännen hittas i den värld barnet
   just tränat i. Fler vänner kommer vid milstolpar i barnets egen resa. Arten är ett
   val ur en liten pool, inte en per värld.
3. **Husdjuren växer** i stadier som räknas fram ur vad barnet behärskar (`child.skills`),
   aldrig ur sparad "nivå". Ett djur kan aldrig backa.
4. **Mynt ges för vanan, aldrig för rätt svar eller hastighet.** Ett avslutat pass per dag.
   Inget i butiken får kosta mer än ungefär en veckas träning. Skrivs in i PEDAGOGIK som
   en avgränsning av princip 3.
5. **Bilder i `public/` är produktionsbilder.** Webp, inga PNG-sekvenser, inga studier.
   Demo- och prototypmaterial lever i en egen mapp som inte byggs med appen.
6. **ChatGPT:s preview-gren mergas inte.** Den är referens. Kod och bilder plockas
   därifrån etapp för etapp.

## Etapp 0 — Bilder och demo ut ur produktionsbygget

Syfte: få ner offline-cachen från 33 MB till under 10 MB innan något annat mergas,
så att inget tungt hamnar i `main`-historiken.

- Inventera `public/art/` på preview-grenen: vad används av appen, vad används bara av
  `src/dev/*`, vad används inte alls (`crystal-dragon-idle-v1/v2`, `prototype-v2..v5`
  med flera).
- Konvertera bossarnas bildrutor (`prototype-v6..v12`, PNG) till webp i 2 varianter:
  en per bildruta eller en atlas per boss. Riktmärke: en boss ≤ 400 kB totalt.
- Flytta allt demo-material (`src/dev/`, `character-preview.html`, `pet-preview.html`,
  `full-preview.html`, `scripts/build-*-preview.mjs`, `vite.*-preview.config.ts`,
  komponenterna `BowMotionStudyV3`, `ModularHeroRig`, `ProductionHeroRigV4`,
  `CinematicAttackStudy`, `PrototypeBoss`, `CharacterFigure`, `ProductionPoseAnimatorV5`,
  `domain/character.ts`) till en separat gren `demo/` eller en mapp `demo/` utanför
  `src/`. Appen får inte importera därifrån.
- Lägg till en vaktregel: ett test som räknar storleken på `public/art` och faller över
  ett tak (till exempel 12 MB), så att detta inte växer tyst igen.
- Klart när: `npm run build` rapporterar precache under 10 MB och grenen innehåller
  bara bilder som appen refererar.

Vem: Claude (mekaniskt, men kräver noggrannhet med vad som refereras dynamiskt).

## Etapp 1 — Datamodell och migrering

Syfte: en modell som synkas rätt och går att underhålla.

- `child.petProgress` utökas med `items: CampItemInstance[]` (ägda föremål med
  placering). `Household.petHome` tas bort.
- Ett enda möbelsystem: `CAMP_CATALOG`. `FURNITURE`, `buyFurniture`, `equipFurniture`
  och legacy-konverteringen i `campItems()` tas bort. Priser bestäms en gång.
- Bumpa `PROFILE_SCHEMA_VERSION` till 2 och skriv migreringen i `storage/db.ts`:
  flytta eventuella `petHome.items` till rätt barn via `childId`, konvertera gammalt
  `pet` till `pets[0]`. (Inga barn har kört preview-grenen skarpt, så migreringen är
  mest en försäkring, men den kostar lite och skyddar exportfiler.)
- `changeCamp` skrivs om till läsbar kod med kommentarer på repots sätt. Samma regler
  som i dag: atomiska köp, idempotent `purchaseId`, inga köp utan lägertid.
- Lägertiden räknas i en `useRef` och sparas var 15:e sekund och vid utgång, inte
  varje sekund. `updatedAt` bumpas bara när något faktiskt ändras.
- Testerna i `camp.test.ts` och `pet-home.test.ts` skrivs om mot nya modellen.
  Synk-testet får ett fall: "föremål köpta på enhet A finns på enhet B efter merge".
- Klart när: alla tester gröna, ingen referens till `petHome` i koden, export/import
  av en profil med läger fungerar.

Vem: Claude Opus. Det här är etappen där arkitekturkunskap om repot betyder mest.

## Etapp 2 — Husdjur: start, milstolpar och tillväxt

Syfte: husdjuren berättar barnets egen resa.

**Första vännen**
- Hittas efter första avslutade passet. Berättelsen använder världen barnet just tränade
  i (`momentById(...).worldId`), oavsett art. Texten "En ny vän från {värld}" byggs
  från `worldById`, aldrig från artens fasta värld.
- Arten för första vännen: skogsgrodan för alla (den är neutral och färdig). Artens
  egna `world`-fält tas bort ur `PET_SPECIES`.

**Fler vänner vid milstolpar** (räknas ur `child.skills`, `conqueredYears`,
`conqueredWorlds`, `blixt`):
- Andra vännen: första årsväktaren besegrad.
- Tredje vännen: första världsbossen besegrad.
- Fjärde vännen: första blixten klarad.
- Ordningen på arter: fast lista (groda, räv, axolotl, drake). Inget slumpas.
- `encounterSpecies` sätts av motorn när milstolpen passeras; upptäckten visas i lägret
  precis som i dag. En oavslutad upptäckt sparas tills den görs.
- För barn som redan passerat milstolpar (tioåringen) ska upptäckterna komma en i taget
  vid nästa besök, inte alla på en gång.

**Tillväxt**
- Fyra stadier per djur: `unge`, `ung`, `vuxen`, `foljeslagare`. Stadiet är en ren
  funktion `petStage(child, pet)`:
  - Första vännen följer barnets totala resa: antal behärskade moment i barnets egen
    årskurs eller lägre (0–2 / 3–6 / 7–12 / 13+ som startvärden, justeras efter test).
  - Senare vänner följer den milstolpe de kom från (till exempel räven växer med
    antal erövrade år).
- Stadiet sparas aldrig. Räknas vid rendering. Kan därför aldrig backa så länge
  funktionen är monoton i behärskade moment (kalla handen tar aldrig bort `mastered`,
  så det håller).
- Visuellt: en bild per stadie och art, plus sovbild. Stadie 4 får en liten detalj i
  lägret (lykta, halsduk, glitter) i stället för ett helt nytt djur.
- Lägret visar en kort "{namn} har växt!"-ruta första gången ett nytt stadie nås
  (lagras som `seenStages` per djur, bara för att inte upprepa rutan).

**Butik och upplåsningar**
- Upplåsningar byter från fasta världar till barnets egna milstolpar: "första vännen",
  "två vänner", "första årsväktaren", "första världsbossen", "första blixten".
- Max-pris cirka 140 mynt (en vecka). Texten "Spara X mynt till" byts till neutral
  "Kostar X mynt".
- Tältet i lägret ritas bara om barnet äger "Husdjurstält". Annars en tom plats.

- Klart när: en FK-profil får sin groda "från Urtalens dal", en åk 4-profil med tre
  erövrade år ser tre vänner i rätt stadier, och inget i `skills` ändras av något i
  lägret (test).

Vem: Claude (kod). ChatGPT (bilder, se beställning nedan). Koden kan byggas före
bilderna med dagens bilder som platshållare för alla stadier.

## Etapp 3 — Striden

Syfte: tillbaka till bossen som huvudperson, med den nya grafiken.

- `BattleDuel` behålls som presentationslager men bossen får samma höjd som förr
  (240 px på iPad landskap) och hjälten samma höjd som bossen. Duellen tar arenans
  bredd.
- Hjälten får en vilopose (idle) för alla tre hjältar, inte bara profilbilden.
- Bossens pose-animation spelas även i vila (långsam loop av bildruta 0–1) så att den
  lever innan första svaret.
- Fördröjningen 1 260 ms gäller bara `kind === 'boss'`. Koll, väktare och diamant
  behåller 900 ms.
- Vapen och mantel från lägret syns på hjälten i striden (bara utseende).
- `WorldGiftChest` får `useDocumentBackground` som övriga mörka vyer.
- Klart när: skärmdump av Procentspöket-striden på 1024×768 visar boss och hjälte i
  samma skala, och kollen inte blivit långsammare (mät tid för 12 svar).

Vem: Claude. Bossbilder finns redan (etapp 0 konverterar dem).

## Etapp 4 — Familjesynk utan dataförlust

Syfte: ett flöde som en förälder vågar följa.

- Behåll `active`-flaggan och knapparna "Skapa molnet från denna iPad" och "Hämta
  molnprofiler hit". Ta bort "Nollställ för ny molnstart" som standardväg; den får
  ligga kvar men bakom en tydlig "avancerat"-rubrik.
- `initializeCloudFromLocal` och `replaceLocalFromCloud` använder funktionell
  `setHousehold` så inget som hinner ändras under nätverksanropet skrivs över.
- Workern får `DELETE` bakom familjekoden, så ett moln kan tömmas från appen
  ("Töm molnet", kräver PIN och färsk backup).
- Workern får enkel versionskontroll: svaret bär `ETag`, `PUT` skickar `If-Match`,
  409 vid krock → appen hämtar, slår ihop per barn, laddar upp igen. Det tar bort
  "sista hela filen vinner".
- Lathunden skrivs om: backup → spara adress → skapa molnet med befintliga profiler →
  anslut övriga iPads med "Hämta". Inget steg raderar något.
- `docs/SYNC.md` och lathunden slås ihop till en fil.
- Klart när: ett test simulerar två enheter som köper varsin sak för samma barn och
  båda finns kvar efter två synkar, och lathunden kan följas utan att en profil går
  förlorad.

Vem: Claude Opus (synklogik). Lathunden kan Sonnet skriva.

## Etapp 5 — Kodkvalitet, demo och dokumentation

- `PetHomeScreen`, `PetHouse`, `CampHero`, `pet-sounds` och domänfilerna skrivs om till
  repots stil: normala radlängder, svenska "varför"-kommentarer, inga
  `import.meta.env` i `domain/`.
- `PetHomeScreen` delas i tre komponenter: lägervyn, stationerna, handelsboden.
- Ett namn: "Kvällslägret" överallt (knapp, rubrik, docs, tids-slut).
- `CLAUDE.md`: ny princip om mynt (under princip 3), `src/ui/screens/PetHomeScreen` i
  arkitekturkartan, ny fallgrop om precache-storleken, ny fallgrop om att lägrets
  stadier aldrig sparas.
- `docs/PEDAGOGIK.md`: avsnitt om myntekonomin och husdjurens tillväxt med motivering.
- `docs/LAGER.md`: en fil som ersätter de tolv arbetsloggarna (PET-HOME, PET-CARE,
  PET-TENT, CAMP-STATIONS, CAMP-ART-PROMPTS, FURNISHING-PROMPTS, PET-CARE-PROMPTS,
  DRAGON-ANIMATION, CHARACTER-PROTOTYPE, CHARACTER-RIG-V2, ART-DIRECTION-V2,
  FAMILJESYNK-LATHUND). Prompterna till bilderna sparas i `demo/` eller tas bort.
- Klart när: en ny session kan läsa CLAUDE.md + LAGER.md och förstå lägret utan att
  läsa koden.

Vem: Sonnet räcker för docs och namn; refaktoreringen bör samma modell göra som
byggde etapp 1–2.

## Etapp 6 — iPad-test och deploy

- Checklista på riktig iPad: husdjursljud efter första pekning, lägertid stannar vid
  3 min, kontrast i lägret i dagsljus, hemindikator-remsan på alla nya mörka vyer,
  rotation till porträtt, PWA-uppdatering från gammal version (ingen tom skärm).
- Export från varje platta före deploy. Deploy sker som vanligt via push till `main`.

## Grafikbeställning (till ChatGPT eller annan bildpipeline)

Alla bilder: webp, transparent bakgrund, samma ljussättning som `evening-camp.webp`
(varmt eldsken från vänster, kall måne från höger), 384×384 för enskilda poser,
atlas 4×4 i 1536×1536 för rörelse. Leverans i en mapp `leverans/art/camp/` med
exakt dessa filnamn, inget annat.

| Art | Filer | Antal |
|---|---|---|
| woodland-frog | `{art}-stage-1..4.webp`, `{art}-sleep.webp`, `{art}-motion.webp` | 6 |
| dune-fox | samma | 6 |
| reef-axolotl | samma | 6 |
| crystal-dragon | samma (motion finns redan som v3) | 5 |
| Stadie 4-detalj | `{art}-stage-4` bär en liten lykta/halsduk/glitter, inte ny art | ingår |

Hjältar: `hero/{bagskytt,riddare,trollkarl}-idle.webp` (vilopose, samma skala som
befintliga attack/block/victory-poser), 3 filer.

Bossar: inga nya bilder; befintliga bildrutor konverteras i etapp 0.

Läger: inga nya bilder förrän etapp 2 testats med barnen.

Budget: hela `public/art/camp` under 6 MB efter leverans.

## Ordning och beroenden

```
Etapp 0 ──► Etapp 1 ──► Etapp 2 ──► Etapp 5 ──► Etapp 6
                 │            ▲
                 ├──► Etapp 3 ┘ (oberoende av 2, kan gå parallellt)
                 └──► Etapp 4   (oberoende av 2 och 3)
Grafikbeställning kan starta direkt och landar i etapp 2.
```

Etapp 0 och 1 är förutsättningar. Barnen kan testa lägret på en enhet utan synk
efter etapp 2, medan 3 och 4 byggs.
