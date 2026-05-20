import React, { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useStore from './store/useStore.js'
import { supabase, isSupabaseConfigured } from './services/supabase.js'
import { downloadUserData, uploadUserData, extractSyncData, validateCloudData } from './services/supabaseSync.js'
import Layout from './components/layout/Layout.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

const Setup           = lazy(() => import('./pages/Setup.jsx'))
const Dashboard       = lazy(() => import('./pages/Dashboard.jsx'))
const Expenses        = lazy(() => import('./pages/Expenses.jsx'))
const Recurring       = lazy(() => import('./pages/Recurring.jsx'))
const Analytics       = lazy(() => import('./pages/Analytics.jsx'))
const AddExpense      = lazy(() => import('./pages/AddExpense.jsx'))
const Goals           = lazy(() => import('./pages/Goals.jsx'))
const Settings        = lazy(() => import('./pages/Settings.jsx'))
const Privacy         = lazy(() => import('./pages/Privacy.jsx'))
const Import          = lazy(() => import('./pages/Import.jsx'))
const StatementAnalysis = lazy(() => import('./pages/StatementAnalysis.jsx'))
const MonthlyHistory  = lazy(() => import('./pages/MonthlyHistory.jsx'))
const Budgets         = lazy(() => import('./pages/Budgets.jsx'))

function PageLoader() {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      minHeight: '100%',
    }}>
      <div style={{
        width: 28,
        height: 28,
        border: '2.5px solid var(--separator)',
        borderTopColor: 'var(--accent-blue)',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function App() {
  const { profile, settings, setUser, setSyncing } = useStore()
  const syncTimerRef = useRef(null)
  const [syncError, setSyncError] = useState(false)

  // Apply theme + accent to DOM
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', settings?.theme || 'dark')
    root.style.setProperty('--accent-blue', settings?.accent || '#0a84ff')
  }, [settings?.theme, settings?.accent])

  // Supabase auth listener + sync
  useEffect(() => {
    if (!isSupabaseConfigured) return

    const handleSession = async (session) => {
      if (!session?.user) {
        clearTimeout(syncTimerRef.current)
        // Only wipe data on explicit logout — not when simply not logged in
        if (useStore.getState().user) {
          useStore.getState().resetStore()
        }
        return
      }

      const su = session.user
      const userData = {
        uid:         su.id,
        email:       su.email,
        displayName: su.user_metadata?.full_name || su.user_metadata?.name || su.email?.split('@')[0],
        photoURL:    su.user_metadata?.avatar_url || su.user_metadata?.picture,
      }

      const prevUser = useStore.getState().user
      if (prevUser && prevUser.uid !== su.id) {
        useStore.getState().resetStore()
      }

      setUser(userData)
      setSyncing(true)
      setSyncError(false)

      try {
        const cloudData = await downloadUserData(su.id)
        if (cloudData) {
          const safe = validateCloudData(cloudData)
          useStore.setState(safe)
          setUser(userData)
        } else {
          const state = useStore.getState()
          await uploadUserData(su.id, extractSyncData(state))
        }
      } catch (e) {
        if (import.meta.env.DEV) console.error('Sync error:', e)
        setSyncError(true)
      }
      setSyncing(false)
    }

    // Check existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => handleSession(session))

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') useStore.getState().setRecoveryMode(true)
      handleSession(session)
    })

    const uploadWithRetry = async (uid, data, attempt = 0) => {
      try {
        await uploadUserData(uid, data)
        setSyncError(false)
      } catch {
        if (attempt < 3) {
          setTimeout(() => uploadWithRetry(uid, data, attempt + 1), 2000 * 2 ** attempt)
        } else {
          setSyncError(true)
        }
      }
    }

    // Push local changes to cloud (debounced 5s)
    const unsubStore = useStore.subscribe((state) => {
      if (!state.user) return
      clearTimeout(syncTimerRef.current)
      syncTimerRef.current = setTimeout(() => {
        uploadWithRetry(state.user.uid, extractSyncData(state))
      }, 5000)
    })

    return () => {
      subscription.unsubscribe()
      unsubStore()
      clearTimeout(syncTimerRef.current)
    }
  }, [])

  const basename = import.meta.env.PROD ? '/Lucent' : '/'

  const page = (Component) => (
    <Suspense fallback={<PageLoader />}><Component /></Suspense>
  )

  return (
    <ErrorBoundary>
      <BrowserRouter basename={basename}>
        <Routes>
          {!profile.setupDone ? (
            <>
              <Route path="/setup" element={page(Setup)} />
              <Route path="*" element={<Navigate to="/setup" replace />} />
            </>
          ) : (
            <Route element={<Layout syncError={syncError} />}>
              <Route path="/"                  element={page(Dashboard)} />
              <Route path="/expenses"          element={page(Expenses)} />
              <Route path="/add-expense"       element={page(AddExpense)} />
              <Route path="/recurring"         element={page(Recurring)} />
              <Route path="/analytics"         element={page(Analytics)} />
              <Route path="/goals"             element={page(Goals)} />
              <Route path="/budgets"           element={page(Budgets)} />
              <Route path="/settings"          element={page(Settings)} />
              <Route path="/privacy"           element={page(Privacy)} />
              <Route path="/import"            element={page(Import)} />
              <Route path="/statement-analysis" element={page(StatementAnalysis)} />
              <Route path="/history"           element={page(MonthlyHistory)} />
              <Route path="*"                  element={<Navigate to="/" replace />} />
            </Route>
          )}
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
