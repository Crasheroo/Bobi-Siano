import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const REPO_NAME = 'Bobi-Siano'

export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? `/${REPO_NAME}/` : '/',
  server: {
    port: 3000,
    host: true
  }
})
