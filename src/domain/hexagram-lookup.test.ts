import { describe, it, expect } from 'vitest'
import { lookupHexagram } from './hexagram-lookup'
import { Hexagram } from './types'

const linesOf = (bits: string): Hexagram =>
  bits.split('').map((b) => ({ yinyang: b === '1' ? 'yang' : 'yin', moving: false })) as Hexagram

describe('lookupHexagram', () => {
  it('111111 → 乾为天', () => expect(lookupHexagram(linesOf('111111')).name).toContain('乾为天'))
  it('111000 → 泰', () => expect(lookupHexagram(linesOf('111000')).name).toContain('泰'))
  it('全部 64 键均可命中', () => {
    for (let n = 0; n < 64; n++) {
      const bits = n.toString(2).padStart(6, '0')
      expect(() => lookupHexagram(linesOf(bits))).not.toThrow()
    }
  })
})
