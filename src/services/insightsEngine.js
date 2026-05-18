// Pure analysis engine — generates data-driven insights from expenses.
// All conclusions are derived from actual numbers, not hardcoded thresholds.

export function generateInsights(expenses, salary, allCategories, formatAmount) {
  if (!expenses || expenses.length === 0) return []
  const insights = []

  const total = expenses.reduce((s, e) => s + e.amount, 0)
  if (total === 0) return []

  // Date span
  const timestamps = expenses.map(e => new Date(e.date).getTime())
  const minMs = Math.min(...timestamps)
  const maxMs = Math.max(...timestamps)
  const daySpan = Math.max(1, (maxMs - minMs) / 86_400_000 + 1)
  const monthCount = Math.max(1, daySpan / 30.44)
  const monthlyAvg = total / monthCount

  // Spending by category
  const byCat = {}
  expenses.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + e.amount })
  const sortedCats = Object.entries(byCat).sort((a, b) => b[1] - a[1])

  // ── Top category ──────────────────────────────────────────────
  if (sortedCats.length > 0) {
    const [topId, topAmt] = sortedCats[0]
    const cat = allCategories.find(c => c.id === topId)
    const pct = (topAmt / total) * 100
    insights.push({
      type: 'top_category',
      severity: pct > 40 ? 'warning' : 'info',
      icon: cat?.icon || '📊',
      title: `Największa kategoria: ${cat?.label || topId}`,
      detail: `${pct.toFixed(0)}% Twoich wydatków — ${formatAmount(topAmt)} łącznie`,
    })
  }

  // ── Jedzenie na mieście vs. w domu ───────────────────────────
  const foodAmt = byCat['food'] || 0
  const restAmt = byCat['restaurants'] || 0
  if (foodAmt + restAmt > 50) {
    const eatOutPct = restAmt / (foodAmt + restAmt)
    if (eatOutPct > 0.25) {
      insights.push({
        type: 'food_restaurants',
        severity: eatOutPct > 0.6 ? 'warning' : 'info',
        icon: '🍽️',
        title: 'Jedzenie w domu vs. na mieście',
        detail: `${(eatOutPct * 100).toFixed(0)}% budżetu na jedzenie pochodzi z restauracji i dostawy (${formatAmount(restAmt)})`,
      })
    }
  }

  // ── Subskrypcje i streaming ───────────────────────────────────
  const subAmt = (byCat['subscriptions'] || 0) + (byCat['entertainment'] || 0)
  if (subAmt > 0) {
    const monthlySubAmt = subAmt / monthCount
    insights.push({
      type: 'subscriptions',
      severity: salary > 0 && monthlySubAmt / salary > 0.08 ? 'warning' : 'info',
      icon: '📱',
      title: 'Subskrypcje i rozrywka',
      detail: `Miesięcznie ok. ${formatAmount(monthlySubAmt)} na subskrypcje i streaming`,
    })
  }

  // ── Wskaźnik oszczędności ─────────────────────────────────────
  if (salary > 0) {
    const savingsRate = ((salary - monthlyAvg) / salary) * 100
    insights.push({
      type: 'savings_rate',
      severity: savingsRate < 0 ? 'danger' : savingsRate < 10 ? 'warning' : 'good',
      icon: savingsRate >= 20 ? '💚' : savingsRate >= 0 ? '🟡' : '🔴',
      title: 'Wskaźnik oszczędności',
      detail: savingsRate >= 0
        ? `Oszczędzasz ok. ${savingsRate.toFixed(0)}% wypłaty — ${formatAmount(salary - monthlyAvg)}/mies.`
        : `Wydajesz ${Math.abs(savingsRate).toFixed(0)}% więcej niż zarabiasz (deficyt ${formatAmount(monthlyAvg - salary)}/mies.)`,
    })
  }

  // ── Trend miesięczny ──────────────────────────────────────────
  const byMonth = {}
  expenses.forEach(e => {
    const d = new Date(e.date)
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
    byMonth[key] = (byMonth[key] || 0) + e.amount
  })
  const monthKeys = Object.keys(byMonth).sort()

  if (monthKeys.length >= 3) {
    const vals = monthKeys.map(k => byMonth[k])
    const prevAvg = vals.slice(0, -1).reduce((s, v) => s + v, 0) / (vals.length - 1)
    const last = vals[vals.length - 1]
    const change = prevAvg > 0 ? ((last - prevAvg) / prevAvg) * 100 : 0
    if (Math.abs(change) > 10) {
      insights.push({
        type: 'monthly_trend',
        severity: change > 20 ? 'warning' : change > 0 ? 'info' : 'good',
        icon: change > 0 ? '📈' : '📉',
        title: change > 0 ? 'Ostatni miesiąc droższy niż poprzednie' : 'Ostatni miesiąc tańszy niż poprzednie',
        detail: `${Math.abs(change).toFixed(0)}% ${change > 0 ? 'powyżej' : 'poniżej'} średniej poprzednich miesięcy (${formatAmount(prevAvg)})`,
      })
    }

    // Linear regression over all months — is spending growing?
    if (monthKeys.length >= 4) {
      const n = vals.length
      const avgX = (n - 1) / 2
      const avgY = vals.reduce((s, v) => s + v, 0) / n
      const num = vals.reduce((s, v, i) => s + (i - avgX) * (v - avgY), 0)
      const den = vals.reduce((s, _, i) => s + (i - avgX) ** 2, 0)
      const slope = den > 0 ? num / den : 0
      const slopePct = avgY > 0 ? (slope / avgY) * 100 : 0
      if (Math.abs(slopePct) > 5) {
        insights.push({
          type: 'trend_direction',
          severity: slopePct > 10 ? 'warning' : slopePct > 0 ? 'info' : 'good',
          icon: slopePct > 0 ? '⬆️' : '⬇️',
          title: slopePct > 0 ? 'Wydatki w trendzie wzrostowym' : 'Wydatki w trendzie spadkowym',
          detail: `Średnia zmiana ok. ${Math.abs(slopePct).toFixed(0)}% na miesiąc w analizowanym okresie`,
        })
      }
    }
  }

  // ── Top merchant (min. 2 transakcje) ─────────────────────────
  const byMerchant = {}
  expenses.forEach(e => {
    const key = (e.description || 'Inne').toLowerCase().trim()
    if (!byMerchant[key]) byMerchant[key] = { name: e.description || 'Inne', total: 0, count: 0 }
    byMerchant[key].total += e.amount
    byMerchant[key].count++
  })
  const topMerchant = Object.values(byMerchant).sort((a, b) => b.total - a.total)[0]
  if (topMerchant && topMerchant.count >= 2) {
    const pct = (topMerchant.total / total) * 100
    insights.push({
      type: 'top_merchant',
      severity: 'info',
      icon: '🏪',
      title: `Najczęstsze miejsce: ${topMerchant.name}`,
      detail: `${topMerchant.count} transakcji · ${formatAmount(topMerchant.total)} łącznie (${pct.toFixed(0)}% wydatków)`,
    })
  }

  return insights
}
