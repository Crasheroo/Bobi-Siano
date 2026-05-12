import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Zmień 'lucent' na nazwę swojego repozytorium na GitHubie
const REPO_NAME = 'lucent'

export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? `/${REPO_NAME}/` : '/',
  server: {
    port: 3000,
    host: true
  }
})
