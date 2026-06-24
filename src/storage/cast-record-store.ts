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
      console.warn('[cast-record-store] 版本不符或结构异常，忽略本地记录（version=', env.version, '）')
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
