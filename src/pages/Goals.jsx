import React, { useState, useMemo } from 'react'
import useStore from '../store/useStore.js'
import { formatCurrency, MONTH_NAMES } from '../utils/constants.js'
import styles from './Goals.module.css'

const GOAL_ICONS = ['🚗', '🏠', '✈️', '💻', '📱', '💍', '🎓', '🌴', '🎯', '💰', '🏋️', '🎸', '⛵', '🏕️', '🐶']
const GOAL_COLORS = ['#0a84ff', '#30d158', '#ff9f0a', '#ff453a', '#bf5af2', '#5ac8fa', '#ff6b35', '#ffd60a', '#64d2ff']

function monthsToLabel(months) {
  if (!isFinite(months) || months <= 0) return '—'
  if (months < 1) return 'Ten miesiąc'
  const m = Math.ceil(months)
  if (m < 12) return `${m} mies.`
  const y = Math.floor(m / 12)
  const rem = m % 12
  return rem === 0 ? `${y} lat${y === 1 ? 'o' : y < 5 ? 'a' : ''}` : `${y}l ${rem}mies.`
}

function completionDate(months) {
  if (!isFinite(months) || months <= 0) return null
  const d = new Date()
  d.setMonth(d.getMonth() + Math.ceil(months))
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
}

