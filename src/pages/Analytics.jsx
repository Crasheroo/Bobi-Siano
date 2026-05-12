import React, { useMemo, useState } from 'react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, Area, AreaChart
} from 'recharts'
import useStore from '../store/useStore.js'
import { CATEGORIES, formatCurrency, MONTH_NAMES } from '../utils/constants.js'
import styles from './Analytics.module.css'

const CHART_COLORS = ['#0a84ff', '#30d158', '#ff9f0a', '#ff453a', '#bf5af2', '#5ac8fa', '#ff6b35', '#5e5ce6', '#34c759', '#ffd60a', '#64d2ff', '#98989e']

export default function Analytics() {
  const { expenses, profile, getMonthlyRecurringTotal, getSalaryForMonth } = useStore()
  const [activeTab, setActiveTab] = useState('categories')
  const now = new Date()

  const monthExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const d = new Date(e.date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
  }, [expenses])

  const categoryData = useMemo(() => {
    const map = {}
    monthExpenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount
    })
    return CATEGORIES
      .filter((c) => map[c.id])
      .map((c) => ({ name: c.label, value: map[c.id], icon: c.icon, color: c.color }))
      .sort((a, b) => b.value - a.value)
  }, [monthExpenses])

  const last6Months = useMemo(() => {
    const result = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const m = d.getMonth()
      const y = d.getFullYear()
      const monthExp = expenses.filter((e) => {
        const ed = new Date(e.date)
        return ed.getMonth() === m && ed.getFullYear() === y
      })
      const total = monthExp.reduce((s, e) => s + e.amount, 0)
      result.push({
        month: MONTH_NAMES[m].slice(0, 3),
        wydatki: Math.round(total),
        budzet: Math.round(getSalaryForMonth(y, m)),
      })
    }
    return result
  }, [expenses, getSalaryForMonth])

  const recurringTotal = getMonthlyRecurringTotal()
  const expensesTotal = monthExpenses.reduce((s, e) => s + e.amount, 0)
  const totalSpent = expensesTotal + recurringTotal
  const currentSalary = getSalaryForMonth(now.getFullYear(), now.getMonth())
  const saved = currentSalary - totalSpent
  const savingRate = currentSalary > 0 ? (saved / currentSalary) * 100 : 0

  const budgetData = [
    { name: 'Stałe płatności', value: Math.round(recurringTotal), color: '#5e5ce6' },
    { name: 'Wydatki', value: Math.round(expensesTotal), color: '#ff453a' },
    { name: 'Oszczędności', value: Math.max(0, Math.round(saved)), color: '#30d158' },
  ].filter(d => d.value > 0)

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    return (
      <div className={styles.tooltip}>
        <p className={styles.tooltipLabel}>{payload[0].name || payload[0].dataKey}</p>
        <p className={styles.tooltipValue}>{formatCurrency(payload[0].value)}</p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Analiza</h1>
        <p className={styles.subtitle}>{MONTH_NAMES[now.getMonth()]} {now.getFullYear()}</p>
      </div>

      {/* Score card */}
      <div className={styles.scoreCard}>
        <div className={styles.scoreLeft}>
          <p className={styles.scoreLabel}>Wskaźnik oszczędności</p>
          <p className={styles.scoreValue} style={{ color: savingRate >= 20 ? '#30d158' : savingRate > 0 ? '#ff9f0a' : '#ff453a' }}>
            {savingRate.toFixed(1)}%
          </p>
          <p className={styles.scoreSub}>
            {savingRate >= 20 ? '🎯 Świetnie!' : savingRate > 0 ? '⚠️ Można lepiej' : '🚨 Wydajesz za dużo'}
          </p>
        </div>
        <div className={styles.scoreRight}>
          <p className={styles.scoreDetail}>Zarobki: <strong>{formatCurrency(currentSalary)}</strong></p>
          <p className={styles.scoreDetail}>Wydano: <strong style={{ color: '#ff453a' }}>{formatCurrency(totalSpent)}</strong></p>
          <p className={styles.scoreDetail}>Zostało: <strong style={{ color: saved >= 0 ? '#30d158' : '#ff453a' }}>{formatCurrency(saved)}</strong></p>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {[
          { id: 'categories', label: 'Kategorie' },
          { id: 'trend', label: 'Trend' },
          { id: 'budget', label: 'Budżet' },
        ].map((t) => (
          <button
            key={t.id}
            className={`${styles.tab} ${activeTab === t.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Charts */}
      {activeTab === 'categories' && (
        <div className={styles.chartSection}>
          {categoryData.length === 0 ? (
            <div className={styles.empty}><span>📊</span><p>Brak danych za ten miesiąc</p></div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                    {categoryData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className={styles.legend}>
                {categoryData.map((cat, i) => (
                  <div key={i} className={styles.legendItem}>
                    <div className={styles.legendDot} style={{ background: cat.color }} />
                    <span className={styles.legendIcon}>{cat.icon}</span>
                    <span className={styles.legendName}>{cat.name}</span>
                    <span className={styles.legendValue}>{formatCurrency(cat.value)}</span>
                    <span className={styles.legendPct}>
                      {expensesTotal > 0 ? ((cat.value / expensesTotal) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'trend' && (
        <div className={styles.chartSection}>
          <p className={styles.chartTitle}>Wydatki — ostatnie 6 miesięcy</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={last6Months} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0a84ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0a84ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" tick={{ fill: 'rgba(235,235,245,0.45)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(235,235,245,0.45)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="wydatki" name="Wydatki" stroke="#0a84ff" strokeWidth={2.5} fill="url(#grad1)" dot={{ fill: '#0a84ff', r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === 'budget' && (
        <div className={styles.chartSection}>
          <p className={styles.chartTitle}>Podział dochodu w tym miesiącu</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={budgetData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value">
                {budgetData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className={styles.budgetBreakdown}>
            {budgetData.map((item, i) => (
              <div key={i} className={styles.budgetRow}>
                <div className={styles.budgetDot} style={{ background: item.color }} />
                <span className={styles.budgetName}>{item.name}</span>
                <span className={styles.budgetVal}>{formatCurrency(item.value)}</span>
                <span className={styles.budgetPct}>
                  {currentSalary > 0 ? ((item.value / currentSalary) * 100).toFixed(0) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
