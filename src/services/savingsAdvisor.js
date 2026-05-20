// Benchmark: max recommended % of salary per category
const BENCHMARKS = {
  food:          0.15,
  restaurants:   0.08,
  shopping:      0.10,
  subscriptions: 0.04,
  entertainment: 0.05,
  transport:     0.08,
  health:        0.05,
  utilities:     0.30,
  fitness:       0.03,
  education:     0.03,
  other:         0.10,
  // travel omitted — too lumpy for monthly benchmarking
}

// Realistic reduction % per category
const REDUCTION = {
  restaurants:   0.30,
  entertainment: 0.30,
  shopping:      0.20,
  subscriptions: 0.25,
  food:          0.10,
  transport:     0.15,
  fitness:       0.10,
  health:        0.10,
  utilities:     0.08,
  education:     0.10,
  other:         0.15,
}

const TIPS = {
  restaurants:   [
    'Gotuj w domu przynajmniej 4× w tygodniu',
    'Ogranicz zamówienia z Wolta/Pyszne do 1–2 razy w tygodniu',
    'Zabieraj lunch do pracy zamiast jadać na mieście',
  ],
  shopping:      [
    'Stosuj zasadę 48h — poczekaj 2 dni przed każdym zakupem',
    'Porównuj ceny na Ceneo przed większymi zakupami',
    'Kupuj ubrania w końcówkach sezonów (rabaty do –70%)',
  ],
  subscriptions: [
    'Przejrzyj wszystkie subskrypcje i anuluj nieużywane',
    'Dziel konta rodzinne (Spotify, Netflix) gdzie możliwe',
    'Sprawdź duplikaty — np. 2 platformy streamingowe naraz',
  ],
  entertainment: [
    'Korzystaj z darmowych alternatyw — YouTube, Twitch, podcasti',
    'Kupuj bilety z wyprzedzeniem — nawet 2× taniej',
  ],
  food:          [
    'Rób listę zakupów i trzymaj się jej',
    'Śledź gazetki Biedronka/Lidl — najlepsze promocje na dany tydzień',
    'Planuj posiłki na tydzień, aby zmniejszyć marnotrawstwo',
  ],
  transport:     [
    'Komunikacja miejska lub rower na trasy do 5 km',
    'Carpooling do pracy lub na regularne trasy',
    'Aplikacje porównujące ceny paliwa (np. Yanosik)',
  ],
  fitness:       [
    'Sprawdź czy pracodawca dofinansowuje fitness przez kafeterię',
    'Darmowe treningi na YouTube (Athlean-X, MommaStrong itp.)',
  ],
  health:        [
    'Korzystaj z NFZ tam, gdzie czas oczekiwania jest akceptowalny',
    'Kupuj leki generyczne — identyczny skład, niższa cena',
  ],
  utilities:     [
    'Negocjuj czynsz przy każdym przedłużeniu umowy',
    'Porównaj oferty dostawców prądu/gazu na platformie URE',
  ],
  other:         [
    'Przejrzyj nieregularne wydatki i oceń co można ograniczyć',
  ],
}

function median(arr) {
  if (!arr.length) return 0
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m]
}

/**
 * generateSavingsAdvice({ expenses, salary, goals, recurringTotal })
 * Uses ALL historical expenses (not a filtered window) — needs full picture for averages.
 * Returns null when not enough data.
 */
