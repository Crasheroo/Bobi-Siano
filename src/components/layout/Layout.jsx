import React from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import styles from './Layout.module.css'

const TABS = [
  {
    path: '/',
    label: 'Przegląd',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="8" height="8" rx="2" fill={active ? '#0a84ff' : 'none'} stroke={active ? '#0a84ff' : 'rgba(235,235,245,0.45)'} strokeWidth="1.8"/>
        <rect x="13" y="3" width="8" height="8" rx="2" fill={active ? '#0a84ff' : 'none'} stroke={active ? '#0a84ff' : 'rgba(235,235,245,0.45)'} strokeWidth="1.8"/>
        <rect x="3" y="13" width="8" height="8" rx="2" fill={active ? '#0a84ff' : 'none'} stroke={active ? '#0a84ff' : 'rgba(235,235,245,0.45)'} strokeWidth="1.8"/>
        <rect x="13" y="13" width="8" height="8" rx="2" fill={active ? '#0a84ff' : 'none'} stroke={active ? '#0a84ff' : 'rgba(235,235,245,0.45)'} strokeWidth="1.8"/>
      </svg>
    ),
  },
  {
    path: '/expenses',
    label: 'Wydatki',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M20 12V22H4V12" stroke={active ? '#0a84ff' : 'rgba(235,235,245,0.45)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M22 7H2V12H22V7Z" stroke={active ? '#0a84ff' : 'rgba(235,235,245,0.45)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 22V7" stroke={active ? '#0a84ff' : 'rgba(235,235,245,0.45)'} strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    path: '/analytics',
    label: 'Analiza',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke={active ? '#0a84ff' : 'rgba(235,235,245,0.45)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    path: '/recurring',
    label: 'Stałe',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <polyline points="17 1 21 5 17 9" stroke={active ? '#0a84ff' : 'rgba(235,235,245,0.45)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3 11V9a4 4 0 0 1 4-4h14" stroke={active ? '#0a84ff' : 'rgba(235,235,245,0.45)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="7 23 3 19 7 15" stroke={active ? '#0a84ff' : 'rgba(235,235,245,0.45)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M21 13v2a4 4 0 0 1-4 4H3" stroke={active ? '#0a84ff' : 'rgba(235,235,245,0.45)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <Outlet />
      </div>
      <nav className={styles.tabBar}>
        {TABS.map((tab) => {
          const active = isActive(tab.path)
          return (
            <button
              key={tab.path}
              className={`${styles.tabItem} ${active ? styles.tabItemActive : ''}`}
              onClick={() => navigate(tab.path)}
              aria-label={tab.label}
            >
              <div className={styles.tabIcon}>{tab.icon(active)}</div>
              <span className={styles.tabLabel} style={{ color: active ? '#0a84ff' : 'rgba(235,235,245,0.45)' }}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
