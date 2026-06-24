# 六爻 · 起卦记录（本地存储）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 每次起卦自动写一条记录到浏览器 localStorage，首页可进历史列表查看/重开/删除，记录只存最小字段靠确定性重算还原完整结果页。

**Architecture:** 沿用现有 DDD 分层与 phase 状态机。新增 `domain/cast-record.ts`（记录类型 + 校验 + 轻量摘要 + 重建）、`storage/cast-record-store.ts`（localStorage CRUD + 降级 + id 生成）、`hooks/useCastRecords.ts`（记录内存态）、`components/HistoryView.tsx`（列表页）；改 `useCasting`（新 phase `history`/`onCast` 回调/`openHistory`/`openRecord`/`origin`，完成起卦时只取一次 `clock.now()`）、`QuestionInput`（历史入口）、`App`（装配）。

**Tech Stack:** React 18 + TypeScript 5 + Vite；Vitest + @testing-library/react + userEvent（单元/组件，jsdom）；Playwright（E2E）。

## Global Constraints

- **immutable**：所有列表操作返回新数组，绝不原地改。
- **不信任本地数据**：localStorage 读出的内容必须逐条 `isCastRecord` 校验后才用。
- **降级不崩**：localStorage 不可用 / 配额满 / 数据损坏，一律 try/catch + `console.warn`，功能退化但不抛错。
- **纯逻辑与视图分离**：`domain/`、`storage/` 零 React 依赖；React 仅在 `hooks/`、`components/`、`App`。
- **存储 key**：`shai:cast-records:v1`；**信封**：`{ "version": 1, "records": CastRecord[] }`；**上限**：`MAX_RECORDS = 200`，超出丢最旧（新记录置于数组头部，`slice(0, 200)`）。
- **同一时刻**：完成起卦时 `const now = clock.now()` 只取一次，`buildPan(r, now)` 与记录 `createdAt = now.getTime()` 共用。
- **每文件 < 200 行**；每步 TDD（红 → 绿 → 提交）。
- 测试命令：单元/组件 `npm test`（或单文件 `npx vitest run <path>`）；E2E `npm run e2e`。覆盖率门槛 80%（`vitest.config.ts` 已配）。

## File Structure

新增：
```
src/domain/cast-record.ts          # CastRecord/CastSummary 类型 + isCastRecord + summarize + reconstruct
src/domain/cast-record.test.ts
src/storage/cast-record-store.ts   # KeyValueStore/STORAGE_KEY/MAX_RECORDS/load/add/remove/clear/newId + 降级
src/storage/cast-record-store.test.ts
src/hooks/useCastRecords.ts        # records 内存态 + add/remove/clear
src/hooks/useCastRecords.test.ts
src/components/HistoryView.tsx      # 历史列表页
src/components/HistoryView.test.tsx
```
改动：
```
src/hooks/useCasting.ts            # +phase 'history' / +onCast / +openHistory / +openRecord / +origin / now 取一次
src/components/QuestionInput.tsx   # +onOpenHistory 入口
src/App.tsx                        # 装配 useCastRecords + history 路由 + result 底部按 origin
src/test-setup.ts                  # afterEach 清 localStorage（测试隔离）
tests/e2e/divination.spec.ts       # +起卦记录路径
```

---

## Task 1: CastRecord 类型 + 校验 + 摘要

**Files:**
- Create: `src/domain/cast-record.ts`
- Test: `src/domain/cast-record.test.ts`

**Interfaces:**
- Consumes: `CastMode`, `Hexagram`, `Line`, `Yinyang` from `src/domain/types.ts`；`lookupHexagram` from `src/domain/hexagram-lookup.ts`；`changedHexagram`、`movingLineIndexes` from `src/domain/casting.ts`。
- Produces:
  - `interface CastRecord { id: string; createdAt: number; question: string; mode: CastMode; lines: Hexagram }`
  - `interface CastSummary { primaryName: string; changedName: string | null; movingCount: number }`
  - `function summarize(record: CastRecord): CastSummary`
  - `function isCastRecord(v: unknown): v is CastRecord`

- [ ] **Step 1: 写失败测试**

`src/domain/cast-record.test.ts`：

