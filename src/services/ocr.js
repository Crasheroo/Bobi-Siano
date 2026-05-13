import { createWorker } from 'tesseract.js'

// Normalize Polish diacritics for fuzzy matching
const PL = { ą:'a',ć:'c',ę:'e',ł:'l',ń:'n',ó:'o',ś:'s',ź:'z',ż:'z',Ą:'a',Ć:'c',Ę:'e',Ł:'l',Ń:'n',Ó:'o',Ś:'s',Ź:'z',Ż:'z' }
const norm = (s) => s.toLowerCase().replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, c => PL[c] || c)

// Fix common OCR misreads in numeric contexts: O→0, l/I→1, S→5, B→8
function fixOcrDigits(s) {
  return s.replace(/(?<=\d)[Oo](?=\d)/g, '0')
          .replace(/(?<=\d)[lI](?=\d)/g, '1')
          .replace(/(?<=\d)S(?=\d)/g, '5')
          .replace(/(?<=\d)B(?=\d)/g, '8')
}

// Preprocess image: resize to max width, grayscale, boost contrast
async function preprocessImage(base64, mimeType) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const MAX_W = 2000
      const scale = img.width > MAX_W ? MAX_W / img.width : 1
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)

      const imageData = ctx.getImageData(0, 0, w, h)
      const d = imageData.data
      for (let i = 0; i < d.length; i += 4) {
        // Weighted grayscale
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
        // Contrast stretch: pull midtones toward black/white
        const c = Math.min(255, Math.max(0, (gray - 128) * 1.5 + 128))
        d[i] = d[i + 1] = d[i + 2] = c
      }
      ctx.putImageData(imageData, 0, 0)

      resolve(canvas.toDataURL('image/png').split(',')[1])
    }
    img.src = `data:${mimeType};base64,${base64}`
  })
}

export async function scanReceipt(base64Image, mimeType = 'image/jpeg', onProgress) {
  onProgress?.(5)
  const processedBase64 = await preprocessImage(base64Image, mimeType)
  onProgress?.(10)

  const worker = await createWorker('pol+eng', 1, {
    logger: (m) => {
      if (onProgress && m.status === 'recognizing text') {
        onProgress(10 + Math.round(m.progress * 85))
      }
    },
  })

  try {
    const byteChars = atob(processedBase64)
    const byteArr = new Uint8Array(byteChars.length)
    for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i)
    const blob = new Blob([byteArr], { type: 'image/png' })

    // PSM 6: treat as uniform block of text (best for receipts)
    await worker.setParameters({ tessedit_pageseg_mode: '6' })

    const { data: { text } } = await worker.recognize(blob)
    await worker.terminate()

    return parseReceiptText(text)
  } catch (err) {
    await worker.terminate()
    throw err
  }
}

function parseReceiptText(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const fullText = text.toLowerCase()

  const store    = guessStore(lines, fullText)
  const total    = guessTotal(lines)
  const date     = guessDate(lines)
  const category = guessCategory(fullText, store)
  const items    = guessItems(lines)

  return { store, total, date, category, items, rawText: text }
}

// ── Store detection ──────────────────────────────────────────────────────────
const KNOWN_STORES = [
  { name: 'Biedronka',      kw: ['biedronka'] },
  { name: 'Lidl',           kw: ['lidl'] },
  { name: 'Żabka',          kw: ['zabka', 'zab ka', 'z.a.b.k.a'] },
  { name: 'Carrefour',      kw: ['carrefour'] },
  { name: 'Kaufland',       kw: ['kaufland'] },
  { name: 'Auchan',         kw: ['auchan'] },
  { name: 'Netto',          kw: ['netto'] },
  { name: 'Aldi',           kw: ['aldi'] },
  { name: 'Rossmann',       kw: ['rossmann'] },
  { name: 'Hebe',           kw: ['hebe'] },
  { name: 'Orlen',          kw: ['orlen', 'bp ', 'circle k', 'circlek'] },
  { name: 'Shell',          kw: ['shell'] },
  { name: 'Lotos',          kw: ['lotos'] },
  { name: 'McDonald\'s',    kw: ['mcdonald', 'mcdonalds'] },
  { name: 'KFC',            kw: ['kfc'] },
  { name: 'Burger King',    kw: ['burger king'] },
  { name: 'Starbucks',      kw: ['starbucks'] },
  { name: 'Costa Coffee',   kw: ['costa coffee', 'costa'] },
  { name: 'Subway',         kw: ['subway'] },
  { name: 'Domino\'s',      kw: ['dominos', "domino's"] },
  { name: 'Allegro',        kw: ['allegro'] },
  { name: 'Media Markt',    kw: ['media markt', 'mediamarkt'] },
  { name: 'RTV Euro AGD',   kw: ['rtv euro', 'euro agd', 'euro rtv'] },
  { name: 'Leroy Merlin',   kw: ['leroy merlin', 'leroy'] },
  { name: 'Decathlon',      kw: ['decathlon'] },
  { name: 'Empik',          kw: ['empik'] },
  { name: 'IKEA',           kw: ['ikea'] },
  { name: 'H&M',            kw: ['h&m', 'h & m'] },
  { name: 'Zara',           kw: ['zara'] },
  { name: 'Reserved',       kw: ['reserved'] },
  { name: 'Delikatesy Centrum', kw: ['delikatesy centrum', 'delikatesy'] },
  { name: 'Piotr i Paweł', kw: ['piotr i pawel', 'piotr i paweł'] },
  { name: 'Lewiatan',       kw: ['lewiatan'] },
  { name: 'Stokrotka',      kw: ['stokrotka'] },
  { name: 'Intermarché',    kw: ['intermarche', 'intermarché'] },
  { name: 'Polo Market',    kw: ['polomarket', 'polo market'] },
  { name: 'Dr Max',         kw: ['dr max', 'drmax'] },
  { name: 'Medicover',      kw: ['medicover'] },
  { name: 'LuxMed',         kw: ['luxmed', 'lux med'] },
]

