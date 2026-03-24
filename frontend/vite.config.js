import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 🔓 ALLOWS VITE TO READ "CLIENT_KEY" FROM VERCEL
  envPrefix: ['VITE_', 'CLIENT_'], 
})
