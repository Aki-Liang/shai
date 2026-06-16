import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Project Pages 子路径；部署仓库名若变动，改这里
export default defineConfig({
  base: '/liuyao/',
  plugins: [react()],
})
