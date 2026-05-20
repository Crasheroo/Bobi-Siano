import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useStore from '../store/useStore.js'
import { CATEGORIES, CURRENCIES } from '../utils/constants.js'
import { version } from '../../package.json'
import { useFormatCurrency } from '../hooks/useFormatCurrency.js'
import { supabase, isSupabaseConfigured } from '../services/supabase.js'
import { useTranslation } from '../hooks/useTranslation.js'
import styles from './Settings.module.css'

const SUPABASE_ERRORS = {
  'Invalid login credentials':                  'Nieprawidłowy email lub hasło',
  'User already registered':                     'Ten email jest już zarejestrowany',
  'Password should be at least 6 characters':    'Hasło musi mieć minimum 6 znaków',
  'Email not confirmed':                          'Potwierdź swój email przed logowaniem',
  'Signup is disabled':                           'Rejestracja jest tymczasowo wyłączona',
}
const mapAuthError = (e) => SUPABASE_ERRORS[e?.message] || e?.message || 'Wystąpił błąd. Spróbuj ponownie.'

const CAT_ICONS = ['🏷️', '🐾', '🎁', '🎮', '💇', '🧴', '🧹', '🍕', '☕', '🎨', '🏊', '🚴', '🌿', '🧸', '👗', '💄', '🔧', '🎵', '⚽', '🐟']
const CAT_COLORS = ['#0a84ff', '#30d158', '#ff9f0a', '#ff453a', '#bf5af2', '#5ac8fa', '#ff6b35', '#ffd60a', '#64d2ff', '#98989e']

const ACCENT_COLORS = [
  { key: 'blue', value: '#0a84ff' },
  { key: 'green', value: '#30d158' },
  { key: 'purple', value: '#bf5af2' },
  { key: 'orange', value: '#ff9f0a' },
  { key: 'pink', value: '#ff375f' },
  { key: 'teal', value: '#5ac8fa' },
  { key: 'indigo', value: '#5e5ce6' },
  { key: 'mint', value: '#34c759' },
]

