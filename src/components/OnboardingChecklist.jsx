import React from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './OnboardingChecklist.module.css'

export default function OnboardingChecklist({ hasSalary, hasExpense, hasGoal }) {
  const navigate = useNavigate()
  const steps = [
    {
      done: hasSalary,
      label: 'Wpisz wypłatę tego miesiąca',
      hint: 'Potrzebne do obliczenia budżetu',
      action: null,
    },
    {
      done: hasExpense,
      label: 'Dodaj pierwszy wydatek',
      hint: 'Ręcznie lub importem z banku',
      action: () => navigate('/add-expense'),
    },
    {
      done: hasGoal,
      label: 'Ustaw cel oszczędnościowy',
      hint: 'Wakacje, sprzęt, poduszka finansowa',
      action: () => navigate('/goals'),
    },
  ]

  const doneCount = steps.filter(s => s.done).length

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <p className={styles.title}>Pierwsze kroki</p>
        <p className={styles.counter}>{doneCount} / {steps.length}</p>
      </div>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>
      <div className={styles.steps}>
        {steps.map((step, i) => (
          <div
            key={i}
            className={`${styles.step} ${step.done ? styles.stepDone : ''} ${!step.done && step.action ? styles.stepClickable : ''}`}
            onClick={!step.done && step.action ? step.action : undefined}
          >
            <div className={styles.check}>
              {step.done
                ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                : <span className={styles.dot} />
              }
            </div>
            <div className={styles.stepText}>
              <p className={styles.stepLabel}>{step.label}</p>
              {!step.done && <p className={styles.stepHint}>{step.hint}</p>}
            </div>
            {!step.done && step.action && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={styles.arrow}>
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
