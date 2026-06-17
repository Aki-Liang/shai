# 六爻三期 · 用神分析层 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在二期排盘下方叠加「用神分析」面板——算出生克冲合、月令旺相休囚死、并用旺衰解决用神两现取舍；用神目标增「世爻」选项。

**Architecture:** 纯函数领域层（chonghe / wangshuai / yong-force / yongshen-pick / yongshen-analysis）+ 一个展示组件（YongshenPanel）。用神高亮从「按六亲」改为「按解析出的唯一爻位」。沿用既有 immutable 风格（只造新对象），干支历降级时分析层只少日/月源。

**Tech Stack:** Vite + React 18 + TypeScript + Tailwind + Vitest（jsdom + @testing-library）+ Playwright。

**参考规约：** `docs/superpowers/specs/2026-06-17-liuyao-phase3-yongshen-analysis-design.md`

**绿色门槛（每个任务结束）：** `npm test` 全绿；改动 `.tsx`/类型的任务**额外** `npm run build`（含 `tsc -b` 类型检查）全绿。

**已有可复用：** `src/domain/wuxing.ts`（`WuXing`/`DiZhi`/`zhiWuxing`/`generates`/`controls`）、`liuqin.ts`（`LiuQin`/`liuqinOf`）、`najia.ts`（`NaJia{gan;zhi:DiZhi;wuxing:WuXing}`）、`pan.ts`（`PanLine`/`Pan`）、`yongshen-locate.ts`（`locateYongshen`）、`ganzhi.ts`（`GanZhiPillars{year;month;day;dayGan;xunKong:[string,string]}`）。

---

## 文件结构

**新增：**
```
src/domain/chonghe.ts              # 六冲/六合
src/domain/wangshuai.ts            # 旺相休囚死（按月令）
src/domain/yong-force.ts           # 受力：得生/受克/泄/耗/比和 + 冲/合
src/domain/yongshen-pick.ts        # 用神两现取舍链
src/domain/yongshen-analysis.ts    # 装配 YongshenAnalysis（含世爻/飞神定位）
src/components/YongshenPanel.tsx   # B 布局面板
（及各自 .test 文件）
```
**改动既有：**
```
src/domain/yongshen.ts             # +YongTarget 类型、+世爻口诀
src/components/PanGrid.tsx         # 高亮改按爻位（先加新 props，后清理旧 props）
src/components/YongshenSelector.tsx# +世爻 chip、类型改 YongTarget
src/components/ResultView.tsx      # 装配 analysis + 面板 + 新高亮
（及对应 .test 文件）
```

---

## Task P3-1: 六冲 / 六合 `chonghe.ts`

**Files:**
- Create: `src/domain/chonghe.ts`
- Test: `src/domain/chonghe.test.ts`

- [ ] **Step 1: 写失败测试**

`src/domain/chonghe.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { chong, he } from './chonghe'
import { DiZhi } from './wuxing'

describe('chonghe', () => {
  it('六冲全真（无序）', () => {
    const pairs: [DiZhi, DiZhi][] = [['子','午'],['丑','未'],['寅','申'],['卯','酉'],['辰','戌'],['巳','亥']]
    for (const [a, b] of pairs) {
      expect(chong(a, b)).toBe(true)
      expect(chong(b, a)).toBe(true)
    }
  })
  it('六合全真（无序）', () => {
    const pairs: [DiZhi, DiZhi][] = [['子','丑'],['寅','亥'],['卯','戌'],['辰','酉'],['巳','申'],['午','未']]
    for (const [a, b] of pairs) {
      expect(he(a, b)).toBe(true)
      expect(he(b, a)).toBe(true)
    }
  })
  it('非冲非合 / 同支 为假', () => {
    expect(chong('子', '丑')).toBe(false)
    expect(he('子', '午')).toBe(false)
    expect(chong('子', '子')).toBe(false)
    expect(he('午', '午')).toBe(false)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- chonghe`
Expected: FAIL（`chong`/`he` 未定义）

- [ ] **Step 3: 实现**

`src/domain/chonghe.ts`:
```ts
import { DiZhi } from './wuxing'

// 六冲：子午 丑未 寅申 卯酉 辰戌 巳亥
const CHONG: Record<DiZhi, DiZhi> = {
  子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅',
  卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳',
}
// 六合：子丑 寅亥 卯戌 辰酉 巳申 午未
const HE: Record<DiZhi, DiZhi> = {
  子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯',
  辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午',
}

/** a、b 是否相冲（六冲，无序；同支为假） */
export function chong(a: DiZhi, b: DiZhi): boolean {
  return CHONG[a] === b
}
/** a、b 是否相合（六合，无序；同支为假） */
export function he(a: DiZhi, b: DiZhi): boolean {
  return HE[a] === b
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test -- chonghe`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/domain/chonghe.ts src/domain/chonghe.test.ts
git commit -m "feat: 六冲六合 chonghe"
```

---

## Task P3-2: 旺相休囚死 `wangshuai.ts`

**Files:**
- Create: `src/domain/wangshuai.ts`
- Test: `src/domain/wangshuai.test.ts`

- [ ] **Step 1: 写失败测试**

`src/domain/wangshuai.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { wangShuaiOf } from './wangshuai'

