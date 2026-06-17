import { describe, it, expect } from 'vitest'
import { wangshuaiReasonOf } from './wangshuai-reason'

// 午（火）月
describe('wangshuaiReasonOf（午月）', () => {
  it('旺 → 当令', () => expect(wangshuaiReasonOf('巳', '午')).toBe('当令'))
  it('相 → 月生', () => expect(wangshuaiReasonOf('未', '午')).toBe('午火生未土'))
  it('休 → 生月泄气', () => expect(wangshuaiReasonOf('寅', '午')).toBe('寅木生午火泄气'))
  it('囚 → 克月受制', () => expect(wangshuaiReasonOf('子', '午')).toBe('子水克午火受制'))
  it('死 → 月克', () => expect(wangshuaiReasonOf('申', '午')).toBe('午火克申金'))
})
