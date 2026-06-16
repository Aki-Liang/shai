import { describe, it, expect } from 'vitest'
import { hexagramKey } from './hexagram-key'

describe('hexagramKey', () => {
  it('自下而上，阳=1 阴=0', () => {
    const tai = [
      { yinyang: 'yang' }, { yinyang: 'yang' }, { yinyang: 'yang' },
      { yinyang: 'yin' }, { yinyang: 'yin' }, { yinyang: 'yin' },
    ] as const
    expect(hexagramKey(tai)).toBe('111000')
  })
})
