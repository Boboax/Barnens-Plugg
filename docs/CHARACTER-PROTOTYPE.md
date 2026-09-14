# Figur- och bossprototyp

## Nuläge

- `BattleScreen.handleComplete` registrerar svaret i Store, sätter `flash`, spelar ett befintligt ljudeffektval och går vidare efter 900 ms.
- Bossens befintliga bild får i dag bara float, shake eller pop. Ingen utrustning används i striden.
- `ChildProfile.hero` och lägrets `petProgress.outfit` finns redan, men denna prototyp läser eller skriver inte dem.
- Valuta, uppgiftsresultat, vinstkrav och vanlig lagring berörs inte.

## Bildkontrakt för prototypen

Canvas: 360 × 430. Marklinje: y=389. Handfäste: den främre handens lokala origo (`translate(237 263)`). Lagerordning: skugga, mantel, bakre arm, kropp/ben, huvud, främre arm, vapen, effekter. Mantel och vapen har egna transformgrupper. Den provisoriska draken är också uppdelad i huvud, vingar och svans.

## Demobygg

Kör `npm run build:character-preview`. Resultatet hamnar i `dist-character-preview` och är avsett för `character-prototype/` i `Boboax/Barnens-Plugg-Preview`. Demot använder bara `localStorage`-nyckeln `barnens-plugg-character-prototype-v1`.

## Avgränsning

Ingen permanent karaktärskatalog, migrering, kistbelöning eller ändring av BattleScreen ingår. SVG:erna är märkta som tekniska prototyper och måste ersättas eller godkännas innan de används i vanliga appen.
