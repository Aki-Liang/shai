# 六爻五期 · 手动摇卦 + AI 解卦 Prompt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 起卦页可选赛博/手动摇卦（手动逐爻录入三钱阴阳成卦），卦象页一键生成可复制的 AI 解卦 Prompt。

**Architecture:** 两个新纯函数（`manual-cast` 阴阳成爻、`ai-prompt` 拼 prompt）+ `reading` 加 `buildReadingFromHexagram` 接缝 + `useCasting` 加 manual 阶段 + 三个组件（QuestionInput 改模式、ManualCast 新、AiPromptBox 新）。沿用 immutable 与既有降级。

**Tech Stack:** Vite + React 18 + TS + Tailwind + Vitest + Playwright。

**参考规约：** `docs/superpowers/specs/2026-06-17-liuyao-phase5-manual-cast-ai-prompt-design.md`

**绿色门槛：** `npm test` 全绿；改 `.tsx`/类型的任务额外 `npm run build`（tsc）。

**关键既有：** `types.ts`（`Line`/`Hexagram=[Line×6]` 初→上/`Yinyang`）、`lines.ts`（`lineFromSum(6–9)`）、`casting.ts`（`castHexagram`/`changedHexagram`/`movingLineIndexes`）、`reading.ts`（`buildReading(q,rng)`/`CastReading`）、`interpret.ts`（`interpret(reading):Promise`）、`pan.ts`（`Pan`/`PanLine`）、`yongshen-analysis.ts`（`YongshenAnalysis`/`Source`）。

---

## 文件结构

**新增：** `domain/manual-cast.ts`、`domain/ai-prompt.ts`、`components/ManualCast.tsx`、`components/AiPromptBox.tsx`（各 .test）
**改动：** `domain/types.ts`(+CastMode)、`domain/reading.ts`、`hooks/useCasting.ts`、`components/QuestionInput.tsx`、`App.tsx`、`components/ResultView.tsx`、`tests/e2e/divination.spec.ts`

---

## Task P5-1: 手动成卦 `manual-cast.ts` + `CastMode`

**Files:** Create `src/domain/manual-cast.ts`、`src/domain/manual-cast.test.ts`；Modify `src/domain/types.ts`

- [ ] **Step 1: 写失败测试** `src/domain/manual-cast.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { lineFromCoins, manualHexagram, Coin } from './manual-cast'

describe('lineFromCoins（阴=2/阳=3）', () => {
  it('三阳 → 老阳动', () => expect(lineFromCoins(['阳', '阳', '阳'])).toEqual({ yinyang: 'yang', moving: true }))
  it('三阴 → 老阴动', () => expect(lineFromCoins(['阴', '阴', '阴'])).toEqual({ yinyang: 'yin', moving: true }))
  it('一阳 → 少阳', () => expect(lineFromCoins(['阴', '阴', '阳'])).toEqual({ yinyang: 'yang', moving: false }))
  it('二阳 → 少阴', () => expect(lineFromCoins(['阴', '阳', '阳'])).toEqual({ yinyang: 'yin', moving: false }))
})
describe('manualHexagram', () => {
  it('六爻成卦（rows[0]=初爻）', () => {
    const rows: [Coin, Coin, Coin][] = [
      ['阳', '阳', '阳'], ['阴', '阴', '阳'], ['阴', '阳', '阳'], ['阴', '阴', '阴'], ['阴', '阴', '阳'], ['阴', '阴', '阳'],
    ]
    const h = manualHexagram(rows)
    expect(h).toHaveLength(6)
    expect(h[0]).toEqual({ yinyang: 'yang', moving: true }) // 初爻老阳
    expect(h[3]).toEqual({ yinyang: 'yin', moving: true })  // 四爻老阴
  })
  it('行数非 6 抛错', () => expect(() => manualHexagram([['阳', '阳', '阳']])).toThrow(/六爻/))
})
```

- [ ] **Step 2: 跑失败** `npm test -- manual-cast` → FAIL

- [ ] **Step 3: 实现** `src/domain/manual-cast.ts`:
```ts
import { Line, Hexagram } from './types'
import { lineFromSum } from './lines'

export type Coin = '阴' | '阳'

/** 三钱（阴=2、阳=3）之和成爻 */
export function lineFromCoins(coins: [Coin, Coin, Coin]): Line {
  const sum = coins.reduce((s, c) => s + (c === '阳' ? 3 : 2), 0)
  return lineFromSum(sum)
}

/** 六爻各三钱 → 本卦（rows[0]=初爻，自下而上） */
export function manualHexagram(rows: ReadonlyArray<[Coin, Coin, Coin]>): Hexagram {
  if (rows.length !== 6) throw new Error(`manualHexagram: 需六爻，实得 ${rows.length}`)
  return rows.map(lineFromCoins) as Hexagram
}
```
并在 `src/domain/types.ts` 末尾追加：
```ts
/** 起卦方式：赛博(密码学随机) / 手动(逐爻录入) */
export type CastMode = 'cyber' | 'manual'
```

