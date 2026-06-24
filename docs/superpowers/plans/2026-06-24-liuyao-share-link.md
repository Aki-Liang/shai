# 六爻 · 生成分享链接 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把一卦编进自包含 URL（`…/shai/#s=…`），结果页「复制分享链接」一键复制；打开该链接解码后复用 `reconstruct()` 重建结果页。替换掉原 PNG 分享图。

**Architecture:** 纯逻辑 `domain/share-link.ts`（base64url 编解码 + 校验）；副作用助手 `lib/share-url.ts`（拼 URL / 读 hash）、`lib/clipboard.ts`（复制兜底）。`useCasting` 加 `record` 状态与 `openShared`（origin='shared'，不写历史）。`App` 挂载读 hash 打开分享、结果页复制链接、按 origin 切底部按钮，并移除 PNG 分享（删 `ShareCard`/`useShareImage`/`modern-screenshot`）。

**Tech Stack:** React 18 + TypeScript 5 + Vite；Vitest + @testing-library/react + userEvent（jsdom）；Playwright（E2E）。复用上一期 `domain/cast-record.ts` 的 `CastRecord`/`isCastRecord`/`reconstruct`。

## Global Constraints

- **编码**：URL **hash 片段** `#s=<base64url(JSON)>`，参数名 `SHARE_PARAM = 's'`。payload `{ v: 1, q: question, t: createdAt(epoch ms), l: lines.map(x=>[yang?1:0, moving?1:0]) }`。
- **mode 不入 payload**：解码合成 `id:'shared'`、`mode:'cyber'`（结果页不显示 mode）。
- **不信任 URL 数据**：解码后逐字段校验（`v===1`、`q:string`、`t:有限number`、`l:长度6且每项[0|1,0|1]`），再过 `isCastRecord`；任何异常返回 `null`。
- **打开分享链接不写入查看者历史**（`openShared` 不调 `onCast`）。
- **结果页底部按 origin**：`'shared'`→「去 占 一 卦」(reset)、`'history'`→「← 返 回 记 录」(openHistory)、其他→「再 占 一 卦」(reset)。
- **base64 须 UTF-8 安全**（中文问题不乱码）：用 `TextEncoder`/`TextDecoder` + `btoa`/`atob`，再做 base64url（`+`→`-`、`/`→`_`、去尾 `=`）。
- **移除 PNG 分享**：删 `ShareCard.tsx(.test)`、`useShareImage.ts(.test)`、`package.json` 的 `modern-screenshot`。
- immutable；纯逻辑（domain）/ 副作用（lib）/ 视图（components）分层；每文件 < 200 行；每步 TDD（红→绿→提交）。
- 测试命令：单测/组件 `npx vitest run <path>` 或全量 `npm test`；构建 `npm run build`（含 `tsc -b`）；E2E `npm run e2e`。覆盖率门槛 80%。

## File Structure

新增：
```
src/domain/share-link.ts        # SHARE_PARAM / encodeShareLink / decodeShareLink
src/domain/share-link.test.ts
src/lib/share-url.ts            # buildShareUrl / readShareParam
src/lib/share-url.test.ts
src/lib/clipboard.ts            # copyText
src/lib/clipboard.test.ts
```
改动：
```
src/hooks/useCasting.ts         # +record 状态 / +openShared / origin 'shared'
src/components/ResultView.tsx   # 按钮改「复制分享链接」+ data-testid="share-link-btn"（保留 onShare prop）
src/App.tsx                     # 挂载读分享链接 / 复制链接 / 底部按 origin / 移除 PNG 分享
tests/e2e/divination.spec.ts    # +分享链接路径
```
删除：
```
src/components/ShareCard.tsx, src/components/ShareCard.test.tsx
src/hooks/useShareImage.ts, src/hooks/useShareImage.test.ts
package.json: -modern-screenshot
```

---

## Task 1: 编解码 share-link.ts

