# 六爻四期 · 元神/忌神 + 力量评估 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 作用源中标元神/忌神，对动/变/飞元忌做「子用神」力量评估（月/日/月破/动爻/空 影响 + 有力/无用），用神旺衰补缘由。

**Architecture:** 两个新纯函数（`wangshuai-reason` 缘由句、`yao-strength` 爻力量评估）+ 扩展 `yongshen-analysis`（给 Source 加 role/special/strength、给用神加缘由）+ `YongshenPanel` 改两行制渲染力量。沿用 immutable（只造新对象）与三期降级。

**Tech Stack:** Vite + React 18 + TS + Tailwind + Vitest + Playwright。

**参考规约：** `docs/superpowers/specs/2026-06-17-liuyao-phase4-yuanshen-jishen-design.md`

**绿色门槛：** `npm test` 全绿；改 `.tsx`/类型的任务额外 `npm run build`（tsc）全绿。

**已有可复用：** `wuxing.ts`（`DiZhi`/`WuXing`/`zhiWuxing`/`generates`/`controls`）、`chonghe.ts`（`chong`/`he`）、`wangshuai.ts`（`wangShuaiOf`/`WangShuai`）、`pan.ts`（`PanLine`/`Pan`）、`najia.ts`（`NaJia`）、`yongshen-analysis.ts`（`buildYongshenAnalysis`/`Source`/`YongshenAnalysis`/`SourceKind`）。

---

## 文件结构

**新增：** `src/domain/wangshuai-reason.ts`、`src/domain/yao-strength.ts`（各 .test）
**改动：** `src/domain/yongshen-analysis.ts`（+role/special/strength/用神缘由）、其 .test；`src/components/YongshenPanel.tsx`（两行制）、其 .test

---

## Task P4-1: 旺衰缘由 `wangshuai-reason.ts`

**Files:** Create `src/domain/wangshuai-reason.ts`、`src/domain/wangshuai-reason.test.ts`

- [ ] **Step 1: 写失败测试** `src/domain/wangshuai-reason.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { wangshuaiReasonOf } from './wangshuai-reason'

// 午（火）月
describe('wangshuaiReasonOf（午月）', () => {
  it('旺 → 当令', () => expect(wangshuaiReasonOf('巳', '午')).toBe('当令'))
  it('相 → 月生', () => expect(wangshuaiReasonOf('未', '午')).toBe('午火生未土'))
  it('休 → 生月泄气', () => expect(wangshuaiReasonOf('寅', '午')).toBe('寅木生午火泄气'))
  it('囚 → 克月受制', () => expect(wangshuaiReasonOf('子', '午')).toBe('子水克午火受制'))
  it('死 → 月克', () => expect(wangshuaiReasonOf('申', '午')).toBe('午火克申金'))
})
```

- [ ] **Step 2: 跑失败** `npm test -- wangshuai-reason` → FAIL（未定义）

- [ ] **Step 3: 实现** `src/domain/wangshuai-reason.ts`:
```ts
import { DiZhi, zhiWuxing } from './wuxing'
import { wangShuaiOf } from './wangshuai'

/** 旺衰缘由：X 侧 {地支}{五行}，月侧 {月支}{五行} */
export function wangshuaiReasonOf(zhi: DiZhi, monthZhi: DiZhi): string {
  const w = zhiWuxing(zhi)
  const m = zhiWuxing(monthZhi)
  const X = `${zhi}${w}`
  const M = `${monthZhi}${m}`
  const ws = wangShuaiOf(w, monthZhi)
  if (ws === '旺') return '当令'
  if (ws === '相') return `${M}生${X}`
  if (ws === '休') return `${X}生${M}泄气`
  if (ws === '囚') return `${X}克${M}受制`
  return `${M}克${X}` // 死
}
```

- [ ] **Step 4: 跑通过** `npm test -- wangshuai-reason` → PASS

- [ ] **Step 5: 提交**
```bash
git add src/domain/wangshuai-reason.ts src/domain/wangshuai-reason.test.ts
git commit -m "feat: 旺衰缘由 wangshuai-reason"
```

