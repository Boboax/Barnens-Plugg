# Djurens stuga — första versionen

En lokal stuga delas av profilerna på samma platta. Olika plattor har separata
hem; denna version inför ingen molnsynk eller konton.

## Spelflöde

- Första avslutade övningspasset per lokal kalenderdag ger 20 mynt, oavsett
  rättprocent. Ett fokuserat pass räknas också. Tomma/avbrutna pass räknas inte.
- Första gången hittar barnet en skogsgroda bakom en sten och ger den ett namn.
- Stugan nås från kartans Stugan-knapp, passets slutkort och tids-slut-vyn.
- Åtta permanenta saker kostar 20–60 mynt. Förhandsvisning ändrar inte sparfilen.
  Köpet drar mynten och ställer fram saken tillsammans. Utbytta saker behålls.
- Varje barn har egen plånbok; husets saker delas utan att visa syskons framsteg.
- Besök får tre minuter per dag efter ett avslutat pass. Synlig stugtid sparas
  separat från mattetid och fylls inte på av fler pass eller återbesök.
- Djur svälter inte, förlorar inget och väntar alltid vänligt.

## Sparfiler

`ChildProfile.petProgress` och `Household.petHome` är optionella. Gamla sparfiler
behöver ingen konvertering och export/import behåller de nya fälten.
Molnsynkens gamla krockregler har INTE ändrats; aktivera inte synk för att dela
stugan mellan plattor innan separat konfliktlösning har byggts och testats.

## Prova separat

Efter `npm ci`, kör `npm run dev -- --port 4173` och öppna
`http://localhost:4173/Barnens-Plugg/pet-preview.html`.
Den sidan använder påhittad profil, särskild databas och knappar för upptäckt,
färdig stuga samt låst läge. Den ingår inte i produktionsbygget.

`npm test` och `npm run build` ska vara gröna före publicering.
Tio nya tester täcker idempotenta belöningar, köp, tidsgräns och sparfiler.
Bekräfta också känsla, pekytor och uppläsning på en riktig iPad.

## Före live-uppdatering

1. Exportera en säkerhetskopia från VARJE platta och behåll filerna.
2. Granska testversionens bilder och flöde med föräldern.
3. Prova med en kopia av data på separat adress, aldrig genom att skriva över
   barnens aktuella profiler.
4. Publicera först efter godkännande. Kodversionen före ändringen är
   `b26bc8a8bf9447af88abab7fb8f58c07fb04925d`.

Grafiken återanvänder befintliga målade objekt, värld, trä och pergament.
Karaktärsskapande, djurutveckling och fler arter ligger utanför denna version.