**Files:**
- Create: `src/domain/share-link.ts`
- Test: `src/domain/share-link.test.ts`

**Interfaces:**
- Consumes: `CastRecord`、`isCastRecord` from `src/domain/cast-record.ts`；`Hexagram`、`Line` from `src/domain/types.ts`。
- Produces:
  - `const SHARE_PARAM = 's'`
  - `function encodeShareLink(input: { question: string; lines: Hexagram; createdAt: number }): string`
  - `function decodeShareLink(param: string): CastRecord | null`

- [ ] **Step 1: 写失败测试**

`src/domain/share-link.test.ts`：

```ts
import { describe, it, expect } from 'vitest'
import { encodeShareLink, decodeShareLink } from './share-link'
import { Hexagram, Line } from './types'

const line = (yinyang: 'yin' | 'yang', moving = false): Line => ({ yinyang, moving })
const lines: Hexagram = [line('yang', true), line('yin'), line('yang'), line('yin', true), line('yang'), line('yin')]
// 用 ASCII payload 构造任意（含非法）分享串
const b64url = (obj: unknown) =>
  btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

describe('share-link encode/decode', () => {
  it('往返还原 question/lines/createdAt（含中文）', () => {
    const enc = encodeShareLink({ question: '我能成吗？', lines, createdAt: 1750000000000 })
    const rec = decodeShareLink(enc)
    expect(rec).not.toBeNull()
    expect(rec!.question).toBe('我能成吗？')
    expect(rec!.createdAt).toBe(1750000000000)
    expect(rec!.lines).toEqual(lines)
    expect(rec!.mode).toBe('cyber')
  })
  it('base64url 不含 + / =', () => {
    const enc = encodeShareLink({ question: 'a'.repeat(60), lines, createdAt: 1 })
    expect(enc).not.toMatch(/[+/=]/)
  })
  it('空串 / 非法 base64 / 坏 JSON → null', () => {
    expect(decodeShareLink('')).toBeNull()
    expect(decodeShareLink('@@@not-base64@@@')).toBeNull()
    expect(decodeShareLink(b64url('not an object'))).toBeNull()
  })
  it('版本不符 / 缺字段 / lines 长度错 → null', () => {
    expect(decodeShareLink(b64url({ v: 9, q: 'x', t: 1, l: lines.map(() => [1, 0]) }))).toBeNull()
    expect(decodeShareLink(b64url({ v: 1, t: 1, l: lines.map(() => [1, 0]) }))).toBeNull()
    expect(decodeShareLink(b64url({ v: 1, q: 'x', t: 1, l: [[1, 0]] }))).toBeNull()
    expect(decodeShareLink(b64url({ v: 1, q: 'x', t: 'no', l: lines.map(() => [1, 0]) }))).toBeNull()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/domain/share-link.test.ts`
Expected: FAIL（`Failed to resolve import './share-link'`）

- [ ] **Step 3: 写最小实现**

`src/domain/share-link.ts`：

