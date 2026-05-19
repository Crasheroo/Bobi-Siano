import React from 'react'
import { translations } from '../utils/translations.js'

function getT() {
  try {
    const raw = localStorage.getItem('lucent-storage')
    const lang = raw ? JSON.parse(raw)?.state?.settings?.language : 'pl'
    return translations[lang] || translations.pl
  } catch {
    return translations.pl
  }
}

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error('App error:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    const t = getT()

    return (
      <div style={{
        minHeight: '100%',
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        gap: '16px',
        textAlign: 'center',
      }}>
        <span style={{ fontSize: 48 }}>⚠️</span>
        <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
          {t.errorBoundary.title}
        </p>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {t.errorBoundary.message}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: 8,
            padding: '12px 28px',
            background: 'var(--accent-blue)',
            border: 'none',
            borderRadius: 'var(--border-radius-md)',
            color: 'white',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {t.errorBoundary.reload}
        </button>
      </div>
    )
  }
}
