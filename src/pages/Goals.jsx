import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore.js'
import { useTranslation } from '../hooks/useTranslation.js'
import { useFormatCurrency } from '../hooks/useFormatCurrency.js'
import styles from './Goals.module.css'

const GOAL_ICONS = ['🚗', '🏠', '✈️', '💻', '📱', '💍', '🎓', '🌴', '🎯', '💰', '🏋️', '🎸', '⛵', '🏕️', '🐶']
const GOAL_COLORS = ['#0a84ff', '#30d158', '#ff9f0a', '#ff453a', '#bf5af2', '#5ac8fa', '#ff6b35', '#ffd60a', '#64d2ff']

export default function Goals() {
  const navigate = useNavigate()
  const t = useTranslation()
  const formatAmount = useFormatCurrency()
  const { goals, addGoal, deleteGoal, addToGoal, profile, expenses, getMonthlyRecurringTotal, getSalaryForMonth } = useStore()

  const monthsToLabel = t.goals.monthsLabel

  const completionDate = (months) => {
    if (!isFinite(months) || months <= 0) return null
    const d = new Date()
    d.setMonth(d.getMonth() + Math.ceil(months))
    return `${t.months[d.getMonth()]} ${d.getFullYear()}`
  }

  const [showForm, setShowForm] = useState(false)
  const [depositGoalId, setDepositGoalId] = useState(null)
  const [depositAmount, setDepositAmount] = useState('')

  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [currentAmount, setCurrentAmount] = useState('')
  const [deadlineYear, setDeadlineYear] = useState('')
  const [deadlineMonthIdx, setDeadlineMonthIdx] = useState('')
  const [icon, setIcon] = useState('🎯')
  const [color, setColor] = useState('#0a84ff')
  const [error, setError] = useState('')

  const now = new Date()
  const curYear = now.getFullYear()
  const curMonth = now.getMonth()

  const deadline = deadlineYear && deadlineMonthIdx !== ''
    ? `${deadlineYear}-${String(Number(deadlineMonthIdx) + 1).padStart(2, '0')}`
    : ''

  const deadlineYearOptions = []
  for (let y = curYear; y <= curYear + 10; y++) {
    if (y > curYear || curMonth < 11) deadlineYearOptions.push(y)
  }

  const deadlineMonthOptions = t.months
    .map((label, idx) => ({ label, idx }))
    .filter(({ idx }) => !deadlineYear || Number(deadlineYear) > curYear || idx > curMonth)

  const handleDeadlineYearChange = (e) => {
    const yr = e.target.value
    setDeadlineYear(yr)
    if (yr === String(curYear) && deadlineMonthIdx !== '' && Number(deadlineMonthIdx) <= curMonth) {
      setDeadlineMonthIdx('')
    }
  }

  const recurringTotal = getMonthlyRecurringTotal()

  const avgMonthlyExpenses = useMemo(() => {
    const months = []
    for (let i = 1; i <= 3; i++) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const m = d.getMonth()
      const y = d.getFullYear()
      const total = expenses
        .filter((e) => {
          const ed = new Date(e.date)
          return ed.getMonth() === m && ed.getFullYear() === y
        })
        .reduce((s, e) => s + e.amount, 0)
      months.push(total)
    }
    const withData = months.filter((v) => v > 0)
    return withData.length > 0 ? withData.reduce((a, b) => a + b, 0) / withData.length : 0
  }, [expenses])

  const thisMonthExpenses = useMemo(() => {
    return expenses
      .filter((e) => {
        const d = new Date(e.date)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
      .reduce((s, e) => s + e.amount, 0)
  }, [expenses])

  const currentSalary = getSalaryForMonth(now.getFullYear(), now.getMonth())
  const monthlyCapacity = Math.max(0, currentSalary - recurringTotal - avgMonthlyExpenses)
  const thisMonthFree = Math.max(0, currentSalary - recurringTotal - thisMonthExpenses)

  const handleAdd = () => {
    if (!name.trim()) { setError(t.goals.errorName); return }
    if (!targetAmount || isNaN(Number(targetAmount)) || Number(targetAmount) <= 0) { setError(t.goals.errorAmount); return }
    addGoal({
      name: name.trim(),
      targetAmount: Number(targetAmount),
      currentAmount: currentAmount ? Number(currentAmount) : 0,
      deadline: deadline || null,
      icon,
      color,
    })
    setName(''); setTargetAmount(''); setCurrentAmount(''); setDeadlineYear(''); setDeadlineMonthIdx(''); setIcon('🎯'); setColor('#0a84ff'); setError(''); setShowForm(false)
  }

  const handleDeposit = (goalId) => {
    const amt = Number(depositAmount)
    if (!amt || amt <= 0) return
    addToGoal(goalId, amt)
    setDepositGoalId(null)
    setDepositAmount('')
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className="back-home-btn" onClick={() => navigate('/')} aria-label={t.common.back}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className={styles.title}>{t.goals.title}</h1>
        <button className={styles.addBtn} onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕' : '+'}
        </button>
      </div>

      {/* Capacity card */}
      <div className={styles.capacityCard}>
        <div className={styles.capRow}>
          <div className={styles.capItem}>
            <p className={styles.capLabel}>{t.goals.canSaveThisMonth}</p>
            <p className={styles.capValue} style={{ color: thisMonthFree > 0 ? '#30d158' : '#ff453a' }}>
              {formatAmount(thisMonthFree)}
            </p>
          </div>
          <div className={styles.capDivider} />
          <div className={styles.capItem}>
            <p className={styles.capLabel}>{t.goals.avgCapacity}</p>
            <p className={styles.capValue} style={{ color: monthlyCapacity > 0 ? '#0a84ff' : '#ff453a' }}>
              {formatAmount(monthlyCapacity)}
            </p>
          </div>
        </div>
        <p className={styles.capNote}>
          {t.goals.capacityNote(formatAmount(currentSalary), formatAmount(recurringTotal), formatAmount(Math.round(avgMonthlyExpenses)))}
        </p>
      </div>

      {/* Add form */}
      {showForm && (
        <div className={styles.form}>
          <p className={styles.formTitle}>{t.goals.newGoal}</p>
          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.iconPicker}>
            {GOAL_ICONS.map((ic) => (
              <button key={ic} className={`${styles.iconBtn} ${icon === ic ? styles.iconBtnActive : ''}`} onClick={() => setIcon(ic)}>
                {ic}
              </button>
            ))}
          </div>

          <div className={styles.colorPicker}>
            {GOAL_COLORS.map((c) => (
              <button
                key={c}
                className={`${styles.colorBtn} ${color === c ? styles.colorBtnActive : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>

          <input className={styles.input} type="text" placeholder={t.goals.namePlaceholder} value={name} onChange={(e) => setName(e.target.value)} />
          <input className={styles.input} type="number" inputMode="decimal" placeholder={t.goals.targetAmount} value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
          <input className={styles.input} type="number" inputMode="decimal" placeholder={t.goals.savedSoFar} value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} />
          <div className={styles.deadlinePicker}>
            <select
              className={styles.deadlineSelect}
              value={deadlineMonthIdx}
              onChange={(e) => setDeadlineMonthIdx(e.target.value)}
            >
              <option value="">{t.goals.monthLabel}</option>
              {deadlineMonthOptions.map(({ label, idx }) => (
                <option key={idx} value={idx}>{label}</option>
              ))}
            </select>
            <select
              className={styles.deadlineSelect}
              value={deadlineYear}
              onChange={handleDeadlineYearChange}
            >
              <option value="">{t.goals.yearLabel}</option>
              {deadlineYearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {deadline && targetAmount && Number(targetAmount) > 0 && (
            <div className={styles.deadlineHint}>
              {(() => {
                const [y, m] = deadline.split('-').map(Number)
                const targetDate = new Date(y, m - 1, 1)
                const diffMonths = (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth())
                const needed = diffMonths > 0 ? (Number(targetAmount) - (Number(currentAmount) || 0)) / diffMonths : 0
                return needed > 0
                  ? t.goals.deadlineHint(formatAmount(Math.ceil(needed)))
                  : t.goals.deadlinePast
              })()}
            </div>
          )}

          <button className={styles.submitBtn} onClick={handleAdd}>{t.goals.addGoal}</button>
        </div>
      )}

      {/* Goals list */}
      {goals.length === 0 ? (
        <div className={styles.empty}>
          <span>🎯</span>
          <p>{t.goals.empty}</p>
        </div>
      ) : (
        <div className={styles.goalsList}>
          {goals.map((goal) => {
            const remaining = goal.targetAmount - goal.currentAmount
            const pct = goal.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0
            const monthsNeeded = monthlyCapacity > 0 ? remaining / monthlyCapacity : Infinity
            const done = goal.currentAmount >= goal.targetAmount

            let deadlineMonths = null
            let monthlyNeeded = null
            if (goal.deadline) {
              const [y, m] = goal.deadline.split('-').map(Number)
              const targetDate = new Date(y, m - 1, 1)
              const diffMonths = (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth())
              deadlineMonths = diffMonths
              monthlyNeeded = diffMonths > 0 ? remaining / diffMonths : 0
            }

            return (
              <div key={goal.id} className={styles.goalCard}>
                <div className={styles.goalHeader}>
                  <div className={styles.goalIconWrap} style={{ background: goal.color + '22' }}>
                    <span className={styles.goalIcon}>{goal.icon}</span>
                  </div>
                  <div className={styles.goalInfo}>
                    <p className={styles.goalName}>{goal.name}</p>
                    <p className={styles.goalAmounts}>
                      <span style={{ color: goal.color }}>{formatAmount(goal.currentAmount)}</span>
                      <span className={styles.goalSep}> / </span>
                      <span>{formatAmount(goal.targetAmount)}</span>
                    </p>
                  </div>
                  <button className={styles.deleteGoalBtn} onClick={() => deleteGoal(goal.id)}>✕</button>
                </div>

                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: `${pct}%`, background: done ? '#30d158' : goal.color }} />
                </div>
                <p className={styles.progressPct}>{pct.toFixed(0)}%</p>

                {done ? (
                  <div className={styles.goalDone}>{t.goals.goalDone}</div>
                ) : (
                  <div className={styles.goalStats}>
                    <div className={styles.goalStat}>
                      <p className={styles.goalStatLabel}>{t.goals.missing}</p>
                      <p className={styles.goalStatValue}>{formatAmount(remaining)}</p>
                    </div>
                    <div className={styles.goalStat}>
                      <p className={styles.goalStatLabel}>{t.goals.atAvgCapacity}</p>
                      <p className={styles.goalStatValue}>{monthsToLabel(monthsNeeded)}</p>
                    </div>
                    {goal.deadline && (
                      <div className={styles.goalStat}>
                        <p className={styles.goalStatLabel}>{t.goals.neededPerMonth}</p>
                        <p className={styles.goalStatValue} style={{ color: monthlyNeeded > monthlyCapacity ? '#ff453a' : '#30d158' }}>
                          {monthlyNeeded > 0 ? formatAmount(Math.ceil(monthlyNeeded)) : '—'}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {goal.deadline && !done && (() => {
                  const [y, m] = goal.deadline.split('-').map(Number)
                  const targetDate = new Date(y, m - 1, 1)
                  const diffMonths = (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth())
                  const onTime = monthlyNeeded <= monthlyCapacity && diffMonths > 0
                  return (
                    <div className={styles.deadlineBadge} style={{ background: onTime ? 'rgba(48,209,88,0.12)' : 'rgba(255,68,58,0.12)', borderColor: onTime ? 'rgba(48,209,88,0.3)' : 'rgba(255,68,58,0.3)' }}>
                      <span style={{ color: onTime ? '#30d158' : '#ff453a' }}>
                        {onTime ? `${t.goals.onTrack} ${t.months[m - 1]} ${y}` : `${t.goals.needMore} ${t.months[m - 1]} ${y}`}
                      </span>
                    </div>
                  )
                })()}

                {!done && (
                  depositGoalId === goal.id ? (
                    <div className={styles.depositRow}>
                      <input
                        className={styles.depositInput}
                        type="number"
                        inputMode="decimal"
                        placeholder={t.common.amount}
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        autoFocus
                      />
                      <button className={styles.depositConfirm} onClick={() => handleDeposit(goal.id)}>{t.goals.depositConfirm}</button>
                      <button className={styles.depositCancel} onClick={() => { setDepositGoalId(null); setDepositAmount('') }}>{t.common.cancel}</button>
                    </div>
                  ) : (
                    <button className={styles.depositBtn} style={{ borderColor: goal.color, color: goal.color }} onClick={() => setDepositGoalId(goal.id)}>
                      {t.goals.deposit}
                    </button>
                  )
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Monthly report */}
      {goals.length > 0 && (
        <div className={styles.reportSection}>
          <p className={styles.reportTitle}>{t.goals.reportTitle}</p>
          <div className={styles.reportCard}>
            <div className={styles.reportRow}>
              <span className={styles.reportLabel}>{t.goals.yourEarnings}</span>
              <span className={styles.reportValue}>{formatAmount(currentSalary)}</span>
            </div>
            <div className={styles.reportRow}>
              <span className={styles.reportLabel}>{t.goals.recurringPayments}</span>
              <span className={styles.reportValue} style={{ color: '#ff453a' }}>-{formatAmount(recurringTotal)}</span>
            </div>
            <div className={styles.reportRow}>
              <span className={styles.reportLabel}>{t.goals.avgExpenses}</span>
              <span className={styles.reportValue} style={{ color: '#ff9f0a' }}>-{formatAmount(Math.round(avgMonthlyExpenses))}</span>
            </div>
            <div className={styles.reportDivider} />
            <div className={styles.reportRow}>
              <span className={styles.reportLabel}>{t.goals.avgSavingsCapacity}</span>
              <span className={styles.reportValue} style={{ color: monthlyCapacity > 0 ? '#30d158' : '#ff453a', fontWeight: 700 }}>
                {formatAmount(Math.round(monthlyCapacity))}
              </span>
            </div>
            {goals.filter((g) => g.currentAmount < g.targetAmount).length > 1 && (
              <>
                <div className={styles.reportDivider} />
                <p className={styles.reportSub}>{t.goals.equalSplit}</p>
                {goals
                  .filter((g) => g.currentAmount < g.targetAmount)
                  .map((g) => {
                    const share = monthlyCapacity / goals.filter((x) => x.currentAmount < x.targetAmount).length
                    const months = share > 0 ? (g.targetAmount - g.currentAmount) / share : Infinity
                    return (
                      <div key={g.id} className={styles.reportRow}>
                        <span className={styles.reportLabel}>{g.icon} {g.name}</span>
                        <span className={styles.reportValue}>{formatAmount(Math.round(share))} · {monthsToLabel(months)}</span>
                      </div>
                    )
                  })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
