// OpenAI API — gpt-4o-mini (tani, szybki, świetny do paragonów i chatu)
// Klucz: https://platform.openai.com/api-keys
const OPENAI_MODEL = 'gpt-4o-mini'
const OPENAI_VISION_MODEL = 'gpt-4o-mini'
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''
const API_URL = 'https://api.openai.com/v1/chat/completions'

async function fetchOpenAI(messages, retries = 2) {
  if (!API_KEY) throw new Error('Brak klucza OpenAI API (VITE_OPENAI_API_KEY)')

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_tokens: 1000,
      messages,
    }),
  })

  // 429 = za dużo zapytań — poczekaj 3 sekundy i spróbuj ponownie
  if (response.status === 429 && retries > 0) {
    await new Promise((r) => setTimeout(r, 3000))
    return fetchOpenAI(messages, retries - 1)
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Błąd API: ${response.status}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

// Chat — historia wiadomości w formacie OpenAI (role: user/assistant/system)
export async function callClaude(messages, systemPrompt = '') {
  const openaiMessages = []

  if (systemPrompt) {
    openaiMessages.push({ role: 'system', content: systemPrompt })
  }

  for (const m of messages) {
    openaiMessages.push({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    })
  }

  return fetchOpenAI(openaiMessages)
}

// Skanowanie paragonu — vision
export async function analyzeReceipt(base64Image, mimeType = 'image/jpeg') {
  if (!API_KEY) throw new Error('Brak klucza OpenAI API (VITE_OPENAI_API_KEY)')

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_VISION_MODEL,
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: 'low',
              },
            },
            {
              type: 'text',
              text: 'Przeanalizuj ten paragon i zwróć TYLKO czysty JSON (zero komentarzy, zero markdown): {"store":"nazwa sklepu","total":liczba,"date":"YYYY-MM-DD lub null","category":"food|transport|entertainment|health|shopping|restaurants|utilities|subscriptions|fitness|education|travel|other","items":[{"name":"nazwa","price":liczba}]}',
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Błąd API: ${response.status}`)
  }

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content || ''

  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch {
    return null
  }
}

function getErrorMessage(err) {
  const msg = err?.message || ''
  if (msg.includes('429') || msg.includes('Too Many Requests')) {
    return '⚠️ Zbyt wiele zapytań. Poczekaj chwilę i spróbuj ponownie.'
  }
  if (msg.includes('401') || msg.includes('Incorrect API key')) {
    return '⚠️ Nieprawidłowy klucz OpenAI. Sprawdź czy VITE_OPENAI_API_KEY jest poprawny.'
  }
  if (msg.includes('insufficient_quota') || msg.includes('exceeded')) {
    return '⚠️ Wyczerpany limit kredytów OpenAI. Doładuj konto na platform.openai.com.'
  }
  return `⚠️ Błąd: ${msg || 'Nieznany błąd. Spróbuj ponownie.'}`
}

export { getErrorMessage }

export function buildFinancialContext(store) {
  const { profile, expenses, recurring, getCurrentMonthExpenses, getMonthlyRecurringTotal } = store
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
    const m = d.getMonth(), y = d.getFullYear()
    const total = expenses
      .filter((e) => { const ed = new Date(e.date); return ed.getMonth() === m && ed.getFullYear() === y })
      .reduce((s, e) => s + e.amount, 0)
    last3Months.push({ month: d.toLocaleDateString('pl-PL', { month: 'long' }), total })
  }

  return `Dane finansowe użytkownika:
- Wynagrodzenie netto: ${profile.salary} PLN/mies.
- Stałe wydatki miesięczne: ${recurringTotal.toFixed(2)} PLN
- Wydatki w tym miesiącu: ${expensesTotal.toFixed(2)} PLN
- Zostało do końca miesiąca: ${(profile.salary - recurringTotal - expensesTotal).toFixed(2)} PLN
- Wydatki wg kategorii (ten miesiąc): ${JSON.stringify(byCategory)}
- Ostatnie 3 miesiące: ${JSON.stringify(last3Months)}
- Stałe płatności aktywne: ${recurring.filter((r) => r.active).map((r) => `${r.name}: ${r.amount} PLN`).join(', ')}`
}