- [ ] **Step 4: 跑通过** `npm test -- manual-cast` → PASS

- [ ] **Step 5: 提交**
```bash
git add src/domain/manual-cast.ts src/domain/manual-cast.test.ts src/domain/types.ts
git commit -m "feat: 手动成卦 manual-cast（阴阳三钱）+ CastMode"
```

---

## Task P5-2: 接缝 `buildReadingFromHexagram`

**Files:** Modify `src/domain/reading.ts`、`src/domain/reading.test.ts`

- [ ] **Step 1: 追加失败测试** —— 在 `src/domain/reading.test.ts` 追加（顶部若无则补 `import { buildReadingFromHexagram } from './reading'`、`import { Hexagram } from './types'`）：
```ts
describe('buildReadingFromHexagram', () => {
  it('六阳静 → 乾为天，无变卦', () => {
    const lines = [0,0,0,0,0,0].map(() => ({ yinyang: 'yang', moving: false })) as unknown as Hexagram
    const r = buildReadingFromHexagram('问', lines)
    expect(r.primary.data.name).toContain('乾为天')
    expect(r.changed).toBeNull()
    expect(r.movingIndexes).toEqual([])
  })
  it('含动爻 → 有变卦与动爻下标', () => {
    const lines = [{ yinyang: 'yang', moving: true }, ...[0,0,0,0,0].map(() => ({ yinyang: 'yang', moving: false }))] as unknown as Hexagram
    const r = buildReadingFromHexagram('问', lines)
    expect(r.changed).not.toBeNull()
    expect(r.movingIndexes).toEqual([0])
  })
})
```

- [ ] **Step 2: 跑失败** `npm test -- reading` → FAIL（未定义）

- [ ] **Step 3: 实现** —— 改 `src/domain/reading.ts`：抽出组装为新函数，`buildReading` 复用：
```ts
export function buildReadingFromHexagram(question: string, primaryLines: Hexagram): CastReading {
  const changedLines = changedHexagram(primaryLines)
  return {
    question,
    primary: { lines: primaryLines, data: lookupHexagram(primaryLines) },
    changed: changedLines ? { lines: changedLines, data: lookupHexagram(changedLines) } : null,
    movingIndexes: movingLineIndexes(primaryLines),
  }
}

export function buildReading(question: string, rng: RandomSource): CastReading {
  return buildReadingFromHexagram(question, castHexagram(rng))
}
```

- [ ] **Step 4: 跑通过** `npm test -- reading` → PASS（既有 + 新增）

- [ ] **Step 5: 提交**
```bash
git add src/domain/reading.ts src/domain/reading.test.ts
git commit -m "refactor: reading 抽出 buildReadingFromHexagram"
```

---

## Task P5-3: AI Prompt `ai-prompt.ts`

**Files:** Create `src/domain/ai-prompt.ts`、`src/domain/ai-prompt.test.ts`