function guessStore(lines, fullText) {
  const nft = norm(fullText)

  for (const s of KNOWN_STORES) {
    if (s.kw.some((k) => nft.includes(k))) return s.name
  }

  // Fallback: first non-noise line in top 6 that looks like a name
  const SKIP = /\b(nip|paragon|faktura|data|godzina|nr|suma|razem|do zap|vat|kasa)\b/i
  for (const line of lines.slice(0, 6)) {
    const n = norm(line)
    if (line.length >= 3 && line.length <= 50 && !SKIP.test(n) && !/^\d/.test(line)) {
      return line
    }
  }
  return ''
}

// ── Total detection ──────────────────────────────────────────────────────────
// Ordered by trustworthiness (higher = more reliable)
const TOTAL_KW = [
  { kw: 'kwota do zaplaty',  p: 10 },
  { kw: 'do zaplaty',        p: 9 },
  { kw: 'suma paragonowa',   p: 8 },
  { kw: 'naleznosc',         p: 8 },
  { kw: 'razem pln',         p: 7 },
  { kw: 'razem',             p: 6 },
  { kw: 'suma pln',          p: 7 },
  { kw: 'suma',              p: 5 },
  { kw: 'total',             p: 4 },
  { kw: 'platnosc',          p: 3 },
  { kw: 'zaplata',           p: 3 },
  { kw: 'gotowka',           p: 2 },
  { kw: 'karta',             p: 2 },
  { kw: 'blik',              p: 2 },
  { kw: 'visa',              p: 2 },
  { kw: 'mastercard',        p: 2 },
]

function extractNum(line) {
  // Fix OCR digit errors before parsing
  const fixed = fixOcrDigits(line)
  // Match formats: 1234,56 or 1234.56 or 1 234,56
  const m = fixed.match(/([\d][\d\s]*[.,][\d]{2})\b/)
  if (!m) return 0
  const n = parsePolishNumber(m[1])
  return n > 0 && n < 100000 ? n : 0
}

function guessTotal(lines) {
  const candidates = []

  for (let i = 0; i < lines.length; i++) {
    const ln = norm(lines[i])
    for (const { kw, p } of TOTAL_KW) {
      if (!ln.includes(kw)) continue
      // Try number on same line first
      let n = extractNum(lines[i])
      if (!n && i + 1 < lines.length) {
        // Try next line (some receipts split keyword and value)
        n = extractNum(lines[i + 1])
      }
      if (n > 0) candidates.push({ n, p, i })
      break
    }
  }

  if (candidates.length > 0) {
    // Highest priority wins; ties broken by position (prefer later = final total)
    candidates.sort((a, b) => b.p - a.p || b.i - a.i)
    return candidates[0].n
  }

  // Last-resort: largest number in the bottom 40% of the receipt
  const bottomLines = lines.slice(Math.floor(lines.length * 0.6))
  const nums = []
  for (const line of bottomLines) {
    const fixed = fixOcrDigits(line)
    for (const m of fixed.matchAll(/([\d]+[.,][\d]{2})/g)) {
      const n = parsePolishNumber(m[1])
      if (n > 0 && n < 100000) nums.push(n)
    }
  }
  if (nums.length) {
    nums.sort((a, b) => b - a)
    return nums[0]
  }

  return 0
}

