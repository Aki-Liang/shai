import { describe, it, expect } from 'vitest'
import { sequenceRandom } from './random'
import { buildReading } from './reading'
import { interpret } from './interpret'

describe('interpret（一期：本地原文）', () => {
  it('有动爻 → 展示对应动爻爻辞', async () => {
    const r = buildReading('问', sequenceRandom([1, 1, 1]))
    const out = await interpret(r)
    expect(out.primaryName).toContain('乾为天')
    expect(out.changedName).toContain('坤为地')
    expect(out.judgment).toContain('元，亨，利，贞')
    expect(out.movingLineTexts).toHaveLength(6)
    expect(out.movingLineTexts[0]).toEqual({ index: 0, text: expect.stringContaining('潜龙勿用') })
  })

  it('无动爻 → 看本卦卦辞，movingLineTexts 为空', async () => {
    const r = buildReading('问', sequenceRandom([0, 0, 1]))
    const out = await interpret(r)
    expect(out.movingLineTexts).toEqual([])
    expect(out.judgment.length).toBeGreaterThan(0)
  })
})
