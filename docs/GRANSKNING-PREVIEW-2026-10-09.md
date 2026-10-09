# Granskning av preview-grenen `feature/character-battle-prototype`

Datum: 2026-10-09. Granskad commit: `58e3609` (78 commits efter `main` på `b26bc8a`).
Inga ändringar är gjorda i repot. Grenen `feature/pet-home` ingår i sin helhet i den granskade grenen.

## 1. Sammanfattning

Grenen levererar det som utlovats: kvällsläger med husdjur, handelsbod, mantlar och vapen, animerade bossar och hjälteposer i striden, beständiga världsgåvor från skattkistor, samt ett nytt anslutningsflöde för familjesynken. Bygget och alla 188 tester är gröna. Visuellt håller lägret och husdjuren hög klass och barnen kommer att tycka om det.

Grenen är dock **inte redo att mergas till `main`** i sin nuvarande form. Fyra problem måste lösas först:

1. Lägrets möbler synkas inte alls mellan enheter, medan mynten gör det. Köp försvinner eller dubbleras.
2. Synk-lathunden rekommenderar en "ren molnstart" som raderar barnens hela progression och tvingar om diagnosen. Det är onödigt, koden klarar att publicera befintliga profiler.
3. Appens offline-cache har vuxit från cirka 5 MB till 33 MB. Varje iPad laddar ned och lagrar alla prototyp-bildrutor, även de som inte används.
4. Husdjur finns bara för fyra av sju världar. Sexåringen i Urtalens dal får en groda "från Den gömda algoritmens glänta", en årskurs 3-värld hon aldrig sett och som ligger i dimma på hennes karta. Verifierat med skärmdump.

Därtill finns en tydlig regression i bosstriden (bossen har krympt till under hälften och hjälten är en stillbild), kodkvalitet som bryter mot repots egen ribba, och dokumentation som inte uppdaterats.

## 2. Vad som verifierats

| Kontroll | Resultat |
|---|---|
| `npm run build` (tsc + vite) | Grönt |
| `npm test` | 188 tester gröna (8 filer, 25 nya tester för läger, husdjur, gåvor, synk) |
| Playwright-genomspel av riktiga appen (iPad 1024×768 och 768×1024) | Inga JS-fel, inga 404 |
| Playwright-genomspel av `build:full-preview` | 5 saknade bilder (pi/glad, logo, startbg, icons/las, woodland-frog-poster) – bara i demobygget |
| Omfång | 165 filer, +3 466 rader, 92 nya binärer; `public/art` 3,3 MB → 31,4 MB |

Skärmdumparna togs med Playwright i granskningssessionen och finns inte i repot.

## 3. Fel och brister, prioriterade

### A. Blockerande före merge

**A1. Möbler i lägret synkas inte.** `Household.petHome` (ägda föremål och placeringar) ignoreras helt av `mergeHouseholds` i `src/storage/sync.ts:48-73`, som bara slår ihop `children`, `rewards` och `chatLog`. Mynten ligger däremot i `child.petProgress` och synkas per barn. Scenario: barnet köper en bädd på iPad A (mynt dras, föremål sparas lokalt). iPad B hämtar: mynten är borta, bädden finns inte. Nästa gång A startar och hämtar vinner B:s nyare barn-post, och A:s köp är borta för gott. Omvänt kan "Hämta molnprofiler hit" ta med ett annat barns `petHome` från den enhet som råkade ladda upp sist. Lathunden lovar ändå att "husdjur, utrustning" lagras i molnet. ChatGPT:s egen `docs/PET-HOME.md` säger tvärtom: "aktivera inte synk för att dela stugan". Rekommendation: flytta föremålen in i `child.petProgress.items` (per barn, som allt annat), så följer de krockregeln automatiskt. Då kan `Household.petHome` och hela legacy-vägen (`FURNITURE`, `buyFurniture`, `equipFurniture`) tas bort.

