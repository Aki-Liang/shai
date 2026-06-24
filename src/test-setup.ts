import { afterEach } from 'vitest'
import '@testing-library/jest-dom'

// 每个用例后清本地存储，避免起卦记录跨用例泄漏
afterEach(() => {
  localStorage.clear()
})
