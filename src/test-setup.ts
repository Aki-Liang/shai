import { afterEach } from 'vitest'
import '@testing-library/jest-dom'

// jsdom 不提供 document.execCommand，为兼容测试需要 mock
if (!document.execCommand) {
  document.execCommand = () => false
}

// 每个用例后清本地存储，避免起卦记录跨用例泄漏
afterEach(() => {
  localStorage.clear()
})