```ts
import { describe, it, expect } from 'vitest'
import { summarize, isCastRecord, CastRecord } from './cast-record'
import { Hexagram, Line } from './types'

const line = (yinyang: 'yin' | 'yang', moving = false): Line => ({ yinyang, moving })
const allYang: Hexagram = [line('yang'), line('yang'), line('yang'), line('yang'), line('yang'), line('yang')]
// 初爻老阳(动) 其余阳 → 本卦乾为天，有一动爻 → 变卦
const oneMoving: Hexagram = [line('yang', true), line('yang'), line('yang'), line('yang'), line('yang'), line('yang')]

const rec = (lines: Hexagram): CastRecord => ({ id: 'a', createdAt: 1, question: '问', mode: 'cyber', lines })

describe('summarize', () => {
  it('无动爻：本卦名有值、变卦 null、动爻数 0', () => {
    const s = summarize(rec(allYang))
    expect(s.primaryName).toContain('乾为天')
    expect(s.changedName).toBeNull()
    expect(s.movingCount).toBe(0)
  })
  it('有动爻：变卦名非空、动爻数 1', () => {
    const s = summarize(rec(oneMoving))
    expect(s.primaryName).toContain('乾为天')
    expect(s.changedName).not.toBeNull()
    expect(s.movingCount).toBe(1)
  })
})

describe('isCastRecord', () => {
  it('合法记录 → true', () => {
    expect(isCastRecord(rec(allYang))).toBe(true)
  })
  it('缺字段 / mode 非法 / lines 长度错 / null → false', () => {
    expect(isCastRecord(null)).toBe(false)
    expect(isCastRecord({ id: 'a', createdAt: 1, question: '问', mode: 'x', lines: allYang })).toBe(false)
    expect(isCastRecord({ id: 'a', createdAt: 1, question: '问', mode: 'cyber', lines: allYang.slice(0, 5) })).toBe(false)
    expect(isCastRecord({ id: 'a', createdAt: 'no', question: '问', mode: 'cyber', lines: allYang })).toBe(false)
    expect(isCastRecord({ id: 'a', createdAt: 1, question: '问', mode: 'cyber', lines: [1, 2, 3, 4, 5, 6] })).toBe(false)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/domain/cast-record.test.ts`
Expected: FAIL（`Failed to resolve import './cast-record'` 或 summarize/isCastRecord 未定义）

- [ ] **Step 3: 写最小实现**

`src/domain/cast-record.ts`：

```ts
import { CastMode, Hexagram } from './types'
import { lookupHexagram } from './hexagram-lookup'
import { changedHexagram, movingLineIndexes } from './casting'

export interface CastRecord {
  id: string
  createdAt: number
  question: string
  mode: CastMode
  lines: Hexagram
}

export interface CastSummary {
  primaryName: string
  changedName: string | null
  movingCount: number
}

export function summarize(record: CastRecord): CastSummary {
  const changed = changedHexagram(record.lines)
  return {
    primaryName: lookupHexagram(record.lines).name,
    changedName: changed ? lookupHexagram(changed).name : null,
    movingCount: movingLineIndexes(record.lines).length,
  }
}

export function isCastRecord(v: unknown): v is CastRecord {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  if (typeof r.id !== 'string') return false
  if (typeof r.createdAt !== 'number' || !Number.isFinite(r.createdAt)) return false
  if (typeof r.question !== 'string') return false
  if (r.mode !== 'cyber' && r.mode !== 'manual') return false
  if (!Array.isArray(r.lines) || r.lines.length !== 6) return false
  return r.lines.every((l) => {
    if (typeof l !== 'object' || l === null) return false
    const line = l as Record<string, unknown>
    return (line.yinyang === 'yin' || line.yinyang === 'yang') && typeof line.moving === 'boolean'
  })
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/domain/cast-record.test.ts`
Expected: PASS（5 个用例）

- [ ] **Step 5: 提交**

```bash
git add src/domain/cast-record.ts src/domain/cast-record.test.ts
git commit -m "feat: 起卦记录 CastRecord 类型 + isCastRecord 校验 + summarize 摘要"
```

---

## Task 2: reconstruct 重建完整结果

**Files:**
- Modify: `src/domain/cast-record.ts`（追加函数）
- Test: `src/domain/cast-record.test.ts`（追加用例）

**Interfaces:**
- Consumes: `buildReadingFromHexagram` from `src/domain/reading.ts`；`buildPan` from `src/domain/pan.ts`；`interpret` from `src/domain/interpret.ts`；`CastReading`、`Pan`、`Interpretation` 类型。
- Produces: `function reconstruct(record: CastRecord): Promise<{ reading: CastReading; pan: Pan; interpretation: Interpretation }>`

- [ ] **Step 1: 写失败测试**（追加到 `src/domain/cast-record.test.ts`）

```ts
import { reconstruct } from './cast-record'

describe('reconstruct', () => {
  it('用 lines+createdAt 重建出 reading/pan/interpretation', async () => {
    const record: CastRecord = {
      id: 'a',
      createdAt: new Date('2026-06-16T12:00:00').getTime(),
      question: '我该换工作吗？',
      mode: 'cyber',
      lines: [
        { yinyang: 'yang', moving: false }, { yinyang: 'yang', moving: false },
        { yinyang: 'yang', moving: false }, { yinyang: 'yang', moving: false },
        { yinyang: 'yang', moving: false }, { yinyang: 'yang', moving: false },
      ],
    }
    const { reading, pan, interpretation } = await reconstruct(record)
    expect(reading.question).toBe('我该换工作吗？')
    expect(interpretation.primaryName).toContain('乾为天')
    expect(pan.lines).toHaveLength(6)
    // createdAt 决定干支时间层（六月例日柱两字）
    expect(pan.pillars?.day.length).toBe(2)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/domain/cast-record.test.ts`