**A2. Lathunden raderar barnens progression i onödan.** `docs/FAMILJESYNK-LATHUND.md` steg 2.5–2.6: "Nollställ för ny molnstart … Skapa barnens nya profiler. De börjar med en ny diagnos." Koden `initializeCloudFromLocal` i `store.tsx` fungerar utmärkt med befintliga profiler; den vägrar bara om molnet redan har data. Lathunden ska i stället säga: exportera backup, spara adress, "Skapa molnet från denna iPad" med befintliga profiler, anslut övriga iPads med "Hämta molnprofiler hit". Dessutom: Workern (`cloud/sync-worker.js`, oförändrad) saknar DELETE, så ett moln som en gång fått data kan aldrig "skapas om" från appen. Vill man börja om måste en ny KV-namnrymd skapas i Cloudflare. Det bör stå i guiden, eller så läggs en DELETE-väg till i Workern bakom familjekoden.

**A3. Offline-cachen är 33 MB.** `vite.config.ts` precachar `**/*.{png,webp,…}` via PWA-pluginet, vilket nu omfattar hela `public/art` (31 MB). Fördelning: `art/camp` 12 MB, `art/prototype-v*` cirka 17 MB (PNG-sekvenser, inte webp; `prototype-v6` ensam 4 MB). Minst 3,7 MB är helt oanvända (`crystal-dragon-idle-v1/v2`, `prototype-v2..v5` som bara demon använder). Varje iPad laddar ned allt vid första start och vid varje version. Risk för iOS lagringskvot, långsam uppdatering och trasig installation på mobilt nät. Åtgärd: konvertera bildrutor till webp (typiskt 60–80 % mindre), ta bort oanvända generationer, flytta demo-tillgångar ut ur `public/`, eller undanta `art/prototype-*` från `globPatterns`. Observera att binärerna redan ligger i git-historiken (pack 47 MB); rensa innan merge, annars följer de med `main` för alltid.

**A4. Husdjursarter saknas för tre världar.** `PET_SPECIES` i `src/domain/pet-home.ts` täcker `monsterskogen`, `brakberget`, `formernas-berg`, `diagramoarna`. För `talens-dal`, `multiplikationsskogen` och `sambandsgrottan` faller `completePetPractice` (`src/engine/pet-home.ts:16`) tillbaka på skogsgrodan. Konsekvenser:
- FK/åk 1-barnet, som enbart tränar i Urtalens dal, får upptäckten "På vägen tillbaka från Den gömda algoritmens glänta hör du något bakom en sten". Världen är en åk 3-värld som ligger i dimma på hennes karta. Bryter berättelsen och "fog of war"-principen.
- Husdjursgåvorna (`kind:'pet'`) för de tre världarna kan aldrig hittas, eftersom `eligibleChestGifts` kräver ett djur från samma värld. 3 av 28 gåvor är onåbara.
- Alla butikens upplåsningar (`CAMP_CATALOG`, `OUTFITS`, `WEAPONS` i `src/domain/camp.ts`) pekar på `monsterskogen`. Det yngsta barnet har i praktiken 3 av 8 varor och 1 av 7 mantlar i flera år; vapnet Spiralbågen kräver erövrad `monsterskogen` oavsett hjälte.
Åtgärd: en art per värld (sju arter) eller en explicit mappning värld → art, och upplåsningar som följer barnets egen årskurs ("första erövrade världen", "första klarade blixten") i stället för en fast värld.

### B. Allvarliga

**B1. Bosstriden har blivit mindre dramatisk.** Den gamla `BossFigure` ritade bossen 240 px hög mitt i arenan. Nya `BattleDuel` (`src/styles/boss-pose.css`) ger bossen max 172 px och 44 % av en 330 px bred duell; i skärmdumpen är Procentspöket en liten mörk fläck till höger om en stor hjälte. Hjälten är i läget `profile-pose-prototype` bara profilbilden (`art/hero/bagskytt.webp`) i vila, med PNG-poser för attack/block/seger. Bossens pose-animation spelas bara vid träff och miss, i vila visas den statiska bilden. Förslag: bossen minst lika stor som hjälten, hjälten med egen vilopose, och duellen får ta arenans fulla bredd.

**B2. Fördröjningen 900 → 1 260 ms gäller alla strider.** `BattleScreen.tsx:188` höjer väntetiden efter varje svar för boss, kunskapskoll, väktare och diamant. Motivet är bossens bildrutor, men kollen (12 uppgifter) får fyra sekunder extra dödtid utan att något animeras. Gör fördröjningen beroende av `kind === 'boss'`.