```ts
import { CastRecord, isCastRecord } from './cast-record'
import { Hexagram, Line } from './types'

export const SHARE_PARAM = 's'

interface SharePayload {
  v: 1
  q: string
  t: number
  l: [number, number][] // [yang?1:0, moving?1:0] × 6
}

function toBase64Url(b64: string): string {
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const rem = b64.length % 4
  return rem === 0 ? b64 : b64 + '='.repeat(4 - rem)
}
function encodeUtf8Base64(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}
function decodeUtf8Base64(b64: string): string {
  const binary = atob(b64)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function encodeShareLink(input: { question: string; lines: Hexagram; createdAt: number }): string {
  const payload: SharePayload = {
    v: 1,
    q: input.question,
    t: input.createdAt,
    l: input.lines.map((x) => [x.yinyang === 'yang' ? 1 : 0, x.moving ? 1 : 0]),
  }
  return toBase64Url(encodeUtf8Base64(JSON.stringify(payload)))
}

export function decodeShareLink(param: string): CastRecord | null {
  if (!param) return null
  try {
    const p = JSON.parse(decodeUtf8Base64(fromBase64Url(param))) as Partial<SharePayload>
    if (p.v !== 1) return null
    if (typeof p.q !== 'string') return null
    if (typeof p.t !== 'number' || !Number.isFinite(p.t)) return null
    if (!Array.isArray(p.l) || p.l.length !== 6) return null
    const ok = p.l.every(
      (pair) =>
        Array.isArray(pair) &&
        pair.length === 2 &&
        (pair[0] === 0 || pair[0] === 1) &&
        (pair[1] === 0 || pair[1] === 1),
    )
    if (!ok) return null
    const lines = p.l.map(
      (pair): Line => ({ yinyang: pair[0] === 1 ? 'yang' : 'yin', moving: pair[1] === 1 }),
    ) as Hexagram
    const record: CastRecord = { id: 'shared', createdAt: p.t, question: p.q, mode: 'cyber', lines }
    return isCastRecord(record) ? record : null
  } catch {
    return null
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/domain/share-link.test.ts`
Expected: PASS（4 个用例）

- [ ] **Step 5: 提交**

```bash
git add src/domain/share-link.ts src/domain/share-link.test.ts
git commit -m "feat: share-link 分享串 base64url 编解码 + 校验"
```

---

## Task 2: URL 助手 share-url.ts

**Files:**
- Create: `src/lib/share-url.ts`
- Test: `src/lib/share-url.test.ts`

**Interfaces:**
- Consumes: `SHARE_PARAM` from `src/domain/share-link.ts`。
- Produces: `function buildShareUrl(encoded: string): string`；`function readShareParam(): string | null`

- [ ] **Step 1: 写失败测试**

`src/lib/share-url.test.ts`：

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { buildShareUrl, readShareParam } from './share-url'