// ── Date detection ───────────────────────────────────────────────────────────
function guessDate(lines) {
  const now = new Date()
  const thisYear = now.getFullYear()

  // Try labeled date first: "data: 12.03.2024" or "data 2024-03-12"
  for (const line of lines) {
    if (!/data|date/i.test(line)) continue
    const d = extractDateFromLine(line)
    if (d && isReasonableDate(d)) return d
  }

  // Then scan all lines top-to-bottom
  for (const line of lines) {
    const d = extractDateFromLine(line)
    if (d && isReasonableDate(d)) return d
  }

  return null
}

function extractDateFromLine(line) {
  // DD.MM.YYYY or DD-MM-YYYY or DD/MM/YYYY
  const m1 = line.match(/\b(\d{2})[.\-/](\d{2})[.\-/](\d{4})\b/)
  if (m1) return `${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`

  // YYYY-MM-DD or YYYY.MM.DD
  const m2 = line.match(/\b(\d{4})[.\-/](\d{2})[.\-/](\d{2})\b/)
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`

  return null
}

function isReasonableDate(iso) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return false
  const now = new Date()
  const tenYearsAgo = new Date(now.getFullYear() - 10, 0, 1)
  return d >= tenYearsAgo && d <= now
}

// ── Category guess ───────────────────────────────────────────────────────────
function guessCategory(fullText, store) {
  const t = norm(fullText) + ' ' + (store ? norm(store) : '')
  const MAP = [
    { cat: 'food',          kw: ['biedronka','lidl','kaufland','auchan','carrefour','netto','aldi','zabka','spar','tesco','piotr i pawel','sklep','spozyw','stokrotka','lewiatan','delikatesy','polomarket','intermarche'] },
    { cat: 'restaurants',   kw: ['restauracja','mcdonald','mcdonalds','kfc','burger','pizza','kebab','bar','kawiarnia','cafe','starbucks','subway','domino','costa','bistro','gastropub','sushi'] },
    { cat: 'transport',     kw: ['orlen','shell','bp ','lotos','circle k','stacja paliw','paliwo','benzyna','diesel','parking','pkp','uber','bolt','mzk','ztm','mpk','autostrada','e-toll'] },
    { cat: 'health',        kw: ['apteka','pharmacy','rossmann','hebe','drogeria','leki','dr max','dbam o zdrowie','medicover','luxmed','szpital','klinika','dentysta'] },
    { cat: 'shopping',      kw: ['media markt','rtv euro','saturn','decathlon','zara','h&m','reserved','leroy','castorama','ikea','allegro','empik','reserved','mohito','cropp','sinsay'] },
    { cat: 'entertainment', kw: ['cinema','kino','teatr','muzeum','netflix','spotify','steam','bilety'] },
    { cat: 'fitness',       kw: ['silownia','gym','fitness','zdrofit','calypso','multisport','cityfit'] },
  ]

  for (const { cat, kw } of MAP) {
    if (kw.some((k) => t.includes(k))) return cat
  }
  return 'other'
}

// ── Item detection ───────────────────────────────────────────────────────────
function guessItems(lines) {
  const items = []
  const SKIP = /\b(suma|razem|total|nip|vat|paragon|data|godzina|gotowka|karta|rabat|opust|zmiana|sprzedawca|kasjer)\b/i

  for (const line of lines) {
    if (SKIP.test(line)) continue

    const fixed = fixOcrDigits(line)

    // Pattern: NAME ... PRICE (price at end of line with optional currency)
    // Handles "Jabłka Gala       2,99" and "JABŁKA GALA  kg  1,5  x  1,99  2,99"
    const m = fixed.match(/^(.{3,40}?)\s{2,}([\d]+[.,][\d]{2})\s*(?:PLN|zl|zł)?\s*$/)
    if (m && !SKIP.test(m[1])) {
      const price = parsePolishNumber(m[2])
      if (price > 0 && price < 10000) {
        items.push({ name: m[1].trim(), price })
        continue
      }
    }

    // Pattern: NAME PRICE (single space separator, shorter line)
    const m2 = fixed.match(/^([A-ZĄĆĘŁŃÓŚŹŻ][^\d]{2,25})\s+([\d]+[.,][\d]{2})\s*$/)
    if (m2 && !SKIP.test(m2[1])) {
      const price = parsePolishNumber(m2[2])
      if (price > 0 && price < 10000) {
        items.push({ name: m2[1].trim(), price })
      }
    }
  }

  // Deduplicate and cap
  const seen = new Set()
  return items.filter(({ name }) => {
    if (seen.has(name)) return false
    seen.add(name)
    return true
  }).slice(0, 20)
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function parsePolishNumber(str) {
  return parseFloat(str.replace(/\s/g, '').replace(',', '.')) || 0
}