Expected: FAIL（`reconstruct is not a function` / import 解析失败）

- [ ] **Step 3: 写最小实现**（追加到 `src/domain/cast-record.ts`）

文件顶部追加 import：

```ts
import { buildReadingFromHexagram, CastReading } from './reading'
import { buildPan, Pan } from './pan'
import { interpret, Interpretation } from './interpret'
```

文件末尾追加：

```ts
export async function reconstruct(
  record: CastRecord,
): Promise<{ reading: CastReading; pan: Pan; interpretation: Interpretation }> {
  const reading = buildReadingFromHexagram(record.question, record.lines)
  const pan = buildPan(reading, new Date(record.createdAt))
  const interpretation = await interpret(reading)
  return { reading, pan, interpretation }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/domain/cast-record.test.ts`
Expected: PASS（6 个用例全绿）

- [ ] **Step 5: 提交**

```bash
git add src/domain/cast-record.ts src/domain/cast-record.test.ts
git commit -m "feat: reconstruct 由记录确定性重建 reading/pan/interpretation"
```

---

## Task 3: localStorage 存储层 cast-record-store

**Files:**
- Create: `src/storage/cast-record-store.ts`
- Test: `src/storage/cast-record-store.test.ts`

**Interfaces:**
- Consumes: `CastRecord`、`isCastRecord` from `src/domain/cast-record.ts`。
- Produces:
  - `const STORAGE_KEY = 'shai:cast-records:v1'`、`const MAX_RECORDS = 200`
  - `interface KeyValueStore { getItem(key: string): string | null; setItem(key: string, value: string): void }`
  - `function loadRecords(store?: KeyValueStore): CastRecord[]`
  - `function addRecord(record: CastRecord, store?: KeyValueStore): CastRecord[]`（新记录置头部）
  - `function removeRecord(id: string, store?: KeyValueStore): CastRecord[]`
  - `function clearRecords(store?: KeyValueStore): void`
  - `function newId(): string`

- [ ] **Step 1: 写失败测试**

`src/storage/cast-record-store.test.ts`：

```ts
import { describe, it, expect, vi } from 'vitest'
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
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/storage/cast-record-store.test.ts`
Expected: FAIL（`Failed to resolve import './cast-record-store'`）

- [ ] **Step 3: 写最小实现**

`src/storage/cast-record-store.ts`：

```ts
import { CastRecord, isCastRecord } from '../domain/cast-record'

export const STORAGE_KEY = 'shai:cast-records:v1'
export const MAX_RECORDS = 200

export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** 进程内兜底（localStorage 不可用时用，本会话有效、刷新即失） */
const memoryStore: KeyValueStore = (() => {
  const m = new Map<string, string>()
  return { getItem: (k) => (m.has(k) ? (m.get(k) as string) : null), setItem: (k, v) => { m.set(k, v) } }
})()

function resolveDefaultStore(): KeyValueStore {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const probe = '__shai_probe__'
      window.localStorage.setItem(probe, '1')
      window.localStorage.removeItem(probe)
      return window.localStorage
    }
  } catch {
    // 隐私模式 setItem 抛错 → 用内存兜底
  }
  return memoryStore
}

const defaultStore: KeyValueStore = resolveDefaultStore()

function getStore(store?: KeyValueStore): KeyValueStore {
  return store ?? defaultStore
}

export function loadRecords(store?: KeyValueStore): CastRecord[] {
  const raw = getStore(store).getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== 'object' || parsed === null) return []
    const env = parsed as { version?: unknown; records?: unknown }
    if (env.version !== 1 || !Array.isArray(env.records)) {
      console.warn('[cast-record-store] 版本不符或结构异常，忽略本地记录')
      return []
    }
    return env.records.filter(isCastRecord)
  } catch (e) {
    console.warn('[cast-record-store] 本地记录解析失败，降级为空：', e)
    return []
  }
}

function persist(records: CastRecord[], store?: KeyValueStore): void {
  try {
    getStore(store).setItem(STORAGE_KEY, JSON.stringify({ version: 1, records }))
  } catch (e) {
    console.warn('[cast-record-store] 写入失败（可能配额满/隐私模式）：', e)
  }
}

export function addRecord(record: CastRecord, store?: KeyValueStore): CastRecord[] {
  const next = [record, ...loadRecords(store)].slice(0, MAX_RECORDS)
  persist(next, store)
  return next
}

export function removeRecord(id: string, store?: KeyValueStore): CastRecord[] {
  const next = loadRecords(store).filter((r) => r.id !== id)
  persist(next, store)
  return next
}

export function clearRecords(store?: KeyValueStore): void {
  persist([], store)
}

export function newId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
  if (c?.randomUUID) return c.randomUUID()
  return `r-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/storage/cast-record-store.test.ts`
Expected: PASS（8 个用例）

- [ ] **Step 5: 提交**

```bash
git add src/storage/cast-record-store.ts src/storage/cast-record-store.test.ts
git commit -m "feat: cast-record-store localStorage CRUD + 上限/降级/newId"
```

---

## Task 4: useCastRecords Hook + 测试隔离

**Files:**
- Create: `src/hooks/useCastRecords.ts`
- Test: `src/hooks/useCastRecords.test.ts`
- Modify: `src/test-setup.ts`（全局 afterEach 清 localStorage）

**Interfaces:**
- Consumes: `loadRecords`、`addRecord`、`removeRecord`、`clearRecords` from `src/storage/cast-record-store.ts`；`CastRecord` from `src/domain/cast-record.ts`。
- Produces: `function useCastRecords(): { records: CastRecord[]; add: (record: CastRecord) => void; remove: (id: string) => void; clear: () => void }`

- [ ] **Step 1: 改 test-setup 加隔离**

`src/test-setup.ts` 改为：

```ts
import '@testing-library/jest-dom'

