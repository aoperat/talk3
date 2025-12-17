import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 로컬 개발: /, 프로덕션(GitHub Pages): /talk3/
  base: process.env.NODE_ENV === 'production' ? '/talk3/' : '/',
})

