import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Zmień 'moneytrack' na nazwę swojego repozytorium na GitHubie
const REPO_NAME = 'Bobi-Siano'

export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? `/${REPO_NAME}/` : '/',
  server: {
    port: 3000,
    host: true
  }
})