// 每个用例后清本地存储，避免起卦记录跨用例泄漏
afterEach(() => {
  localStorage.clear()
})
```

- [ ] **Step 2: 写失败测试**

`src/hooks/useCastRecords.test.ts`：

```ts
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
```

- [ ] **Step 3: 跑测试确认失败**

Run: `npx vitest run src/hooks/useCastRecords.test.ts`
Expected: FAIL（`Failed to resolve import './useCastRecords'`）

- [ ] **Step 4: 写最小实现**

`src/hooks/useCastRecords.ts`：

```ts
import { useCallback, useState } from 'react'
import { CastRecord } from '../domain/cast-record'
import { loadRecords, addRecord, removeRecord, clearRecords } from '../storage/cast-record-store'

export function useCastRecords() {
  const [records, setRecords] = useState<CastRecord[]>(() => loadRecords())

  const add = useCallback((record: CastRecord) => {
    setRecords(addRecord(record))
  }, [])

  const remove = useCallback((id: string) => {
    setRecords(removeRecord(id))
  }, [])

  const clear = useCallback(() => {
    clearRecords()
    setRecords([])
  }, [])

  return { records, add, remove, clear }
}
```

- [ ] **Step 5: 跑测试确认通过**

Run: `npx vitest run src/hooks/useCastRecords.test.ts`
Expected: PASS（3 个用例）

- [ ] **Step 6: 提交**

```bash
git add src/hooks/useCastRecords.ts src/hooks/useCastRecords.test.ts src/test-setup.ts
git commit -m "feat: useCastRecords 记录内存态 + 测试隔离清 localStorage"
```

---

## Task 5: useCasting 接入记录（onCast / history / openRecord / origin）

**Files:**
- Modify: `src/hooks/useCasting.ts`（整体替换，见 Step 3）
- Test: `src/hooks/useCasting.test.ts`（追加用例）

**Interfaces:**
- Consumes: `CastRecord`、`reconstruct` from `src/domain/cast-record.ts`；`newId` from `src/storage/cast-record-store.ts`。
- Produces（在原返回值上新增）：`origin: 'cast' | 'history'`、`openHistory: () => void`、`openRecord: (record: CastRecord) => Promise<void>`；构造函数新增第三参 `onCast?: (record: CastRecord) => void`。完成起卦时回调 `onCast`，record 的 `createdAt` 等于 `buildPan` 所用时刻。

- [ ] **Step 1: 写失败测试**（追加到 `src/hooks/useCasting.test.ts`）

```ts
import { vi } from 'vitest'
import { reconstruct } from '../domain/cast-record'

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
```

（保留文件中已有的 4 个用例，仅追加上面这个 describe。同时确保顶部已 `import` 的 `renderHook/act/useCasting/sequenceRandom/fixedClock` 不重复声明。）

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/hooks/useCasting.test.ts`
Expected: FAIL（`openHistory is not a function` / useCasting 不接收第三参导致 onCast 未触发）

- [ ] **Step 3: 整体替换实现**

`src/hooks/useCasting.ts` 全文替换为：

