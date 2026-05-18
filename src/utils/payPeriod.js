// Returns the pay period (start/end) that contains referenceDate,
// given the day-of-month when salary arrives (1 = calendar month).
export function getPayPeriod(referenceDate, salaryDay) {
  const day = salaryDay ?? 1
  const d = referenceDate

  if (day <= 1) {
    const start = new Date(d.getFullYear(), d.getMonth(), 1)
    start.setHours(0, 0, 0, 0)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }

  let startYear, startMonth
  if (d.getDate() >= day) {
    startYear = d.getFullYear()
    startMonth = d.getMonth()
  } else {
    const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1)
    startYear = prev.getFullYear()
    startMonth = prev.getMonth()
  }

  const start = new Date(startYear, startMonth, day)
  start.setHours(0, 0, 0, 0)
  const nextStart = new Date(startYear, startMonth + 1, day)
  const end = new Date(nextStart.getTime() - 1)

  return { start, end }
}

export function formatPeriodLabel(start, end) {
  const opts = { day: 'numeric', month: 'short' }
  const s = start.toLocaleDateString('pl-PL', opts)
  const e = end.toLocaleDateString('pl-PL', { ...opts, year: 'numeric' })
  return `${s} – ${e}`
}
