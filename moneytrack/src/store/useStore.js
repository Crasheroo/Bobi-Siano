import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useStore = create(
  persist(
    (set, get) => ({
      // === PROFIL ===
      profile: {
        name: '',
        salary: 0,
        currency: 'PLN',
        setupDone: false,
      },
      setProfile: (data) =>
        set((s) => ({ profile: { ...s.profile, ...data } })),

      // === WYDATKI ===
      expenses: [],
      addExpense: (expense) =>
        set((s) => ({
          expenses: [
            { ...expense, id: Date.now().toString(), date: expense.date || new Date().toISOString() },
            ...s.expenses,
          ],
        })),
      editExpense: (id, data) =>
        set((s) => ({
          expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...data } : e)),
        })),
      deleteExpense: (id) =>
        set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),

      // === PRZYCHODY (jednorazowe/dodatkowe) ===
      incomes: [],
      addIncome: (income) =>
        set((s) => ({
          incomes: [
            { ...income, id: Date.now().toString(), date: income.date || new Date().toISOString() },
            ...s.incomes,
          ],
        })),
      deleteIncome: (id) =>
        set((s) => ({ incomes: s.incomes.filter((i) => i.id !== id) })),

      // === PŁATNOŚCI CYKLICZNE ===
      recurring: [],
      addRecurring: (item) =>
        set((s) => ({
          recurring: [
            { ...item, id: Date.now().toString(), active: true },
            ...s.recurring,
          ],
        })),
      editRecurring: (id, data) =>
        set((s) => ({
          recurring: s.recurring.map((r) => (r.id === id ? { ...r, ...data } : r)),
        })),
      deleteRecurring: (id) =>
        set((s) => ({ recurring: s.recurring.filter((r) => r.id !== id) })),
      toggleRecurring: (id) =>
        set((s) => ({
          recurring: s.recurring.map((r) =>
            r.id === id ? { ...r, active: !r.active } : r
          ),
        })),

      // === BUDGETY KATEGORII ===
      categoryBudgets: {},
      setCategoryBudget: (category, amount) =>
        set((s) => ({
          categoryBudgets: { ...s.categoryBudgets, [category]: amount },
        })),

      // === HELPERS ===
      getCurrentMonthExpenses: () => {
        const { expenses } = get()
        const now = new Date()
        return expenses.filter((e) => {
          const d = new Date(e.date)
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        })
      },

      getMonthlyRecurringTotal: () => {
        const { recurring } = get()
        return recurring
          .filter((r) => r.active)
          .reduce((sum, r) => {
            if (r.frequency === 'monthly') return sum + r.amount
            if (r.frequency === 'yearly') return sum + r.amount / 12
            if (r.frequency === 'weekly') return sum + r.amount * 4.33
            return sum + r.amount
          }, 0)
      },
    }),
    {
      name: 'moneytrack-storage',
      version: 1,
    }
  )
)

export default useStore