```ts
import { useCallback, useState } from 'react'
import { RandomSource, cryptoRandom } from '../domain/random'
import { Clock, systemClock } from '../domain/clock'
import { buildReading, buildReadingFromHexagram, CastReading } from '../domain/reading'
import { buildPan, Pan } from '../domain/pan'
import { interpret, Interpretation } from '../domain/interpret'
import { CastMode, Hexagram } from '../domain/types'
import { CastRecord, reconstruct } from '../domain/cast-record'
import { newId } from '../storage/cast-record-store'

type Phase = 'input' | 'casting' | 'manual' | 'result' | 'history'
type Origin = 'cast' | 'history'

export function useCasting(
  rng: RandomSource = cryptoRandom,
  clock: Clock = systemClock,
  onCast?: (record: CastRecord) => void,
) {
  const [phase, setPhase] = useState<Phase>('input')
  const [origin, setOrigin] = useState<Origin>('cast')
  const [question, setQuestion] = useState('')
  const [reading, setReading] = useState<CastReading | null>(null)
  const [pan, setPan] = useState<Pan | null>(null)
  const [interpretation, setInterpretation] = useState<Interpretation | null>(null)

  const submit = useCallback((q: string, mode: CastMode = 'cyber') => {
    setQuestion(q)
    setOrigin('cast')
    setPhase(mode === 'manual' ? 'manual' : 'casting')
  }, [])

  const finishCasting = useCallback(async () => {
    const now = clock.now()
    const r = buildReading(question, rng)
    setReading(r)
    setPan(buildPan(r, now))
    setInterpretation(await interpret(r))
    onCast?.({ id: newId(), createdAt: now.getTime(), question, mode: 'cyber', lines: r.primary.lines })
    setPhase('result')
  }, [question, rng, clock, onCast])

  const finishManual = useCallback(async (primaryLines: Hexagram) => {
    const now = clock.now()
    const r = buildReadingFromHexagram(question, primaryLines)
    setReading(r)
    setPan(buildPan(r, now))
    setInterpretation(await interpret(r))
    onCast?.({ id: newId(), createdAt: now.getTime(), question, mode: 'manual', lines: r.primary.lines })
    setPhase('result')
  }, [question, clock, onCast])

  const openHistory = useCallback(() => setPhase('history'), [])

  const openRecord = useCallback(async (record: CastRecord) => {
    const rebuilt = await reconstruct(record)
    setQuestion(record.question)
    setReading(rebuilt.reading)
    setPan(rebuilt.pan)
    setInterpretation(rebuilt.interpretation)
    setOrigin('history')
    setPhase('result')
  }, [])

  const reset = useCallback(() => {
    setReading(null)
    setPan(null)
    setInterpretation(null)
    setQuestion('')
    setOrigin('cast')
    setPhase('input')
  }, [])

  return {
    phase, origin, reading, pan, interpretation,
    submit, finishCasting, finishManual, openHistory, openRecord, reset,
  }
}
```

- [ ] **Step 4: 跑测试确认通过（含原有用例回归）**

Run: `npx vitest run src/hooks/useCasting.test.ts`
Expected: PASS（原 4 + 新 3 = 7 个用例）

- [ ] **Step 5: 提交**

```bash
git add src/hooks/useCasting.ts src/hooks/useCasting.test.ts
git commit -m "feat: useCasting 接入起卦记录（onCast/openHistory/openRecord/origin）"
```

---

## Task 6: HistoryView 列表页

**Files:**
- Create: `src/components/HistoryView.tsx`
- Test: `src/components/HistoryView.test.tsx`

**Interfaces:**
- Consumes: `CastRecord`、`summarize` from `src/domain/cast-record.ts`。
- Produces: `function HistoryView(props: { records: CastRecord[]; onOpen: (record: CastRecord) => void; onDelete: (id: string) => void; onClear: () => void; onBack: () => void }): JSX.Element`
- testid：`history-view`、`history-empty`、`history-item`、`history-delete`、`history-clear`、`history-back`。

- [ ] **Step 1: 写失败测试**

`src/components/HistoryView.test.tsx`：

```ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HistoryView } from './HistoryView'
import { CastRecord } from '../domain/cast-record'

const rec = (id: string, question: string): CastRecord => ({
  id, createdAt: new Date('2026-06-16T12:34:00').getTime(), question, mode: 'cyber',
  lines: Array.from({ length: 6 }, () => ({ yinyang: 'yang' as const, moving: false })),
})

afterEach(() => vi.restoreAllMocks())

describe('HistoryView', () => {
  it('空列表显示空态', () => {
    render(<HistoryView records={[]} onOpen={vi.fn()} onDelete={vi.fn()} onClear={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByTestId('history-empty')).toBeInTheDocument()
  })
  it('渲染记录：问题、本卦名、时间', () => {
    render(<HistoryView records={[rec('a', '我该换工作吗？')]} onOpen={vi.fn()} onDelete={vi.fn()} onClear={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByText('我该换工作吗？')).toBeInTheDocument()
    expect(screen.getByText(/乾为天/)).toBeInTheDocument()
    expect(screen.getByText(/2026\.06\.16 12:34/)).toBeInTheDocument()
  })
  it('点条目触发 onOpen', async () => {
    const onOpen = vi.fn()
    render(<HistoryView records={[rec('a', '问')]} onOpen={onOpen} onDelete={vi.fn()} onClear={vi.fn()} onBack={vi.fn()} />)
    await userEvent.click(screen.getByTestId('history-item'))
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }))
  })
  it('删除（确认）触发 onDelete；取消则不触发', async () => {
    const onDelete = vi.fn()
    render(<HistoryView records={[rec('a', '问')]} onOpen={vi.fn()} onDelete={onDelete} onClear={vi.fn()} onBack={vi.fn()} />)
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    await userEvent.click(screen.getByTestId('history-delete'))
    expect(onDelete).not.toHaveBeenCalled()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await userEvent.click(screen.getByTestId('history-delete'))
    expect(onDelete).toHaveBeenCalledWith('a')
  })
  it('清空（确认）触发 onClear；返回触发 onBack', async () => {
    const onClear = vi.fn(); const onBack = vi.fn()
    render(<HistoryView records={[rec('a', '问')]} onOpen={vi.fn()} onDelete={vi.fn()} onClear={onClear} onBack={onBack} />)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await userEvent.click(screen.getByTestId('history-clear'))
    expect(onClear).toHaveBeenCalled()
    await userEvent.click(screen.getByTestId('history-back'))
    expect(onBack).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/components/HistoryView.test.tsx`