- [ ] **Step 1: 写失败测试** `src/domain/ai-prompt.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { buildAiPrompt } from './ai-prompt'
import { Pan } from './pan'
import { YongshenAnalysis } from './yongshen-analysis'

const L = (position: number, liushen: string, liuqin: string, zhi: string, wuxing: string, x: Partial<any> = {}) =>
  ({ position, liushen, liuqin, najia: { gan: '甲', zhi, wuxing }, yinyang: 'yang', moving: false, shi: false, ying: false, kong: false, ...x })

const pan = {
  reading: { question: '面试能成否', primary: { data: { name: '天风姤' } }, changed: { data: { name: '天山遯' } } },
  pillars: { year: '丙午', month: '甲午', day: '甲子', dayGan: '甲', xunKong: ['戌', '亥'] },
  palace: { trigram: '乾', element: '金', headLines: [] },
  lines: [
    L(1, '青龙', '父母', '丑', '土', { shi: true }),
    L(2, '朱雀', '官鬼', '亥', '水', { fushen: { position: 2, liuqin: '妻财', najia: { gan: '甲', zhi: '寅', wuxing: '木' } } }),
    L(3, '勾陈', '兄弟', '酉', '金'),
    L(4, '螣蛇', '父母', '午', '火', { ying: true }),
    L(5, '白虎', '兄弟', '申', '金', { moving: true, changed: { najia: { gan: '壬', zhi: '未', wuxing: '土' }, liuqin: '父母' } }),
    L(6, '玄武', '子孙', '戌', '土', { kong: true }),
  ],
  changedLines: [
    L(1, '青龙', '父母', '辰', '土'), L(2, '朱雀', '兄弟', '午', '火', { shi: true }), L(3, '勾陈', '子孙', '申', '金'),
    L(4, '螣蛇', '官鬼', '午', '火'), L(5, '白虎', '兄弟', '申', '金', { ying: true }), L(6, '玄武', '妻财', '戌', '土'),
  ],
} as unknown as Pan

const analysis = {
  target: '妻财', liuqin: '妻财', najia: { gan: '甲', zhi: '寅', wuxing: '木' }, position: 2, isFu: true, isShi: false, duplicate: null,
  wangshuai: '休', monthBreak: false, kong: false, wangshuaiReason: '寅木生午火泄气',
  sources: [
    { kind: '日', zhi: '子', wuxing: '水', force: { force: '得生', chong: false, he: false }, role: '元神', special: '主宰' },
    { kind: '动', position: 5, zhi: '申', wuxing: '金', force: { force: '受克', chong: true, he: false }, role: '忌神',
      strength: { wangshuai: '死', wangshuaiReason: '午火克申金', kong: false, monthBreak: false, influences: [], verdict: '无用', verdictReason: '失令受克' } },
  ],
} as unknown as YongshenAnalysis

describe('buildAiPrompt', () => {
  it('含各段', () => {
    const p = buildAiPrompt(pan, analysis)
    expect(p).toMatch(/所问：面试能成否/)
    expect(p).toMatch(/丙午年 甲午月 甲子日（旬空 戌亥）/)
    expect(p).toMatch(/卦宫：乾金宫/)
    expect(p).toMatch(/本卦：天风姤　变卦：天山遯/)
    expect(p).toMatch(/上爻 玄武 子孙戌土 旬空/)
    expect(p).toMatch(/五爻 白虎 兄弟申金 ○动 →父母未土/)
    expect(p).toMatch(/变卦（上爻→初爻）/)
    expect(p).toMatch(/用神：妻财寅木（2爻·伏神） 旺衰休·寅木生午火泄气/)
    expect(p).toMatch(/元神 日辰子水 得生·主宰/)
    expect(p).toMatch(/忌神 动爻5申金 冲受克·死 无用（失令受克）/)
    expect(p).toMatch(/请按六爻（京房纳甲）规则/)
  })
  it('pillars=null → 时间降级', () => {
    expect(buildAiPrompt({ ...pan, pillars: null } as unknown as Pan, analysis)).toMatch(/时间：信息暂不可用/)
  })
  it('analysis=null → 无用神段', () => {
    expect(buildAiPrompt(pan, null)).not.toMatch(/用神：/)
  })
})
```

- [ ] **Step 2: 跑失败** `npm test -- ai-prompt` → FAIL

