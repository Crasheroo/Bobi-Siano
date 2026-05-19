import { supabase } from './supabase.js'

// ── Validation (same rules as the Firebase sync) ─────────────────────
const isValidId   = (v) => typeof v === 'string' && v.length > 0
const isValidNum  = (v) => typeof v === 'number' && isFinite(v) && v >= 0
const isValidDate = (v) => typeof v === 'string' && !isNaN(new Date(v).getTime())
const isValidStr  = (v) => typeof v === 'string'

function filterExpenses(arr) {
  if (!Array.isArray(arr)) return []
  return arr.filter(e =>
    e && typeof e === 'object' &&
    isValidId(e.id) && isValidNum(e.amount) && isValidDate(e.date) && isValidStr(e.category)
  )
}
function filterRecurring(arr) {
  if (!Array.isArray(arr)) return []
  return arr.filter(r =>
    r && typeof r === 'object' && isValidId(r.id) && isValidNum(r.amount) && isValidStr(r.name)
  )
}
function filterGoals(arr) {
  if (!Array.isArray(arr)) return []
  return arr.filter(g =>
    g && typeof g === 'object' && isValidId(g.id) && isValidNum(g.targetAmount) && isValidStr(g.name)
  )
}
function filterCustomCategories(arr) {
  if (!Array.isArray(arr)) return []
  return arr.filter(c =>
    c && typeof c === 'object' && isValidId(c.id) && isValidStr(c.label)
  )
}

export function validateCloudData(raw) {
  if (!raw || typeof raw !== 'object') return {}
  return {
    profile:          (raw.profile && typeof raw.profile === 'object') ? raw.profile : undefined,
    expenses:         filterExpenses(raw.expenses),
    incomes:          Array.isArray(raw.incomes) ? raw.incomes : [],
    recurring:        filterRecurring(raw.recurring),
    goals:            filterGoals(raw.goals),
    monthlySalaries:  Array.isArray(raw.monthlySalaries) ? raw.monthlySalaries : [],
    categoryBudgets:  (raw.categoryBudgets && typeof raw.categoryBudgets === 'object') ? raw.categoryBudgets : {},
    customCategories: filterCustomCategories(raw.customCategories),
    settings:         (raw.settings && typeof raw.settings === 'object') ? raw.settings : undefined,
  }
}

// ── Keys excluded from cloud sync ────────────────────────────────────
const SKIP = new Set(['user', 'syncing'])

export function extractSyncData(state) {
  const out = {}
  for (const [k, v] of Object.entries(state)) {
    if (!SKIP.has(k) && typeof v !== 'function') out[k] = v
  }
  return out
}

// ── Cloud I/O ─────────────────────────────────────────────────────────
export async function downloadUserData(uid) {
  const { data, error } = await supabase
    .from('user_data')
    .select('*')
    .eq('id', uid)
    .maybeSingle()       // returns null instead of error when no row exists

  if (error) throw error
  if (!data) return null

  // Map snake_case columns back to camelCase store keys
  return {
    profile:          data.profile,
    expenses:         data.expenses,
    incomes:          data.incomes,
    recurring:        data.recurring,
    goals:            data.goals,
    monthlySalaries:  data.monthly_salaries,
    categoryBudgets:  data.category_budgets,
    customCategories: data.custom_categories,
    settings:         data.settings,
  }
}

export async function uploadUserData(uid, state) {
  const { error } = await supabase
    .from('user_data')
    .upsert({
      id:               uid,
      profile:          state.profile          ?? {},
      expenses:         state.expenses         ?? [],
      incomes:          state.incomes          ?? [],
      recurring:        state.recurring        ?? [],
      goals:            state.goals            ?? [],
      monthly_salaries: state.monthlySalaries  ?? [],
      category_budgets: state.categoryBudgets  ?? {},
      custom_categories:state.customCategories ?? [],
      settings:         state.settings         ?? {},
    }, { onConflict: 'id' })

  if (error) throw error
}
