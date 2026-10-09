/* Testläget (snabbknappar för testfamilj, mynt och strider) får BARA finnas
   på testadresserna — aldrig i appen barnen kör. Avgörs vid bygget:
   Cloudflare Pages sätter CF_PAGES=1 och CF_PAGES_BRANCH under sina byggen.
   - GitHub Pages (barnens app) har inga CF-variabler → av.
   - Cloudflares produktionsbygge av main → av.
   - Cloudflares förhandsbygge av en annan gren → på.
   TESTLAGE=1 slår på det lokalt (npm run build / vite preview). */
export function testlageEnabled(env: Record<string, string | undefined>): boolean {
  if (env.TESTLAGE === '1') return true
  return env.CF_PAGES === '1' && !!env.CF_PAGES_BRANCH && env.CF_PAGES_BRANCH !== 'main'
}
