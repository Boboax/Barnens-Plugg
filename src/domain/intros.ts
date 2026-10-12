import type { TaskVisual } from './types'

/* ============================================================
   Begreppskort: Pis introduktion till varje nytt moment.

   Förr visade "Pi visar först" bara två lösta exempel — barnet fick se
   HUR men aldrig VAD idén är (granskningen okt 2026). Nu börjar
   introduktionen med ett kort som säger kärnan i en eller två meningar,
   med en fast bild (CRA: bilden mellan konkret och abstrakt). Sedan
   kommer exemplen, och sist en uppgift barnet gör tillsammans med Pi.

   Texterna är handskrivna (aldrig AI-genererade i appen, princip 1) och
   skrivna för att läsas UPP: korta meningar, vardagsord, ett nytt
   begrepp i taget. `say` är en ännu kortare lyssningsversion för de
   yngsta (läses upp automatiskt i förskoleklass och åk 1).
   ============================================================ */

export interface MomentIntro {
  /** Idén i en eller två meningar — begreppet, inte bara metoden. */
  idea: string
  /** Lyssningsversion för förskoleklass och åk 1 (annars läses idea). */
  say?: string
  /** En fast bild som visar idén (samma bildtyper som uppgifterna). */
  visual?: TaskVisual
}

export const MOMENT_INTROS: Record<string, MomentIntro> = {
  // ---------- Förskoleklass ----------
  'antal-0-10': {
    idea: 'När vi räknar pekar vi på en sak i taget och säger ett tal för varje. Det sista talet vi säger är hur många det är.',
    say: 'Peka på en i taget och räkna. Det sista talet är hur många.',
    visual: { kind: 'grupper', groupCount: 1, itemsPerGroup: 4, emoji: 'kula' },
  },
  'talrad-0-20': {
    idea: 'Talen står i rad, som pärlor på ett snöre. Ett steg åt höger är ett mer, ett steg åt vänster är ett mindre.',
    say: 'Talen står i rad. Ett steg fram är ett mer. Ett steg bak är ett mindre.',
    visual: { kind: 'tallinje', min: 0, max: 10, hops: [4, 5] },
  },
  'dela-upp-tal': {
    idea: 'Ett tal kan delas i två delar på olika sätt. Sju kan vara fem och två, eller tre och fyra — det är fortfarande sju.',
    say: 'Ett tal kan delas i två delar. Sju är fem och två.',
    visual: { kind: 'tiobas', groups: [{ tens: 0, ones: 5 }, { tens: 0, ones: 2 }] },
  },
  'former-2d': {
    idea: 'Formerna känns igen på sina sidor och hörn. En triangel har tre hörn, en kvadrat har fyra lika långa sidor, och en cirkel har inga hörn alls.',
    say: 'Titta på hörnen. Triangeln har tre hörn. Cirkeln har inga.',
    visual: { kind: 'form', shape: 'triangel' },
  },
  'monster-enkla': {
    idea: 'Ett mönster är något som upprepas om och om igen. Hitta biten som upprepas, så vet du vad som kommer sen.',
    say: 'Ett mönster upprepas. Hitta biten som kommer igen.',
    visual: { kind: 'foljd', items: ['cirkel-rod', 'cirkel-bla', 'cirkel-rod', 'cirkel-bla'] },
  },

  // ---------- Åk 1 ----------
  'talkamrater-10': {
    idea: 'Tiokamrater är två tal som tillsammans blir tio: 1 och 9, 2 och 8, 3 och 7. Kan du dem utantill blir mycket annat räknande lätt.',
    say: 'Tiokamrater blir tio tillsammans. Tre och sju är tiokamrater.',
    visual: { kind: 'tiobas', groups: [{ tens: 0, ones: 3 }, { tens: 0, ones: 7 }] },
  },
  'addition-0-10': {
    idea: 'Plus betyder att vi lägger ihop. Börja på det största talet och räkna vidare uppåt — 6 + 2: sju, åtta.',
    say: 'Plus är att lägga ihop. Börja på det stora talet och räkna vidare.',
    visual: { kind: 'tallinje', min: 0, max: 10, hops: [6, 8] },
  },
  'subtraktion-0-10': {
    idea: 'Minus betyder att vi tar bort. Börja på det första talet och gå bakåt lika många steg som det du tar bort.',
    say: 'Minus är att ta bort. Gå bakåt på talraden.',
    visual: { kind: 'tallinje', min: 0, max: 10, hops: [7, 4] },
  },
  'add-sub-0-10': {
    idea: 'Titta på tecknet först: plus är att lägga till och gå framåt, minus är att ta bort och gå bakåt.',
    say: 'Titta på tecknet. Plus går framåt. Minus går bakåt.',
    visual: { kind: 'tallinje', min: 0, max: 10, hops: [5, 8] },
  },
  'former-3d': {
    idea: 'Kroppar är former som går att hålla i. En boll är ett klot, en tärning är en kub och en burk är en cylinder.',
    say: 'En boll är ett klot. En tärning är en kub.',
    visual: { kind: 'kropp', body: 'kub' },
  },
  'addition-0-20': {
    idea: 'Talen 11 till 20 är en tia och några ental. 12 + 5 är samma som 10 + 2 + 5 — räkna entalen och behåll tian.',
    say: 'Tolv är en tia och två. Lägg ihop entalen och behåll tian.',
    visual: { kind: 'tiobas', groups: [{ tens: 1, ones: 2 }, { tens: 0, ones: 5 }] },
  },
  'subtraktion-0-20': {
    idea: 'När du tar bort ental från ett tal mellan 10 och 20 rör du bara entalen. 17 − 4: sju minus fyra är tre, så det blir 13.',
    say: 'Ta bort från entalen. Tian får stå kvar.',
    visual: { kind: 'tiobas', groups: [{ tens: 1, ones: 7 }, { tens: 0, ones: 4 }], op: '−' },
  },
  'add-sub-0-20': {
    idea: 'Plus och minus blandat upp till 20. Titta på tecknet och tänk på tian som ett stöd: entalen ändras, tian står kvar.',
    say: 'Titta på tecknet. Tian står kvar, entalen ändras.',
    visual: { kind: 'tallinje', min: 0, max: 20, hops: [14, 17] },
  },
  'klockan-hel-halv': {
    idea: 'Den korta visaren visar timmen. När den långa visaren pekar rakt upp är klockan hel, och när den pekar rakt ner är klockan halv.',
    say: 'Lång visare uppåt: hel. Lång visare nedåt: halv.',
    visual: { kind: 'klocka', hours: 3, minutes: 0 },
  },
  'tiotalsovergang-20': {
    idea: 'När du går förbi tio, gå via tian. 8 + 5: först 2 till tio (tiokamraten!), sedan de 3 som är kvar — 13.',
    say: 'Gå via tian. Åtta plus två är tio, sedan tre till.',
    visual: { kind: 'tallinje', min: 0, max: 20, hops: [8, 10, 13] },
  },
  'talfoljder-1': {
    idea: 'I en talföljd hoppar talen lika långt varje gång. Ta reda på hur långt hoppet är, så kan du hoppa vidare.',
    say: 'Talen hoppar lika långt varje gång. Hur långt är hoppet?',
    visual: { kind: 'tallinje', min: 0, max: 10, hops: [2, 4, 6, 8] },
  },
  'sortera-tabeller': {
    idea: 'När vi sorterar lägger vi lika saker tillsammans. Sedan räknar vi varje sort — då ser man snabbt vad det finns mest av.',
    say: 'Lägg lika saker tillsammans och räkna varje sort.',
    visual: { kind: 'stapel', pictogram: true, categories: [{ label: 'äpplen', value: 3, icon: 'apple' }, { label: 'päron', value: 2, icon: 'paron' }] },
  },

  // ---------- Åk 2 ----------
  'positionssystem-100': {
    idea: 'Var siffran står avgör vad den är värd. I 47 betyder 4 fyra tiotal (fyrtio) och 7 sju ental.',
    visual: { kind: 'tiobas', groups: [{ tens: 4, ones: 7 }] },
  },
  'klockan-kvart': {
    idea: 'En timme kan delas i fyra kvartar, som en tårta i fyra bitar. Kvart över: den långa visaren pekar på 3. Kvart i: den pekar på 9.',
    visual: { kind: 'klocka', hours: 2, minutes: 15 },
  },
  'add-sub-0-100': {
    idea: 'Räkna tiotal för sig och ental för sig. 34 + 25: tre tiotal och två tiotal blir fem, fyra och fem ental blir nio — 59.',
    visual: { kind: 'tiobas', groups: [{ tens: 3, ones: 4 }, { tens: 2, ones: 5 }] },
  },
  'likhetstecken': {
    idea: 'Likhetstecknet betyder "är lika mycket som" — inte "svaret kommer här". Det är en vågskål: båda sidorna måste väga lika.',
    visual: { kind: 'ingen' },
  },
  'dubbelt-halften': {
    idea: 'Dubbelt är två lika stora delar ihop: dubbelt så mycket som 4 är 8. Hälften är det omvända — dela i två lika delar.',
    visual: { kind: 'grupper', groupCount: 2, itemsPerGroup: 4, emoji: 'kula' },
  },
  'vaxling-0-100': {
    idea: 'Räcker inte entalen när du tar bort, växla ett tiotal till tio ental. 42 − 7: gör om ett tiotal, så har du 12 ental att ta bort från.',
    visual: { kind: 'tiobas', groups: [{ tens: 4, ones: 2 }, { tens: 0, ones: 7 }], op: '−' },
  },
  'mult-intro': {
    idea: 'Gånger är ett snabbt sätt att räkna lika stora grupper. 3 × 4 betyder tre grupper med fyra i varje: 4 + 4 + 4 = 12.',
    visual: { kind: 'grupper', groupCount: 3, itemsPerGroup: 4, emoji: 'kula' },
  },
  'div-intro': {
    idea: 'Dela lika betyder att alla får lika många. 12 delat med 3: dela ut tolv saker i tre högar, en i taget, tills alla är slut.',
    visual: { kind: 'grupper', groupCount: 3, itemsPerGroup: 4, emoji: 'bulle' },
  },
  'matning-langd': {
    idea: 'Vi mäter längd i centimeter och meter. En meter är hundra centimeter — ungefär ett stort kliv.',
    visual: { kind: 'tallinje', min: 0, max: 100, marks: [0, 100] },
  },
  'stapeldiagram': {
    idea: 'I ett stapeldiagram visar varje stapel hur många det finns av något. Ju högre stapel, desto fler. Läs av höjden mot siffrorna på sidan.',
    visual: { kind: 'stapel', categories: [{ label: 'Hund', value: 5 }, { label: 'Katt', value: 3 }, { label: 'Fisk', value: 2 }], yStep: 1 },
  },
  'rimlighet': {
    idea: 'Gissa ungefär innan du räknar. 47 + 25 är ungefär 50 + 25 — runt 70. Blir svaret 612 vet du direkt att något gick fel.',
    visual: { kind: 'tallinje', min: 0, max: 100, marks: [47, 72] },
  },

  // ---------- Åk 3 ----------
  'tabeller-alla': {
    idea: 'Tabellerna är gånger du kan utantill. Använd det du redan kan: 6 × 7 är 5 × 7 plus en sjua till — 35 + 7 = 42.',
    visual: { kind: 'grupper', groupCount: 6, itemsPerGroup: 7, emoji: 'kula' },
  },
  'oppna-utsagor-100': {
    idea: 'I en öppen utsaga gömmer sig ett tal. Fråga dig: vilket tal gör att båda sidor blir lika? Räkna gärna baklänges.',
    visual: { kind: 'ingen' },
  },
  'add-sub-0-1000': {
    idea: 'Med stora tal räknar vi hundratal, tiotal och ental var för sig — i en uppställning med samma sorter under varandra.',
    visual: { kind: 'tiobas', groups: [{ hundreds: 2, tens: 3, ones: 4 }] },
  },
  'klockan-minuter': {
    idea: 'Varje siffra på urtavlan är fem minuter för den långa visaren. Räkna i femsteg: 1 är 5 minuter, 2 är 10, 3 är 15 …',
    visual: { kind: 'klocka', hours: 4, minutes: 20 },
  },
  'mult-div-samband': {
    idea: 'Gånger och delat hör ihop. Vet du att 6 × 7 = 42, vet du också att 42 delat med 7 är 6.',
    visual: { kind: 'grupper', groupCount: 6, itemsPerGroup: 7, emoji: 'kula' },
  },
  'symmetri': {
    idea: 'En figur är symmetrisk om den kan vikas så att de två halvorna passar precis över varandra. Vecket kallas spegellinje.',
    visual: { kind: 'spegel', shape: 'hjarta', axis: 'lodrat' },
  },
  'kontroll-motsatt': {
    idea: 'Plus och minus tar ut varandra. Har du räknat 52 − 18 = 34, kolla med plus: 34 + 18 ska bli 52 igen.',
    visual: { kind: 'tallinje', min: 30, max: 60, hops: [52, 34] },
  },
  'brak-intro': {
    idea: 'Ett bråk är en del av en helhet. Nämnaren (under strecket) säger hur många lika delar helheten har, täljaren (över) hur många vi tar.',
    visual: { kind: 'brak', parts: 4, filled: 3 },
  },

  // ---------- Åk 4 ----------
  'stora-tal': {
    idea: 'Varje steg åt vänster gör siffran tio gånger mer värd: ental, tiotal, hundratal, tusental … ända upp till miljoner.',
    visual: { kind: 'tiobas', groups: [{ hundreds: 3, tens: 0, ones: 5 }] },
  },
  'overslagsrakning': {
    idea: 'Överslag är att räkna ungefär med runda tal. 398 + 205 är nästan 400 + 200 = 600 — snabbt, och bra för att kolla ett svar.',
    visual: { kind: 'tallinje', min: 0, max: 1000, marks: [398, 603] },
  },
  'skriftlig-mult': {
    idea: 'I uppställningen tar du en siffra i taget, från entalen. Blir det mer än nio skriver du entalen och sparar tiotalet som minnessiffra.',
    visual: { kind: 'ingen' },
  },
  'omkrets': {
    idea: 'Omkretsen är hur långt det är runt om en figur — som ett staket. Lägg ihop alla sidor.',
    visual: { kind: 'rektangel', w: 5, h: 3, unit: 'm' },
  },
  'kort-division': {
    idea: 'Dela upp det stora talet i delar som är lätta att dela. 84 delat med 4: 80 delat med 4 är 20, och 4 delat med 4 är 1 — 21.',
    visual: { kind: 'tiobas', groups: [{ tens: 8, ones: 4 }] },
  },
  'monster-regler': {
    idea: 'Ett mönster med regel kan beskrivas med ord: "börja på 3 och lägg till 4 varje gång". Med regeln kan du räkna ut talet långt fram.',
    visual: { kind: 'tallinje', min: 0, max: 20, hops: [3, 7, 11, 15] },
  },
  'diagram-lasa': {
    idea: 'Ett linjediagram visar hur något förändras, till exempel temperaturen under en dag. Följ linjen: uppåt är mer, nedåt är mindre.',
    visual: { kind: 'linje', points: [{ label: 'mån', value: 4 }, { label: 'tis', value: 6 }, { label: 'ons', value: 5 }, { label: 'tor', value: 8 }], step: 2 },
  },
  'brak-jamfora': {
    idea: 'Har bråken samma nämnare är det den största täljaren som vinner. Annars: tänk på hur stora bitarna är — fler bitar betyder mindre bitar.',
    visual: { kind: 'brak', parts: 3, filled: 2, secondary: { parts: 5, filled: 3 } },
  },
  'decimal-intro': {
    idea: 'Siffrorna efter kommat är delar av en hel. Första siffran är tiondelar, nästa är hundradelar. 0,5 är fem tiondelar — en halv.',
    visual: { kind: 'brak', parts: 10, filled: 5 },
  },
  'proportionalitet': {
    idea: 'När det ena blir dubbelt så stort blir det andra också det. Kostar 2 bullar 10 kronor kostar 6 bullar tre gånger så mycket.',
    visual: { kind: 'grupper', groupCount: 3, itemsPerGroup: 2, emoji: 'bulle' },
  },

  // ---------- Åk 5 ----------
  'mult-div-stora': {
    idea: 'Med stora tal hjälper tiopotenserna: gånger 10 flyttar varje siffra ett steg åt vänster. 23 × 40 är 23 × 4 × 10.',
    visual: { kind: 'ingen' },
  },
  'decimal-rakna': {
    idea: 'När du räknar med decimaltal ska kommatecknen stå under varandra — tiondelar under tiondelar, hundradelar under hundradelar.',
    visual: { kind: 'brak', parts: 10, filled: 7 },
  },
  'brak-rakna': {
    idea: 'Bråk med samma nämnare är lika stora bitar, så du kan lägga ihop täljarna: 2/5 + 1/5 = 3/5. Nämnaren ändras inte.',
    visual: { kind: 'brak', parts: 5, filled: 3 },
  },
  'area': {
    idea: 'Arean är hur stor ytan innanför är. För en rektangel: räkna rutorna, eller räkna längd gånger bredd.',
    visual: { kind: 'rektangel', w: 4, h: 3, unit: 'cm' },
  },
  'problemlosning-flerstegs': {
    idea: 'Svåra problem löser man i steg. Läs noga, ta reda på vad som frågas, gör en plan — och räkna en del i taget.',
    visual: { kind: 'ingen' },
  },
  'procent-intro': {
    idea: 'Procent betyder hundradelar. 50 % är 50 av 100 — hälften. 25 % är en fjärdedel.',
    visual: { kind: 'brak', parts: 4, filled: 1 },
  },
  'medelvarde': {
    idea: 'Medelvärdet är vad alla skulle få om allt delades lika. Lägg ihop alla värden och dela med hur många de är.',
    visual: { kind: 'stapel', categories: [{ label: 'Ali', value: 2 }, { label: 'Bea', value: 6 }, { label: 'Cim', value: 4 }], yStep: 1 },
  },
  'negativa-tal': {
    idea: 'Talraden fortsätter under noll, som på en termometer. Där heter talen minus ett, minus två … Ju längre till vänster, desto mindre.',
    visual: { kind: 'tallinje', min: -10, max: 10, hops: [3, 0, -4] },
  },
  'enkla-ekvationer': {
    idea: 'En ekvation är en vågskål där bokstaven gömmer ett tal. x + 12 = 30: vilket tal plus 12 blir 30? Ta bort 12 från båda sidor.',
    visual: { kind: 'ingen' },
  },
  'koordinatsystem': {
    idea: 'Varje punkt har en adress med två tal. (3, 4) betyder: gå först 3 steg åt sidan, sedan 4 steg uppåt.',
    visual: { kind: 'koordinat', min: 0, max: 6, points: [{ x: 3, y: 4, label: 'A' }] },
  },

  // ---------- Åk 6 ----------
  'brak-decimal-procent': {
    idea: 'Samma tal kan skrivas på tre sätt: en halv är 1/2, 0,5 och 50 %. Alla betyder samma del av helheten.',
    visual: { kind: 'brak', parts: 2, filled: 1 },
  },
  'vinklar': {
    idea: 'En vinkel visar hur mycket två linjer öppnar sig. Rät vinkel är 90 grader, som ett hörn på ett papper. Spetsig är mindre, trubbig är större.',
    visual: { kind: 'vinkel', degrees: 90 },
  },
  'sannolikhet-intro': {
    idea: 'Sannolikhet är hur stor chansen är. På en tärning finns sex sidor, så chansen att slå en sexa är 1 av 6.',
    visual: { kind: 'ingen' },
  },
  'ekvationer-tva-steg': {
    idea: 'Lös en ekvation i två steg genom att göra samma sak på båda sidor. 2x + 3 = 11: ta först bort 3, dela sedan med 2.',
    visual: { kind: 'ingen' },
  },
  'skala': {
    idea: 'Skala säger hur mycket en bild är förminskad eller förstorad. Skala 1:100 betyder att 1 cm på kartan är 100 cm i verkligheten.',
    visual: { kind: 'ingen' },
  },
  'grafer': {
    idea: 'En graf visar ett samband som en linje. Är linjen rak och går genom noll är sambandet proportionellt: dubbelt så mycket kostar dubbelt så mycket.',
    visual: { kind: 'koordinat', min: 0, max: 10, points: [], lines: [{ points: [{ x: 0, y: 0 }, { x: 5, y: 10 }] }], xLabel: 'kg', yLabel: 'kr' },
  },
}

export const momentIntro = (momentId: string): MomentIntro | undefined => MOMENT_INTROS[momentId]
