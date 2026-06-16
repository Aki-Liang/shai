import { describe, it, expect } from 'vitest'
import { sequenceRandom } from './random'
import { tossCoin, tossThrow, castHexagram, changedHexagram, movingLineIndexes } from './casting'
import { Hexagram } from './types'

describe('tossCoin', () => {
  it('0→字(2)，1→背(3)', () => {
    expect(tossCoin(sequenceRandom([0]))).toBe(2)
    expect(tossCoin(sequenceRandom([1]))).toBe(3)
  })
})

describe('tossThrow', () => {
  it('三枚全字 → 6（老阴）', () => expect(tossThrow(sequenceRandom([0, 0, 0]))).toBe(6))
  it('两字一背 → 7', () => expect(tossThrow(sequenceRandom([0, 0, 1]))).toBe(7))
  it('三枚全背 → 9（老阳）', () => expect(tossThrow(sequenceRandom([1, 1, 1]))).toBe(9))
})

describe('castHexagram', () => {
  it('自下而上六爻；全字六掷 = 六个老阴', () => {
    const h = castHexagram(sequenceRandom([0, 0, 0]))
    expect(h).toHaveLength(6)
    h.forEach((l) => expect(l).toEqual({ yinyang: 'yin', moving: true }))
  })
})

describe('changedHexagram', () => {
  it('无动爻 → null', () => {
    const stable: Hexagram = Array.from({ length: 6 }, () => ({ yinyang: 'yang', moving: false })) as Hexagram
    expect(changedHexagram(stable)).toBeNull()
  })
  it('动爻翻面，且变卦各爻 moving=false', () => {
    const h: Hexagram = [
      { yinyang: 'yin', moving: true },
      { yinyang: 'yang', moving: false },
      { yinyang: 'yang', moving: true },
      { yinyang: 'yin', moving: false },
      { yinyang: 'yang', moving: false },
      { yinyang: 'yin', moving: false },
    ]
    const c = changedHexagram(h)!
    expect(c[0]).toEqual({ yinyang: 'yang', moving: false })
    expect(c[2]).toEqual({ yinyang: 'yin', moving: false })
    expect(c[1]).toEqual({ yinyang: 'yang', moving: false })
  })
})

describe('movingLineIndexes', () => {
  it('返回动爻下标', () => {
    const h: Hexagram = [
      { yinyang: 'yin', moving: true },
      { yinyang: 'yang', moving: false },
      { yinyang: 'yang', moving: true },
      { yinyang: 'yin', moving: false },
      { yinyang: 'yang', moving: false },
      { yinyang: 'yin', moving: false },
    ]
    expect(movingLineIndexes(h)).toEqual([0, 2])
  })
})
