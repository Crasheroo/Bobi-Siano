import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore.js'
import { CATEGORIES, formatCurrency } from '../utils/constants.js'
import { analyzeReceipt } from '../services/ai.js'
import styles from './AddExpense.module.css'

export default function AddExpense() {
  const navigate = useNavigate()
  const { addExpense } = useStore()
  const fileRef = useRef(null)

  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('food')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [error, setError] = useState('')

  const handleSubmit = () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Podaj poprawną kwotę')
      return
    }
    addExpense({
      amount: Number(amount),
      description: description.trim() || CATEGORIES.find((c) => c.id === category)?.label || 'Wydatek',
      category,
      date: new Date(date).toISOString(),
    })
    navigate(-1)
  }

  const handleScan = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setScanning(true)
    setError('')

    try {
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onload = () => res(reader.result.split(',')[1])
        reader.onerror = rej
        reader.readAsDataURL(file)
      })

      const result = await analyzeReceipt(base64, file.type)
      if (result) {
        setScanResult(result)
        if (result.total) setAmount(String(result.total))
        if (result.store) setDescription(result.store)
        if (result.category) setCategory(result.category)
        if (result.date) setDate(result.date)
      } else {
        setError('Nie udało się odczytać paragonu. Wpisz ręcznie.')
      }
    } catch (err) {
      setError('Błąd skanowania: ' + (err?.message || 'Sprawdź klucz OpenAI API'))
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.back} onClick={() => navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className={styles.title}>Nowy wydatek</h1>
        <div style={{ width: 40 }} />
      </div>

      {/* Scan button */}
      <div className={styles.scanSection}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleScan}
          style={{ display: 'none' }}
        />
        <button
          className={styles.scanBtn}
          onClick={() => fileRef.current?.click()}
          disabled={scanning}
        >
          {scanning ? (
            <span className={styles.spinner} />
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="13" r="4" stroke="white" strokeWidth="1.8"/>
            </svg>
          )}
          {scanning ? 'Skanuję paragon...' : 'Skanuj paragon (AI)'}
        </button>
      </div>

      {scanResult && (
        <div className={styles.scanSuccess}>
          <span>✅</span>
          <div>
            <p className={styles.scanStore}>{scanResult.store}</p>
            {scanResult.items && scanResult.items.length > 0 && (
              <p className={styles.scanItems}>{scanResult.items.length} pozycji na paragonie</p>
            )}
          </div>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.form}>
        {/* Amount */}
        <div className={styles.amountWrap}>
          <span className={styles.amountPrefix}>PLN</span>
          <input
            className={styles.amountInput}
            type="number"
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        {/* Description */}
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Opis</label>
          <input
            className={styles.fieldInput}
            type="text"
            placeholder="Np. Lidl, Uber, Netflix..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Date */}
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Data</label>
          <input
            className={styles.fieldInput}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {/* Category */}
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Kategoria</label>
          <div className={styles.categories}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                className={`${styles.catBtn} ${category === cat.id ? styles.catBtnActive : ''}`}
                style={category === cat.id ? { borderColor: cat.color, background: cat.color + '22' } : {}}
                onClick={() => setCategory(cat.id)}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <button className={styles.submitBtn} onClick={handleSubmit}>
          Dodaj wydatek
        </button>
      </div>
    </div>
  )
}
