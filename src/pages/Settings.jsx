import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithPopup, signOut } from 'firebase/auth'
import useStore from '../store/useStore.js'
import {
  auth,
  googleProvider,
  isFirebaseConfigured,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from '../services/firebase.js'
import styles from './Settings.module.css'

const ACCENT_COLORS = [
  { label: 'Niebieski', value: '#0a84ff' },
  { label: 'Zielony', value: '#30d158' },
  { label: 'Fioletowy', value: '#bf5af2' },
  { label: 'Pomarańczowy', value: '#ff9f0a' },
  { label: 'Różowy', value: '#ff375f' },
  { label: 'Turkusowy', value: '#5ac8fa' },
  { label: 'Indygo', value: '#5e5ce6' },
  { label: 'Miętowy', value: '#34c759' },
]

function getFirebaseError(code) {
  switch (code) {
    case 'auth/email-already-in-use': return 'Ten email jest już zarejestrowany'
    case 'auth/invalid-email': return 'Nieprawidłowy adres email'
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'Nieprawidłowy email lub hasło'
    case 'auth/user-not-found': return 'Nie znaleziono konta z tym emailem'
    case 'auth/weak-password': return 'Hasło musi mieć co najmniej 6 znaków'
    case 'auth/too-many-requests': return 'Zbyt wiele prób. Spróbuj za chwilę'
    default: return 'Wystąpił błąd. Spróbuj ponownie'
  }
}

export default function Settings() {
  const navigate = useNavigate()
  const { settings, setSettings, profile, user, syncing } = useStore()

  const theme = settings?.theme || 'dark'
  const accent = settings?.accent || '#0a84ff'

  const [authTab, setAuthTab] = useState('google')
  const [authAction, setAuthAction] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const clearForm = () => {
    setEmail('')
    setPassword('')
    setConfirm('')
    setAuthError('')
    setResetSent(false)
  }

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (e) {
      console.error('Login error:', e)
    }
  }

  const handleEmailAuth = async () => {
    setAuthError('')
    if (!email.trim() || !password) {
      setAuthError('Wypełnij wszystkie pola')
      return
    }
    if (authAction === 'register') {
      if (password.length < 6) {
        setAuthError('Hasło musi mieć co najmniej 6 znaków')
        return
      }
      if (password !== confirm) {
        setAuthError('Hasła się nie zgadzają')
        return
      }
    }
    setAuthLoading(true)
    try {
      if (authAction === 'register') {
        await createUserWithEmailAndPassword(auth, email.trim(), password)
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password)
      }
    } catch (e) {
      setAuthError(getFirebaseError(e.code))
    }
    setAuthLoading(false)
  }

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      setAuthError('Wpisz adres email żeby zresetować hasło')
      return
    }
    setAuthLoading(true)
    try {
      await sendPasswordResetEmail(auth, email.trim())
      setResetSent(true)
      setAuthError('')
    } catch (e) {
      setAuthError(getFirebaseError(e.code))
    }
    setAuthLoading(false)
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth)
    } catch (e) {
      console.error('Sign out error:', e)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className={styles.title}>Ustawienia</h1>
        <div style={{ width: 36 }} />
      </div>

      {/* Synchronizacja */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>Konto i synchronizacja</p>
        <div className={styles.group}>
          {!isFirebaseConfigured ? (
            <div className={styles.row}>
              <p className={styles.rowValue} style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>
                Firebase nie jest skonfigurowany. Uzupełnij plik .env.
              </p>
            </div>
          ) : user ? (
            <>
              <div className={styles.row}>
                {user.photoURL && (
                  <img src={user.photoURL} alt="" className={styles.avatar} referrerPolicy="no-referrer" />
                )}
                <div className={styles.rowLeft}>
                  <p className={styles.rowTitle}>{user.displayName || user.email}</p>
                  <p className={styles.rowSub}>{user.email}</p>
                </div>
                {syncing && <span className={styles.syncDot} title="Synchronizowanie..." />}
              </div>
              <div className={styles.rowSeparator} />
              <button className={styles.signOutBtn} onClick={handleSignOut}>
                Wyloguj się
              </button>
            </>
          ) : (
            <>
              <div className={styles.authTabs}>
                <button
                  className={`${styles.authTab} ${authTab === 'google' ? styles.authTabActive : ''}`}
                  onClick={() => { setAuthTab('google'); clearForm() }}
                >
                  Google
                </button>
                <button
                  className={`${styles.authTab} ${authTab === 'email' ? styles.authTabActive : ''}`}
                  onClick={() => { setAuthTab('email'); clearForm() }}
                >
                  Email
                </button>
              </div>

              {authTab === 'google' ? (
                <button className={styles.googleBtn} onClick={handleGoogleLogin}>
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Zaloguj się przez Google
                </button>
              ) : (
                <div className={styles.emailForm}>
                  <div className={styles.actionToggle}>
                    <button
                      className={`${styles.actionBtn} ${authAction === 'login' ? styles.actionBtnActive : ''}`}
                      onClick={() => { setAuthAction('login'); setAuthError(''); setResetSent(false) }}
                    >
                      Zaloguj się
                    </button>
                    <button
                      className={`${styles.actionBtn} ${authAction === 'register' ? styles.actionBtnActive : ''}`}
                      onClick={() => { setAuthAction('register'); setAuthError(''); setResetSent(false) }}
                    >
                      Zarejestruj się
                    </button>
                  </div>

                  <input
                    className={styles.authInput}
                    type="email"
                    placeholder="Adres email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setAuthError('') }}
                    autoComplete="email"
                  />
                  <input
                    className={styles.authInput}
                    type="password"
                    placeholder="Hasło (min. 6 znaków)"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setAuthError('') }}
                    autoComplete={authAction === 'register' ? 'new-password' : 'current-password'}
                    onKeyDown={(e) => e.key === 'Enter' && !confirm && handleEmailAuth()}
                  />
                  {authAction === 'register' && (
                    <input
                      className={styles.authInput}
                      type="password"
                      placeholder="Powtórz hasło"
                      value={confirm}
                      onChange={(e) => { setConfirm(e.target.value); setAuthError('') }}
                      autoComplete="new-password"
                      onKeyDown={(e) => e.key === 'Enter' && handleEmailAuth()}
                    />
                  )}

                  {authError && <p className={styles.authError}>{authError}</p>}
                  {resetSent && <p className={styles.authSuccess}>Link do resetu hasła wysłany na {email}</p>}

                  <button
                    className={styles.authSubmitBtn}
                    onClick={handleEmailAuth}
                    disabled={authLoading}
                  >
                    {authLoading ? 'Ładowanie...' : authAction === 'register' ? 'Zarejestruj się' : 'Zaloguj się'}
                  </button>

                  {authAction === 'login' && (
                    <button className={styles.forgotBtn} onClick={handlePasswordReset} disabled={authLoading}>
                      Zapomniałem hasła
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        {isFirebaseConfigured && !user && (
          <p className={styles.sectionNote}>
            Logowanie synchronizuje Twoje dane między urządzeniami.
          </p>
        )}
      </div>

      {/* Motyw */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>Wygląd</p>
        <div className={styles.group}>
          <div className={styles.row}>
            <div className={styles.rowLeft}>
              <p className={styles.rowTitle}>Motyw</p>
            </div>
            <div className={styles.themeToggle}>
              <button
                className={`${styles.themeBtn} ${theme === 'dark' ? styles.themeBtnActive : ''}`}
                onClick={() => setSettings({ theme: 'dark' })}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill={theme === 'dark' ? 'currentColor' : 'none'}/>
                </svg>
                Ciemny
              </button>
              <button
                className={`${styles.themeBtn} ${theme === 'light' ? styles.themeBtnActive : ''}`}
                onClick={() => setSettings({ theme: 'light' })}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2.2" fill={theme === 'light' ? 'currentColor' : 'none'}/>
                  <line x1="12" y1="2" x2="12" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="2" y1="12" x2="5" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="19" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Jasny
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Kolor akcentu */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>Kolor akcentu</p>
        <div className={styles.group}>
          <div className={styles.accentGrid}>
            {ACCENT_COLORS.map((c) => (
              <button
                key={c.value}
                className={styles.accentItem}
                onClick={() => setSettings({ accent: c.value })}
                aria-label={c.label}
              >
                <div
                  className={`${styles.accentSwatch} ${accent === c.value ? styles.accentSwatchActive : ''}`}
                  style={{ background: c.value }}
                >
                  {accent === c.value && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <polyline points="20 6 9 17 4 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className={styles.accentLabel}>{c.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Profil */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>Profil</p>
        <div className={styles.group}>
          <div className={styles.row}>
            <p className={styles.rowTitle}>Imię</p>
            <p className={styles.rowValue}>{profile.name || '—'}</p>
          </div>
          <div className={styles.rowSeparator} />
          <div className={styles.row}>
            <p className={styles.rowTitle}>Domyślna wypłata</p>
            <p className={styles.rowValue}>
              {new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(profile.salary)}
            </p>
          </div>
        </div>
        <p className={styles.sectionNote}>Domyślna wypłata używana gdy nie wpisano kwoty na dany miesiąc.</p>
      </div>
    </div>
  )
}
