import { describe, it, expect } from 'vitest'
import { lineFromSum } from './lines'

describe('lineFromSum', () => {
  it('6 → 老阴（阴，动）', () => expect(lineFromSum(6)).toEqual({ yinyang: 'yin', moving: true }))
  it('7 → 少阳（阳，静）', () => expect(lineFromSum(7)).toEqual({ yinyang: 'yang', moving: false }))
  it('8 → 少阴（阴，静）', () => expect(lineFromSum(8)).toEqual({ yinyang: 'yin', moving: false }))
  it('9 → 老阳（阳，动）', () => expect(lineFromSum(9)).toEqual({ yinyang: 'yang', moving: true }))
  it('非法和抛错', () => expect(() => lineFromSum(5)).toThrow())
})
