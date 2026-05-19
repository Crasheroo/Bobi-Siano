import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore.js'
import { CATEGORIES } from '../utils/constants.js'
import { useFormatCurrency } from '../hooks/useFormatCurrency.js'
import { useTranslation } from '../hooks/useTranslation.js'
import { getPayPeriod } from '../utils/payPeriod.js'
import styles from './Budgets.module.css'

export default function Budgets() {
  const navigate   = useNavigate()
  const fmt        = useFormatCurrency()
  const t          = useTranslation()
  const { expenses, customCategories, categoryBudgets, setCategoryBudget, removeCategoryBudget, profile } = useStore()
  const allCats = [...CATEGORIES, ...(customCategories || [])]

  const payPeriod = getPayPeriod(new Date(), profile?.salaryDay ?? 1)

  // Spending per category in the current pay period
  const periodSpending = useMemo(() => {
    const map = {}
    expenses.forEach(e => {
      const d = new Date(e.date)
      if (d >= payPeriod.start && d <= payPeriod.end) {
        map[e.category] = (map[e.category] || 0) + e.amount
      }
    })
    return map
  }, [expenses, payPeriod.start, payPeriod.end])

  const totalBudget  = Object.values(categoryBudgets).reduce((s, v) => s + v, 0)
  const totalSpent   = Object.entries(categoryBudgets).reduce((s, [cat]) => s + (periodSpending[cat] || 0), 0)

  // Editing state
  const [editingCat, setEditingCat] = useState(null)
  const [inputVal,   setInputVal]   = useState('')

  const startEdit = (catId, current) => {
    setEditingCat(catId)
    setInputVal(current != null ? String(current) : '')
  }
  const confirmEdit = (catId) => {
    const num = parseFloat(inputVal.replace(',', '.'))
    if (!isNaN(num) && num > 0) setCategoryBudget(catId, num)
    setEditingCat(null)
    setInputVal('')
  }
  const cancelEdit = () => { setEditingCat(null); setInputVal('') }

  // Split: with budget (sorted by pct desc) and without budget (sorted by spending desc)
  const withBudget = allCats
    .filter(c => categoryBudgets[c.id] != null)
    .map(c => {
      const budget  = categoryBudgets[c.id]
      const spent   = periodSpending[c.id] || 0
      const pct     = budget > 0 ? Math.min((spent / budget) * 100, 120) : 0
      return { ...c, budget, spent, pct }
    })
    .sort((a, b) => b.pct - a.pct)

  const withoutBudget = allCats
    .filter(c => categoryBudgets[c.id] == null)
    .map(c => ({ ...c, spent: periodSpending[c.id] || 0 }))
    .sort((a, b) => b.spent - a.spent)

  const barColor = (pct) => {
    if (pct >= 100) return '#ff453a'
    if (pct >= 80)  return '#ff9f0a'
    return '#30d158'
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <button className="back-home-btn" onClick={() => navigate(-1)} aria-label="Wróć">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div>
          <h1 className={styles.title}>Budżety</h1>
          <p className={styles.subtitle}>Limity miesięczne na kategorie</p>
        </div>
        <div style={{ width: 36 }} />
      </div>

      {/* Overview card */}
      {totalBudget > 0 && (
        <div className={styles.overviewCard}>
          <div className={styles.overviewRow}>
            <div>
              <p className={styles.overviewLabel}>Wydano z limitów</p>
              <p className={styles.overviewValue} style={{ color: totalSpent > totalBudget ? '#ff453a' : 'var(--text-primary)' }}>
                {fmt(totalSpent)}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p className={styles.overviewLabel}>Łączny budżet</p>
              <p className={styles.overviewValue}>{fmt(totalBudget)}</p>
            </div>
          </div>
          <div className={styles.overviewBarTrack}>
            <div
              className={styles.overviewBarFill}
              style={{
                width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%`,
                background: totalSpent > totalBudget ? '#ff453a' : totalSpent / totalBudget > 0.8 ? '#ff9f0a' : '#30d158',
              }}
            />
          </div>
          <p className={styles.overviewSub}>
            {totalBudget > totalSpent
              ? `Zostało ${fmt(totalBudget - totalSpent)} do końca okresu`
              : `Przekroczono budżet o ${fmt(totalSpent - totalBudget)}`}
          </p>
        </div>
      )}

      {/* Categories with budgets */}
      {withBudget.length > 0 && (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>Aktywne limity</p>
          {withBudget.map(cat => (
            <div key={cat.id} className={styles.catCard}>
              <div className={styles.catTop}>
                <div className={styles.catIcon} style={{ background: cat.color + '22' }}>
                  <span>{cat.icon}</span>
                </div>
                <div className={styles.catMeta}>
                  <div className={styles.catNameRow}>
                    <span className={styles.catName}>{cat.label}</span>
                    {cat.pct >= 100 && <span className={styles.warningBadge}>Przekroczono!</span>}
                    {cat.pct >= 80 && cat.pct < 100 && <span className={styles.alertBadge}>Uwaga</span>}
                  </div>
                  <span className={styles.catAmounts}>
                    {fmt(cat.spent)} / {fmt(cat.budget)}
                  </span>
                </div>
                <div className={styles.catActions}>
                  <button className={styles.editBtn} onClick={() => startEdit(cat.id, cat.budget)}>
                    Edytuj
                  </button>
                  <button className={styles.removeBtn} onClick={() => removeCategoryBudget(cat.id)}>
                    ✕
                  </button>
                </div>
              </div>
              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  style={{ width: `${Math.min(cat.pct, 100)}%`, background: barColor(cat.pct) }}
                />
              </div>
              <div className={styles.catBottom}>
                <span className={styles.pctLabel} style={{ color: barColor(cat.pct) }}>
                  {cat.pct.toFixed(0)}%
                </span>
                <span className={styles.remainLabel}>
                  {cat.budget > cat.spent
                    ? `Zostało ${fmt(cat.budget - cat.spent)}`
                    : `Przekroczono o ${fmt(cat.spent - cat.budget)}`}
                </span>
              </div>

              {/* Inline editor */}
              {editingCat === cat.id && (
                <div className={styles.inlineEdit}>
                  <input
                    className={styles.inlineInput}
                    type="number"
                    inputMode="decimal"
                    value={inputVal}
                    onChange={e => setInputVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') confirmEdit(cat.id); if (e.key === 'Escape') cancelEdit() }}
                    autoFocus
                    placeholder="Nowy limit"
                  />
                  <button className={styles.confirmBtn} onClick={() => confirmEdit(cat.id)}>✓</button>
                  <button className={styles.cancelBtn} onClick={cancelEdit}>✕</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Categories without budgets */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>
          {withBudget.length === 0 ? 'Ustaw limity dla kategorii' : 'Bez limitu'}
        </p>
        {withoutBudget.length === 0 ? (
          <p className={styles.allSet}>Wszystkie kategorie mają ustawione limity 🎉</p>
        ) : (
          withoutBudget.map(cat => (
            <div key={cat.id} className={styles.noBudgetRow}>
              <div className={styles.catIcon} style={{ background: cat.color + '22' }}>
                <span>{cat.icon}</span>
              </div>
              <div className={styles.noBudgetInfo}>
                <span className={styles.catName}>{cat.label}</span>
                {cat.spent > 0 && (
                  <span className={styles.spentSub}>wydano {fmt(cat.spent)} w tym okresie</span>
                )}
              </div>

              {editingCat === cat.id ? (
                <div className={styles.inlineEditCompact}>
                  <input
                    className={styles.inlineInput}
                    type="number"
                    inputMode="decimal"
                    value={inputVal}
                    onChange={e => setInputVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') confirmEdit(cat.id); if (e.key === 'Escape') cancelEdit() }}
                    autoFocus
                    placeholder="Limit"
                  />
                  <button className={styles.confirmBtn} onClick={() => confirmEdit(cat.id)}>✓</button>
                  <button className={styles.cancelBtn} onClick={cancelEdit}>✕</button>
                </div>
              ) : (
                <button className={styles.addLimitBtn} onClick={() => startEdit(cat.id, null)}>
                  + Limit
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <p className={styles.hint}>
        Limity liczone są od początku bieżącego okresu rozliczeniowego.
      </p>
    </div>
  )
}
