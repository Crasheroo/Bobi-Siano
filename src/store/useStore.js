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
        salaryDay: 1,
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

      // === AUTH ===
      user: null,
      syncing: false,
      setUser: (user) => set({ user }),
      setSyncing: (syncing) => set({ syncing }),

      // === USTAWIENIA ===
      settings: {
        theme: 'dark',
        accent: '#0a84ff',
        language: 'pl',
        currency: 'PLN',
      },
      setSettings: (data) =>
        set((s) => ({ settings: { ...s.settings, ...data } })),

      // === WYPŁATY MIESIĘCZNE ===
      monthlySalaries: [],
      setMonthlySalary: (year, month, amount) =>
        set((s) => {
          const exists = s.monthlySalaries.find((ms) => ms.year === year && ms.month === month)
          if (exists) {
            return {
              monthlySalaries: s.monthlySalaries.map((ms) =>
                ms.year === year && ms.month === month ? { ...ms, amount } : ms
              ),
            }
          }
          return { monthlySalaries: [...s.monthlySalaries, { year, month, amount }] }
        }),

      // === BUDGETY KATEGORII ===
      categoryBudgets: {},
      setCategoryBudget: (category, amount) =>
        set((s) => ({
          categoryBudgets: { ...s.categoryBudgets, [category]: amount },
        })),
      removeCategoryBudget: (category) =>
        set((s) => {
          const next = { ...s.categoryBudgets }
          delete next[category]
          return { categoryBudgets: next }
        }),

      // === WŁASNE KATEGORIE ===
      customCategories: [],
      addCustomCategory: (cat) =>
        set((s) => ({
          customCategories: [...s.customCategories, { ...cat, id: 'custom_' + Date.now() }],
        })),
      deleteCustomCategory: (id) =>
        set((s) => ({ customCategories: s.customCategories.filter((c) => c.id !== id) })),

      // === CELE OSZCZĘDNOŚCIOWE ===
      goals: [],
      addGoal: (goal) =>
        set((s) => ({
          goals: [
            { ...goal, id: Date.now().toString(), currentAmount: goal.currentAmount || 0, createdAt: new Date().toISOString() },
            ...s.goals,
          ],
        })),
      editGoal: (id, data) =>
        set((s) => ({
          goals: s.goals.map((g) => (g.id === id ? { ...g, ...data } : g)),
        })),
      deleteGoal: (id) =>
        set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),
      addToGoal: (id, amount) =>
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === id ? { ...g, currentAmount: Math.min(g.currentAmount + amount, g.targetAmount) } : g
          ),
        })),

      // === RESET ===
      resetStore: () => set({
        profile: { name: '', salary: 0, currency: 'PLN', setupDone: false, salaryDay: 1 },
        expenses: [],
        incomes: [],
        recurring: [],
        goals: [],
        monthlySalaries: [],
        categoryBudgets: {},
        customCategories: [],
        user: null,
        syncing: false,
      }),

      // === HELPERS ===
      getSalaryForMonth: (year, month) => {
        const { monthlySalaries, profile } = get()
        const entry = monthlySalaries.find((ms) => ms.year === year && ms.month === month)
        return entry ? entry.amount : profile.salary
      },

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
      name: 'lucent-storage',
      version: 1,
      onRehydrateStorage: () => (state, error) => {
        if (error) console.error('Failed to rehydrate store:', error)
      },
    }
  )
)

export default useStore
