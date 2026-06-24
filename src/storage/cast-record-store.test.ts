import { describe, it, expect } from 'vitest'
import {
  STORAGE_KEY, MAX_RECORDS, KeyValueStore,
  loadRecords, addRecord, removeRecord, clearRecords, newId,
} from './cast-record-store'
import { CastRecord } from '../domain/cast-record'

const fakeStore = (init: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } => {
  const data: Record<string, string> = { ...init }
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v } }
}

const rec = (id: string, createdAt: number): CastRecord => ({
  id, createdAt, question: '问', mode: 'cyber',
  lines: Array.from({ length: 6 }, () => ({ yinyang: 'yang' as const, moving: false })),
})

describe('cast-record-store', () => {
  it('空存储 → load 返回 []', () => {
    expect(loadRecords(fakeStore())).toEqual([])
  })
  it('add 把新记录放数组头部并持久化信封', () => {
    const s = fakeStore()
    addRecord(rec('a', 1), s)
    const after = addRecord(rec('b', 2), s)
    expect(after.map((r) => r.id)).toEqual(['b', 'a'])
    expect(JSON.parse(s.data[STORAGE_KEY])).toEqual({ version: 1, records: after })
  })
  it('add 超上限丢最旧', () => {
    const s = fakeStore()
    for (let i = 0; i < MAX_RECORDS + 5; i++) addRecord(rec(`id-${i}`, i), s)
    const all = loadRecords(s)
    expect(all).toHaveLength(MAX_RECORDS)
    expect(all[0].id).toBe(`id-${MAX_RECORDS + 4}`) // 最新在头
    expect(all.some((r) => r.id === 'id-0')).toBe(false) // 最旧被丢
  })
  it('remove 按 id 删除', () => {
    const s = fakeStore()
    addRecord(rec('a', 1), s)
    addRecord(rec('b', 2), s)
    expect(removeRecord('a', s).map((r) => r.id)).toEqual(['b'])
  })
  it('clear 清空', () => {
    const s = fakeStore()
    addRecord(rec('a', 1), s)
    clearRecords(s)
    expect(loadRecords(s)).toEqual([])
  })
  it('损坏 JSON / 版本不符 / 混入非法条目 → 降级', () => {
    expect(loadRecords(fakeStore({ [STORAGE_KEY]: '{不是 json' }))).toEqual([])
    expect(loadRecords(fakeStore({ [STORAGE_KEY]: JSON.stringify({ version: 9, records: [] }) }))).toEqual([])
    const mixed = JSON.stringify({ version: 1, records: [rec('ok', 1), { id: 'bad' }] })
    expect(loadRecords(fakeStore({ [STORAGE_KEY]: mixed })).map((r) => r.id)).toEqual(['ok'])
  })
  it('setItem 抛错（配额满/隐私模式）→ 不崩', () => {
    const throwing: KeyValueStore = { getItem: () => null, setItem: () => { throw new Error('quota') } }
    expect(() => addRecord(rec('a', 1), throwing)).not.toThrow()
  })
  it('newId 多次调用唯一且为字符串', () => {
    const a = newId()
    const b = newId()
    expect(typeof a).toBe('string')
    expect(a).not.toBe(b)
  })
})
