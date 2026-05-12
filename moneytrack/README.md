# 💰 MoneyTrack

Inteligentna aplikacja webowa do śledzenia wydatków z AI asystentem, inspirowana stylem Apple.

## ✨ Funkcje

- **Dashboard** — przegląd finansów na żywo, wskaźnik oszczędności
- **Wydatki** — ręczne dodawanie, wyszukiwanie, filtrowanie po kategorii
- **Skanowanie paragonów** — AI (Claude) analizuje zdjęcie paragonu i wypełnia dane automatycznie
- **Płatności cykliczne** — czynsz, kredyty, subskrypcje z przeliczeniem na miesiąc/rok
- **Analiza** — wykresy kołowe, trendy 6-miesięczne, podział budżetu (Recharts)
- **AI Asystent** — chat z Claude, który zna Twoje finanse i daje spersonalizowane porady
- **PWA** — działa jak natywna aplikacja na telefonie (Add to Home Screen)

## 🚀 Uruchomienie

### 1. Instalacja

```bash
npm install
```

### 2. Konfiguracja API

Aplikacja korzysta z API Anthropic (Claude) do:
- Skanowania paragonów (OCR + kategoryzacja)
- AI asystenta finansowego

#### Opcja A — Serwer proxy (zalecane dla produkcji)

Utwórz plik `.env`:
```
VITE_ANTHROPIC_API_URL=https://twoj-serwer.com/api/claude
```

Utwórz prosty serwer proxy (np. w Node.js/Express):
```js
// server.js
import express from 'express'
import fetch from 'node-fetch'

const app = express()
app.use(express.json({ limit: '10mb' }))

app.post('/api/claude', async (req, res) => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(req.body),
  })
  const data = await response.json()
  res.json(data)
})

app.listen(3001)
```

#### Opcja B — Bezpośrednio z przeglądarki (tylko dev/localhost)

Plik `src/services/ai.js` jest skonfigurowany do bezpośrednich wywołań API.  
**Uwaga:** Nigdy nie umieszczaj klucza API bezpośrednio w kodzie frontendowym na produkcji.

### 3. Start

```bash
npm run dev
```

Otwórz `http://localhost:3000` na telefonie lub w trybie mobile DevTools.

### 4. Build produkcyjny

```bash
npm run build
npm run preview
```

## 📱 Instalacja jako PWA

1. Otwórz stronę na telefonie (iPhone/Android)
2. Safari/Chrome → "Dodaj do ekranu głównego"
3. Aplikacja działa jak natywna

## 🗂️ Struktura projektu

```
moneytrack/
├── src/
│   ├── pages/
│   │   ├── Setup.jsx          # Onboarding
│   │   ├── Dashboard.jsx      # Strona główna
│   │   ├── AddExpense.jsx     # Dodawanie wydatku + skan paragonu
│   │   ├── Expenses.jsx       # Lista wydatków
│   │   ├── Recurring.jsx      # Płatności cykliczne
│   │   ├── Analytics.jsx      # Wykresy i analiza
│   │   └── AIAssistant.jsx    # Chat z AI
│   ├── components/
│   │   └── layout/
│   │       └── Layout.jsx     # Tab bar + routing
│   ├── store/
│   │   └── useStore.js        # Zustand (persisted state)
│   ├── services/
│   │   └── ai.js              # Integracja z Claude API
│   ├── utils/
│   │   └── constants.js       # Kategorie, formatowanie
│   └── styles/
│       └── globals.css        # Apple HIG dark theme
├── public/
│   └── manifest.json          # PWA manifest
├── index.html
├── vite.config.js
└── package.json
```

## 🛠️ Technologie

- **React 18** + Vite
- **Zustand** — state management z localStorage persistence
- **Recharts** — wykresy
- **React Router** — nawigacja
- **Claude API** (Anthropic) — AI asystent + OCR paragonów
- **CSS Modules** — stylowanie Apple HIG dark

## 💡 Wskazówki

- Wszystkie dane są zapisywane lokalnie w przeglądarce (localStorage)
- Skanowanie paragonów wymaga aparatu i klucza API Anthropic
- AI asystent zna Twoje aktualne dane finansowe i odpowiada po polsku
- Aplikacja działa wyłącznie w trybie pionowym (portrait)
