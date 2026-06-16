# 六爻二期 · 专业排盘 设计文档

- **日期**：2026-06-16
- **基于**：一期《六爻占卜网页 · 设计文档》（`2026-06-16-liuyao-fortune-design.md`）
- **一句话**：在一期出卦页上，叠加纳甲、六亲、六神、伏神/飞伏、干支三柱与旬空空亡，并提供用户自选用神 + 口诀提示。把日历（干支柱 + 旬空）交给成熟库，六爻特有逻辑全部自实现为可测纯函数。

---

## 0. 与一期的关系 / 边界变更

一期 §2.2 明确把「纳甲、六亲、六神」排除在外（保持时髦轻量）。二期是**有意的范围扩张**：从"时髦轻量"走向"时髦 + 专业排盘"。一期所有领域纯函数（起卦/查卦/世应/interpret 接缝）保持不动；二期在其上新增「时间」这条轴与「排盘」这层数据，并重排出卦页。

**已确认决策（本次新增）**：

1. 干支历用成熟库 `lunar-typescript`，不自己造节气轮子。
2. 起卦时间 = 摇卦完成那一刻的**设备本地时间**，经可注入 `Clock` 接口（可 mock，和随机源同构）。
3. 变卦排**完整盘**（六神/六亲/纳甲/世应），与本卦盘上下堆叠；本卦动爻处另以小字标变出地支 + 六亲。（二期迭代：原定仅在动爻处标变出，应用户要求改为「变卦也排完整盘」。）
4. 空亡：显示当旬空亡那一对地支，并在本卦中**标出落空的爻**。
5. 伏神/飞伏：**做**。从本宫首卦按位取伏神。
6. 用神：**用户自选**（5 个六亲）+「问什么取什么」口诀提示；选中后高亮卦中对应的爻。
7. 出卦页默认呈现 = **A · 专业盘直接铺开**（完整排盘首屏可见，不折叠）。
8. **变出六亲随本卦之宫五行**论（约定，下文钉死）。
9. 分享卡维持极简（所问 + 卦名 + 卦象 + 卦辞），至多加一行干支柱；**不**塞整张密排盘。

---

## 1. 范围

### 1.1 二期做

在出卦页新增：

1. 顶部显示**所问之事**。
2. **纳甲**：每爻天干 + 地支（展示「地支 + 五行」如 `亥水`；天干入库备用，全纳甲如 `辛亥`）。
3. **六亲**：父母 / 兄弟 / 子孙 / 妻财 / 官鬼。
4. **六神**：青龙 / 朱雀 / 勾陈 / 螣蛇 / 白虎 / 玄武。
5. **年柱 / 月柱 / 日柱** + **当旬空亡**；并在本卦中标出落空的爻。
6. **伏神 / 飞伏**：本卦缺失的六亲，从本宫首卦取伏神挂到对应位。
7. **用神选择器**：用户自选 5 个六亲之一 + 口诀提示，选中高亮卦中对应的爻。
8. **变卦完整盘**：变卦另排一整盘（六亲随本卦宫、世应取变卦自身、六神同位、无动/伏）；本卦动爻处另以小字标变出地支 + 六亲。

### 1.2 二期不做（明确排除）

- 用神**自动**判定（需 NLP）——本期由用户手选。
- 现代白话 / AI 解读——仍留给三期 `interpret()` 接缝。
- 真太阳时 / 经度校正、自定义起卦时间输入——设备本地时间足够；真有需求放后续。
- 进神退神、月破日破、旺相休囚死、动变生克链等断卦分析——属解卦范畴，留给 AI 期。
- 摇卦历史 / 账号 / 收藏。

---

## 2. 起卦时间与可注入时钟

### 2.1 Clock 接口

与一期 `RandomSource` 同构，保证可测确定性。

```ts
export interface Clock {
  now(): Date
}
export const systemClock: Clock = { now: () => new Date() }
export function fixedClock(date: Date): Clock { return { now: () => date } }
```

- `useCasting` 在现有 `rng` 之外再接受 `clock: Clock = systemClock`。
- 摇卦**完成的那一刻**调用 `clock.now()` 抓取 `Date`，连同 reading 一起进入排盘组装。E2E / 单测注入 `fixedClock`。

---

## 3. 干支历（依赖 `lunar-typescript`）

### 3.1 依赖

- 新增运行时依赖 **`lunar-typescript`**（6tail）。纯 JS、可被 Vite 打包进静态产物，不破坏"零后端、可离线"。
- 仅用于「干支三柱 + 旬空」。**所有六爻特有逻辑（纳甲/六亲/六神/伏神/定宫）一律自实现**，不依赖该库。

