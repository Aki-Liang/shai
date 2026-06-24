import { describe, it, expect, vi } from 'vitest'
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

describe('useCasting 起卦记录', () => {
  it('finishCasting 触发 onCast，mode=cyber 且 createdAt=注入时钟时刻', async () => {
    const onCast = vi.fn()
    const date = new Date('2026-06-16T12:00:00')
    const clock = fixedClock(date)
    const { result } = renderHook(() => useCasting(sequenceRandom([1, 1, 1]), clock, onCast))
    act(() => result.current.submit('问'))
    await act(async () => { await result.current.finishCasting() })
    expect(onCast).toHaveBeenCalledTimes(1)
    const r = onCast.mock.calls[0][0]
    expect(r.mode).toBe('cyber')
    expect(r.question).toBe('问')
    expect(r.lines).toHaveLength(6)
    expect(r.createdAt).toBe(date.getTime())
  })
  it('finishManual 触发 onCast，mode=manual', async () => {
    const onCast = vi.fn()
    const { result } = renderHook(() => useCasting(sequenceRandom([1, 1, 1]), fixedClock(new Date()), onCast))
    act(() => result.current.submit('问', 'manual'))
    const lines = Array.from({ length: 6 }, () => ({ yinyang: 'yang', moving: false }))
    await act(async () => { await result.current.finishManual(lines as never) })
    expect(onCast.mock.calls[0][0].mode).toBe('manual')
  })
  it('openHistory → phase=history；openRecord → 重建结果且 origin=history', async () => {
    const { result } = renderHook(() => useCasting())
    act(() => result.current.openHistory())
    expect(result.current.phase).toBe('history')
    const record = {
      id: 'a', createdAt: new Date('2026-06-16T12:00:00').getTime(), question: '旧问', mode: 'cyber' as const,
      lines: Array.from({ length: 6 }, () => ({ yinyang: 'yang' as const, moving: false })),
    }
    await act(async () => { await result.current.openRecord(record) })
    expect(result.current.phase).toBe('result')
    expect(result.current.origin).toBe('history')
    expect(result.current.reading?.question).toBe('旧问')
    expect(result.current.pan).not.toBeNull()
  })
})