---

## Task P4-2: 爻力量评估 `yao-strength.ts`

**Files:** Create `src/domain/yao-strength.ts`、`src/domain/yao-strength.test.ts`
依赖：wuxing / chonghe / wangshuai / wangshuai-reason / pan / najia

- [ ] **Step 1: 写失败测试** `src/domain/yao-strength.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { assessYaoStrength, YaoStrengthCtx, YaoTarget } from './yao-strength'
import { PanLine } from './pan'
import { DiZhi, zhiWuxing } from './wuxing'

function mover(position: number, zhi: DiZhi): PanLine {
  return { position, liushen: null, liuqin: '兄弟', najia: { gan: '甲', zhi, wuxing: zhiWuxing(zhi) }, yinyang: 'yang', moving: true, shi: false, ying: false, kong: false }
}
function target(zhi: DiZhi, extra: Partial<YaoTarget> = {}): YaoTarget {
  return { zhi, wuxing: zhiWuxing(zhi), position: extra.position ?? 3, moving: extra.moving ?? false, changed: extra.changed }
}
// 午月 / 默认子日 / 旬空戌亥
const base = (over: Partial<YaoStrengthCtx> = {}): YaoStrengthCtx => ({ monthZhi: '午', dayZhi: '子', xunKong: ['戌', '亥'], movingLines: [], ...over })

describe('assessYaoStrength', () => {
  it('得令旺相 → 有力', () => {
    const r = assessYaoStrength(target('巳'), base()) // 巳火午月旺
    expect(r.wangshuai).toBe('旺')
    expect(r.verdict).toBe('有力')
  })
  it('失令但临日 → 有力（日扶）', () => {
    const r = assessYaoStrength(target('申'), base({ dayZhi: '申' })) // 申金死；临日辰申
    expect(r.verdict).toBe('有力')
    expect(r.influences.some((i) => i.kind === '日' && i.helps === true)).toBe(true)
  })
  it('失令被动爻克且无扶 → 无用', () => {
    const r = assessYaoStrength(target('申'), base({ movingLines: [mover(5, '午')] })) // 申金死；午火动克金
    expect(r.wangshuai).toBe('死')
    expect(r.verdict).toBe('无用')
    expect(r.influences.some((i) => i.kind === '动' && i.helps === false)).toBe(true)
  })
  it('真空亡（休囚+静+不被日冲）→ 无用', () => {
    const r = assessYaoStrength(target('亥'), base()) // 亥水囚；旬空；静；子不冲亥
    expect(r.kong).toBe(true)
    expect(r.verdict).toBe('无用')
    expect(r.influences.some((i) => i.kind === '空' && i.text === '真空')).toBe(true)
  })
  it('假空：旬空但发动 → 不致命（有力）', () => {
    const r = assessYaoStrength(target('亥', { moving: true }), base())
    expect(r.influences.some((i) => i.kind === '空' && i.text === '假空')).toBe(true)
    expect(r.verdict).toBe('有力')
  })
  it('月破失令且静 → 无用', () => {
    const r = assessYaoStrength(target('子'), base({ dayZhi: '寅' })) // 子水囚；午冲子月破；静
    expect(r.monthBreak).toBe(true)
    expect(r.verdict).toBe('无用')
    expect(r.influences.some((i) => i.kind === '月' && i.text === '月破')).toBe(true)
  })
})
```

- [ ] **Step 2: 跑失败** `npm test -- yao-strength` → FAIL（未定义）