Expected: FAIL（`Failed to resolve import './HistoryView'`）

- [ ] **Step 3: 写最小实现**

`src/components/HistoryView.tsx`：

```tsx
import { useMemo } from 'react'
import { CastRecord, summarize } from '../domain/cast-record'

interface Props {
  records: CastRecord[]
  onOpen: (record: CastRecord) => void
  onDelete: (id: string) => void
  onClear: () => void
  onBack: () => void
}

function fmt(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function HistoryView({ records, onOpen, onDelete, onClear, onBack }: Props) {
  const summaries = useMemo(() => records.map(summarize), [records])

  return (
    <div data-testid="history-view" className="flex flex-col gap-4 px-4 w-full max-w-md mx-auto font-serif">
      <div className="flex items-center justify-between">
        <button data-testid="history-back" onClick={onBack} className="text-xs text-ink/50 underline">
          ← 返回
        </button>
        <h1 className="text-lg text-ink">起卦记录</h1>
        {records.length > 0 ? (
          <button
            data-testid="history-clear"
            onClick={() => { if (window.confirm('清空全部起卦记录？')) onClear() }}
            className="text-xs text-seal/80 underline"
          >
            清空
          </button>
        ) : (
          <span className="w-8" />
        )}
      </div>

      {records.length === 0 ? (
        <p data-testid="history-empty" className="text-center text-sm text-ink/40 py-16">
          还没有起卦记录
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {records.map((r, i) => (
            <li key={r.id} className="border border-ink/15 rounded-lg p-3 flex items-center gap-3">
              <button
                data-testid="history-item"
                onClick={() => onOpen(r)}
                className="flex-1 text-left min-w-0"
              >
                <div className="text-sm text-ink truncate">{r.question || '（未填）'}</div>
                <div className="text-[11px] text-ink/50 mt-1">
                  {summaries[i].primaryName}
                  {summaries[i].changedName ? ` → ${summaries[i].changedName}` : ''}
                  {summaries[i].movingCount > 0 ? ` · ${summaries[i].movingCount} 动` : ''}
                </div>
                <div className="text-[10px] text-ink/40 mt-1">
                  {fmt(r.createdAt)} · {r.mode === 'manual' ? '手动' : '赛博'}
                </div>
              </button>
              <button
                data-testid="history-delete"
                onClick={() => { if (window.confirm('删除这条记录？')) onDelete(r.id) }}
                className="text-xs text-ink/30 hover:text-seal shrink-0"
                aria-label="删除"
              >
                删除
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/components/HistoryView.test.tsx`
Expected: PASS（5 个用例）

> 注：测试只渲染一条记录，故 `history-item` / `history-delete` 唯一可用 `getByTestId`。

- [ ] **Step 5: 提交**

```bash
git add src/components/HistoryView.tsx src/components/HistoryView.test.tsx
git commit -m "feat: HistoryView 起卦记录列表（查看/删除/清空/空态）"
```

---

## Task 7: QuestionInput 历史入口

**Files:**
- Modify: `src/components/QuestionInput.tsx`
- Test: `src/components/QuestionInput.test.tsx`（追加用例）

**Interfaces:**
- Produces: `QuestionInput` Props 新增可选 `onOpenHistory?: () => void`；传入时渲染 `data-testid="open-history"` 入口，点击触发；不传则不渲染（既有用例不破）。

- [ ] **Step 1: 写失败测试**（追加到 `src/components/QuestionInput.test.tsx`）

```ts
it('传 onOpenHistory 时显示入口并可点击', async () => {
  const onOpenHistory = vi.fn()
  render(<QuestionInput onSubmit={vi.fn()} onOpenHistory={onOpenHistory} />)
  await userEvent.click(screen.getByTestId('open-history'))
  expect(onOpenHistory).toHaveBeenCalled()
})
it('不传 onOpenHistory 时不渲染入口', () => {
  render(<QuestionInput onSubmit={vi.fn()} />)
  expect(screen.queryByTestId('open-history')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/components/QuestionInput.test.tsx`
Expected: FAIL（找不到 `open-history`）

- [ ] **Step 3: 写最小实现**

改 `src/components/QuestionInput.tsx`：

Props 接口改为：

