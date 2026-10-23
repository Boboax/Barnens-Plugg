/* ============================================================
   Minilektioner: korta animerade "filmer" för de svåraste begreppen.

   Begreppskortet (intros.ts) säger idén i en mening med en fast bild.
   För bråk, procent, decimaltal, vinklar, ekvationer m.fl. räcker det
   inte — barnet behöver SE idén hända: pizzan delas, vågen hålls i
   jämvikt medan klossarna tas bort, strålen vrider sig upp till 90°.
   Förälderns önskan (okt 2026): "ordentliga introduktioner, gärna i
   videoformat så att det blir supertydligt".

   Varför inte riktiga videofiler: de väger megabyte var (bildbudgeten,
   PWA:n precachar allt), kan inte läsas upp med barnets valda röst och
   går inte att pausa scen för scen. Här är varje lektion en följd scener:
   en mening berättarröst (TTS) + undertext + en SVG-bild som animeras
   (ui/components/lessons). Noll kilobyte bild, fungerar offline.

   Texterna är handskrivna (princip 1) och skrivna för att höras: korta
   meningar, ett nytt ord i taget. `text` är undertexten (får innehålla
   1/4, 50 %, x + 3 = 7), `say` är vad rösten läser när symbolerna inte
   låter bra upplästa ("en fjärdedel" i stället för "ett snedstreck fyra").
   ============================================================ */

export interface LessonScene {
  /** Undertexten som visas. */
  text: string
  /** Uppläst version om undertexten innehåller symboler. */
  say?: string
  /** Minsta scenlängd när animationen tar längre tid än meningen. */
  minMs?: number
}

export interface Lesson {
  scenes: LessonScene[]
}

