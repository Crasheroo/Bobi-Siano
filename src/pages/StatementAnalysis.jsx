import React, { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
  CartesianGrid, Cell,
} from 'recharts'
import useStore from '../store/useStore.js'
import { CATEGORIES } from '../utils/constants.js'
import { useFormatCurrency } from '../hooks/useFormatCurrency.js'
import { useTranslation } from '../hooks/useTranslation.js'
import { generateInsights } from '../services/insightsEngine.js'
import styles from './StatementAnalysis.module.css'

const SEVERITY_COLOR = {
  good: '#30d158',
  info: '#0a84ff',
  warning: '#ff9f0a',
  danger: '#ff453a',
}

const RANGES = [
  { id: '30d',  label: '30 dni' },
  { id: '3m',   label: '3 mies.' },
  { id: '6m',   label: '6 mies.' },
  { id: '12m',  label: 'Rok' },
]

function rangeStart(id) {
  const now = new Date()
  if (id === '30d') return new Date(now.getTime() - 30 * 86_400_000)
  if (id === '3m')  return new Date(now.getFullYear(), now.getMonth() - 3, 1)
  if (id === '6m')  return new Date(now.getFullYear(), now.getMonth() - 6, 1)
  return new Date(now.getFullYear(), now.getMonth() - 12, 1)
}

