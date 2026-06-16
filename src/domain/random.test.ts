import { describe, it, expect } from 'vitest'
import { sequenceRandom, cryptoRandom } from './random'

describe('sequenceRandom（测试用 mock）', () => {
  it('按给定序列返回，循环复用', () => {
    const rng = sequenceRandom([0, 1, 0])
    expect(rng.nextInt(2)).toBe(0)
    expect(rng.nextInt(2)).toBe(1)
    expect(rng.nextInt(2)).toBe(0)
    expect(rng.nextInt(2)).toBe(0) // 循环回头
  })
})

describe('cryptoRandom', () => {
  it('nextInt 落在 [0, max)', () => {
    for (let i = 0; i < 200; i++) {
      const v = cryptoRandom.nextInt(2)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(2)
    }
  })
})