- [ ] **Step 3: 实现** `src/domain/yao-strength.ts`:
```ts
import { PanLine } from './pan'
import { NaJia } from './najia'
import { DiZhi, WuXing, zhiWuxing, generates, controls } from './wuxing'
import { chong, he } from './chonghe'
import { wangShuaiOf, WangShuai } from './wangshuai'
import { wangshuaiReasonOf } from './wangshuai-reason'

export type StrengthVerdict = '有力' | '无用'

export interface StrengthInfluence {
  kind: '月' | '日' | '动' | '空' | '回头'
  position?: number
  text: string
  helps: boolean | null
}

export interface YaoStrength {
  wangshuai: WangShuai
  wangshuaiReason: string
  kong: boolean
  monthBreak: boolean
  influences: StrengthInfluence[]
  verdict: StrengthVerdict
}

export interface YaoStrengthCtx {
  monthZhi: DiZhi
  dayZhi: DiZhi
  xunKong: [DiZhi, DiZhi]
  movingLines: PanLine[]
}

export interface YaoTarget {
  zhi: DiZhi
  wuxing: WuXing
  position: number
  moving: boolean
  changed?: { najia: NaJia }
}

/** 把某爻当「子用神」评估力量：月/日/月破/动爻/空/回头 + 有力·无用。仅在 pillars 存在时调用。 */
export function assessYaoStrength(x: YaoTarget, ctx: YaoStrengthCtx): YaoStrength {
  const { monthZhi, dayZhi, xunKong, movingLines } = ctx
  const ws = wangShuaiOf(x.wuxing, monthZhi)
  const deLing = ws === '旺' || ws === '相'
  const shiLing = ws === '休' || ws === '囚' || ws === '死'
  const kong = xunKong.includes(x.zhi)

  const dayWx = zhiWuxing(dayZhi)
  const linRi = x.zhi === dayZhi
  const linYue = x.zhi === monthZhi
  const riSheng = generates(dayWx, x.wuxing)
  const riKe = controls(dayWx, x.wuxing)
  const riChong = chong(dayZhi, x.zhi)
  const riHe = he(dayZhi, x.zhi)
  const yuePo = chong(monthZhi, x.zhi)

  const others = movingLines.filter((l) => l.position !== x.position)
  const dongSheng = others.filter((l) => generates(l.najia.wuxing, x.wuxing))
  const dongKe = others.filter((l) => controls(l.najia.wuxing, x.wuxing))

  const huiSheng = !!(x.moving && x.changed && generates(x.changed.najia.wuxing, x.wuxing))
  const huiKe = !!(x.moving && x.changed && controls(x.changed.najia.wuxing, x.wuxing))

  const fu = linRi || linYue || riSheng || riHe || ws === '相' || dongSheng.length > 0 || x.moving || huiSheng
  const beiKe = riKe || dongKe.length > 0 || huiKe
  const zhenKong = kong && shiLing && !x.moving && !riChong
  const yuePoFatal = yuePo && shiLing && !x.moving

  let verdict: StrengthVerdict
  if (zhenKong || yuePoFatal) verdict = '无用'
  else if (deLing) verdict = '有力'
  else if (shiLing && beiKe && !fu) verdict = '无用'
  else verdict = '有力'

  const influences: StrengthInfluence[] = []
  // 日
  if (linRi) influences.push({ kind: '日', text: `临日辰${dayZhi}（扶）`, helps: true })
  else if (riSheng) influences.push({ kind: '日', text: `日辰${dayZhi}${dayWx}生（扶）`, helps: true })
  else if (riHe) influences.push({ kind: '日', text: `日辰${dayZhi}合（扶）`, helps: true })
  else if (riKe) influences.push({ kind: '日', text: `日辰${dayZhi}${dayWx}克（抑）`, helps: false })
  else if (riChong) influences.push({ kind: '日', text: `日辰${dayZhi}冲（${shiLing ? '破' : '动'}）`, helps: shiLing ? false : null })
  // 月破
  if (yuePo) influences.push({ kind: '月', text: '月破', helps: false })
  // 动爻（每爻取最重：克 > 冲 > 生）
  for (const l of others) {
    if (controls(l.najia.wuxing, x.wuxing)) influences.push({ kind: '动', position: l.position, text: `${l.position}爻${l.najia.zhi}${l.najia.wuxing}克（抑）`, helps: false })
    else if (chong(l.najia.zhi, x.zhi)) influences.push({ kind: '动', position: l.position, text: `${l.position}爻${l.najia.zhi}冲`, helps: null })
    else if (generates(l.najia.wuxing, x.wuxing)) influences.push({ kind: '动', position: l.position, text: `${l.position}爻${l.najia.zhi}${l.najia.wuxing}生（扶）`, helps: true })
  }
  // 回头
  if (huiSheng) influences.push({ kind: '回头', text: '回头生（扶）', helps: true })
  else if (huiKe) influences.push({ kind: '回头', text: '回头克（抑）', helps: false })
  // 空
  if (kong) influences.push({ kind: '空', text: zhenKong ? '真空' : '假空', helps: zhenKong ? false : null })

  return { wangshuai: ws, wangshuaiReason: wangshuaiReasonOf(x.zhi, monthZhi), kong, monthBreak: yuePo, influences, verdict }
}
```