```tsx
interface Props {
  onSubmit: (question: string, mode: CastMode) => void
  onOpenHistory?: () => void
}

export function QuestionInput({ onSubmit, onOpenHistory }: Props) {
```

在根 `<div className="flex flex-col items-center gap-6 ...">` 的**最前面**（`<h1>` 之前）插入入口：

```tsx
      {onOpenHistory && (
        <button
          data-testid="open-history"
          onClick={onOpenHistory}
          className="self-end text-[11px] text-ink/40 underline font-serif"
        >
          历史记录
        </button>
      )}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/components/QuestionInput.test.tsx`
Expected: PASS（原 3 + 新 2 = 5 个用例）

- [ ] **Step 5: 提交**

```bash
git add src/components/QuestionInput.tsx src/components/QuestionInput.test.tsx
git commit -m "feat: QuestionInput 加历史记录入口"
```

---

## Task 8: App 装配（history 路由 + 自动存 + 结果底部按 origin）

**Files:**
- Modify: `src/App.tsx`（整体替换，见 Step 3）
- Test: `src/App.test.tsx`（追加端到端组件用例）

**Interfaces:**
- Consumes: `useCastRecords` from `src/hooks/useCastRecords.ts`；`HistoryView` from `src/components/HistoryView.tsx`；useCasting 的 `origin/openHistory/openRecord`。

- [ ] **Step 1: 写失败测试**（追加到 `src/App.test.tsx`）

```ts
it('起卦后回首页→进历史→见记录→重开→出结果（返回记录按钮）', async () => {
  render(<App rng={sequenceRandom([1, 1, 1])} />)
  await userEvent.type(screen.getByRole('textbox'), '我该换工作吗？')
  await userEvent.click(screen.getByRole('button', { name: '诚心摇卦' }))
  await userEvent.click(screen.getByRole('button', { name: /跳过/ }))
  await screen.findByText(/潜龙勿用/)
  // 回首页
  await userEvent.click(screen.getByRole('button', { name: /再 占 一 卦/ }))
  // 进历史
  await userEvent.click(screen.getByTestId('open-history'))
  expect(screen.getByTestId('history-view')).toBeInTheDocument()
  expect(screen.getByText('我该换工作吗？')).toBeInTheDocument()
  // 重开记录
  await userEvent.click(screen.getByTestId('history-item'))
  expect(await screen.findByText(/潜龙勿用/)).toBeInTheDocument()
  // 来自历史 → 底部为「返回记录」
  expect(screen.getByRole('button', { name: /返 回 记 录/ })).toBeInTheDocument()
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL（无 `open-history` 入口 / `App` 未渲染 HistoryView）

- [ ] **Step 3: 整体替换实现**

`src/App.tsx` 全文替换为：

```tsx
import { useRef, useState } from 'react'
import { useCasting } from './hooks/useCasting'
import { useCastRecords } from './hooks/useCastRecords'
import { useShareImage } from './hooks/useShareImage'
import { QuestionInput } from './components/QuestionInput'
import { CastingStage } from './components/CastingStage'
import { ManualCast } from './components/ManualCast'
import { ResultView } from './components/ResultView'
import { HistoryView } from './components/HistoryView'
import { ShareCard } from './components/ShareCard'
import { RandomSource } from './domain/random'
import { Clock } from './domain/clock'

export default function App({ rng, clock }: { rng?: RandomSource; clock?: Clock } = {}) {
  const records = useCastRecords()
  const { phase, origin, pan, interpretation, submit, finishCasting, finishManual, openHistory, openRecord, reset } =
    useCasting(rng, clock, records.add)
  const { capture } = useShareImage()
  const cardRef = useRef<HTMLDivElement>(null)
  const [toast, setToast] = useState<string | null>(null)

  const handleShare = async () => {
    if (!cardRef.current) return
    setToast(null)
    try {
      const { dataUrl, shared } = await capture(cardRef.current)
      if (!shared) {
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = '六爻占.png'
        a.click()
      }
    } catch {
      setToast('生成失败，可长按图片保存')
    }
  }

  const dateText = new Date().toISOString().slice(0, 10).replace(/-/g, '.')

  return (
    <main className="min-h-screen flex flex-col items-center justify-center py-12">
      {phase === 'input' && <QuestionInput onSubmit={submit} onOpenHistory={openHistory} />}
      {phase === 'casting' && <CastingStage onComplete={finishCasting} />}
      {phase === 'manual' && <ManualCast onComplete={finishManual} />}
      {phase === 'history' && (
        <HistoryView
          records={records.records}
          onOpen={openRecord}
          onDelete={records.remove}
          onClear={records.clear}
          onBack={reset}
        />
      )}
      {phase === 'result' && pan && interpretation && (
        <>
          <ResultView pan={pan} interpretation={interpretation} onShare={handleShare} />
          <button
            className="mt-8 text-xs text-ink/40 underline font-serif"
            onClick={() => { setToast(null); origin === 'history' ? openHistory() : reset() }}
          >
            {origin === 'history' ? '← 返 回 记 录' : '再 占 一 卦'}
          </button>
          {/* 离屏分享卡，供栅格化 */}
          <div className="fixed -left-[9999px] top-0" aria-hidden>
            <ShareCard
              ref={cardRef}
              interpretation={interpretation}
              lines={pan.reading.primary.lines}
              shiYao={pan.reading.primary.data.shiYao}
              yingYao={pan.reading.primary.data.yingYao}
              dateText={dateText}
              pillarsText={pan.pillars ? `${pan.pillars.year}年 · ${pan.pillars.month}月 · ${pan.pillars.day}日` : undefined}
            />
          </div>
        </>
      )}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 text-xs text-ink bg-paper-2 border border-ink/20 rounded-full px-4 py-2 font-serif">
          {toast}
        </div>
      )}
    </main>
  )
}
```

- [ ] **Step 4: 跑全量单元/组件测试确认通过**

Run: `npm test`
Expected: PASS（原有 + 新增全绿，覆盖率 ≥80%）

- [ ] **Step 5: 提交**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat: App 装配起卦记录（history 路由+自动存+结果底部按来源切换）"
```

