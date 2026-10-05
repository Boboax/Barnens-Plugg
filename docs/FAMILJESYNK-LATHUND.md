# Lathund: familjesynk mellan iPads

Den rekommenderade första installationen är en **ren molnstart**. Gamla lokala
profiler sparas först som backup, men förs inte in i det nya molnhushållet.

## Du behöver

- ett kostnadsfritt Cloudflare-konto
- en lång familjekod (minst 16 tecken, gärna tre slumpord och siffror)
- tillgång till varje iPad
- ungefär 10–15 minuter utöver barnens nya startdiagnoser

## 1. Skapa synktjänsten i Cloudflare

1. Skapa en KV-namnrymd, exempelvis `plugg-sync`.
2. Skapa en Cloudflare Worker, exempelvis `barnens-plugg-sync`.
3. Ersätt exempelkoden med hela innehållet i `cloud/sync-worker.js` och publicera.
4. Lägg till en KV-binding:
   - variabelnamn: `PLUGG_KV`
   - namnrymd: den du skapade i steg 1
5. Lägg till en krypterad hemlighet:
   - namn: `SYNC_SECRET`
   - värde: din familjekod
6. Kopiera Workerns HTTPS-adress, normalt en adress som slutar på `workers.dev`.

Använd en ny, tom KV-namnrymd vid den första rena starten. Appen vägrar skriva
över ett moln som redan innehåller data.

## 2. Förbered huvudenheten

1. Öppna **Förälder → Säkerhet** på den iPad som ska vara huvudenhet.
2. Tryck **Exportera nu** och spara backupfilen i Filer, iCloud Drive eller via AirDrop.
3. Under **Familjesynk**, fyll i Workerns adress och familjekoden.
4. Tryck **Spara adress och kod**. Synken väntar nu och skickar ingenting.
5. Tryck **Nollställ för ny molnstart** och godkänn varningen.
6. Skapa barnens nya profiler. De börjar med en ny diagnos.
7. Gå tillbaka till **Förälder → Säkerhet → Familjesynk**.
8. Tryck **Skapa molnet från denna iPad**.
9. Kontrollera att statusraden säger att molnhushållet har skapats.

## 3. Anslut övriga iPads

Gör detta på en iPad i taget.

1. Exportera först en lokal säkerhetskopia även på denna iPad.
2. Fyll i exakt samma Worker-adress och familjekod.
3. Tryck **Spara adress och kod**. Ingen gammal lokal data skickas.
4. Tryck **Hämta molnprofiler hit** och godkänn varningen.
5. Kontrollera att rätt barnprofiler visas på startskärmen.
6. Upprepa på nästa iPad.

## Till vardags

- Olika barn kan spela på olika iPads samtidigt.
- Undvik att samma barn spelar på två iPads samtidigt; senast uppladdade hela
  barnprofil vinner.
- Appen hämtar molnet vid start och laddar upp några sekunder efter ändringar.
- Tryck gärna **Synka nu** innan samma barn byter iPad direkt.
- Offline-spel fungerar och laddas upp när enheten åter har kontakt.

## Om något blir fel

1. Slå av synken på den berörda iPaden.
2. Importera den senast korrekta backupfilen under **Säkerhetskopia**.
3. Kontrollera profilerna lokalt innan synken aktiveras igen.
4. Skapa inte om molnet från enheten om appen säger att molnet redan innehåller data.

PIN-kod, AI-nyckel och familjekod synkas aldrig. Barnens profiler, framsteg,
mynt, husdjur, utrustning och belöningar lagras i familjens Cloudflare KV.
