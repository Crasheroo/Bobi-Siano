const VALID_CATS = new Set([
  'food', 'restaurants', 'transport', 'entertainment', 'subscriptions',
  'shopping', 'health', 'utilities', 'fitness', 'education', 'travel', 'other',
])

function buildPrompt(items) {
  return `Kategoryzuj polskie transakcje bankowe. Każda to opis przelewu lub płatności kartą.

Kategorie (użyj dokładnie tych angielskich identyfikatorów):
- food: zakupy spożywcze, sklepy (Biedronka, Lidl, Carrefour itp.)
- restaurants: restauracje, kawiarnie, fast food, dostawy jedzenia
- transport: paliwo, parking, autostrady, komunikacja, loty, Uber, Bolt
- entertainment: kino, gry, bilety, sport widowiskowy, kasyna
- subscriptions: Netflix, Spotify, Apple, Google, subskrypcje cyfrowe
- shopping: odzież, elektronika, Allegro, Amazon, sklepy non-food
- health: apteka, lekarz, stomatolog, szpital, drogeria
- utilities: czynsz, media, prąd, gaz, internet, telefon, ZUS, podatki, ubezpieczenie, składki
- fitness: siłownia, basen, klub sportowy, MultiSport
- education: szkoła, kursy, szkolenia, uczelnia, Udemy
- travel: hotel, Airbnb, wakacje, biuro podróży
- other: przelewy prywatne, nie pasuje do powyższych

Transakcje (JSON):
${JSON.stringify(items)}

Zwróć TYLKO tablicę JSON bez żadnego tekstu przed ani po:
[{"id":0,"cat":"..."},{"id":1,"cat":"..."},...]`
}

async function callGemini(items, apiKey) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(items) }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 2048 },
      }),
    }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `HTTP ${res.status}`)
  }
  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('Brak JSON w odpowiedzi')
  return JSON.parse(match[0])
}

/**
 * Categorise transactions whose category is 'other' using Gemini.
 * Returns {originalIndex: categoryId} for each transaction that was re-categorised.
 */
export async function aiCategorizeTransactions(transactions, apiKey) {
  if (!apiKey?.trim() || !transactions.length) return {}

  // Only process expense transactions that are currently 'other'
  const toProcess = transactions
    .map((tx, i) => ({ i, tx }))
    .filter(({ tx }) => tx.category === 'other' && tx.isExpense && !tx.isInternal)

  if (!toProcess.length) return {}

  const result = {}
  const CHUNK = 80 // stay well under token limits

  for (let offset = 0; offset < toProcess.length; offset += CHUNK) {
    const chunk = toProcess.slice(offset, offset + CHUNK)
    const items = chunk.map(({ tx }, ci) => ({ id: ci, desc: tx.description }))

    try {
      const parsed = await callGemini(items, apiKey)
      parsed.forEach(r => {
        if (r.id >= 0 && r.id < chunk.length && VALID_CATS.has(r.cat)) {
          result[chunk[r.id].i] = r.cat
        }
      })
    } catch (e) {
      console.warn('AI categorization chunk failed:', e.message)
      // continue with remaining chunks even if one fails
    }
  }

  return result
}
