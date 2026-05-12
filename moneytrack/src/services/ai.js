import { AI_MODEL } from '../utils/constants.js'
import { AI_MODEL } from '../utils/constants.js'

// Na produkcji (GitHub Pages) ustaw VITE_API_URL na URL swojego Cloudflare Worker.
// Lokalnie możesz użyć VITE_ANTHROPIC_API_KEY w pliku .env.local
const API_URL = import.meta.env.VITE_API_URL || 'https://api.anthropic.com/v1/messages'

async function fetchClaude(body) {
  const headers = { 'Content-Type': 'application/json' }
  if (import.meta.env.VITE_ANTHROPIC_API_KEY) {
    headers['x-api-key'] = import.meta.env.VITE_ANTHROPIC_API_KEY
    headers['anthropic-version'] = '2023-06-01'
  }
  const response = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`API Error: ${response.status}`)
  return response.json()
}

export async function callClaude(messages, systemPrompt = '') {
  const data = await fetchClaude({ model: AI_MODEL, max_tokens: 1000, system: systemPrompt, messages })
  return data.content.map((b) => b.text || '').join('')
}

export async function analyzeReceipt(base64Image, mimeType = 'image/jpeg') {
  const data = await fetchClaude({
    model: AI_MODEL,
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64Image } },
        { type: 'text', text: 'Przeanalizuj ten paragon i zwróć TYLKO JSON: {"store":"nazwa","total":liczba,"date":"YYYY-MM-DD lub null","category":"food|transport|entertainment|health|shopping|restaurants|utilities|subscriptions|fitness|education|travel|other","items":[{"name":"nazwa","price":liczba}]}' },
      ],
    }],
  })
  const text = data.content.map((b) => b.text || '').join('')
  try { return JSON.parse(text.replace(/```json|```/g, '').trim()) } catch { return null }
}

export function buildFinancialContext(store) {
  const { profile, expenses, recurring, getCurrentMonthExpenses, getMonthlyRecurringTotal } = store
  const monthExpenses = getCurrentMonthExpenses()
  const recurringTotal = getMonthlyRecurringTotal()
  const expensesTotal = monthExpenses.reduce((s, e) => s + e.amount, 0)
  const byCategory = {}
  monthExpenses.forEach((e) => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount })
  const last3Months = []
  for (let i = 2; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i)
    const m = d.getMonth(), y = d.getFullYear()
    const total = expenses.filter((e) => { const ed = new Date(e.date); return ed.getMonth() === m && ed.getFullYear() === y }).reduce((s, e) => s + e.amount, 0)
    last3Months.push({ month: d.toLocaleDateString('pl-PL', { month: 'long' }), total })
  }
  return `Dane finansowe:
- Wynagrodzenie netto: ${profile.salary} PLN/mies.
- Stałe wydatki: ${recurringTotal.toFixed(2)} PLN
- Wydatki ten miesiąc: ${expensesTotal.toFixed(2)} PLN
- Zostało: ${(profile.salary - recurringTotal - expensesTotal).toFixed(2)} PLN
- Kategorie: ${JSON.stringify(byCategory)}
- Ostatnie 3 miesiące: ${JSON.stringify(last3Months)}
- Stałe płatności: ${recurring.filter((r) => r.active).map((r) => `${r.name}: ${r.amount} PLN`).join(', ')}`
}


export async function callClaude(messages, systemPrompt = '') {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: 1000,
      system: systemPrompt,
      messages,
    }),
  })

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`)
  }

  const data = await response.json()
  return data.content.map((b) => b.text || '').join('')
}

export async function analyzeReceipt(base64Image, mimeType = 'image/jpeg') {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: `Przeanalizuj ten paragon i zwróć TYLKO JSON (bez żadnego dodatkowego tekstu) w formacie:
{
  "store": "nazwa sklepu",
  "total": liczba,
  "date": "YYYY-MM-DD lub null",
  "category": "jedna z: food, transport, entertainment, health, shopping, restaurants, utilities, subscriptions, fitness, education, travel, other",
  "items": [{"name": "nazwa", "price": liczba}]
}`,
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) throw new Error(`API Error: ${response.status}`)

  const data = await response.json()
  const text = data.content.map((b) => b.text || '').join('')

  try {
    const clean = text.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return null
  }
}

export function buildFinancialContext(store) {
  const { profile, expenses, incomes, recurring, getCurrentMonthExpenses, getMonthlyRecurringTotal } = store
  const monthExpenses = getCurrentMonthExpenses()
  const recurringTotal = getMonthlyRecurringTotal()
  const expensesTotal = monthExpenses.reduce((s, e) => s + e.amount, 0)

  const byCategory = {}
  monthExpenses.forEach((e) => {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount
  })

  const last3Months = []
  for (let i = 2; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const m = d.getMonth()
    const y = d.getFullYear()
    const monthExp = expenses.filter((e) => {
      const ed = new Date(e.date)
      return ed.getMonth() === m && ed.getFullYear() === y
    })
    last3Months.push({
      month: d.toLocaleDateString('pl-PL', { month: 'long' }),
      total: monthExp.reduce((s, e) => s + e.amount, 0),
    })
  }

  return `
Dane finansowe użytkownika:
- Wynagrodzenie netto: ${profile.salary} PLN/mies.
- Stałe wydatki miesięczne (czynsz, kredyty itd.): ${recurringTotal.toFixed(2)} PLN
- Wydatki w tym miesiącu: ${expensesTotal.toFixed(2)} PLN
- Dostępne środki po wydatkach: ${(profile.salary - recurringTotal - expensesTotal).toFixed(2)} PLN
- Kategorie (ten miesiąc): ${JSON.stringify(byCategory)}
- Ostatnie 3 miesiące: ${JSON.stringify(last3Months)}
- Liczba wydatków (ogółem): ${expenses.length}
- Stałe płatności aktywne: ${recurring.filter(r => r.active).map(r => `${r.name}: ${r.amount} PLN`).join(', ')}
`
}