- [ ] **Step 4: 跑通过** `npm test -- yao-strength` → PASS（6 例）

- [ ] **Step 5: 提交**
```bash
git add src/domain/yao-strength.ts src/domain/yao-strength.test.ts
git commit -m "feat: 爻力量评估 yao-strength（有力/无用 + 影响项）"
```

---

## Task P4-3: 装配扩展 `yongshen-analysis.ts`

**Files:** Modify `src/domain/yongshen-analysis.ts`、`src/domain/yongshen-analysis.test.ts`、`src/components/YongshenPanel.test.tsx`（补 base mock 必填字段）
依赖：yao-strength / wangshuai-reason

给 `Source` 加 `role`/`special`/`strength`，给 `YongshenAnalysis` 加 `wangshuaiReason`，pillars 存在时填充（immutable：用 map 造新对象，不原地改）。

- [ ] **Step 1: 写失败测试** —— 在 `src/domain/yongshen-analysis.test.ts` 的 `describe` 内追加（沿用文件顶部 `pan()` 工厂）：
```ts
  it('四期：元神/忌神身份 + 力量 + 用神缘由', () => {
    const a = buildYongshenAnalysis(pan([{ position: 5, moving: true }]), '妻财')!
    expect(a.wangshuaiReason).toBe('寅木生午火泄气') // 用神寅木午月休
    const fly = a.sources.find((s) => s.kind === '飞')!
    expect(fly.role).toBe('元神') // 亥水生寅木
    expect(fly.strength?.wangshuai).toBe('囚') // 亥水午月
    const ji = a.sources.find((s) => s.kind === '动')!
    expect(ji.role).toBe('忌神') // 申金克寅木
    expect(ji.strength?.wangshuai).toBe('死') // 申金午月
    expect(ji.strength?.verdict).toBeDefined()
    const ri = a.sources.find((s) => s.kind === '日')!
    expect(ri.role).toBe('元神') // 子水生寅木
    expect(ri.special).toBe('主宰')
    const yue = a.sources.find((s) => s.kind === '月')!
    expect(yue.role).toBeUndefined() // 午火：用神生月=泄，无身份
  })
  it('四期降级 pillars=null：无 role/strength/缘由', () => {
    const a = buildYongshenAnalysis(pan([{ position: 5, moving: true }], true), '妻财')!
    expect(a.wangshuaiReason).toBeNull()
    expect(a.sources.every((s) => s.role === undefined && s.strength === undefined)).toBe(true)
  })
```

- [ ] **Step 2: 跑失败** `npm test -- yongshen-analysis` → FAIL（role/wangshuaiReason 未定义）

- [ ] **Step 3: 实现 yongshen-analysis.ts**

(a) 顶部加导入：
```ts
import { assessYaoStrength, YaoStrength } from './yao-strength'
import { wangshuaiReasonOf } from './wangshuai-reason'
```

(b) `Source` 接口加三个可选字段：
```ts
export interface Source {
  kind: SourceKind
  position?: number
  zhi: DiZhi
  wuxing: WuXing
  force: YongForce
  role?: '元神' | '忌神'    // 得生→元神，受克→忌神
  special?: '当令' | '主宰'  // 元忌落月→当令、落日→主宰
  strength?: YaoStrength    // 元忌落动/变/飞 且 pillars 存在
}
```

(c) `YongshenAnalysis` 接口加字段：
```ts
  wangshuaiReason: string | null   // 用神旺衰缘由（pillars 存在时）
```

