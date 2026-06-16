import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const domToPng = vi.fn(async () => 'data:image/png;base64,AAAA')
vi.mock('modern-screenshot', () => ({ domToPng: (...a: unknown[]) => domToPng(...a) }))

import { useShareImage } from './useShareImage'

beforeEach(() => {
  domToPng.mockClear()
  // @ts-expect-error 测试桩
  global.document.fonts = { ready: Promise.resolve() }
})

describe('useShareImage', () => {
  it('生成 PNG 并在不支持分享时返回 dataUrl（下载兜底）', async () => {
    Object.defineProperty(global.navigator, 'share', { value: undefined, configurable: true })
    const { result } = renderHook(() => useShareImage())
    const node = document.createElement('div')
    let url = ''
    await act(async () => { url = await result.current.capture(node) })
    expect(domToPng).toHaveBeenCalledTimes(1)
    expect(url).toContain('data:image/png')
  })
})
