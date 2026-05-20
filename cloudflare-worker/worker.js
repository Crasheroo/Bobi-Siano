/**
 * MoneyTrack — Cloudflare Worker (proxy do Anthropic API)
 *
 * Deploy:
 *   1. Wejdź na https://workers.cloudflare.com i zaloguj się
 *   2. Utwórz nowy Worker, wklej ten kod
 *   3. Dodaj sekret: Settings → Variables → Secret: ANTHROPIC_API_KEY = sk-ant-...
 *   4. Zapisz i pobierz URL workera (np. https://moneytrack.twoja-domena.workers.dev)
 *   5. Wklej ten URL jako VITE_API_URL w sekretach GitHuba
 */

export default {
  async fetch(request, env) {
    // CORS — pozwól tylko swojej domenie GitHub Pages
    const allowedOrigins = [
      'https://Crasheroo.github.io',
      'http://localhost:3000',
      'http://localhost:5173',
    ]

    const origin = request.headers.get('Origin') || ''
    const corsOrigin = allowedOrigins.includes(origin) ? origin : null

    const corsHeaders = corsOrigin ? {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    } : {}

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: corsOrigin ? 204 : 403, headers: corsHeaders })
    }

    if (!corsOrigin) {
      return new Response('Forbidden', { status: 403 })
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 })
    }

    const contentLength = parseInt(request.headers.get('Content-Length') || '0')
    if (contentLength > 102400) {
      return new Response('Payload Too Large', { status: 413 })
    }

    try {
      const body = await request.json()

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      })
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }
  },
}
