import React, { useEffect, useState } from 'react'
import styles from './UndoToast.module.css'

export default function UndoToast({ message, onUndo, onDismiss, duration = 4000 }) {
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    const start = Date.now()
    const tick = setInterval(() => {
      const elapsed = Date.now() - start
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(remaining)
      if (remaining === 0) {
        clearInterval(tick)
        onDismiss()
      }
    }, 30)
    return () => clearInterval(tick)
  }, [duration, onDismiss])

  return (
    <div className={styles.toast}>
      <div className={styles.progressBar} style={{ width: `${progress}%` }} />
      <span className={styles.message}>{message}</span>
      <button className={styles.undoBtn} onClick={onUndo}>Cofnij</button>
    </div>
  )
}
