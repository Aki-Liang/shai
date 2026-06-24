# 六爻 · 起卦记录（本地存储）设计

> 前五期完成起卦 → 排盘 → 用神分析 → 手动摇卦 + AI prompt。本期加**起卦记录**：每次起卦自动留痕，存浏览器 localStorage，可在首页进历史列表查看/重开/删除。

- **一句话**：每完成一卦自动写一条记录到 localStorage；首页角上入口进列表；点列表项确定性**重算**出完整结果页；支持单条删除与清空全部。
- **不做**：跨设备同步 / 云端备份 / 收藏标签 / 笔记批注 / 导出导入（YAGNI，后续可单开 spec）。

---

## 0. 关键决策（来自 brainstorming）

1. **保存时机＝自动**：每次走到结果页自动落一条记录，无需手动按钮。
2. **入口＝首页（问题输入页）角上**：点入历史列表页；列表项点开 → 重建完整结果页。
3. **操作＝查看 + 单条删除 + 清空全部**。
4. **记录只存 4 字段**（`question / mode / lines / createdAt` + 保存时生成的 `id`），变卦·排盘·用神·解读全部由 `lines` + `createdAt` **确定性重算**——与现有 `buildReadingFromHexagram`+`buildPan`+`interpret` 同一链路。
5. **同一时刻**：完成起卦时只取一次 `clock.now()`，同时喂 `buildPan` 与记录 `createdAt`，保证重开时干支三柱/旬空与首次完全一致。
6. **上限 200 条**，超出丢最旧（FIFO）。单条 ~200B，localStorage 无压力。
7. **降级**：localStorage 不可用（隐私模式/配额满）→ 静默退化为「本次会话内存记录」，不报错不崩；损坏/非法 JSON/schema 不符 → 丢弃该数据，控制台 warn。
8. 沿用既有口径：immutable（一律返回新数组）、纯逻辑与视图分离、不信任外部数据先校验。

---

## 1. 领域

### 1.1 记录类型与重建 `domain/cast-record.ts`（新）

```ts
import { CastMode, Hexagram } from './types'
import { Pan } from './pan'
import { CastReading } from './reading'
import { Interpretation } from './interpret'

export interface CastRecord {
  id: string          // 保存时生成（boundary 注入，详见 §2.1）
  createdAt: number   // epoch 毫秒；重算干支三柱用同一时刻
  question: string
  mode: CastMode      // 'cyber' | 'manual'，仅用于列表角标
  lines: Hexagram     // 本卦六爻，一切由此重建
}

/** 列表用轻量摘要：只查卦名/动爻数，不跑完整排盘 */
export interface CastSummary {
  primaryName: string         // 本卦名
  changedName: string | null  // 变卦名（无动爻则 null）
  movingCount: number         // 动爻数
}
export function summarize(record: CastRecord): CastSummary

/** 重建完整结果（与 finishManual 同链路）；interpret 异步故返回 Promise */
export function reconstruct(
  record: CastRecord,
): Promise<{ reading: CastReading; pan: Pan; interpretation: Interpretation }>
```

- `summarize`：`lookupHexagram(record.lines)` 取本卦名；`changedHexagram(lines)` 非空则 `lookupHexagram` 取变卦名；`movingLineIndexes(lines).length` 取动爻数。**不**调 `buildPan`/`interpret`（列表渲染要轻）。
- `reconstruct`：`r = buildReadingFromHexagram(question, lines)` → `pan = buildPan(r, new Date(createdAt))` → `interpretation = await interpret(r)`。纯逻辑，无 React。

### 1.2 `lines` 校验（防本地脏数据）`domain/cast-record.ts`

```ts
/** 运行时校验一个未知值是否合法 CastRecord（store 读时用） */
export function isCastRecord(v: unknown): v is CastRecord
```
- 校验 `id:string`、`createdAt:number`、`question:string`、`mode∈{cyber,manual}`、`lines` 为长度 6 的数组且每项 `{yinyang∈{yin,yang}, moving:boolean}`。任一不符即非法。

---

## 2. 存储

### 2.1 `storage/cast-record-store.ts`（新）

```ts
import { CastRecord, isCastRecord } from '../domain/cast-record'

export const STORAGE_KEY = 'shai:cast-records:v1'
export const MAX_RECORDS = 200

/** 注入式存储，便于测试与降级（默认 window.localStorage，缺失则内存兜底） */
export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function loadRecords(store?: KeyValueStore): CastRecord[]
export function addRecord(record: CastRecord, store?: KeyValueStore): CastRecord[]
export function removeRecord(id: string, store?: KeyValueStore): CastRecord[]
export function clearRecords(store?: KeyValueStore): void
```

