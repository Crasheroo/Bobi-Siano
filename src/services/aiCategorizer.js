const STANDARD_CATS = new Set([
  'food', 'restaurants', 'transport', 'entertainment', 'subscriptions',
  'shopping', 'health', 'utilities', 'fitness', 'education', 'travel', 'other',
])

const CAT_NORMALIZE = {
  'jedzenie': 'food', 'spożywcze': 'food', 'supermarket': 'food', 'sklep spożywczy': 'food',
  'restauracje': 'restaurants', 'jedzenie na mieście': 'restaurants', 'gastronomia': 'restaurants',
  'transport': 'transport', 'paliwo': 'transport', 'komunikacja': 'transport',
  'rozrywka': 'entertainment', 'entertainment': 'entertainment',
  'subskrypcje': 'subscriptions', 'streaming': 'subscriptions',
  'zakupy': 'shopping', 'odzież': 'shopping', 'elektronika': 'shopping',
  'zdrowie': 'health', 'apteka': 'health', 'lekarz': 'health',
  'rachunki': 'utilities', 'media': 'utilities', 'czynsz': 'utilities',
  'wynajem': 'utilities', 'podatki': 'utilities', 'zus': 'utilities',
  'ubezpieczenie': 'utilities', 'składki': 'utilities',
  'fitness': 'fitness', 'siłownia': 'fitness', 'sport': 'fitness',
  'edukacja': 'education', 'szkolenia': 'education',
  'podróże': 'travel', 'wakacje': 'travel', 'hotel': 'travel',
  'inne': 'other', 'nieznane': 'other', 'przelew': 'other',
}

const AI_CAT_ICONS = ['🏷️', '🎁', '🎮', '💇', '☕', '🎨', '🔧', '🎵', '⚽', '🌿', '👗', '🐾', '💰', '🏠', '🐶', '🧴', '🍕', '🧸', '🚴', '🌊']
const AI_CAT_COLORS = ['#0a84ff', '#30d158', '#ff9f0a', '#bf5af2', '#5ac8fa', '#ff6b35', '#ffd60a', '#64d2ff', '#ff375f', '#34c759']

function slugify(label) {
  return 'ai_' + label.toLowerCase()
    .replace(/ą/g, 'a').replace(/ę/g, 'e').replace(/ó/g, 'o').replace(/ś/g, 's')
    .replace(/ł/g, 'l').replace(/ż/g, 'z').replace(/ź/g, 'z').replace(/ć/g, 'c')
    .replace(/ń/g, 'n').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

// Returns the standard category ID if it matches, or null if it's a new category name
function resolveStandardCat(raw) {
  if (!raw) return 'other'
  const s = raw.toLowerCase().trim()
  if (STANDARD_CATS.has(s)) return s
  return CAT_NORMALIZE[s] || null
}

function buildPrompt(items) {
  return `Kategoryzuj polskie transakcje bankowe. Każda to opis przelewu lub płatności kartą.

Standardowe kategorie (użyj angielskiego ID jeśli pasuje):
- food: zakupy spożywcze, sklepy (Biedronka, Lidl, Carrefour itp.)
- restaurants: restauracje, kawiarnie, fast food, dostawy jedzenia
- transport: paliwo, parking, autostrady, komunikacja, loty, Uber, Bolt
- entertainment: kino, gry, bilety, sport widowiskowy, kasyna
- subscriptions: Netflix, Spotify, Apple, Google, subskrypcje cyfrowe
- shopping: odzież, elektronika, Allegro, Amazon, sklepy non-food
- health: apteka, lekarz, stomatolog, szpital, drogeria
- utilities: czynsz, media, prąd, gaz, internet, telefon, ZUS, podatki, ubezpieczenie
- fitness: siłownia, basen, klub sportowy, MultiSport
- education: szkoła, kursy, szkolenia, uczelnia, Udemy
- travel: hotel, Airbnb, wakacje, biuro podróży
- other: przelewy prywatne, wypłaty gotówki, nieznane

Jeśli żadna nie pasuje — zwróć krótką nazwę kategorii po polsku (max 2 słowa, np. "Zwierzęta", "Dzieci", "Kryptowaluty"). Nie używaj "other" gdy masz lepszy pomysł.

Transakcje (JSON):
${JSON.stringify(items)}

Zwróć TYLKO tablicę JSON, bez żadnego tekstu:
[{"id":0,"cat":"food"},{"id":1,"cat":"Zwierzęta"},...]`
}

async function callGemini(items, apiKey) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
    const msg = err?.error?.message || err?.error?.status || `HTTP ${res.status}`
    throw new Error(msg)
  }
  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('Brak JSON w odpowiedzi')
  return JSON.parse(match[0])
}

/**
 * Categorise transactions whose category is 'other' using Gemini.
 * AI maps to standard categories when possible, or returns a Polish name
 * which becomes a new custom category.
 *
 * Returns {
 *   cats:    { originalIndex: categoryId },
 *   newCats: [{ id, label, icon, color }]
 * }
 */
export async function aiCategorizeTransactions(transactions, apiKey) {
  if (!apiKey?.trim() || !transactions.length) return { cats: {}, newCats: [] }

  const toProcess = transactions
    .map((tx, i) => ({ i, tx }))
    .filter(({ tx }) => tx.category === 'other')

  if (!toProcess.length) return { cats: {}, newCats: [], __none: true }

  const cats = {}
  const newCatsMap = {}
  let iconIdx = 0
  let colorIdx = 0
  const CHUNK = 80

  for (let offset = 0; offset < toProcess.length; offset += CHUNK) {
    const chunk = toProcess.slice(offset, offset + CHUNK)
    const items = chunk.map(({ tx }, ci) => ({ id: ci, desc: tx.description }))

    const parsed = await callGemini(items, apiKey)
    parsed.forEach(r => {
      if (r.id < 0 || r.id >= chunk.length) return
      const txIdx = chunk[r.id].i
      const raw = (r.cat || r.category || r.kategoria || '').trim()
      const standard = resolveStandardCat(raw)

      if (standard) {
        cats[txIdx] = standard
      } else if (raw) {
        // AI returned a custom Polish category name
        const slug = slugify(raw)
        if (!newCatsMap[slug]) {
          newCatsMap[slug] = {
            id: slug,
            label: raw.charAt(0).toUpperCase() + raw.slice(1),
            icon: AI_CAT_ICONS[iconIdx++ % AI_CAT_ICONS.length],
            color: AI_CAT_COLORS[colorIdx++ % AI_CAT_COLORS.length],
          }
        }
        cats[txIdx] = slug
      } else {
        cats[txIdx] = 'other'
      }
    })
  }

  return { cats, newCats: Object.values(newCatsMap) }
}
