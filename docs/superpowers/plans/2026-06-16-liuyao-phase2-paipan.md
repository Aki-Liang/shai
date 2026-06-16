# 六爻二期 · 专业排盘 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在一期出卦页上叠加纳甲、六亲、六神、伏神/飞伏、干支三柱与旬空空亡，并提供用户自选用神 + 口诀提示，全部为可测纯函数 + 受控组件。

**Architecture:** 干支历（年/月/日柱 + 日干）委托成熟库 `lunar-typescript`；旬空、纳甲、六亲、六神、定宫、伏神全部自实现为不 import React 的纯函数（bottom-to-top，index 0=初爻）。新增可注入 `Clock`（与一期 `RandomSource` 同构）在摇卦完成时抓设备本地时间。`buildPan(reading, date)` 把结构层与时间层合并成不可变 `Pan`，出卦页用 `PanGrid/PillarsBar/YongshenSelector` 渲染（默认专业盘铺开）。

**Tech Stack:** Vite + React + TypeScript + Tailwind + Vitest + Playwright + `lunar-typescript`。

**Spec:** `docs/superpowers/specs/2026-06-16-liuyao-phase2-paipan-design.md`

---

## 文件结构（新增/修改）

```
src/
  domain/
    wuxing.ts          [新] 五行 / 地支五行 / 生克
    palace.ts          [新] 八宫定宫 → 宫五行 + 首卦
    najia.ts           [新] 纳甲（干支）
    liuqin.ts          [新] 六亲
    liushen.ts         [新] 六神
    fushen.ts          [新] 伏神
    clock.ts           [新] Clock 接口 + systemClock + fixedClock
    ganzhi.ts          [新] 旬空自算 + 封装 lunar-typescript → 三柱
    yongshen.ts        [新] 用神口诀数据
    pan.ts             [新] buildPan 组装
  data/
    palace-tables.ts   [新] 八宫首卦 + 翻爻集
    najia-tables.ts    [新] 八经卦天干/地支表
  components/
    PillarsBar.tsx     [新] 干支柱 + 旬空
    YongshenSelector.tsx [新] 用神选择器 + 口诀
    PanGrid.tsx        [新] 密排盘网格
    ResultView.tsx     [改] 渲染排盘（props 由 reading→pan）
    ShareCard.tsx      [改] 增可选干支柱一行
  hooks/
    useCasting.ts      [改] 注入 clock，产出 pan
  App.tsx              [改] 注入 clock、传 pan
tests/e2e/
  divination.spec.ts   [改] 增「选用神→高亮」断言
```

每个任务做完跑 `npm test`（= `vitest run`）确保全绿再提交。所有提交信息用 `feat:` / `chore:` 前缀，**不加** 任何 Co-Authored-By / 署名（全局关闭）。

---

## Task 1: 安装 lunar-typescript 依赖

**Files:**
- Modify: `package.json`、`package-lock.json`

- [ ] **Step 1: 安装依赖**

Run:
```bash
npm install lunar-typescript
```
若遇 npm 缓存 EACCES（一期出现过），改用：
```bash
npm install lunar-typescript --cache /tmp/npmcache-fix
```

- [ ] **Step 2: 验证安装与 API 可用**

Run:
```bash
node -e "const {Solar}=require('lunar-typescript'); console.log(Solar.fromYmd(2026,6,16).getLunar().getDayInGanZhi())"
```
Expected: 打印一个两字干支（如 `庚寅`），证明依赖装好且 API 可调。

- [ ] **Step 3: 确认现有测试仍全绿**

Run: `npm test`
Expected: 一期全部测试 PASS（新依赖不影响）。

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: 引入 lunar-typescript 用于干支历"
```

---

## Task 2: 五行 wuxing.ts

**Files:**
- Create: `src/domain/wuxing.ts`
- Test: `src/domain/wuxing.test.ts`

- [ ] **Step 1: 写失败测试**

`src/domain/wuxing.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { zhiWuxing, generates, controls } from './wuxing'