### 3.2 节气为界 + 方法钉死

六爻惯例：**年以立春为界、月以节为界、日以子时（23:00）换日**。`ganzhi.ts` 封装如下取法（实现时按安装版本核对方法名，并以已知日期测试兜底）。

**旬空自算、不取库方法**：库的 `getDayXunKong()` 内部口径可能与「子时换日」的 Exact 日柱不一致，故旬空一律**从我们选定的日柱字符串自己算**（纯模运算），库只负责三柱。

```ts
import { Solar } from 'lunar-typescript'

const GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
const ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']

export interface GanZhiPillars {
  year: string      // 如 "乙巳"
  month: string     // 如 "戊子"
  day: string       // 如 "甲子"
  dayGan: string    // 日干，如 "甲"（供六神起神）
  xunKong: [string, string]  // 当旬空亡两地支，如 ["戌","亥"]
}

// 由日柱干支算当旬空亡：旬首地支 s=(zhi-gan+12)%12，空亡=(s+10)%12,(s+11)%12
export function xunKongOf(dayGanZhi: string): [string, string] {
  const gan = GAN.indexOf(dayGanZhi.charAt(0))
  const zhi = ZHI.indexOf(dayGanZhi.charAt(1))
  const s = (zhi - gan + 12) % 12
  return [ZHI[(s + 10) % 12], ZHI[(s + 11) % 12]]
}

export function pillarsOf(date: Date): GanZhiPillars {
  const lunar = Solar.fromDate(date).getLunar()
  const year = lunar.getYearInGanZhiExact()    // 立春为界
  const month = lunar.getMonthInGanZhiExact()  // 节为界
  const day = lunar.getDayInGanZhiExact()       // 子时(23:00)换日
  return { year, month, day, dayGan: day.charAt(0), xunKong: xunKongOf(day) }
}
```

- **测试**：`xunKongOf` 纯函数单测——甲子日→[戌,亥]、甲戌日→[申,酉]、甲午日→[辰,巳] 等覆盖多旬；`pillarsOf` 用若干**真实已知日期**断言年月日柱，覆盖立春前后、节前后、23:00 子时换日边界各至少一例。
- **校验**：`xunKong` 长度恒为 2；`dayGan` ∈ 十天干。

---

## 4. 六爻领域算法（纯函数、各自成小文件、可测）

所有模块**不 import React**，输入输出均为不可变数据。地支/五行/卦象一律 bottom-to-top（index 0 = 初爻）。

### 4.1 五行与地支 `wuxing.ts`

```ts
export type WuXing = '金' | '木' | '水' | '火' | '土'
export type DiZhi = '子'|'丑'|'寅'|'卯'|'辰'|'巳'|'午'|'未'|'申'|'酉'|'戌'|'亥'

// 地支五行
const ZHI_WUXING: Record<DiZhi, WuXing> = {
  子:'水', 丑:'土', 寅:'木', 卯:'木', 辰:'土', 巳:'火',
  午:'火', 未:'土', 申:'金', 酉:'金', 戌:'土', 亥:'水',
}
export function zhiWuxing(zhi: DiZhi): WuXing { return ZHI_WUXING[zhi] }

// 生：木→火→土→金→水→木
export function generates(a: WuXing, b: WuXing): boolean
// 克：木→土→水→火→金→木
export function controls(a: WuXing, b: WuXing): boolean
```

### 4.2 定宫 `palace.ts`（京房八宫翻爻构造法）

八纯卦为各宫**首卦**（bottom-to-top，true=阳）：

| 宫 | 首卦 | 二进制(初→上) | 宫五行 |
|---|---|---|---|
| 乾 | 乾为天 | 111111 | 金 |
| 兑 | 兑为泽 | 110110 | 金 |
| 离 | 离为火 | 101101 | 火 |
| 震 | 震为雷 | 100100 | 木 |
| 巽 | 巽为风 | 011011 | 木 |
| 坎 | 坎为水 | 010010 | 水 |
| 艮 | 艮为山 | 001001 | 土 |
| 坤 | 坤为地 | 000000 | 土 |

八宫八卦的**累积翻爻集**（相对首卦，位 1=初爻）：

| 序 | 卦型 | 翻爻集 | 世位 |
|---|---|---|---|
| 0 | 本宫 | {} | 6 |
| 1 | 一世 | {1} | 1 |
| 2 | 二世 | {1,2} | 2 |
| 3 | 三世 | {1,2,3} | 3 |
| 4 | 四世 | {1,2,3,4} | 4 |
| 5 | 五世 | {1,2,3,4,5} | 5 |
| 6 | 游魂 | {1,2,3,5} | 4 |
| 7 | 归魂 | {5} | 3 |

