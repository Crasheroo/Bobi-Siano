import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer,
  Tooltip, Cell, CartesianGrid, ReferenceLine,
} from 'recharts'
import useStore from '../store/useStore.js'
import { CATEGORIES } from '../utils/constants.js'
import { useFormatCurrency } from '../hooks/useFormatCurrency.js'
import { useTranslation } from '../hooks/useTranslation.js'
import styles from './MonthlyHistory.module.css'

// Discretionary categories — flagged as "unnecessary" when >20% above their own average
const DISCRETIONARY = new Set(['restaurants', 'entertainment', 'shopping', 'travel', 'fitness'])

export default function MonthlyHistory() {
  const navigate  = useNavigate()
  const t         = useTranslation()
  const fmt       = useFormatCurrency()
  const { expenses, customCategories } = useStore()
  const allCategories = [...CATEGORIES, ...(customCategories || [])]

  // ── Build month buckets ───────────────────────────────────────
  const monthlyData = useMemo(() => {
    const map = {}
    expenses.forEach(e => {
      const d = new Date(e.date)
      if (isNaN(d.getTime())) return
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!map[key]) map[key] = { key, year: d.getFullYear(), month: d.getMonth(), amount: 0, count: 0, byCategory: {} }
      map[key].amount += e.amount
      map[key].count++
      map[key].byCategory[e.category] = (map[key].byCategory[e.category] || 0) + e.amount
    })
    return Object.values(map).sort((a, b) => a.key.localeCompare(b.key))
  }, [expenses])

  const [selectedKey, setSelectedKey] = useState(() =>
    monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].key : null
  )

  useEffect(() => {
    if (monthlyData.length > 0 && !monthlyData.find(m => m.key === selectedKey))
      setSelectedKey(monthlyData[monthlyData.length - 1].key)
  }, [monthlyData, selectedKey])

  // ── Aggregate stats ───────────────────────────────────────────
  const avgTotal = useMemo(() =>
    monthlyData.length > 0 ? monthlyData.reduce((s, m) => s + m.amount, 0) / monthlyData.length : 0,
    [monthlyData]
  )

  const catAvg = useMemo(() => {
    const totals = {}
    monthlyData.forEach(m =>
      Object.entries(m.byCategory).forEach(([cat, amt]) => { totals[cat] = (totals[cat] || 0) + amt })
    )
    const res = {}
    Object.entries(totals).forEach(([cat, tot]) => { res[cat] = tot / monthlyData.length })
    return res
  }, [monthlyData])

  const bestMonth  = useMemo(() => monthlyData.length > 1 ? [...monthlyData].sort((a, b) => a.amount - b.amount)[0] : null, [monthlyData])
  const worstMonth = useMemo(() => monthlyData.length > 1 ? [...monthlyData].sort((a, b) => b.amount - a.amount)[0] : null, [monthlyData])

  // ── Selected month detail ─────────────────────────────────────
  const selectedIdx = monthlyData.findIndex(m => m.key === selectedKey)
  const selected    = monthlyData[selectedIdx] ?? null

  const selectedCats = useMemo(() => {
    if (!selected) return []
    return allCategories
      .filter(c => selected.byCategory[c.id])
      .map(c => ({
        ...c,
        amount:  selected.byCategory[c.id],
        avg:     catAvg[c.id] || 0,
        diffPct: catAvg[c.id] > 0 ? ((selected.byCategory[c.id] - catAvg[c.id]) / catAvg[c.id]) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [selected, allCategories, catAvg])

  const unnecessaryItems = useMemo(() =>
    selectedCats.filter(c => DISCRETIONARY.has(c.id) && c.diffPct > 20 && monthlyData.length > 1),
    [selectedCats, monthlyData.length]
  )

  const diffVsAvg = selected && avgTotal > 0 ? ((selected.amount - avgTotal) / avgTotal) * 100 : 0

  const monthName = (year, month) => `${t.months[month]} ${year}`

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const m = payload[0].payload
    return (
      <div className={styles.tooltip}>
        <p className={styles.ttMonth}>{monthName(m.year, m.month)}</p>
        <p className={styles.ttAmount}>{fmt(m.amount)}</p>
      </div>
    )
  }

  // ── Empty state ───────────────────────────────────────────────
  if (monthlyData.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <button className="back-home-btn" onClick={() => navigate(-1)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h1 className={styles.title}>Historia miesięcy</h1>
          <div style={{ width: 36 }} />
        </div>
        <div className={styles.empty}>
          <span>📅</span>
          <p>Brak danych historycznych</p>
          <p className={styles.emptySub}>Dodaj wydatki lub zaimportuj wyciąg z banku</p>
        </div>
      </div>
    )
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
          <h1 className={styles.title}>Historia miesięcy</h1>
          <p className={styles.subtitle}>{monthlyData.length} {monthlyData.length === 1 ? 'miesiąc' : monthlyData.length < 5 ? 'miesiące' : 'miesięcy'} danych</p>
        </div>
        <div style={{ width: 36 }} />
      </div>

      {/* Best / Worst / Avg summary cards */}
      {monthlyData.length > 1 && (
        <div className={styles.summaryRow}>
          <button className={`${styles.summaryCard} ${styles.summaryBest}`} onClick={() => setSelectedKey(bestMonth.key)}>
            <span className={styles.summaryEmoji}>🏆</span>
            <p className={styles.summaryLabel}>Najlepszy</p>
            <p className={styles.summaryMonthName}>{t.monthsShort[bestMonth.month]} {bestMonth.year}</p>
            <p className={styles.summaryAmount} style={{ color: '#30d158' }}>{fmt(bestMonth.amount)}</p>
          </button>
          <button className={`${styles.summaryCard} ${styles.summaryWorst}`} onClick={() => setSelectedKey(worstMonth.key)}>
            <span className={styles.summaryEmoji}>📈</span>
            <p className={styles.summaryLabel}>Najwyższy</p>
            <p className={styles.summaryMonthName}>{t.monthsShort[worstMonth.month]} {worstMonth.year}</p>
            <p className={styles.summaryAmount} style={{ color: '#ff453a' }}>{fmt(worstMonth.amount)}</p>
          </button>
          <div className={`${styles.summaryCard} ${styles.summaryAvg}`}>
            <span className={styles.summaryEmoji}>📊</span>
            <p className={styles.summaryLabel}>Średnia</p>
            <p className={styles.summaryMonthName}>miesięcznie</p>
            <p className={styles.summaryAmount}>{fmt(avgTotal)}</p>
          </div>
        </div>
      )}

      {/* All-months bar chart */}
      <div className={styles.chartCard}>
        <p className={styles.chartTitle}>Wszystkie miesiące</p>
        <ResponsiveContainer width="100%" height={190}>
          <BarChart
            data={monthlyData}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            onClick={data => data?.activePayload && setSelectedKey(data.activePayload[0].payload.key)}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="month"
              tickFormatter={m => t.monthsShort[m]}
              tick={{ fill: 'rgba(235,235,245,0.45)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'rgba(235,235,245,0.45)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
              width={30}
            />
            <Tooltip content={<CustomTooltip />} />
            {avgTotal > 0 && (
              <ReferenceLine y={avgTotal} stroke="rgba(235,235,245,0.2)" strokeDasharray="5 4" />
            )}
            <Bar dataKey="amount" radius={[4, 4, 0, 0]} cursor="pointer">
              {monthlyData.map((m, i) => {
                if (m.key === selectedKey)   return <Cell key={i} fill="var(--accent-blue)" fillOpacity={1} />
                if (m.key === bestMonth?.key)  return <Cell key={i} fill="#30d158" fillOpacity={0.7} />
                if (m.key === worstMonth?.key) return <Cell key={i} fill="#ff453a" fillOpacity={0.7} />
                return <Cell key={i} fill="rgba(235,235,245,0.2)" />
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className={styles.chartHint}>Dotknij słupka · Najlepszy 🟢 · Najgorszy 🔴 · Wybrany 🔵</p>
      </div>

      {/* Month navigator + detail */}
      {selected && (
        <>
          <div className={styles.monthNav}>
            <button
              className={styles.navArrow}
              onClick={() => setSelectedKey(monthlyData[selectedIdx - 1].key)}
              disabled={selectedIdx === 0}
            >‹</button>
            <div className={styles.navCenter}>
              <p className={styles.navMonth}>{monthName(selected.year, selected.month)}</p>
              <p className={styles.navTotal}>{fmt(selected.amount)}</p>
              {monthlyData.length > 1 && (
                <span
                  className={styles.navDiff}
                  style={{ color: diffVsAvg > 5 ? '#ff453a' : diffVsAvg < -5 ? '#30d158' : 'var(--text-tertiary)' }}
                >
                  {diffVsAvg > 0 ? '+' : ''}{diffVsAvg.toFixed(0)}% vs średnia
                </span>
              )}
            </div>
            <button
              className={styles.navArrow}
              onClick={() => setSelectedKey(monthlyData[selectedIdx + 1].key)}
              disabled={selectedIdx === monthlyData.length - 1}
            >›</button>
          </div>

          {/* Unnecessary spending alert */}
          {unnecessaryItems.length > 0 && (
            <div className={styles.unnecessaryCard}>
              <p className={styles.unnecessaryTitle}>⚠️ Zbędne wydatki tego miesiąca</p>
              <p className={styles.unnecessaryDesc}>Te kategorie były wyraźnie powyżej Twojej normy</p>
              {unnecessaryItems.map(item => (
                <div key={item.id} className={styles.unnecessaryRow}>
                  <span className={styles.unnecessaryIcon}>{item.icon}</span>
                  <span className={styles.unnecessaryName}>{item.label}</span>
                  <div className={styles.unnecessaryRight}>
                    <span className={styles.unnecessaryAmount}>{fmt(item.amount)}</span>
                    <span className={styles.unnecessaryBadge}>+{item.diffPct.toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Category breakdown */}
          <div className={styles.catSection}>
            <p className={styles.sectionTitle}>Kategorie</p>
            {selectedCats.map(cat => (
              <div key={cat.id} className={styles.catRow}>
                <div className={styles.catIcon} style={{ background: cat.color + '22' }}>
                  <span>{cat.icon}</span>
                </div>
                <div className={styles.catInfo}>
                  <div className={styles.catHeader}>
                    <span className={styles.catName}>{cat.label}</span>
                    <span className={styles.catAmount}>{fmt(cat.amount)}</span>
                  </div>
                  <div className={styles.catBarTrack}>
                    <div className={styles.catBar} style={{ width: `${(cat.amount / selected.amount) * 100}%`, background: cat.color }} />
                  </div>
                  {cat.avg > 0 && monthlyData.length > 1 && (
                    <span
                      className={styles.catDiff}
                      style={{ color: cat.diffPct > 15 ? '#ff453a' : cat.diffPct < -15 ? '#30d158' : 'var(--text-tertiary)' }}
                    >
                      {cat.diffPct > 0 ? '+' : ''}{cat.diffPct.toFixed(0)}% vs avg · norma {fmt(cat.avg)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className={styles.txCount}>{selected.count} transakcji</p>
        </>
      )}
    </div>
  )
}