export const LESSONS: Record<string, Lesson> = {
  'mult-intro': {
    scenes: [
      { text: 'Gånger är ett snabbt sätt att räkna lika stora grupper.' },
      { text: 'Här är en grupp med fyra kulor.' },
      { text: 'Här är två grupper …' },
      { text: '… och nu tre grupper, med fyra kulor i varje.' },
      { text: 'Vi kan räkna 4 + 4 + 4 = 12.', say: 'Vi kan räkna fyra plus fyra plus fyra. Det blir tolv.' },
      { text: 'Eller säga det snabbare: 3 × 4 = 12. Tre grupper med fyra i varje.', say: 'Eller säga det snabbare: tre gånger fyra är tolv. Tre grupper med fyra i varje.' },
    ],
  },
  'div-intro': {
    scenes: [
      { text: 'Dela lika betyder att alla får lika många.' },
      { text: 'Här är 12 bullar och tre tallrikar.', say: 'Här är tolv bullar och tre tallrikar.' },
      { text: 'Vi delar ut en bulle i taget — en till varje tallrik, runt, runt.', minMs: 5600 },
      { text: 'Nu är bullarna slut. Varje tallrik fick fyra bullar.' },
      { text: '12 / 3 = 4. Tolv delat med tre är fyra.', say: 'Tolv delat med tre är fyra.' },
      { text: 'Kolla med gånger: 3 × 4 = 12. Det stämmer!', say: 'Vi kollar med gånger. Tre gånger fyra är tolv. Det stämmer!' },
    ],
  },
  'negativa-tal': {
    scenes: [
      { text: 'Här är talraden. Noll står i mitten.' },
      { text: 'Till höger om noll står talen vi känner: 1, 2, 3 …', say: 'Till höger om noll står talen vi känner. Ett, två, tre.' },
      { text: 'Men talraden fortsätter till vänster om noll! Där står −1, −2, −3 …', say: 'Men talraden fortsätter till vänster om noll! Där står minus ett, minus två, minus tre.' },
      { text: 'Som på en termometer: en kall vinterdag kan det vara −3 grader.', say: 'Som på en termometer. En kall vinterdag kan det vara minus tre grader.' },
      { text: 'Blir det 5 grader varmare hoppar vi 5 steg åt höger: −3 + 5 = 2.', say: 'Blir det fem grader varmare hoppar vi fem steg åt höger. Minus tre plus fem blir två.', minMs: 5200 },
      { text: 'Ju längre till vänster, desto mindre. −5 är mindre än −1.', say: 'Ju längre till vänster, desto mindre tal. Minus fem är mindre än minus ett.' },
    ],
  },
  'brak-intro': {
    scenes: [
      { text: 'Här är en hel pizza.' },
      { text: 'Vi delar den i fyra lika stora bitar.' },
      { text: 'En bit är en fjärdedel. Vi skriver 1/4.', say: 'En bit är en fjärdedel. Vi skriver en över fyra, med ett streck emellan.' },
      { text: 'Talet under strecket heter nämnaren. Det säger hur många lika bitar det hela är delat i.' },
      { text: 'Talet över strecket heter täljaren. Det säger hur många bitar vi tar.' },
      { text: 'Tar vi tre bitar har vi 3/4 — tre fjärdedelar.', say: 'Tar vi tre bitar har vi tre fjärdedelar.' },
    ],
  },
  'brak-jamfora': {
    scenes: [
      { text: 'Här är två lika stora chokladkakor.' },
      { text: 'Den övre delar vi i två bitar. Den undre delar vi i fyra bitar.' },
      { text: 'En bit av den övre är 1/2. En bit av den undre är 1/4.', say: 'En bit av den övre är en halv. En bit av den undre är en fjärdedel.' },
      { text: 'Fler bitar betyder mindre bitar. Därför är 1/4 mindre än 1/2.', say: 'Fler bitar betyder mindre bitar. Därför är en fjärdedel mindre än en halv.' },
      { text: 'Men två fjärdedelar är precis lika mycket som en halv: 2/4 = 1/2.', say: 'Men två fjärdedelar är precis lika mycket som en halv.' },
      { text: 'Bråken ser olika ut men är lika stora. De kallas likvärdiga bråk.' },
    ],
  },
  'decimal-intro': {
    scenes: [
      { text: 'Här är en hel. Vi delar den i tio lika delar.' },
      { text: 'En del är en tiondel. Vi skriver 0,1.', say: 'En del är en tiondel. Vi skriver noll komma ett.' },
      { text: 'Fem tiondelar skriver vi 0,5 — det är en halv.', say: 'Fem tiondelar skriver vi noll komma fem. Det är en halv.' },
      { text: 'Första siffran efter kommat räknar tiondelar.' },
      { text: 'Delar vi en tiondel i tio ännu mindre delar får vi hundradelar: 0,01.', say: 'Delar vi en tiondel i tio ännu mindre delar får vi hundradelar. Noll komma noll ett.' },
      { text: '0,25 är två tiondelar och fem hundradelar. Andra siffran räknar hundradelar.', say: 'Noll komma två fem är två tiondelar och fem hundradelar. Andra siffran efter kommat räknar hundradelar.' },
    ],
  },
  'brak-rakna': {
    scenes: [
      { text: 'Hela kakan är delad i fem lika bitar. Varje bit är en femtedel.' },
      { text: 'Här har vi 2/5 — två femtedelar.', say: 'Här har vi två femtedelar.' },
      { text: 'Vi lägger till 1/5.', say: 'Vi lägger till en femtedel.' },
      { text: 'Nu har vi 3/5. Bitarna är lika stora, så vi räknar bara bitarna.', say: 'Nu har vi tre femtedelar. Bitarna är lika stora, så vi räknar bara bitarna.' },
      { text: 'Nämnaren är kvar: 2/5 + 1/5 = 3/5. Bitarna blir inte större för att vi får fler.', say: 'Nämnaren är kvar. Två femtedelar plus en femtedel blir tre femtedelar. Bitarna blir inte större för att vi får fler.' },
      { text: 'Bråk kan också vara en del av ett antal. Hur mycket är 1/3 av 12 kulor?', say: 'Bråk kan också vara en del av ett antal. Hur mycket är en tredjedel av tolv kulor?' },
      { text: 'Dela de tolv kulorna i tre lika högar. En hög är en tredjedel: 4 kulor.', say: 'Dela de tolv kulorna i tre lika högar. En hög är en tredjedel. Det är fyra kulor.' },
    ],
  },
  'procent-intro': {
    scenes: [
      { text: 'Här är hundra rutor. Tillsammans är de en hel.' },
      { text: 'En ruta är en hundradel. Det kallas 1 procent: 1 %.', say: 'En ruta är en hundradel. Det kallas en procent.' },
      { text: 'Procent betyder hundradelar. 50 % är 50 av 100 rutor — hälften.', say: 'Procent betyder hundradelar. Femtio procent är femtio av hundra rutor. Det är hälften.', minMs: 5000 },
      { text: '25 % är 25 av 100 — en fjärdedel.', say: 'Tjugofem procent är tjugofem av hundra. Det är en fjärdedel.' },
      { text: '100 % är alla rutorna — det hela.', say: 'Hundra procent är alla rutorna. Det hela.', minMs: 4500 },
      { text: 'Rea 50 % betyder att du bara betalar hälften av priset.', say: 'När det står rea femtio procent betalar du bara hälften av priset.' },
    ],
  },
  'brak-decimal-procent': {
    scenes: [
      { text: 'Samma del kan skrivas på tre olika sätt. Titta på en halv.' },
      { text: 'Som bråk: 1/2.', say: 'Som bråk: en halv. En över två.' },
      { text: 'Som decimaltal: 0,5 — fem tiondelar.', say: 'Som decimaltal: noll komma fem. Fem tiondelar.' },
      { text: 'Som procent: 50 % — femtio av hundra.', say: 'Som procent: femtio procent. Femtio av hundra.' },
      { text: 'Tre sätt att skriva — men samma del av det hela.' },
      { text: 'En fjärdedel: 1/4 = 0,25 = 25 %.', say: 'En fjärdedel kan på samma sätt skrivas noll komma två fem, eller tjugofem procent.' },
    ],
  },
  'enkla-ekvationer': {
    scenes: [
      { text: 'En ekvation är som en våg i jämvikt. Vänster sida väger lika mycket som höger sida.' },
      { text: 'Lådan x gömmer ett tal. Här står det x + 3 = 7.', say: 'Lådan x gömmer ett tal. Här står det x plus tre är lika med sju.' },
      { text: 'Vi tar bort tre klossar från BÅDA sidorna. Då är vågen fortfarande i jämvikt.', say: 'Vi tar bort tre klossar från båda sidorna. Då är vågen fortfarande i jämvikt.' },
      { text: 'Kvar är x = 4. Lådan gömde talet fyra!', say: 'Kvar är x är lika med fyra. Lådan gömde talet fyra!' },
      { text: 'Vi kollar: 4 + 3 = 7. Det stämmer!', say: 'Vi kollar. Fyra plus tre är sju. Det stämmer!' },
      { text: 'Samma sak med större tal: x + 12 = 30. Ta bort 12 från båda sidor, så är x = 18.', say: 'Samma sak med större tal. x plus tolv är lika med trettio. Ta bort tolv från båda sidor, så är x arton.' },
    ],
  },
  'ekvationer-tva-steg': {
    scenes: [
      { text: 'Här står det 2x + 3 = 11. Två lådor med samma gömda tal, och tre klossar.', say: 'Här står det två x plus tre är lika med elva. Två lådor med samma gömda tal, och tre klossar.' },
      { text: 'Steg ett: ta bort tre klossar från båda sidorna.' },
      { text: 'Nu är 2x = 8. Två lådor väger lika mycket som åtta klossar.', say: 'Nu är två x lika med åtta. Två lådor väger lika mycket som åtta klossar.' },
      { text: 'Steg två: dela båda sidorna i två lika delar. En låda väger lika mycket som fyra klossar.' },
      { text: 'x = 4. Vi kollar: 2 × 4 + 3 = 11. Det stämmer!', say: 'x är fyra. Vi kollar. Två gånger fyra plus tre är elva. Det stämmer!' },
      { text: 'Kom ihåg: gör alltid samma sak på båda sidorna — då håller vågen jämvikt.' },
    ],
  },
  'omkrets': {
    scenes: [
      { text: 'Omkretsen är hur långt det är runt om en figur — som ett staket runt en hage.' },
      { text: 'Vi går runt och räknar. Först 5 meter …', say: 'Vi går runt och räknar. Först fem meter.' },
      { text: '… sedan 3 meter …', say: 'Sedan tre meter.' },
      { text: '… 5 meter till …', say: 'Fem meter till.' },
      { text: '… och 3 meter tillbaka till start.', say: 'Och tre meter tillbaka till start.' },
      { text: '5 + 3 + 5 + 3 = 16. Omkretsen är 16 meter. Lägg ihop alla sidor!', say: 'Fem plus tre plus fem plus tre är sexton. Omkretsen är sexton meter. Lägg ihop alla sidor!' },
    ],
  },
  'area': {
    scenes: [
      { text: 'Arean är hur stor ytan innanför en figur är.' },
      { text: 'Vi täcker rektangeln med rutor. Varje ruta är 1 cm åt varje håll — en kvadratcentimeter.', say: 'Vi täcker rektangeln med rutor. Varje ruta är en centimeter åt varje håll. Det kallas en kvadratcentimeter.', minMs: 4500 },
      { text: 'Räkna rutorna: 12 stycken. Arean är 12 cm².', say: 'Räkna rutorna. Tolv stycken. Arean är tolv kvadratcentimeter.', minMs: 4500 },
      { text: 'Snabbare: fyra rutor i varje rad, och tre rader.' },
      { text: 'Längd gånger bredd: 4 × 3 = 12 cm².', say: 'Längden gånger bredden. Fyra gånger tre är tolv kvadratcentimeter.' },
      { text: 'En triangel som är en halv rektangel har halva arean: 6 cm².', say: 'En triangel som är en halv rektangel har halva arean. Sex kvadratcentimeter.' },
    ],
  },
  'vinklar': {
    scenes: [
      { text: 'En vinkel visar hur mycket två linjer öppnar sig från en punkt.' },
      { text: 'Ett hörn på ett papper är en rät vinkel. Den är 90 grader: 90°.', say: 'Ett hörn på ett papper är en rät vinkel. Den är nittio grader.' },
      { text: 'Mindre än en rät vinkel kallas spetsig. Den ser vass ut, som en spets.' },
      { text: 'Större än en rät vinkel kallas trubbig. Den är bred och trubbig.' },
      { text: 'Helt utsträckt är det 180° — en rak linje, två räta vinklar.', say: 'Helt utsträckt är det hundraåttio grader. En rak linje, två räta vinklar.' },
      { text: 'Ett helt varv runt är 360°.', say: 'Ett helt varv runt är trehundrasextio grader.' },
    ],
  },
  'koordinatsystem': {
    scenes: [
      { text: 'Ett koordinatsystem är ett rutnät med två tallinjer: x-axeln ligger ner, y-axeln står upp.', say: 'Ett koordinatsystem är ett rutnät med två tallinjer. x-axeln ligger ner, y-axeln står upp.' },
      { text: 'Varje punkt har en adress med två tal. Vi letar upp punkten (3, 4).', say: 'Varje punkt har en adress med två tal. Vi letar upp punkten tre, fyra.' },
      { text: 'Vi börjar i nollpunkten, där axlarna möts.' },
      { text: 'Det första talet säger hur långt åt sidan: 3 steg åt höger.', say: 'Det första talet säger hur långt åt sidan. Tre steg åt höger.' },
      { text: 'Det andra talet säger hur långt uppåt: 4 steg upp.', say: 'Det andra talet säger hur långt uppåt. Fyra steg upp.' },
      { text: 'Där är punkten (3, 4)! Först längs golvet, sedan uppför trappan.', say: 'Där är punkten tre, fyra! Först längs golvet, sedan uppför trappan.' },
    ],
  },
  'talrad-0-100': {
    scenes: [
      { text: 'Här är alla tal från 1 till 100. De står i rader om tio.', minMs: 4500 },
      { text: 'Titta på en rad: 21, 22, 23 … ända till 29.', say: 'Titta på en rad. Tjugoett, tjugotvå, tjugotre, ända till tjugonio.', minMs: 5200 },
      { text: 'Efter 29 tar raden slut. Då börjar ett nytt tiotal: 30!', say: 'Efter tjugonio tar raden slut. Då börjar ett nytt tiotal. Trettio!' },
      { text: 'Så är det varje gång: 39, 40 … 49, 50 … 69, 70 … 99, 100!', say: 'Så är det varje gång. Trettionio, fyrtio. Fyrtionio, femtio. Sextionio, sjuttio. Nittionio, hundra!', minMs: 6500 },
      { text: 'Tiotalen står längst till höger: 10, 20, 30, 40, 50, 60, 70, 80, 90 — och 100.', say: 'Tiotalen står längst till höger. Tio, tjugo, trettio, fyrtio, femtio, sextio, sjuttio, åttio, nittio, och hundra.', minMs: 6000 },
      { text: 'Det finns inget som heter "tjugotio". Efter tjugonio kommer trettio!', say: 'Det finns inget som heter tjugotio. Efter tjugonio kommer trettio!' },
    ],
  },
  'tiotalsovergang-20': {
    scenes: [
      { text: '8 + 5 — hur gör man när svaret blir mer än tio?', say: 'Åtta plus fem. Hur gör man när svaret blir mer än tio?' },
      { text: 'Först fyller vi tiorutan. Där fattas två.' },
      { text: 'Vi flyttar två av de fem dit. Nu är tian full!', minMs: 4200 },
      { text: 'Utanför ligger tre kvar.' },
      { text: '10 + 3 = 13. Alltså är 8 + 5 = 13.', say: 'Tio plus tre är tretton. Alltså är åtta plus fem tretton.' },
      { text: 'Det kallas att gå via tian: fyll upp till tio först, lägg sedan till resten.' },
    ],
  },
  'vaxling-0-100': {
    scenes: [
      { text: '42 − 17. Vi bygger 42 med tiostavar och ental.', say: 'Fyrtiotvå minus sjutton. Vi bygger fyrtiotvå med tiostavar och ental.' },
      { text: 'Vi ska ta bort 7 ental — men det finns bara 2.', say: 'Vi ska ta bort sju ental. Men det finns bara två.' },
      { text: 'Då växlar vi: en tiostav blir tio ental. Nu finns det 12 ental.', say: 'Då växlar vi. En tiostav blir tio ental. Nu finns det tolv ental.', minMs: 4800 },
      { text: 'Nu kan vi ta bort 7 ental. 5 ental är kvar.', say: 'Nu kan vi ta bort sju ental. Fem ental är kvar.' },
      { text: 'Sedan tar vi bort 1 tiotal. 2 tiotal är kvar.', say: 'Sedan tar vi bort ett tiotal. Två tiotal är kvar.' },
      { text: '2 tiotal och 5 ental är 25. Alltså 42 − 17 = 25.', say: 'Två tiotal och fem ental är tjugofem. Alltså är fyrtiotvå minus sjutton tjugofem.' },
    ],
  },
  'likhetstecken': {
    scenes: [
      { text: 'Likhetstecknet = betyder: lika mycket på båda sidor. 5 + 3 = 8.', say: 'Likhetstecknet betyder: lika mycket på båda sidor. Fem plus tre är lika med åtta.' },
      { text: '8 = 5 + 3 är också rätt! Svaret behöver inte stå sist.', say: 'Åtta är lika med fem plus tre är också rätt! Svaret behöver inte stå sist.' },
      { text: 'Vad ska stå i rutan? 6 + 2 = □ + 5', say: 'Vad ska stå i rutan? Sex plus två är lika med rutan plus fem.' },
      { text: 'Vänster sida är 8. Då måste höger sida också bli 8.', say: 'Vänster sida är åtta. Då måste höger sida också bli åtta.' },
      { text: 'I rutan står 3, för 3 + 5 = 8. Vågen väger jämnt!', say: 'I rutan står tre, för tre plus fem är åtta. Vågen väger jämnt!' },
      { text: 'Fällan: att skriva 8 i rutan. Då blir höger sida 13 — och vågen tippar!', say: 'Fällan är att skriva åtta i rutan. Då blir höger sida tretton, och vågen tippar!' },
    ],
  },
  'klockan-hel-halv': {
    scenes: [
      { text: 'Klockan har två visare. Den korta visar timmen. Den långa visar minuterna.' },
      { text: 'När den långa visaren pekar rakt upp är klockan hel. Nu är klockan tre.' },
      { text: 'På en timme går den långa visaren ett helt varv. Titta — nu blir klockan fyra.', minMs: 5600 },
      { text: 'Nu har den långa visaren gått ett halvt varv och pekar rakt ner.', minMs: 4500 },
      { text: 'Den korta visaren står mitt emellan fyra och fem. Vi säger halv fem.' },
      { text: 'Halv fem är 4:30 — halvvägs till fem. Halv räknar alltid mot nästa timme!', say: 'Halv fem är fyra och trettio. Halvvägs till fem. Halv räknar alltid mot nästa timme!' },
    ],
  },
  'klockan-kvart': {
    scenes: [
      { text: 'En timme kan delas i fyra kvartar — som en pizza i fyra bitar.' },
      { text: 'Kvart över fyra: den långa visaren har gått en kvart av varvet, till trean.', minMs: 4500 },
      { text: 'Halv fem: två kvartar, ett halvt varv.', minMs: 4000 },
      { text: 'Kvart i fem: tre kvartar har gått — det är en kvart kvar till fem.', minMs: 4000 },
      { text: 'Fyra kvartar — ett helt varv. Nu är klockan fem.', minMs: 4000 },
      { text: 'Över betyder efter en hel timme. I betyder före nästa hela timme.' },
    ],
  },
  'klockan-minuter': {
    scenes: [
      { text: 'Mellan två siffror på klockan går det fem minuter.' },
      { text: 'Räkna femsteg: 5, 10, 15, 20. När den långa visaren pekar på fyran har det gått 20 minuter.', say: 'Räkna femsteg. Fem, tio, femton, tjugo. När den långa visaren pekar på fyran har det gått tjugo minuter.', minMs: 4500 },
      { text: 'Det heter tjugo över tre: 3:20.', say: 'Det heter tjugo över tre.' },
      { text: 'Fem i halv fyra: fem minuter kvar till halv. 3:25.', say: 'Fem i halv fyra. Fem minuter kvar till halv.' },
      { text: 'Fem över halv fyra: fem minuter efter halv. 3:35.', say: 'Fem över halv fyra. Fem minuter efter halv.' },
      { text: 'Tjugo i fyra: tjugo minuter kvar till fyra. 3:40.', say: 'Tjugo i fyra. Tjugo minuter kvar till fyra.' },
    ],
  },
  'medelvarde': {
    scenes: [
      { text: 'Fyra barn har 2, 6, 3 och 5 kulor. Hur många har de i medeltal?', say: 'Fyra barn har två, sex, tre och fem kulor. Hur många har de i medeltal?' },
      { text: 'Medelvärdet är hur många var och en skulle få om vi delade lika.' },
      { text: 'Vi flyttar kulor från de höga tornen till de låga …', minMs: 4500 },
      { text: 'Nu har alla lika många: fyra var. Medelvärdet är 4.', say: 'Nu har alla lika många. Fyra var. Medelvärdet är fyra.' },
      { text: 'Räkna: 2 + 6 + 3 + 5 = 16. 16 / 4 = 4.', say: 'Räkna. Två plus sex plus tre plus fem är sexton. Sexton delat med fyra är fyra.' },
      { text: 'Lägg ihop alla och dela med hur många de är — så får du medelvärdet.' },
    ],
  },
  'problemlosning-flerstegs': {
    scenes: [
      { text: 'Ali och Bea har tillsammans 30 kulor. Ali har 6 fler än Bea. Hur många har Bea?', say: 'Ali och Bea har tillsammans trettio kulor. Ali har sex fler än Bea. Hur många har Bea?' },
      { text: 'Vi ritar en stapel för var och en. Alis stapel är 6 längre.', say: 'Vi ritar en stapel för var och en. Alis stapel är sex längre.' },
      { text: 'Tillsammans är staplarna 30.', say: 'Tillsammans är staplarna trettio.' },
      { text: 'Tar vi bort de 6 extra blir staplarna lika långa — och tillsammans 24.', say: 'Tar vi bort de sex extra blir staplarna lika långa. Tillsammans tjugofyra.', minMs: 4500 },
      { text: 'Två lika långa staplar är 24. En stapel är 24 / 2 = 12.', say: 'Två lika långa staplar är tjugofyra. En stapel är tjugofyra delat med två. Tolv.' },
      { text: 'Bea har 12, Ali har 12 + 6 = 18. Kolla: 12 + 18 = 30!', say: 'Bea har tolv. Ali har tolv plus sex, arton. Kolla: tolv plus arton är trettio!' },
      { text: 'Det här är stapelmodellen: rita först, räkna sedan.' },
    ],
  },
  'sannolikhet-intro': {
    scenes: [
      { text: 'Chans betyder hur troligt något är. Vi tittar i en påse med kulor.' },
      { text: 'I påsen ligger 3 röda och 2 blå kulor. Hur stor är chansen att dra en röd?', say: 'I påsen ligger tre röda och två blå kulor. Hur stor är chansen att dra en röd?' },
      { text: 'Räkna ALLA kulor först: 5 stycken. Det blir nämnaren, talet under strecket.', say: 'Räkna alla kulor först. Fem stycken. Det blir nämnaren, talet under strecket.' },
      { text: 'Räkna sedan de röda: 3 stycken. Det blir täljaren, talet över strecket.', say: 'Räkna sedan de röda. Tre stycken. Det blir täljaren, talet över strecket.' },
      { text: 'Chansen att dra en röd kula är 3/5 — tre av fem.', say: 'Chansen att dra en röd kula är tre femtedelar. Tre av fem.' },
      { text: 'En tärning har 6 sidor. Chansen att slå en sexa är 1/6 — en av sex.', say: 'En tärning har sex sidor. Chansen att slå en sexa är en sjättedel. En av sex.' },
    ],
  },
  'skala': {
    scenes: [
      { text: 'En karta är en förminskad bild av verkligheten. Skalan säger hur mycket mindre.' },
      { text: 'Skala 1:1000 betyder: 1 cm på kartan är 1000 cm i verkligheten.', say: 'Skala ett till tusen betyder: en centimeter på kartan är tusen centimeter i verkligheten.' },
      { text: 'Vägen på kartan mäter vi med linjalen: 3 cm.', say: 'Vägen på kartan mäter vi med linjalen. Tre centimeter.', minMs: 4000 },
      { text: 'Varje centimeter är 1000 cm i verkligheten: 3 × 1000 = 3000 cm.', say: 'Varje centimeter är tusen centimeter i verkligheten. Tre gånger tusen är tretusen centimeter.' },
      { text: '100 cm är 1 meter, så 3000 cm är 30 meter.', say: 'Hundra centimeter är en meter, så tretusen centimeter är trettio meter.' },
      { text: 'Från kartan till verkligheten: gånger. Från verkligheten till kartan: delat.' },
    ],
  },
  'grafer': {
    scenes: [
      { text: 'Grafen visar vad godis kostar. Längs golvet: hekto. Uppåt: kronor.' },
      { text: 'Linjen visar priset för varje mängd godis.' },
      { text: 'Vad kostar 3 hg? Gå rakt upp från 3 tills du når linjen.', say: 'Vad kostar tre hekto? Gå rakt upp från tre tills du når linjen.', minMs: 3500 },
      { text: 'Gå sedan rakt åt vänster och läs av: 6 kr.', say: 'Gå sedan rakt åt vänster och läs av. Sex kronor.', minMs: 3500 },
      { text: 'Tvärtom: hur mycket får du för 8 kr? Gå in från 8 till linjen …', say: 'Tvärtom. Hur mycket får du för åtta kronor? Gå in från åtta till linjen.', minMs: 3500 },
      { text: '… och sedan rakt ner: 4 hg. Varje hekto kostar 2 kr.', say: 'Och sedan rakt ner. Fyra hekto. Varje hekto kostar två kronor.', minMs: 3500 },
    ],
  },
  'decimal-rakna': {
    scenes: [
      { text: 'Vi räknar 3,18 + 2,7. Kommat skiljer hela tal från delarna.', say: 'Vi räknar tre komma arton plus två komma sju. Kommat skiljer hela tal från delarna.' },
      { text: 'Ställ upp så att kommat hamnar rakt under kommat.', minMs: 3500 },
      { text: 'Fyll den tomma platsen med en nolla: 2,7 är samma som 2,70.', say: 'Fyll den tomma platsen med en nolla. Två komma sju är samma som två komma sjuttio.' },
      { text: 'Räkna som vanligt från höger: hundradelar, tiondelar, ental.', minMs: 4500 },
      { text: 'Kommat flyttar rakt ner i svaret: 5,88.', say: 'Kommat flyttar rakt ner i svaret. Fem komma åttioåtta.' },
      { text: 'Kom ihåg: komma under komma. Då räknas tiondelar med tiondelar.' },
    ],
  },
  'mult-div-stora': {
    scenes: [
      { text: 'Gånger 10: varje siffra flyttar ett steg åt vänster. 34 × 10 = 340.', say: 'Gånger tio. Varje siffra flyttar ett steg åt vänster. Trettiofyra gånger tio är trehundrafyrtio.', minMs: 3500 },
      { text: 'Den tomma entalsplatsen fylls med en nolla.' },
      { text: 'Delat med 10 är tvärtom: siffrorna flyttar åt höger. 340 / 10 = 34.', say: 'Delat med tio är tvärtom. Siffrorna flyttar åt höger. Trehundrafyrtio delat med tio är trettiofyra.', minMs: 3500 },
      { text: 'Större tal: 24 × 15. Dela upp 15 i 10 och 5.', say: 'Större tal. Tjugofyra gånger femton. Dela upp femton i tio och fem.' },
      { text: '24 × 10 = 240 och 24 × 5 = 120.', say: 'Tjugofyra gånger tio är tvåhundrafyrtio. Tjugofyra gånger fem är hundratjugo.' },
      { text: 'Lägg ihop delarna: 240 + 120 = 360.', say: 'Lägg ihop delarna. Tvåhundrafyrtio plus hundratjugo är trehundrasextio.' },
    ],
  },
  'add-sub-0-1000': {
    scenes: [
      { text: 'Stora tal räknar vi i en uppställning: hundratal under hundratal, tiotal under tiotal, ental under ental.' },
      { text: 'Vi räknar 245 + 138. Börja alltid med entalen: 5 + 8 = 13.', say: 'Vi räknar tvåhundrafyrtiofem plus hundratrettioåtta. Börja alltid med entalen. Fem plus åtta är tretton.' },
      { text: '13 är 1 tiotal och 3 ental. Skriv 3, och lägg tiotalet som en minnessiffra ovanför tiotalen.', say: 'Tretton är ett tiotal och tre ental. Skriv tre, och lägg tiotalet som en minnessiffra ovanför tiotalen.' },
      { text: 'Tiotalen: 4 + 3 + minnessiffran 1 = 8.', say: 'Tiotalen. Fyra plus tre plus minnessiffran ett är åtta.' },
      { text: 'Hundratalen: 2 + 1 = 3. Svaret är 383.', say: 'Hundratalen. Två plus ett är tre. Svaret är trehundraåttiotre.' },
      { text: 'Minus fungerar likadant — räcker inte entalen växlar du ett tiotal till tio ental.' },
    ],
  },
  'stora-tal': {
    scenes: [
      { text: 'Varje plats i ett tal har ett namn: ental, tiotal, hundratal, tusental, tiotusental.' },
      { text: 'I 13 479 står 9 på entalsplatsen och 7 på tiotalsplatsen.', say: 'I trettontusen fyrahundrasjuttionio står nio på entalsplatsen och sju på tiotalsplatsen.' },
      { text: '4 står på hundratalsplatsen. Där är den värd 400.', say: 'Fyra står på hundratalsplatsen. Där är den värd fyrahundra.' },
      { text: 'Varje steg åt vänster gör siffran tio gånger mer värd.' },
      { text: 'Plus 100: bara hundratalssiffran ökar med ett. 13 479 + 100 = 13 579.', say: 'Plus hundra. Bara hundratalssiffran ökar med ett. Trettontusen fyrahundrasjuttionio plus hundra är trettontusen femhundrasjuttionio.' },
      { text: 'Är siffran 9 blir den 10 — då växlar du till platsen till vänster, precis som över tian.' },
    ],
  },
  'tabeller-alla': {
    scenes: [
      { text: 'Tabellerna är gånger du kan utantill. Glömmer du en kan du bygga den av en du kan.' },
      { text: '6 × 7 är sex rader med sju prickar.', say: 'Sex gånger sju är sex rader med sju prickar.' },
      { text: 'Fem rader känner du igen: 5 × 7 = 35.', say: 'Fem rader känner du igen. Fem gånger sju är trettiofem.' },
      { text: 'Lägg till en rad till: 35 + 7 = 42. Alltså är 6 × 7 = 42.', say: 'Lägg till en rad till. Trettiofem plus sju är fyrtiotvå. Alltså är sex gånger sju fyrtiotvå.' },
      { text: 'Gånger 9 är gånger 10 minus en gång: 9 × 4 = 40 − 4 = 36.', say: 'Gånger nio är gånger tio minus en gång. Nio gånger fyra är fyrtio minus fyra, trettiosex.' },
      { text: 'Ordningen spelar ingen roll: 7 × 6 är samma som 6 × 7.', say: 'Ordningen spelar ingen roll. Sju gånger sex är samma som sex gånger sju.' },
    ],
  },
  'mult-div-samband': {
    scenes: [
      { text: 'Gånger och delat hör ihop, som en familj med tre tal.' },
      { text: 'Talen 6, 7 och 42 hör ihop: 6 × 7 = 42.', say: 'Talen sex, sju och fyrtiotvå hör ihop. Sex gånger sju är fyrtiotvå.' },
      { text: 'Byt plats: 7 × 6 = 42.', say: 'Byt plats. Sju gånger sex är fyrtiotvå.' },
      { text: 'Baklänges blir det delat: 42 / 7 = 6.', say: 'Baklänges blir det delat. Fyrtiotvå delat med sju är sex.' },
      { text: 'Och 42 / 6 = 7.', say: 'Och fyrtiotvå delat med sex är sju.' },
      { text: 'Ska du dela, fråga dig: vad gånger 7 blir 42?', say: 'Ska du dela, fråga dig: vad gånger sju blir fyrtiotvå?' },
    ],
  },
  'skriftlig-mult': {
    scenes: [
      { text: 'Uppställning gånger: 46 × 3. Vi tar en siffra i taget, från entalen.', say: 'Uppställning gånger. Fyrtiosex gånger tre. Vi tar en siffra i taget, från entalen.' },
      { text: 'Entalen: 6 × 3 = 18. Skriv 8 och spara 1 tiotal som minnessiffra.', say: 'Entalen. Sex gånger tre är arton. Skriv åtta och spara ett tiotal som minnessiffra.' },
      { text: 'Tiotalen: 4 × 3 = 12, plus minnessiffran 1 = 13.', say: 'Tiotalen. Fyra gånger tre är tolv, plus minnessiffran ett är tretton.' },
      { text: 'Skriv 13 längst fram. Svaret är 138.', say: 'Skriv tretton längst fram. Svaret är hundratrettioåtta.' },
      { text: 'Kolla med överslag: 46 är nästan 50, och 50 × 3 = 150. 138 är rimligt!', say: 'Kolla med överslag. Fyrtiosex är nästan femtio, och femtio gånger tre är hundrafemtio. Hundratrettioåtta är rimligt!' },
    ],
  },
  'kort-division': {
    scenes: [
      { text: 'Kort division: 84 / 4. Dela upp 84 i delar som är lätta att dela med 4.', say: 'Kort division. Åttiofyra delat med fyra. Dela upp åttiofyra i delar som är lätta att dela med fyra.' },
      { text: '84 är 8 tiotal och 4 ental: 84 = 80 + 4.', say: 'Åttiofyra är åtta tiotal och fyra ental. Åttio plus fyra.' },
      { text: 'Åtta tiotal i fyra lika grupper: två tiotal i varje. 80 / 4 = 20.', say: 'Åtta tiotal i fyra lika grupper. Två tiotal i varje. Åttio delat med fyra är tjugo.', minMs: 4000 },
      { text: 'Fyra ental i fyra grupper: ett i varje. 4 / 4 = 1.', say: 'Fyra ental i fyra grupper. Ett i varje. Fyra delat med fyra är ett.', minMs: 3500 },
      { text: 'Varje grupp har 20 + 1 = 21. Kolla: 21 × 4 = 84.', say: 'Varje grupp har tjugo plus ett, tjugoett. Kolla: tjugoett gånger fyra är åttiofyra.' },
      { text: 'Går det inte jämnt blir det en rest: 85 / 4 = 21, rest 1.', say: 'Går det inte jämnt blir det en rest. Åttiofem delat med fyra är tjugoett, rest ett.' },
    ],
  },
  'oppna-utsagor-100': {
    scenes: [
      { text: 'I en öppen utsaga gömmer sig ett tal: 36 − __ = 25.', say: 'I en öppen utsaga gömmer sig ett tal. Trettiosex minus vilket tal blir tjugofem?' },
      { text: 'Fråga dig: vad tar jag bort från 36 för att få 25?', say: 'Fråga dig: vad tar jag bort från trettiosex för att få tjugofem?' },
      { text: 'Räkna baklänges på tallinjen: från 25 upp till 36 är det 11 steg.', say: 'Räkna baklänges på tallinjen. Från tjugofem upp till trettiosex är det elva steg.', minMs: 4000 },
      { text: 'Det gömda talet är 11. Kolla: 36 − 11 = 25.', say: 'Det gömda talet är elva. Kolla: trettiosex minus elva är tjugofem.' },
      { text: 'Med gånger likadant: __ × 5 = 25. Vad gånger 5 blir 25? Jo, 5.', say: 'Med gånger likadant. Vilket tal gånger fem blir tjugofem? Jo, fem.' },
    ],
  },
  'monster-regler': {
    scenes: [
      { text: 'Talföljden 3, 7, 11, 15 … Vad är regeln?', say: 'Talföljden tre, sju, elva, femton och så vidare. Vad är regeln?' },
      { text: 'Titta på stegen mellan talen: plus 4, plus 4, plus 4.', say: 'Titta på stegen mellan talen. Plus fyra, plus fyra, plus fyra.' },
      { text: 'Regeln är: börja på 3 och lägg till 4 varje gång.', say: 'Regeln är: börja på tre och lägg till fyra varje gång.' },
      { text: 'Vilket tal står på plats 6? Fortsätt: 19 på plats 5, 23 på plats 6.', say: 'Vilket tal står på plats sex? Fortsätt. Nitton på plats fem, tjugotre på plats sex.' },
      { text: 'Eller räkna: från plats 1 till plats 6 är 5 steg om 4. 3 + 20 = 23.', say: 'Eller räkna. Från plats ett till plats sex är fem steg om fyra. Tre plus tjugo är tjugotre.' },
    ],
  },
  'symmetri': {
    scenes: [
      { text: 'En figur är symmetrisk om den kan vikas så att halvorna passar precis över varandra.' },
      { text: 'Vecket kallas spegellinje. Hjärtat har en lodrät spegellinje.' },
      { text: 'Vi viker: den vänstra halvan hamnar precis på den högra. Det stämmer!', minMs: 3500 },
      { text: 'Bokstaven A har också en lodrät spegellinje.' },
      { text: 'Men inte P: viker du den passar halvorna inte ihop.' },
      { text: 'Rektangelns diagonal är ingen spegellinje — viker du där hamnar hörnen fel.' },
    ],
  },
  'diagram-lasa': {
    scenes: [
      { text: 'Ett linjediagram visar hur något förändras, här temperaturen varje månad.' },
      { text: 'Hitta månaden längs golvet och gå rakt upp till linjen.', minMs: 3500 },
      { text: 'Sedan rakt åt vänster och läs av: i mars var det 8 grader.', say: 'Sedan rakt åt vänster och läs av. I mars var det åtta grader.', minMs: 3500 },
      { text: 'Mellan mars och april går linjen nedåt: från 8 till 6.', say: 'Mellan mars och april går linjen nedåt. Från åtta till sex.' },
      { text: 'Temperaturen minskade med 8 − 6 = 2 grader. Uppåt är mer, nedåt är mindre.', say: 'Temperaturen minskade med åtta minus sex, två grader. Uppåt är mer, nedåt är mindre.' },
    ],
  },
  'proportionalitet': {
    scenes: [
      { text: '3 bullar kostar 9 kr. Vad kostar 9 bullar?', say: 'Tre bullar kostar nio kronor. Vad kostar nio bullar?' },
      { text: '9 bullar är tre gånger så många som 3 bullar.', say: 'Nio bullar är tre gånger så många som tre bullar.' },
      { text: 'Då kostar de också tre gånger så mycket: 9 × 3 = 27 kr.', say: 'Då kostar de också tre gånger så mycket. Nio gånger tre är tjugosju kronor.' },
      { text: 'Ett annat sätt: en bulle kostar 9 / 3 = 3 kr. Nio bullar kostar 9 × 3 = 27 kr.', say: 'Ett annat sätt. En bulle kostar nio delat med tre, tre kronor. Nio bullar kostar nio gånger tre, tjugosju kronor.' },
      { text: 'Blir det ena dubbelt eller tre gånger så stort, blir det andra det också.' },
    ],
  },
  'kontroll-motsatt': {
    scenes: [
      { text: 'Du har räknat 52 − 18 = 34. Så här kollar du om det stämmer.', say: 'Du har räknat femtiotvå minus arton är trettiofyra. Så här kollar du om det stämmer.' },
      { text: 'Minus och plus tar ut varandra. Gå tillbaka med plus: 34 + 18.', say: 'Minus och plus tar ut varandra. Gå tillbaka med plus. Trettiofyra plus arton.', minMs: 3500 },
      { text: '34 + 18 = 52 — tillbaka vid starten. Svaret stämmer!', say: 'Trettiofyra plus arton är femtiotvå. Tillbaka vid starten. Svaret stämmer!' },
      { text: 'Hade du fått 36 hade 36 + 18 blivit 54, inte 52. Då vet du att något blev fel.', say: 'Hade du fått trettiosex hade trettiosex plus arton blivit femtiofyra, inte femtiotvå. Då vet du att något blev fel.' },
      { text: 'Delat kollar du med gånger: 42 / 6 = 7 stämmer om 7 × 6 = 42.', say: 'Delat kollar du med gånger. Fyrtiotvå delat med sex är sju stämmer om sju gånger sex är fyrtiotvå.' },
    ],
  },
  'overslagsrakning': {
    scenes: [
      { text: 'Överslag är att räkna ungefär, med runda tal.' },
      { text: 'Vi räknar 398 + 205. 398 ligger nära 400.', say: 'Vi räknar trehundranittioåtta plus tvåhundrafem. Trehundranittioåtta ligger nära fyrahundra.', minMs: 3500 },
      { text: '205 ligger nära 200.', say: 'Tvåhundrafem ligger nära tvåhundra.', minMs: 3500 },
      { text: '400 + 200 = 600. Svaret är ungefär 600.', say: 'Fyrahundra plus tvåhundra är sexhundra. Svaret är ungefär sexhundra.' },
      { text: 'Det exakta svaret 603 ligger nära 600. Med överslag ser du om ett svar är rimligt.', say: 'Det exakta svaret sexhundratre ligger nära sexhundra. Med överslag ser du om ett svar är rimligt.' },
    ],
  },
}

export const lessonFor = (momentId: string): Lesson | undefined => LESSONS[momentId]

export const sceneSpoken = (scene: LessonScene): string => scene.say ?? scene.text

/** Hur länge en scen visas: lästid för meningen (lugn barnröst, ca 14
    tecken/s) plus en paus att titta, aldrig kortare än animationen. */
export const sceneDurationMs = (scene: LessonScene): number =>
  Math.max(scene.minMs ?? 0, 2200 + sceneSpoken(scene).length * 72)