```ts
export interface Palace {
  trigram: string   // 宫，如 '乾'
  element: WuXing   // 宫五行，如 '金'
  headLines: boolean[]  // 本宫首卦六爻（供伏神）
}
// 对 8 首卦 × 8 翻爻集生成 64 → palace 映射；palaceOf(lines) 查表
export function palaceOf(lines: boolean[]): Palace
```

- **测试（生成式）**：构造法产出的 64 卦键唯一且覆盖全部 64 种组合；每卦由「序→世位」推出的世爻**等于**数据集 `hexagrams.ts` 中已存的 `shiYao`（与一期八宫世应测试对齐）。

### 4.3 纳甲 `najia.ts`

八经卦天干（乾坤分内外，其余内外同）：

| 卦 | 内干 | 外干 |
|---|---|---|
| 乾 | 甲 | 壬 |
| 坤 | 乙 | 癸 |
| 震 | 庚 | 庚 |
| 巽 | 辛 | 辛 |
| 坎 | 戊 | 戊 |
| 离 | 己 | 己 |
| 艮 | 丙 | 丙 |
| 兑 | 丁 | 丁 |

八经卦地支（内卦 初→三 / 外卦 四→上）：

| 卦 | 内卦地支 | 外卦地支 |
|---|---|---|
| 乾 | 子 寅 辰 | 午 申 戌 |
| 震 | 子 寅 辰 | 午 申 戌 |
| 坎 | 寅 辰 午 | 申 戌 子 |
| 艮 | 辰 午 申 | 戌 子 寅 |
| 坤 | 未 巳 卯 | 丑 亥 酉 |
| 巽 | 丑 亥 酉 | 未 巳 卯 |
| 离 | 卯 丑 亥 | 酉 未 巳 |
| 兑 | 巳 卯 丑 | 亥 酉 未 |

（阳四卦乾震坎艮地支顺行 +2、阴四卦坤巽离兑逆行 −2，内卦续到外卦连贯。）

```ts
export interface NaJia { gan: string; zhi: DiZhi; wuxing: WuXing }
// 输入下卦/上卦经卦名，输出六爻纳甲(初→上)
export function najiaOf(lowerTrigram: string, upperTrigram: string): NaJia[]
```

- **核对样例**：天风姤（上乾下巽）→ 初辛丑(土)、二辛亥(水)、三辛酉(金)、四壬午(火)、五壬申(金)、上壬戌(土)。
- **测试（属性）**：对全 64 卦，每爻地支落在其所属经卦的三联表内；地支五行与 `zhiWuxing` 一致。

### 4.4 六亲 `liuqin.ts`

以**宫五行**为「我」：

| 关系 | 六亲 |
|---|---|
| 生我者 | 父母 |
| 我生者 | 子孙 |
| 克我者 | 官鬼 |
| 我克者 | 妻财 |
| 同我者 | 兄弟 |

```ts
export type LiuQin = '父母'|'兄弟'|'子孙'|'妻财'|'官鬼'
export function liuqinOf(palaceElement: WuXing, lineWuxing: WuXing): LiuQin
```

- **测试**：天风姤(金)六爻六亲 = 父母/子孙/兄弟/官鬼/兄弟/父母（初→上）；五种关系各覆盖。

### 4.5 六神 `liushen.ts`

按**日干**起神，自初爻向上循环：

| 日干 | 初爻起 |
|---|---|
| 甲 乙 | 青龙 |
| 丙 丁 | 朱雀 |
| 戊 | 勾陈 |
| 己 | 螣蛇 |
| 庚 辛 | 白虎 |
| 壬 癸 | 玄武 |

顺序循环：青龙 → 朱雀 → 勾陈 → 螣蛇 → 白虎 → 玄武 →（回青龙）。

```ts
export type LiuShen = '青龙'|'朱雀'|'勾陈'|'螣蛇'|'白虎'|'玄武'
export function liushenOf(dayGan: string): LiuShen[]  // 长度 6，初→上
```

- **测试**：甲日 → [青龙,朱雀,勾陈,螣蛇,白虎,玄武]；庚日 → [白虎,玄武,青龙,朱雀,勾陈,螣蛇]。

### 4.6 伏神 `fushen.ts`

每个八纯卦六爻地支覆盖全部五行，故任一缺失六亲都能在本宫首卦找到伏神。

