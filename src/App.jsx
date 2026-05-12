import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useStore from './store/useStore.js'
import Layout from './components/layout/Layout.jsx'
import Setup from './pages/Setup.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Expenses from './pages/Expenses.jsx'
import Recurring from './pages/Recurring.jsx'
import Analytics from './pages/Analytics.jsx'
import AddExpense from './pages/AddExpense.jsx'

export default function App() {
  const { profile } = useStore()

  return (
    <BrowserRouter>
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  )
}