**B3. Lägret skriver hushållet varje sekund.** `PetHomeScreen.tsx:36` kör `store.spendHomeTime(1)` i en `setInterval` på 1 s. Varje tick skapar ett nytt hushållsobjekt, skriver till IndexedDB och bumpar barnets `updatedAt`. Effekter: 180 IndexedDB-skrivningar per besök, hela lägret renderas om varje sekund (tung bakgrund, nio eldflugor, flera animerade sprites) och den enhet som står i lägret "vinner" alltid synkkrocken för det barnet. Synk-uppladdningens 5-sekunders debounce nollställs också varje sekund, så inget laddas upp under besöket. Räkna sekunder i en `useRef` och spara var 15:e sekund eller vid utgång.

**B4. Koden bryter repots egen ribba.** `src/domain/camp.ts`, `src/engine/camp.ts`, `PetHomeScreen.tsx` (110 rader med rader på 300–900 tecken), `PetHouse.tsx`, `CampHero.tsx` och `pet-sounds.ts` är skrivna som minifierad enradskod utan de "varför"-kommentarer CLAUDE.md kräver. Det blir mycket svårt för nästa session (människa eller AI) att underhålla. `src/domain/camp.ts:52` använder `import.meta.env.BASE_URL` i domänlagret, som enligt arkitekturen ska vara fritt från miljöberoenden. Två parallella möbelsystem lever sida vid sida (`FURNITURE` i `pet-home.ts` och `CAMP_CATALOG` i `camp.ts`) med olika pris för samma id (Ormbunksbädd 20 respektive 40 mynt); legacy-funktionerna `buyFurniture`/`equipFurniture` exponeras i `store` men används inte av något UI.

**B5. Demokod i produktionsträdet.** `src/dev/*`, `BowMotionStudyV3`, `ModularHeroRig`, `ProductionHeroRigV4`, `CinematicAttackStudy`, `PrototypeBoss`, `CharacterFigure`, `ProductionPoseAnimatorV5` och `domain/character.ts` (`PROTOTYPE_WEAPONS`/`PROTOTYPE_CLOAKS`) är studier för demosidorna. `ProductionPoseAnimatorV5` importeras av `BattleDuel` men nås aldrig från riktiga appen (`heroPresentation` är hårdkodat till `profile-pose-prototype`). `vite.character-preview.config.ts` laddar React från esm.sh, en extern CDN, vilket är okej för en demo men aldrig får smitta appen. Flytta allt demo-material till en egen mapp (eller egen gren) som inte byggs med appen.

**B6. Dokumentationen är inte uppdaterad.** `CLAUDE.md`, `docs/PEDAGOGIK.md` och `docs/ARKITEKTUR.md` nämner varken mynt, läger, husdjur, gåvor eller det nya synkflödet. Tolv nya dokument i `docs/` är i huvudsak arbetsloggar ("Validering: 174 tester…", prompt-listor) snarare än dokumentation, och motsäger varandra (PET-HOME: "ingen molnsynk", LATHUND: "husdjur lagras i KV"). Konsolidera till två: `docs/LAGER.md` (spelregler, datamodell, principer) och en uppdaterad `docs/SYNC.md`.

### C. Mindre

- `TimeUp.tsx` erbjuder "Besök djurens stuga" efter att dagstiden är slut. Lägertiden (3 min) är ren klocktid, inte aktivitetsbaserad som mattetiden. Rimligt, men det är ett medvetet val som bör stå i PEDAGOGIK.
- Namnet varierar: knappen på kartan säger "Stugan", skärmen "Kvällslägret", docs "Djurens stuga", tids-slut "djurens stuga". Välj ett.
- Tältet (`camp-den-building`) ritas alltid i lägret, trots att "Husdjurstält" säljs för 100 mynt i boden. Barnet köper något det redan ser.
- Skattkistan väljer nu gåvan slumpmässigt och sparar den innan den visas. Komponenten heter "Välj en världsgåva" men visar alltid ett enda kort. Antingen ge barnet två att välja mellan (mer agens) eller döp om.
- `initializeCloudFromLocal`/`replaceLocalFromCloud` sätter `setHousehold(next)` från en stängd `household`-referens i stället för en funktionell uppdatering; ändringar som hinner ske under nätverksanropet skrivs över.
- Den som redan har synk igång och trycker "Spara adress och kod" igen får `active:false` och synken pausad utan tydligt besked.
- Workern saknar versionskontroll (ETag/If-Match). Två enheter som laddar upp nära i tid: sista hela filen vinner, inte per barn. Det fanns före grenen men blir viktigare nu när fler fält skrivs oftare.
- `.github/workflows/deploy.yml` kör nu `npm test` före bygget. Bra tillägg.

