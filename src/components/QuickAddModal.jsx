import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore.js'
import { CATEGORIES, CURRENCIES } from '../utils/constants.js'
import styles from './QuickAddModal.module.css'

export default function QuickAddModal({ onClose }) {
  const navigate = useNavigate()
  const { addExpense, customCategories, settings } = useStore()
  const currencyCode = settings?.currency || 'PLN'
  const currencySymbol = CURRENCIES.find((c) => c.code === currencyCode)?.symbol || 'zł'
  const allCategories = [...CATEGORIES, ...(customCategories || [])]

  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('food')
  const [error, setError] = useState('')
  const amountRef = useRef(null)

  useEffect(() => {
    const id = setTimeout(() => amountRef.current?.focus(), 150)
    return () => clearTimeout(id)
  }, [])

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleSave = () => {
    const val = Number(amount)
    if (!amount || isNaN(val) || val <= 0) {
      setError('Podaj kwotę')
      return
    }
    addExpense({
      amount: val,
      description: description.trim() || allCategories.find((c) => c.id === category)?.label || 'Wydatek',
      category,
      date: new Date().toISOString(),
    })
    onClose()
  }

  const handleFullForm = () => {
    onClose()
    navigate('/add-expense')
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.handle} />

        <div className={styles.amountRow}>
          <span className={styles.currency}>{currencySymbol}</span>
          <input
            ref={amountRef}
            className={styles.amountInput}
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setError('') }}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.categories}>
          {allCategories.map((cat) => (
            <button
              key={cat.id}
              className={`${styles.catBtn} ${category === cat.id ? styles.catBtnActive : ''}`}
              style={category === cat.id ? { borderColor: cat.color, background: cat.color + '22' } : {}}
              onClick={() => setCategory(cat.id)}
            >
              <span className={styles.catIcon}>{cat.icon}</span>
              <span className={styles.catLabel}>{cat.label}</span>
            </button>
          ))}
        </div>

        <input
          className={styles.descInput}
          type="text"
          placeholder="Opis (opcjonalnie)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />

        <div className={styles.actions}>
          <button className={styles.moreBtn} onClick={handleFullForm}>Więcej opcji</button>
          <button className={styles.saveBtn} onClick={handleSave}>Zapisz</button>
        </div>
      </div>
    </div>
  )
}