- **信封**：持久化为 `{ "version": 1, "records": CastRecord[] }`（JSON）。
- `loadRecords`：try `JSON.parse` → 校验 `version===1` 且 `records` 为数组 → `records.filter(isCastRecord)`（逐条校验，丢非法）。任何异常 → `console.warn` + 返回 `[]`。**不信任本地数据**。
- `addRecord`：`next = [record, ...loadRecords()]`（**新最前**），超 `MAX_RECORDS` 则 `slice(0, MAX_RECORDS)`（丢最旧）；持久化信封；返回 `next`。全程 immutable。
- `removeRecord`：`loadRecords().filter(r => r.id !== id)` → 持久化 → 返回新数组。
- `clearRecords`：写入 `{version:1, records:[]}`（或 removeItem）。
- **降级**：`setItem` 抛错（配额满/隐私模式）→ try/catch 包裹，warn，不抛。默认 store getter 安全探测 `window.localStorage`：不可用时返回一个**进程内 Map 兜底**实例（本次会话有记录，刷新即失，但不崩）。

### 2.2 id 生成（boundary，不污染纯 domain）`storage/cast-record-store.ts`

```ts
export function newId(): string   // crypto.randomUUID?.() ?? `${...}` 兜底
```
- 优先 `crypto.randomUUID()`；缺失（老环境/部分 jsdom）→ 兜底 `r-` + 两段 36 进制随机。仅在保存时调用一次。

---

## 3. Hook 编排

### 3.1 `hooks/useCastRecords.ts`（新）

```ts
export function useCastRecords(): {
  records: CastRecord[]
  add: (record: CastRecord) => void
  remove: (id: string) => void
  clear: () => void
}
```
- 挂载时 `useState(() => loadRecords())` 初始化（lazy）。
- `add/remove/clear` 调对应 store 函数（store 已持久化），用其返回值 `setRecords`，保持内存与本地一致。

### 3.2 `hooks/useCasting.ts`（改）

- `Phase = 'input' | 'casting' | 'manual' | 'result' | 'history'`。
- 新增可选回调入参：`useCasting(rng, clock, onCast?: (record: CastRecord) => void)`。
- `finishCasting` / `finishManual`：**先取一次 `const now = clock.now()`**；`buildPan(r, now)`；构造记录
  `onCast?.({ id: newId(), createdAt: now.getTime(), question, mode, lines: r.primary.lines })`
  （`mode` 由 phase 来源决定：casting→`'cyber'`，manual→`'manual'`）。
- 新增 `openHistory()`：`setPhase('history')`。
- 新增 `openRecord(record: CastRecord)`：`const { reading, pan, interpretation } = await reconstruct(record)` → set 三态 → `setPhase('result')`；记 `origin = 'history'`。
- 新增 `origin: 'cast' | 'history'`（默认 `'cast'`；`submit`/`reset` 复位为 `'cast'`，`openRecord` 置 `'history'`），供结果页底部动作切换文案。
- `reset()`：回 `input` 且 `origin='cast'`（不动记录）。
- 返回新增：`openHistory`、`openRecord`、`origin`。

> 装配方式：`App.tsx` 持有 `useCastRecords`，把 `records.add` 作为 `onCast` 传入 `useCasting`，单一数据源，避免双写。

---

## 4. 组件

### 4.1 `components/HistoryView.tsx`（新）

```ts
interface Props {
  records: CastRecord[]
  onOpen: (record: CastRecord) => void
  onDelete: (id: string) => void
  onClear: () => void
  onBack: () => void
}
```
- 顶栏：标题「起卦记录」+「返回」（`onBack`）+「清空」（`onClear`，列表非空才显，点后二次确认 `window.confirm`）。
- 列表：`records` 已是新最前序；每条 `useMemo(() => summarize(r))` 取摘要，一行卡片：
  - 问题（单行省略，空问题显「（未填）」）
  - `本卦名 → 变卦名`（无变卦只显本卦名）+ 动爻数小字
  - 日期时间（`createdAt` → `YYYY.MM.DD HH:mm`，本地时区）
  - 模式角标（赛博/手动）
  - 删除按钮（`onDelete(id)`，二次确认）
  - 卡片点击 → `onOpen(record)`
- 空态：「还没有起卦记录」+ 返回提示。
- testid：`history-view`、列表项 `history-item`、`history-open`(项)、`history-delete`、`history-clear`、`history-back`、空态 `history-empty`。

### 4.2 `components/QuestionInput.tsx`（改）

