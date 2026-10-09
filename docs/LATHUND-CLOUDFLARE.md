# Lathund: testa nya versioner och slå på familjesynken

Två saker som båda görs i Cloudflare-panelen (dash.cloudflare.com):

- **Del A — förhandsvisning:** en egen testadress för varje gren i repot, så att du kan prova
  nya funktioner (till exempel Kvällslägret) på riktig iPad utan att röra barnens app.
- **Del B — familjesynk:** barnens profiler i ditt eget moln, så att de kan fortsätta på
  vilken iPad som helst.

Del A och B är oberoende av varandra. Ordningen spelar ingen roll.

> Cloudflare byter ibland namn och plats på menyerna. Stämmer inte en knapp exakt, leta
> efter närmaste motsvarighet — stegen i sak är desamma.

---

## Del A — förhandsvisning med Cloudflare Pages (cirka 10 minuter)

Barnens app ligger kvar på GitHub Pages (`boboax.github.io/Barnens-Plugg/`) och byggs bara från
`main`. Cloudflare Pages blir en **separat** testkopia som byggs från alla grenar.

### Engångsuppsättning

1. dash.cloudflare.com → **Workers & Pages** → **Create**. Cloudflare visar först sitt nyare
   Workers-flöde ("Create and deploy") — det saknar fälten nedan. Leta i stället efter fliken
   **Pages** eller länken *"Looking to deploy Pages? Get started"* → **Import an existing Git
   repository**.
2. Logga in med GitHub och ge Cloudflare åtkomst till repot `boboax/Barnens-Plugg`
   (räcker att välja just det repot).
3. Inställningar för bygget:

   | Fält | Värde |
   |---|---|
   | Project name | `barnens-plugg` (blir en del av adressen) |
   | Production branch | `main` |
   | Framework preset | `Vite` (eller *None*) |
   | Build command | `npm run build` |
   | Build output directory | `dist` |

4. Under **Environment variables** lägg till två variabler:

   | Namn | Värde | Varför |
   |---|---|---|
   | `BASE_PATH` | `/` | Appen är byggd för undermappen `/Barnens-Plugg/` på GitHub. Hos Cloudflare ligger den i roten. |
   | `NODE_VERSION` | `22` | Samma Node-version som appen byggs med i GitHub. |

5. **Save and Deploy.** Första bygget tar 1–2 minuter.

### Så använder du det

- Adressen till `main` står överst i projektet. Är namnet `barnens-plugg` upptaget lägger
  Cloudflare till ett suffix (t.ex. `barnens-plugg-abc.pages.dev`); använd det namnet nedan.
- En gren får sin testadress först när något pushas till den EFTER att kopplingen gjorts.
- Varje gren får en egen, fast adress. Snedstreck blir bindestreck, till exempel:
  `https://feature-lager-etapp-0-1.barnens-plugg.pages.dev`
  Adresserna står under projektet → **Deployments**.
- Varje ny push till en gren byggs om automatiskt. Ladda om sidan på iPaden (eller stäng och
  öppna appen två gånger om du lagt den på hemskärmen).
- Öppna adressen i Safari på iPaden. Vill du testa som barnen gör: **Dela → Lägg till på
  hemskärmen.** Den hamnar som en egen ikon bredvid barnens app.

### Viktigt att veta

- **Testkopian har egen lagring.** Profiler du skapar där syns inte i barnens app och tvärtom.
  Skapa en testprofil, eller läs in en exportfil från barnens app
  (Föräldraläge → Säkerhet → *Läs in kopia*) för att testa med riktiga framsteg.
- **Koppla aldrig testkopian till familjesynken** (del B). Då hamnar testprofiler och halvfärdiga
  funktioner hos barnen. Vill du testa synken: gör en andra Worker enligt del B med ett annat
  namn (t.ex. `plugg-sync-test`) och använd bara den i testkopian.
- Adressen är inte hemlig men inte heller länkad någonstans. Vill du låsa den kan du lägga
  **Cloudflare Access** framför (projektet → *Settings* → *Access policy*), men det behövs inte.
- Gratisnivån räcker gott (500 byggen per månad).

---

## Del B — familjesynk mellan iPads (cirka 15 minuter)

Synken är redan byggd i appen. Det som behövs är en liten synktjänst hos Cloudflare
(din egen, med din egen kod) och att varje iPad kopplas på i rätt ordning.

**Synkas:** profiler, framsteg, streaks, belöningar, chattlogg (och Kvällslägret när det kommer).
**Synkas aldrig:** föräldra-PIN, AI-nyckeln, familjekoden.
**Krockregel:** den nyaste versionen av *varje barn* vinner. Olika barn på olika iPads samtidigt
går bra. Samma barn på två iPads exakt samtidigt ska undvikas.

### Steg 1 — Synktjänsten i Cloudflare (en gång)