export default function StatementAnalysis() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const t = useTranslation()
  const formatAmount = useFormatCurrency()
  const { expenses, customCategories, profile, getSalaryForMonth, getMonthlyRecurringTotal } = useStore()
  const allCategories = [...CATEGORIES, ...(customCategories || [])]

  const fromParam = searchParams.get('from')
  const toParam   = searchParams.get('to')

  const [range, setRange] = useState(() => (fromParam && toParam ? 'custom' : '12m'))
  const [customFrom, setCustomFrom] = useState(fromParam || '')
  const [customTo,   setCustomTo]   = useState(toParam   || '')
  const [activeTab, setActiveTab]   = useState('categories')

  const { startDate, endDate } = useMemo(() => {
    if (range === 'custom' && customFrom && customTo) {
      const s = new Date(customFrom); s.setHours(0, 0, 0, 0)
      const e = new Date(customTo);   e.setHours(23, 59, 59, 999)
      return { startDate: s, endDate: e }
    }
    const e = new Date(); e.setHours(23, 59, 59, 999)
    const s = rangeStart(range); s.setHours(0, 0, 0, 0)
    return { startDate: s, endDate: e }
  }, [range, customFrom, customTo])

  const filtered = useMemo(() =>
    expenses.filter(e => { const d = new Date(e.date); return d >= startDate && d <= endDate }),
    [expenses, startDate, endDate]
  )

  const total      = useMemo(() => filtered.reduce((s, e) => s + e.amount, 0), [filtered])
  const daySpan    = Math.max(1, (endDate - startDate) / 86_400_000)
  const monthCount = Math.max(1, daySpan / 30.44)
  const monthlyAvg = total / monthCount
  const dailyAvg   = total / daySpan

  const salary        = getSalaryForMonth(new Date().getFullYear(), new Date().getMonth())
  const recurringAmt  = getMonthlyRecurringTotal()
  const monthlySaved  = salary - monthlyAvg - recurringAmt

  // ── Category data ─────────────────────────────────────────────
  const categoryData = useMemo(() => {
    const map = {}
    filtered.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount })
    return allCategories
      .filter(c => map[c.id])
      .map(c => ({ ...c, amount: map[c.id], pct: total > 0 ? (map[c.id] / total) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount)
  }, [filtered, allCategories, total])

  // ── Monthly data ──────────────────────────────────────────────
  const monthlyData = useMemo(() => {
    const map = {}
    filtered.forEach(e => {
      const d = new Date(e.date)
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
      if (!map[key]) map[key] = { key, year: d.getFullYear(), month: d.getMonth(), amount: 0, count: 0 }
      map[key].amount += e.amount
      map[key].count++
    })
    return Object.values(map)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(m => ({ ...m, label: t.monthsShort[m.month] }))
  }, [filtered, t.monthsShort])

  // ── Merchant data ─────────────────────────────────────────────
  const merchantData = useMemo(() => {
    const map = {}
    filtered.forEach(e => {
      const key = (e.description || 'Inne').toLowerCase().trim()
      if (!map[key]) map[key] = { name: e.description || 'Inne', amount: 0, count: 0 }
      map[key].amount += e.amount
      map[key].count++
    })
    return Object.values(map).sort((a, b) => b.amount - a.amount).slice(0, 10)
  }, [filtered])

  // ── Insights ──────────────────────────────────────────────────
  const insights = useMemo(() =>
    generateInsights(filtered, salary, allCategories, formatAmount),
    [filtered, salary, allCategories, formatAmount]
  )

  const maxMonthAmt = monthlyData.length > 0 ? Math.max(...monthlyData.map(m => m.amount)) : 0

  const fmtDate = d => d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    return <div className={styles.tooltip}>{formatAmount(payload[0].value)}</div>
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <button className="back-home-btn" onClick={() => navigate(-1)} aria-label="Wróć">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div>
          <h1 className={styles.title}>Analiza wyciągu</h1>
          <p className={styles.subtitle}>{fmtDate(startDate)} – {fmtDate(endDate)}</p>
        </div>
        <div style={{ width: 36 }} />
      </div>

      {/* Range pills */}
      <div className={styles.rangePills}>
        {RANGES.map(r => (
          <button
            key={r.id}
            className={`${styles.pill} ${range === r.id ? styles.pillActive : ''}`}
            onClick={() => setRange(r.id)}
          >
            {r.label}
          </button>
        ))}
        <button
          className={`${styles.pill} ${range === 'custom' ? styles.pillActive : ''}`}
          onClick={() => setRange('custom')}
        >
          Własny
        </button>
      </div>

      {range === 'custom' && (
        <div className={styles.customRange}>
          <input type="date" className={styles.dateInput} value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
          <span className={styles.dateSep}>—</span>
          <input type="date" className={styles.dateInput} value={customTo}   onChange={e => setCustomTo(e.target.value)} />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <span>📊</span>
          <p>Brak transakcji w wybranym okresie</p>
          <p className={styles.emptySub}>Zaimportuj wyciąg z banku lub dodaj wydatki ręcznie</p>
        </div>
      ) : (
        <>
          {/* Overview card */}
          <div className={styles.overviewCard}>
            <div className={styles.overviewMain}>
              <p className={styles.overviewLabel}>Łączne wydatki</p>
              <p className={styles.overviewValue}>{formatAmount(total)}</p>
              <p className={styles.overviewSub}>{filtered.length} transakcji</p>
            </div>
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <p className={styles.statLabel}>Avg. / mies.</p>
                <p className={styles.statValue}>{formatAmount(monthlyAvg)}</p>
              </div>
              <div className={styles.statItem}>
                <p className={styles.statLabel}>Avg. / dzień</p>
                <p className={styles.statValue}>{formatAmount(dailyAvg)}</p>
              </div>
              {salary > 0 && <>
                <div className={styles.statItem}>
                  <p className={styles.statLabel}>Oszczęd. / mies.</p>
                  <p className={styles.statValue} style={{ color: monthlySaved >= 0 ? '#30d158' : '#ff453a' }}>
                    {formatAmount(monthlySaved)}
                  </p>
                </div>
                <div className={styles.statItem}>
                  <p className={styles.statLabel}>Wsk. oszczędności</p>
                  <p className={styles.statValue} style={{ color: monthlySaved >= 0 ? '#30d158' : '#ff453a' }}>
                    {((monthlySaved / salary) * 100).toFixed(0)}%
                  </p>
                </div>
              </>}
            </div>
          </div>

          {/* Insights */}
          {insights.length > 0 && (
            <div className={styles.insightsSection}>
              <p className={styles.sectionTitle}>Wnioski</p>
              {insights.map((ins, i) => (
                <div
                  key={i}
                  className={styles.insightCard}
                  style={{ borderLeftColor: SEVERITY_COLOR[ins.severity] || '#0a84ff' }}
                >
                  <span className={styles.insightIcon}>{ins.icon}</span>
                  <div className={styles.insightContent}>
                    <p className={styles.insightTitle}>{ins.title}</p>
                    <p className={styles.insightDetail}>{ins.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className={styles.tabs}>
            {[
              { id: 'categories', label: 'Kategorie' },
              { id: 'monthly',    label: 'Miesiące' },
              { id: 'merchants',  label: 'Miejsca' },
            ].map(tab => (
              <button
                key={tab.id}
                className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Category tab ───────────────────────────────── */}
          {activeTab === 'categories' && (
            <div className={styles.tabContent}>
              {categoryData.map(cat => (
                <div key={cat.id} className={styles.catRow}>
                  <div className={styles.catIcon} style={{ background: cat.color + '22' }}>
                    <span>{cat.icon}</span>
                  </div>
                  <div className={styles.catInfo}>
                    <div className={styles.catHeader}>
                      <span className={styles.catName}>{cat.label}</span>
                      <span className={styles.catAmount}>{formatAmount(cat.amount)}</span>
                    </div>
                    <div className={styles.catBarTrack}>
                      <div className={styles.catBar} style={{ width: `${cat.pct}%`, background: cat.color }} />
                    </div>
                    <span className={styles.catPct}>{cat.pct.toFixed(0)}% wydatków</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Monthly tab ────────────────────────────────── */}
          {activeTab === 'monthly' && (
            <div className={styles.tabContent}>
              {monthlyData.length > 1 && (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" tick={{ fill: 'rgba(235,235,245,0.45)', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(235,235,245,0.45)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      {monthlyData.map((m, i) => (
                        <Cell key={i} fill={m.amount === maxMonthAmt ? '#ff453a' : '#0a84ff'} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
              <div className={styles.monthTable}>
                {[...monthlyData].reverse().map(m => {
                  const diff = monthlyAvg > 0 ? ((m.amount - monthlyAvg) / monthlyAvg) * 100 : 0
                  return (
                    <div key={m.key} className={styles.monthRow}>
                      <span className={styles.monthLabel}>{t.months[m.month]} {m.year}</span>
                      <span className={styles.monthCount}>{m.count} tr.</span>
                      <span className={styles.monthAmount}>{formatAmount(m.amount)}</span>
                      {monthlyData.length > 1 && (
                        <span className={styles.monthDiff} style={{ color: diff > 5 ? '#ff453a' : diff < -5 ? '#30d158' : 'var(--text-tertiary)' }}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(0)}%
                        </span>
                      )}
                    </div>
                  )
                })}
                {monthlyData.length > 1 && (
                  <div className={`${styles.monthRow} ${styles.monthRowAvg}`}>
                    <span className={styles.monthLabel}>Średnia</span>
                    <span className={styles.monthCount} />
                    <span className={styles.monthAmount}>{formatAmount(monthlyAvg)}</span>
                    <span className={styles.monthDiff} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Merchants tab ──────────────────────────────── */}
          {activeTab === 'merchants' && (
            <div className={styles.tabContent}>
              {merchantData.map((m, i) => (
                <div key={i} className={styles.merchantRow}>
                  <div className={styles.merchantRank}>#{i + 1}</div>
                  <div className={styles.merchantInfo}>
                    <p className={styles.merchantName}>{m.name}</p>
                    <p className={styles.merchantCount}>{m.count} transakcji</p>
                  </div>
                  <div className={styles.merchantRight}>
                    <p className={styles.merchantAmount}>{formatAmount(m.amount)}</p>
                    <p className={styles.merchantPct}>{total > 0 ? ((m.amount / total) * 100).toFixed(0) : 0}%</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
