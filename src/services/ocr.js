import { createWorker } from 'tesseract.js'

// Przetwarza obraz paragonu i wyciąga dane bez AI
export async function scanReceipt(base64Image, mimeType = 'image/jpeg', onProgress) {
  const worker = await createWorker('pol+eng', 1, {
    logger: (m) => {
      if (onProgress && m.status === 'recognizing text') {
        onProgress(Math.round(m.progress * 100))
      }
    },
  })

  try {
    // Konwertuj base64 na blob
    const byteChars = atob(base64Image)
    const byteArr = new Uint8Array(byteChars.length)
    for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i)
    const blob = new Blob([byteArr], { type: mimeType })

    const { data: { text } } = await worker.recognize(blob)
    await worker.terminate()

    return parseReceiptText(text)
  } catch (err) {
    await worker.terminate()
    throw err
  }
}

// Parsuje surowy tekst OCR i wyciąga dane paragonu
function parseReceiptText(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const fullText = text.toLowerCase()

  // --- Sklep ---
  const store = guessStore(lines, fullText)

  // --- Suma ---
  const total = guessTotal(lines, fullText)

  // --- Data ---
  const date = guessDate(lines, fullText)

  // --- Kategoria ---
  const category = guessCategory(fullText, store)

  // --- Pozycje ---
  const items = guessItems(lines)

  return { store, total, date, category, items, rawText: text }
}

function guessStore(lines, fullText) {
  // Pierwsza niepusta linia często to nazwa sklepu
  const knownStores = [
    { name: 'Biedronka', keywords: ['biedronka'] },
    { name: 'Lidl', keywords: ['lidl'] },
    { name: 'Żabka', keywords: ['żabka', 'zabka'] },
    { name: 'Carrefour', keywords: ['carrefour'] },
    { name: 'Kaufland', keywords: ['kaufland'] },
    { name: 'Auchan', keywords: ['auchan'] },
    { name: 'Netto', keywords: ['netto'] },
    { name: 'Rossmann', keywords: ['rossmann'] },
    { name: 'Orlen', keywords: ['orlen'] },
    { name: 'Shell', keywords: ['shell'] },
    { name: 'McDonald\'s', keywords: ['mcdonald', 'mcdonalds'] },
    { name: 'KFC', keywords: ['kfc'] },
    { name: 'Starbucks', keywords: ['starbucks'] },
    { name: 'Allegro', keywords: ['allegro'] },
    { name: 'Media Markt', keywords: ['media markt', 'mediamarkt'] },
    { name: 'Leroy Merlin', keywords: ['leroy'] },
    { name: 'Decathlon', keywords: ['decathlon'] },
  ]

  for (const s of knownStores) {
    if (s.keywords.some((k) => fullText.includes(k))) return s.name
  }

  // Fallback: pierwsza linia która wygląda jak nazwa (nie cyfry, nie za krótka)
  for (const line of lines.slice(0, 5)) {
    if (line.length > 3 && line.length < 40 && !/^\d/.test(line) && !/suma|total|razem|nip/i.test(line)) {
      return line
    }
  }

  return ''
}

function guessTotal(lines, fullText) {
  // Szukaj linii z "suma", "razem", "total", "do zapłaty", "płatność"
  const totalPatterns = [
    /(?:suma|razem|total|do zap[łl]aty|p[łl]atno[śs][ćc]|należno[śs][ćc])\s*:?\s*([\d\s,.]+)/i,
    /(?:gotówka|karta|visa|mastercard)\s*:?\s*([\d\s,.]+)/i,
  ]

  for (const pattern of totalPatterns) {
    const match = fullText.match(pattern)
    if (match) {
      const num = parsePolishNumber(match[1])
      if (num > 0 && num < 100000) return num
    }
  }

  // Fallback: znajdź największą liczbę w tekście (często to suma)
  const numbers = []
  for (const line of lines) {
    const matches = line.matchAll(/([\d]+[.,][\d]{2})/g)
    for (const m of matches) {
      const n = parsePolishNumber(m[1])
      if (n > 0 && n < 100000) numbers.push(n)
    }
  }

  if (numbers.length > 0) {
    // Suma to zazwyczaj największa lub jedna z większych liczb
    numbers.sort((a, b) => b - a)
    return numbers[0]
  }

  return 0
}

function guessDate(lines, fullText) {
  // Formaty: DD.MM.YYYY, DD-MM-YYYY, YYYY-MM-DD
  const patterns = [
    /(\d{2})[.\-/](\d{2})[.\-/](\d{4})/,
    /(\d{4})[.\-/](\d{2})[.\-/](\d{2})/,
  ]

  for (const line of lines) {
    for (const pattern of patterns) {
      const m = line.match(pattern)
      if (m) {
        // Sprawdź czy to format YYYY-MM-DD czy DD.MM.YYYY
        if (m[1].length === 4) {
          return `${m[1]}-${m[2]}-${m[3]}`
        } else {
          return `${m[3]}-${m[2]}-${m[1]}`
        }
      }
    }
  }

  return null
}

function guessCategory(fullText, store) {
  const map = [
    { category: 'food', keywords: ['biedronka', 'lidl', 'kaufland', 'auchan', 'carrefour', 'netto', 'żabka', 'zabka', 'spar', 'tesco', 'piotr i paweł', 'sklep', 'spożyw'] },
    { category: 'restaurants', keywords: ['restaurant', 'restauracja', 'mcdonald', 'kfc', 'burger', 'pizza', 'kebab', 'bar', 'kawiarnia', 'cafe', 'starbucks', 'subway'] },
    { category: 'transport', keywords: ['orlen', 'shell', 'bp ', 'lotos', 'stacja', 'paliwo', 'benzyna', 'diesel', 'parking', 'pkp', 'uber', 'bolt', 'mzk', 'ztm'] },
    { category: 'health', keywords: ['apteka', 'pharmacy', 'rossmann', 'drogeria', 'leki', 'dr. max', 'dbam o zdrowie'] },
    { category: 'shopping', keywords: ['media markt', 'rtv euro', 'saturn', 'decathlon', 'zara', 'h&m', 'reserved', 'leroy', 'castorama', 'ikea', 'allegro'] },
    { category: 'entertainment', keywords: ['cinema', 'kino', 'teatr', 'muzeum', 'netflix', 'spotify'] },
  ]

  for (const { category, keywords } of map) {
    if (keywords.some((k) => fullText.includes(k) || (store && store.toLowerCase().includes(k)))) {
      return category
    }
  }

  return 'other'
}

function guessItems(lines) {
  const items = []
  // Szukaj linii które wyglądają jak pozycja: tekst + cena
  const itemPattern = /^(.{3,30}?)\s+([\d]+[.,][\d]{2})\s*$/
  for (const line of lines) {
    const m = line.match(itemPattern)
    if (m && !/suma|razem|total|nip|vat|paragon|data|godzina/i.test(m[1])) {
      const price = parsePolishNumber(m[2])
      if (price > 0 && price < 10000) {
        items.push({ name: m[1].trim(), price })
      }
    }
  }
  return items.slice(0, 20)
}

function parsePolishNumber(str) {
  // "1 234,56" lub "1234.56" lub "1234,56" → 1234.56
  const clean = str.replace(/\s/g, '').replace(',', '.')
  return parseFloat(clean) || 0
}
