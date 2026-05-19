// ── Category guessing by merchant keywords ────────────────────
const KEYWORDS = {
  food:          ['biedronka','lidl','kaufland','zabka','auchan','carrefour','tesco','netto','stokrotka','spar','delikatesy','piotr i pawel','intermarche','spozywczy','lewiatan','polomarket','freshmarket','aldi','rewe','edeka','albert','albert heijn','ica','coop','migros','denner','penny','hofer','billa','mercadona','dia ','leclerc'],
  restaurants:   ['mcdonald','kfc','burger king','subway','pizza','restauracja','bar mleczny','kebab','sushi','dominos','kawiarnia','cafe ','coffee','starbucks','costa','pyszne','deliveroo','uber eats','just eat','wolt','glovo','restaurant','bistro','slodki kacik','goraco polecam'],
  transport:     ['uber','bolt','pkp','mzk','mpk','ztm','paliwo','orlen','shell','circle k','lotos','bp ','parking','autostrada','e-toll','flixbus','wizzair','ryanair','easyjet','lot ','lufthansa','klm','db bahn','renfe','sncf','trenitalia','ns ','obb','jakdojade','mol sf'],
  entertainment: ['cinema','multikino','helios','steam','epic games','playstation','xbox','nintendo','bilety','teatr','muzeum','escape room','totalcasino','casino','hellcase','csgo','skinport','skinbaron','buff.163','waxpeer','spotify','netflix','hbo','disney','prime video','apple tv','crunchyroll'],
  subscriptions: ['netflix','spotify','hbo','disney','apple.com','apple music','google play','youtube premium','tidal','deezer','microsoft','adobe','canva','chatgpt','openai','notion','dropbox','icloud','lastpass','nordvpn','nju mobile'],
  shopping:      ['allegro','amazon','zalando','empik','media markt','rtv euro agd','ikea','leroy merlin','castorama','jysk','h&m','zara','reserved','aliexpress','ebay','shein','asos','aboutyou','otto ','fnac','whsmith'],
  health:        ['apteka','pharmacy','apotheke','rossmann','hebe','drogeria','leki','dr max','medicover','luxmed','szpital','hospital','klinika','dentysta','dentist','optyk','dm ','boots ','barber'],
  utilities:     ['tauron','pge ','enea','energa','innogy','czynsz','woda','gaz','pgnig','edf ','engie','vattenfall','strom','stade','orange polska','play online'],
  fitness:       ['silownia','gym','fitness','zdrofit','calypso','multisport','cityfit','mcfit','basic-fit','holmes place','anytime fitness'],
  education:     ['uczelnia','szkola','udemy','coursera','linkedin learning','skillshare','duolingo'],
  travel:        ['hotel','booking','airbnb','lotnisko','airport','marriott','hilton','ibis','novotel','accor'],
}

function guessCategory(text) {
  const n = text.toLowerCase()
  for (const [cat, kws] of Object.entries(KEYWORDS)) {
    if (kws.some((kw) => n.includes(kw))) return cat
  }
  return 'other'
}

