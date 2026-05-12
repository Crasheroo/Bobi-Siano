import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore.js'
import { formatCurrency, getCategoryById, formatDate, MONTH_NAMES } from '../utils/constants.js'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const navigate = useNavigate()
  const { profile, expenses, recurring, getCurrentMonthExpenses, getMonthlyRecurringTotal } = useStore()

  const now = new Date()
  const monthName = MONTH_NAMES[now.getMonth()]

  const monthExpenses = getCurrentMonthExpenses()
  const recurringTotal = getMonthlyRecurringTotal()
  const expensesTotal = monthExpenses.reduce((s, e) => s + e.amount, 0)
  const totalSpent = expensesTotal + recurringTotal
  const remaining = profile.salary - totalSpent
  const savingsRate = profile.salary > 0 ? ((remaining / profile.salary) * 100) : 0
  const spentPercent = profile.salary > 0 ? Math.min((totalSpent / profile.salary) * 100, 100) : 0

  const recentExpenses = useMemo(
    () => [...expenses].slice(0, 5),
    [expenses]
  )

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
        <button className={styles.profileBtn} onClick={() => navigate('/ai')}>
          <span>AI</span>
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
          <span>Zarobki: {formatCurrency(profile.salary)}</span>
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
