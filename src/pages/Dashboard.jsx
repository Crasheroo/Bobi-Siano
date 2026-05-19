import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore.js'
import { CATEGORIES, CURRENCIES, formatDate } from '../utils/constants.js'
import { useTranslation } from '../hooks/useTranslation.js'
import { useFormatCurrency } from '../hooks/useFormatCurrency.js'
import { getPayPeriod } from '../utils/payPeriod.js'
import QuickAddModal from '../components/QuickAddModal.jsx'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const navigate = useNavigate()
  const { profile, expenses, recurring, goals, monthlySalaries, customCategories,
          categoryBudgets, getCurrentMonthExpenses, getMonthlyRecurringTotal,
          getSalaryForMonth, setMonthlySalary, addToGoal, settings } = useStore()
  const t = useTranslation()
  const fmt = useFormatCurrency()
  const currencySymbol = CURRENCIES.find(c => c.code === (settings?.currency || 'PLN'))?.symbol || 'zł'
  const allCategories = [...CATEGORIES, ...(customCategories || [])]
  const getCat = (id) => allCategories.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1]

  const [showSalaryModal, setShowSalaryModal] = useState(false)
  const [salaryInput, setSalaryInput] = useState('')
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [showGoalAdd, setShowGoalAdd] = useState(false)
  const [goalAddInput, setGoalAddInput] = useState('')

  const now = new Date()
  const monthName = t.months[now.getMonth()]
  const payPeriod = getPayPeriod(now, profile?.salaryDay ?? 1)

  const currentSalary = getSalaryForMonth(now.getFullYear(), now.getMonth())
  const salarySetThisMonth = (monthlySalaries || []).some(
    (ms) => ms.year === now.getFullYear() && ms.month === now.getMonth()
  )

  // Use pay period expenses (respects salary day)
  const monthExpenses = useMemo(() => {
    return expenses.filter(e => {
      const d = new Date(e.date)
      return d >= payPeriod.start && d <= payPeriod.end
    })
  }, [expenses, payPeriod.start, payPeriod.end])

  const recurringTotal = getMonthlyRecurringTotal()
  const expensesTotal  = monthExpenses.reduce((s, e) => s + e.amount, 0)
  const totalSpent     = expensesTotal + recurringTotal
  const remaining      = currentSalary - totalSpent
  const savingsRate    = currentSalary > 0 ? ((remaining / currentSalary) * 100) : 0
  const spentPercent   = currentSalary > 0 ? Math.min((totalSpent / currentSalary) * 100, 100) : 0

  const statusBanner = useMemo(() => {
    if (currentSalary === 0) return null
    if (spentPercent >= 100)
      return { text: `Budżet przekroczony o ${fmt(Math.abs(remaining))} — czas zacisnąć pasa`, color: '#ff453a', bg: 'rgba(255,69,58,0.12)' }
    if (spentPercent >= 85)
      return { text: `Zostało tylko ${fmt(remaining)} — ostrożnie z wydatkami`, color: '#ff9f0a', bg: 'rgba(255,159,10,0.12)' }
    if (spentPercent >= 70)
      return { text: `Wydałeś ${spentPercent.toFixed(0)}% budżetu — miej oko na wydatki`, color: '#ff9f0a', bg: 'rgba(255,159,10,0.12)' }
    if (savingsRate >= 20)
      return { text: `Świetnie! Oszczędzasz ${savingsRate.toFixed(0)}% wypłaty — tak trzymaj`, color: '#30d158', bg: 'rgba(48,209,88,0.1)' }
    return { text: `Na razie w porządku — ${fmt(remaining)} do dyspozycji`, color: '#30d158', bg: 'rgba(48,209,88,0.08)' }
  }, [currentSalary, spentPercent, remaining, savingsRate, fmt])

  // ── Month-end spending forecast ──────────────────────────────────────
  const forecast = useMemo(() => {
    const dayOfMonth  = now.getDate()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    if (dayOfMonth < 5 || monthExpenses.length === 0) return null

    // Use calendar-month expenses for the forecast (not pay period)
    const calMonthExpenses = expenses.filter(e => {
      const d = new Date(e.date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    const calTotal = calMonthExpenses.reduce((s, e) => s + e.amount, 0)
    const dailyAvg = calTotal / dayOfMonth
    const projected = Math.round(dailyAvg * daysInMonth)
    const diff = projected - currentSalary
    return { projected, diff, dailyAvg }
  }, [expenses, now, currentSalary, monthExpenses.length])

  // ── Budget widget: categories near/over limit ────────────────────────
  const budgetAlerts = useMemo(() => {
    const catSpending = {}
    monthExpenses.forEach(e => {
      catSpending[e.category] = (catSpending[e.category] || 0) + e.amount
    })
    return Object.entries(categoryBudgets)
      .map(([catId, limit]) => {
        const cat   = allCategories.find(c => c.id === catId)
        const spent = catSpending[catId] || 0
        const pct   = limit > 0 ? (spent / limit) * 100 : 0
        return { catId, cat, spent, limit, pct }
      })
      .filter(b => b.pct >= 70 && b.cat)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 3)
  }, [monthExpenses, categoryBudgets, allCategories])

  const handleSalarySave = () => {
    const val = Number(salaryInput)
    if (!isNaN(val) && val >= 0) setMonthlySalary(now.getFullYear(), now.getMonth(), val)
    setShowSalaryModal(false)
    setSalaryInput('')
  }

  const handleGoalAddSave = () => {
    const val = Number(goalAddInput)
    if (!isNaN(val) && val > 0 && topGoal) addToGoal(topGoal.id, val)
    setShowGoalAdd(false)
    setGoalAddInput('')
  }

  const recentExpenses = useMemo(() => [...expenses].slice(0, 5), [expenses])
  const activeGoals    = (goals || []).filter(g => g.currentAmount < g.targetAmount)
  const topGoal        = activeGoals[0] || null
  const topGoalPct     = topGoal ? Math.min((topGoal.currentAmount / topGoal.targetAmount) * 100, 100) : 0

  const greeting = () => {
    const h = now.getHours()
    if (h < 12) return t.dashboard.goodMorning
    if (h < 18) return t.dashboard.hello
    return t.dashboard.goodEvening
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <p className={styles.greeting}>{greeting()}{profile.name ? `, ${profile.name}` : ''}</p>
          <p className={styles.month}>{monthName} {now.getFullYear()}</p>
        </div>
        <button className={styles.settingsBtn} onClick={() => navigate('/settings')} aria-label="Ustawienia">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Balance card */}
      <div className={styles.balanceCard}>
        <p className={styles.balanceLabel}>{t.dashboard.remaining}</p>
        <p className={styles.balanceAmount} style={{ color: remaining >= 0 ? '#30d158' : '#ff453a' }}>
          {fmt(remaining)}
        </p>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{
              width: `${spentPercent}%`,
              background: spentPercent > 90 ? '#ff453a' : spentPercent > 70 ? '#ff9f0a' : '#30d158',
            }}
          />
        </div>
        <div className={styles.balanceMeta}>
          <span>{t.dashboard.spent}: {fmt(totalSpent)}</span>
          <button
            className={salarySetThisMonth ? styles.salaryBtn : styles.salaryBtnNew}
            onClick={() => { setSalaryInput(String(currentSalary || '')); setShowSalaryModal(true) }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ marginRight: 5, flexShrink: 0 }}>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {salarySetThisMonth ? `${t.dashboard.salaryPrefix}: ${fmt(currentSalary)}` : t.dashboard.enterSalary}
          </button>
        </div>

        {/* Forecast row */}
        {forecast && (
          <div className={styles.forecastRow}>
            <span className={styles.forecastLabel}>Prognoza do końca miesiąca:</span>
            <span
              className={styles.forecastValue}
              style={{ color: forecast.diff > 0 ? '#ff453a' : '#30d158' }}
            >
              ~{fmt(forecast.projected)}
              {currentSalary > 0 && (
                <span className={styles.forecastDiff}>
                  {' '}({forecast.diff > 0 ? '+' : ''}{fmt(Math.abs(forecast.diff))} {forecast.diff > 0 ? 'powyżej' : 'poniżej'} budżetu)
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Status banner */}
      {statusBanner && (
        <div className={styles.statusBanner} style={{ background: statusBanner.bg, color: statusBanner.color }}>
          {statusBanner.text}
        </div>
      )}

      {/* Quick stats */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>{t.dashboard.recurringPayments}</p>
          <p className={styles.statValue}>{fmt(recurringTotal)}</p>
          <p className={styles.statSub}>{t.dashboard.monthly}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>{t.dashboard.expenses}</p>
          <p className={styles.statValue}>{fmt(expensesTotal)}</p>
          <p className={styles.statSub}>{monthExpenses.length} {t.dashboard.transactions}</p>
        </div>
        <div className={styles.statCard} style={{ borderColor: savingsRate >= 20 ? 'rgba(48,209,88,0.3)' : 'rgba(255,68,58,0.3)' }}>
          <p className={styles.statLabel}>{t.dashboard.savings}</p>
          <p className={styles.statValue} style={{ color: savingsRate >= 20 ? '#30d158' : savingsRate > 0 ? '#ff9f0a' : '#ff453a' }}>
            {savingsRate.toFixed(0)}%
          </p>
          <p className={styles.statSub}>{t.dashboard.income}</p>
        </div>
      </div>

      {/* Budget alerts widget */}
      {budgetAlerts.length > 0 ? (
        <div className={styles.budgetWidget} onClick={() => navigate('/budgets')}>
          <div className={styles.budgetWidgetHeader}>
            <p className={styles.budgetWidgetTitle}>⚠️ Limity budżetowe</p>
            <span className={styles.budgetWidgetLink}>Zarządzaj →</span>
          </div>
          {budgetAlerts.map(b => (
            <div key={b.catId} className={styles.budgetAlertRow}>
              <span className={styles.budgetAlertIcon}>{b.cat.icon}</span>
              <span className={styles.budgetAlertName}>{b.cat.label}</span>
              <div className={styles.budgetAlertBarWrap}>
                <div
                  className={styles.budgetAlertBar}
                  style={{
                    width: `${Math.min(b.pct, 100)}%`,
                    background: b.pct >= 100 ? '#ff453a' : '#ff9f0a',
                  }}
                />
              </div>
              <span
                className={styles.budgetAlertPct}
                style={{ color: b.pct >= 100 ? '#ff453a' : '#ff9f0a' }}
              >
                {b.pct.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      ) : Object.keys(categoryBudgets).length === 0 ? (
        <button className={styles.budgetWidgetEmpty} onClick={() => navigate('/budgets')}>
          <span>🎯</span>
          <span>Ustaw limity budżetowe dla kategorii</span>
        </button>
      ) : null}

      {/* Quick add */}
      <button className={styles.addBtn} onClick={() => setShowQuickAdd(true)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <line x1="12" y1="5" x2="12" y2="19" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="5" y1="12" x2="19" y2="12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
        {t.dashboard.addExpense}
      </button>

      {/* Goal widget */}
      {topGoal ? (
        <div className={styles.goalWidget} onClick={() => navigate('/goals')}>
          <div className={styles.goalWidgetHeader}>
            <span className={styles.goalWidgetIcon}>{topGoal.icon}</span>
            <div className={styles.goalWidgetInfo}>
              <p className={styles.goalWidgetName}>{topGoal.name}</p>
              <p className={styles.goalWidgetAmounts}>
                {fmt(topGoal.currentAmount)} / {fmt(topGoal.targetAmount)}
              </p>
            </div>
            <div className={styles.goalWidgetRight}>
              <p className={styles.goalWidgetPct} style={{ color: topGoal.color }}>{topGoalPct.toFixed(0)}%</p>
              <p className={styles.goalWidgetSub}>{t.dashboard.achieved}</p>
            </div>
          </div>
          <div className={styles.goalWidgetTrack}>
            <div className={styles.goalWidgetFill} style={{ width: `${topGoalPct}%`, background: topGoal.color }} />
          </div>
          <div className={styles.goalWidgetFooter}>
            {remaining > 0 ? (
              <p className={styles.goalWidgetCapacity}>
                {t.dashboard.canSaveThisMonth} <strong style={{ color: '#30d158' }}>{fmt(remaining)}</strong>
              </p>
            ) : <span />}
            <button
              className={styles.goalAddBtn}
              style={{ borderColor: topGoal.color + '66', color: topGoal.color }}
              onClick={e => { e.stopPropagation(); setGoalAddInput(''); setShowGoalAdd(true) }}
            >
              + Odkładam
            </button>
          </div>
        </div>
      ) : (
        <button className={styles.goalWidgetEmpty} onClick={() => navigate('/goals')}>
          <span>🎯</span>
          <span>{t.dashboard.setSavingsGoal}</span>
        </button>
      )}

      {/* Recent expenses */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionTitle}>{t.dashboard.recentTransactions}</p>
          <button className={styles.seeAll} onClick={() => navigate('/expenses')}>
            {t.dashboard.seeAll}
          </button>
        </div>
        {recentExpenses.length === 0 ? (
          <div className={styles.empty}>
            <span>🎯</span>
            <p>{t.dashboard.noExpenses}</p>
          </div>
        ) : (
          <div className={styles.expenseList}>
            {recentExpenses.map((e) => {
              const cat = getCat(e.category)
              return (
                <div key={e.id} className={styles.expenseRow}>
                  <div className={styles.expenseCat} style={{ background: cat.color + '22' }}>
                    <span>{cat.icon}</span>
                  </div>
                  <div className={styles.expenseInfo}>
                    <p className={styles.expenseName}>{e.description || cat.label}</p>
                    <p className={styles.expenseDate}>{formatDate(e.date)}</p>
                  </div>
                  <p className={styles.expenseAmount}>-{fmt(e.amount)}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
      {showQuickAdd && <QuickAddModal onClose={() => setShowQuickAdd(false)} />}

      {showSalaryModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowSalaryModal(false)}>
          <div className={styles.modalSheet} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHandle} />
            <p className={styles.modalTitle}>Wypłata — {monthName}</p>
            <p className={styles.modalHint}>Wpisz całość: podstawa + premie + nadgodziny</p>
            <div className={styles.modalAmountRow}>
              <span className={styles.modalCurrency}>{currencySymbol}</span>
              <input
                className={styles.modalAmountInput}
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={salaryInput}
                onChange={e => setSalaryInput(e.target.value)}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSalarySave()}
              />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setShowSalaryModal(false)}>Anuluj</button>
              <button className={styles.modalSave} onClick={handleSalarySave}>Zapisz</button>
            </div>
          </div>
        </div>
      )}

      {showGoalAdd && topGoal && (
        <div className={styles.modalBackdrop} onClick={() => setShowGoalAdd(false)}>
          <div className={styles.modalSheet} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHandle} />
            <p className={styles.modalTitle}>{topGoal.icon} {topGoal.name}</p>
            <p className={styles.modalHint}>Ile odkładasz tym razem?</p>
            <div className={styles.modalAmountRow}>
              <span className={styles.modalCurrency}>{currencySymbol}</span>
              <input
                className={styles.modalAmountInput}
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={goalAddInput}
                onChange={e => setGoalAddInput(e.target.value)}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleGoalAddSave()}
              />
            </div>
            <p className={styles.modalGoalProgress}>
              Zebrano: {fmt(topGoal.currentAmount)} z {fmt(topGoal.targetAmount)}
            </p>
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setShowGoalAdd(false)}>Anuluj</button>
              <button className={styles.modalSave} style={{ background: topGoal.color }} onClick={handleGoalAddSave}>Dodaj</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
