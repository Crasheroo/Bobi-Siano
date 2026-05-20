# Lucent — Personal Finance Tracker

A privacy-first personal finance PWA built for the Polish market. Track expenses, recurring payments, and savings goals — with optional cloud sync across devices.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white&labelColor=20232a)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white&labelColor=1a1a2e)
![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20Sync-3ECF8E?logo=supabase&logoColor=white&labelColor=1a1a2e)
![PWA](https://img.shields.io/badge/PWA-Installable-5A0FC8?logo=pwa&logoColor=white&labelColor=1a1a2e)

---

## Features

**Expense tracking**
- Add, edit and delete expenses with category, description and date
- Custom categories with custom icon and color
- CSV import from mBank, PKO BP, ING and generic semicolon-delimited exports
- OCR receipt scanning via Tesseract.js — fully local, no image ever leaves your device.

**Budget & planning**
- Per-category monthly budgets with visual progress
- Recurring payments (monthly, weekly, yearly) with active/paused toggle
- Savings goals with target amount, deadline and contribution tracking
- Monthly salary overrides for irregular income

**Analytics**
- 6-month spending trend
- Category breakdown with donut chart
- Monthly history with navigator and spending insights
- Budget vs. actual comparison

**Multi-device sync**
- Google and email/password sign-in via Supabase Auth
- All financial data synced to Supabase Postgres with Row Level Security
- Automatic sync with 5 s debounce and 3-attempt retry on failure
- Data is cleared from localStorage on sign-out

**Other**
- Polish / English UI toggle
- Dark and light theme
- Accent color picker
- Fully installable as a PWA (Android, iOS, desktop)
- Works offline after first load (Service Worker)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React 18, React Router v6, CSS Modules |
| State | Zustand with localStorage persistence |
| Backend / Auth | Supabase (Postgres + Auth) |
| Charts | Recharts |
| Animations | Framer Motion |
| OCR | Tesseract.js (runs in-browser) |
| Build | Vite 5 with manual chunk splitting |
| Deployment | GitHub Pages via GitHub Actions |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

### 1. Clone and install

```bash
git clone https://github.com/Crasheroo/Lucent.git
cd Lucent
npm install
```

### 2. Set up Supabase

Run the migration in your Supabase project (SQL editor or CLI):

```bash
# Using Supabase CLI
supabase db push

# Or paste the contents of supabase/migrations/001_schema.sql
# into your project's SQL editor
```

The migration creates a `user_data` table with Row Level Security enabled — each user can only read and write their own rows.

To enable Google sign-in: go to your Supabase project → **Authentication → Providers → Google** and follow the setup guide.

### 3. Configure environment variables

Create a `.env.local` file in the project root (UTF-8 encoding):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Both values are found in your Supabase project under **Settings → API**.

> The app works without these variables — it falls back to local-only mode with no sync.

### 4. Run locally

```bash
npm run dev
```

App is available at `http://localhost:3000`.

---

## Deployment

The project deploys automatically to GitHub Pages on every push to `main` via GitHub Actions.

### Required secrets

Add these in your GitHub repo under **Settings → Secrets and variables → Actions**:

| Secret | Value |
|--------|-------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key |

### Manual deploy

```bash
npm run build   # outputs to dist/
```

Upload the `dist/` folder to any static host.

---

## Project Structure

```
src/
├── components/
│   ├── layout/          # Layout, navigation (sidebar + tab bar)
│   └── ErrorBoundary    # Top-level error boundary
├── hooks/
│   ├── useTranslation   # PL/EN i18n hook
│   └── useFormatCurrency
├── pages/               # Route-level components (all lazy-loaded)
│   ├── Dashboard
│   ├── Expenses
│   ├── AddExpense
│   ├── Analytics
│   ├── Budgets
│   ├── Goals
│   ├── Recurring
│   ├── Import           # CSV bank import
│   ├── StatementAnalysis # OCR receipt scanning
│   ├── MonthlyHistory
│   ├── Settings
│   ├── Setup            # First-run onboarding
│   └── Privacy
├── services/
│   ├── supabase.js      # Supabase client + isSupabaseConfigured flag
│   ├── supabaseSync.js  # upload / download / validate cloud data
│   ├── bankParser.js    # CSV parsers (mBank, PKO BP, ING, generic)
│   ├── ocr.js           # Tesseract.js receipt scanner
│   └── insightsEngine.js
├── store/
│   └── useStore.js      # Zustand store (persisted to localStorage)
└── utils/
    ├── translations.js  # All PL + EN strings
    └── constants.js     # Categories, currencies, helpers

public/
├── sw.js                # Service Worker (network-first, cache fallback)
├── manifest.json        # PWA manifest
└── 404.html             # GitHub Pages SPA routing fix

supabase/
└── migrations/
    └── 001_schema.sql   # user_data table + RLS policies

cloudflare-worker/
└── worker.js            # Optional Anthropic API proxy
```

---

## Data & Privacy

- All financial data is stored in your browser's `localStorage` by default.
- When signed in, data is synced to Supabase Postgres over HTTPS. Each user's row is protected by RLS — no one else can read or write your data.
- Receipt images processed by the OCR scanner are never stored or sent to any server. They are processed entirely in your browser and discarded after the scan.
- Signing out clears `localStorage` immediately.
- Deleting your account cascades to all your data in the database.

---

## License

MIT
