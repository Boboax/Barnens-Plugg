# Konceptkonst v2 – masterfigur, utrustning och boss

Denna omgång ersätter den enkla SVG-stilen som visuell riktning. Konsten är anonym och avsedd för en separat testdemo, inte för ett barns personliga profil.

| Referens | Beslut den ska validera |
| --- | --- |
| `concepts/character-v2/master-hero-key-art-v1.png` | övergripande figurkvalitet, ljus, material och silhuett |
| `concepts/character-v2/master-hero-base-reference-v1.png` | neutral kropp, fria händer och proportioner för utrustning |
| `concepts/character-v2/equipment-board-v1.png` | mantelsnitt, rustningsnivå och två kompatibla vapenspråk |
| `concepts/character-v2/crystal-guardian-boss-v1.png` | bosston, skala, läsbara leder och matchande arena |
| `concepts/character-v2/hero-bow-attack-study-v1.webp` | fotarbete, höftvridning, släpp och återhämtning i första v2-sekvensen |
| `concepts/character-v2/hero-modular-atlas-v2.webp` | anonymt masterark för huvud, kropp, lemmar, mantel och två vapen |

## Nästa produktionssteg

Konceptbilderna är **inte** färdiga sprites. Innan de används i spel ska en av bilderna godkännas som masterreferens. Den ska sedan brytas ut till de delar och poser som beskrivs i `CHARACTER-RIG-V2.md`; bilden får inte bara beskäras och roteras som en hel figur.

Publik demo använder fortsatt anonym figur. Barnens personliga, AI-stiliserade ansikten ska endast vara utbytbara huvudmoduler i den privata familjeversionen.

Det modulära arket genererades med ett jämnt friläggningsfält och konverterades lokalt till äkta alfa. De 17 separata DOM-lagren delar samma WebP-atlas i `public/art/prototype-v2/rig-v2/`; varje lager beskär sin del via SVG-viewBox. Det minskar hämtningar och minne på iPad. Delarna är tekniskt användbara för riggprovet men ska fortfarande granskas och målas om innan slutproduktion.