1. **Lagring:** *Storage & Databases* → **KV** → **Create a namespace** → namn `plugg-sync`.
2. **Workern:** *Workers & Pages* → **Create** → *Create Worker* → namn `plugg-sync` →
   **Deploy**. Tryck **Edit code**, radera exempelkoden, klistra in hela filen
   `cloud/sync-worker.js` från repot → **Deploy**.
3. **Koppla lagringen:** Workerns sida → *Settings* → *Bindings* → **Add** → *KV namespace* →
   Variable name `PLUGG_KV`, namespace `plugg-sync` → spara.
4. **Familjekoden:** *Settings* → *Variables and Secrets* → **Add** → Type *Secret*,
   Name `SYNC_SECRET`, Value en lång egen kod (tre slumpord och siffror, minst 16 tecken).
   Spara koden i din lösenordshanterare — den skrivs in på varje iPad.
5. **Kopiera adressen,** till exempel `https://plugg-sync.DITTKONTO.workers.dev`.
   Kontroll: öppnar du adressen i en webbläsare ska det stå *Fel familjekod*. Då lever den.

### Steg 2 — Kolla var profilerna finns

Profilerna känns igen på ett internt id, **inte** på namnet. Det avgör hur du gör:

- **Varje barn har bara spelat på sin egen iPad** (profilen skapades där): inga dubbletter
  kan uppstå. Gå direkt till steg 3 och koppla på iPadarna i valfri ordning.
- **Samma barn finns som separat skapad profil på flera iPads** (till exempel både på sin egen
  och på din): efter synken syns barnet två gånger, och de två profilernas framsteg går inte
  att slå ihop. Bestäm vilken som är den riktiga och följ steg 4 för den iPad som har kopian.

### Steg 3 — Koppla på varje iPad

På varje iPad, en i taget:

1. Föräldraläge → Säkerhet → **Exportera nu.** Spara filen i Filer (skyddsnät).
2. *Familjesynk*: skriv in adressen och familjekoden → **Spara** → **Synka nu.**
3. Statusraden visar till exempel *Synkat! 2 barn i molnet.* Antalet växer för varje iPad
   du kopplar på, tills alla barn finns med.

Appen hämtar alltid molnet och slår ihop innan den laddar upp, så ordningen spelar ingen roll
och ingen iPad kan skriva över en annans profiler.

### Steg 4 — Bara om ett barn finns dubbelt

Gäller iPaden som har den profil du *inte* vill behålla:

1. **Exportera nu** på den iPaden (om du vill spara kopians framsteg).
2. Läs in exportfilen från iPaden som har den riktiga profilen: Säkerhet → **Läs in kopia**.
   Alla lokala profiler på den här iPaden ersätts med filens, med rätt id.
3. Exportfilen innehåller aldrig PIN eller synkinställning. Sätt PIN igen om appen ber om det
   och skriv in synkadressen och koden igen → **Spara** → **Synka nu.**

### Steg 5 — Kontrollera

Låt ett barn göra en uppgift på iPad 1. Stäng appen på iPad 2 helt och öppna den igen
(appen hämtar molnet vid varje start). Framsteget ska synas. Klart.

### Vardagsregler

- **Öppna appen med internet** när det går. Appen hämtar vid start och laddar upp efter varje
  ändring. Startar en iPad helt utan nät spelar barnet lokalt; nästa gång nätet finns slås det ihop.
- **Ett barn på en iPad i taget.** Med varsin iPad händer det knappast, men spelar samma barn
  på två iPads samtidigt vinner den senaste versionen av just det barnet.
- **Alla profiler syns på alla iPads** efter synken (det är så ett barn kan fortsätta på en
  annan iPad). Ett barn kan alltså trycka på ett syskons profil i profilvalet.
- **Exportera ibland ändå,** till exempel en gång i månaden från valfri iPad (efter synk innehåller filen alla barn). Molnet är
  bekvämlighet, exportfilen är livlinan.
- **Uppdatera alla iPads ungefär samtidigt** när en större nyhet kommer (som Kvällslägret).
  Äldre versioner klarar nyare data, men det är enklast om alla kör samma.

### Om något går fel

| Det står | Gör så här |
|---|---|
| *Fel familjekod* | Koden i appen och `SYNC_SECRET` i Cloudflare skiljer sig. Skriv in den igen på båda ställen. |
| *Kunde inte nå synktjänsten (offline?)* | Inget nät, eller fel adress. Kontrollera adressen i en webbläsare. |
| Dubbla profiler med samma namn | Två separat skapade profiler för samma barn. Följ steg 4. |
| Vill börja om helt | Cloudflare → KV → `plugg-sync` → ta bort posten `household`. Tryck sedan **Synka nu** på varje iPad. |
| Vill stänga av | Familjesynk → **Slå av synk** på varje iPad. Data finns kvar lokalt. Radera KV-posten om du vill tömma molnet. |

Gratisnivån räcker med god marginal (1 000 skrivningar per dag; appen gör en per avslutad aktivitet).
