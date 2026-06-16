import { describe, it, expect } from 'vitest'
import { zhiWuxing, generates, controls } from './wuxing'

describe('wuxing', () => {
  it('地支五行', () => {
    expect(zhiWuxing('子')).toBe('水')
    expect(zhiWuxing('午')).toBe('火')
    expect(zhiWuxing('酉')).toBe('金')
    expect(zhiWuxing('寅')).toBe('木')
    expect(zhiWuxing('辰')).toBe('土')
  })
  it('相生：木火土金水循环', () => {
    expect(generates('木', '火')).toBe(true)
    expect(generates('金', '水')).toBe(true)
    expect(generates('火', '木')).toBe(false)
  })
  it('相克：木土水火金循环', () => {
    expect(controls('木', '土')).toBe(true)
    expect(controls('火', '金')).toBe(true)
    expect(controls('金', '木')).toBe(true)
    expect(controls('土', '木')).toBe(false)
  })
})