describe('share-url', () => {
  beforeEach(() => { window.location.hash = '' })

  it('buildShareUrl 拼出 origin + BASE_URL + #s=', () => {
    const url = buildShareUrl('ABC')
    expect(url).toBe(`${location.origin}${import.meta.env.BASE_URL}#s=ABC`)
    expect(url).toContain('#s=ABC')
  })
  it('readShareParam 从 #s=xyz123 取 xyz123', () => {
    window.location.hash = '#s=xyz123'
    expect(readShareParam()).toBe('xyz123')
  })
  it('无 s 参数 / 空 hash → null', () => {
    window.location.hash = '#other=1'
    expect(readShareParam()).toBeNull()
    window.location.hash = ''
    expect(readShareParam()).toBeNull()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/lib/share-url.test.ts`
Expected: FAIL（`Failed to resolve import './share-url'`）

- [ ] **Step 3: 写最小实现**

`src/lib/share-url.ts`：

```ts
import { SHARE_PARAM } from '../domain/share-link'

export function buildShareUrl(encoded: string): string {
  return `${location.origin}${import.meta.env.BASE_URL}#${SHARE_PARAM}=${encoded}`
}

export function readShareParam(): string | null {
  const hash = location.hash.replace(/^#/, '')
  if (!hash) return null
  for (const part of hash.split('&')) {
    const [k, v] = part.split('=')
    if (k === SHARE_PARAM && v) return v
  }
  return null
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/lib/share-url.test.ts`
Expected: PASS（3 个用例）

- [ ] **Step 5: 提交**

```bash
git add src/lib/share-url.ts src/lib/share-url.test.ts
git commit -m "feat: share-url 拼分享 URL + 读 hash 参数"
```

---

## Task 3: 剪贴板 clipboard.ts

**Files:**
- Create: `src/lib/clipboard.ts`
- Test: `src/lib/clipboard.test.ts`

**Interfaces:**
- Produces: `function copyText(text: string): Promise<boolean>`

- [ ] **Step 1: 写失败测试**

`src/lib/clipboard.test.ts`：

```ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { copyText } from './clipboard'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('copyText', () => {
  it('clipboard API 成功 → true', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    expect(await copyText('hi')).toBe(true)
    expect(writeText).toHaveBeenCalledWith('hi')
  })
  it('clipboard 抛错 → execCommand 兜底 true', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('no')) } })
    const exec = vi.spyOn(document, 'execCommand').mockReturnValue(true)
    expect(await copyText('hi')).toBe(true)
    expect(exec).toHaveBeenCalledWith('copy')
  })
  it('两者都失败 → false', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('no')) } })
    vi.spyOn(document, 'execCommand').mockReturnValue(false)
    expect(await copyText('hi')).toBe(false)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/lib/clipboard.test.ts`
Expected: FAIL（`Failed to resolve import './clipboard'`）

- [ ] **Step 3: 写最小实现**

`src/lib/clipboard.ts`：

```ts
/** 复制文本：优先 Clipboard API，失败兜底临时 textarea + execCommand（非 HTTPS / webview） */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // 落到兜底
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/lib/clipboard.test.ts`
Expected: PASS（3 个用例）

- [ ] **Step 5: 提交**

```bash
git add src/lib/clipboard.ts src/lib/clipboard.test.ts
git commit -m "feat: clipboard copyText（Clipboard API + execCommand 兜底）"
```

---

## Task 4: useCasting 加 record 状态 + openShared

**Files:**
- Modify: `src/hooks/useCasting.ts`（整体替换，见 Step 3）
- Test: `src/hooks/useCasting.test.ts`（追加用例）

**Interfaces:**
- Consumes: `CastRecord`、`reconstruct` from `src/domain/cast-record.ts`（已有 import）。
- Produces（在原返回值上新增）：`record: CastRecord | null`、`openShared: (record: CastRecord) => Promise<void>`；`Origin` 增加 `'shared'`。`finishCasting`/`finishManual`/`openRecord` 完成后 `record` 为当前这卦的记录。

- [ ] **Step 1: 写失败测试**（追加到 `src/hooks/useCasting.test.ts` 末尾，新 describe）

```ts
describe('useCasting 分享', () => {
  it('openShared → phase=result、origin=shared、record 与 reading 还原', async () => {
    const { result } = renderHook(() => useCasting())
    const record = {
      id: 'shared', createdAt: new Date('2026-06-16T12:00:00').getTime(), question: '分享问', mode: 'cyber' as const,
      lines: Array.from({ length: 6 }, () => ({ yinyang: 'yang' as const, moving: false })),
    }
    await act(async () => { await result.current.openShared(record) })
    expect(result.current.phase).toBe('result')
    expect(result.current.origin).toBe('shared')
    expect(result.current.record?.question).toBe('分享问')
    expect(result.current.reading?.question).toBe('分享问')
    expect(result.current.pan).not.toBeNull()
  })
  it('finishCasting 后 record 非空（供复制链接用）', async () => {
    const { result } = renderHook(() => useCasting(sequenceRandom([1, 1, 1]), fixedClock(new Date('2026-06-16T12:00:00'))))
    act(() => result.current.submit('问'))
    await act(async () => { await result.current.finishCasting() })
    expect(result.current.record?.question).toBe('问')
    expect(result.current.record?.createdAt).toBe(new Date('2026-06-16T12:00:00').getTime())
  })
})
```

（顶部 import 已有 `renderHook, act, useCasting, sequenceRandom, fixedClock, vi`，无需新增。）

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/hooks/useCasting.test.ts`
Expected: FAIL（`openShared is not a function` / `record` undefined）

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
type Origin = 'cast' | 'history' | 'shared'

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
  const [record, setRecord] = useState<CastRecord | null>(null)

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
    const rec: CastRecord = { id: newId(), createdAt: now.getTime(), question, mode: 'cyber', lines: r.primary.lines }
    setRecord(rec)
    onCast?.(rec)
    setPhase('result')
  }, [question, rng, clock, onCast])

  const finishManual = useCallback(async (primaryLines: Hexagram) => {
    const now = clock.now()
    const r = buildReadingFromHexagram(question, primaryLines)
    setReading(r)
    setPan(buildPan(r, now))
    setInterpretation(await interpret(r))
    const rec: CastRecord = { id: newId(), createdAt: now.getTime(), question, mode: 'manual', lines: r.primary.lines }
    setRecord(rec)
    onCast?.(rec)
    setPhase('result')
  }, [question, clock, onCast])

  const openHistory = useCallback(() => setPhase('history'), [])

  const openRecord = useCallback(async (rec: CastRecord) => {
    const rebuilt = await reconstruct(rec)
    setQuestion(rec.question)
    setReading(rebuilt.reading)
    setPan(rebuilt.pan)
    setInterpretation(rebuilt.interpretation)
    setRecord(rec)
    setOrigin('history')
    setPhase('result')
  }, [])

  const openShared = useCallback(async (rec: CastRecord) => {
    const rebuilt = await reconstruct(rec)
    setQuestion(rec.question)
    setReading(rebuilt.reading)
    setPan(rebuilt.pan)
    setInterpretation(rebuilt.interpretation)
    setRecord(rec)
    setOrigin('shared')
    setPhase('result')
  }, [])

  const reset = useCallback(() => {
    setReading(null)
    setPan(null)
    setInterpretation(null)
    setRecord(null)
    setQuestion('')
    setOrigin('cast')
    setPhase('input')
  }, [])

  return {
    phase, origin, reading, pan, interpretation, record,
    submit, finishCasting, finishManual, openHistory, openRecord, openShared, reset,
  }
}
```

- [ ] **Step 4: 跑测试确认通过（含原有用例回归）**

Run: `npx vitest run src/hooks/useCasting.test.ts`
Expected: PASS（原 7 + 新 2 = 9 个用例）

- [ ] **Step 5: 提交**

```bash
git add src/hooks/useCasting.ts src/hooks/useCasting.test.ts
git commit -m "feat: useCasting 加 record 状态 + openShared（origin shared，不写历史）"
```

---

## Task 5: ResultView 按钮改「复制分享链接」

**Files:**
- Modify: `src/components/ResultView.tsx`
- Test: `src/components/ResultView.test.tsx`（追加 1 个用例）

**Interfaces:**
- Produces: ResultView 仍接收 `onShare: () => void`；底部分享按钮文案＝「复制分享链接」，`data-testid="share-link-btn"`，点击触发 `onShare`。

- [ ] **Step 1: 写失败测试**（追加到 `src/components/ResultView.test.tsx` 的 describe 内）

```ts
  it('显示「复制分享链接」按钮并触发 onShare', async () => {
    const onShare = vi.fn()
    render(<ResultView pan={pan} interpretation={interp} onShare={onShare} />)
    const btn = screen.getByTestId('share-link-btn')
    expect(btn).toHaveTextContent('复制分享链接')
    await userEvent.click(btn)
    expect(onShare).toHaveBeenCalled()
  })
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/components/ResultView.test.tsx`
Expected: FAIL（找不到 `share-link-btn`）

- [ ] **Step 3: 改实现**

在 `src/components/ResultView.tsx` 底部，把现有分享按钮：

```tsx
        <button
          className="font-serif tracking-[0.3em] text-ink border border-ink/30 rounded-full px-6 py-2"
          onClick={onShare}
        >
          生成分享图
        </button>
