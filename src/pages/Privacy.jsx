import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../hooks/useTranslation.js'
import styles from './Settings.module.css'

export default function Privacy() {
  const navigate = useNavigate()
  const t = useTranslation()

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className={styles.title}>{t.privacy.title}</h1>
        <div style={{ width: 36 }} />
      </div>

      <div className={styles.section}>
        <p className={styles.sectionLabel}>{t.privacy.updated}</p>
        <div className={styles.group}>
          <div style={{ padding: '16px', lineHeight: 1.7, fontSize: 14, color: 'var(--text-secondary)' }}>
            <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 8 }}>{t.privacy.s1title}</p>
            <p style={{ marginBottom: 16 }}>{t.privacy.s1}</p>

            <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 8 }}>{t.privacy.s2title}</p>
            <p style={{ marginBottom: 16 }}>{t.privacy.s2}</p>

            <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 8 }}>{t.privacy.s3title}</p>
            <p style={{ marginBottom: 16 }}>{t.privacy.s3}</p>

            <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 8 }}>{t.privacy.s4title}</p>
            <p style={{ marginBottom: 16 }}>{t.privacy.s4}</p>

            <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 8 }}>{t.privacy.s5title}</p>
            <p style={{ marginBottom: 16 }}>{t.privacy.s5}</p>

            <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 8 }}>{t.privacy.s6title}</p>
            <p>{t.privacy.s6}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
