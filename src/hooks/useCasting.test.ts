import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCasting } from './useCasting'
import { sequenceRandom } from '../domain/random'

describe('useCasting 状态机', () => {
  it('初始为 input', () => {
    const { result } = renderHook(() => useCasting(sequenceRandom([1, 1, 1])))
    expect(result.current.phase).toBe('input')
  })
  it('submit → casting；finishCasting → result，并产出解读', async () => {
    const { result } = renderHook(() => useCasting(sequenceRandom([1, 1, 1])))
    act(() => result.current.submit('我该换工作吗？'))
    expect(result.current.phase).toBe('casting')
    await act(async () => { await result.current.finishCasting() })
    expect(result.current.phase).toBe('result')
    expect(result.current.interpretation?.primaryName).toContain('乾为天')
    expect(result.current.reading?.question).toBe('我该换工作吗？')
  })
})
