import React, { useState } from 'react'
import useStore from '../store/useStore.js'
import styles from './Setup.module.css'

export default function Setup() {
  const { setProfile } = useStore()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [salary, setSalary] = useState('')

  const handleFinish = () => {
    if (!salary || isNaN(Number(salary))) return
    setProfile({
      name: name.trim() || 'Użytkownik',
      salary: Number(salary),
      currency: 'PLN',
      setupDone: true,
    })
  }

  return (
    <div className={styles.page}>
      <div className={styles.glow} />

      {step === 0 && (
        <div className={styles.slide} key="step0">
          <div className={styles.iconWrap}>
            <img src="/logo.png" alt="Lucent" className={styles.bigIcon} />
          </div>
          <h1 className={styles.title}>Lucent</h1>
          <p className={styles.subtitle}>
            Dowiedz się, gdzie naprawdę znikają Twoje pieniądze. Inteligentna analiza wydatków z AI.
          </p>
          <button className={styles.primaryBtn} onClick={() => setStep(1)}>
            Zaczynamy
          </button>
        </div>
      )}

      {step === 1 && (
        <div className={styles.slide} key="step1">
          <h2 className={styles.stepTitle}>Jak masz na imię?</h2>
          <p className={styles.stepSub}>Opcjonalne — możesz pominąć</p>
          <input
            className={styles.input}
            type="text"
            placeholder="Twoje imię"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <button className={styles.primaryBtn} onClick={() => setStep(2)}>
            {name.trim() ? 'Dalej' : 'Pomiń'}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className={styles.slide} key="step2">
          <h2 className={styles.stepTitle}>Twoje wynagrodzenie netto</h2>
          <p className={styles.stepSub}>Miesięczna kwota "na rękę" w PLN</p>
          <div className={styles.salaryWrap}>
            <input
              className={styles.salaryInput}
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              autoFocus
            />
            <span className={styles.currency}>PLN</span>
          </div>
          <button
            className={styles.primaryBtn}
            onClick={handleFinish}
            disabled={!salary || isNaN(Number(salary)) || Number(salary) <= 0}
          >
            Zacznij śledzić
          </button>
        </div>
      )}

      <div className={styles.dots}>
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${styles.dot} ${step === i ? styles.dotActive : ''}`} />
        ))}
      </div>
    </div>
  )
}