- [ ] **Step 3: 实现** `src/domain/ai-prompt.ts`:
```ts
import { Pan, PanLine } from './pan'
import { YongshenAnalysis, Source } from './yongshen-analysis'

const YAO_NAMES = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻']
const yaoName = (pos: number): string => YAO_NAMES[pos - 1] ?? `${pos}爻`

const SRC_LABEL: Record<string, string> = { 月: '月建', 日: '日辰', 飞: '飞神' }
function srcLabel(s: Source): string {
  if (s.kind === '动') return `动爻${s.position}`
  if (s.kind === '变') return `变爻${s.position}`
  return SRC_LABEL[s.kind] ?? s.kind
}

function lineText(l: PanLine): string {
  let s = [yaoName(l.position), l.liushen ?? '', `${l.liuqin}${l.najia.zhi}${l.najia.wuxing}`].filter(Boolean).join(' ')
  const marks = [l.shi ? '世' : '', l.ying ? '应' : '', l.moving ? '○动' : '', l.kong ? '旬空' : ''].filter(Boolean)
  if (marks.length) s += ' ' + marks.join(' ')
  if (l.fushen) s += ` 伏:${l.fushen.liuqin}${l.fushen.najia.zhi}${l.fushen.najia.wuxing}`
  if (l.changed) s += ` →${l.changed.liuqin}${l.changed.najia.zhi}${l.changed.najia.wuxing}`
  return s
}

/** 拼装可喂任意 AI 的中文解卦 prompt */
export function buildAiPrompt(pan: Pan, analysis: YongshenAnalysis | null): string {
  const { reading, pillars, palace, lines, changedLines } = pan
  const out: string[] = ['【六爻起卦】', `所问：${reading.question}`]
  out.push(pillars
    ? `时间：${pillars.year}年 ${pillars.month}月 ${pillars.day}日（旬空 ${pillars.xunKong[0]}${pillars.xunKong[1]}）`
    : '时间：信息暂不可用')
  out.push(`卦宫：${palace.trigram}${palace.element}宫`)
  out.push(`本卦：${reading.primary.data.name}${reading.changed ? `　变卦：${reading.changed.data.name}` : ''}`)

  out.push('', '排盘（上爻→初爻）：')
  ;[...lines].reverse().forEach((l) => out.push('　' + lineText(l)))

  if (changedLines) {
    out.push('', '变卦（上爻→初爻）：')
    ;[...changedLines].reverse().forEach((l) => {
      const m = [l.shi ? '世' : '', l.ying ? '应' : ''].filter(Boolean).join('')
      out.push(`　${yaoName(l.position)} ${l.liuqin}${l.najia.zhi}${l.najia.wuxing}${m ? ' ' + m : ''}`)
    })
  }

  if (analysis) {
    const a = analysis
    out.push('', `用神：${a.liuqin}${a.najia.zhi}${a.najia.wuxing}（${a.position}爻${a.isFu ? '·伏神' : ''}${a.isShi ? '·世' : ''}${a.duplicate ? `·两现取${a.duplicate.picked}爻` : ''}） 旺衰${a.wangshuai ?? '—'}${a.wangshuaiReason ? `·${a.wangshuaiReason}` : ''}${a.monthBreak ? '·月破' : ''}`)
    a.sources.filter((s) => s.role).forEach((s) => {
      const ch = s.force.chong ? '冲' : s.force.he ? '合' : ''
      const tail = s.special ? `·${s.special}` : s.strength ? `·${s.strength.wangshuai} ${s.strength.verdict}（${s.strength.verdictReason}）` : ''
      out.push(`　${s.role} ${srcLabel(s)}${s.zhi}${s.wuxing} ${ch}${s.force.force}${tail}`)
    })
  }

  out.push('', '请按六爻（京房纳甲）规则，结合用神旺衰与生克冲合解此卦，给出吉凶与建议。')
  return out.join('\n')
}
```

- [ ] **Step 4: 跑通过** `npm test -- ai-prompt` → PASS（3 例）

- [ ] **Step 5: 提交**
```bash
git add src/domain/ai-prompt.ts src/domain/ai-prompt.test.ts
git commit -m "feat: AI 解卦 prompt 生成 ai-prompt"
```

---

## Task P5-4: 状态机 `useCasting`（+manual 阶段）

**Files:** Modify `src/hooks/useCasting.ts`、`src/hooks/useCasting.test.ts`

`submit` 加默认 mode（保既有用例绿），加 `finishManual`，phase 加 `'manual'`。

- [ ] **Step 1: 追加失败测试** —— 在 `src/hooks/useCasting.test.ts` 的 `describe` 内追加：
```ts
  it('submit(manual) → manual；finishManual → result', async () => {
    const { result } = renderHook(() => useCasting(sequenceRandom([1, 1, 1])))
    act(() => result.current.submit('问', 'manual'))
    expect(result.current.phase).toBe('manual')
    const lines = Array.from({ length: 6 }, () => ({ yinyang: 'yang', moving: false }))
    await act(async () => { await result.current.finishManual(lines as never) })
    expect(result.current.phase).toBe('result')
    expect(result.current.interpretation?.primaryName).toContain('乾为天')
  })
```

- [ ] **Step 2: 跑失败** `npm test -- useCasting` → FAIL（finishManual 未定义）

- [ ] **Step 3: 实现** —— 改 `src/hooks/useCasting.ts`：
- 顶部导入补：`import { CastMode, Hexagram } from '../domain/types'`、`import { buildReading, buildReadingFromHexagram, CastReading } from '../domain/reading'`（`CastReading` 若已导入则合并）。
- `type Phase = 'input' | 'casting' | 'manual' | 'result'`。
- 改 `submit`：
```ts
  const submit = useCallback((q: string, mode: CastMode = 'cyber') => {
    setQuestion(q)
    setPhase(mode === 'manual' ? 'manual' : 'casting')
  }, [])
```
- 加 `finishManual`（置于 `finishCasting` 之后）：
```ts
  const finishManual = useCallback(async (primaryLines: Hexagram) => {
    const r = buildReadingFromHexagram(question, primaryLines)
    setReading(r)
    setPan(buildPan(r, clock.now()))
    setInterpretation(await interpret(r))
    setPhase('result')
  }, [question, clock])
```
- 返回对象加 `finishManual`：`return { phase, reading, pan, interpretation, submit, finishCasting, finishManual, reset }`。

- [ ] **Step 4: 跑通过 + build** `npm test && npm run build` → 全绿

