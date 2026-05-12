import React, { useState } from 'react'
import useStore from '../store/useStore.js'
import { formatCurrency, RECURRING_FREQUENCIES } from '../utils/constants.js'
import styles from './Recurring.module.css'

const RECURRING_ICONS = [
  '🏠', '🚗', '💳', '📱', '💡', '🌐', '🎬', '🎵', '💪', '📚', '🏥', '✈️', '🍔', '🛒', '💰'
]

export default function Recurring() {
  const { recurring, addRecurring, deleteRecurring, toggleRecurring, getMonthlyRecurringTotal } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState('monthly')
  const [icon, setIcon] = useState('🏠')
  const [error, setError] = useState('')

  const monthlyTotal = getMonthlyRecurringTotal()
  const yearlyTotal = monthlyTotal * 12

  const handleAdd = () => {
    if (!name.trim()) { setError('Podaj nazwę'); return }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { setError('Podaj kwotę'); return }
    addRecurring({ name: name.trim(), amount: Number(amount), frequency, icon })
    setName(''); setAmount(''); setFrequency('monthly'); setIcon('🏠'); setError(''); setShowForm(false)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Stałe płatności</h1>
        <button className={styles.addBtn} onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕' : '+'}
        </button>
      </div>

      {/* Summary */}
      <div className={styles.summaryCard}>
        <div className={styles.sumItem}>
          <p className={styles.sumLabel}>Miesięcznie</p>
          <p className={styles.sumValue}>{formatCurrency(monthlyTotal)}</p>
        </div>
        <div className={styles.sumDivider} />
        <div className={styles.sumItem}>
          <p className={styles.sumLabel}>Rocznie</p>
          <p className={styles.sumValue}>{formatCurrency(yearlyTotal)}</p>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className={styles.form}>
          <p className={styles.formTitle}>Nowa płatność cykliczna</p>
          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.iconPicker}>
            {RECURRING_ICONS.map((ic) => (
              <button
                key={ic}
                className={`${styles.iconBtn} ${icon === ic ? styles.iconBtnActive : ''}`}
                onClick={() => setIcon(ic)}
              >
                {ic}
              </button>
            ))}
          </div>

          <input
            className={styles.input}
            type="text"
            placeholder="Nazwa (np. Czynsz, Netflix, Kredyt)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className={styles.row}>
            <input
              className={styles.input}
              style={{ flex: 1 }}
              type="number"
              inputMode="decimal"
              placeholder="Kwota (PLN)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <select
              className={styles.select}
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            >
              {RECURRING_FREQUENCIES.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </div>
          <button className={styles.submitBtn} onClick={handleAdd}>
            Dodaj płatność
          </button>
        </div>
      )}

      {/* List */}
      <div className={styles.list}>
        {recurring.length === 0 ? (
          <div className={styles.empty}>
            <span>🔄</span>
            <p>Brak stałych płatności. Dodaj czynsz, kredyt lub subskrypcje.</p>
          </div>
        ) : (
          <div className={styles.items}>
            {recurring.map((r) => {
              const monthAmount = r.frequency === 'yearly' ? r.amount / 12
                : r.frequency === 'weekly' ? r.amount * 4.33 : r.amount
              return (
                <div key={r.id} className={`${styles.item} ${!r.active ? styles.itemDisabled : ''}`}>
                  <div className={styles.itemIcon}>{r.icon || '💳'}</div>
                  <div className={styles.itemInfo}>
                    <p className={styles.itemName}>{r.name}</p>
                    <p className={styles.itemFreq}>
                      {RECURRING_FREQUENCIES.find(f => f.id === r.frequency)?.label || 'Miesięcznie'}
                      {r.frequency !== 'monthly' && ` · ${formatCurrency(monthAmount)}/mies.`}
                    </p>
                  </div>
                  <div className={styles.itemRight}>
                    <p className={styles.itemAmount}>{formatCurrency(r.amount)}</p>
                    <div className={styles.itemActions}>
                      <button
                        className={styles.toggleBtn}
                        style={{ color: r.active ? '#30d158' : '#636366' }}
                        onClick={() => toggleRecurring(r.id)}
                      >
                        {r.active ? '● Aktywna' : '○ Wstrzym.'}
                      </button>
                      <button
                        className={styles.deleteItemBtn}
                        onClick={() => deleteRecurring(r.id)}
                      >
                        Usuń
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