规则：
1. 求本卦六爻六亲集合，得**缺失的六亲**（五种里没出现的）。
2. 对每个缺失六亲：在**本宫首卦**（`palace.headLines` + 其纳甲 + 以宫五行算的六亲）中，找到承载该六亲的爻位（若首卦中该六亲出现在多位，取**最下**的一位作伏神来源——钉死规则，避免歧义）。
3. 该首卦爻（地支 + 六亲）即伏神，挂到本卦**同一爻位**的飞神之下。

```ts
export interface FuShen { position: number; liuqin: LiuQin; najia: NaJia }
// 返回本卦缺失六亲对应的伏神列表（按爻位）
export function fushenOf(lines: boolean[]): FuShen[]
```

- **核对样例**：天风姤缺妻财 → 本宫乾为天中妻财 = 寅木(二爻) → 伏神「妻财寅木」挂二爻。
- **测试**：天风姤例；并断言任意卦的伏神六亲都属于"本卦缺失集合"。

### 4.7 用神映射 `yongshen.ts`

数据 + 口诀，不做自动判定：

```ts
export interface YongShenHint { liuqin: LiuQin; hint: string }
export const YONGSHEN_HINTS: YongShenHint[] = [
  { liuqin:'父母', hint:'长辈师长 · 文书学业 · 房屋车舟 · 天时雨水' },
  { liuqin:'兄弟', hint:'兄弟朋友 · 同辈同事 · 竞争 · 破财劫财' },
  { liuqin:'子孙', hint:'子女晚辈 · 下属 · 医药 · 六畜 · 解忧福神' },
  { liuqin:'妻财', hint:'钱财货物 · 妻子 · 薪资利润' },
  { liuqin:'官鬼', hint:'功名事业 · 丈夫 · 官非盗贼 · 疾病忧疑 · 雷电' },
]
```

- UI：选中某六亲后，高亮本卦中六亲 = 该值的所有爻（含动爻/世应叠加显示）。

### 4.8 排盘组装 `pan.ts`

把结构层（与时间无关）与时间层合并为一份不可变排盘数据。

```ts
import { CastReading } from './reading'

export interface PanLine {
  position: number          // 1..6（1=初爻）
  liushen: LiuShen
  liuqin: LiuQin
  najia: NaJia
  yinyang: 'yin' | 'yang'
  moving: boolean
  shi: boolean              // 世
  ying: boolean             // 应
  kong: boolean             // 旬空
  fushen?: FuShen           // 该位伏神（若有）
  changed?: { najia: NaJia; liuqin: LiuQin }  // 动爻变出（地支+六亲，随本卦宫）
}

export interface Pan {
  reading: CastReading
  pillars: GanZhiPillars
  palace: Palace
  lines: PanLine[]          // 初→上
}

export function buildPan(reading: CastReading, date: Date): Pan
```

- `kong`：本卦该爻地支 ∈ `pillars.xunKong` 则为 true。
- `changed`：仅动爻有；取变卦同位地支，**六亲以本卦宫五行论**。
- **测试**：以「乙巳/戊子/甲子日 + 天风姤二爻动」固定输入断言整张 Pan（六神序、六亲、纳甲、世应、二爻 moving+kong+fushen+changed=官鬼午火）。

---

## 5. UI / 布局（选定 A · 专业盘直接铺开）

### 5.1 出卦页结构（自上而下）

```
所问之事
干支柱条： 乙巳年 · 戊子月 · 甲子日   旬空 戌亥
用神选择器： 父母 兄弟 子孙 妻财 官鬼  (?)口诀
完整排盘网格（PanGrid，上爻在最上）
卦辞 / 动爻爻辞（沿用一期 interpret）
[ 生成分享图 ]
```

### 5.2 新组件

- **`PanGrid.tsx`**：密排网格，每爻一行，列 = `六神 | 六亲+纳甲(地支+五行) | 爻象 | 世应·动·空`；动爻行右侧小字标变出；伏神以小字挂在对应六亲下。读序上爻在最上（`[...lines].reverse()`）。沿用宣纸白 token，朱砂红只用于焦点（动/世应/空/用神高亮）。
- **`PillarsBar.tsx`**：三柱 + 旬空（旬空朱砂红）。
- **`YongshenSelector.tsx`**：5 个六亲 chip + `?` 口诀提示（点击/悬浮展开 `YONGSHEN_HINTS`）；受控 `selected: LiuQin | null`，回调上抛给出卦页驱动高亮。
- **`Hexagram.tsx`**：保留，用于分享卡的极简卦象（不动一期实现）。

### 5.3 移动端密度

