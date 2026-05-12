import React, { useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import useStore from './store/useStore.js'
import { auth, db, isFirebaseConfigured } from './services/firebase.js'
import { downloadUserData, uploadUserData, extractSyncData } from './services/sync.js'
import Layout from './components/layout/Layout.jsx'
import Setup from './pages/Setup.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Expenses from './pages/Expenses.jsx'
import Recurring from './pages/Recurring.jsx'
import Analytics from './pages/Analytics.jsx'
import AddExpense from './pages/AddExpense.jsx'
import Goals from './pages/Goals.jsx'
import Settings from './pages/Settings.jsx'

export default function App() {
  const { profile, settings, setUser, setSyncing } = useStore()
  const syncTimerRef = useRef(null)

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

        // If a different user was logged in before, clear their data first
        const prevUser = useStore.getState().user
        if (prevUser && prevUser.uid !== firebaseUser.uid) {
          useStore.getState().resetStore()
        }

        setUser(userData)
        setSyncing(true)
        try {
          const cloudData = await downloadUserData(firebaseUser.uid)
          if (cloudData) {
            useStore.setState(cloudData)
            setUser(userData)
          } else {
            const state = useStore.getState()
            await uploadUserData(firebaseUser.uid, extractSyncData(state))
          }
        } catch (e) {
          console.error('Sync error:', e)
        }
        setSyncing(false)
      } else {
        useStore.getState().resetStore()
      }
    })

    // Push local changes to cloud (debounced 2s)
    const unsubStore = useStore.subscribe((state) => {
      if (!state.user || !db) return
      clearTimeout(syncTimerRef.current)
      syncTimerRef.current = setTimeout(() => {
        uploadUserData(state.user.uid, extractSyncData(state)).catch(console.error)
      }, 2000)
    })

    return () => {
      unsubAuth()
      unsubStore()
      clearTimeout(syncTimerRef.current)
    }
  }, [])

  const basename = import.meta.env.PROD ? '/Bobi-Siano' : '/'

  return (
    <BrowserRouter basename={basename}>
      <Routes>
        {!profile.setupDone ? (
          <>
            <Route path="/setup" element={<Setup />} />
            <Route path="*" element={<Navigate to="/setup" replace />} />
          </>
        ) : (
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/add-expense" element={<AddExpense />} />
            <Route path="/recurring" element={<Recurring />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  )
}