// 全部以午（火）月为令验证五态
describe('wangShuaiOf（午火月）', () => {
  it('当令为旺', () => expect(wangShuaiOf('火', '午')).toBe('旺'))
  it('月生用神为相', () => expect(wangShuaiOf('土', '午')).toBe('相')) // 火生土
  it('用神生月为休', () => expect(wangShuaiOf('木', '午')).toBe('休')) // 木生火
  it('用神克月为囚', () => expect(wangShuaiOf('水', '午')).toBe('囚')) // 水克火
  it('月克用神为死', () => expect(wangShuaiOf('金', '午')).toBe('死')) // 火克金
  it('换子水月：水旺、金相', () => {
    expect(wangShuaiOf('水', '子')).toBe('旺')
    expect(wangShuaiOf('木', '子')).toBe('相') // 水生木
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- wangshuai`
Expected: FAIL（`wangShuaiOf` 未定义）

- [ ] **Step 3: 实现**

`src/domain/wangshuai.ts`:
```ts
import { DiZhi, WuXing, zhiWuxing, generates, controls } from './wuxing'

export type WangShuai = '旺' | '相' | '休' | '囚' | '死'

/** 旺相休囚死：只按月令。用神五行 yong 相对月令五行 M。 */
export function wangShuaiOf(yong: WuXing, monthZhi: DiZhi): WangShuai {
  const m = zhiWuxing(monthZhi)
  if (yong === m) return '旺'
  if (generates(m, yong)) return '相' // 月生用神
  if (generates(yong, m)) return '休' // 用神生月
  if (controls(yong, m)) return '囚' // 用神克月
  if (controls(m, yong)) return '死' // 月克用神
  throw new Error(`wangShuaiOf: 无法判定 ${yong} vs 月令${m}`)
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test -- wangshuai`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/domain/wangshuai.ts src/domain/wangshuai.test.ts
git commit -m "feat: 旺相休囚死 wangshuai（按月令）"
```

---

## Task P3-3: 用神受力 `yong-force.ts`

**Files:**
- Create: `src/domain/yong-force.ts`
- Test: `src/domain/yong-force.test.ts`
- 依赖：`chonghe.ts`（P3-1）

- [ ] **Step 1: 写失败测试**

`src/domain/yong-force.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { forceOf } from './yong-force'

describe('forceOf（站在用神视角）', () => {
  it('源生用神=得生', () => expect(forceOf('子', '寅').force).toBe('得生')) // 水生木
  it('源克用神=受克，并叠加冲', () => {
    const r = forceOf('申', '寅') // 金克木；寅申冲
    expect(r.force).toBe('受克')
    expect(r.chong).toBe(true)
    expect(r.he).toBe(false)
  })
  it('用神生源=泄', () => expect(forceOf('午', '寅').force).toBe('泄')) // 寅木生午火
  it('用神克源=耗', () => expect(forceOf('辰', '寅').force).toBe('耗')) // 寅木克辰土
  it('同五行=比和', () => {
    const r = forceOf('申', '酉') // 皆金
    expect(r.force).toBe('比和')
    expect(r.chong).toBe(false)
    expect(r.he).toBe(false)
  })
  it('六合叠加（子丑合，用神丑被子耗）', () => {
    const r = forceOf('子', '丑')
    expect(r.he).toBe(true)
    expect(r.force).toBe('耗') // 丑土克子水 → 用神克源
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- yong-force`
Expected: FAIL（`forceOf` 未定义）

- [ ] **Step 3: 实现**

`src/domain/yong-force.ts`:
```ts
import { DiZhi, zhiWuxing, generates, controls } from './wuxing'
import { chong, he } from './chonghe'

export type Force = '得生' | '受克' | '泄' | '耗' | '比和'
export interface YongForce {
  force: Force
  chong: boolean
  he: boolean
}

/** 源地支对用神地支的受力（站在用神视角）+ 地支冲/合 */
export function forceOf(source: DiZhi, yong: DiZhi): YongForce {
  const s = zhiWuxing(source)
  const y = zhiWuxing(yong)
  let force: Force
  if (s === y) force = '比和'
  else if (generates(s, y)) force = '得生' // 源生用神
  else if (controls(s, y)) force = '受克' // 源克用神
  else if (generates(y, s)) force = '泄' // 用神生源
  else force = '耗' // 用神克源（controls(y, s)）
  return { force, chong: chong(source, yong), he: he(source, yong) }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test -- yong-force`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/domain/yong-force.ts src/domain/yong-force.test.ts
git commit -m "feat: 用神受力 yong-force（得生/受克/泄/耗/比和+冲合）"
```

---

## Task P3-4: 用神两现取舍 `yongshen-pick.ts`

**Files:**
- Create: `src/domain/yongshen-pick.ts`
- Test: `src/domain/yongshen-pick.test.ts`
- 依赖：`wangshuai.ts`、`chonghe.ts`、`pan.ts`、`wuxing.ts`

链：① 舍空破 ② 取发动 ③ 取旺相 ④ 临日月 ⑤ 持世 ⑥ 离世爻最近（等距取较上=position 较大）。逐条缩小候选；缩到 1 即定；走到 ⑥ 必出唯一。历法降级（monthZhi/dayZhi/xunKong 为 null）跳过 ①③④。

- [ ] **Step 1: 写失败测试**

`src/domain/yongshen-pick.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { pickYongshen, PickContext } from './yongshen-pick'
import { PanLine } from './pan'
import { DiZhi, zhiWuxing } from './wuxing'

// 最小候选爻工厂
function L(position: number, zhi: DiZhi, extra: { moving?: boolean; shi?: boolean } = {}): PanLine {
  return {
    position, liushen: null, liuqin: '兄弟',
    najia: { gan: '甲', zhi, wuxing: zhiWuxing(zhi) },
    yinyang: 'yang', moving: extra.moving ?? false,
    shi: extra.shi ?? false, ying: false, kong: false,
  }
}
const NULL_CTX: PickContext = { monthZhi: null, dayZhi: null, xunKong: null, shiPos: 3 }

describe('pickYongshen', () => {
  it('① 舍空破：去掉旬空者', () => {
    const r = pickYongshen([L(2, '亥'), L(4, '酉')], { ...NULL_CTX, xunKong: ['戌', '亥'] })
    expect(r).toEqual({ position: 4, rule: 1, ruleName: '舍空破' })
  })
  it('② 取发动：一动一静取动', () => {
    const r = pickYongshen([L(2, '子', { moving: true }), L(5, '丑')], NULL_CTX)
    expect(r).toEqual({ position: 2, rule: 2, ruleName: '取发动' })
  })
  it('③ 取旺相：午月取旺者', () => {
    // 巳火=旺(0)、未土=相(1)；皆非空破、皆静、皆不临
    const r = pickYongshen([L(2, '巳'), L(4, '未')], { ...NULL_CTX, monthZhi: '午' })
    expect(r).toEqual({ position: 2, rule: 3, ruleName: '取旺相' })
  })
  it('④ 临日月：取临日辰者', () => {
    // 皆金（午月皆死，③不缩）；酉=日辰
    const r = pickYongshen([L(2, '酉'), L(4, '申')], { ...NULL_CTX, monthZhi: '午', dayZhi: '酉' })
    expect(r).toEqual({ position: 2, rule: 4, ruleName: '临日月' })
  })
  it('⑤ 持世：取持世爻', () => {
    const r = pickYongshen([L(2, '卯', { shi: true }), L(5, '卯')], { ...NULL_CTX, shiPos: 2 })
    expect(r).toEqual({ position: 2, rule: 5, ruleName: '持世' })
  })
  it('⑥ 离世爻最近，等距取较上（position 较大）', () => {
    const r = pickYongshen([L(1, '卯'), L(5, '卯')], { ...NULL_CTX, shiPos: 3 })
    expect(r).toEqual({ position: 5, rule: 6, ruleName: '离世爻最近' })
  })
  it('① 全空破不误删：保持原集，落到 ⑥', () => {
    const r = pickYongshen([L(2, '子'), L(4, '丑')], { ...NULL_CTX, xunKong: ['子', '丑'], shiPos: 3 })
    expect(r.position).toBe(4) // |2-3|=|4-3|=1，取较上 4
    expect(r.rule).toBe(6)
  })
  it('历法降级：①③④ 跳过，落到 ⑥', () => {
    const r = pickYongshen([L(2, '巳'), L(4, '子')], { ...NULL_CTX, shiPos: 5 })
    expect(r.position).toBe(4) // |2-5|=3 > |4-5|=1
    expect(r.rule).toBe(6)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- yongshen-pick`
Expected: FAIL（`pickYongshen` 未定义）

- [ ] **Step 3: 实现**

`src/domain/yongshen-pick.ts`:
```ts
import { PanLine } from './pan'
import { DiZhi } from './wuxing'
import { chong } from './chonghe'
import { wangShuaiOf, WangShuai } from './wangshuai'

export interface PickContext {
  monthZhi: DiZhi | null
  dayZhi: DiZhi | null
  xunKong: [DiZhi, DiZhi] | null
  shiPos: number // 世爻位
}
export interface PickResult {
  position: number
  rule: number
  ruleName: string
}

const WS_ORDER: Record<WangShuai, number> = { 旺: 0, 相: 1, 休: 2, 囚: 3, 死: 4 }
const RULE_NAMES: Record<number, string> = {
  1: '舍空破', 2: '取发动', 3: '取旺相', 4: '临日月', 5: '持世', 6: '离世爻最近',
}

function isKongPo(l: PanLine, ctx: PickContext): boolean {
  const kong = ctx.xunKong ? ctx.xunKong.includes(l.najia.zhi) : false
  const po = ctx.monthZhi ? chong(ctx.monthZhi, l.najia.zhi) : false
  return kong || po
}
function done(l: PanLine, rule: number): PickResult {
  return { position: l.position, rule, ruleName: RULE_NAMES[rule] }
}

/** 用神两现取舍：逐条缩小候选，先满足者胜；走到 ⑥ 必出唯一。 */
export function pickYongshen(candidates: PanLine[], ctx: PickContext): PickResult {
  let pool = candidates

  // 工具：用 kept 替换 pool（仅当确实缩小且非空）；缩到 1 则定案
  const narrow = (kept: PanLine[], rule: number): PickResult | null => {
    if (kept.length >= 1 && kept.length < pool.length) {
      pool = kept
      if (pool.length === 1) return done(pool[0], rule)
    }
    return null
  }

  // ① 舍空破（全空破则不删）
  let r = narrow(pool.filter((l) => !isKongPo(l, ctx)), 1)
  if (r) return r
  // ② 取发动
  r = narrow(pool.filter((l) => l.moving), 2)
  if (r) return r
  // ③ 取旺相（降级跳过）
  if (ctx.monthZhi) {
    const m = ctx.monthZhi
    const best = Math.min(...pool.map((l) => WS_ORDER[wangShuaiOf(l.najia.wuxing, m)]))
    r = narrow(pool.filter((l) => WS_ORDER[wangShuaiOf(l.najia.wuxing, m)] === best), 3)
    if (r) return r
  }
  // ④ 临日月（降级跳过）
  if (ctx.dayZhi || ctx.monthZhi) {
    r = narrow(pool.filter((l) => l.najia.zhi === ctx.dayZhi || l.najia.zhi === ctx.monthZhi), 4)
    if (r) return r
  }
  // ⑤ 持世
  r = narrow(pool.filter((l) => l.shi), 5)
  if (r) return r
  // ⑥ 离世爻最近；等距取较上（position 较大）
  const winner = [...pool].sort((a, b) => {
    const da = Math.abs(a.position - ctx.shiPos)
    const db = Math.abs(b.position - ctx.shiPos)
    return da !== db ? da - db : b.position - a.position
  })[0]
  return done(winner, 6)
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test -- yongshen-pick`
Expected: PASS（8 例全过）

- [ ] **Step 5: 提交**

```bash
git add src/domain/yongshen-pick.ts src/domain/yongshen-pick.test.ts
git commit -m "feat: 用神两现取舍链 yongshen-pick"
```

---

## Task P3-5: `yongshen.ts` 增 YongTarget + 世爻口诀

**Files:**
- Modify: `src/domain/yongshen.ts`
- Test: `src/domain/yongshen.test.ts`（追加用例）

纯追加，不改既有导出。`YongTarget` 放在 `yongshen.ts`（领域层与组件层都从此导入，避免组件依赖 `yongshen-analysis`）。

- [ ] **Step 1: 追加失败测试**

在 `src/domain/yongshen.test.ts` 末尾追加（保留既有用例）：
```ts
import { SHI_YONG_HINT, YONGSHEN_HINTS as HINTS } from './yongshen'

describe('世爻为用', () => {
  it('SHI_YONG_HINT 非空', () => {
    expect(SHI_YONG_HINT.length).toBeGreaterThan(0)
  })
  it('六亲口诀仍为 5 条', () => {
    expect(HINTS).toHaveLength(5)
  })
})
```
> 若文件顶部已 `import { describe, it, expect } from 'vitest'` 则勿重复引入；`describe` 块可直接并列。

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- yongshen.test`
Expected: FAIL（`SHI_YONG_HINT` 未导出）

- [ ] **Step 3: 实现**

在 `src/domain/yongshen.ts` 顶部类型区与数据区追加（保留 `YongShenHint`/`YONGSHEN_HINTS` 原样）：
```ts
/** 用神目标：5 六亲之一，或世爻 */
export type YongTarget = LiuQin | '世'

/** 世爻为用：测自身/综合运势/不知取何用神时 */
export const SHI_YONG_HINT = '测自身 · 综合运势 · 不知取何用神时，以世爻为用'
```
（`LiuQin` 已在文件首行 `import { LiuQin } from './liuqin'` 引入。）

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test -- yongshen.test`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/domain/yongshen.ts src/domain/yongshen.test.ts
git commit -m "feat: yongshen 增 YongTarget 类型与世爻口诀"
```

---

## Task P3-6: 用神分析装配 `yongshen-analysis.ts`

**Files:**
- Create: `src/domain/yongshen-analysis.ts`
- Test: `src/domain/yongshen-analysis.test.ts`
- 依赖：locate / pick / wangshuai / yong-force / chonghe / yongshen(YongTarget)

- [ ] **Step 1: 写失败测试**

`src/domain/yongshen-analysis.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { buildYongshenAnalysis, Source } from './yongshen-analysis'
import { Pan, PanLine } from './pan'

// 天风姤·乾金宫 基础盘工厂（午月/甲子日/旬空戌亥），可覆盖部分爻
function pan(overrides: Partial<PanLine>[] = [], pillarsNull = false): Pan {
  const base: PanLine[] = [
    { position: 1, liushen: '青龙', liuqin: '父母', najia: { gan: '辛', zhi: '丑', wuxing: '土' }, yinyang: 'yin', moving: false, shi: true, ying: false, kong: false },
    { position: 2, liushen: '朱雀', liuqin: '官鬼', najia: { gan: '辛', zhi: '亥', wuxing: '水' }, yinyang: 'yang', moving: false, shi: false, ying: false, kong: false,
      fushen: { position: 2, liuqin: '妻财', najia: { gan: '甲', zhi: '寅', wuxing: '木' } } },
    { position: 3, liushen: '勾陈', liuqin: '兄弟', najia: { gan: '辛', zhi: '酉', wuxing: '金' }, yinyang: 'yang', moving: false, shi: false, ying: false, kong: false },
    { position: 4, liushen: '螣蛇', liuqin: '父母', najia: { gan: '壬', zhi: '午', wuxing: '火' }, yinyang: 'yang', moving: false, shi: false, ying: true, kong: false },
    { position: 5, liushen: '白虎', liuqin: '兄弟', najia: { gan: '壬', zhi: '申', wuxing: '金' }, yinyang: 'yang', moving: false, shi: false, ying: false, kong: false },
    { position: 6, liushen: '玄武', liuqin: '子孙', najia: { gan: '壬', zhi: '戌', wuxing: '土' }, yinyang: 'yang', moving: false, shi: false, ying: false, kong: false },
  ]
  const lines = base.map((l) => ({ ...l, ...overrides.find((o) => o.position === l.position) }))
  return {
    reading: {} as Pan['reading'],
    pillars: pillarsNull ? null : { year: '丙午', month: '甲午', day: '甲子', dayGan: '甲', xunKong: ['戌', '亥'] },
    palace: { trigram: '乾', element: '金', headLines: [] } as Pan['palace'],
    lines, changedLines: null,
  }
}
const kinds = (ss: Source[]) => ss.map((s) => s.kind)

describe('buildYongshenAnalysis', () => {
  it('用神取伏神（妻财）：飞神 + 卦中动爻皆作用于伏神【乙】', () => {
    // 五爻申金发动，作用于伏神寅木
    const a = buildYongshenAnalysis(pan([{ position: 5, moving: true }]), '妻财')!
    expect(a.isFu).toBe(true)
    expect(a.position).toBe(2)
    expect(a.liuqin).toBe('妻财')
    expect(a.najia.zhi).toBe('寅')
    expect(a.wangshuai).toBe('休') // 寅木 in 午月
    expect(a.monthBreak).toBe(false)
    expect(kinds(a.sources)).toEqual(['月', '日', '飞', '动'])
    const fly = a.sources.find((s) => s.kind === '飞')!
    expect(fly.zhi).toBe('亥') // 飞神=二爻官鬼亥水
    expect(fly.force.force).toBe('得生') // 亥水生寅木 → 飞来生伏
    const dong = a.sources.find((s) => s.kind === '动')!
    expect(dong.position).toBe(5)
    expect(dong.force.force).toBe('受克') // 申金克寅木
    expect(dong.force.chong).toBe(true) // 寅申冲
  })

  it('显爻发动：只取用神自身变爻·回头，他爻变爻不列', () => {
    // 用神=子孙(六爻戌土)发动，回头变出卯木；五爻(申金)亦动但其变爻不计
    const p = pan([
      { position: 6, moving: true, changed: { najia: { gan: '癸', zhi: '卯', wuxing: '木' }, liuqin: '妻财' } },
      { position: 5, moving: true, changed: { najia: { gan: '癸', zhi: '巳', wuxing: '火' }, liuqin: '子孙' } },
    ])
    const a = buildYongshenAnalysis(p, '子孙')!
    expect(a.position).toBe(6)
    expect(a.isFu).toBe(false)
    const bian = a.sources.filter((s) => s.kind === '变')
    expect(bian).toHaveLength(1)
    expect(bian[0].position).toBe(6) // 仅用神本爻回头
    expect(bian[0].zhi).toBe('卯')
    // 五爻作为动爻入列，但其变爻不入列
    expect(a.sources.some((s) => s.kind === '动' && s.position === 5)).toBe(true)
  })

  it('世爻为用：按持世爻定位', () => {
    const a = buildYongshenAnalysis(pan(), '世')!
    expect(a.isShi).toBe(true)
    expect(a.position).toBe(1) // 初爻持世
    expect(a.liuqin).toBe('父母')
    expect(a.najia.zhi).toBe('丑')
    expect(a.wangshuai).toBe('相') // 丑土 in 午月（火生土）
  })

  it('两现取舍：父母两现（1、4）按链取一并记录', () => {
    // 默认盘 pos1 父母、pos4 父母；pos1 持世 → 经 ① ②（无）③（土vs火）...
    const a = buildYongshenAnalysis(pan(), '父母')!
    expect(a.duplicate).not.toBeNull()
    expect([1, 4]).toContain(a.position)
    expect(a.duplicate!.picked).toBe(a.position)
  })

  it('历法降级：pillars=null → 无月/日源、wangshuai=null、动变照常', () => {
    const a = buildYongshenAnalysis(pan([{ position: 6, moving: true, changed: { najia: { gan: '癸', zhi: '卯', wuxing: '木' }, liuqin: '妻财' } }], true), '子孙')!
    expect(a.wangshuai).toBeNull()
    expect(a.monthBreak).toBe(false)
    expect(kinds(a.sources)).toEqual(['变']) // 仅用神本爻回头；无月/日
  })

  it('用神无（none）返回 null', () => {
    // 构造一个无某六亲且无其伏神的场景：用伏神缺失的最简盘
    const minimal = pan().lines.map((l) => ({ ...l, fushen: undefined }))
    const p = { ...pan(), lines: minimal }
    // 此盘六亲含 父母/官鬼/兄弟/子孙，但无「妻财」显爻、且已抹去伏神
    expect(buildYongshenAnalysis(p, '妻财')).toBeNull()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- yongshen-analysis`
Expected: FAIL（`buildYongshenAnalysis` 未定义）

- [ ] **Step 3: 实现**

`src/domain/yongshen-analysis.ts`:
```ts
import { Pan } from './pan'
import { NaJia } from './najia'
import { LiuQin } from './liuqin'
import { DiZhi, WuXing, zhiWuxing } from './wuxing'
import { locateYongshen } from './yongshen-locate'
import { pickYongshen } from './yongshen-pick'
import { wangShuaiOf, WangShuai } from './wangshuai'
import { forceOf, YongForce } from './yong-force'
import { chong } from './chonghe'
import { YongTarget } from './yongshen'

export type SourceKind = '月' | '日' | '飞' | '动' | '变'
export interface Source {
  kind: SourceKind
  position?: number
  zhi: DiZhi
  wuxing: WuXing
  force: YongForce
}
export interface YongshenAnalysis {
  target: YongTarget
  liuqin: LiuQin
  najia: NaJia
  position: number
  isFu: boolean
  isShi: boolean
  duplicate: { picked: number; ruleName: string } | null
  wangshuai: WangShuai | null
  monthBreak: boolean
  kong: boolean
  sources: Source[]
}

/** 干支柱末字 → 地支（"甲午"→"午"）；缺失返回 null */
function lastZhi(pillar: string | undefined): DiZhi | null {
  if (!pillar || pillar.length < 2) return null
  return pillar.charAt(1) as DiZhi
}

function src(kind: SourceKind, position: number | undefined, zhi: DiZhi, yongZhi: DiZhi): Source {
  return { kind, position, zhi, wuxing: zhiWuxing(zhi), force: forceOf(zhi, yongZhi) }
}

/** 装配用神分析：定位用神 → 旺衰/月破/旬空 → 作用源（月/日/飞/动/变）。纯函数，不抛。 */
export function buildYongshenAnalysis(pan: Pan, target: YongTarget): YongshenAnalysis | null {
  const { lines, pillars } = pan
  const monthZhi = lastZhi(pillars?.month)
  const dayZhi = lastZhi(pillars?.day)
  const xunKong = pillars ? (pillars.xunKong as [DiZhi, DiZhi]) : null
  const shiPos = lines.find((l) => l.shi)?.position ?? 0

  // 1) 定位
  let najia: NaJia
  let position: number
  let liuqin: LiuQin
  let isFu = false
  let isShi = false
  let duplicate: { picked: number; ruleName: string } | null = null

  if (target === '世') {
    const shi = lines.find((l) => l.shi)
    if (!shi) return null
    najia = shi.najia
    position = shi.position
    liuqin = shi.liuqin
    isShi = true
  } else {
    const loc = locateYongshen(lines, target)
    if (loc.kind === 'none') return null
    if (loc.kind === 'hidden') {
      const host = lines.find((l) => l.position === loc.position)!
      najia = host.fushen!.najia
      liuqin = host.fushen!.liuqin
      position = loc.position
      isFu = true
    } else if (loc.positions.length === 1) {
      const only = lines.find((l) => l.position === loc.positions[0])!
      najia = only.najia
      liuqin = only.liuqin
      position = only.position
    } else {
      const candidates = lines.filter((l) => loc.positions.includes(l.position))
      const picked = pickYongshen(candidates, { monthZhi, dayZhi, xunKong, shiPos })
      const chosen = lines.find((l) => l.position === picked.position)!
      najia = chosen.najia
      liuqin = chosen.liuqin
      position = chosen.position
      duplicate = { picked: picked.position, ruleName: picked.ruleName }
    }
  }

  const yongZhi = najia.zhi

  // 2) 旺衰 / 月破 / 旬空
  const wangshuai = monthZhi ? wangShuaiOf(najia.wuxing, monthZhi) : null
  const monthBreak = monthZhi ? chong(monthZhi, yongZhi) : false
  const kong = xunKong ? xunKong.includes(yongZhi) : false

  // 3) 作用源（顺序 月、日、飞、动、变）
  const sources: Source[] = []
  if (monthZhi) sources.push(src('月', undefined, monthZhi, yongZhi))
  if (dayZhi) sources.push(src('日', undefined, dayZhi, yongZhi))
  if (isFu) {
    const fly = lines.find((l) => l.position === position)! // 飞神=该爻显爻
    sources.push(src('飞', position, fly.najia.zhi, yongZhi))
  }
  lines
    .filter((l) => l.moving && l.position !== position) // 排除用神本爻位（显爻=自身；伏神=飞神位，已单列）
    .sort((a, b) => a.position - b.position)
    .forEach((l) => sources.push(src('动', l.position, l.najia.zhi, yongZhi)))
  if (!isFu) {
    const yongLine = lines.find((l) => l.position === position)!
    if (yongLine.moving && yongLine.changed) {
      sources.push(src('变', position, yongLine.changed.najia.zhi, yongZhi)) // 仅用神自身回头
    }
  }

  return { target, liuqin, najia, position, isFu, isShi, duplicate, wangshuai, monthBreak, kong, sources }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test -- yongshen-analysis`
Expected: PASS（6 例全过）

- [ ] **Step 5: 提交**

```bash
git add src/domain/yongshen-analysis.ts src/domain/yongshen-analysis.test.ts
git commit -m "feat: 用神分析装配 yongshen-analysis（世爻/飞神/乙口径/两现）"
```

---

## Task P3-7: 面板组件 `YongshenPanel.tsx`

**Files:**
- Create: `src/components/YongshenPanel.tsx`
- Test: `src/components/YongshenPanel.test.tsx`
- 隔离任务：尚无其他文件引用，单独 build 绿

- [ ] **Step 1: 写失败测试**

`src/components/YongshenPanel.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { YongshenPanel } from './YongshenPanel'
import { YongshenAnalysis } from '../domain/yongshen-analysis'

const base: YongshenAnalysis = {
  target: '妻财', liuqin: '妻财', najia: { gan: '甲', zhi: '寅', wuxing: '木' },
  position: 2, isFu: true, isShi: false, duplicate: null,
  wangshuai: '休', monthBreak: false, kong: false,
  sources: [
    { kind: '月', zhi: '午', wuxing: '火', force: { force: '泄', chong: false, he: false } },
    { kind: '日', zhi: '子', wuxing: '水', force: { force: '得生', chong: false, he: false } },
    { kind: '飞', position: 2, zhi: '亥', wuxing: '水', force: { force: '得生', chong: false, he: false } },
    { kind: '动', position: 5, zhi: '申', wuxing: '金', force: { force: '受克', chong: true, he: false } },
  ],
}

describe('YongshenPanel', () => {
  it('渲染标题（伏神标记 + 旺衰）与各 force-row', () => {
    render(<YongshenPanel analysis={base} target="妻财" />)
    const head = screen.getByTestId('yong-head')
    expect(head.textContent).toMatch(/妻财寅木/)
    expect(head.textContent).toMatch(/伏神/)
    expect(head.textContent).toMatch(/旺衰：休/)
    expect(screen.getAllByTestId('force-row')).toHaveLength(4)
    expect(screen.getByText(/飞神/)).toBeInTheDocument()
  })
  it('世爻 + 月破 标记', () => {
    render(<YongshenPanel analysis={{ ...base, isFu: false, isShi: true, monthBreak: true }} target="世" />)
    const head = screen.getByTestId('yong-head')
    expect(head.textContent).toMatch(/· 世/)
    expect(head.textContent).toMatch(/月破/)
  })
  it('两现标记', () => {
    render(<YongshenPanel analysis={{ ...base, isFu: false, duplicate: { picked: 4, ruleName: '取旺相' } }} target="父母" />)
    expect(screen.getByTestId('yong-head').textContent).toMatch(/两现按取旺相取4爻/)
  })
  it('analysis=null → 友好提示', () => {
    render(<YongshenPanel analysis={null} target="妻财" />)
    expect(screen.getByTestId('yongshen-panel').textContent).toMatch(/卦中无妻财/)
  })
  it('历法降级提示', () => {
    render(<YongshenPanel analysis={{ ...base, wangshuai: null, sources: [base.sources[3]] }} target="妻财" />)
    expect(screen.getByText(/时间信息暂不可用/)).toBeInTheDocument()
    expect(screen.getByTestId('yong-head').textContent).toMatch(/旺衰：—/)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- YongshenPanel`
Expected: FAIL（组件不存在）

- [ ] **Step 3: 实现**

`src/components/YongshenPanel.tsx`:
```tsx
import { YongshenAnalysis, Source } from '../domain/yongshen-analysis'
import { YongTarget } from '../domain/yongshen'

interface Props {
  analysis: YongshenAnalysis | null
  target: YongTarget
}

const FIXED_LABEL: Record<string, string> = { 月: '月建', 日: '日辰', 飞: '飞神' }

function srcLabel(s: Source): string {
  if (s.kind === '动') return `动爻${s.position}`
  if (s.kind === '变') return `变爻${s.position}·回头`
  return FIXED_LABEL[s.kind] ?? s.kind
}
function note(s: Source): string {
  if (s.kind === '飞') return s.force.force === '得生' ? '飞来生伏' : s.force.force === '受克' ? '飞来克伏' : ''
  if (s.kind === '变') return '回头'
  return ''
}

export function YongshenPanel({ analysis, target }: Props) {
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
        <span className="text-xs text-ink-soft">旺衰：{a.wangshuai ?? '—'}</span>
      </div>
      {degraded && <div className="text-[10px] text-ink/40 text-center">时间信息暂不可用，旺衰与日月生克略</div>}
      <div className="flex flex-col">
        {a.sources.map((s, i) => (
          <div
            key={i}
            data-testid="force-row"
            className="grid grid-cols-[5rem_3.5rem_1fr] gap-2 items-center text-xs py-1 border-t border-ink/5 first:border-t-0"
          >
            <span className="text-ink-soft">{srcLabel(s)}</span>
            <span>{s.zhi}{s.wuxing}</span>
            <span className="flex items-center gap-1">
              {s.force.chong && <span className="text-seal border border-seal rounded px-0.5 text-[10px]">冲</span>}
              {s.force.he && <span className="text-ink border border-ink/40 rounded px-0.5 text-[10px]">合</span>}
              <span className={s.force.force === '受克' ? 'text-seal' : 'text-ink'}>{s.force.force}</span>
              {note(s) && <span className="text-ink/40 text-[10px]">{note(s)}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 跑测试 + build**

Run: `npm test -- YongshenPanel && npm run build`
Expected: PASS + 构建无类型错误

- [ ] **Step 5: 提交**

```bash
git add src/components/YongshenPanel.tsx src/components/YongshenPanel.test.tsx
git commit -m "feat: 用神分析面板 YongshenPanel（B 布局）"
```

---

## Task P3-8: `PanGrid` 增按爻位高亮（向后兼容）

**Files:**
- Modify: `src/components/PanGrid.tsx`
- Test: `src/components/PanGrid.test.tsx`（追加用例，保留既有）

加 `yongshenAt` / `yongshenIsFu`，与既有 `highlight` / `yongshenHiddenAt` **并存**（本任务不动 ResultView，保持 build 绿）。命中条件取并集。

- [ ] **Step 1: 追加失败测试**

在 `src/components/PanGrid.test.tsx` 的 `describe('PanGrid', …)` 内追加：
```tsx
  it('yongshenAt 按爻位高亮单行、六亲转焦点', () => {
    render(<PanGrid lines={pan.lines} highlight={null} yongshenAt={4} />)
    const hit = screen.getAllByTestId('pan-row').filter((r) => r.getAttribute('data-highlight') === 'true')
    expect(hit).toHaveLength(1)
    expect(hit[0].getAttribute('data-pos')).toBe('4')
  })
  it('yongshenAt + yongshenIsFu 命中爻标「用神·伏」', () => {
    render(<PanGrid lines={pan.lines} highlight={null} yongshenAt={2} yongshenIsFu />)
    expect(screen.getByText(/用神·伏 妻财寅木/)).toBeInTheDocument()
  })
```
> `pan.lines` 二爻含伏神妻财寅木（既有 mock）。

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- PanGrid`
Expected: FAIL（新断言失败：`yongshenAt` 未生效）

- [ ] **Step 3: 实现**

改 `src/components/PanGrid.tsx` 的 Props 与命中逻辑（其余渲染不变）：
```tsx
interface Props {
  lines: PanLine[]
  highlight?: LiuQin | null
  /** 伏藏用神（旧）：高亮此爻位并把其伏神标为用神 */
  yongshenHiddenAt?: number | null
  /** 用神所在爻位（解析层定位结果）：按爻位高亮 */
  yongshenAt?: number | null
  /** 命中爻的用神取自伏神 → 伏神小字标「用神·伏」 */
  yongshenIsFu?: boolean
}

export function PanGrid({
  lines,
  highlight = null,
  yongshenHiddenAt = null,
  yongshenAt = null,
  yongshenIsFu = false,
}: Props) {
  const rows = [...lines].reverse() // 上爻在最上
  return (
    <div className="flex flex-col gap-1 font-serif text-ink w-full max-w-sm">
      {rows.map((l) => {
        const visibleHit = highlight !== null && l.liuqin === highlight
        const hiddenHit = yongshenHiddenAt === l.position
        const atHit = yongshenAt === l.position
        const hit = visibleHit || hiddenHit || atHit
        const fuLabel = hiddenHit || (atHit && yongshenIsFu) // 标「用神·伏」
        const liuqinSeal = visibleHit || atHit // 六亲转焦点色
        return (
          <div
            key={l.position}
            data-testid="pan-row"
            data-pos={l.position}
            data-highlight={hit ? 'true' : undefined}
            className={`grid grid-cols-[2.5rem_5.5rem_3.5rem_1fr] items-center gap-2 px-1 py-0.5 rounded ${
              hit ? 'bg-seal/10' : ''
            }`}
          >
            <span className="text-xs text-ink-soft">{l.liushen ?? ''}</span>
            <span className={`text-sm ${liuqinSeal ? 'text-seal' : ''}`}>
              {l.liuqin}
              {l.najia.zhi}
              {l.najia.wuxing}
              {l.fushen && (
                <span className={`block text-[10px] leading-none ${fuLabel ? 'text-seal' : 'text-ink/40'}`}>
                  {fuLabel ? '用神·伏 ' : '伏 '}
                  {l.fushen.liuqin}
                  {l.fushen.najia.zhi}
                  {l.fushen.najia.wuxing}
                </span>
              )}
            </span>
            <span className="flex justify-center">
              {l.yinyang === 'yang' ? (
                <span className="block h-2 w-12 rounded-sm bg-current" />
              ) : (
                <span className="flex gap-1">
                  <span className="block h-2 w-[1.35rem] rounded-sm bg-current" />
                  <span className="block h-2 w-[1.35rem] rounded-sm bg-current" />
                </span>
              )}
            </span>
            <span className="flex items-center gap-1 text-xs">
              {l.shi && <span className="text-seal">世</span>}
              {l.ying && <span className="text-seal">应</span>}
              {l.moving && <span className="text-seal">○动</span>}
              {l.kong && <span className="text-seal border border-seal rounded px-0.5 text-[10px]">空</span>}
              {l.changed && (
                <span className="text-ink-soft text-[10px]">
                  →{l.changed.liuqin}
                  {l.changed.najia.zhi}
                  {l.changed.najia.wuxing}
                </span>
              )}
            </span>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: 跑测试 + build**

Run: `npm test -- PanGrid && npm run build`
Expected: PASS（含既有 4 例 + 新 2 例）+ 构建绿

- [ ] **Step 5: 提交**

```bash
git add src/components/PanGrid.tsx src/components/PanGrid.test.tsx
git commit -m "feat: PanGrid 增按爻位高亮 yongshenAt/yongshenIsFu（兼容旧 props）"
```

---

## Task P3-9: 集成——ResultView 接分析层 + 面板 + 世爻选择器

**Files:**
- Modify: `src/components/YongshenSelector.tsx`
- Modify: `src/components/ResultView.tsx`
- Test: `src/components/YongshenSelector.test.tsx`、`src/components/ResultView.test.tsx`

一次性把 `yong` 状态类型 `LiuQin|null → YongTarget|null`、Selector 加世爻 chip、ResultView 改用 `buildYongshenAnalysis` 驱动高亮并插入面板（耦合改动同提交，保 build 绿）。

- [ ] **Step 1: 改 Selector 测试（失败）**

替换 `src/components/YongshenSelector.test.tsx`：
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { YongshenSelector } from './YongshenSelector'

describe('YongshenSelector', () => {
  it('渲染 5 六亲 + 世爻共 6 个 chip', () => {
    render(<YongshenSelector selected={null} onSelect={vi.fn()} />)
    for (const t of ['父母', '兄弟', '子孙', '妻财', '官鬼', '世']) {
      expect(screen.getByTestId(`yongshen-${t}`)).toBeInTheDocument()
    }
  })
  it('点世爻回调 "世"', async () => {
    const onSelect = vi.fn()
    render(<YongshenSelector selected={null} onSelect={onSelect} />)
    await userEvent.click(screen.getByTestId('yongshen-世'))
    expect(onSelect).toHaveBeenCalledWith('世')
  })
  it('再点已选项取消（回调 null）', async () => {
    const onSelect = vi.fn()
    render(<YongshenSelector selected="妻财" onSelect={onSelect} />)
    await userEvent.click(screen.getByTestId('yongshen-妻财'))
    expect(onSelect).toHaveBeenCalledWith(null)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- YongshenSelector`
Expected: FAIL（无 `yongshen-世`）

- [ ] **Step 3: 改 Selector 实现**

替换 `src/components/YongshenSelector.tsx`：
```tsx
import { useState } from 'react'
import { YongTarget, YONGSHEN_HINTS, SHI_YONG_HINT } from '../domain/yongshen'

interface Props {
  selected: YongTarget | null
  onSelect: (t: YongTarget | null) => void
}

const TARGETS: YongTarget[] = [...YONGSHEN_HINTS.map((h) => h.liuqin), '世']

export function YongshenSelector({ selected, onSelect }: Props) {
  const [showHint, setShowHint] = useState(false)
  return (
    <div className="flex flex-col items-center gap-2 font-serif">
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <span className="text-[10px] text-ink/50">用神</span>
        {TARGETS.map((t) => (
          <button
            key={t}
            data-testid={`yongshen-${t}`}
            onClick={() => onSelect(selected === t ? null : t)}
            className={`text-xs rounded-full px-2 py-0.5 border ${
              selected === t ? 'bg-seal text-white border-seal' : 'border-ink/20 text-ink-soft'
            }`}
          >
            {t === '世' ? '世爻' : t}
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
        <div className="text-[10px] text-ink/50 max-w-xs text-center leading-relaxed">
          {YONGSHEN_HINTS.map(({ liuqin, hint }) => (
            <div key={liuqin}>
              <span className="text-seal">{liuqin}</span> {hint}
            </div>
          ))}
          <div>
            <span className="text-seal">世爻</span> {SHI_YONG_HINT}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: 改 ResultView 测试（失败）**

替换 `src/components/ResultView.test.tsx`（沿用既有 `pan`/`interp` mock，仅改断言与新增面板）。把第 54–75 行的两个「用神高亮」用例替换为下列，并保留第一个「显示所问…」用例：
```tsx
  it('用神（上卦单/多现）只在本卦按爻位高亮、变卦不染，并出现分析面板', async () => {
    render(<ResultView pan={pan} interpretation={interp} onShare={vi.fn()} />)
    await userEvent.click(screen.getByTestId('yongshen-父母'))
    // 父母两现(1、4) → 取舍后只高亮一爻
    const primaryHit = within(screen.getByTestId('board-primary'))
      .getAllByTestId('pan-row')
      .filter((r) => r.getAttribute('data-highlight') === 'true')
    expect(primaryHit).toHaveLength(1)
    expect(['1', '4']).toContain(primaryHit[0].getAttribute('data-pos'))
    // 变卦盘不染
    const changedHit = within(screen.getByTestId('board-changed'))
      .getAllByTestId('pan-row')
      .filter((r) => r.getAttribute('data-highlight') === 'true')
    expect(changedHit).toHaveLength(0)
    // 分析面板出现
    expect(screen.getByTestId('yongshen-panel')).toBeInTheDocument()
    expect(screen.getAllByTestId('force-row').length).toBeGreaterThan(0)
  })
  it('用神不上卦取伏神：高亮伏神所挂爻并标用神·伏', async () => {
    render(<ResultView pan={pan} interpretation={interp} onShare={vi.fn()} />)
    await userEvent.click(screen.getByTestId('yongshen-妻财')) // 本卦无妻财，二爻下伏妻财
    const primaryHit = within(screen.getByTestId('board-primary'))
      .getAllByTestId('pan-row')
      .filter((r) => r.getAttribute('data-highlight') === 'true')
    expect(primaryHit.map((r) => r.getAttribute('data-pos'))).toEqual(['2'])
    expect(screen.getByText(/用神·伏 妻财寅木/)).toBeInTheDocument()
  })
  it('选世爻：高亮持世爻（初爻）', async () => {
    render(<ResultView pan={pan} interpretation={interp} onShare={vi.fn()} />)
    await userEvent.click(screen.getByTestId('yongshen-世'))
    const primaryHit = within(screen.getByTestId('board-primary'))
      .getAllByTestId('pan-row')
      .filter((r) => r.getAttribute('data-highlight') === 'true')
    expect(primaryHit.map((r) => r.getAttribute('data-pos'))).toEqual(['1'])
  })
```

- [ ] **Step 5: 跑测试确认失败**

Run: `npm test -- ResultView`
Expected: FAIL（面板/单染断言未满足）

- [ ] **Step 6: 改 ResultView 实现**

替换 `src/components/ResultView.tsx`：
```tsx
import { useState } from 'react'
import { Pan } from '../domain/pan'
import { Interpretation } from '../domain/interpret'
import { YongTarget } from '../domain/yongshen'
import { buildYongshenAnalysis } from '../domain/yongshen-analysis'
import { PillarsBar } from './PillarsBar'
import { YongshenSelector } from './YongshenSelector'
import { YongshenPanel } from './YongshenPanel'
import { PanGrid } from './PanGrid'

interface Props {
  pan: Pan
  interpretation: Interpretation
  onShare: () => void
}

export function ResultView({ pan, interpretation, onShare }: Props) {
  const [yong, setYong] = useState<YongTarget | null>(null)
  const { reading } = pan
  // 用神分析：定位 + 旺衰 + 生克冲合（多现按链取一）
  const analysis = yong ? buildYongshenAnalysis(pan, yong) : null
  return (
    <div className="flex flex-col items-center gap-5 px-4 w-full max-w-md mx-auto font-serif">
      <div className="text-sm text-ink/70 text-center">
        所问 · <span className="text-ink">{reading.question}</span>
      </div>
      <PillarsBar pillars={pan.pillars} />
      <YongshenSelector selected={yong} onSelect={setYong} />
      <div data-testid="board-primary" className="flex flex-col items-center gap-1 w-full">
        <div className="text-[10px] tracking-[0.3em] text-ink/40">本卦 · {reading.primary.data.name}</div>
        <PanGrid
          lines={pan.lines}
          yongshenAt={analysis?.position ?? null}
          yongshenIsFu={analysis?.isFu ?? false}
        />
      </div>
      {pan.changedLines && reading.changed && (
        <div data-testid="board-changed" className="flex flex-col items-center gap-1 w-full">
          <div className="text-[10px] tracking-[0.3em] text-ink/40">变卦 · {reading.changed.data.name}</div>
          <PanGrid lines={pan.changedLines} />
        </div>
      )}
      {yong && <YongshenPanel analysis={analysis} target={yong} />}
      <div className="text-sm text-ink/80 text-center">
        <span className="text-seal">卦辞　</span>
        {interpretation.judgment}
      </div>
      {interpretation.movingLineTexts.map((m) => (
        <div key={m.index} className="text-xs text-ink/70 text-center">
          <span className="text-seal font-medium">动</span>
          <span className="text-ink/40"> · </span>
          {m.text}
        </div>
      ))}
      <button
        className="mt-2 font-serif tracking-[0.3em] text-ink border border-ink/30 rounded-full px-6 py-2"
        onClick={onShare}
      >
        生成分享图
      </button>
    </div>
  )
}
```

- [ ] **Step 7: 跑测试 + build**

Run: `npm test && npm run build`
Expected: 全绿（Selector / ResultView / 全量单测 + 构建）

- [ ] **Step 8: 提交**

```bash
git add src/components/YongshenSelector.tsx src/components/YongshenSelector.test.tsx src/components/ResultView.tsx src/components/ResultView.test.tsx
git commit -m "feat: ResultView 接用神分析层+面板，选择器加世爻，高亮改按爻位"
```

---

## Task P3-10: 清理——移除 PanGrid 旧高亮 props

**Files:**
- Modify: `src/components/PanGrid.tsx`（整文件替换）
- Test: `src/components/PanGrid.test.tsx`（替换 `describe` 块，顶部 import 与 `pan` mock 保持不变）

ResultView 已不再传 `highlight`/`yongshenHiddenAt`，移除之，仅留 `yongshenAt`/`yongshenIsFu`。属重构：先改测试到新接口，再删实现旧 props，跑绿。

- [ ] **Step 1: 替换测试 `describe` 块**

把 `src/components/PanGrid.test.tsx` 中整个 `describe('PanGrid', …)` 替换为下列（**文件顶部 4 行 import 与 `const pan = {…}` mock 原样保留**）：
```tsx
describe('PanGrid', () => {
  it('渲染六神/六亲纳甲/伏神/变出/世应/动/空', () => {
    render(<PanGrid lines={pan.lines} />)
    expect(screen.getByText('青龙')).toBeInTheDocument()
    expect(screen.getByText(/子孙亥水/)).toBeInTheDocument()
    expect(screen.getByText(/伏 妻财寅木/)).toBeInTheDocument()
    expect(screen.getByText(/→官鬼午火/)).toBeInTheDocument()
    expect(screen.getByText('世')).toBeInTheDocument()
    expect(screen.getByText('应')).toBeInTheDocument()
    expect(screen.getByText('空')).toBeInTheDocument()
  })
  it('上爻在最上（首行 position=6）', () => {
    render(<PanGrid lines={pan.lines} />)
    const rows = screen.getAllByTestId('pan-row')
    expect(rows[0].getAttribute('data-pos')).toBe('6')
    expect(rows[5].getAttribute('data-pos')).toBe('1')
  })
  it('yongshenAt 按爻位高亮单行', () => {
    render(<PanGrid lines={pan.lines} yongshenAt={4} />)
    const hit = screen.getAllByTestId('pan-row').filter((r) => r.getAttribute('data-highlight') === 'true')
    expect(hit).toHaveLength(1)
    expect(hit[0].getAttribute('data-pos')).toBe('4')
  })
  it('yongshenAt + yongshenIsFu 命中爻标「用神·伏」', () => {
    render(<PanGrid lines={pan.lines} yongshenAt={2} yongshenIsFu />)
    expect(screen.getByText(/用神·伏 妻财寅木/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- PanGrid`
Expected: FAIL（`yongshenAt + yongshenIsFu` 例失败——此时实现仍把伏神标为「伏 」而非「用神·伏 」，因旧实现里 `fuLabel` 依赖已删的 props 路径；或因实现仍带旧 props 而新测试不触发。无论何种，先到 Step 3 统一改实现）

- [ ] **Step 3: 整文件替换实现**

`src/components/PanGrid.tsx`（删 `highlight`/`yongshenHiddenAt` 与 `LiuQin` import）：
```tsx
import { PanLine } from '../domain/pan'

interface Props {
  lines: PanLine[]
  /** 用神所在爻位（解析层定位结果）：按爻位高亮 */
  yongshenAt?: number | null
  /** 命中爻的用神取自伏神 → 伏神小字标「用神·伏」 */
  yongshenIsFu?: boolean
}

export function PanGrid({ lines, yongshenAt = null, yongshenIsFu = false }: Props) {
  const rows = [...lines].reverse() // 上爻在最上
  return (
    <div className="flex flex-col gap-1 font-serif text-ink w-full max-w-sm">
      {rows.map((l) => {
        const hit = yongshenAt === l.position
        const fuLabel = hit && yongshenIsFu // 命中且取自伏神 → 标「用神·伏」
        return (
          <div
            key={l.position}
            data-testid="pan-row"
            data-pos={l.position}
            data-highlight={hit ? 'true' : undefined}
            className={`grid grid-cols-[2.5rem_5.5rem_3.5rem_1fr] items-center gap-2 px-1 py-0.5 rounded ${
              hit ? 'bg-seal/10' : ''
            }`}
          >
            <span className="text-xs text-ink-soft">{l.liushen ?? ''}</span>
            <span className={`text-sm ${hit ? 'text-seal' : ''}`}>
              {l.liuqin}
              {l.najia.zhi}
              {l.najia.wuxing}
              {l.fushen && (
                <span className={`block text-[10px] leading-none ${fuLabel ? 'text-seal' : 'text-ink/40'}`}>
                  {fuLabel ? '用神·伏 ' : '伏 '}
                  {l.fushen.liuqin}
                  {l.fushen.najia.zhi}
                  {l.fushen.najia.wuxing}
                </span>
              )}
            </span>
            <span className="flex justify-center">
              {l.yinyang === 'yang' ? (
                <span className="block h-2 w-12 rounded-sm bg-current" />
              ) : (
                <span className="flex gap-1">
                  <span className="block h-2 w-[1.35rem] rounded-sm bg-current" />
                  <span className="block h-2 w-[1.35rem] rounded-sm bg-current" />
                </span>
              )}
            </span>
            <span className="flex items-center gap-1 text-xs">
              {l.shi && <span className="text-seal">世</span>}
              {l.ying && <span className="text-seal">应</span>}
              {l.moving && <span className="text-seal">○动</span>}
              {l.kong && <span className="text-seal border border-seal rounded px-0.5 text-[10px]">空</span>}
              {l.changed && (
                <span className="text-ink-soft text-[10px]">
                  →{l.changed.liuqin}
                  {l.changed.najia.zhi}
                  {l.changed.najia.wuxing}
                </span>
              )}
            </span>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: 跑测试 + build**

Run: `npm test && npm run build`
Expected: 全绿（PanGrid 4 例 + 全量单测 + 类型检查；ResultView 仅用 `yongshenAt`/`yongshenIsFu`，不受影响）

- [ ] **Step 5: 提交**

```bash
git add src/components/PanGrid.tsx src/components/PanGrid.test.tsx
git commit -m "refactor: PanGrid 移除旧六亲高亮 props，仅留按爻位高亮"
```

---

## Task P3-11: E2E + 收尾

**Files:**
- Modify: `tests/e2e/divination.spec.ts`

- [ ] **Step 1: 改 E2E——断言面板出现**

替换 `tests/e2e/divination.spec.ts` 的「选用神高亮」段（第 15–24 行）为：遍历 5 六亲点亮 ≥1 行后，断言分析面板出现；并验证世爻可点亮初爻并出现面板：
```ts
  // 选用神：遍历 5 六亲，至少一个能点亮 ≥1 行
  const liuqins = ['父母', '兄弟', '子孙', '妻财', '官鬼']
  let highlighted = 0
  for (const lq of liuqins) {
    await page.getByTestId(`yongshen-${lq}`).click()
    highlighted = await page.locator('[data-testid="pan-row"][data-highlight="true"]').count()
    if (highlighted > 0) break
  }
  expect(highlighted).toBeGreaterThan(0)
  // 用神分析面板出现，且至少一条受力行
  await expect(page.getByTestId('yongshen-panel')).toBeVisible()
  expect(await page.getByTestId('force-row').count()).toBeGreaterThan(0)

  // 世爻为用：必有唯一持世爻被点亮
  await page.getByTestId('yongshen-世').click()
  expect(await page.locator('[data-testid="pan-row"][data-highlight="true"]').count()).toBe(1)
  await expect(page.getByTestId('yongshen-panel')).toBeVisible()
```

- [ ] **Step 2: 跑全部门槛**

Run: `npm test && npm run build && npm run e2e`
Expected: 单测全绿 + 构建绿 + E2E 通过

- [ ] **Step 3: 提交**

```bash
git add tests/e2e/divination.spec.ts
git commit -m "test: E2E 断言用神分析面板与世爻高亮"
```

- [ ] **Step 4: 终审**

派 opus code-reviewer 全量复审三期（断卦数学正确性 + 降级路径 + 类型一致）。修掉 CRITICAL/HIGH。

---

## 自检（spec 覆盖）

| spec 要求 | 任务 |
|---|---|
| §1.1 六冲六合 | P3-1 |
| §1.2 旺相休囚死 | P3-2 |
| §1.3 受力 + 冲合 | P3-3 |
| §1.4 两现取舍链（6 条 + 降级） | P3-4 |
| §1.5 装配（世爻/伏神/飞神/动/变/乙口径/月破/旬空/降级） | P3-6 |
| §0.9 世爻为用 / §2.1 选择器 | P3-5（类型/口诀）+ P3-9（chip） |
| §0.10 高亮改按爻位 | P3-8（加）+ P3-9（接）+ P3-10（清理） |
| §2.3 面板 B 布局 | P3-7 |
| §2.4 ResultView 装配 | P3-9 |
| §4 降级 | P3-2/P3-4/P3-6 测试覆盖 |
| §5 测试矩阵 / E2E | 各任务 + P3-11 |
