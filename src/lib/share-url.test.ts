import { describe, it, expect, beforeEach } from 'vitest'
import { buildShareUrl, readShareParam } from './share-url'

describe('share-url', () => {
  beforeEach(() => { window.location.hash = '' })

  it('buildShareUrl 拼出 origin + BASE_URL + #s=', () => {
    const url = buildShareUrl('ABC')
    expect(url).toBe(`${location.origin}${import.meta.env.BASE_URL}#s=ABC`)
    expect(url).toContain('#s=ABC')
  })
  it('readShareParam 从 #s=xyz123 取 xyz123', () => {
    window.location.hash = '#s=xyz123'
    expect(readShareParam()).toBe('xyz123')
  })
  it('无 s 参数 / 空 hash → null', () => {
    window.location.hash = '#other=1'
    expect(readShareParam()).toBeNull()
    window.location.hash = ''
    expect(readShareParam()).toBeNull()
  })
  it('值含 = 不被截断', () => {
    window.location.hash = '#s=ab==cd'
    expect(readShareParam()).toBe('ab==cd')
  })
})
