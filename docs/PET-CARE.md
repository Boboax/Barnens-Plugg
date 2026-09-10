# Husdjursomsorg och egna reaktioner

Alla fyra arter har nu sexton tecknade poser och en separat sovbild. Grodan kväker, räven rör öron och svans, axolotlen rör gälar och svans och draken behåller sin vingrörelse. WebP-bilderna har transparent bakgrund. Reduced-motion och lägrets rörelsepaus visar stillbilder.

I husdjurstältet kan barnen klappa, ge en gratis godbit, säga godnatt och väcka försiktigt. Sovande djur lämnas i fred tills de väcks. Omsorg sparas lokalt i frivilliga CampPet.care-fält; äldre profiler konverteras först vid en omsorgshandling. Ingen hunger minskar, ingen frånvaro bestraffas och inga mynt eller skolresultat ändras. Befintlig besökstid gäller. Namn, sovplatser och bäddar behålls.

Djurljuden är egna syntetiska fantasyljud via Web Audio: grodkväk, rävpip, vattenbubblor och ett lågt drakkurr med kristallklang. Tre tonhöjdsvariationer, korta volymkurvor, minst 1,4 sekunders paus och ingen automatisk uppspelning. Matning och klappning har en synlig reaktion på 2,2 sekunder. Ljud av sparas på enheten. Ljud stoppas när tältet lämnas, fliken döljs eller ljudet stängs av. Om ljud saknar stöd fungerar omsorgen ändå. Detta är stiliserade spelljud, inte inspelningar av verkliga djur. iPad-ljud behöver fortfarande lyssnas på på fysisk enhet.

Bildproduktion: built-in ImageGen med respektive originaldjur som referens. Tre 4×4-serier samt en 2×2-bild med fyra sovposer. Lokal bearbetning bevarade alpha, avlägsnade fristående rester från angränsande bildrutor och registrerade fötterna; inga nya bildanrop behövdes för friläggning. Motion-atlaser är 1536×1536, enskilda poser 384×384.

Filer i public/art/camp: woodland-frog-motion-v1.webp, woodland-frog-poster-v1.webp, dune-fox-motion-v1.webp, dune-fox-poster-v1.webp, reef-axolotl-motion-v1.webp, reef-axolotl-poster-v1.webp samt {woodland-frog,crystal-dragon,dune-fox,reef-axolotl}-sleep-v1.webp. Draken använder befintlig motion-v3/poster-v3.

Grafiken är en första animationsversion; bildrutorna kan behöva ytterligare manuell puts efter speltest. Matning använder glad reaktion och en tillfällig skål, ännu ingen separat tuggserie. Djurkläder, behovsmätare och fler leksaker ingår inte i denna version.

Validering: TypeScript, 177 enhetstester och produktionsbygge inklusive PWA passerade. Nya tester täcker äldre sparfiler, omsorg över omladdning, sömn/väckning, isolering mellan djur, oförändrade mynt/skolresultat och slut på besökstid.