export default function Goals() {
  const { goals, addGoal, deleteGoal, addToGoal, profile, expenses, getMonthlyRecurringTotal, getSalaryForMonth } = useStore()

  const [showForm, setShowForm] = useState(false)
  const [depositGoalId, setDepositGoalId] = useState(null)
  const [depositAmount, setDepositAmount] = useState('')

  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [currentAmount, setCurrentAmount] = useState('')
  const [deadline, setDeadline] = useState('')
  const [icon, setIcon] = useState('🎯')
  const [color, setColor] = useState('#0a84ff')
  const [error, setError] = useState('')

  const now = new Date()

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
    if (!name.trim()) { setError('Podaj nazwę celu'); return }
    if (!targetAmount || isNaN(Number(targetAmount)) || Number(targetAmount) <= 0) { setError('Podaj kwotę docelową'); return }
    addGoal({
      name: name.trim(),
      targetAmount: Number(targetAmount),
      currentAmount: currentAmount ? Number(currentAmount) : 0,
      deadline: deadline || null,
      icon,
      color,
    })
    setName(''); setTargetAmount(''); setCurrentAmount(''); setDeadline(''); setIcon('🎯'); setColor('#0a84ff'); setError(''); setShowForm(false)
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
        <h1 className={styles.title}>Cele</h1>
        <button className={styles.addBtn} onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕' : '+'}
        </button>
      </div>

      {/* Capacity card */}
      <div className={styles.capacityCard}>
        <div className={styles.capRow}>
          <div className={styles.capItem}>
            <p className={styles.capLabel}>Możesz odłożyć w tym mies.</p>
            <p className={styles.capValue} style={{ color: thisMonthFree > 0 ? '#30d158' : '#ff453a' }}>
              {formatCurrency(thisMonthFree)}
            </p>
          </div>
          <div className={styles.capDivider} />
          <div className={styles.capItem}>
            <p className={styles.capLabel}>Śred. zdolność / mies.</p>
            <p className={styles.capValue} style={{ color: monthlyCapacity > 0 ? '#0a84ff' : '#ff453a' }}>
              {formatCurrency(monthlyCapacity)}
            </p>
          </div>
        </div>
        <p className={styles.capNote}>
          Na podstawie Twoich zarobków ({formatCurrency(currentSalary)}), stałych płatności ({formatCurrency(recurringTotal)}) i średnich wydatków z ostatnich 3 miesięcy.
        </p>
      </div>

      {/* Add form */}
      {showForm && (
        <div className={styles.form}>
          <p className={styles.formTitle}>Nowy cel oszczędnościowy</p>
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

          <input className={styles.input} type="text" placeholder="Nazwa celu (np. Auto, Wakacje, Mieszkanie)" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={styles.input} type="number" inputMode="decimal" placeholder="Kwota docelowa (PLN)" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
          <input className={styles.input} type="number" inputMode="decimal" placeholder="Już odłożone (opcjonalnie)" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} />
          <input className={styles.input} type="month" placeholder="Termin (opcjonalnie)" value={deadline} onChange={(e) => setDeadline(e.target.value)} />

          {deadline && targetAmount && Number(targetAmount) > 0 && (
            <div className={styles.deadlineHint}>
              {(() => {
                const [y, m] = deadline.split('-').map(Number)
                const targetDate = new Date(y, m - 1, 1)
                const diffMonths = (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth())
                const needed = diffMonths > 0 ? (Number(targetAmount) - (Number(currentAmount) || 0)) / diffMonths : 0
                return needed > 0
                  ? `Aby zdążyć: ${formatCurrency(Math.ceil(needed))} / miesiąc`
                  : 'Termin już minął lub jest w tym miesiącu'
              })()}
            </div>
          )}

          <button className={styles.submitBtn} onClick={handleAdd}>Dodaj cel</button>
        </div>
      )}

      {/* Goals list */}
      {goals.length === 0 ? (
        <div className={styles.empty}>
          <span>🎯</span>
          <p>Brak celów. Dodaj swój pierwszy cel — samochód, wakacje, mieszkanie!</p>
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
                      <span style={{ color: goal.color }}>{formatCurrency(goal.currentAmount)}</span>
                      <span className={styles.goalSep}> / </span>
                      <span>{formatCurrency(goal.targetAmount)}</span>
                    </p>
                  </div>
                  <button className={styles.deleteGoalBtn} onClick={() => deleteGoal(goal.id)}>✕</button>
                </div>

                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: `${pct}%`, background: done ? '#30d158' : goal.color }} />
                </div>
                <p className={styles.progressPct}>{pct.toFixed(0)}% osiągnięte</p>

                {done ? (
                  <div className={styles.goalDone}>Cel osiągnięty!</div>
                ) : (
                  <div className={styles.goalStats}>
                    <div className={styles.goalStat}>
                      <p className={styles.goalStatLabel}>Brakuje</p>
                      <p className={styles.goalStatValue}>{formatCurrency(remaining)}</p>
                    </div>
                    <div className={styles.goalStat}>
                      <p className={styles.goalStatLabel}>Przy śred. zdolności</p>
                      <p className={styles.goalStatValue}>{monthsToLabel(monthsNeeded)}</p>
                    </div>
                    {goal.deadline && (
                      <div className={styles.goalStat}>
                        <p className={styles.goalStatLabel}>Potrzeba / mies.</p>
                        <p className={styles.goalStatValue} style={{ color: monthlyNeeded > monthlyCapacity ? '#ff453a' : '#30d158' }}>
                          {monthlyNeeded > 0 ? formatCurrency(Math.ceil(monthlyNeeded)) : '—'}
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
                        {onTime ? `Na dobrej drodze · termin: ${MONTH_NAMES[m - 1]} ${y}` : `Potrzebujesz więcej niż możesz · ${MONTH_NAMES[m - 1]} ${y}`}
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
                        placeholder="Kwota wpłaty"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        autoFocus
                      />
                      <button className={styles.depositConfirm} onClick={() => handleDeposit(goal.id)}>Wpłać</button>
                      <button className={styles.depositCancel} onClick={() => { setDepositGoalId(null); setDepositAmount('') }}>Anuluj</button>
                    </div>
                  ) : (
                    <button className={styles.depositBtn} style={{ borderColor: goal.color, color: goal.color }} onClick={() => setDepositGoalId(goal.id)}>
                      + Wpłać środki
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
          <p className={styles.reportTitle}>Raport miesięczny</p>
          <div className={styles.reportCard}>
            <div className={styles.reportRow}>
              <span className={styles.reportLabel}>Twoje zarobki</span>
              <span className={styles.reportValue}>{formatCurrency(currentSalary)}</span>
            </div>
            <div className={styles.reportRow}>
              <span className={styles.reportLabel}>Stałe płatności</span>
              <span className={styles.reportValue} style={{ color: '#ff453a' }}>-{formatCurrency(recurringTotal)}</span>
            </div>
            <div className={styles.reportRow}>
              <span className={styles.reportLabel}>Śred. wydatki (3 mies.)</span>
              <span className={styles.reportValue} style={{ color: '#ff9f0a' }}>-{formatCurrency(Math.round(avgMonthlyExpenses))}</span>
            </div>
            <div className={styles.reportDivider} />
            <div className={styles.reportRow}>
              <span className={styles.reportLabel}>Śred. zdolność oszczędzania</span>
              <span className={styles.reportValue} style={{ color: monthlyCapacity > 0 ? '#30d158' : '#ff453a', fontWeight: 700 }}>
                {formatCurrency(Math.round(monthlyCapacity))}
              </span>
            </div>
            {goals.filter((g) => g.currentAmount < g.targetAmount).length > 1 && (
              <>
                <div className={styles.reportDivider} />
                <p className={styles.reportSub}>Podział na cele (równy):</p>
                {goals
                  .filter((g) => g.currentAmount < g.targetAmount)
                  .map((g) => {
                    const share = monthlyCapacity / goals.filter((x) => x.currentAmount < x.targetAmount).length
                    const months = share > 0 ? (g.targetAmount - g.currentAmount) / share : Infinity
                    return (
                      <div key={g.id} className={styles.reportRow}>
                        <span className={styles.reportLabel}>{g.icon} {g.name}</span>
                        <span className={styles.reportValue}>{formatCurrency(Math.round(share))} · {monthsToLabel(months)}</span>
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