- [ ] **Step 5: 提交**
```bash
git add src/hooks/useCasting.ts src/hooks/useCasting.test.ts
git commit -m "feat: useCasting 加手动阶段 finishManual"
```

---

## Task P5-5: `QuestionInput` 加模式选择

**Files:** Modify `src/components/QuestionInput.tsx`、`src/components/QuestionInput.test.tsx`（整测试替换）

- [ ] **Step 1: 替换测试** `src/components/QuestionInput.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuestionInput } from './QuestionInput'

describe('QuestionInput', () => {
  it('默认赛博：提交带 cyber', async () => {
    const onSubmit = vi.fn()
    render(<QuestionInput onSubmit={onSubmit} />)
    await userEvent.type(screen.getByRole('textbox'), '我该换工作吗？')
    await userEvent.click(screen.getByRole('button', { name: '诚心摇卦' }))
    expect(onSubmit).toHaveBeenCalledWith('我该换工作吗？', 'cyber')
  })
  it('选手动：CTA 变手动起卦，提交带 manual', async () => {
    const onSubmit = vi.fn()
    render(<QuestionInput onSubmit={onSubmit} />)
    await userEvent.type(screen.getByRole('textbox'), '问')
    await userEvent.click(screen.getByTestId('mode-manual'))
    await userEvent.click(screen.getByRole('button', { name: '手动起卦' }))
    expect(onSubmit).toHaveBeenCalledWith('问', 'manual')
  })
  it('? 折叠模式说明', async () => {
    render(<QuestionInput onSubmit={vi.fn()} />)
    expect(screen.queryByText(/密码学随机/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '?' }))
    expect(screen.getByText(/密码学随机/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑失败** `npm test -- QuestionInput` → FAIL

- [ ] **Step 3: 整文件替换** `src/components/QuestionInput.tsx`:
```tsx
import { useState } from 'react'
import { CastMode } from '../domain/types'

interface Props {
  onSubmit: (question: string, mode: CastMode) => void
}

export function QuestionInput({ onSubmit }: Props) {
  const [value, setValue] = useState('')
  const [mode, setMode] = useState<CastMode>('cyber')
  const [showHint, setShowHint] = useState(false)
  const trimmed = value.trim()
  const valid = trimmed.length > 0

  return (
    <div className="flex flex-col items-center gap-6 px-6 w-full max-w-md mx-auto">
      <h1 className="font-serif text-2xl text-ink">心有所问</h1>
      <label className="w-full">
        <span className="block text-xs text-ink/50 mb-2 font-serif">写下你想问的事</span>
        <textarea
          className="w-full bg-transparent border-b border-ink/20 text-ink font-serif p-2 outline-none focus:border-ink/50 resize-none"
          rows={2}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="心诚则灵…"
        />
      </label>
      <div className="flex items-center gap-2 font-serif">
        {(['cyber', 'manual'] as CastMode[]).map((m) => (
          <button
            key={m}
            data-testid={`mode-${m}`}
            onClick={() => setMode(m)}
            className={`text-xs rounded-full px-3 py-1 border ${
              mode === m ? 'bg-seal text-white border-seal' : 'border-ink/20 text-ink-soft'
            }`}
          >
            {m === 'cyber' ? '赛博摇卦' : '手动摇卦'}
          </button>
        ))}
        <button
          onClick={() => setShowHint((s) => !s)}
          className="text-[10px] text-ink/40 border border-ink/20 rounded-full w-4 h-4 leading-none"
        >
          ?
        </button>
      </div>
      {showHint && (
        <p className="text-[10px] text-ink/50 font-serif text-center max-w-xs leading-relaxed">
          赛博＝密码学随机自动起卦 · 手动＝自己摇铜钱逐爻录入
        </p>
      )}
      {!valid && <p className="text-xs text-seal/80 font-serif">心诚则灵，先写下所问</p>}
      <button
        className="font-serif tracking-[0.3em] text-ink border border-ink/30 rounded-full px-6 py-2 disabled:opacity-30 disabled:cursor-not-allowed"
        disabled={!valid}
        onClick={() => valid && onSubmit(trimmed, mode)}
      >
        {mode === 'cyber' ? '诚心摇卦' : '手动起卦'}
      </button>
    </div>
  )
}
```

- [ ] **Step 4: 跑通过 + build** `npm test -- QuestionInput && npm run build` → 全绿

- [ ] **Step 5: 提交**
```bash
git add src/components/QuestionInput.tsx src/components/QuestionInput.test.tsx
git commit -m "feat: QuestionInput 加赛博/手动模式选择"
```

---

## Task P5-6: `ManualCast` 逐爻录入组件

**Files:** Create `src/components/ManualCast.tsx`、`src/components/ManualCast.test.tsx`

- [ ] **Step 1: 写失败测试** `src/components/ManualCast.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ManualCast } from './ManualCast'

