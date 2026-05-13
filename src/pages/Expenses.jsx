import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore.js'
import { CATEGORIES, formatCurrency, formatDate } from '../utils/constants.js'
import styles from './Expenses.module.css'

export default function Expenses() {
  const navigate = useNavigate()
  const { expenses, deleteExpense, editExpense, customCategories } = useStore()
  const allCategories = [...CATEGORIES, ...customCategories]
  const getCat = (id) => allCategories.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1]
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [swipedId, setSwipedId] = useState(null)
  const [editingExpense, setEditingExpense] = useState(null)
  const [editAmount, setEditAmount] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editDate, setEditDate] = useState('')

  const openEdit = (e) => {
    setEditingExpense(e)
    setEditAmount(String(e.amount))
    setEditDesc(e.description || '')
    setEditCategory(e.category)
    setEditDate(new Date(e.date).toISOString().split('T')[0])
    setSwipedId(null)
  }

  const saveEdit = () => {
    if (!editAmount || isNaN(Number(editAmount)) || Number(editAmount) <= 0) return
    editExpense(editingExpense.id, {
      amount: Number(editAmount),
      description: editDesc.trim() || getCat(editCategory)?.label || 'Wydatek',
      category: editCategory,
      date: new Date(editDate).toISOString(),
    })
    setEditingExpense(null)
  }

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const matchesSearch = !search || e.description?.toLowerCase().includes(search.toLowerCase())
      const matchesCat = filterCat === 'all' || e.category === filterCat
      return matchesSearch && matchesCat
    })
  }, [expenses, search, filterCat])

  const groupedByDate = useMemo(() => {
    const groups = {}
    filtered.forEach((e) => {
      const d = new Date(e.date)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!groups[key]) groups[key] = { label: formatDate(e.date), items: [] }
      groups[key].items.push(e)
    })
    return Object.values(groups)
  }, [filtered])

  const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className="back-home-btn" onClick={() => navigate('/')} aria-label="Pulpit">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className={styles.title}>Wydatki</h1>
        <button className={styles.addBtn} onClick={() => navigate('/add-expense')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <line x1="12" y1="5" x2="12" y2="19" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="5" y1="12" x2="19" y2="12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <div className={styles.searchWrap}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8" stroke="rgba(235,235,245,0.45)" strokeWidth="2"/>
          <path d="m21 21-4.35-4.35" stroke="rgba(235,235,245,0.45)" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <input
          className={styles.search}
          type="text"
          placeholder="Szukaj wydatku..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className={styles.clearSearch} onClick={() => setSearch('')}>✕</button>
        )}
      </div>

      <div className={styles.filters}>
        <button
          className={`${styles.filterBtn} ${filterCat === 'all' ? styles.filterBtnActive : ''}`}
          onClick={() => setFilterCat('all')}
        >
          Wszystkie
        </button>
        {allCategories.map((cat) => (
          <button
            key={cat.id}
            className={`${styles.filterBtn} ${filterCat === cat.id ? styles.filterBtnActive : ''}`}
            style={filterCat === cat.id ? { borderColor: cat.color, background: cat.color + '22', color: cat.color } : {}}
            onClick={() => setFilterCat(cat.id)}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {filtered.length > 0 && (
        <div className={styles.summary}>
          <p className={styles.summaryText}>
            {filtered.length} transakcji · Suma: <strong>{formatCurrency(totalFiltered)}</strong>
          </p>
        </div>
      )}

      <div className={styles.list}>
        {groupedByDate.length === 0 ? (
          <div className={styles.empty}>
            <span>🔍</span>
            <p>Brak wydatków do wyświetlenia</p>
          </div>
        ) : (
          groupedByDate.map((group, gi) => (
            <div key={gi} className={styles.group}>
              <p className={styles.groupLabel}>{group.label}</p>
              <div className={styles.groupItems}>
                {group.items.map((e) => {
                  const cat = getCat(e.category)
                  return (
                    <div
                      key={e.id}
                      className={styles.expenseRow}
                      onClick={() => setSwipedId(swipedId === e.id ? null : e.id)}
                    >
                      <div className={styles.expenseCat} style={{ background: cat.color + '22' }}>
                        <span>{cat.icon}</span>
                      </div>
                      <div className={styles.expenseInfo}>
                        <p className={styles.expenseName}>{e.description || cat.label}</p>
                        <p className={styles.expenseCatLabel}>{cat.label}</p>
                      </div>
                      <div className={styles.expenseRight}>
                        <p className={styles.expenseAmount}>-{formatCurrency(e.amount)}</p>
                        {swipedId === e.id && (
                          <>
                            <button
                              className={styles.editBtn}
                              onClick={(ev) => { ev.stopPropagation(); openEdit(e) }}
                            >
                              Edytuj
                            </button>
                            <button
                              className={styles.deleteBtn}
                              onClick={(ev) => {
                                ev.stopPropagation()
                                deleteExpense(e.id)
                                setSwipedId(null)
                              }}
                            >
                              Usuń
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit modal */}
      {editingExpense && (
        <div className={styles.editOverlay} onClick={() => setEditingExpense(null)}>
          <div className={styles.editSheet} onClick={(e) => e.stopPropagation()}>
            <p className={styles.editSheetTitle}>Edytuj wydatek</p>

            <div className={styles.editField}>
              <label className={styles.editLabel}>Kwota (PLN)</label>
              <input
                className={styles.editInput}
                type="number"
                inputMode="decimal"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                autoFocus
              />
            </div>

            <div className={styles.editField}>
              <label className={styles.editLabel}>Opis</label>
              <input
                className={styles.editInput}
                type="text"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
              />
            </div>

            <div className={styles.editField}>
              <label className={styles.editLabel}>Data</label>
              <input
                className={styles.editInput}
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>

            <div className={styles.editField}>
              <label className={styles.editLabel}>Kategoria</label>
              <div className={styles.editCategories}>
                {allCategories.map((cat) => (
                  <button
                    key={cat.id}
                    className={`${styles.editCatBtn} ${editCategory === cat.id ? styles.editCatBtnActive : ''}`}
                    style={editCategory === cat.id ? { borderColor: cat.color, background: cat.color + '22', color: cat.color } : {}}
                    onClick={() => setEditCategory(cat.id)}
                  >
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.editActions}>
              <button className={styles.editSaveBtn} onClick={saveEdit}>Zapisz</button>
              <button className={styles.editCancelBtn} onClick={() => setEditingExpense(null)}>Anuluj</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
