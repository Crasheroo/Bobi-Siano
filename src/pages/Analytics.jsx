import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, Area, AreaChart
} from 'recharts'
import useStore from '../store/useStore.js'
import { CATEGORIES } from '../utils/constants.js'
import { useTranslation } from '../hooks/useTranslation.js'
import { useFormatCurrency } from '../hooks/useFormatCurrency.js'
import styles from './Analytics.module.css'

const CHART_COLORS = ['#0a84ff', '#30d158', '#ff9f0a', '#ff453a', '#bf5af2', '#5ac8fa', '#ff6b35', '#5e5ce6', '#34c759', '#ffd60a', '#64d2ff', '#98989e']

export default function Analytics() {
  const navigate = useNavigate()
  const t = useTranslation()
  const formatAmount = useFormatCurrency()
  const { expenses, customCategories, getMonthlyRecurringTotal, getSalaryForMonth } = useStore()
  const allCategories = [...CATEGORIES, ...(customCategories || [])]
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
    return allCategories
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
        month: t.monthsShort[m],
        wydatki: Math.round(total),
        budzet: Math.round(getSalaryForMonth(y, m)),
      })
    }
    return result
  }, [expenses, getSalaryForMonth, t.monthsShort])

  const recurringTotal = getMonthlyRecurringTotal()
  const expensesTotal = monthExpenses.reduce((s, e) => s + e.amount, 0)
  const totalSpent = expensesTotal + recurringTotal
  const currentSalary = getSalaryForMonth(now.getFullYear(), now.getMonth())
  const saved = currentSalary - totalSpent
  const savingRate = currentSalary > 0 ? (saved / currentSalary) * 100 : 0

  const budgetData = [
    { name: t.analytics.recurringPayments, value: Math.round(recurringTotal), color: '#5e5ce6' },
    { name: t.analytics.expensesLabel, value: Math.round(expensesTotal), color: '#ff453a' },
    { name: t.analytics.savingsLabel, value: Math.max(0, Math.round(saved)), color: '#30d158' },
  ].filter(d => d.value > 0)

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    return (
      <div className={styles.tooltip}>
        <p className={styles.tooltipLabel}>{payload[0].name || payload[0].dataKey}</p>
        <p className={styles.tooltipValue}>{formatAmount(payload[0].value)}</p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className="back-home-btn" onClick={() => navigate('/')} aria-label={t.common.back}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div>
          <h1 className={styles.title}>{t.analytics.title}</h1>
          <p className={styles.subtitle}>{t.months[now.getMonth()]} {now.getFullYear()}</p>
        </div>
      </div>

      {/* Score card */}
      <div className={styles.scoreCard}>
        <div className={styles.scoreLeft}>
          <p className={styles.scoreLabel}>{t.analytics.savingsRate}</p>
          <p className={styles.scoreValue} style={{ color: savingRate >= 20 ? '#30d158' : savingRate > 0 ? '#ff9f0a' : '#ff453a' }}>
            {savingRate.toFixed(1)}%
          </p>
          <p className={styles.scoreSub}>
            {savingRate >= 20 ? t.analytics.great : savingRate > 0 ? t.analytics.couldBeBetter : t.analytics.tooMuch}
          </p>
        </div>
        <div className={styles.scoreRight}>
          <p className={styles.scoreDetail}>{t.analytics.earnings} <strong>{formatAmount(currentSalary)}</strong></p>
          <p className={styles.scoreDetail}>{t.analytics.spent} <strong style={{ color: '#ff453a' }}>{formatAmount(totalSpent)}</strong></p>
          <p className={styles.scoreDetail}>{t.analytics.left} <strong style={{ color: saved >= 0 ? '#30d158' : '#ff453a' }}>{formatAmount(saved)}</strong></p>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {[
          { id: 'categories', label: t.analytics.tabCategories },
          { id: 'trend', label: t.analytics.tabTrend },
          { id: 'budget', label: t.analytics.tabBudget },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Charts */}
      {activeTab === 'categories' && (
        <div className={styles.chartSection}>
          {categoryData.length === 0 ? (
            <div className={styles.empty}><span>📊</span><p>{t.analytics.noData}</p></div>
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
                    <span className={styles.legendValue}>{formatAmount(cat.value)}</span>
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
          <p className={styles.chartTitle}>{t.analytics.trendTitle}</p>
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
              <Area type="monotone" dataKey="wydatki" name={t.analytics.expensesLabel} stroke="#0a84ff" strokeWidth={2.5} fill="url(#grad1)" dot={{ fill: '#0a84ff', r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === 'budget' && (
        <div className={styles.chartSection}>
          <p className={styles.chartTitle}>{t.analytics.budgetTitle}</p>
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
                <span className={styles.budgetVal}>{formatAmount(item.value)}</span>
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
