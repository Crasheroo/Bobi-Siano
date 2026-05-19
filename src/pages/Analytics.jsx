import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip, Area, AreaChart
} from 'recharts'
import useStore from '../store/useStore.js'
import { CATEGORIES } from '../utils/constants.js'
import { useTranslation } from '../hooks/useTranslation.js'
import { useFormatCurrency } from '../hooks/useFormatCurrency.js'
import { getPayPeriod, formatPeriodLabel } from '../utils/payPeriod.js'
import { generateSavingsAdvice } from '../services/savingsAdvisor.js'
import styles from './Analytics.module.css'

const CHART_COLORS = ['#0a84ff', '#30d158', '#ff9f0a', '#ff453a', '#bf5af2', '#5ac8fa', '#ff6b35', '#5e5ce6', '#34c759', '#ffd60a', '#64d2ff', '#98989e']

export default function Analytics() {
  const navigate = useNavigate()
  const t = useTranslation()
  const formatAmount = useFormatCurrency()
  const { expenses, customCategories, goals, getMonthlyRecurringTotal, getSalaryForMonth, profile } = useStore()
  const allCategories = [...CATEGORIES, ...(customCategories || [])]
  const [activeTab, setActiveTab] = useState('advice')
  const now = new Date()

  const salaryDay = profile?.salaryDay ?? 1
  const payPeriod = getPayPeriod(now, salaryDay)

  const monthExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const d = new Date(e.date)
      return d >= payPeriod.start && d <= payPeriod.end
    })
  }, [expenses, payPeriod.start.getTime(), payPeriod.end.getTime()])

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
      const ref = new Date()
      ref.setMonth(ref.getMonth() - i)
      const period = getPayPeriod(ref, salaryDay)
      const periodExp = expenses.filter(e => {
        const d = new Date(e.date)
        return d >= period.start && d <= period.end
      })
      const total = periodExp.reduce((s, e) => s + e.amount, 0)
      const py = period.start.getFullYear()
      const pm = period.start.getMonth()
      result.push({
        month: t.monthsShort[pm],
        wydatki: Math.round(total),
        budzet: Math.round(getSalaryForMonth(py, pm)),
      })
    }
    return result
  }, [expenses, getSalaryForMonth, salaryDay, t.monthsShort])

  const recurringTotal = getMonthlyRecurringTotal()
  const expensesTotal = monthExpenses.reduce((s, e) => s + e.amount, 0)
  const totalSpent = expensesTotal + recurringTotal
  const currentSalary = getSalaryForMonth(payPeriod.start.getFullYear(), payPeriod.start.getMonth())
  const saved = currentSalary - totalSpent
  const savingRate = currentSalary > 0 ? (saved / currentSalary) * 100 : 0

  const savingsAdvice = useMemo(() =>
    generateSavingsAdvice({ expenses, salary: currentSalary, goals: goals || [], recurringTotal }),
    [expenses, currentSalary, goals, recurringTotal]
  )

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
          <p className={styles.subtitle}>
            {salaryDay > 1 ? formatPeriodLabel(payPeriod.start, payPeriod.end) : `${t.months[now.getMonth()]} ${now.getFullYear()}`}
          </p>
        </div>
        <button className={styles.historyBtn} onClick={() => navigate('/history')} title="Historia miesięcy">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M3 9h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M8 2v3M16 2v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M7 14h2M11 14h2M15 14h2M7 17.5h2M11 17.5h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
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
          { id: 'advice',     label: 'Porady' },
          { id: 'categories', label: t.analytics.tabCategories },
          { id: 'trend',      label: t.analytics.tabTrend },
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

      {activeTab === 'advice' && (
        <div className={styles.chartSection}>
          {!savingsAdvice ? (
            <div className={styles.empty}>
              <span>📊</span>
              <p>Potrzebujesz przynajmniej 1 pełny miesiąc danych historycznych</p>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className={styles.adviceSummary}>
                <div>
                  <p className={styles.adviceSummaryLabel}>Możesz zaoszczędzić</p>
                  <p className={styles.adviceSummaryAmount}>
                    {formatAmount(savingsAdvice.totalPotentialMonthly)}
                    <span className={styles.adviceSummaryUnit}>/mies.</span>
                  </p>
                  <p className={styles.adviceSummaryYear}>to {formatAmount(savingsAdvice.totalPotentialAnnual)} rocznie</p>
                </div>
                <div className={styles.adviceSummaryRight}>
                  <p className={styles.adviceSummaryMeta}>na podstawie</p>
                  <p className={styles.adviceSummaryMonths}>{savingsAdvice.monthCount}</p>
                  <p className={styles.adviceSummaryMeta}>{savingsAdvice.monthCount === 1 ? 'miesiąca' : 'miesięcy'}</p>
                </div>
              </div>

              {/* Recommendations */}
              {savingsAdvice.recommendations.length === 0 ? (
                <div className={styles.adviceAllGood}>
                  <span>✅</span>
                  <p>Twoje wydatki są w normie we wszystkich kategoriach!</p>
                </div>
              ) : (
                savingsAdvice.recommendations.map((rec) => {
                  const cat = allCategories.find(c => c.id === rec.catId)
                  if (!cat) return null
                  const statusColor = rec.overBenchmark ? '#ff453a' : '#ff9f0a'
                  return (
                    <div key={rec.catId} className={styles.adviceCard} style={{ borderLeftColor: statusColor }}>
                      <div className={styles.adviceCardHeader}>
                        <div className={styles.adviceCardIcon} style={{ background: cat.color + '22' }}>{cat.icon}</div>
                        <div className={styles.adviceCardMeta}>
                          <span className={styles.adviceCardName}>{cat.label}</span>
                          <span className={styles.adviceCardAmount}>{formatAmount(rec.median)}/mies.</span>
                        </div>
                        <span className={styles.adviceBadge} style={{ background: statusColor + '22', color: statusColor }}>
                          {(rec.pctOfSalary * 100).toFixed(0)}% wypłaty
                        </span>
                      </div>
                      {rec.overBenchmark && (
                        <p className={styles.adviceOverLimit}>
                          ⚠ Wydajesz {formatAmount(rec.median - rec.benchmarkAmt)} powyżej rekomendowanego limitu ({formatAmount(rec.benchmarkAmt)}/mies.)
                        </p>
                      )}
                      <div className={styles.adviceSavingsRow}>
                        <span className={styles.adviceSavingsArrow}>→</span>
                        <span className={styles.adviceSavingsText}>
                          Potencjalna oszczędność:{' '}
                          <strong>{formatAmount(rec.savingsMonthly)}/mies.</strong>
                          {' · '}
                          <strong>{formatAmount(rec.savingsAnnual)}/rok</strong>
                        </span>
                      </div>
                      {rec.tips.length > 0 && (
                        <ul className={styles.adviceTips}>
                          {rec.tips.map((tip, i) => <li key={i}>{tip}</li>)}
                        </ul>
                      )}
                    </div>
                  )
                })
              )}

              {/* Goal simulations */}
              {savingsAdvice.goalSims.length > 0 && (
                <div className={styles.adviceGoalsSection}>
                  <p className={styles.adviceSectionTitle}>Przyspieszenie celów</p>
                  {savingsAdvice.goalSims.map(g => (
                    <div key={g.id} className={styles.adviceGoalRow}>
                      <p className={styles.adviceGoalName}>{g.name}</p>
                      <div className={styles.adviceGoalTimes}>
                        <div className={styles.adviceGoalTime}>
                          <span className={styles.adviceGoalTimeVal} style={{ color: 'var(--text-tertiary)' }}>
                            {g.monthsNow != null ? `${g.monthsNow} mies.` : '—'}
                          </span>
                          <span className={styles.adviceGoalTimeLabel}>teraz</span>
                        </div>
                        <span className={styles.adviceGoalArrow}>→</span>
                        <div className={styles.adviceGoalTime}>
                          <span className={styles.adviceGoalTimeVal} style={{ color: '#30d158' }}>
                            {g.monthsOpt != null ? `${g.monthsOpt} mies.` : '—'}
                          </span>
                          <span className={styles.adviceGoalTimeLabel}>po optymalizacji</span>
                        </div>
                        {g.monthsSaved != null && g.monthsSaved > 0 && (
                          <span className={styles.adviceGoalSaved}>−{g.monthsSaved} mies.</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

    </div>
  )
}
