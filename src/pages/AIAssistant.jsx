import React, { useState, useRef, useEffect } from 'react'
import useStore from '../store/useStore.js'
import { callClaude, buildFinancialContext } from '../services/ai.js'
import styles from './AIAssistant.module.css'

const QUICK_PROMPTS = [
  'Gdzie znikają moje pieniądze?',
  'Na czym mogę zaoszczędzić?',
  'Jak zwiększyć moje oszczędności?',
  'Podsumuj moje wydatki',
  'Stwórz plan oszczędnościowy',
  'Które kategorie są najdroższe?',
]

const SYSTEM_PROMPT = `Jesteś AI asystentem finansowym w aplikacji Lucent. Pomagasz użytkownikowi analizować wydatki, znajdować sposoby na oszczędzanie i zarządzać budżetem. Rozmawiasz po polsku. Jesteś konkretny, pomocny i motywujący. Używaj danych finansowych użytkownika do personalizowanych porad. Formatuj odpowiedzi czytelnie — używaj emoji i krótkich akapitów. Nie przekraczaj 250 słów na odpowiedź.`

export default function AIAssistant() {
  const store = useStore()
  const { profile } = store
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Cześć${profile.name ? `, ${profile.name}` : ''}! 👋 Jestem Twoim AI asystentem finansowym.\n\nMogę pomóc Ci:\n• Zidentyfikować gdzie tracisz pieniądze 💸\n• Zaplanować oszczędności 🎯\n• Przeanalizować Twoje wydatki 📊\n• Dać konkretne porady budżetowe 💡\n\nO co chcesz się zapytać?`,
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text) => {
    const userText = text || input.trim()
    if (!userText || loading) return

    setInput('')
    const userMessage = { role: 'user', content: userText }
    setMessages((prev) => [...prev, userMessage])
    setLoading(true)

    try {
      const financialContext = buildFinancialContext(store)
      const systemWithContext = SYSTEM_PROMPT + '\n\n' + financialContext

      const history = [...messages, userMessage]
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role, content: m.content }))

      const response = await callClaude(history, systemWithContext)
      setMessages((prev) => [...prev, { role: 'assistant', content: response }])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '⚠️ Błąd połączenia z AI. Sprawdź czy klucz API Anthropic jest skonfigurowany poprawnie w ustawieniach serwera.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.aiAvatar}>
          <span>✦</span>
        </div>
        <div>
          <h1 className={styles.title}>AI Asystent</h1>
          <p className={styles.subtitle}>Powered by Claude</p>
        </div>
      </div>

      <div className={styles.messages}>
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`${styles.bubble} ${msg.role === 'user' ? styles.bubbleUser : styles.bubbleAI}`}
          >
            {msg.role === 'assistant' && (
              <div className={styles.aiDot}>✦</div>
            )}
            <div className={styles.bubbleContent}>
              {msg.content.split('\n').map((line, li) => (
                <React.Fragment key={li}>
                  {line}
                  {li < msg.content.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}

        {loading && (
          <div className={`${styles.bubble} ${styles.bubbleAI}`}>
            <div className={styles.aiDot}>✦</div>
            <div className={styles.typing}>
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {messages.length <= 1 && !loading && (
        <div className={styles.quickPrompts}>
          {QUICK_PROMPTS.map((p, i) => (
            <button key={i} className={styles.quickBtn} onClick={() => sendMessage(p)}>
              {p}
            </button>
          ))}
        </div>
      )}

      <div className={styles.inputBar}>
        <textarea
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Zapytaj o swoje finanse..."
          rows={1}
          disabled={loading}
        />
        <button
          className={styles.sendBtn}
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