## 4. Bedömning av inlärning och spelupplevelse

**Vad som fungerar väl mot principerna i CLAUDE.md**
- Mynten ges för ett *avslutat* pass per dag oavsett rättprocent (`completePetPractice`). Det belönar träningsvana, inte hastighet eller poäng (princip 3). Testerna bevisar att dubbelkörning aldrig ger dubbla mynt.
- Alla gåvor och all utrustning är kosmetiska; inget påverkar rating, upplåsning eller rättning (princip 1 och 5). Tester vaktar detta.
- Husdjuren svälter inte, inget straff vid frånvaro, godbitar är gratis. Bra mot ett sexårigt barns oro.
- Lägertiden begränsas till 3 minuter efter ett pass och kan inte fyllas på. Skärmtiden hålls i schack.
- Boss-reliken som unik trofé passar den beslutade Expeditionsmodellen (världsboss = trofé).

**Vad som behöver en förälders beslut**
- En myntekonomi med butik och priser ("Spara 60 mynt till") är en klassisk extrinsisk belöningsloop. Forskningen (Deci & Ryan) varnar för att den kan tränga undan inre motivation om den blir målet. Lägret är i dag välbalanserat eftersom allt är billigt och inget går att förlora, men principen "mynt för att ha tränat" bör skrivas in i PEDAGOGIK med en gräns: aldrig mynt för rätt svar, aldrig mynt för hastighet, aldrig dyrare varor än några dagars träning.
- Upptäckten av ett husdjur sker efter ett avslutat pass. Ett alternativ mer i linje med princip 3 är att koppla *nya arter* till behärskade moment (en klarad Pi-koll i en ny värld), och mynten till vanan. Då blir djuret ett minne av något barnet lärt sig.

**Spelupplevelse**
- Lägret, djuren, tältet och garderoben ser mycket bra ut och är lätta att förstå för en åttaåring. Pekytorna är stora.
- Striden har tappat kraft (B1). Bossen var huvudpersonen; nu är hjälten det och bossen en liten bild.
- Lägret är tomt på "varför": inget händer när djuren är mätta eller vilar, mantlarna syns bara i garderoben och lägret. Ett enkelt nästa steg är att låta det utrustade djuret och manteln synas på kartan bredvid Pi.

## 5. Rekommenderad väg framåt

1. **Merga inte grenen rakt av.** Dela upp i tre spårbara steg på nya grenar från `main`: (a) läger + husdjur + gåvor, (b) strid, (c) synk. Varje steg med fixarna ovan, uppdaterade docs och verifiering på riktig iPad.
2. **Datamodell först.** Flytta föremålen till barnet (`petProgress.items`), ta bort `Household.petHome` och legacy-möblerna. Då löser sig A1 utan ny konfliktlogik.
3. **Banta tillgångarna** innan något mergas (A3). Webp, ta bort oanvänt, demo-material ut ur `public/`.
4. **Sju arter, årskursanpassade upplåsningar** (A4). Sexåringen ska få sin första vän från Urtalens dal.
5. **Striden**: bossen stor, hjälten med vilopose, fördröjning bara i bosstriden (B1, B2).
6. **Skriv om lägerkoden** till repots standard (B4) och plocka bort demokod (B5).
7. **Synk**: skriv om lathunden utan "ren start" (A2), lägg till DELETE i Workern, rätta tick-skrivningen (B3).
8. **Docs**: CLAUDE.md (ny princip för mynt, ny mapp i arkitekturkartan, fallgropen om precache), PEDAGOGIK, ARKITEKTUR, SYNC. Konsolidera de tolv nya filerna.
9. **Testa på iPad**: husdjursljud (Web Audio kräver gest), 3-minuters-timern, kontrast i lägret i dagsljus, hemindikator-remsan på de nya mörka vyerna (`useDocumentBackground` finns i PetHomeScreen men inte i `WorldGiftChest`).

Punkt 2–4 är förutsättningar; resten kan göras stegvis medan barnen redan testar lägret på en enhet utan synk.
