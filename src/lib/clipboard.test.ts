import { describe, it, expect, vi, afterEach } from 'vitest'
import { copyText } from './clipboard'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('copyText', () => {
  it('clipboard API 成功 → true', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    expect(await copyText('hi')).toBe(true)
    expect(writeText).toHaveBeenCalledWith('hi')
  })
  it('clipboard 抛错 → execCommand 兜底 true', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('no')) } })
    const exec = vi.spyOn(document, 'execCommand').mockReturnValue(true)
    expect(await copyText('hi')).toBe(true)
    expect(exec).toHaveBeenCalledWith('copy')
  })
  it('两者都失败 → false', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('no')) } })
    vi.spyOn(document, 'execCommand').mockReturnValue(false)
    expect(await copyText('hi')).toBe(false)
  })
})