(d) 文件末尾加纯函数 `enrichSource`：
```ts
function enrichSource(
  s: Source,
  lines: Pan['lines'],
  ctx: { monthZhi: DiZhi; dayZhi: DiZhi; xunKong: [DiZhi, DiZhi] }
): Source {
  const role = s.force.force === '得生' ? '元神' : s.force.force === '受克' ? '忌神' : undefined
  if (!role) return s
  if (s.kind === '月') return { ...s, role, special: '当令' }
  if (s.kind === '日') return { ...s, role, special: '主宰' }
  if (s.kind === '变') {
    return {
      ...s, role,
      strength: assessYaoStrength({ zhi: s.zhi, wuxing: s.wuxing, position: s.position!, moving: false }, { ...ctx, movingLines: [] }),
    }
  }
  // 动 / 飞：取本卦对应显爻（飞神=lines[position-1]）
  const line = lines.find((l) => l.position === s.position)!
  return {
    ...s, role,
    strength: assessYaoStrength(
      { zhi: line.najia.zhi, wuxing: line.najia.wuxing, position: line.position, moving: line.moving, changed: line.changed },
      { ...ctx, movingLines: lines.filter((l) => l.moving) }
    ),
  }
}
```

(e) 在现有 `return` 之前，把 sources 富化、算用神缘由（`monthZhi`/`dayZhi`/`xunKong`/`yongZhi` 均为现有局部变量）：
```ts
  const enriched =
    monthZhi && dayZhi && xunKong
      ? sources.map((s) => enrichSource(s, lines, { monthZhi, dayZhi, xunKong }))
      : sources
  const wsReason = monthZhi ? wangshuaiReasonOf(yongZhi, monthZhi) : null
```

(f) 改 `return`：把 `sources` 换成 `enriched`，并加 `wangshuaiReason: wsReason`：
```ts
  return { target, liuqin, najia, position, isFu, isShi, duplicate, wangshuai, monthBreak, kong, sources: enriched, wangshuaiReason: wsReason }
```

- [ ] **Step 4: 改组件测试 mock 保持 build 绿** —— `src/components/YongshenPanel.test.tsx` 的 `base` 对象补上新必填字段（`YongshenAnalysis` 现含 `wangshuaiReason`）：在 `base` 里 `kong: false,` 之后加一行
```ts
  wangshuaiReason: '寅木生午火泄气',
```

- [ ] **Step 5: 跑通过 + build** `npm test && npm run build` → 全绿（含全量单测 + tsc）

- [ ] **Step 6: 提交**
```bash
git add src/domain/yongshen-analysis.ts src/domain/yongshen-analysis.test.ts src/components/YongshenPanel.test.tsx
git commit -m "feat: 装配元神/忌神身份+力量评估+用神旺衰缘由"
```

---

## Task P4-4: 面板两行制 `YongshenPanel.tsx`

**Files:** Modify `src/components/YongshenPanel.tsx`（整文件替换）、`src/components/YongshenPanel.test.tsx`（补断言）

行1 = 源·地支 + 元/忌框 + 冲合 + 受力；行2（仅 role）= 当令/主宰 或 旺衰·缘由·影响·verdict。保留三期：可点联动、图例、降级、null 提示。

