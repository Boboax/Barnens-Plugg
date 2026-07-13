# Pedagogisk grund

Varje designval i Barnens Plugg vilar på etablerad inlärningsforskning.
Här är kopplingen mellan forskning och implementation.

| Princip | Forskningsgrund | I appen |
|---|---|---|
| **Mastery learning** | Bloom (1984); barn går vidare när färdigheten sitter, inte efter x uppgifter | Moment låses upp av förkunskaper; bossen kräver ~80 % (10/12); repetitionsprov kan öppna momentet igen |
| **Proximala utvecklingszonen** | Vygotskij; optimal inlärning strax över nuvarande nivå | Elo-rating per färdighet väljer nivå med ~70–80 % förväntad lyckandegrad (`rating.ts`) |
| **Retrieval practice** | Roediger & Karpicke (2006); att plocka fram ur minnet stärker mer än att läsa om | Allt är aktiv övning; repetitionsproven är riktiga prov, inte genomläsning |
| **Spaced repetition** | Ebbinghaus; Cepeda m.fl. (2006); växande intervall slår massed practice | Intervall 3→7→14→30→60→120 dagar per behärskat moment (`spaced-repetition.ts`) |
| **Interleaving** | Rohrer & Taylor (2007); blandade uppgiftstyper ger bättre långtidsinlärning | "Blandat"-delen i varje pass drar från alla behärskade moment; bossen blandar in förkunskaper |
| **CRA-progression** | Concrete–Representational–Abstract (specialpedagogisk standard) | Tiobasblock, tallinjer, grupper och bråkfigurer på låga nivåer; trappas ner mot ren symbolräkning |
| **Omedelbar korrektiv feedback** | Hattie & Timperley (2007) | Fel svar ⇒ missuppfattningsspecifik ledtråd + pedagogisk förklaring, direkt |
| **Missuppfattningsdiagnostik** | Diagnostisk taxonomi à la DfE/NCETM; distraktorer som avslöjar tänkandet | Varje distraktor taggas (glömd växling, likhetstecken-som-resultat …); motorn ser *varför* det blev fel (`misconceptions.ts`) |
| **Growth mindset-feedback** | Dweck; Mueller & Dweck (1998): beröm processen, inte personen | "Bra kämpat — varje försök gör dig starkare", aldrig "vad smart du är" |
| **Ingen tidspress på prov** | Boaler (2014): tidspress är starkt kopplad till matteångest | Bossen har inga klockor; sköldarna är bossens, fel svar bestraffas inte |
| **Belöna träning, inte fart** | Deci m.fl.; yttre belöningar för hastighet urholkar noggrannhet | Belöningar kopplas till moment/pass/terminsmål — aldrig poäng eller tid |
| **Rimlighet & självkontroll** | Ingår i Lgr22:s centrala innehåll | Egna moment: "Är det rimligt?", "Kontrollera svaret", "Överslagsräkning"; slarvfelsdetektorn särskiljer slarv från kunskapslucka |
| **Korta pass** | Uppmärksamhetsspann; distributed practice | Dagens pass ≈ 15 min: uppvärmning → nytt → blandat; tidsgräns per dag |
| **Inga syskonjämförelser** | Social jämförelse demotiverar den som halkar efter | Varje barn ser bara sina egna mål och streaks; jämförelsen finns bara i föräldravyn |
| **Adaptiv startdiagnos** | Computerized adaptive testing (CAT), förenklad | Binärsökning längs läroplansryggraden; inga rätt/fel visas; delas i korta pass för yngre barn |
| **Lösta exempel först** | Worked examples / cognitive load theory (Sweller); nybörjare lär bäst av exempel före övning | "Pi visar först": två lösta exempel med förklaring första gången ett nytt moment öppnas (`PiVisar.tsx`) |
| **Flytträning utan press** | Automaticitet krävs för arbetsminnesavlastning; tidspress skapar ångest (Boaler) — lösningen är tävling mot sig själv | Blixtpassen: skolans minuttest-format (1 minut, add/sub 0–10, 0–20, tabellerna) men rekordjakt mot eget rekord; skolans mål visas som ribba, fel kostar inget (`blixt.ts`) |

## Svårighetsskalan (nivå 1–10 per moment)

- **1–3:** introduktion med visuellt stöd (CRA: konkret)
- **4–7:** årskursnivå, visuella stöd trappas ner, textuppgifter dyker upp
- **8–10 (stjärnnivån 💎):** över årskursnivå — flerstegsproblem, öppna utsagor,
  överflödig information, baklängesuppgifter. Låses upp efter besegrad boss.
  Det är stjärnnivån + repetitionsproven som gör att det *sitter ordentligt*.