```

改为：

```tsx
        <button
          data-testid="share-link-btn"
          className="font-serif tracking-[0.3em] text-ink border border-ink/30 rounded-full px-6 py-2"
          onClick={onShare}
        >
          复制分享链接
        </button>
```

（`Props` 的 `onShare: () => void` 与 `AiPromptBox`、用神面板等其余部分均不变。）

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/components/ResultView.test.tsx`
Expected: PASS（原 6 + 新 1 = 7 个用例）

- [ ] **Step 5: 提交**

```bash
git add src/components/ResultView.tsx src/components/ResultView.test.tsx
git commit -m "feat: ResultView 分享按钮改「复制分享链接」"
```

---

## Task 6: App 装配分享链接（读链接 + 复制 + 底部 + 移除 PNG）

**Files:**
- Modify: `src/App.tsx`（整体替换，见 Step 3）
- Test: `src/App.test.tsx`（追加 2 个用例 + 顶部 import + afterEach 清 hash）

**Interfaces:**
- Consumes: `encodeShareLink`/`decodeShareLink` from `src/domain/share-link.ts`；`buildShareUrl`/`readShareParam` from `src/lib/share-url.ts`；`copyText` from `src/lib/clipboard.ts`；useCasting 的 `record`/`openShared`/`origin`。
- 行为：挂载时若 `readShareParam()` 有有效编码 → `openShared`（结果页 origin='shared'）。结果页「复制分享链接」→ 用当前 `record` 拼 URL → `copyText` → toast。底部按 origin 切按钮。移除 PNG 分享（不再 import `useShareImage`/`ShareCard`）。