- [ ] **Step 1: 补失败测试** —— 在 `src/components/YongshenPanel.test.tsx` 顶部 `base` 的 `sources` 数组里，给「动」源补 role/strength 便于断言（替换 base.sources 的动源那项为带 strength 的版本），并在 `describe` 内追加用例。先把 `base.sources` 末项（kind '动'）替换为：
```ts
    { kind: '动', position: 5, zhi: '申', wuxing: '金', force: { force: '受克', chong: true, he: false },
      role: '忌神',
      strength: { wangshuai: '死', wangshuaiReason: '午火克申金', kong: false, monthBreak: false,
        influences: [{ kind: '动', position: 5, text: '5爻午火克（抑）', helps: false }], verdict: '无用' } },
```
并把「飞」源补 `role: '元神'`、「日」源补 `role: '元神', special: '主宰'`（在各自对象尾部加字段）。追加用例：
```ts
  it('元神/忌神框 + 力量行（旺衰·缘由·verdict）', () => {
    render(<YongshenPanel analysis={base} target="妻财" />)
    expect(screen.getByText('忌神')).toBeInTheDocument()
    expect(screen.getAllByText('元神').length).toBeGreaterThan(0)
    const strength = screen.getAllByTestId('strength-line').map((e) => e.textContent).join(' ')
    expect(strength).toMatch(/死.*午火克申金/)
    expect(strength).toMatch(/无用/)
    expect(strength).toMatch(/主宰/) // 日辰元神
  })
  it('用神头行带旺衰缘由', () => {
    render(<YongshenPanel analysis={base} target="妻财" />)
    expect(screen.getByTestId('yong-head').textContent).toMatch(/休 · 寅木生午火泄气/)
  })
```
> `base` 头行旺衰为 `休`、`wangshuaiReason` 为 `寅木生午火泄气`（P4-3 已补）。

- [ ] **Step 2: 跑失败** `npm test -- YongshenPanel` → FAIL（strength-line/元忌框 未渲染）