describe('ManualCast', () => {
  it('未填满成卦禁用；填满启用并回传初→上 Hexagram', async () => {
    const onComplete = vi.fn()
    render(<ManualCast onComplete={onComplete} />)
    const make = screen.getByTestId('make-hexagram')
    expect(make).toBeDisabled()
    const yang = screen.getAllByRole('button', { name: '阳' })
    expect(yang).toHaveLength(18)
    for (const b of yang) await userEvent.click(b)
    expect(make).toBeEnabled()
    await userEvent.click(make)
    const lines = onComplete.mock.calls[0][0]
    expect(lines).toHaveLength(6)
    expect(lines.every((l: { yinyang: string; moving: boolean }) => l.yinyang === 'yang' && l.moving)).toBe(true)
  })
  it('三钱齐显示爻象（全阳→老阳）', async () => {
    render(<ManualCast onComplete={vi.fn()} />)
    const yang = screen.getAllByRole('button', { name: '阳' })
    for (const b of yang.slice(0, 3)) await userEvent.click(b)
    expect(screen.getAllByText('老阳').length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: 跑失败** `npm test -- ManualCast` → FAIL（组件不存在）

- [ ] **Step 3: 实现** `src/components/ManualCast.tsx`:
```tsx
import { useState } from 'react'
import { Hexagram } from '../domain/types'
import { Coin, lineFromCoins, manualHexagram } from '../domain/manual-cast'

interface Props {
  onComplete: (lines: Hexagram) => void
}

const YAO_NAMES = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻']

function yaoSymbol(coins: (Coin | null)[]) {
  if (coins.some((c) => c === null)) return null
  const line = lineFromCoins(coins as [Coin, Coin, Coin])
  const name = line.yinyang === 'yang' ? (line.moving ? '老阳' : '少阳') : line.moving ? '老阴' : '少阴'
  const mark = line.moving ? (line.yinyang === 'yang' ? '○' : '×') : ''
  return { line, name, mark }
}

export function ManualCast({ onComplete }: Props) {
  const [coins, setCoins] = useState<(Coin | null)[][]>(() => Array.from({ length: 6 }, () => [null, null, null]))
  const setCoin = (yao: number, idx: number, v: Coin) =>
    setCoins((prev) => prev.map((row, y) => (y === yao ? row.map((c, i) => (i === idx ? v : c)) : row)))
  const complete = coins.every((row) => row.every((c) => c !== null))

  return (
    <div data-testid="manual-cast" className="flex flex-col items-center gap-3 px-4 w-full max-w-md mx-auto font-serif">
      <h1 className="text-xl text-ink">手动摇卦</h1>
      <div className="text-[11px] text-ink-soft bg-paper-2 rounded-lg p-3 leading-relaxed max-w-sm">
        取三枚铜钱合掌摇动，<span className="text-seal">自初爻起</span>共六次。摇前自定：哪一面为
        <span className="text-seal">阳</span>、哪一面为<span className="text-seal">阴</span>（全程一致）。
        每掷如实点选三枚 → 自动成爻：三阳老阳(动)·三阴老阴(动)·一阳少阳·二阳少阴。
      </div>
      <div className="flex flex-col gap-1 w-full max-w-sm">
        {[5, 4, 3, 2, 1, 0].map((yao) => {
          const sym = yaoSymbol(coins[yao])
          return (
            <div
              key={yao}
              data-testid="manual-yao"
              className="grid grid-cols-[2.4rem_1fr_3.6rem] items-center gap-2 py-1 border-t border-ink/5 first:border-t-0"
            >
              <span className="text-xs text-ink-soft">{YAO_NAMES[yao]}</span>
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex border border-ink/20 rounded overflow-hidden text-[11px]">
                    {(['阴', '阳'] as Coin[]).map((v) => (
                      <button
                        key={v}
                        onClick={() => setCoin(yao, i, v)}
                        className={`px-2 py-0.5 ${
                          coins[yao][i] === v ? (v === '阳' ? 'bg-ink text-paper' : 'bg-ink-soft text-paper') : 'text-ink-soft'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              <span className="flex items-center justify-end gap-1 text-xs">
                {sym ? (
                  <>
                    <span className="text-seal w-2">{sym.mark}</span>
                    {sym.line.yinyang === 'yang' ? (
                      <span className="block h-2 w-7 bg-current rounded-sm" />
                    ) : (
                      <span className="flex gap-1">
                        <span className="block h-2 w-3 bg-current rounded-sm" />
                        <span className="block h-2 w-3 bg-current rounded-sm" />
                      </span>
                    )}
                    <span className="text-[10px] text-ink-soft">{sym.name}</span>
                  </>
                ) : (
                  <span className="text-[10px] text-ink/30">待填</span>
                )}
              </span>
            </div>
          )
        })}
      </div>
      <button
        data-testid="make-hexagram"
        disabled={!complete}
        onClick={() => onComplete(manualHexagram(coins.map((r) => [r[0]!, r[1]!, r[2]!] as [Coin, Coin, Coin])))}
        className="mt-2 font-serif tracking-[0.3em] text-ink border border-ink/30 rounded-full px-6 py-2 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {complete ? '成 卦' : '成 卦（待填满）'}
      </button>
    </div>
  )
}
```

- [ ] **Step 4: 跑通过 + build** `npm test -- ManualCast && npm run build` → 全绿

- [ ] **Step 5: 提交**
```bash
git add src/components/ManualCast.tsx src/components/ManualCast.test.tsx
git commit -m "feat: ManualCast 手动逐爻录入成卦"
```

---

## Task P5-7: `AiPromptBox` 生成+复制组件

**Files:** Create `src/components/AiPromptBox.tsx`、`src/components/AiPromptBox.test.tsx`

- [ ] **Step 1: 写失败测试** `src/components/AiPromptBox.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AiPromptBox } from './AiPromptBox'
import { Pan } from '../domain/pan'