// ── Text helpers ─────────────────────────────────────────────
const clean = (s) => (s || '').replace(/"/g, '').trim()

function extractMerchantName(raw) {
  const s = raw.trim()
  const m = s.match(/^(.+?)(?:\s{2,}|$)/)
  return m ? m[1].trim() : s.slice(0, 60).trim()
}

// Quote-aware CSV line splitter
function splitLine(line, sep) {
  const result = []
  let cur = ''
  let inQ = false
  for (const c of line) {
    if (c === '"') { inQ = !inQ }
    else if (c === sep && !inQ) { result.push(cur); cur = '' }
    else { cur += c }
  }
  result.push(cur)
  return result
}

// ── Date detection — handles multiple formats ─────────────────
function parseDate(str) {
  const s = clean(str)
  // YYYY-MM-DD (with optional time)
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  // DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY
  m = s.match(/^(\d{2})[./\-](\d{2})[./\-](\d{4})/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  // M/D/YYYY or MM/DD/YYYY (US format — only when day > 12 makes format unambiguous)
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`
  return null
}

// ── Amount detection — handles international formats ──────────
function parseAmount(str) {
  // Strip currency symbols and whitespace
  let s = clean(str).replace(/[€$£¥₹zł\sPLNCHFSEKNOKCZKGBPUSD]/g, '').trim()
  if (!s || s === '-' || s === '+') return null
  // Detect separator convention:
  // 1.234,56 → European (dot=thousands, comma=decimal)
  // 1,234.56 → US (comma=thousands, dot=decimal)
  // 1234,56  → PL/DE shorthand (no thousands, comma=decimal)
  // 1234.56  → standard
  const dotIdx   = s.lastIndexOf('.')
  const commaIdx = s.lastIndexOf(',')
  if (commaIdx > dotIdx) {
    // comma is decimal separator: 1.234,56 or 1234,56
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (dotIdx > commaIdx) {
    // dot is decimal separator: 1,234.56 or 1234.56
    s = s.replace(/,/g, '')
  }
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

// ── Smart universal CSV parser ────────────────────────────────
// Detects columns by data content — works for any bank, any language
function parseSmartCSV(lines) {
  const SEPARATORS = [';', ',', '\t']

  for (const sep of SEPARATORS) {
    // Scan first 50 lines to find where tabular data begins (some banks have long metadata headers)
    for (let hi = 0; hi < Math.min(lines.length - 3, 50); hi++) {
      const rawHeader = splitLine(lines[hi], sep)
      if (rawHeader.length < 2) continue

      // Collect data rows that match column count
      const dataRows = []
      for (let j = hi + 1; j < Math.min(hi + 15, lines.length); j++) {
        const cols = splitLine(lines[j], sep)
        if (cols.length >= rawHeader.length) dataRows.push(cols)
      }
      if (dataRows.length < 2) continue

      // Classify each column: 'date' | 'amount' | 'text'
      const colTypes = rawHeader.map((_, ci) => {
        const vals = dataRows.map((r) => clean(r[ci] || ''))
        const dateHits = vals.filter((v) => parseDate(v) !== null).length
        const amtHits  = vals.filter((v) => parseAmount(v) !== null).length
        if (dateHits  >= dataRows.length * 0.6) return 'date'
        if (amtHits   >= dataRows.length * 0.6) return 'amount'
        return 'text'
      })

      const iDate = colTypes.indexOf('date')
      // Prefer the amount column with the most negative values — that's the transaction amount,
      // not a running balance (which is always positive and appears last in many bank exports)
      let iAmt = -1
      let maxNeg = -1
      for (let ci = 0; ci < colTypes.length; ci++) {
        if (colTypes[ci] !== 'amount' || ci === iDate) continue
        const neg = dataRows.filter(r => { const a = parseAmount(clean(r[ci] || '')); return a !== null && a < 0 }).length
        if (neg > maxNeg) { maxNeg = neg; iAmt = ci }
      }
      // No negatives found (income-only export) — fall back to first amount column
      if (iAmt === -1) {
        for (let ci = 0; ci < colTypes.length; ci++) {
          if (colTypes[ci] === 'amount' && ci !== iDate) { iAmt = ci; break }
        }
      }
      if (iDate === -1 || iAmt === -1) continue

      // Find best description column: longest average text that isn't date/amount
      let iDesc = -1, maxLen = 0
      colTypes.forEach((type, ci) => {
        if (type !== 'text') return
        const avg = dataRows.reduce((s, r) => s + clean(r[ci] || '').length, 0) / dataRows.length
        if (avg > maxLen) { maxLen = avg; iDesc = ci }
      })

      // Parse all rows
      const result = []
      for (let i = hi + 1; i < lines.length; i++) {
        const cols = splitLine(lines[i], sep)
        if (cols.length <= Math.max(iDate, iAmt)) continue
        const dateIso = parseDate(clean(cols[iDate]))
        if (!dateIso) continue
        const date = new Date(dateIso)
        if (isNaN(date.getTime())) continue
        const amount = parseAmount(clean(cols[iAmt]))
        if (amount === null || amount === 0) continue
        const rawDesc = iDesc >= 0 ? clean(cols[iDesc]) : ''
        const desc = extractMerchantName(rawDesc) || 'Import'
        result.push({
          date: date.toISOString(),
          description: desc,
          amount: Math.abs(amount),
          rawAmount: amount,
          category: guessCategory(desc + ' ' + rawDesc),
          isExpense: amount < 0,
        })
      }
      if (result.length > 0) return result
    }
  }
  return null
}

// ── mBank-specific parser (uses bank's own categories) ────────
// Detects column positions from header labels — handles all mBank export variants
const PL_MAP = { ą:'a',ć:'c',ę:'e',ł:'l',ń:'n',ó:'o',ś:'s',ź:'z',ż:'z',Ą:'a',Ć:'c',Ę:'e',Ł:'l',Ń:'n',Ó:'o',Ś:'s',Ź:'z',Ż:'z' }
const normPl = (s) => s.toLowerCase().replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, c => PL_MAP[c] || c)

const MBANK_CAT_MAP = {
  'zywnosc i chemia domowa':    'food',
  'jedzenie poza domem':        'restaurants',
  'przejazdy':                  'transport',
  'paliwo':                     'transport',
  'zdrowie i uroda':            'health',
  'tv, internet, telefon':      'subscriptions',
  'multimedia, ksiazki i prasa':'entertainment',
  'elektronika':                'shopping',
  'akcesoria i wyposazenie':    'shopping',
  'odziez i obuwie':            'shopping',
  'wyjscia i wydarzenia':       'entertainment',
  'podroze i wyjazdy':          'travel',
  'sport i rekreacja':          'fitness',
  'sport i hobby':              'fitness',
  'edukacja':                   'education',
  'szkola i wyprawka':          'education',
  'czynsz i wynajem':           'utilities',
  'oplaty i odsetki':           'utilities',
  'remont i ogrod':             'shopping',
  'zwierzeta':                  'other',
  'splaty rat':                 'other',
  'wyplata gotowki':            'other',
  'platnosci - inne':           'other',
  'firmowe - inne':             'other',
  'podatki':                    'other',
  'osobiste - inne':            'other',
  'wynagrodzenie':              'other',
  'regularne oszczedzanie':     'other',
  'przelew wlasny':             'other',
  'bez kategorii':              'other',
  'wplywy - inne':              'other',
  'lokaty i konto oszcz.':      'other',
  'prezenty i wsparcie':        'other',
}

// mBank categories that represent internal account movements, not real spending
const INTERNAL_MBANK_CATS = new Set([
  'regularne oszczedzanie',
  'przelew wlasny',
  'lokaty i konto oszcz.',
])

function parseMbank(lines) {
  const hi = lines.findIndex((l) => l.includes('#Data operacji'))
  if (hi === -1) return null

  // Detect column positions from header labels — robust against format variants
  const headerCols = splitLine(lines[hi], ';').map(clean)
  const iDate = headerCols.findIndex(h => h.includes('Data operacji'))
  const iDesc = headerCols.findIndex(h => h.includes('Opis operacji'))
  const iCat  = headerCols.findIndex(h => h.includes('Kategoria'))
  const iAmt  = headerCols.findIndex(h => h.includes('Kwota'))

  if (iDate === -1 || iAmt === -1) return null

  const result = []
  for (let i = hi + 1; i < lines.length; i++) {
    const cols = splitLine(lines[i], ';')
    if (cols.length <= Math.max(iDate, iAmt)) continue
    const dateStr = clean(cols[iDate])
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue
    const rawDesc = iDesc >= 0 ? clean(cols[iDesc] || '') : ''
    const bankCat = iCat >= 0 ? clean(cols[iCat] || '') : ''
    const amount  = parseAmount(clean(cols[iAmt] || ''))
    if (amount === null || amount === 0) continue
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) continue
    const desc = extractMerchantName(rawDesc) || bankCat || 'Import'
    const normCat = normPl(bankCat.trim())
    const isInternal = INTERNAL_MBANK_CATS.has(normCat)

    // Keyword match on merchant name takes priority — overrides mBank's category when
    // the bank miscategorises a transaction (e.g. AliExpress → "Żywność", TotalCasino → "Podróże")
    const keywordCat = guessCategory(desc + ' ' + rawDesc)
    const mbankCat   = MBANK_CAT_MAP[normCat]
    const category   = keywordCat !== 'other' ? keywordCat : (mbankCat || 'other')

    result.push({
      date: date.toISOString(),
      description: desc,
      amount: Math.abs(amount),
      rawAmount: amount,
      category,
      isExpense: amount < 0,
      isInternal,
    })
  }
  return result.length > 0 ? result : null
}

// ── Entry point ───────────────────────────────────────────────
export function parseBank(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  // mBank first (uses its own category data — better than keyword guessing)
  return parseMbank(lines) || parseSmartCSV(lines) || null
}

export async function readFileAsText(file) {
  const buffer = await file.arrayBuffer()
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {}
  try {
    return new TextDecoder('windows-1250').decode(buffer)
  } catch {}
  return new TextDecoder('iso-8859-2').decode(buffer)
}