- [ ] **Step 3: 整文件替换** `src/components/YongshenPanel.tsx`:
```tsx
import { YongshenAnalysis, Source } from '../domain/yongshen-analysis'
import { YongTarget } from '../domain/yongshen'

interface Props {
  analysis: YongshenAnalysis | null
  target: YongTarget
  selectedSourceAt?: number | null
  onSelectSource?: (pos: number | null) => void
}

const FIXED_LABEL: Record<string, string> = { 月: '月建', 日: '日辰', 飞: '飞神' }

function srcLabel(s: Source): string {
  if (s.kind === '动') return `动爻${s.position}`
  if (s.kind === '变') return `变爻${s.position}·回头`
  return FIXED_LABEL[s.kind] ?? s.kind
}

function StrengthLine({ s }: { s: Source }) {
  if (s.special === '当令') return <div data-testid="strength-line" className="text-[10px] text-ink-soft pl-[5.2rem] mt-0.5">当令</div>
  if (s.special === '主宰') return <div data-testid="strength-line" className="text-[10px] text-ink-soft pl-[5.2rem] mt-0.5">主宰 · 日辰不论旺衰</div>
  if (!s.strength) return null
  const st = s.strength
  const inf = st.influences.map((x) => x.text).join('、')
  return (
    <div data-testid="strength-line" className="text-[10px] text-ink-soft pl-[5.2rem] mt-0.5 leading-relaxed">
      旺衰 {st.wangshuai} · {st.wangshuaiReason}
      {inf && `；${inf}`}
      {' · '}
      <span className={st.verdict === '无用' ? 'text-seal' : 'text-ink'}>{st.verdict}</span>
    </div>
  )
}

export function YongshenPanel({ analysis, target, selectedSourceAt = null, onSelectSource }: Props) {
  if (!analysis) {
    return (
      <div data-testid="yongshen-panel" className="text-xs text-ink/50 text-center py-2 font-serif">
        卦中无{target}，亦无伏神，暂不可分析
      </div>
    )
  }
  const a = analysis
  const degraded = a.wangshuai === null
  return (
    <div data-testid="yongshen-panel" className="flex flex-col gap-2 w-full max-w-sm font-serif">
      <div className="text-[10px] tracking-[0.34em] text-ink/40 text-center">用 神 分 析</div>
      <div data-testid="yong-head" className="flex justify-between items-baseline border-b border-ink/10 pb-2 text-sm">
        <span className="text-seal">
          {a.liuqin}{a.najia.zhi}{a.najia.wuxing}
          <span className="text-ink-soft text-xs">
            {' · '}{a.position}爻
            {a.isShi && ' · 世'}
            {a.isFu && ' · 伏神'}
            {a.duplicate && ` · 两现按${a.duplicate.ruleName}取${a.duplicate.picked}爻`}
          </span>
          {a.monthBreak && <span className="text-seal text-xs"> · 月破</span>}
        </span>
        <span className="text-xs text-ink-soft">
          旺衰：{a.wangshuai ?? '—'}{a.wangshuaiReason && ` · ${a.wangshuaiReason}`}
        </span>
      </div>
      {degraded && <div className="text-[10px] text-ink/40 text-center">时间信息暂不可用，旺衰与日月生克略</div>}
      <div className="flex flex-col">
        {a.sources.map((s, i) => {
          const clickable = s.position != null && !!onSelectSource
          const active = s.position != null && s.position === selectedSourceAt
          return (
            <div
              key={i}
              data-testid="force-row"
              role={clickable ? 'button' : undefined}
              onClick={clickable ? () => onSelectSource!(active ? null : s.position!) : undefined}
              className={`py-1 border-t border-ink/5 first:border-t-0 ${clickable ? 'cursor-pointer' : ''} ${active ? 'bg-seal/10 rounded' : ''}`}
            >
              <div className="flex items-center gap-2 text-xs">
                <span className="text-ink-soft min-w-[5.2rem]">{srcLabel(s)} · {s.zhi}{s.wuxing}</span>
                {s.role && (
                  <span className={`rounded px-1 text-[10px] border ${s.role === '忌神' ? 'text-seal border-seal' : 'text-ink border-ink/45'}`}>
                    {s.role}
                  </span>
                )}
                <span className="flex items-center gap-1 ml-auto">
                  {s.force.chong && <span className="text-seal border border-seal rounded px-0.5 text-[10px]">冲</span>}
                  {s.force.he && <span className="text-ink border border-ink/40 rounded px-0.5 text-[10px]">合</span>}
                  <span className={s.force.force === '受克' ? 'text-seal' : 'text-ink'}>{s.force.force}</span>
                </span>
              </div>
              {s.role && <StrengthLine s={s} />}
            </div>
          )
        })}
      </div>
      <div data-testid="force-legend" className="text-[10px] text-ink-soft/80 leading-relaxed pt-1 border-t border-ink/10">
        受力 · 得生（源生用神，强）· 比和（同五行，帮）· 泄（用神生源，泄气弱）· 耗（用神克源，耗力弱）· 受克（源克用神，伤）<br />
        身份 · 元神（生用神）· 忌神（克用神）
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 跑通过 + build** `npm test && npm run build` → 全绿
> 三期既有面板用例（force-row 计数、飞神/变爻文本、点选联动、降级、null、图例）仍应通过——结构兼容。

- [ ] **Step 5: 提交**
```bash
git add src/components/YongshenPanel.tsx src/components/YongshenPanel.test.tsx
git commit -m "feat: 面板两行制——元神/忌神框 + 力量行（旺衰·缘由·有力/无用）"
```

---

## Task P4-5: 回归 + 终审

**Files:** 无（验证 + 审查）

- [ ] **Step 1: 全量门槛** `npm test && npm run build && npm run e2e`
Expected: 单测全绿 + 构建绿 + E2E 通过（三期 E2E 不依赖力量文案，应仍过）

- [ ] **Step 2: 终审** 派 opus code-reviewer 全量复审四期（`git diff main..HEAD -- src`）：重点核 `yao-strength` 有力/无用判据与影响项的断卦正确性、immutable（enrichSource 不原地改）、降级、类型一致、死代码。修 CRITICAL/HIGH。

---

## 自检（spec 覆盖）

| spec 要求 | 任务 |
|---|---|
| §1.1 旺衰缘由 | P4-1 |
| §1.2 力量评估 + 有力/无用 + 影响项 | P4-2 |
| §0.6 变爻孤立（movingLines:[]） | P4-3 enrichSource '变' 分支 |
| §1.3 Source +role/special/strength；用神缘由 | P4-3 |
| §2 面板 Layout B 两行制 + 力量行 | P4-4 |
| §0.2 月→当令/日→主宰 | P4-3（special）+ P4-4（StrengthLine） |
| §0.3 用神也带缘由 | P4-3（wangshuaiReason）+ P4-4（头行） |
| §4 降级 | P4-2/P4-3 测试 + P4-4 头行 |
| §5 测试 | 各任务 + P4-5 |
