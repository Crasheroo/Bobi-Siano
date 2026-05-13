import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore.js'
import { useTranslation } from '../hooks/useTranslation.js'
import { useFormatCurrency } from '../hooks/useFormatCurrency.js'
import styles from './Recurring.module.css'

const RECURRING_ICONS = [
  '🏠', '🚗', '💳', '📱', '💡', '🌐', '🎬', '🎵', '💪', '📚', '🏥', '✈️', '🍔', '🛒', '💰'
]

export default function Recurring() {
  const navigate = useNavigate()
  const t = useTranslation()
  const formatAmount = useFormatCurrency()
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
    if (!name.trim()) { setError(t.recurring.errorName); return }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { setError(t.recurring.errorAmount); return }
    addRecurring({ name: name.trim(), amount: Number(amount), frequency, icon })
    setName(''); setAmount(''); setFrequency('monthly'); setIcon('🏠'); setError(''); setShowForm(false)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className="back-home-btn" onClick={() => navigate('/')} aria-label="Pulpit">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className={styles.title}>{t.recurring.title}</h1>
        <button className={styles.addBtn} onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕' : '+'}
        </button>
      </div>

      {/* Summary */}
      <div className={styles.summaryCard}>
        <div className={styles.sumItem}>
          <p className={styles.sumLabel}>{t.recurring.monthly}</p>
          <p className={styles.sumValue}>{formatAmount(monthlyTotal)}</p>
        </div>
        <div className={styles.sumDivider} />
        <div className={styles.sumItem}>
          <p className={styles.sumLabel}>{t.recurring.yearly}</p>
          <p className={styles.sumValue}>{formatAmount(yearlyTotal)}</p>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className={styles.form}>
          <p className={styles.formTitle}>{t.recurring.newPayment}</p>
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
            placeholder={t.recurring.namePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className={styles.row}>
            <input
              className={styles.input}
              style={{ flex: 1 }}
              type="number"
              inputMode="decimal"
              placeholder={t.common.amount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <select
              className={styles.select}
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            >
              {['monthly', 'yearly', 'weekly'].map((freq) => (
                <option key={freq} value={freq}>{t.frequencies[freq]}</option>
              ))}
            </select>
          </div>
          <button className={styles.submitBtn} onClick={handleAdd}>
            {t.recurring.addBtn}
          </button>
        </div>
      )}

      {/* List */}
      <div className={styles.list}>
        {recurring.length === 0 ? (
          <div className={styles.empty}>
            <span>🔄</span>
            <p>{t.recurring.empty}</p>
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
                      {t.frequencies[r.frequency] || t.frequencies.monthly}
                      {r.frequency !== 'monthly' && ` · ${formatAmount(monthAmount)}${t.frequencies.perMonth}`}
                    </p>
                  </div>
                  <div className={styles.itemRight}>
                    <p className={styles.itemAmount}>{formatAmount(r.amount)}</p>
                    <div className={styles.itemActions}>
                      <button
                        className={styles.toggleBtn}
                        style={{ color: r.active ? '#30d158' : '#636366' }}
                        onClick={() => toggleRecurring(r.id)}
                      >
                        {r.active ? t.recurring.active : t.recurring.paused}
                      </button>
                      <button
                        className={styles.deleteItemBtn}
                        onClick={() => deleteRecurring(r.id)}
                      >
                        {t.common.delete}
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