- [ ] **Step 1: 写失败测试**

把 `src/App.test.tsx` 顶部 import 改为（新增 3 个 import；`afterEach`/`vi` 来自 vitest）：

```ts
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { sequenceRandom } from './domain/random'
import { encodeShareLink } from './domain/share-link'
import * as clip from './lib/clipboard'

afterEach(() => { window.location.hash = ''; vi.restoreAllMocks() })
```

在文件**末尾**（最外层，与现有 `describe('App 全流程（确定性）', …)` 并列）追加：

```ts
describe('App 分享链接', () => {
  const allYang = Array.from({ length: 6 }, () => ({ yinyang: 'yang' as const, moving: false }))

  it('打开分享链接 → 重建结果页，底部「去占一卦」', async () => {
    const enc = encodeShareLink({ question: '分享的问题', lines: allYang as never, createdAt: new Date('2026-06-16T12:00:00').getTime() })
    window.location.hash = '#s=' + enc
    render(<App />)
    expect(await screen.findByText(/分享的问题/)).toBeInTheDocument()
    expect(await screen.findByText(/卦辞/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /去 占 一 卦/ })).toBeInTheDocument()
  })

  it('起卦后点「复制分享链接」→ copyText 收到含 #s= 的 URL，toast 链接已复制', async () => {
    const spy = vi.spyOn(clip, 'copyText').mockResolvedValue(true)
    render(<App rng={sequenceRandom([1, 1, 1])} />)
    await userEvent.type(screen.getByRole('textbox'), '复制测试')
    await userEvent.click(screen.getByRole('button', { name: '诚心摇卦' }))
    await userEvent.click(screen.getByRole('button', { name: /跳过/ }))
    await screen.findByText(/潜龙勿用/)
    await userEvent.click(screen.getByTestId('share-link-btn'))
    expect(spy).toHaveBeenCalled()
    expect(spy.mock.calls[0][0]).toContain('#s=')
    expect(await screen.findByText('链接已复制')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL（无 `share-link-btn` 触发的复制 / hash 打开无效——当前 App 仍是 PNG 分享）

- [ ] **Step 3: 整体替换实现**

`src/App.tsx` 全文替换为：

```tsx
import { useEffect, useState } from 'react'
import { useCasting } from './hooks/useCasting'
import { useCastRecords } from './hooks/useCastRecords'
import { QuestionInput } from './components/QuestionInput'
import { CastingStage } from './components/CastingStage'
import { ManualCast } from './components/ManualCast'
import { ResultView } from './components/ResultView'
import { HistoryView } from './components/HistoryView'
import { RandomSource } from './domain/random'
import { Clock } from './domain/clock'
import { encodeShareLink, decodeShareLink } from './domain/share-link'
import { buildShareUrl, readShareParam } from './lib/share-url'
import { copyText } from './lib/clipboard'

