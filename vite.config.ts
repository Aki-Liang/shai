import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Project Pages 子路径，须等于仓库名（当前仓库 Aki-Liang/shai）
export default defineConfig({
  base: '/shai/',
  plugins: [react()],
})
