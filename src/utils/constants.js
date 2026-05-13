export const CATEGORIES = [
  { id: 'food', label: 'Jedzenie', icon: '🛒', color: '#ff9f0a' },
  { id: 'transport', label: 'Transport', icon: '🚗', color: '#5e5ce6' },
  { id: 'entertainment', label: 'Rozrywka', icon: '🎬', color: '#bf5af2' },
  { id: 'health', label: 'Zdrowie', icon: '💊', color: '#30d158' },
  { id: 'shopping', label: 'Zakupy', icon: '🛍️', color: '#ff453a' },
  { id: 'restaurants', label: 'Restauracje', icon: '🍽️', color: '#ff6b35' },
  { id: 'utilities', label: 'Rachunki', icon: '⚡', color: '#0a84ff' },
  { id: 'subscriptions', label: 'Subskrypcje', icon: '📱', color: '#5ac8fa' },
  { id: 'fitness', label: 'Sport & Fitness', icon: '💪', color: '#34c759' },
  { id: 'education', label: 'Edukacja', icon: '📚', color: '#ffd60a' },
  { id: 'travel', label: 'Podróże', icon: '✈️', color: '#64d2ff' },
  { id: 'other', label: 'Inne', icon: '💸', color: '#98989e' },
]

export const RECURRING_FREQUENCIES = [
  { id: 'monthly', label: 'Miesięcznie' },
  { id: 'yearly', label: 'Rocznie' },
  { id: 'weekly', label: 'Tygodniowo' },
]

export const CURRENCY = 'PLN'

export const CURRENCIES = [
  { code: 'PLN', symbol: 'zł',  locale: 'pl-PL' },
  { code: 'EUR', symbol: '€',   locale: 'de-DE' },
  { code: 'USD', symbol: '$',   locale: 'en-US' },
  { code: 'GBP', symbol: '£',   locale: 'en-GB' },
  { code: 'CHF', symbol: 'CHF', locale: 'de-CH' },
  { code: 'CZK', symbol: 'Kč',  locale: 'cs-CZ' },
  { code: 'SEK', symbol: 'kr',  locale: 'sv-SE' },
  { code: 'NOK', symbol: 'kr',  locale: 'nb-NO' },
]

export const getCategoryById = (id) =>
  CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1]

export const formatCurrency = (amount, currency = 'PLN', locale = 'pl-PL') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export const formatDate = (dateStr) => {
  const d = new Date(dateStr)
  return new Intl.DateTimeFormat('pl-PL', {
    day: 'numeric',
    month: 'short',
    year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  }).format(d)
}

export const MONTH_NAMES = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
]

// AI model jest ustawiony w src/services/ai.js
