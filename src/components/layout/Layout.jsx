import React from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import styles from './Layout.module.css'
import { useTranslation } from '../../hooks/useTranslation.js'

const AC = 'var(--accent-blue)'
const IN = 'var(--tab-inactive)'

const TABS = [
  {
    path: '/',
    labelKey: 'overview',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="8" height="8" rx="2" fill={active ? AC : 'none'} stroke={active ? AC : IN} strokeWidth="1.8"/>
        <rect x="13" y="3" width="8" height="8" rx="2" fill={active ? AC : 'none'} stroke={active ? AC : IN} strokeWidth="1.8"/>
        <rect x="3" y="13" width="8" height="8" rx="2" fill={active ? AC : 'none'} stroke={active ? AC : IN} strokeWidth="1.8"/>
        <rect x="13" y="13" width="8" height="8" rx="2" fill={active ? AC : 'none'} stroke={active ? AC : IN} strokeWidth="1.8"/>
      </svg>
    ),
  },
  {
    path: '/expenses',
    labelKey: 'expenses',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M20 12V22H4V12" stroke={active ? AC : IN} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M22 7H2V12H22V7Z" stroke={active ? AC : IN} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 22V7" stroke={active ? AC : IN} strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    path: '/analytics',
    labelKey: 'analytics',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke={active ? AC : IN} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    path: '/recurring',
    labelKey: 'recurring',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <polyline points="17 1 21 5 17 9" stroke={active ? AC : IN} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3 11V9a4 4 0 0 1 4-4h14" stroke={active ? AC : IN} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="7 23 3 19 7 15" stroke={active ? AC : IN} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M21 13v2a4 4 0 0 1-4 4H3" stroke={active ? AC : IN} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    path: '/goals',
    labelKey: 'goals',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke={active ? AC : IN} strokeWidth="1.8"/>
        <circle cx="12" cy="12" r="6" stroke={active ? AC : IN} strokeWidth="1.8"/>
        <circle cx="12" cy="12" r="2" fill={active ? AC : IN}/>
      </svg>
    ),
  },
]

const settingsIcon = (active) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="3" stroke={active ? AC : IN} strokeWidth="1.8"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke={active ? AC : IN} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export default function Layout({ syncError }) {
  const location = useLocation()
  const navigate = useNavigate()
  const t = useTranslation()

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const settingsActive = location.pathname === '/settings'

  return (
    <div className={styles.container}>
      {/* Desktop sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <img src="/logo.png" alt="Lucent" className={styles.sidebarLogoIcon} />
          <span className={styles.sidebarLogoText}>Lucent</span>
        </div>

        <nav className={styles.sidebarNav}>
          {TABS.map((tab) => {
            const active = isActive(tab.path)
            return (
              <button
                key={tab.path}
                className={`${styles.sidebarItem} ${active ? styles.sidebarItemActive : ''}`}
                onClick={() => navigate(tab.path)}
              >
                <span className={styles.sidebarItemIcon}>{tab.icon(active)}</span>
                <span className={styles.sidebarItemLabel} style={{ color: active ? AC : IN }}>
                  {t.nav[tab.labelKey]}
                </span>
              </button>
            )
          })}
        </nav>

        <div className={styles.sidebarBottom}>
          <button
            className={`${styles.sidebarItem} ${settingsActive ? styles.sidebarItemActive : ''}`}
            onClick={() => navigate('/settings')}
          >
            <span className={styles.sidebarItemIcon}>{settingsIcon(settingsActive)}</span>
            <span className={styles.sidebarItemLabel} style={{ color: settingsActive ? AC : IN }}>
              {t.nav.settings}
            </span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={styles.content}>
        {syncError && (
          <div className={styles.syncErrorBanner}>
            <span>⚠️</span>
            <span>{t.syncError}</span>
          </div>
        )}
        <div key={location.pathname} className="animate-fadeIn">
          <Outlet />
        </div>
      </div>

      {/* Mobile tab bar */}
      <nav className={styles.tabBar}>
        {TABS.map((tab) => {
          const active = isActive(tab.path)
          return (
            <button
              key={tab.path}
              className={`${styles.tabItem} ${active ? styles.tabItemActive : ''}`}
              onClick={() => navigate(tab.path)}
              aria-label={t.nav[tab.labelKey]}
            >
              <div className={styles.tabIcon}>{tab.icon(active)}</div>
              <span className={styles.tabLabel} style={{ color: active ? 'var(--accent-blue)' : 'var(--tab-inactive)' }}>
                {t.nav[tab.labelKey]}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