- 列定宽（参考一期 `grid-cols-[…]` 思路），各爻等高等距，避免世应/伏神撑高行。
- 朱砂红节制：仅动、世/应、空、用神命中四类用焦点色；其余墨色。

### 5.4 分享卡

- 维持一期布局（所问 + 卦名 + 卦象 + 卦辞）；**可加一行**干支柱（如 `乙巳年·戊子月·甲子日`）。不渲染整张密排盘。

---

## 6. 数据流与装配

```
QuestionInput → CastingStage(摇卦动画)
  └ 完成 → useCasting: rng 起卦 → buildReading(question,rng)
                        clock.now() → date
                        buildPan(reading, date) → Pan
  → ResultView(Pan) 渲染 PillarsBar / YongshenSelector / PanGrid / 卦辞
  → interpret(reading)（一期接缝不变，提供卦辞/动爻爻辞）
```

- `useCasting(rng = cryptoRandom, clock = systemClock)`。
- `interpret()` 签名与一期保持一致（三期换 AI 不动调用处）。Pan 与 interpret 并存：Pan 给排盘，interpret 给卦辞文本。

---

## 7. 文件结构（多小文件、高内聚低耦合）

```
src/
  domain/
    clock.ts          # Clock 接口 + systemClock + fixedClock
    ganzhi.ts         # 封装 lunar-typescript → GanZhiPillars
    wuxing.ts         # 五行 / 地支五行 / 生克
    palace.ts         # 八宫定宫 + 宫五行 + 首卦
    najia.ts          # 纳甲（干支）
    liuqin.ts         # 六亲
    liushen.ts        # 六神
    fushen.ts         # 伏神
    yongshen.ts       # 用神口诀数据
    pan.ts            # buildPan 组装
  data/
    najia-tables.ts   # 八经卦天干/地支表（被 najia.ts 引用）
    palace-tables.ts  # 八宫首卦 + 翻爻集（被 palace.ts 引用）
  components/
    PanGrid.tsx
    PillarsBar.tsx
    YongshenSelector.tsx
  hooks/
    useCasting.ts     # 修改：注入 clock，产出 Pan
  components/ResultView.tsx  # 修改：渲染排盘
```

---

## 8. 错误处理与校验

- 所有系统边界先校验：`date` 必为合法 `Date`；`pillarsOf` 返回的旬空必为 2 字；纳甲地支必属十二地支；定宫必命中（64 全覆盖）。
- `lunar-typescript` 调用以 try/catch 兜底：失败时排盘降级为"仅结构层（纳甲/六亲/伏神/世应/卦辞）"，时间层（六神/柱/空亡）以温和占位提示"时间信息暂不可用"，不整页崩。
- 不静默吞错；不硬编码密钥（本期无密钥）。
- 不可变：所有算法返回新对象，不改入参。

---

## 9. 测试策略（≥ 80%）

- **单元**：`wuxing` 生克、`palace` 定宫（生成式 + 对齐世应）、`najia`（全 64 属性）、`liuqin`、`liushen`（按日干）、`fushen`（天风姤例 + 缺失集合断言）、`ganzhi`（真实已知日期 + 立春/节/子时边界）、`pan`（固定输入整盘断言）。
- **集成**：`fixedClock` + `sequenceRandom` 跑 `输入→摇卦→出卦`，断言 PanGrid 关键内容（某爻六神/六亲/纳甲/空/变出）。
- **E2E（Playwright）**：摇卦 → 出现排盘 → 点选用神 → 对应爻高亮；注入随机源 + 固定时间保证确定性。

---

## 10. 部署

- 复用一期 GitHub Actions（`npm ci` → test → build → deploy）。新增依赖 `lunar-typescript` 须同步进 `package-lock.json`，避免一期遇到的 `npm ci` 锁文件漂移导致空白页。
- 仍为纯静态、`base: '/shai/'` 不变。

---

## 11. 已确认决策（汇总）

1. 干支历用 `lunar-typescript`；六爻逻辑自实现。
2. 起卦时间 = 摇卦完成的设备本地时间，经可注入 `Clock`。
3. 年立春界、月节界、日子时换日；旬空取日柱旬空（方法名实现时核对 + 已知日期测试）。
4. 定宫用八宫翻爻构造法（生成式测试，对齐世应）。
5. 变出六亲随本卦之宫五行；首卦多位六亲取最下一位作伏神来源。
6. 出卦页默认 A（专业盘铺开）。
7. 用神用户自选 + 口诀提示，选中高亮。
8. 分享卡维持极简，至多加干支柱一行，不塞密排盘。
