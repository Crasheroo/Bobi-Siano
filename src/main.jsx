import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swPath = import.meta.env.PROD ? '/Lucent/sw.js' : '/sw.js'
    navigator.serviceWorker.register(swPath).catch(() => {})
  })
}
