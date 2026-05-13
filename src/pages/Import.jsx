import React, { useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore.js'
import { CATEGORIES, formatDate } from '../utils/constants.js'
import { useFormatCurrency } from '../hooks/useFormatCurrency.js'
import { parseBank, readFileAsText } from '../services/bankParser.js'
import styles from './Import.module.css'

export default function Import() {
  const navigate = useNavigate()
  const { addExpense, customCategories } = useStore()
  const formatAmount = useFormatCurrency()
  const allCategories = [...CATEGORIES, ...(customCategories || [])]
  const fileRef = useRef(null)

  const [step, setStep] = useState('upload') // upload | preview | success
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState('')
  const [transactions, setTransactions] = useState([])
  const [selected, setSelected] = useState({})
  const [cats, setCats] = useState({})
  const [filterMode, setFilterMode] = useState('expenses')
  const [importedCount, setImportedCount] = useState(0)

  const handleFile = async (file) => {
    if (!file) return
    setParsing(true)
    setError('')
    try {
      const text = await readFileAsText(file)
      const parsed = parseBank(text)
      if (!parsed || parsed.length === 0) {
        setError('Nie udało się odczytać pliku. Sprawdź czy to plik CSV z historią transakcji z banku (mBank, PKO BP, ING).')
        setParsing(false)
        return
      }
      const sel = {}, catMap = {}
      parsed.forEach((tx, i) => {
        sel[i] = tx.isExpense
        catMap[i] = tx.category
      })
      setTransactions(parsed)
      setSelected(sel)
      setCats(catMap)
      setStep('preview')
    } catch (e) {
      setError('Błąd odczytu: ' + (e?.message || 'Spróbuj ponownie'))
    }
    setParsing(false)
  }

  const handleFileInput = (e) => handleFile(e.target.files[0])

  const handleDrop = (e) => {
    e.preventDefault()
    handleFile(e.dataTransfer.files[0])
  }

  const visible = useMemo(() => {
    return transactions
      .map((tx, i) => ({ ...tx, _i: i }))
      .filter((tx) => {
        if (filterMode === 'expenses') return tx.isExpense
        if (filterMode === 'income') return !tx.isExpense
        return true
      })
  }, [transactions, filterMode])

  const selectedCount = Object.values(selected).filter(Boolean).length

  const toggleAll = (val) => {
    const next = { ...selected }
    visible.forEach(({ _i }) => { next[_i] = val })
    setSelected(next)
  }

  const handleImport = () => {
    let count = 0
    transactions.forEach((tx, i) => {
      if (!selected[i]) return
      addExpense({
        amount: tx.amount,
        description: tx.description,
        category: cats[i] || tx.category,
        date: tx.date,
      })
      count++
    })
    setImportedCount(count)
    setStep('success')
  }

  const getCat = (id) => allCategories.find((c) => c.id === id) || allCategories[allCategories.length - 1]

  // ── Upload screen ────────────────────────────────────────────
  if (step === 'upload') {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <button className="back-home-btn" onClick={() => navigate('/expenses')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h1 className={styles.title}>Import z banku</h1>
          <div style={{ width: 36 }} />
        </div>

        <div
          className={styles.dropZone}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            style={{ display: 'none' }}
            onChange={handleFileInput}
          />
          {parsing ? (
            <>
              <div className={styles.spinner} />
              <p className={styles.dropLabel}>Analizuję plik...</p>
            </>
          ) : (
            <>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className={styles.dropIcon}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              <p className={styles.dropLabel}>Wybierz lub upuść plik CSV</p>
              <p className={styles.dropSub}>Obsługiwane banki: mBank, PKO BP, ING</p>
            </>
          )}
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.infoCard}>
          <p className={styles.infoTitle}>Jak wyeksportować historię?</p>
          <div className={styles.infoRow}>
            <span className={styles.infoBank}>mBank</span>
            <span className={styles.infoStep}>Historia → Eksportuj → CSV</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoBank}>PKO BP</span>
            <span className={styles.infoStep}>Zestawienia → Eksport → CSV</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoBank}>ING</span>
            <span className={styles.infoStep}>Historia → Pobierz → CSV</span>
          </div>
        </div>
      </div>
    )
  }

  // ── Success screen ───────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className={styles.page}>
        <div className={styles.successWrap}>
          <div className={styles.successIcon}>✅</div>
          <p className={styles.successTitle}>Zaimportowano {importedCount} wydatków</p>
          <p className={styles.successSub}>Transakcje zostały dodane do Twoich wydatków</p>
          <button className={styles.successBtn} onClick={() => navigate('/expenses')}>
            Zobacz wydatki
          </button>
          <button className={styles.successBtnSecondary} onClick={() => {
            setStep('upload'); setTransactions([]); setSelected({}); setError('')
          }}>
            Importuj kolejny plik
          </button>
        </div>
      </div>
    )
  }

  // ── Preview screen ───────────────────────────────────────────
  const expenseCount = transactions.filter((tx) => tx.isExpense).length
  const incomeCount  = transactions.length - expenseCount

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className="back-home-btn" onClick={() => setStep('upload')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div>
          <h1 className={styles.title}>Podgląd importu</h1>
          <p className={styles.subtitle}>Wybierz transakcje do importu</p>
        </div>
        <div style={{ width: 36 }} />
      </div>

      {/* Filter tabs */}
      <div className={styles.filterTabs}>
        {[
          { id: 'expenses', label: `Wydatki (${expenseCount})` },
          { id: 'income',   label: `Przychody (${incomeCount})` },
          { id: 'all',      label: `Wszystkie (${transactions.length})` },
        ].map((f) => (
          <button
            key={f.id}
            className={`${styles.filterTab} ${filterMode === f.id ? styles.filterTabActive : ''}`}
            onClick={() => setFilterMode(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Select all / Deselect all */}
      <div className={styles.bulkRow}>
        <span className={styles.bulkCount}>{selectedCount} zaznaczonych</span>
        <div className={styles.bulkBtns}>
          <button className={styles.bulkBtn} onClick={() => toggleAll(true)}>Zaznacz wszystkie</button>
          <button className={styles.bulkBtn} onClick={() => toggleAll(false)}>Odznacz</button>
        </div>
      </div>

      {/* Transaction list */}
      <div className={styles.list}>
        {visible.length === 0 ? (
          <div className={styles.empty}>
            <span>🔍</span>
            <p>Brak transakcji do wyświetlenia</p>
          </div>
        ) : (
          visible.map((tx) => {
            const cat = getCat(cats[tx._i])
            const isChecked = !!selected[tx._i]
            return (
              <div
                key={tx._i}
                className={`${styles.txRow} ${!isChecked ? styles.txRowDimmed : ''}`}
                onClick={() => setSelected((s) => ({ ...s, [tx._i]: !s[tx._i] }))}
              >
                <div className={`${styles.checkbox} ${isChecked ? styles.checkboxChecked : ''}`}>
                  {isChecked && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <polyline points="20 6 9 17 4 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>

                <div className={styles.txCatBadge} style={{ background: cat.color + '22' }}>
                  <span>{cat.icon}</span>
                </div>

                <div className={styles.txInfo}>
                  <p className={styles.txDesc}>{tx.description}</p>
                  <p className={styles.txDate}>{formatDate(tx.date)}</p>
                </div>

                <div className={styles.txRight}>
                  <p className={styles.txAmount} style={{ color: tx.isExpense ? '#ff453a' : '#30d158' }}>
                    {tx.isExpense ? '-' : '+'}{formatAmount(tx.amount)}
                  </p>
                  <select
                    className={styles.catSelect}
                    value={cats[tx._i] || 'other'}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      e.stopPropagation()
                      setCats((c) => ({ ...c, [tx._i]: e.target.value }))
                    }}
                  >
                    {allCategories.map((c) => (
                      <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Import button */}
      <div className={styles.footer}>
        <button
          className={styles.importBtn}
          onClick={handleImport}
          disabled={selectedCount === 0}
        >
          Importuj {selectedCount} transakcji
        </button>
      </div>
    </div>
  )
}
