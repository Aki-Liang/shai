import { describe, it, expect } from 'vitest'
import { sequenceRandom } from './random'
import { buildReading, buildReadingFromHexagram } from './reading'
import { Hexagram } from './types'

describe('buildReading', () => {
  it('全背六掷 → 本卦乾为天，六动爻，变卦坤为地', () => {
    const r = buildReading('我该换工作吗？', sequenceRandom([1, 1, 1]))
    expect(r.question).toBe('我该换工作吗？')
    expect(r.primary.data.name).toContain('乾为天')
    expect(r.movingIndexes).toEqual([0, 1, 2, 3, 4, 5])
    expect(r.changed?.data.name).toContain('坤为地')
  })

  it('每掷=7（少阳）时无动爻，changed 为 null', () => {
    const r = buildReading('问', sequenceRandom([0, 0, 1]))
    expect(r.movingIndexes).toEqual([])
    expect(r.changed).toBeNull()
  })
})

describe('buildReadingFromHexagram', () => {
  it('六阳静 → 乾为天，无变卦', () => {
    const lines = [0, 0, 0, 0, 0, 0].map(() => ({ yinyang: 'yang', moving: false })) as unknown as Hexagram
    const r = buildReadingFromHexagram('问', lines)
    expect(r.primary.data.name).toContain('乾为天')
    expect(r.changed).toBeNull()
    expect(r.movingIndexes).toEqual([])
  })
  it('含动爻 → 有变卦与动爻下标', () => {
    const lines = [{ yinyang: 'yang', moving: true }, ...[0, 0, 0, 0, 0].map(() => ({ yinyang: 'yang', moving: false }))] as unknown as Hexagram
    const r = buildReadingFromHexagram('问', lines)
    expect(r.changed).not.toBeNull()
    expect(r.movingIndexes).toEqual([0])
  })
})