export default function Settings() {
  const navigate = useNavigate()
  const t = useTranslation()
  const { settings, setSettings, profile, setProfile, user, syncing, customCategories, addCustomCategory, deleteCustomCategory, clearExpenses, resetStore } = useStore()

  const theme = settings?.theme || 'dark'
  const accent = settings?.accent || '#0a84ff'
  const language = settings?.language || 'pl'
  const currency = settings?.currency || 'PLN'
  const formatAmount = useFormatCurrency()

  const geminiKey = settings?.geminiApiKey || ''
  const [geminiInput, setGeminiInput] = useState(geminiKey)
  const [geminiSaved, setGeminiSaved] = useState(false)
  const [showGeminiKey, setShowGeminiKey] = useState(false)

  const saveGeminiKey = () => {
    setSettings({ geminiApiKey: geminiInput.trim() })
    setGeminiSaved(true)
    setTimeout(() => setGeminiSaved(false), 2000)
  }

  const [confirmClear, setConfirmClear] = useState(null) // 'expenses' | 'all'

  const [showAddCat, setShowAddCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatIcon, setNewCatIcon] = useState('🏷️')
  const [newCatColor, setNewCatColor] = useState('#0a84ff')
  const [catError, setCatError] = useState('')

  const handleAddCategory = () => {
    const name = newCatName.trim()
    if (!name) { setCatError(t.settings.categoryErrorEmpty); return }
    if ([...CATEGORIES, ...customCategories].some((c) => c.label.toLowerCase() === name.toLowerCase())) {
      setCatError(t.settings.categoryErrorDuplicate)
      return
    }
    addCustomCategory({ label: name, icon: newCatIcon, color: newCatColor })
    setNewCatName(''); setNewCatIcon('🏷️'); setNewCatColor('#0a84ff'); setCatError(''); setShowAddCat(false)
  }

  const [authTab, setAuthTab] = useState('google')
  const [authAction, setAuthAction] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const [recoveryMode, setRecoveryMode] = useState(false)
  const [recoveryDone, setRecoveryDone] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [recoveryError, setRecoveryError] = useState('')
  const [recoveryLoading, setRecoveryLoading] = useState(false)

  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const clearForm = () => {
    setEmail('')
    setPassword('')
    setConfirm('')
    setAuthError('')
    setResetSent(false)
  }

  const handleGoogleLogin = async () => {
    if (!supabase) return
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname },
    })
  }

  const handleEmailAuth = async () => {
    setAuthError('')
    if (!email.trim() || !password) {
      setAuthError(t.settings.authFormErrors.emptyFields)
      return
    }
    if (authAction === 'register') {
      if (password.length < 6) {
        setAuthError(t.settings.authFormErrors.passwordTooShort)
        return
      }
      if (password !== confirm) {
        setAuthError(t.settings.authFormErrors.passwordMismatch)
        return
      }
    }
    setAuthLoading(true)
    try {
      if (authAction === 'register') {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
      }
    } catch (e) {
      setAuthError(mapAuthError(e))
    }
    setAuthLoading(false)
  }

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      setAuthError(t.settings.authFormErrors.emptyFields)
      return
    }
    setAuthLoading(true)
    try {
      const base = import.meta.env.PROD ? '/Lucent' : ''
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}${base}/settings`,
      })
      if (error) throw error
      setResetSent(true)
      setAuthError('')
    } catch (e) {
      setAuthError(mapAuthError(e))
    }
    setAuthLoading(false)
  }

  const handleUpdatePassword = async () => {
    setRecoveryError('')
    if (newPassword.length < 6) {
      setRecoveryError(t.settings.authFormErrors.passwordTooShort)
      return
    }
    if (newPassword !== newPasswordConfirm) {
      setRecoveryError(t.settings.authFormErrors.passwordMismatch)
      return
    }
    setRecoveryLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setRecoveryMode(false)
      setRecoveryDone(true)
      setNewPassword('')
      setNewPasswordConfirm('')
    } catch (e) {
      setRecoveryError(mapAuthError(e))
    }
    setRecoveryLoading(false)
  }

  const handleSignOut = async () => {
    localStorage.removeItem('lucent-storage')
    if (supabase) await supabase.auth.signOut()
  }

  return (
    <div className={styles.page}>
      {recoveryMode && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 24,
        }}>
          <div style={{
            background: 'var(--bg-secondary)', borderRadius: 16,
            padding: 24, width: '100%', maxWidth: 360,
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
              Ustaw nowe hasło
            </h2>
            <input
              className={styles.authInput}
              type="password"
              placeholder={t.settings.passwordPlaceholder}
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setRecoveryError('') }}
              autoComplete="new-password"
            />
            <input
              className={styles.authInput}
              type="password"
              placeholder={t.settings.confirmPasswordPlaceholder}
              value={newPasswordConfirm}
              onChange={(e) => { setNewPasswordConfirm(e.target.value); setRecoveryError('') }}
              autoComplete="new-password"
              onKeyDown={(e) => e.key === 'Enter' && handleUpdatePassword()}
            />
            {recoveryError && <p className={styles.authError}>{recoveryError}</p>}
            <button
              className={styles.authSubmitBtn}
              onClick={handleUpdatePassword}
              disabled={recoveryLoading}
            >
              {recoveryLoading ? t.common.loading : 'Zapisz nowe hasło'}
            </button>
          </div>
        </div>
      )}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className={styles.title}>{t.settings.title}</h1>
        <div style={{ width: 36 }} />
      </div>

      {/* Synchronizacja */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>{t.settings.accountSection}</p>
        <div className={styles.group}>
          {!isSupabaseConfigured ? (
            <div className={styles.row}>
              <p className={styles.rowValue} style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>
                {t.settings.firebaseNotConfigured}
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
              {recoveryDone && (
                <p className={styles.authSuccess} style={{ padding: '0 16px' }}>
                  Hasło zostało zmienione
                </p>
              )}
              <div className={styles.rowSeparator} />
              <button className={styles.signOutBtn} onClick={handleSignOut}>
                {t.settings.signOut}
              </button>
            </>
          ) : (
            <>
              <div className={styles.authTabs}>
                <button
                  className={`${styles.authTab} ${authTab === 'google' ? styles.authTabActive : ''}`}
                  onClick={() => { setAuthTab('google'); clearForm() }}
                >
                  {t.settings.authTabGoogle}
                </button>
                <button
                  className={`${styles.authTab} ${authTab === 'email' ? styles.authTabActive : ''}`}
                  onClick={() => { setAuthTab('email'); clearForm() }}
                >
                  {t.settings.authTabEmail}
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
                  {t.settings.loginBtn} (Google)
                </button>
              ) : (
                <div className={styles.emailForm}>
                  <div className={styles.actionToggle}>
                    <button
                      className={`${styles.actionBtn} ${authAction === 'login' ? styles.actionBtnActive : ''}`}
                      onClick={() => { setAuthAction('login'); setAuthError(''); setResetSent(false) }}
                    >
                      {t.settings.loginBtn}
                    </button>
                    <button
                      className={`${styles.actionBtn} ${authAction === 'register' ? styles.actionBtnActive : ''}`}
                      onClick={() => { setAuthAction('register'); setAuthError(''); setResetSent(false) }}
                    >
                      {t.settings.registerBtn}
                    </button>
                  </div>

                  <input
                    className={styles.authInput}
                    type="email"
                    placeholder={t.settings.emailPlaceholder}
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setAuthError('') }}
                    autoComplete="email"
                  />
                  <input
                    className={styles.authInput}
                    type="password"
                    placeholder={t.settings.passwordPlaceholder}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setAuthError('') }}
                    autoComplete={authAction === 'register' ? 'new-password' : 'current-password'}
                    onKeyDown={(e) => e.key === 'Enter' && !confirm && handleEmailAuth()}
                  />
                  {authAction === 'register' && (
                    <input
                      className={styles.authInput}
                      type="password"
                      placeholder={t.settings.confirmPasswordPlaceholder}
                      value={confirm}
                      onChange={(e) => { setConfirm(e.target.value); setAuthError('') }}
                      autoComplete="new-password"
                      onKeyDown={(e) => e.key === 'Enter' && handleEmailAuth()}
                    />
                  )}

                  {authError && <p className={styles.authError}>{authError}</p>}
                  {resetSent && <p className={styles.authSuccess}>{t.settings.resetSent(email)}</p>}

                  <button
                    className={styles.authSubmitBtn}
                    onClick={handleEmailAuth}
                    disabled={authLoading}
                  >
                    {authLoading ? t.common.loading : authAction === 'register' ? t.settings.registerBtn : t.settings.loginBtn}
                  </button>

                  {authAction === 'login' && (
                    <button className={styles.forgotBtn} onClick={handlePasswordReset} disabled={authLoading}>
                      {t.settings.forgotPassword}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        {isSupabaseConfigured && !user && (
          <p className={styles.sectionNote}>{t.settings.syncNote}</p>
        )}
      </div>

      {/* Motyw */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>{t.settings.appearance}</p>
        <div className={styles.group}>
          <div className={styles.row}>
            <div className={styles.rowLeft}>
              <p className={styles.rowTitle}>{t.settings.theme}</p>
            </div>
            <div className={styles.themeToggle}>
              <button
                className={`${styles.themeBtn} ${theme === 'dark' ? styles.themeBtnActive : ''}`}
                onClick={() => setSettings({ theme: 'dark' })}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill={theme === 'dark' ? 'currentColor' : 'none'}/>
                </svg>
                {t.settings.dark}
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
                {t.settings.light}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Kolor akcentu */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>{t.settings.accentColor}</p>
        <div className={styles.group}>
          <div className={styles.accentGrid}>
            {ACCENT_COLORS.map((c) => (
              <button
                key={c.value}
                className={styles.accentItem}
                onClick={() => setSettings({ accent: c.value })}
                aria-label={t.accentColors[c.key]}
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
                <span className={styles.accentLabel}>{t.accentColors[c.key]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Język */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>{t.settings.languageSection}</p>
        <div className={styles.group}>
          <div className={styles.row}>
            <div className={styles.rowLeft}>
              <p className={styles.rowTitle}>🌐 {t.settings.languageSection}</p>
            </div>
            <div className={styles.themeToggle}>
              <button
                className={`${styles.themeBtn} ${language === 'pl' ? styles.themeBtnActive : ''}`}
                onClick={() => setSettings({ language: 'pl' })}
              >
                PL
              </button>
              <button
                className={`${styles.themeBtn} ${language === 'en' ? styles.themeBtnActive : ''}`}
                onClick={() => setSettings({ language: 'en' })}
              >
                EN
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Waluta */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>{t.settings.currencySection}</p>
        <div className={styles.group}>
          <div className={styles.currencyGrid}>
            {CURRENCIES.map((c) => (
              <button
                key={c.code}
                className={`${styles.currencyBtn} ${currency === c.code ? styles.currencyBtnActive : ''}`}
                style={currency === c.code ? { borderColor: accent, background: accent + '22', color: accent } : {}}
                onClick={() => setSettings({ currency: c.code })}
              >
                <span className={styles.currencyCode}>{c.code}</span>
                <span className={styles.currencySymbol}>{c.symbol}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Własne kategorie */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>{t.settings.customCategories}</p>
        <div className={styles.group}>
          {customCategories.length === 0 && !showAddCat && (
            <div className={styles.row}>
              <p className={styles.rowValue} style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>
                {t.settings.noCustomCategories}
              </p>
            </div>
          )}
          {customCategories.map((cat, i) => (
            <React.Fragment key={cat.id}>
              {i > 0 && <div className={styles.rowSeparator} />}
              <div className={styles.row}>
                <div className={styles.catIconBadge} style={{ background: cat.color + '22' }}>
                  <span>{cat.icon}</span>
                </div>
                <div className={styles.rowLeft}>
                  <p className={styles.rowTitle}>{cat.label}</p>
                </div>
                <button className={styles.catDeleteBtn} onClick={() => deleteCustomCategory(cat.id)}>✕</button>
              </div>
            </React.Fragment>
          ))}

          {showAddCat && (
            <div className={styles.addCatForm}>
              <div className={styles.catIconPicker}>
                {CAT_ICONS.map((ic) => (
                  <button
                    key={ic}
                    className={`${styles.catIconBtn} ${newCatIcon === ic ? styles.catIconBtnActive : ''}`}
                    onClick={() => setNewCatIcon(ic)}
                  >
                    {ic}
                  </button>
                ))}
              </div>
              <div className={styles.catColorPicker}>
                {CAT_COLORS.map((c) => (
                  <button
                    key={c}
                    className={`${styles.catColorBtn} ${newCatColor === c ? styles.catColorBtnActive : ''}`}
                    style={{ background: c }}
                    onClick={() => setNewCatColor(c)}
                  />
                ))}
              </div>
              <input
                className={styles.authInput}
                type="text"
                placeholder={t.settings.categoryNamePlaceholder}
                value={newCatName}
                onChange={(e) => { setNewCatName(e.target.value); setCatError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                autoFocus
              />
              {catError && <p className={styles.authError}>{catError}</p>}
              <div className={styles.addCatActions}>
                <button className={styles.authSubmitBtn} style={{ flex: 1 }} onClick={handleAddCategory}>
                  {t.common.add}
                </button>
                <button
                  className={styles.addCatCancelBtn}
                  onClick={() => { setShowAddCat(false); setNewCatName(''); setCatError('') }}
                >
                  {t.common.cancel}
                </button>
              </div>
            </div>
          )}

          {!showAddCat && (
            <>
              {customCategories.length > 0 && <div className={styles.rowSeparator} />}
              <button className={styles.addCatBtn} onClick={() => setShowAddCat(true)}>
                {t.settings.addCategory}
              </button>
            </>
          )}
        </div>
        <p className={styles.sectionNote}>{t.settings.categoryNote}</p>
      </div>

      {/* Profil */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>{t.settings.profileSection}</p>
        <div className={styles.group}>
          <div className={styles.row}>
            <p className={styles.rowTitle}>{t.settings.profileName}</p>
            <p className={styles.rowValue}>{profile.name || '—'}</p>
          </div>
          <div className={styles.rowSeparator} />
          <div className={styles.row}>
            <p className={styles.rowTitle}>{t.settings.defaultSalary}</p>
            <p className={styles.rowValue}>
              {formatAmount(profile.salary)}
            </p>
          </div>
          <div className={styles.rowSeparator} />
          <div className={styles.row}>
            <div className={styles.rowLeft}>
              <p className={styles.rowTitle}>{t.settings.salaryDay}</p>
              <p className={styles.rowSub} style={{ fontSize: 11, marginTop: 2 }}>{t.settings.salaryDayNote}</p>
            </div>
            <select
              className={styles.salaryDaySelect}
              value={profile.salaryDay ?? 1}
              onChange={e => setProfile({ salaryDay: parseInt(e.target.value) })}
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>{d}.</option>
              ))}
            </select>
          </div>
        </div>
        <p className={styles.sectionNote}>{t.settings.salaryNote}</p>
      </div>

      {/* Dane */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>AI — automatyczna kategoryzacja</p>
        <div className={styles.group}>
          <div className={styles.aiKeyRow}>
            <input
              className={styles.aiKeyInput}
              type={showGeminiKey ? 'text' : 'password'}
              placeholder="Klucz API Google Gemini (opcjonalnie)"
              value={geminiInput}
              onChange={e => { setGeminiInput(e.target.value); setGeminiSaved(false) }}
              autoComplete="off"
              spellCheck={false}
            />
            <button className={styles.aiKeyToggle} onClick={() => setShowGeminiKey(v => !v)} type="button">
              {showGeminiKey ? '🙈' : '👁'}
            </button>
            <button
              className={styles.aiKeySave}
              onClick={saveGeminiKey}
              disabled={geminiInput.trim() === geminiKey}
            >
              {geminiSaved ? '✓' : 'Zapisz'}
            </button>
          </div>
          {geminiKey && (
            <div className={styles.aiKeyStatus}>
              <span className={styles.aiKeyDot} />
              <span>AI aktywne — transakcje bez kategorii będą automatycznie oznaczone przy imporcie</span>
            </div>
          )}
        </div>
        <p className={styles.sectionNote}>
          Darmowy klucz: <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)' }}>aistudio.google.com</a> → Get API Key.{' '}
          Opisy transakcji są wysyłane do Google Gemini w celu kategoryzacji. Klucz jest przechowywany tylko na tym urządzeniu.
        </p>

        <p className={styles.sectionLabel}>Dane</p>
        <div className={styles.group}>
          {confirmClear === 'expenses' ? (
            <div className={styles.confirmBox}>
              <p className={styles.confirmText}>Usunąć wszystkie wydatki? Tej operacji nie można cofnąć.</p>
              <div className={styles.confirmActions}>
                <button className={styles.confirmYes} onClick={() => { clearExpenses(); setConfirmClear(null) }}>Usuń wydatki</button>
                <button className={styles.confirmNo} onClick={() => setConfirmClear(null)}>Anuluj</button>
              </div>
            </div>
          ) : (
            <button className={styles.dataBtn} onClick={() => setConfirmClear('expenses')}>
              Wyczyść wszystkie wydatki
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          )}
          <div className={styles.rowSeparator} />
          {confirmClear === 'all' ? (
            <div className={styles.confirmBox}>
              <p className={styles.confirmText}>Zresetować całą aplikację? Wszystkie dane zostaną usunięte.</p>
              <div className={styles.confirmActions}>
                <button className={styles.confirmYes} onClick={() => { resetStore(); setConfirmClear(null) }}>Resetuj wszystko</button>
                <button className={styles.confirmNo} onClick={() => setConfirmClear(null)}>Anuluj</button>
              </div>
            </div>
          ) : (
            <button className={styles.dataBtn} onClick={() => setConfirmClear('all')}>
              Resetuj wszystko
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          )}
        </div>
        <p className={styles.sectionNote}>Usuwa dane tylko z tego urządzenia. Konto w chmurze pozostaje bez zmian.</p>
      </div>

      {/* Prawne */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>{t.settings.legal}</p>
        <div className={styles.group}>
          <Link to="/privacy" style={{ textDecoration: 'none' }}>
            <div className={styles.row}>
              <p className={styles.rowTitle}>{t.settings.privacyPolicy}</p>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </Link>
        </div>
        <p className={styles.sectionNote} style={{ textAlign: 'center', paddingTop: 20, paddingBottom: 8 }}>
          Lucent v{version}
        </p>
      </div>
    </div>
  )
}