const pan = {
  reading: { question: '问', primary: { data: { name: '乾为天' } }, changed: null },
  pillars: { year: '丙午', month: '甲午', day: '甲子', dayGan: '甲', xunKong: ['戌', '亥'] },
  palace: { trigram: '乾', element: '金', headLines: [] },
  lines: [{ position: 1, liushen: '青龙', liuqin: '父母', najia: { gan: '甲', zhi: '子', wuxing: '水' }, yinyang: 'yang', moving: false, shi: true, ying: false, kong: false }],
  changedLines: null,
} as unknown as Pan

describe('AiPromptBox', () => {
  it('点按钮展开 prompt 文本框含关键段', async () => {
    render(<AiPromptBox pan={pan} analysis={null} />)
    expect(screen.queryByTestId('ai-prompt-text')).not.toBeInTheDocument()
    await userEvent.click(screen.getByTestId('ai-prompt-btn'))
    const ta = screen.getByTestId('ai-prompt-text') as HTMLTextAreaElement
    expect(ta.value).toMatch(/【六爻起卦】/)
    expect(ta.value).toMatch(/请按六爻/)
  })
  it('一键复制调用 clipboard，显已复制', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    render(<AiPromptBox pan={pan} analysis={null} />)
    await userEvent.click(screen.getByTestId('ai-prompt-btn'))
    await userEvent.click(screen.getByTestId('ai-prompt-copy'))
    expect(writeText).toHaveBeenCalled()
    expect(await screen.findByText('已复制')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑失败** `npm test -- AiPromptBox` → FAIL

- [ ] **Step 3: 实现** `src/components/AiPromptBox.tsx`:
```tsx
import { useMemo, useState } from 'react'
import { Pan } from '../domain/pan'
import { YongshenAnalysis } from '../domain/yongshen-analysis'
import { buildAiPrompt } from '../domain/ai-prompt'

interface Props {
  pan: Pan
  analysis: YongshenAnalysis | null
}

export function AiPromptBox({ pan, analysis }: Props) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null)
  const prompt = useMemo(() => buildAiPrompt(pan, analysis), [pan, analysis])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied('ok')
    } catch {
      setCopied('fail')
    }
  }

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <button
        data-testid="ai-prompt-btn"
        onClick={() => setOpen((o) => !o)}
        className="font-serif tracking-[0.2em] text-ink border border-ink/30 rounded-full px-5 py-2"
      >
        生成解卦 Prompt
      </button>
      {open && (
        <div className="w-full max-w-sm flex flex-col items-center gap-2">
          <textarea
            data-testid="ai-prompt-text"
            readOnly
            value={prompt}
            className="w-full h-44 bg-paper-2 border border-ink/15 rounded-lg p-2 text-[10px] leading-relaxed text-ink font-mono resize-none"
          />
          <button
            data-testid="ai-prompt-copy"
            onClick={copy}
            className="text-xs tracking-[0.2em] text-seal border border-seal rounded-full px-4 py-1"
          >
            {copied === 'ok' ? '已复制' : copied === 'fail' ? '请手动选中复制' : '一键复制'}
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: 跑通过 + build** `npm test -- AiPromptBox && npm run build` → 全绿

- [ ] **Step 5: 提交**
```bash
git add src/components/AiPromptBox.tsx src/components/AiPromptBox.test.tsx
git commit -m "feat: AiPromptBox 生成解卦 prompt + 一键复制"
```

---

## Task P5-8: 装配 `App` + `ResultView`

**Files:** Modify `src/App.tsx`、`src/components/ResultView.tsx`

- [ ] **Step 1: 改 App** `src/App.tsx`:
- 顶部加 `import { ManualCast } from './components/ManualCast'`。
- 解构加 `finishManual`：`const { phase, pan, interpretation, submit, finishCasting, finishManual, reset } = useCasting(rng, clock)`。
- 在 `{phase === 'casting' && ...}` 行之后加：
```tsx
      {phase === 'manual' && <ManualCast onComplete={finishManual} />}
```
（`QuestionInput onSubmit={submit}` 不变——`submit` 已接 `(q, mode)`。）

- [ ] **Step 2: 改 ResultView** `src/components/ResultView.tsx`:
- 顶部加 `import { AiPromptBox } from './AiPromptBox'`。
- 把现有「生成分享图」按钮替换为按钮组（AiPromptBox + 分享）：
```tsx
      <div className="flex flex-col items-center gap-3 w-full mt-2">
        <AiPromptBox pan={pan} analysis={analysis} />
        <button
          className="font-serif tracking-[0.3em] text-ink border border-ink/30 rounded-full px-6 py-2"
          onClick={onShare}
        >
          生成分享图
        </button>
      </div>
```
（`analysis` 为 ResultView 现有局部变量 `yong ? buildYongshenAnalysis(pan, yong) : null`。）

- [ ] **Step 3: 跑全量 + build** `npm test && npm run build` → 全绿
> App.test / ResultView.test 若因结构微调失败，调整查询方式（勿削弱原意）；ResultView 渲染会触发 `buildAiPrompt`，既有 ResultView.test 的 pan mock 字段足够（reading/pillars/palace/lines/changedLines 均在）。

- [ ] **Step 4: 提交**
```bash
git add src/App.tsx src/components/ResultView.tsx
git commit -m "feat: 装配手动起卦路由 + 卦象页 AI prompt"
```

---

## Task P5-9: E2E + 终审

**Files:** Modify `tests/e2e/divination.spec.ts`

- [ ] **Step 1: 改 E2E** `tests/e2e/divination.spec.ts`:
- 既有 happy-path 里点击摇卦的那行 `page.getByRole('button', { name: /摇卦/ })` 改为精确名（避免与「赛博摇卦/手动摇卦」胶囊冲突）：
```ts
  await page.getByRole('button', { name: '诚心摇卦' }).click()
```
- 在该用例末尾（分享按钮断言后）追加：生成 prompt 可展开：
```ts
  await page.getByTestId('ai-prompt-btn').click()
  await expect(page.getByTestId('ai-prompt-text')).toBeVisible()
```
- 文件末尾追加手动摇卦用例：
```ts
test('手动摇卦：逐爻录入成卦出排盘', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox').fill('手动测试')
  await page.getByTestId('mode-manual').click()
  await page.getByRole('button', { name: '手动起卦' }).click()
  await expect(page.getByTestId('manual-cast')).toBeVisible()
  for (const b of await page.getByRole('button', { name: '阳' }).all()) await b.click()
  await page.getByTestId('make-hexagram').click()
  await expect(page.getByTestId('pan-row').first()).toBeVisible()
})
```

- [ ] **Step 2: 跑全部门槛** `npm test && npm run build && npm run e2e` → 全绿

- [ ] **Step 3: 提交**
```bash
git add tests/e2e/divination.spec.ts
git commit -m "test: E2E 修起卦选择器 + 手动摇卦路径 + prompt 展开"
```

- [ ] **Step 4: 终审** 派 opus code-reviewer 全量复审五期（`git diff main..HEAD -- src tests`）：阴阳→爻映射对齐 `lineFromSum`、prompt 各段与降级、immutable、类型一致、剪贴板兜底、死代码。修 CRITICAL/HIGH。

---

## 自检（spec 覆盖）

| spec 要求 | 任务 |
|---|---|
| §1.1 阴阳成爻 / §0.2 | P5-1 |
| §1.2 buildReadingFromHexagram | P5-2 |
| §1.3 AI prompt 各段 + 降级 | P5-3 |
| §3 useCasting manual/finishManual | P5-4 |
| §2.1 模式选择 + 折叠说明 / §0.4 | P5-5 |
| §2.2 ManualCast 上→初 + 实时爻象 / §0.3 | P5-6 |
| §2.3 AiPromptBox 展开+复制兜底 / §0.6 | P5-7 |
| §2.4 / §4 装配 | P5-8 |
| §5 测试 / §6 E2E | 各任务 + P5-9 |