export default function App({ rng, clock }: { rng?: RandomSource; clock?: Clock } = {}) {
  const records = useCastRecords()
  const {
    phase, origin, record, pan, interpretation,
    submit, finishCasting, finishManual, openHistory, openRecord, openShared, reset,
  } = useCasting(rng, clock, records.add)
  const [toast, setToast] = useState<string | null>(null)

  // 打开分享链接：挂载时解码 hash → 重建结果页（无效则忽略，正常进首页）
  useEffect(() => {
    const param = readShareParam()
    if (!param) return
    const rec = decodeShareLink(param)
    if (rec) openShared(rec)
  }, [openShared])

  const handleShareLink = async () => {
    if (!record) return
    const url = buildShareUrl(
      encodeShareLink({ question: record.question, lines: record.lines, createdAt: record.createdAt }),
    )
    setToast((await copyText(url)) ? '链接已复制' : '复制失败，请手动复制')
  }

  const resultBack =
    origin === 'shared'
      ? { label: '去 占 一 卦', onClick: reset }
      : origin === 'history'
        ? { label: '← 返 回 记 录', onClick: openHistory }
        : { label: '再 占 一 卦', onClick: reset }

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
          <ResultView pan={pan} interpretation={interpretation} onShare={handleShareLink} />
          <button
            className="mt-8 text-xs text-ink/40 underline font-serif"
            onClick={() => { setToast(null); resultBack.onClick() }}
          >
            {resultBack.label}
          </button>
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

- [ ] **Step 4: 跑测试确认通过（全量）**

Run: `npm test`
Expected: PASS（原有 + 新增全绿；注意 `ShareCard`/`useShareImage` 的旧测试此刻仍在且通过，Task 7 再删）

- [ ] **Step 5: 提交**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat: App 装配分享链接（读 hash 打开 + 复制 + 底部按 origin），移除 PNG 分享调用"
```

---

## Task 7: 删除 PNG 分享死代码 + 移除 modern-screenshot 依赖

**Files:**
- Delete: `src/components/ShareCard.tsx`、`src/components/ShareCard.test.tsx`、`src/hooks/useShareImage.ts`、`src/hooks/useShareImage.test.ts`
- Modify: `package.json`（移除 `modern-screenshot`）、`package-lock.json`（由 npm 更新）

**Interfaces:**
- Consumes: 无（纯删除）。前置：Task 6 后 `App` 已不再 import 这些。

- [ ] **Step 1: 确认无引用后删除文件**

Run（应只剩注释或无命中）：
```bash
grep -rn "ShareCard\|useShareImage\|modern-screenshot" src
```
若仅 `App.test.tsx` 注释里出现 `ShareCard` 字样，先把该注释删掉/改写（编辑 `src/App.test.tsx` 第一处测试上方注释，去掉 “ShareCard 不渲染爻辞” 措辞，改为 “爻辞仅在 ResultView 出现”）。然后删文件：

```bash
git rm src/components/ShareCard.tsx src/components/ShareCard.test.tsx src/hooks/useShareImage.ts src/hooks/useShareImage.test.ts
```

- [ ] **Step 2: 移除依赖**

```bash
npm uninstall modern-screenshot
```
Expected: `package.json` 的 `dependencies` 不再含 `modern-screenshot`；`package-lock.json` 同步更新。

- [ ] **Step 3: 确认无残留引用**

Run: `grep -rn "ShareCard\|useShareImage\|modern-screenshot" src package.json`
Expected: 无命中（空输出）。

- [ ] **Step 4: 全量校验（测试 + 类型 + 构建）**

Run: `npm test && npx tsc -b && npm run build`
Expected: 单测全绿；`tsc -b` 退出 0；`vite build` 成功。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "refactor: 移除 PNG 分享（ShareCard/useShareImage + modern-screenshot 依赖）"
```

---

## Task 8: E2E 分享链接路径

**Files:**
- Modify: `tests/e2e/divination.spec.ts`（追加 1 个 test）

**Interfaces:**
- Consumes: 运行中的 App（`npm run e2e` 由 playwright 自动起 dev server，base 路径 `/shai/`）。

- [ ] **Step 1: 写 E2E 用例**（追加到 `tests/e2e/divination.spec.ts` 末尾）

```ts
test('分享链接：复制 → 打开链接重建结果页', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByRole('textbox').fill('分享链接测试')
  await page.getByRole('button', { name: '诚心摇卦' }).click()
  await page.getByRole('button', { name: /跳过/ }).click()
  await expect(page.getByText('卦辞')).toBeVisible()

  // 复制分享链接 → toast
  await page.getByTestId('share-link-btn').click()
  await expect(page.getByText('链接已复制')).toBeVisible()

  // 读出剪贴板里的链接，打开它 → 结果页重建 + 底部「去占一卦」
  const url = await page.evaluate(() => navigator.clipboard.readText())
  expect(url).toContain('#s=')
  await page.goto(url)
  await expect(page.getByText('分享链接测试')).toBeVisible()
  await expect(page.getByText('卦辞')).toBeVisible()
  await expect(page.getByRole('button', { name: /去 占 一 卦/ })).toBeVisible()
})
```

- [ ] **Step 2: 跑 E2E 确认通过**

Run: `npm run e2e`
Expected: PASS（原有 3 条 + 新 1 条）。

> 若环境授予剪贴板权限失败导致 `readText()` 抛错：保留 toast 断言（主路径），把读剪贴板+goto 段落降级为「跳过并在报告中说明」，不要伪造通过。

- [ ] **Step 3: 提交**

```bash
git add tests/e2e/divination.spec.ts
git commit -m "test: E2E 分享链接（复制 → 打开重建）"
```

---

## Self-Review 记录

**Spec coverage（spec §→task）：**
- §1.1 share-link encode/decode + 校验 → Task 1 ✓
- §1.2 share-url buildShareUrl/readShareParam → Task 2 ✓
- §1.3 clipboard copyText → Task 3 ✓
- §2 useCasting record/openShared/origin 'shared' → Task 4 ✓
- §3.1 ResultView 按钮（保留 onShare） → Task 5 ✓
- §3.2 App 读链接/复制/底部按 origin/移除 PNG → Task 6 ✓
- §3.3 删除 ShareCard/useShareImage + modern-screenshot → Task 7 ✓
- §5 测试 → 各 task 内 + Task 8 E2E ✓

**Placeholder scan：** 无 TBD/TODO；每个代码步骤均含完整代码。✓

**Type consistency：**
- payload 紧凑形 `{v,q,t,l}`（Task 1）与 decode 校验一致；`decodeShareLink → CastRecord`（`id:'shared'`、`mode:'cyber'`）与 `isCastRecord`（上一期）兼容。
- `SHARE_PARAM='s'`（Task 1）被 Task 2 `buildShareUrl`/`readShareParam` 消费。
- `useCasting` 新增 `record`/`openShared`（Task 4）被 Task 6 App 消费；`origin` 三态 `'cast'|'history'|'shared'` 与 App 底部三分支一致。
- `copyText(text)→Promise<boolean>`（Task 3）与 App `handleShareLink`（Task 6）一致。
- ResultView `onShare` prop 名（Task 5 保留）与 App 传 `onShare={handleShareLink}`（Task 6）一致——避免改名导致中间态构建破坏。

**构建绿不变量：** 每个 task 结束都保持 `tsc`/测试可过；Task 6 后 App 不再引用 ShareCard/useShareImage（其文件与测试仍在、仍过），Task 7 再安全删除——顺序保证任一提交点都可构建。