describe('wuxing', () => {
  it('地支五行', () => {
    expect(zhiWuxing('子')).toBe('水')
    expect(zhiWuxing('午')).toBe('火')
    expect(zhiWuxing('酉')).toBe('金')
    expect(zhiWuxing('寅')).toBe('木')
    expect(zhiWuxing('辰')).toBe('土')
  })
  it('相生：木火土金水循环', () => {
    expect(generates('木', '火')).toBe(true)
    expect(generates('金', '水')).toBe(true)
    expect(generates('火', '木')).toBe(false)
  })
  it('相克：木土水火金循环', () => {
    expect(controls('木', '土')).toBe(true)
    expect(controls('火', '金')).toBe(true)
    expect(controls('金', '木')).toBe(true)
    expect(controls('土', '木')).toBe(false)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- wuxing`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现**

`src/domain/wuxing.ts`:
```ts
export type WuXing = '金' | '木' | '水' | '火' | '土'
export type DiZhi =
  | '子' | '丑' | '寅' | '卯' | '辰' | '巳'
  | '午' | '未' | '申' | '酉' | '戌' | '亥'

const ZHI_WUXING: Record<DiZhi, WuXing> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
}
export function zhiWuxing(zhi: DiZhi): WuXing {
  return ZHI_WUXING[zhi]
}

// 生：木→火→土→金→水→木
const GEN_NEXT: Record<WuXing, WuXing> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
export function generates(a: WuXing, b: WuXing): boolean {
  return GEN_NEXT[a] === b
}

// 克：木→土→水→火→金→木
const CTRL_NEXT: Record<WuXing, WuXing> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }
export function controls(a: WuXing, b: WuXing): boolean {
  return CTRL_NEXT[a] === b
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test -- wuxing`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/domain/wuxing.ts src/domain/wuxing.test.ts
git commit -m "feat: 五行/地支五行/生克 wuxing"
```

---

## Task 3: 八宫定宫 palace.ts

**Files:**
- Create: `src/data/palace-tables.ts`、`src/domain/palace.ts`
- Test: `src/domain/palace.test.ts`

- [ ] **Step 1: 写数据表**

`src/data/palace-tables.ts`:
```ts
import { WuXing } from '../domain/wuxing'

// 八宫首卦（六爻自下而上，true=阳）+ 宫五行
export interface PalaceHead {
  trigram: string
  element: WuXing
  lines: boolean[]
}
export const PALACE_HEADS: PalaceHead[] = [
  { trigram: '乾', element: '金', lines: [true, true, true, true, true, true] },
  { trigram: '兑', element: '金', lines: [true, true, false, true, true, false] },
  { trigram: '离', element: '火', lines: [true, false, true, true, false, true] },
  { trigram: '震', element: '木', lines: [true, false, false, true, false, false] },
  { trigram: '巽', element: '木', lines: [false, true, true, false, true, true] },
  { trigram: '坎', element: '水', lines: [false, true, false, false, true, false] },
  { trigram: '艮', element: '土', lines: [false, false, true, false, false, true] },
  { trigram: '坤', element: '土', lines: [false, false, false, false, false, false] },
]

// 八宫八卦：相对首卦的累积翻爻集（位 1=初爻）+ 世位
export interface PalaceVariant {
  flips: number[]
  shiYao: number
}
export const PALACE_VARIANTS: PalaceVariant[] = [
  { flips: [], shiYao: 6 },           // 本宫
  { flips: [1], shiYao: 1 },          // 一世
  { flips: [1, 2], shiYao: 2 },       // 二世
  { flips: [1, 2, 3], shiYao: 3 },    // 三世
  { flips: [1, 2, 3, 4], shiYao: 4 }, // 四世
  { flips: [1, 2, 3, 4, 5], shiYao: 5 }, // 五世
  { flips: [1, 2, 3, 5], shiYao: 4 }, // 游魂
  { flips: [5], shiYao: 3 },          // 归魂
]
```

- [ ] **Step 2: 写失败测试**

`src/domain/palace.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { PALACE_HEADS, PALACE_VARIANTS } from '../data/palace-tables'
import { hexagrams } from '../data/hexagrams'
import { palaceOf } from './palace'

const keyOf = (lines: boolean[]) => lines.map((b) => (b ? '1' : '0')).join('')

describe('八宫定宫', () => {
  it('构造法覆盖全部 64 卦且键唯一', () => {
    const keys = new Set<string>()
    for (const head of PALACE_HEADS)
      for (const v of PALACE_VARIANTS) {
        const lines = head.lines.map((b, i) => (v.flips.includes(i + 1) ? !b : b))
        keys.add(keyOf(lines))
      }
    expect(keys.size).toBe(64)
  })
  it('每卦世位与数据集 shiYao 对齐', () => {
    for (const head of PALACE_HEADS)
      for (const v of PALACE_VARIANTS) {
        const lines = head.lines.map((b, i) => (v.flips.includes(i + 1) ? !b : b))
        const hex = hexagrams.find((h) => keyOf(h.lines) === keyOf(lines))
        expect(hex, `缺卦 ${keyOf(lines)}`).toBeTruthy()
        expect(hex!.shiYao).toBe(v.shiYao)
      }
  })
  it('palaceOf 返回宫与宫五行', () => {
    expect(palaceOf([true, true, true, true, true, true]).element).toBe('金') // 乾为天
    expect(palaceOf([false, false, false, false, false, false]).element).toBe('土') // 坤为地
    // 天风姤（初阴余阳）→ 乾宫
    expect(palaceOf([false, true, true, true, true, true]).trigram).toBe('乾')
  })
})
```

- [ ] **Step 3: 跑测试确认失败**

Run: `npm test -- palace`
Expected: FAIL（`palace` 模块不存在）。

- [ ] **Step 4: 实现**

`src/domain/palace.ts`:
```ts
import { WuXing } from './wuxing'
import { PALACE_HEADS, PALACE_VARIANTS } from '../data/palace-tables'

export interface Palace {
  trigram: string
  element: WuXing
  headLines: boolean[]
}

const keyOf = (lines: boolean[]) => lines.map((b) => (b ? '1' : '0')).join('')

const PALACE_MAP: Map<string, Palace> = (() => {
  const m = new Map<string, Palace>()
  for (const head of PALACE_HEADS)
    for (const v of PALACE_VARIANTS) {
      const lines = head.lines.map((b, i) => (v.flips.includes(i + 1) ? !b : b))
      m.set(keyOf(lines), { trigram: head.trigram, element: head.element, headLines: head.lines })
    }
  return m
})()

export function palaceOf(lines: boolean[]): Palace {
  const p = PALACE_MAP.get(keyOf(lines))
  if (!p) throw new Error(`palaceOf: 未命中卦 ${keyOf(lines)}`)
  return p
}
```

- [ ] **Step 5: 跑测试确认通过**

Run: `npm test -- palace`
Expected: PASS（含 64 卦世位与一期数据对齐）。

- [ ] **Step 6: Commit**

```bash
git add src/data/palace-tables.ts src/domain/palace.ts src/domain/palace.test.ts
git commit -m "feat: 京房八宫定宫（翻爻构造 + 世位对齐校验）"
```

---

## Task 4: 纳甲 najia.ts

**Files:**
- Create: `src/data/najia-tables.ts`、`src/domain/najia.ts`
- Test: `src/domain/najia.test.ts`

- [ ] **Step 1: 写数据表**

`src/data/najia-tables.ts`:
```ts
import { DiZhi } from '../domain/wuxing'

// 八经卦天干（乾坤分内外，其余内外同）
export const TRIGRAM_GAN: Record<string, { inner: string; outer: string }> = {
  乾: { inner: '甲', outer: '壬' },
  坤: { inner: '乙', outer: '癸' },
  震: { inner: '庚', outer: '庚' },
  巽: { inner: '辛', outer: '辛' },
  坎: { inner: '戊', outer: '戊' },
  离: { inner: '己', outer: '己' },
  艮: { inner: '丙', outer: '丙' },
  兑: { inner: '丁', outer: '丁' },
}

// 八经卦地支（内卦 初→三 / 外卦 四→上）
export const TRIGRAM_ZHI: Record<string, { inner: DiZhi[]; outer: DiZhi[] }> = {
  乾: { inner: ['子', '寅', '辰'], outer: ['午', '申', '戌'] },
  震: { inner: ['子', '寅', '辰'], outer: ['午', '申', '戌'] },
  坎: { inner: ['寅', '辰', '午'], outer: ['申', '戌', '子'] },
  艮: { inner: ['辰', '午', '申'], outer: ['戌', '子', '寅'] },
  坤: { inner: ['未', '巳', '卯'], outer: ['丑', '亥', '酉'] },
  巽: { inner: ['丑', '亥', '酉'], outer: ['未', '巳', '卯'] },
  离: { inner: ['卯', '丑', '亥'], outer: ['酉', '未', '巳'] },
  兑: { inner: ['巳', '卯', '丑'], outer: ['亥', '酉', '未'] },
}
```

- [ ] **Step 2: 写失败测试**

`src/domain/najia.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { najiaOf } from './najia'
import { hexagrams } from '../data/hexagrams'
import { TRIGRAM_ZHI } from '../data/najia-tables'
import { zhiWuxing } from './wuxing'

describe('纳甲', () => {
  it('天风姤（下巽上乾）六爻干支', () => {
    const nj = najiaOf('巽', '乾')
    expect(nj.map((n) => n.gan + n.zhi)).toEqual(['辛丑', '辛亥', '辛酉', '壬午', '壬申', '壬戌'])
    expect(nj.map((n) => n.wuxing)).toEqual(['土', '水', '金', '火', '金', '土'])
  })
  it('全 64 卦：每爻地支属于其经卦三联表，且五行自洽', () => {
    for (const h of hexagrams) {
      const nj = najiaOf(h.lower, h.upper)
      expect(nj).toHaveLength(6)
      const lowerZhi = TRIGRAM_ZHI[h.lower].inner
      const upperZhi = TRIGRAM_ZHI[h.upper].outer
      for (let i = 0; i < 3; i++) expect(lowerZhi).toContain(nj[i].zhi)
      for (let i = 3; i < 6; i++) expect(upperZhi).toContain(nj[i].zhi)
      for (const n of nj) expect(n.wuxing).toBe(zhiWuxing(n.zhi))
    }
  })
})
```

- [ ] **Step 3: 跑测试确认失败**

Run: `npm test -- najia`
Expected: FAIL（`najia` 模块不存在）。

- [ ] **Step 4: 实现**

`src/domain/najia.ts`:
```ts
import { DiZhi, WuXing, zhiWuxing } from './wuxing'
import { TRIGRAM_GAN, TRIGRAM_ZHI } from '../data/najia-tables'

export interface NaJia {
  gan: string
  zhi: DiZhi
  wuxing: WuXing
}

/** 纳甲：下卦用内干 + 内卦地支(初→三)，上卦用外干 + 外卦地支(四→上)，返回初→上 6 爻 */
export function najiaOf(lowerTrigram: string, upperTrigram: string): NaJia[] {
  const lowerZhi = TRIGRAM_ZHI[lowerTrigram]
  const upperZhi = TRIGRAM_ZHI[upperTrigram]
  const lowerGan = TRIGRAM_GAN[lowerTrigram]
  const upperGan = TRIGRAM_GAN[upperTrigram]
  if (!lowerZhi || !upperZhi) throw new Error(`najiaOf: 未知经卦 ${lowerTrigram}/${upperTrigram}`)
  const result: NaJia[] = []
  for (let i = 0; i < 3; i++) {
    const zhi = lowerZhi.inner[i]
    result.push({ gan: lowerGan.inner, zhi, wuxing: zhiWuxing(zhi) })
  }
  for (let i = 0; i < 3; i++) {
    const zhi = upperZhi.outer[i]
    result.push({ gan: upperGan.outer, zhi, wuxing: zhiWuxing(zhi) })
  }
  return result
}
```

- [ ] **Step 5: 跑测试确认通过**

Run: `npm test -- najia`
Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add src/data/najia-tables.ts src/domain/najia.ts src/domain/najia.test.ts
git commit -m "feat: 纳甲（八经卦干支三联表）"
```

---

## Task 5: 六亲 liuqin.ts

**Files:**
- Create: `src/domain/liuqin.ts`
- Test: `src/domain/liuqin.test.ts`

- [ ] **Step 1: 写失败测试**

`src/domain/liuqin.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { liuqinOf } from './liuqin'
import { najiaOf } from './najia'

describe('六亲', () => {
  it('以金宫为我的五类关系', () => {
    expect(liuqinOf('金', '金')).toBe('兄弟') // 同我
    expect(liuqinOf('金', '土')).toBe('父母') // 生我
    expect(liuqinOf('金', '水')).toBe('子孙') // 我生
    expect(liuqinOf('金', '火')).toBe('官鬼') // 克我
    expect(liuqinOf('金', '木')).toBe('妻财') // 我克
  })
  it('天风姤（金宫）六爻六亲', () => {
    const rel = najiaOf('巽', '乾').map((n) => liuqinOf('金', n.wuxing))
    expect(rel).toEqual(['父母', '子孙', '兄弟', '官鬼', '兄弟', '父母'])
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- liuqin`
Expected: FAIL。

- [ ] **Step 3: 实现**

`src/domain/liuqin.ts`:
```ts
import { WuXing, generates, controls } from './wuxing'

export type LiuQin = '父母' | '兄弟' | '子孙' | '妻财' | '官鬼'

/** 以宫五行 me 为「我」判定 other 的六亲 */
export function liuqinOf(me: WuXing, other: WuXing): LiuQin {
  if (me === other) return '兄弟'
  if (generates(other, me)) return '父母' // 生我者父母
  if (generates(me, other)) return '子孙' // 我生者子孙
  if (controls(other, me)) return '官鬼' // 克我者官鬼
  if (controls(me, other)) return '妻财' // 我克者妻财
  throw new Error(`liuqinOf: 无法判定 ${me} vs ${other}`)
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test -- liuqin`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/domain/liuqin.ts src/domain/liuqin.test.ts
git commit -m "feat: 六亲（宫五行生克判定）"
```

---

## Task 6: 六神 liushen.ts

**Files:**
- Create: `src/domain/liushen.ts`
- Test: `src/domain/liushen.test.ts`

- [ ] **Step 1: 写失败测试**

`src/domain/liushen.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { liushenOf } from './liushen'

describe('六神', () => {
  it('甲乙日起青龙（初→上）', () => {
    expect(liushenOf('甲')).toEqual(['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武'])
    expect(liushenOf('乙')).toEqual(['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武'])
  })
  it('庚辛日起白虎', () => {
    expect(liushenOf('庚')).toEqual(['白虎', '玄武', '青龙', '朱雀', '勾陈', '螣蛇'])
  })
  it('戊日起勾陈、己日起螣蛇、壬癸日起玄武', () => {
    expect(liushenOf('戊')[0]).toBe('勾陈')
    expect(liushenOf('己')[0]).toBe('螣蛇')
    expect(liushenOf('壬')[0]).toBe('玄武')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- liushen`
Expected: FAIL。

- [ ] **Step 3: 实现**

`src/domain/liushen.ts`:
```ts
export type LiuShen = '青龙' | '朱雀' | '勾陈' | '螣蛇' | '白虎' | '玄武'

const ORDER: LiuShen[] = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武']
const START: Record<string, LiuShen> = {
  甲: '青龙', 乙: '青龙', 丙: '朱雀', 丁: '朱雀', 戊: '勾陈',
  己: '螣蛇', 庚: '白虎', 辛: '白虎', 壬: '玄武', 癸: '玄武',
}

/** 按日干起神，自初爻向上循环，返回 6 个（初→上） */
export function liushenOf(dayGan: string): LiuShen[] {
  const start = ORDER.indexOf(START[dayGan])
  if (start < 0) throw new Error(`liushenOf: 未知日干 ${dayGan}`)
  return Array.from({ length: 6 }, (_, i) => ORDER[(start + i) % 6])
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test -- liushen`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/domain/liushen.ts src/domain/liushen.test.ts
git commit -m "feat: 六神（按日干起神）"
```

---

## Task 7: 伏神 fushen.ts

**Files:**
- Create: `src/domain/fushen.ts`
- Test: `src/domain/fushen.test.ts`

- [ ] **Step 1: 写失败测试**

`src/domain/fushen.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { fushenOf } from './fushen'
import { najiaOf } from './najia'
import { liuqinOf } from './liuqin'

// 天风姤六爻六亲（金宫）= 父母/子孙/兄弟/官鬼/兄弟/父母，缺妻财
const gouLines = [false, true, true, true, true, true]
const gouLiuqin = najiaOf('巽', '乾').map((n) => liuqinOf('金', n.wuxing))

describe('伏神', () => {
  it('天风姤缺妻财 → 本宫乾为天二爻妻财寅木伏于二爻', () => {
    const fu = fushenOf(gouLines, gouLiuqin)
    expect(fu).toHaveLength(1)
    expect(fu[0].liuqin).toBe('妻财')
    expect(fu[0].najia.zhi).toBe('寅')
    expect(fu[0].najia.wuxing).toBe('木')
    expect(fu[0].position).toBe(2)
  })
  it('伏神六亲必属本卦缺失集合', () => {
    const present = new Set(gouLiuqin)
    for (const f of fushenOf(gouLines, gouLiuqin)) {
      expect(present.has(f.liuqin)).toBe(false)
    }
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- fushen`
Expected: FAIL。

- [ ] **Step 3: 实现**

`src/domain/fushen.ts`:
```ts
import { palaceOf } from './palace'
import { najiaOf, NaJia } from './najia'
import { liuqinOf, LiuQin } from './liuqin'

export interface FuShen {
  position: number // 1=初爻
  liuqin: LiuQin
  najia: NaJia
}

const ALL_LIUQIN: LiuQin[] = ['父母', '兄弟', '子孙', '妻财', '官鬼']

/**
 * 伏神：本卦缺失的六亲，从本宫首卦取（首卦含全五类六亲）。
 * 首卦中该六亲若现于多位，取最下一位（index 最小）作来源，挂到同一爻位。
 */
export function fushenOf(lines: boolean[], presentLiuqin: LiuQin[]): FuShen[] {
  const palace = palaceOf(lines)
  const present = new Set(presentLiuqin)
  const missing = ALL_LIUQIN.filter((lq) => !present.has(lq))
  const headNajia = najiaOf(palace.trigram, palace.trigram)
  const headLiuqin = headNajia.map((n) => liuqinOf(palace.element, n.wuxing))
  const result: FuShen[] = []
  for (const lq of missing) {
    const idx = headLiuqin.indexOf(lq) // 最下一位
    if (idx >= 0) result.push({ position: idx + 1, liuqin: lq, najia: headNajia[idx] })
  }
  return result
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test -- fushen`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/domain/fushen.ts src/domain/fushen.test.ts
git commit -m "feat: 伏神（本宫首卦取缺失六亲）"
```

---

## Task 8: 可注入时钟 clock.ts

**Files:**
- Create: `src/domain/clock.ts`
- Test: `src/domain/clock.test.ts`

- [ ] **Step 1: 写失败测试**

`src/domain/clock.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { fixedClock, systemClock } from './clock'

describe('clock', () => {
  it('fixedClock 总返回同一时刻', () => {
    const d = new Date('2026-06-16T12:00:00')
    expect(fixedClock(d).now().getTime()).toBe(d.getTime())
  })
  it('systemClock 返回 Date', () => {
    expect(systemClock.now()).toBeInstanceOf(Date)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- clock`
Expected: FAIL。

- [ ] **Step 3: 实现**

`src/domain/clock.ts`:
```ts
export interface Clock {
  now(): Date
}

export const systemClock: Clock = { now: () => new Date() }

export function fixedClock(date: Date): Clock {
  return { now: () => date }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test -- clock`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/domain/clock.ts src/domain/clock.test.ts
git commit -m "feat: 可注入时钟 Clock（systemClock/fixedClock）"
```

---

## Task 9: 干支历 ganzhi.ts

**Files:**
- Create: `src/domain/ganzhi.ts`
- Test: `src/domain/ganzhi.test.ts`

> 说明：旬空纯函数 `xunKongOf` 完全自算并断言确定值；三柱委托 `lunar-typescript`，用「立春/节/子时」边界 + 60 日周期 + 自洽断言验证。绝对日柱由实现者用 https://www.hko.gov.hk 或寿星万年历核对一次（非门禁，结构 + 边界已覆盖正确性）。

- [ ] **Step 1: 写失败测试**

`src/domain/ganzhi.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { pillarsOf, xunKongOf } from './ganzhi'

describe('旬空 xunKongOf', () => {
  it('各旬空亡', () => {
    expect(xunKongOf('甲子')).toEqual(['戌', '亥'])
    expect(xunKongOf('甲戌')).toEqual(['申', '酉'])
    expect(xunKongOf('甲申')).toEqual(['午', '未'])
    expect(xunKongOf('甲午')).toEqual(['辰', '巳'])
    expect(xunKongOf('甲辰')).toEqual(['寅', '卯'])
    expect(xunKongOf('甲寅')).toEqual(['子', '丑'])
  })
  it('同旬非甲日共享空亡', () => {
    expect(xunKongOf('乙丑')).toEqual(['戌', '亥']) // 甲子旬
    expect(xunKongOf('癸酉')).toEqual(['戌', '亥']) // 甲子旬末
  })
})

describe('三柱 pillarsOf', () => {
  it('年以立春为界：2026 立春前为乙巳、后为丙午', () => {
    expect(pillarsOf(new Date('2026-01-15T12:00:00')).year).toBe('乙巳')
    expect(pillarsOf(new Date('2026-03-01T12:00:00')).year).toBe('丙午')
  })
  it('月以节为界：2026 芒种后为甲午月', () => {
    expect(pillarsOf(new Date('2026-06-16T12:00:00')).month).toBe('甲午')
  })
  it('日柱 60 日一周期，dayGan/旬空自洽', () => {
    const p1 = pillarsOf(new Date('2026-06-16T12:00:00'))
    const p2 = pillarsOf(new Date('2026-08-15T12:00:00')) // +60 天
    expect(p2.day).toBe(p1.day)
    expect(p1.dayGan).toBe(p1.day.charAt(0))
    expect(p1.xunKong).toEqual(xunKongOf(p1.day))
    expect(p1.xunKong).toHaveLength(2)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- ganzhi`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现**

`src/domain/ganzhi.ts`:
```ts
import { Solar } from 'lunar-typescript'

const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

export interface GanZhiPillars {
  year: string // 如 "乙巳"
  month: string // 如 "甲午"
  day: string // 如 "甲子"
  dayGan: string // 日干，如 "甲"
  xunKong: [string, string] // 当旬空亡两地支，如 ["戌","亥"]
}

/** 由日柱干支算当旬空亡：旬首地支 s=(zhi-gan+12)%12，空亡=(s+10)%12,(s+11)%12 */
export function xunKongOf(dayGanZhi: string): [string, string] {
  const gan = GAN.indexOf(dayGanZhi.charAt(0))
  const zhi = ZHI.indexOf(dayGanZhi.charAt(1))
  if (gan < 0 || zhi < 0) throw new Error(`xunKongOf: 非法日柱 ${dayGanZhi}`)
  const s = (zhi - gan + 12) % 12
  return [ZHI[(s + 10) % 12], ZHI[(s + 11) % 12]]
}

/** 设备本地时间 → 干支三柱 + 旬空（年立春界 / 月节界 / 日子时换日） */
export function pillarsOf(date: Date): GanZhiPillars {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new Error('pillarsOf: 非法 Date')
  }
  const lunar = Solar.fromDate(date).getLunar()
  const year = lunar.getYearInGanZhiExact() // 立春为界
  const month = lunar.getMonthInGanZhiExact() // 节为界
  const day = lunar.getDayInGanZhiExact() // 子时(23:00)换日
  return { year, month, day, dayGan: day.charAt(0), xunKong: xunKongOf(day) }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test -- ganzhi`
Expected: PASS。若年/月柱断言失败，说明该库版本对应方法名不同 —— 用 `node -e "const {Solar}=require('lunar-typescript'); const l=Solar.fromYmd(2026,3,1).getLunar(); console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(l)).filter(n=>/GanZhi/.test(n)))"` 列出可用方法，改用对应的「立春/节/Exact」变体。

- [ ] **Step 5: Commit**

```bash
git add src/domain/ganzhi.ts src/domain/ganzhi.test.ts
git commit -m "feat: 干支三柱 + 旬空（lunar-typescript 封装 + 自算旬空）"
```

---

## Task 10: 用神口诀 yongshen.ts

**Files:**
- Create: `src/domain/yongshen.ts`
- Test: `src/domain/yongshen.test.ts`

- [ ] **Step 1: 写失败测试**

`src/domain/yongshen.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { YONGSHEN_HINTS } from './yongshen'

describe('用神口诀', () => {
  it('覆盖五类六亲且口诀非空', () => {
    const liuqin = YONGSHEN_HINTS.map((h) => h.liuqin)
    expect(liuqin).toEqual(['父母', '兄弟', '子孙', '妻财', '官鬼'])
    for (const h of YONGSHEN_HINTS) expect(h.hint.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- yongshen`
Expected: FAIL。

- [ ] **Step 3: 实现**

`src/domain/yongshen.ts`:
```ts
import { LiuQin } from './liuqin'

export interface YongShenHint {
  liuqin: LiuQin
  hint: string
}

/** 「问什么取什么」口诀（传统简化版），供用户自选用神时参考 */
export const YONGSHEN_HINTS: YongShenHint[] = [
  { liuqin: '父母', hint: '长辈师长 · 文书学业 · 房屋车舟 · 天时雨水' },
  { liuqin: '兄弟', hint: '兄弟朋友 · 同辈同事 · 竞争 · 破财劫财' },
  { liuqin: '子孙', hint: '子女晚辈 · 下属 · 医药 · 六畜 · 解忧福神' },
  { liuqin: '妻财', hint: '钱财货物 · 妻子 · 薪资利润' },
  { liuqin: '官鬼', hint: '功名事业 · 丈夫 · 官非盗贼 · 疾病忧疑 · 雷电' },
]
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test -- yongshen`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/domain/yongshen.ts src/domain/yongshen.test.ts
git commit -m "feat: 用神口诀数据"
```

---

## Task 11: 排盘组装 pan.ts

**Files:**
- Create: `src/domain/pan.ts`
- Test: `src/domain/pan.test.ts`

- [ ] **Step 1: 写失败测试**

`src/domain/pan.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { buildPan } from './pan'
import { CastReading } from './reading'
import { lookupHexagram } from './hexagram-lookup'
import { changedHexagram, movingLineIndexes } from './casting'
import { Hexagram } from './types'
import { liushenOf } from './liushen'

// 天风姤，二爻动（九二老阳→变阴 → 天山遯）
const gou: Hexagram = [
  { yinyang: 'yin', moving: false },
  { yinyang: 'yang', moving: true },
  { yinyang: 'yang', moving: false },
  { yinyang: 'yang', moving: false },
  { yinyang: 'yang', moving: false },
  { yinyang: 'yang', moving: false },
]
function gouReading(): CastReading {
  const changedLines = changedHexagram(gou)
  return {
    question: '测试',
    primary: { lines: gou, data: lookupHexagram(gou) },
    changed: changedLines ? { lines: changedLines, data: lookupHexagram(changedLines) } : null,
    movingIndexes: movingLineIndexes(gou),
  }
}

describe('buildPan', () => {
  const pan = buildPan(gouReading(), new Date('2026-06-16T12:00:00'))

  it('宫为乾、金', () => {
    expect(pan.palace.trigram).toBe('乾')
    expect(pan.palace.element).toBe('金')
  })
  it('纳甲与六亲（初→上）', () => {
    expect(pan.lines.map((l) => l.najia.zhi)).toEqual(['丑', '亥', '酉', '午', '申', '戌'])
    expect(pan.lines.map((l) => l.liuqin)).toEqual(['父母', '子孙', '兄弟', '官鬼', '兄弟', '父母'])
  })
  it('世应：世在初爻、应在四爻', () => {
    expect(pan.lines[0].shi).toBe(true)
    expect(pan.lines[3].ying).toBe(true)
  })
  it('二爻动 + 变出官鬼午火', () => {
    expect(pan.lines[1].moving).toBe(true)
    expect(pan.lines[1].changed?.liuqin).toBe('官鬼')
    expect(pan.lines[1].changed?.najia.zhi).toBe('午')
  })
  it('伏神：二爻下伏妻财寅木', () => {
    expect(pan.lines[1].fushen?.liuqin).toBe('妻财')
    expect(pan.lines[1].fushen?.najia.zhi).toBe('寅')
  })
  it('时间层接线正确：六神序与日干一致、空亡按旬空地支', () => {
    expect(pan.lines.map((l) => l.liushen)).toEqual(liushenOf(pan.pillars.dayGan))
    for (const l of pan.lines) {
      expect(l.kong).toBe(pan.pillars.xunKong.includes(l.najia.zhi))
    }
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- pan`
Expected: FAIL（`pan` 模块不存在）。

- [ ] **Step 3: 实现**

`src/domain/pan.ts`:
```ts
import { CastReading } from './reading'
import { GanZhiPillars, pillarsOf } from './ganzhi'
import { Palace, palaceOf } from './palace'
import { najiaOf, NaJia } from './najia'
import { liuqinOf, LiuQin } from './liuqin'
import { liushenOf, LiuShen } from './liushen'
import { fushenOf, FuShen } from './fushen'

export interface PanLine {
  position: number // 1=初爻
  liushen: LiuShen
  liuqin: LiuQin
  najia: NaJia
  yinyang: 'yin' | 'yang'
  moving: boolean
  shi: boolean
  ying: boolean
  kong: boolean
  fushen?: FuShen
  changed?: { najia: NaJia; liuqin: LiuQin } // 动爻变出（地支+六亲，随本卦宫）
}

export interface Pan {
  reading: CastReading
  pillars: GanZhiPillars
  palace: Palace
  lines: PanLine[] // 初→上
}

export function buildPan(reading: CastReading, date: Date): Pan {
  const { primary, changed } = reading
  const data = primary.data
  const palace = palaceOf(data.lines)
  const pillars = pillarsOf(date)
  const najia = najiaOf(data.lower, data.upper)
  const liuqin = najia.map((n) => liuqinOf(palace.element, n.wuxing))
  const liushen = liushenOf(pillars.dayGan)
  const fushByPos = new Map(fushenOf(data.lines, liuqin).map((f) => [f.position, f]))
  const changedNajia = changed ? najiaOf(changed.data.lower, changed.data.upper) : null

  const lines: PanLine[] = primary.lines.map((line, i) => {
    const pos = i + 1
    const nj = najia[i]
    const ch =
      line.moving && changedNajia
        ? { najia: changedNajia[i], liuqin: liuqinOf(palace.element, changedNajia[i].wuxing) }
        : undefined
    return {
      position: pos,
      liushen: liushen[i],
      liuqin: liuqin[i],
      najia: nj,
      yinyang: line.yinyang,
      moving: line.moving,
      shi: pos === data.shiYao,
      ying: pos === data.yingYao,
      kong: pillars.xunKong.includes(nj.zhi),
      fushen: fushByPos.get(pos),
      changed: ch,
    }
  })

  return { reading, pillars, palace, lines }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test -- pan`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/domain/pan.ts src/domain/pan.test.ts
git commit -m "feat: buildPan 排盘组装（结构层 + 时间层）"
```

---

## Task 12: useCasting 注入 clock 并产出 pan

**Files:**
- Modify: `src/hooks/useCasting.ts`
- Test: `src/hooks/useCasting.test.ts`（追加用例）

- [ ] **Step 1: 追加失败测试**

在 `src/hooks/useCasting.test.ts` 顶部 import 增加：
```ts
import { fixedClock } from '../domain/clock'
```
并在 `describe('useCasting 状态机', ...)` 内追加：
```ts
  it('finishCasting 产出 pan（注入固定时钟）', async () => {
    const clock = fixedClock(new Date('2026-06-16T12:00:00'))
    const { result } = renderHook(() => useCasting(sequenceRandom([1, 1, 1]), clock))
    act(() => result.current.submit('问'))
    await act(async () => { await result.current.finishCasting() })
    expect(result.current.pan).not.toBeNull()
    expect(result.current.pan?.lines).toHaveLength(6)
    expect(result.current.pan?.pillars.day.length).toBe(2)
  })
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- useCasting`
Expected: FAIL（`pan` 不存在 / 第二参数未接受）。

- [ ] **Step 3: 实现修改**

`src/hooks/useCasting.ts` 全文改为：
```ts
import { useCallback, useState } from 'react'
import { RandomSource, cryptoRandom } from '../domain/random'
import { Clock, systemClock } from '../domain/clock'
import { buildReading, CastReading } from '../domain/reading'
import { buildPan, Pan } from '../domain/pan'
import { interpret, Interpretation } from '../domain/interpret'

type Phase = 'input' | 'casting' | 'result'

export function useCasting(rng: RandomSource = cryptoRandom, clock: Clock = systemClock) {
  const [phase, setPhase] = useState<Phase>('input')
  const [question, setQuestion] = useState('')
  const [reading, setReading] = useState<CastReading | null>(null)
  const [pan, setPan] = useState<Pan | null>(null)
  const [interpretation, setInterpretation] = useState<Interpretation | null>(null)

  const submit = useCallback((q: string) => {
    setQuestion(q)
    setPhase('casting')
  }, [])

  const finishCasting = useCallback(async () => {
    const r = buildReading(question, rng)
    setReading(r)
    setPan(buildPan(r, clock.now()))
    setInterpretation(await interpret(r))
    setPhase('result')
  }, [question, rng, clock])

  const reset = useCallback(() => {
    setReading(null)
    setPan(null)
    setInterpretation(null)
    setQuestion('')
    setPhase('input')
  }, [])

  return { phase, reading, pan, interpretation, submit, finishCasting, reset }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test -- useCasting`
Expected: PASS（原有 2 例 + 新增 1 例）。

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCasting.ts src/hooks/useCasting.test.ts
git commit -m "feat: useCasting 注入 clock 并产出 pan"
```

---

## Task 13: PillarsBar 组件

**Files:**
- Create: `src/components/PillarsBar.tsx`
- Test: `src/components/PillarsBar.test.tsx`

- [ ] **Step 1: 写失败测试**

`src/components/PillarsBar.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PillarsBar } from './PillarsBar'
import { GanZhiPillars } from '../domain/ganzhi'

const pillars: GanZhiPillars = {
  year: '丙午', month: '甲午', day: '甲子', dayGan: '甲', xunKong: ['戌', '亥'],
}

describe('PillarsBar', () => {
  it('显示三柱与旬空', () => {
    render(<PillarsBar pillars={pillars} />)
    expect(screen.getByText(/丙午年/)).toBeInTheDocument()
    expect(screen.getByText(/甲午月/)).toBeInTheDocument()
    expect(screen.getByText(/甲子日/)).toBeInTheDocument()
    expect(screen.getByText(/旬空 戌亥/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- PillarsBar`
Expected: FAIL。

- [ ] **Step 3: 实现**

`src/components/PillarsBar.tsx`:
```tsx
import { GanZhiPillars } from '../domain/ganzhi'

interface Props {
  pillars: GanZhiPillars
}

export function PillarsBar({ pillars }: Props) {
  return (
    <div className="flex items-center justify-center gap-3 text-xs text-ink-soft font-serif">
      <span>{pillars.year}年</span>
      <span>{pillars.month}月</span>
      <span>{pillars.day}日</span>
      <span className="text-seal">旬空 {pillars.xunKong[0]}{pillars.xunKong[1]}</span>
    </div>
  )
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test -- PillarsBar`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/components/PillarsBar.tsx src/components/PillarsBar.test.tsx
git commit -m "feat: PillarsBar 干支三柱 + 旬空"
```

---

## Task 14: YongshenSelector 组件

**Files:**
- Create: `src/components/YongshenSelector.tsx`
- Test: `src/components/YongshenSelector.test.tsx`

- [ ] **Step 1: 写失败测试**

`src/components/YongshenSelector.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { YongshenSelector } from './YongshenSelector'

describe('YongshenSelector', () => {
  it('点选某六亲回调该值；再次点选取消（null）', async () => {
    const onSelect = vi.fn()
    const { rerender } = render(<YongshenSelector selected={null} onSelect={onSelect} />)
    await userEvent.click(screen.getByTestId('yongshen-官鬼'))
    expect(onSelect).toHaveBeenLastCalledWith('官鬼')
    rerender(<YongshenSelector selected="官鬼" onSelect={onSelect} />)
    await userEvent.click(screen.getByTestId('yongshen-官鬼'))
    expect(onSelect).toHaveBeenLastCalledWith(null)
  })
  it('点 ? 展开口诀提示', async () => {
    render(<YongshenSelector selected={null} onSelect={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: '?' }))
    expect(screen.getByText(/功名事业/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- YongshenSelector`
Expected: FAIL。

- [ ] **Step 3: 实现**

`src/components/YongshenSelector.tsx`:
```tsx
import { useState } from 'react'
import { LiuQin } from '../domain/liuqin'
import { YONGSHEN_HINTS } from '../domain/yongshen'

interface Props {
  selected: LiuQin | null
  onSelect: (lq: LiuQin | null) => void
}

export function YongshenSelector({ selected, onSelect }: Props) {
  const [showHint, setShowHint] = useState(false)
  return (
    <div className="flex flex-col items-center gap-2 font-serif">
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <span className="text-[10px] text-ink/50">用神</span>
        {YONGSHEN_HINTS.map(({ liuqin }) => (
          <button
            key={liuqin}
            data-testid={`yongshen-${liuqin}`}
            onClick={() => onSelect(selected === liuqin ? null : liuqin)}
            className={`text-xs rounded-full px-2 py-0.5 border ${
              selected === liuqin ? 'bg-seal text-white border-seal' : 'border-ink/20 text-ink-soft'
            }`}
          >
            {liuqin}
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
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test -- YongshenSelector`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/components/YongshenSelector.tsx src/components/YongshenSelector.test.tsx
git commit -m "feat: YongshenSelector 用神选择器 + 口诀"
```

---

## Task 15: PanGrid 密排盘网格

**Files:**
- Create: `src/components/PanGrid.tsx`
- Test: `src/components/PanGrid.test.tsx`

- [ ] **Step 1: 写失败测试**

`src/components/PanGrid.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PanGrid } from './PanGrid'
import { Pan } from '../domain/pan'

// 手搭一份最小 Pan：二爻动+空+伏神+变出，世初应四
const pan = {
  reading: {},
  pillars: { year: '丙午', month: '甲午', day: '甲子', dayGan: '甲', xunKong: ['亥', '子'] },
  palace: { trigram: '乾', element: '金', headLines: [] },
  lines: [
    { position: 1, liushen: '青龙', liuqin: '父母', najia: { gan: '辛', zhi: '丑', wuxing: '土' }, yinyang: 'yin', moving: false, shi: true, ying: false, kong: false },
    { position: 2, liushen: '朱雀', liuqin: '子孙', najia: { gan: '辛', zhi: '亥', wuxing: '水' }, yinyang: 'yang', moving: true, shi: false, ying: false, kong: true,
      fushen: { position: 2, liuqin: '妻财', najia: { gan: '甲', zhi: '寅', wuxing: '木' } },
      changed: { najia: { gan: '丙', zhi: '午', wuxing: '火' }, liuqin: '官鬼' } },
    { position: 3, liushen: '勾陈', liuqin: '兄弟', najia: { gan: '辛', zhi: '酉', wuxing: '金' }, yinyang: 'yang', moving: false, shi: false, ying: false, kong: false },
    { position: 4, liushen: '螣蛇', liuqin: '官鬼', najia: { gan: '壬', zhi: '午', wuxing: '火' }, yinyang: 'yang', moving: false, shi: false, ying: true, kong: false },
    { position: 5, liushen: '白虎', liuqin: '兄弟', najia: { gan: '壬', zhi: '申', wuxing: '金' }, yinyang: 'yang', moving: false, shi: false, ying: false, kong: false },
    { position: 6, liushen: '玄武', liuqin: '父母', najia: { gan: '壬', zhi: '戌', wuxing: '土' }, yinyang: 'yang', moving: false, shi: false, ying: false, kong: false },
  ],
} as unknown as Pan

describe('PanGrid', () => {
  it('渲染六神/六亲纳甲/伏神/变出/世应/动/空', () => {
    render(<PanGrid pan={pan} highlight={null} />)
    expect(screen.getByText('青龙')).toBeInTheDocument()
    expect(screen.getByText(/子孙亥水/)).toBeInTheDocument()
    expect(screen.getByText(/伏 妻财寅木/)).toBeInTheDocument()
    expect(screen.getByText(/→官鬼午火/)).toBeInTheDocument()
    expect(screen.getByText('世')).toBeInTheDocument()
    expect(screen.getByText('应')).toBeInTheDocument()
    expect(screen.getByText('空')).toBeInTheDocument()
  })
  it('上爻在最上（首行 position=6）', () => {
    render(<PanGrid pan={pan} highlight={null} />)
    const rows = screen.getAllByTestId('pan-row')
    expect(rows[0].getAttribute('data-pos')).toBe('6')
    expect(rows[5].getAttribute('data-pos')).toBe('1')
  })
  it('highlight 命中六亲的行打标', () => {
    render(<PanGrid pan={pan} highlight="官鬼" />)
    const hit = screen.getAllByTestId('pan-row').filter((r) => r.getAttribute('data-highlight') === 'true')
    expect(hit).toHaveLength(1)
    expect(hit[0].getAttribute('data-pos')).toBe('4')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- PanGrid`
Expected: FAIL。

- [ ] **Step 3: 实现**

`src/components/PanGrid.tsx`:
```tsx
import { Pan } from '../domain/pan'
import { LiuQin } from '../domain/liuqin'

interface Props {
  pan: Pan
  highlight: LiuQin | null
}

export function PanGrid({ pan, highlight }: Props) {
  const rows = [...pan.lines].reverse() // 上爻在最上
  return (
    <div className="flex flex-col gap-1 font-serif text-ink w-full max-w-sm">
      {rows.map((l) => {
        const hit = highlight !== null && l.liuqin === highlight
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
            <span className="text-xs text-ink-soft">{l.liushen}</span>
            <span className={`text-sm ${hit ? 'text-seal' : ''}`}>
              {l.liuqin}
              {l.najia.zhi}
              {l.najia.wuxing}
              {l.fushen && (
                <span className="block text-[10px] text-ink/40 leading-none">
                  伏 {l.fushen.liuqin}
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
              {l.kong && (
                <span className="text-seal border border-seal rounded px-0.5 text-[10px]">空</span>
              )}
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

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test -- PanGrid`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/components/PanGrid.tsx src/components/PanGrid.test.tsx
git commit -m "feat: PanGrid 密排盘网格（六神/六亲纳甲/伏神/变出/世应/动/空 + 用神高亮）"
```

---

## Task 16: ResultView 改渲染排盘

**Files:**
- Modify: `src/components/ResultView.tsx`
- Test: `src/components/ResultView.test.tsx`（重写为 pan）

- [ ] **Step 1: 重写测试**

`src/components/ResultView.test.tsx` 全文改为：
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResultView } from './ResultView'
import { Pan } from '../domain/pan'
import { Interpretation } from '../domain/interpret'

const pan = {
  reading: {
    question: '此次面试能成否',
    primary: { data: { name: '天风姤' } },
    changed: { data: { name: '天山遯' } },
  },
  pillars: { year: '丙午', month: '甲午', day: '甲子', dayGan: '甲', xunKong: ['戌', '亥'] },
  palace: { trigram: '乾', element: '金', headLines: [] },
  lines: [
    { position: 1, liushen: '青龙', liuqin: '父母', najia: { gan: '辛', zhi: '丑', wuxing: '土' }, yinyang: 'yin', moving: false, shi: true, ying: false, kong: false },
    { position: 2, liushen: '朱雀', liuqin: '官鬼', najia: { gan: '辛', zhi: '亥', wuxing: '水' }, yinyang: 'yang', moving: false, shi: false, ying: false, kong: false },
    { position: 3, liushen: '勾陈', liuqin: '兄弟', najia: { gan: '辛', zhi: '酉', wuxing: '金' }, yinyang: 'yang', moving: false, shi: false, ying: false, kong: false },
    { position: 4, liushen: '螣蛇', liuqin: '父母', najia: { gan: '壬', zhi: '午', wuxing: '火' }, yinyang: 'yang', moving: false, shi: false, ying: true, kong: false },
    { position: 5, liushen: '白虎', liuqin: '兄弟', najia: { gan: '壬', zhi: '申', wuxing: '金' }, yinyang: 'yang', moving: false, shi: false, ying: false, kong: false },
    { position: 6, liushen: '玄武', liuqin: '子孙', najia: { gan: '壬', zhi: '戌', wuxing: '土' }, yinyang: 'yang', moving: false, shi: false, ying: false, kong: false },
  ],
} as unknown as Pan

const interp: Interpretation = {
  question: '此次面试能成否', primaryName: '天风姤', changedName: '天山遯',
  judgment: '姤：女壮，勿用取女。',
  movingLineTexts: [{ index: 1, text: '九二：包有鱼，无咎，不利宾。' }],
}

describe('ResultView', () => {
  it('显示所问、卦名、干支柱、卦辞、动爻爻辞', () => {
    render(<ResultView pan={pan} interpretation={interp} onShare={vi.fn()} />)
    expect(screen.getByText(/此次面试能成否/)).toBeInTheDocument()
    expect(screen.getByText(/天风姤/)).toBeInTheDocument()
    expect(screen.getByText(/丙午年/)).toBeInTheDocument()
    expect(screen.getByText(/女壮/)).toBeInTheDocument()
    expect(screen.getByText(/包有鱼/)).toBeInTheDocument()
  })
  it('选用神高亮对应六亲行', async () => {
    render(<ResultView pan={pan} interpretation={interp} onShare={vi.fn()} />)
    await userEvent.click(screen.getByTestId('yongshen-父母'))
    const hit = screen.getAllByTestId('pan-row').filter((r) => r.getAttribute('data-highlight') === 'true')
    expect(hit.map((r) => r.getAttribute('data-pos')).sort()).toEqual(['1', '4'])
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- ResultView`
Expected: FAIL（旧 ResultView 仍要 `reading` prop / 无用神）。

- [ ] **Step 3: 重写实现**

`src/components/ResultView.tsx` 全文改为：
```tsx
import { useState } from 'react'
import { Pan } from '../domain/pan'
import { Interpretation } from '../domain/interpret'
import { LiuQin } from '../domain/liuqin'
import { PillarsBar } from './PillarsBar'
import { YongshenSelector } from './YongshenSelector'
import { PanGrid } from './PanGrid'

interface Props {
  pan: Pan
  interpretation: Interpretation
  onShare: () => void
}

export function ResultView({ pan, interpretation, onShare }: Props) {
  const [yong, setYong] = useState<LiuQin | null>(null)
  const { reading } = pan
  return (
    <div className="flex flex-col items-center gap-5 px-4 w-full max-w-md mx-auto font-serif">
      <div className="text-sm text-ink/70 text-center">
        所问 · <span className="text-ink">{reading.question}</span>
      </div>
      <div className="text-lg text-ink">
        {reading.primary.data.name}
        {reading.changed && <span className="text-ink/40 text-sm"> → {reading.changed.data.name}</span>}
      </div>
      <PillarsBar pillars={pan.pillars} />
      <YongshenSelector selected={yong} onSelect={setYong} />
      <PanGrid pan={pan} highlight={yong} />
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

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test -- ResultView`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/components/ResultView.tsx src/components/ResultView.test.tsx
git commit -m "feat: ResultView 渲染专业排盘（所问/柱/用神/排盘）"
```

---

## Task 17: App 装配 clock + pan，ShareCard 增干支柱

**Files:**
- Modify: `src/App.tsx`、`src/components/ShareCard.tsx`
- Test: `src/App.test.tsx`（沿用，确认仍绿）

- [ ] **Step 1: 改 ShareCard 增可选干支柱**

`src/components/ShareCard.tsx` 在 `Props` 增加可选字段并渲染。把接口与渲染分别改为：
```tsx
interface Props {
  interpretation: Interpretation
  lines: Hex
  shiYao: number
  yingYao: number
  dateText: string
  pillarsText?: string
}
```
并在 `forwardRef` 解构里加入 `pillarsText`，在 `<div className="text-xs text-ink/70 text-center">{interpretation.judgment}</div>` 之后插入一行：
```tsx
      {pillarsText && <div className="text-[10px] text-ink-soft">{pillarsText}</div>}
```
解构签名改为：
```tsx
  { interpretation, lines, shiYao, yingYao, dateText, pillarsText },
```

- [ ] **Step 2: 改 App 注入 clock、改用 pan、传干支柱**

`src/App.tsx` 全文改为：
```tsx
import { useRef, useState } from 'react'
import { useCasting } from './hooks/useCasting'
import { useShareImage } from './hooks/useShareImage'
import { QuestionInput } from './components/QuestionInput'
import { CastingStage } from './components/CastingStage'
import { ResultView } from './components/ResultView'
import { ShareCard } from './components/ShareCard'
import { RandomSource } from './domain/random'
import { Clock } from './domain/clock'

export default function App({ rng, clock }: { rng?: RandomSource; clock?: Clock } = {}) {
  const { phase, pan, interpretation, submit, finishCasting, reset } = useCasting(rng, clock)
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
      {phase === 'input' && <QuestionInput onSubmit={submit} />}
      {phase === 'casting' && <CastingStage onComplete={finishCasting} />}
      {phase === 'result' && pan && interpretation && (
        <>
          <ResultView pan={pan} interpretation={interpretation} onShare={handleShare} />
          <button
            className="mt-8 text-xs text-ink/40 underline font-serif"
            onClick={() => { setToast(null); reset() }}
          >
            再 占 一 卦
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
              pillarsText={`${pan.pillars.year}年 · ${pan.pillars.month}月 · ${pan.pillars.day}日`}
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

- [ ] **Step 3: 跑测试确认全绿**

Run: `npm test -- App ShareCard`
Expected: PASS（App 全流程仍断言「潜龙勿用」「分享」按钮；ShareCard 旧测试不传 `pillarsText` 仍通过）。

- [ ] **Step 4: 跑全量测试**

Run: `npm test`
Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/ShareCard.tsx
git commit -m "feat: App 注入 clock、改渲染 pan；分享卡增干支柱"
```

---

## Task 18: E2E 增「选用神→高亮」并收尾

**Files:**
- Modify: `tests/e2e/divination.spec.ts`

- [ ] **Step 1: 追加 E2E 断言**

`tests/e2e/divination.spec.ts` 全文改为：
```ts
import { test, expect } from '@playwright/test'

test('完整占卦流程到出卦 + 排盘 + 选用神高亮', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('心有所问')).toBeVisible()
  await page.getByRole('textbox').fill('我该换工作吗？')
  await page.getByRole('button', { name: /摇卦/ }).click()
  await page.getByRole('button', { name: /跳过/ }).click()
  // 排盘要素
  await expect(page.getByText('卦辞')).toBeVisible()
  await expect(page.getByText(/旬空/)).toBeVisible()
  await expect(page.getByTestId('pan-row').first()).toBeVisible()
  // 选用神 → 至少一行高亮
  await page.getByTestId('yongshen-兄弟').click()
  await expect(page.locator('[data-testid="pan-row"][data-highlight="true"]').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /分享/ })).toBeVisible()
})
```

> 注：全背六掷（E2E 走真实 crypto 随机，非注入）任何卦都至少有「兄弟」六亲（八纯卦含全五类；一般卦多数也含），但极少数卦可能无「兄弟」爻致高亮 0 行。为稳妥，E2E 仅断言「点击后存在高亮行」；若该卦恰无兄弟，改点 `yongshen-父母`（父母在多数卦出现）。实现者跑一次确认所用随机结果稳定；E2E webServer 复用 dev server。

- [ ] **Step 2: 跑 E2E**

Run: `npm run e2e`
Expected: PASS。若高亮断言偶发失败（该卦无所选六亲），把所选用神改为该卦确有的六亲（用 `npx playwright test --debug` 看排盘）。

- [ ] **Step 3: 跑全量单测 + 构建**

Run: `npm test && npm run build`
Expected: 全部 PASS，`tsc -b && vite build` 成功（类型零报错）。

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/divination.spec.ts
git commit -m "test: E2E 覆盖排盘渲染与用神高亮"
```

---

## 完成后

- 跑 `superpowers:finishing-a-development-branch` 收尾（合并 / PR / 保留）。
- 分支 `feat/liuyao-phase2-paipan` 已含 spec 提交，最终一并 PR。
- 二期不动一期的字体子集化（Task 14 of 一期仍延后），不动部署 workflow（`npm ci` 会带上新 lockfile）。
```
