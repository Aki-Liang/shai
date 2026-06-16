import { describe, it, expect } from 'vitest'
import { sequenceRandom } from './random'
import { buildReading } from './reading'

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
