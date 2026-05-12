import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore.js'
import { formatCurrency, getCategoryById, formatDate, MONTH_NAMES } from '../utils/constants.js'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const navigate = useNavigate()
  const { profile, expenses, recurring, goals, monthlySalaries, getCurrentMonthExpenses, getMonthlyRecurringTotal, getSalaryForMonth, setMonthlySalary } = useStore()

  const [editingSalary, setEditingSalary] = useState(false)
  const [salaryInput, setSalaryInput] = useState('')

  const now = new Date()
  const monthName = MONTH_NAMES[now.getMonth()]

  const currentSalary = getSalaryForMonth(now.getFullYear(), now.getMonth())
  const salarySetThisMonth = (monthlySalaries || []).some(
    (ms) => ms.year === now.getFullYear() && ms.month === now.getMonth()
  )

  const monthExpenses = getCurrentMonthExpenses()
  const recurringTotal = getMonthlyRecurringTotal()
  const expensesTotal = monthExpenses.reduce((s, e) => s + e.amount, 0)
  const totalSpent = expensesTotal + recurringTotal
  const remaining = currentSalary - totalSpent
  const savingsRate = currentSalary > 0 ? ((remaining / currentSalary) * 100) : 0
  const spentPercent = currentSalary > 0 ? Math.min((totalSpent / currentSalary) * 100, 100) : 0

  const handleSalarySave = () => {
    const val = Number(salaryInput)
    if (!isNaN(val) && val >= 0) {
      setMonthlySalary(now.getFullYear(), now.getMonth(), val)
    }
    setEditingSalary(false)
    setSalaryInput('')
  }

  const recentExpenses = useMemo(
    () => [...expenses].slice(0, 5),
    [expenses]
  )

  const activeGoals = (goals || []).filter((g) => g.currentAmount < g.targetAmount)
  const topGoal = activeGoals[0] || null
  const topGoalPct = topGoal ? Math.min((topGoal.currentAmount / topGoal.targetAmount) * 100, 100) : 0

  const greeting = () => {
    const h = now.getHours()
    if (h < 12) return 'Dzień dobry'
    if (h < 18) return 'Cześć'
    return 'Dobry wieczór'
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
        <p className={styles.balanceLabel}>Pozostało w tym miesiącu</p>
        <p className={styles.balanceAmount} style={{ color: remaining >= 0 ? '#30d158' : '#ff453a' }}>
          {formatCurrency(remaining)}
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
          <span>Wydano: {formatCurrency(totalSpent)}</span>
          {editingSalary ? (
            <span className={styles.salaryEditRow}>
              <input
                className={styles.salaryEditInput}
                type="number"
                inputMode="decimal"
                value={salaryInput}
                onChange={(e) => setSalaryInput(e.target.value)}
                onBlur={handleSalarySave}
                onKeyDown={(e) => e.key === 'Enter' && handleSalarySave()}
                autoFocus
                placeholder={currentSalary}
              />
              <button className={styles.salaryEditSave} onMouseDown={handleSalarySave}>✓</button>
            </span>
          ) : (
            <button
              className={salarySetThisMonth ? styles.salaryBtn : styles.salaryBtnNew}
              onClick={() => { setSalaryInput(String(currentSalary)); setEditingSalary(true) }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ marginRight: 5, flexShrink: 0 }}>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {salarySetThisMonth ? `Wypl.: ${formatCurrency(currentSalary)}` : 'Wpisz wypłatę'}
            </button>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Stałe płatności</p>
          <p className={styles.statValue}>{formatCurrency(recurringTotal)}</p>
          <p className={styles.statSub}>miesięcznie</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Wydatki</p>
          <p className={styles.statValue}>{formatCurrency(expensesTotal)}</p>
          <p className={styles.statSub}>{monthExpenses.length} transakcji</p>
        </div>
        <div className={styles.statCard} style={{ borderColor: savingsRate >= 20 ? 'rgba(48,209,88,0.3)' : 'rgba(255,68,58,0.3)' }}>
          <p className={styles.statLabel}>Oszczędności</p>
          <p className={styles.statValue} style={{ color: savingsRate >= 20 ? '#30d158' : savingsRate > 0 ? '#ff9f0a' : '#ff453a' }}>
            {savingsRate.toFixed(0)}%
          </p>
          <p className={styles.statSub}>dochodu</p>
        </div>
      </div>

      {/* Quick add */}
      <button className={styles.addBtn} onClick={() => navigate('/add-expense')}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <line x1="12" y1="5" x2="12" y2="19" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="5" y1="12" x2="19" y2="12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
        Dodaj wydatek
      </button>

      {/* Goal widget */}
      {topGoal ? (
        <div className={styles.goalWidget} onClick={() => navigate('/goals')}>
          <div className={styles.goalWidgetHeader}>
            <span className={styles.goalWidgetIcon}>{topGoal.icon}</span>
            <div className={styles.goalWidgetInfo}>
              <p className={styles.goalWidgetName}>{topGoal.name}</p>
              <p className={styles.goalWidgetAmounts}>
                {formatCurrency(topGoal.currentAmount)} / {formatCurrency(topGoal.targetAmount)}
              </p>
            </div>
            <div className={styles.goalWidgetRight}>
              <p className={styles.goalWidgetPct} style={{ color: topGoal.color }}>{topGoalPct.toFixed(0)}%</p>
              <p className={styles.goalWidgetSub}>osiągnięte</p>
            </div>
          </div>
          <div className={styles.goalWidgetTrack}>
            <div className={styles.goalWidgetFill} style={{ width: `${topGoalPct}%`, background: topGoal.color }} />
          </div>
          {remaining > 0 && (
            <p className={styles.goalWidgetCapacity}>
              Możesz odłożyć w tym miesiącu: <strong style={{ color: '#30d158' }}>{formatCurrency(remaining)}</strong>
            </p>
          )}
        </div>
      ) : (
        <button className={styles.goalWidgetEmpty} onClick={() => navigate('/goals')}>
          <span>🎯</span>
          <span>Ustaw cel oszczędnościowy</span>
        </button>
      )}

      {/* Recent expenses */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionTitle}>Ostatnie transakcje</p>
          <button className={styles.seeAll} onClick={() => navigate('/expenses')}>
            Zobacz wszystkie
          </button>
        </div>
        {recentExpenses.length === 0 ? (
          <div className={styles.empty}>
            <span>🎯</span>
            <p>Brak wydatków. Dodaj pierwszy!</p>
          </div>
        ) : (
          <div className={styles.expenseList}>
            {recentExpenses.map((e) => {
              const cat = getCategoryById(e.category)
              return (
                <div key={e.id} className={styles.expenseRow}>
                  <div className={styles.expenseCat} style={{ background: cat.color + '22' }}>
                    <span>{cat.icon}</span>
                  </div>
                  <div className={styles.expenseInfo}>
                    <p className={styles.expenseName}>{e.description || cat.label}</p>
                    <p className={styles.expenseDate}>{formatDate(e.date)}</p>
                  </div>
                  <p className={styles.expenseAmount}>-{formatCurrency(e.amount)}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