---

## Task 9: E2E 起卦记录路径

**Files:**
- Modify: `tests/e2e/divination.spec.ts`（追加 test）

**Interfaces:**
- Consumes: 运行中的 App（`npm run e2e` 由 playwright 配置自动起 dev server）。

- [ ] **Step 1: 写 E2E 用例**（追加到 `tests/e2e/divination.spec.ts` 末尾）

```ts
test('起卦记录：起卦后进历史 → 重开 → 删除', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox').fill('记录测试问题')
  await page.getByRole('button', { name: '诚心摇卦' }).click()
  await page.getByRole('button', { name: /跳过/ }).click()
  await expect(page.getByText('卦辞')).toBeVisible()

  // 回首页 → 进历史
  await page.getByRole('button', { name: /再 占 一 卦/ }).click()
  await page.getByTestId('open-history').click()
  await expect(page.getByTestId('history-view')).toBeVisible()
  await expect(page.getByText('记录测试问题')).toBeVisible()

  // 重开记录 → 出结果 → 底部「返回记录」
  await page.getByTestId('history-item').first().click()
  await expect(page.getByText('卦辞')).toBeVisible()
  await page.getByRole('button', { name: /返 回 记 录/ }).click()
  await expect(page.getByTestId('history-view')).toBeVisible()

  // 删除（接受 confirm）→ 空态
  page.on('dialog', (d) => d.accept())
  await page.getByTestId('history-delete').first().click()
  await expect(page.getByTestId('history-empty')).toBeVisible()
})
```

- [ ] **Step 2: 跑 E2E 确认通过**

Run: `npm run e2e`
Expected: PASS（原 2 条 + 新 1 条；新条覆盖起卦→历史→重开→删除全链路）

> 若 E2E 因浏览器持久化导致跨用例脏数据：新用例最后已删除自身记录归零；如仍有干扰，可在该 test 开头 `await page.evaluate(() => localStorage.clear())` 后再 `goto`。

- [ ] **Step 3: 提交**

```bash
git add tests/e2e/divination.spec.ts
git commit -m "test: E2E 起卦记录（起卦→历史→重开→删除）"
```

---

## Self-Review 记录

**Spec coverage（spec §→task）：**
- §1.1 CastRecord/summarize/reconstruct → Task 1、2 ✓
- §1.2 isCastRecord → Task 1 ✓
- §2.1 store load/add/remove/clear + 信封/上限/降级 → Task 3 ✓
- §2.2 newId → Task 3 ✓
- §3.1 useCastRecords → Task 4 ✓
- §3.2 useCasting（phase history/onCast/openHistory/openRecord/origin/now 取一次）→ Task 5 ✓
- §4.1 HistoryView → Task 6 ✓
- §4.2 QuestionInput 入口 → Task 7 ✓
- §4.3 + §5 App 装配 + 结果底部按 origin → Task 8 ✓
- §6 降级/二次确认 → Task 3（存储降级）+ Task 6（confirm）✓
- §7 测试 → 各 task 内 + Task 9 E2E ✓

**Placeholder scan：** 无 TBD/TODO；每个代码步骤均含完整代码。✓

**Type consistency：**
- `CastRecord` 字段 `id/createdAt/question/mode/lines` 全任务一致。
- store 函数签名 `loadRecords/addRecord/removeRecord/clearRecords/newId` 在 Task 3 定义，Task 4/5 按同名同参消费。
- useCasting 第三参 `onCast?: (record: CastRecord) => void`（Task 5）与 App `records.add: (record: CastRecord) => void`（Task 4 produces）类型匹配。
- HistoryView Props（Task 6）与 App 传参（Task 8）一一对应。
- `summarize` 返回 `CastSummary{primaryName/changedName/movingCount}`（Task 1）与 HistoryView 消费字段一致。
