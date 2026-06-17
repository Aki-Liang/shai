import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCasting } from './useCasting'
import { sequenceRandom } from '../domain/random'
import { fixedClock } from '../domain/clock'

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
  it('finishCasting 产出 pan（注入固定时钟）', async () => {
    const clock = fixedClock(new Date('2026-06-16T12:00:00'))
    const { result } = renderHook(() => useCasting(sequenceRandom([1, 1, 1]), clock))
    act(() => result.current.submit('问'))
    await act(async () => { await result.current.finishCasting() })
    expect(result.current.pan).not.toBeNull()
    expect(result.current.pan?.lines).toHaveLength(6)
    expect(result.current.pan?.pillars.day.length).toBe(2)
  })
  it('submit(manual) → manual；finishManual → result', async () => {
    const { result } = renderHook(() => useCasting(sequenceRandom([1, 1, 1])))
    act(() => result.current.submit('问', 'manual'))
    expect(result.current.phase).toBe('manual')
    const lines = Array.from({ length: 6 }, () => ({ yinyang: 'yang', moving: false }))
    await act(async () => { await result.current.finishManual(lines as never) })
    expect(result.current.phase).toBe('result')
    expect(result.current.interpretation?.primaryName).toContain('乾为天')
  })
})
