import React, { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import useStore from './store/useStore.js'
import { auth, db, isFirebaseConfigured } from './services/firebase.js'
import { downloadUserData, uploadUserData, extractSyncData, validateCloudData } from './services/sync.js'
import Layout from './components/layout/Layout.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

const Setup = lazy(() => import('./pages/Setup.jsx'))
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const Expenses = lazy(() => import('./pages/Expenses.jsx'))
const Recurring = lazy(() => import('./pages/Recurring.jsx'))
const Analytics = lazy(() => import('./pages/Analytics.jsx'))
const AddExpense = lazy(() => import('./pages/AddExpense.jsx'))
const Goals = lazy(() => import('./pages/Goals.jsx'))
const Settings = lazy(() => import('./pages/Settings.jsx'))
const Privacy = lazy(() => import('./pages/Privacy.jsx'))
const Import = lazy(() => import('./pages/Import.jsx'))
const StatementAnalysis = lazy(() => import('./pages/StatementAnalysis.jsx'))
const MonthlyHistory    = lazy(() => import('./pages/MonthlyHistory.jsx'))

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

  // Firebase auth listener + initial sync
  useEffect(() => {
    if (!isFirebaseConfigured) return

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        }

        const prevUser = useStore.getState().user
        if (prevUser && prevUser.uid !== firebaseUser.uid) {
          useStore.getState().resetStore()
        }

        setUser(userData)
        setSyncing(true)
        setSyncError(false)
        try {
          const cloudData = await downloadUserData(firebaseUser.uid)
          if (cloudData) {
            const safe = validateCloudData(cloudData)
            useStore.setState(safe)
            setUser(userData)
          } else {
            const state = useStore.getState()
            await uploadUserData(firebaseUser.uid, extractSyncData(state))
          }
        } catch (e) {
          console.error('Sync error:', e)
          setSyncError(true)
        }
        setSyncing(false)
      } else {
        clearTimeout(syncTimerRef.current)
        useStore.getState().resetStore()
      }
    })

    // Push local changes to cloud (debounced 5s)
    const unsubStore = useStore.subscribe((state) => {
      if (!state.user || !db) return
      clearTimeout(syncTimerRef.current)
      syncTimerRef.current = setTimeout(() => {
        uploadUserData(state.user.uid, extractSyncData(state))
          .then(() => setSyncError(false))
          .catch(() => setSyncError(true))
      }, 5000)
    })

    return () => {
      unsubAuth()
      unsubStore()
      clearTimeout(syncTimerRef.current)
    }
  }, [])

  const basename = import.meta.env.PROD ? '/Lucent' : '/'

  return (
    <ErrorBoundary>
      <BrowserRouter basename={basename}>
        <Routes>
          {!profile.setupDone ? (
            <>
              <Route path="/setup" element={
                <Suspense fallback={<PageLoader />}><Setup /></Suspense>
              } />
              <Route path="*" element={<Navigate to="/setup" replace />} />
            </>
          ) : (
            <Route element={<Layout syncError={syncError} />}>
              <Route path="/" element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
              <Route path="/expenses" element={<Suspense fallback={<PageLoader />}><Expenses /></Suspense>} />
              <Route path="/add-expense" element={<Suspense fallback={<PageLoader />}><AddExpense /></Suspense>} />
              <Route path="/recurring" element={<Suspense fallback={<PageLoader />}><Recurring /></Suspense>} />
              <Route path="/analytics" element={<Suspense fallback={<PageLoader />}><Analytics /></Suspense>} />
              <Route path="/goals" element={<Suspense fallback={<PageLoader />}><Goals /></Suspense>} />
              <Route path="/settings" element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>} />
              <Route path="/privacy" element={<Suspense fallback={<PageLoader />}><Privacy /></Suspense>} />
              <Route path="/import" element={<Suspense fallback={<PageLoader />}><Import /></Suspense>} />
              <Route path="/statement-analysis" element={<Suspense fallback={<PageLoader />}><StatementAnalysis /></Suspense>} />
              <Route path="/history" element={<Suspense fallback={<PageLoader />}><MonthlyHistory /></Suspense>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          )}
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
