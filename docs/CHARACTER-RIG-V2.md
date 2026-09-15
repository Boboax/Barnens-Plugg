# Rigg v2 – masterhjälte

Detta ersätter inte den nuvarande SVG-prototypen. Det är produktionskontraktet för nästa visuella prov, där varje del ska kunna målas separat och följa naturlig kroppsrörelse.

## Led- och lagerindelning

| Del | Fäste | Syfte |
| --- | --- | --- |
| Huvud + hår | nacke | blick, nickning och återhämtning |
| Bröstkorg | höft/bäcken | tyngdpunkt och vridning |
| Bäcken | markplanet | steg, duckning och balans |
| Över-/underarm + hand, vänster/höger | axel, armbåge, handled | riktiga slag-, block- och bågrörelser |
| Över-/underben + fot, vänster/höger | höft, knä, fotled | ansats, viktförflyttning och landning |
| Vapen | dominant hand | följer handleden, aldrig hela figuren |
| Mantel: krage, vänster, mitt, höger, nederkant | nacke/rygg | sekundärrörelse efter kroppen |
| Hår och magiska effekter | huvud/vapen | liten fördröjning efter huvud eller hand |

## Attack: rätt svar (0,9 s)

1. **0–180 ms – förberedelse:** främre fot belastas, bäcken vrids, båge/svärd dras bakåt.
2. **180–420 ms – ansats:** bakre häl lättar, bröstkorg följer bäckenet, armbåge leder rörelsen.
3. **420–560 ms – träff:** hand och vapen når längst; bossen reagerar först här.
4. **560–900 ms – återhämtning:** vikt åter till båda fötter; mantel, hår och partiklar landar sist.

## Fel svar (0,75 s)

Hjälten läser hotet, flyttar vikten till bakre benet, sänker sig vid knä och höft, skyddar med den främre armen och återgår sedan till ett tryggt vänteläge. Det är en miss utan skam eller bestraffning.

## Bossens svar

Bossen använder egna poser: varning före attack, huvud/torso-rekyl vid träff, ving- eller axelobalans, sedan återhämtning. Ingen helbildsskakning används som ersättning för pose.

## Bildleverans för första riktiga provet

En anonym masterhjälte, två vapen, en mantel och en boss. Varje ovanstående del exporteras på transparent bakgrund med samma ljus och skala. Barnspecifika ansikten ersätter endast huvudmodulen och används aldrig i den publika testdemon.

## Genomfört tekniskt prov

`ModularHeroRig` använder en hierarkisk DOM-rigg: underben är barn till lår, underarm är barn till överarm och valt vapen är barn till den dominanta underarmen. Torso, bäcken, huvud och tre mantelfält har egna fästpunkter. Därmed följer delarna sina leder i vänteläge, attack, skydd och seger utan rotation av en sammanslagen helfigur.

Den publika masterfiguren är anonym. Huvudlagret kan senare ersättas privat utan att kropp, kläder, vapen eller animationstidslinjer ändras.
