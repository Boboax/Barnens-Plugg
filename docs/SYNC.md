# Familjesynk — uppsättning (Cloudflare)

Synken låter barnen fortsätta på en annan enhet. Den är **frivillig** och
ägs helt av föräldern: din egen Cloudflare Worker, ditt eget lagringsutrymme,
din egen familjekod. Utan inställd synk fungerar appen precis som förut
(all data lokalt).

**Vad synkas:** barnens profiler, framsteg, streaks, belöningar, chattlogg.
**Vad synkas ALDRIG:** föräldra-PIN, AI-nyckeln, själva familjekoden.

**Krockregeln:** nyaste versionen av *varje barn* vinner. Olika barn på
olika plattor samtidigt går bra — samma barn på två plattor exakt samtidigt
ska undvikas (den som laddas upp sist vinner för det barnet).

## Engångsuppsättning (~5 minuter, i Cloudflare-panelen)

1. **Skapa lagringsutrymmet:** dash.cloudflare.com → *Storage & Databases*
   → *KV* → **Create a namespace** → namn t.ex. `plugg-sync`.

2. **Skapa Workern:** *Workers & Pages* → **Create** → *Create Worker* →
   namn t.ex. `plugg-sync` → **Deploy**. Tryck sedan **Edit code**, radera
   exempelkoden och klistra in hela innehållet i `cloud/sync-worker.js`
   från det här repot → **Deploy**.

3. **Koppla lagringen:** Workerns sida → *Settings* → *Bindings* →
   **Add** → *KV namespace* → Variable name: `PLUGG_KV`, Namespace:
   `plugg-sync` → spara (kräver ny deploy om panelen ber om det).

4. **Sätt familjekoden:** *Settings* → *Variables and Secrets* → **Add** →
   Type: *Secret*, Name: `SYNC_SECRET`, Value: en lång egen kod
   (t.ex. tre slumpord + siffror, minst 16 tecken) → spara.

5. **Kopiera Workerns adress** (ser ut som
   `https://plugg-sync.DITTKONTO.workers.dev`).

## I appen

Den korta, säkra ordningen finns i **`docs/FAMILJESYNK-LATHUND.md`**.

På huvudenheten: skriv in adress + familjekod → **Spara adress och kod** →
**Skapa molnet från denna iPad**. Appen vägrar skriva över ett moln som redan
innehåller data.

På övriga enheter: exportera först backup → skriv in samma adress + kod →
**Spara adress och kod** → **Hämta molnprofiler hit**. Gamla lokala profiler
skickas inte medan uppsättningen väntar och blandas därför inte in av misstag.

Därefter sköter appen sig själv: den hämtar vid varje start och laddar upp
efter varje ändring. **Synka nu** finns kvar för manuell kontroll.

## Bra att veta

- Datat ligger som EN post i din KV-namnrymd — du kan titta på den och
  radera den när som helst i Cloudflare-panelen.
- Gratisnivån räcker med god marginal (1 000 skrivningar/dag; appen gör
  en per avslutad aktivitet).
- Byter du familjekod: uppdatera hemligheten i Cloudflare OCH i appens
  föräldraläge på varje enhet.