export function generateSavingsAdvice({ expenses, salary, goals = [], recurringTotal = 0 }) {
  if (!expenses.length || salary <= 0) return null

  const now = new Date()
  const currentYM = `${now.getFullYear()}-${now.getMonth()}`

  // Group into complete calendar months (skip current incomplete month)
  const byMonth = {}
  expenses.forEach(e => {
    const d = new Date(e.date)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (key === currentYM) return
    if (!byMonth[key]) byMonth[key] = []
    byMonth[key].push(e)
  })

  const completeMonths = Object.keys(byMonth)
  const monthCount = completeMonths.length
  if (monthCount === 0) return null

  // Per-category monthly amounts
  const catByMonth = {}
  completeMonths.forEach(mKey => {
    const sums = {}
    byMonth[mKey].forEach(e => { sums[e.category] = (sums[e.category] || 0) + e.amount })
    Object.entries(sums).forEach(([cat, amt]) => {
      if (!catByMonth[cat]) catByMonth[cat] = []
      catByMonth[cat].push(amt)
    })
  })

  // Build category stats
  const catStats = {}
  Object.entries(catByMonth).forEach(([catId, amounts]) => {
    const med = median(amounts)
    const benchmark = BENCHMARKS[catId]
    const benchmarkAmt = benchmark != null ? salary * benchmark : null
    const overBenchmark = benchmarkAmt != null && med > benchmarkAmt
    catStats[catId] = {
      catId,
      median: med,
      monthCount: amounts.length,
      benchmark,
      benchmarkAmt,
      overBenchmark,
      excessAmt: benchmarkAmt != null ? Math.max(0, med - benchmarkAmt) : 0,
      pctOfSalary: med / salary,
    }
  })

  // Generate recommendations
  const recommendations = []
  Object.values(catStats).forEach(stat => {
    if (stat.benchmarkAmt == null) return // no benchmark (travel)
    if (stat.median < 50) return          // negligible

    const reductionPct = REDUCTION[stat.catId] || 0.15
    let savingsMonthly, reason

    if (stat.overBenchmark) {
      savingsMonthly = stat.excessAmt
      reason = 'over_benchmark'
    } else {
      savingsMonthly = stat.median * reductionPct
      reason = 'opportunity'
    }

    if (savingsMonthly < 25) return

    recommendations.push({
      catId:         stat.catId,
      median:        stat.median,
      benchmarkAmt:  stat.benchmarkAmt,
      pctOfSalary:   stat.pctOfSalary,
      overBenchmark: stat.overBenchmark,
      reductionPct,
      savingsMonthly: Math.round(savingsMonthly),
      savingsAnnual:  Math.round(savingsMonthly * 12),
      reason,
      tips: TIPS[stat.catId] || [],
    })
  })

  // Sort: over-benchmark first, then by savings amount
  recommendations.sort((a, b) => {
    if (a.overBenchmark !== b.overBenchmark) return a.overBenchmark ? -1 : 1
    return b.savingsMonthly - a.savingsMonthly
  })

  const totalPotentialMonthly = recommendations.reduce((s, r) => s + r.savingsMonthly, 0)

  // Average monthly spend across complete months
  const avgMonthlySpend = completeMonths.reduce((s, mKey) =>
    s + byMonth[mKey].reduce((ms, e) => ms + e.amount, 0), 0) / monthCount

  const currentMonthlySavings = salary - avgMonthlySpend - recurringTotal
  const optimizedMonthlySavings = currentMonthlySavings + totalPotentialMonthly

  // Goal simulations
  const goalSims = goals
    .filter(g => g.targetAmount > g.currentAmount)
    .map(g => {
      const remaining = g.targetAmount - g.currentAmount
      const monthsNow = currentMonthlySavings > 0 ? Math.ceil(remaining / currentMonthlySavings) : null
      const monthsOpt = optimizedMonthlySavings > 0 ? Math.ceil(remaining / optimizedMonthlySavings) : null
      return {
        id: g.id,
        name: g.name,
        remaining,
        monthsNow,
        monthsOpt,
        monthsSaved: (monthsNow != null && monthsOpt != null) ? monthsNow - monthsOpt : null,
      }
    })
    .filter(g => g.monthsNow != null || g.monthsOpt != null)
    .slice(0, 3)

  return {
    monthCount,
    avgMonthlySpend,
    currentMonthlySavings,
    optimizedMonthlySavings,
    recommendations: recommendations.slice(0, 6),
    totalPotentialMonthly,
    totalPotentialAnnual: totalPotentialMonthly * 12,
    goalSims,
  }
}
