# Spec: fix-lista 1 — ledtrådsflödet + granskningsfynd (juli 2026)

Skriven av Fable efter granskning av allt nybyggt innehåll (steg 0–4 +
geometri-etapp A–D), för att byggas av Opus. Läs `CLAUDE.md` FÖRST — de
orubbliga principerna gäller varje rad. Punkterna är i prioritetsordning.
En commit + deploy per punkt 0–1; granskningsfynden (punkt 2) kan buntas.

---

## Punkt 0: "Försök igen"-flödet med automatisk Pi-ledtråd (beslutat med föräldern)

**Mål:** Vid fel svar ska barnet först få HJÄLP att komma rätt — inte facit.
Metodledtråd → nytt försök → först därefter (vid fel igen) förklaring + rätt
svar. Forskningsgrund: återkoppling på processnivå slår resultatnivå;
ledtrådstrappor med "bottenledtråd" är standard i beprövade tutorsystem.
Dokumentera avvägningen i `docs/PEDAGOGIK.md` (nytt avsnitt "Ledtrådstrappan").

**Gäller ENDAST `mode 'ovning'` i `TaskRunner.tsx`.** Prov (boss/koll),
diagnos och blixt rörs INTE.

### Flödet (intern tillståndsmaskin i TaskRunner — motorn rörs inte)
1. **Fel svar, försök 1** → ny fas `'retry'` (i stället för `'feedback'`):
   - `onComplete(result)` anropas PRECIS som idag med `correct: false` —
     första försöket är det som bokförs (rating, missuppfattningar,
     repetitionsutvärdering, combo-nollning). Omförsöket är ett rent UI-lager;
     försök 2 registreras ALDRIG i motorn. (Orubblig princip 5 intakt:
     framsteg styrs av appkod, opåverkat av omförsöket.)
   - En **Pi-bubbla visas automatiskt**: Pi-figuren (`mood="funderar"`) +
     pratbubbla med ledtråden + uppläsningsknapp (`speak(...)`, chip — stor
     "Lyssna" för FK som på uppgiften). ALDRIG autoplay.
   - Ledtrådstext, fallback-kedja (ingen generator behöver ändras i v1):
     a) `matchMisconception(task, given)` träffar → `misconceptionInfo(tag).childHint`
        (de missuppfattningsspecifika texterna finns redan och är skrivna som
        metodhjälp).
     b) Annars generisk processledtråd per uppgiftstyp:
        - har visual ≠ 'ingen': "Titta på bilden igen — den visar svaret. Räkna en gång till!"
        - numerisk utan bild: "Räkna en gång till, lugnt och fint. Du klarar det!"
        - flerval: "Läs alla svaren en gång till innan du väljer."
     c) (Framtida, EJ v1: valfritt `task.hint` per generator kan skjutas in
        först i kedjan.)
   - Knapp: **"Försök igen! ▶"** → tillbaka till svarsläget (numeriskt: töm
     inmatningen; flerval: den valda FELknappen inaktiveras/gråas).
   - Barn med chatten aktiverad (`chatReadyFor`): visa även en sekundär knapp
     **"Prata med Pi 💬"** som öppnar chattpanelen (befintlig mekanik i
     SessionScreen — lyft via callback-prop, t.ex. `onOpenChat?`). Chatten får
     ALDRIG öppnas automatiskt (dagstak 30 medd, latens, bara vissa barn).
2. **Rätt på försök 2** → varmt firande: "Där satt den! 💪" + `sfx.ratt()` +
   vanliga Nästa-knappen. INGEN ny bokföring i motorn.
3. **Fel på försök 2** → dagens feedbackfas oförändrad: missuppfattningsledtråd
   + förklaring + "Rätt svar: X" + Nästa. (Bottenledtråden — utan den fastnar
   barn och börjar chansa.)

### Undantag
- **Tvåvalsfrågor (2 alternativ, t.ex. Ja/Nej): INGET omförsök** — andra
  knappen är per definition rätt (noll lärande, ren gissning). Gå direkt till
  dagens feedbackfas.
- Flerval med 3 alternativ: omförsök OK (2 kvar), 4 alternativ: OK (3 kvar).
- Skattkistans bonusuppgift (ChestFrame i SessionScreen, mode 'ovning'):
  flödet gäller där också — det är vanlig övning.

### Verifiering
- Enhets-/komponentnivå: första försöket bokförs exakt en gång (spionera på
  onComplete), andra försöket bokförs aldrig; tvåval hoppar över retry.
- Playwright: svara fel numeriskt → Pi-bubbla med ledtråd syns, "Försök
  igen" tömmer rutan; svara rätt → "Där satt den!"; svara fel igen → dagens
  förklaring + rätt svar. Ja/Nej-uppgift → ingen retry-fas.

---

## Punkt 1: Blixtpassets knappsats — för smal och för tät (förälderns foto, IMG_1630)

**Symptom:** i blixtläget är sifferknapparna smala pelare tätt ihop mitt på
en nästan tom skärm — svårt för barnfingrar, särskilt Alberts otidsatta läge.

**Rotorsak (diagnostiserad):** `src/ui/screens/BlixtScreen.tsx` (~rad 197) —
containern runt prompt/svarsruta/knappsats är ett barn i en flexkolumn med
`alignItems: 'center'` och saknar egen bredd → den krymper till innehållets
bredd (~svarsrutans 160 px + padding). Knappsatsens `width: '100%'`
(Keypad `size="stor"`, `maxWidth: 460`) löses då mot den hopkrympta
föräldern och når aldrig 460 px.

**Fix:**
1. Ge containern `width: '100%'` (alt. `alignSelf: 'stretch'`) så Keypad
   når sin maxWidth.
2. Öka samtidigt `stor`-läget i `Keypad.tsx`: `maxWidth` 460 → 520 och
   `gap` 12 → 16, så knapparna blir både större och luftigare (mål: minst
   ~140 px breda knappar på iPad, väl över Apples 44 pt-minimum).
3. Verifiera med Playwright-skärmdump på 1024×768 att knappbredden ≥ 140 px
   och att inget svämmar över på iPhone-bredd (390 px — maxWidth '100%' ska
   hålla).

---

## Punkt 2: Granskningsfynd

(Fylls i av granskningen — se nedan.)
