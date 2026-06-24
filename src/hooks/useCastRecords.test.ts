import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCastRecords } from './useCastRecords'
import { CastRecord } from '../domain/cast-record'

const rec = (id: string): CastRecord => ({
  id, createdAt: 1, question: '问', mode: 'cyber',
  lines: Array.from({ length: 6 }, () => ({ yinyang: 'yang' as const, moving: false })),
})

describe('useCastRecords', () => {
  it('初始为空', () => {
    const { result } = renderHook(() => useCastRecords())
    expect(result.current.records).toEqual([])
  })
  it('add 后 records 含新记录（头部），remove 删除，clear 清空', () => {
    const { result } = renderHook(() => useCastRecords())
    act(() => result.current.add(rec('a')))
    act(() => result.current.add(rec('b')))
    expect(result.current.records.map((r) => r.id)).toEqual(['b', 'a'])
    act(() => result.current.remove('a'))
    expect(result.current.records.map((r) => r.id)).toEqual(['b'])
    act(() => result.current.clear())
    expect(result.current.records).toEqual([])
  })
  it('挂载时从 localStorage 读已有记录', () => {
    const first = renderHook(() => useCastRecords())
    act(() => first.result.current.add(rec('x')))
    const second = renderHook(() => useCastRecords()) // 新挂载，应读到持久化的 x
    expect(second.result.current.records.map((r) => r.id)).toEqual(['x'])
  })
})