- 新增可选 prop：`onOpenHistory?: () => void`。
- 角上加轻量入口（如右上小字链接「历史记录」），`data-testid="open-history"`，点击 `onOpenHistory?.()`。仅在传入时渲染，不影响既有用例。

### 4.3 `components/ResultView.tsx`（改，极小）

- 不改其内部；底部「再占一卦 / ← 返回记录」文案由 `App` 按 `origin` 决定（见 §5），ResultView 保持现状。

---

## 5. 装配 `App.tsx`（改）

- `const records = useCastRecords()`；`const { ..., openHistory, openRecord, origin } = useCasting(rng, clock, records.add)`。
- `phase === 'input'`：`<QuestionInput onSubmit={submit} onOpenHistory={openHistory} />`。
- `phase === 'history'`：`<HistoryView records={records.records} onOpen={openRecord} onDelete={records.remove} onClear={records.clear} onBack={reset} />`。
- `phase === 'result'`：现有结构不变；底部那枚链接文案/行为按 `origin` 切：
  - `origin === 'history'` → 文案「← 返回记录」，点击 `openHistory()`。
  - 否则 → 文案「再占一卦」，点击 `reset()`（同现状）。

---

## 6. 错误处理与降级

- localStorage 不可用 → store 走内存 Map 兜底；功能可用，仅刷新不持久；不抛错。
- `setItem` 配额满 → try/catch warn，记录至少留在内存态本次可见。
- 读到损坏/版本不符/非法条目 → 丢弃并 warn，返回合法子集或 `[]`。
- `reconstruct` 内 `buildPan` 干支历失败 → 沿用既有降级（pillars=null），结果页照常出。
- 删除/清空走 `window.confirm` 二次确认，防误删。

---

## 7. 测试（TDD，覆盖率 ≥80%）

- **单元**
  - `cast-record`：`summarize`（有/无变卦、动爻数）；`isCastRecord`（合法 / 缺字段 / lines 长度错 / mode 非法 → false）；`reconstruct`（固定 record → reading/pan/interpretation 一致，createdAt 决定干支）。
  - `cast-record-store`：注入假 store —— `add` 新最前 + 超 `MAX_RECORDS` 丢最旧；`remove` 按 id；`clear` 清空；`load` 对损坏 JSON / 版本不符 / 混入非法条目的降级；`setItem` 抛错时不崩；`newId` 唯一性（多次不等）。
- **Hook**
  - `useCastRecords`：初始 load；add/remove/clear 后 `records` 与 store 一致。
  - `useCasting`：完成赛博/手动起卦各触发一次 `onCast`，record 的 `mode/lines/createdAt` 正确且 `createdAt===buildPan 用的时刻`；`openRecord` 后 phase=result 且三态非空；`origin` 切换正确。
- **组件**
  - `HistoryView`：渲染列表（摘要/时间/角标）；空态；点项 `onOpen`；删除/清空触发回调（mock confirm=true）；confirm=false 不触发。
  - `QuestionInput`：传 `onOpenHistory` 时出入口且点击触发；不传则不渲染（既有用例不破）。
- **E2E** `tests/e2e/divination.spec.ts`（补一条）
  - 起卦（赛博）→ 出结果 → 「再占一卦」回首页 → 点「历史记录」→ 见 1 条记录 → 点开 → 出结果页（断言含问题/本卦名）→ 返回记录 → 删除 → 列表空态。

---

## 8. 文件结构

新增：
```
src/domain/cast-record.ts          # CastRecord/CastSummary/summarize/reconstruct/isCastRecord
src/storage/cast-record-store.ts   # STORAGE_KEY/load/add/remove/clear/newId/KeyValueStore
src/hooks/useCastRecords.ts        # records 状态 + add/remove/clear
src/components/HistoryView.tsx      # 历史列表页
（各 .test）
```
改动：
```
src/hooks/useCasting.ts            # +phase 'history' / +onCast / +openHistory / +openRecord / +origin / now 取一次
src/components/QuestionInput.tsx   # +onOpenHistory 入口
src/App.tsx                        # 装配 useCastRecords + history 路由 + result 底部按 origin
tests/e2e/divination.spec.ts       # +起卦记录路径
```
均 < 200 行；纯逻辑（domain/storage）与视图（components）分离。

---

## 9. 实施顺序（供 plan 拆任务）

cast-record（类型/summarize/isCastRecord/reconstruct）→ cast-record-store（load/add/remove/clear/newId + 降级）→ useCastRecords → useCasting（now 取一次/onCast/openHistory/openRecord/origin/phase history）→ HistoryView → QuestionInput 入口 → App 装配 → E2E。每步 TDD（红 → 绿 → 提交）。
