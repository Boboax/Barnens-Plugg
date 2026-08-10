/* ============================================================
   Räknarnas rike — familjesynk (Cloudflare Worker)

   Klistras in i en Worker i Cloudflare-panelen (guide:
   docs/SYNC.md). Lagrar EN nyckel ("household") i KV — hela
   familjens speldata som en JSON-fil. Skyddas av en hemlig
   familjekod som föräldern väljer och matar in i appens
   föräldraläge på varje enhet.

   Kräver i panelen:
   - KV-namnrymd bunden som  PLUGG_KV
   - Hemlighet (variabel)    SYNC_SECRET  = familjekoden
   ============================================================ */

const MAX_BYTES = 20_000_000 // KV-tak är 25 MB; kladdbilder tar plats

// CORS: öppet — hemligheten (Bearer) är det som skyddar datat,
// och appen ska kunna köras både från GitHub Pages och lokalt.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS })

    const auth = request.headers.get('Authorization') ?? ''
    if (!env.SYNC_SECRET || auth !== `Bearer ${env.SYNC_SECRET}`) {
      return new Response('Fel familjekod', { status: 401, headers: CORS })
    }

    if (request.method === 'GET') {
      const data = await env.PLUGG_KV.get('household')
      return new Response(data ?? 'null', {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    if (request.method === 'PUT') {
      const body = await request.text()
      if (body.length > MAX_BYTES) return new Response('För stor', { status: 413, headers: CORS })
      // Rimlighetskoll: bara data som ser ut som ett hushåll släpps in.
      try {
        const parsed = JSON.parse(body)
        if (!Array.isArray(parsed.children)) throw new Error()
      } catch {
        return new Response('Ogiltig data', { status: 400, headers: CORS })
      }
      await env.PLUGG_KV.put('household', body)
      return new Response('ok', { headers: CORS })
    }

    return new Response('Metod stöds ej', { status: 405, headers: CORS })
  },
}
