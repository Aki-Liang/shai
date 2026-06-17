# 六爻五期 · 手动摇卦 + AI 解卦 Prompt 设计

> 前四期完成了起卦 → 专业排盘 → 用神分析（生克冲合/旺衰/元忌力量）。五期加两个相对独立的功能：①起卦页可选**赛博摇卦/手动摇卦**，手动让用户逐爻录入三钱阴阳成卦；②卦象页一键生成可复制的 **AI 解卦 Prompt**。

- **一句话**：手动摇卦＝用户自报六爻各三钱阴阳（阴=2/阳=3，复用 `lineFromSum`）成卦，走原排盘链路；AI Prompt＝把全盘+用神分析拼成中文 prompt，展开可复制，拿去喂任意 AI 解卦。
- **不做**：内置 AI 调用（仅生成 prompt 供用户自取）；手动模式的摇卦动画。

---

## 0. 关键决策（来自 brainstorming）

1. **两功能一个 spec**，模块分清；沿用 immutable 与既有起卦链路。
2. **钱面用 阴/阳**，由用户自报（提示：自定哪一物理面为阴/阳，全程一致）。**阴=2、阳=3**，三钱之和走既有 `lineFromSum`（0阳=老阴动 / 1阳=少阳 / 2阳=少阴 / 3阳=老阳动）。
3. **录入行序：上爻在顶、初爻在下**（与卦象盘一致）；每爻三钱填满**实时显示爻象**。
4. **起卦页模式说明**做成**可折叠**（「?」点击展开、默认隐藏）。
5. **AI Prompt 内容尽量全**：问事 / 干支三柱+旬空 / 本卦·变卦名 / 逐爻排盘 / 变卦盘 / 用神段(选了才有) / 末尾解卦指令。**用神可选**（没选则无用神段）。
6. **Prompt 呈现 = 展开只读文本框 + 一键复制**（剪贴板失败可手选）。
7. 沿用既有降级口径（干支历失败 → prompt 时间行降级）。

---

## 1. 领域

### 1.1 手动成卦 `domain/manual-cast.ts`

```ts
export type Coin = '阴' | '阳'

/** 三钱（阴=2、阳=3）之和成爻，复用 lineFromSum */
export function lineFromCoins(coins: [Coin, Coin, Coin]): Line

/** 六爻各三钱 → 本卦（rows[0]=初爻，自下而上） */
export function manualHexagram(rows: ReadonlyArray<[Coin, Coin, Coin]>): Hexagram
```
- `lineFromCoins`：`sum = Σ(阳?3:2)`，`return lineFromSum(sum)`。
- `manualHexagram`：校验 `rows.length === 6`（否则抛 `Error`），`rows.map(lineFromCoins) as Hexagram`。

### 1.2 接缝扩展 `domain/reading.ts`

```ts
export function buildReadingFromHexagram(question: string, primaryLines: Hexagram): CastReading
```
- 抽出现有 `buildReading` 的卦体组装（changed/lookup/movingIndexes）为此函数。
- `buildReading(question, rng) = buildReadingFromHexagram(question, castHexagram(rng))`（保持签名与行为不变）。

### 1.3 AI Prompt `domain/ai-prompt.ts`

```ts
export function buildAiPrompt(pan: Pan, analysis: YongshenAnalysis | null): string
```
纯函数，拼装多段中文文本（段间空行）：

1. `【六爻起卦】`
2. `所问：{reading.question}`
3. 时间：`pillars ? "时间：{year}年 {month}月 {day}日（旬空 {xunKong[0]}{xunKong[1]}）" : "时间：信息暂不可用"`
4. `卦宫：{palace.trigram}{palace.element}宫`
5. `本卦：{primary.data.name}` + （`changed` 时）`　变卦：{changed.data.name}`
6. `排盘（上爻→初爻）：` 然后 `pan.lines` 倒序逐爻一行：
   `{yaoName(pos)} {liushen??""} {liuqin}{najia.zhi}{najia.wuxing}{世/应/(空)} {moving?"○动":""}{fushen?" 伏:{fushen.liuqin}{zhi}{wuxing}":""}{changed?" →{changed.liuqin}{zhi}{wuxing}":""}`
7. （`changedLines` 时）`变卦（上→初）：` 逐爻：`{yaoName} {liuqin}{zhi}{wuxing}{世/应}`
8. 用神段（`analysis` 非 null）：
   - `用神：{liuqin}{najia.zhi}{najia.wuxing}（{position}爻{isFu?"·伏神":""}{isShi?"·世":""}{duplicate?"·两现取{picked}爻":""}） 旺衰{wangshuai}{wangshuaiReason?"·{wangshuaiReason}":""}{monthBreak?"·月破":""}`
   - 对 `analysis.sources` 中带 `role` 者逐条：`{role} {源标签}{zhi}{wuxing} {force.force}{冲/合}{special?"·{special}":strength?"·{strength.wangshuai} {strength.verdict}（{strength.verdictReason}）":""}`
9. 末尾：`请按六爻（京房纳甲）规则，结合用神旺衰与生克冲合解此卦，给出吉凶与建议。`

辅助：`yaoName(pos)`：1→初爻,2→二爻,3→三爻,4→四爻,5→五爻,6→上爻。源标签同面板（月→月建/日→日辰/飞→飞神/动→动爻N/变→变爻N）。
`pillars` 为 null 时第 3 段降级、且 `analysis` 也无旺衰（用神段照出但旺衰显 `—`）。

---

## 2. 组件

### 2.1 `QuestionInput.tsx`（改）
- 类型：`export type CastMode = 'cyber' | 'manual'`（置于 `domain/types.ts` 或本组件导出；统一放 `domain/types.ts`）。
- props：`onSubmit: (question: string, mode: CastMode) => void`。
- 加 `mode` 状态（默认 `'cyber'`）：两胶囊 `赛博摇卦 / 手动摇卦`，`data-testid="mode-cyber"`/`mode-manual`，选中态 seal。
- 加 `?` 折叠按钮（默认隐藏说明）：展开显示「赛博＝密码学随机自动起卦 · 手动＝自己摇铜钱逐爻录入」。
- CTA 文案随模式：cyber→`诚心摇卦`、manual→`手动起卦`；点击 `onSubmit(trimmed, mode)`。

### 2.2 `ManualCast.tsx`（新）
- props：`onComplete: (lines: Hexagram) => void`。
- 状态：6 爻 × 3 钱，每钱 `Coin | null`（初值 null）。
- 顶部提示块：自定阴阳面 / 自初爻起摇六次 / 成爻规则（三阳老阳动·三阴老阴动·一阳少阳·二阳少阴）。
- 渲染 **上爻(pos6)→初爻(pos1)** 倒序 6 行，每行 `{yaoName} | 三枚 阴/阳 切换 | 实时爻象`；三钱齐则用 `lineFromCoins` 算爻象（实线/断线 + 动标 ○/×  + 老阳/少阳/少阴/老阴）；未齐显「待填」。
- 「成卦」按钮：18 钱全填才 enabled；点击 `onComplete(manualHexagram(初→上顺序))`。
- testid：`manual-cast`、每行 `manual-yao`、`make-hexagram` 按钮。

### 2.3 `AiPromptBox.tsx`（新）
- props：`{ pan: Pan; analysis: YongshenAnalysis | null }`。
- 状态：`open`、`copied`。
- 「生成解卦 Prompt」按钮切换 `open`；`open` 时 `useMemo` 算 `buildAiPrompt(pan, analysis)` 渲染只读 `textarea`（`data-testid="ai-prompt-text"`）+「一键复制」。
- 复制：`await navigator.clipboard.writeText(text)`；失败 → 兜底 `textarea.select()` + `document.execCommand('copy')`；成功置 `copied`（显「已复制」），失败显「请手动选中复制」。
- testid：`ai-prompt-btn`、`ai-prompt-text`、`ai-prompt-copy`。

### 2.4 `ResultView.tsx`（改）
- 现有 `analysis`（用神分析）已在手；底部按钮区改为：`<AiPromptBox pan={pan} analysis={analysis} />` 与「生成分享图」按钮并排成组（AiPromptBox 自管展开文本框，置于按钮行下方）。

---

## 3. 状态机 `hooks/useCasting.ts`（改）

- `Phase = 'input' | 'casting' | 'manual' | 'result'`。
- `submit(question, mode)`：`setQuestion(question)`；`setPhase(mode === 'manual' ? 'manual' : 'casting')`。
- `finishCasting()`（赛博）：不变（`buildReading(question, rng)` → pan → result）。
- `finishManual(primaryLines: Hexagram)`：`buildReadingFromHexagram(question, primaryLines)` → `setPan(buildPan(r, clock.now()))` → `interpret` → `result`。
- 返回新增 `finishManual`。

## 4. 装配 `App.tsx`（改）
- `phase === 'manual'` → `<ManualCast onComplete={finishManual} />`。
- `QuestionInput onSubmit` 接 `(q, mode) => submit(q, mode)`。

---

## 5. 错误处理与降级

- 手动录入：`成卦` 须 18 钱全填（按钮置灰）；`Coin` 限定 阴/阳，`lineFromSum` 不会越界。
- 剪贴板：`navigator.clipboard` 缺失/拒绝 → execCommand 兜底 → 仍失败提示手选；文本框始终可见可选。
- AI Prompt：`pillars` null → 时间行降级；`analysis` null → 无用神段。
- 纯函数对非法输入 fail-fast（`manualHexagram` 行数校验）。

## 6. 测试

- **单元**
  - `manual-cast`：`lineFromCoins` 四态（阳阳阳→老阳动 / 阴阴阳→少阳 / 阴阳阳→少阴 / 阴阴阴→老阴动）；`manualHexagram` 6 行成卦 + 行数非 6 抛错。
  - `reading`：`buildReadingFromHexagram` 固定 Hexagram → 卦名/变卦/动爻下标；`buildReading(rng)` 仍可用（回归既有用例）。
  - `ai-prompt`：固定 Pan（午月例）断言含 问事/干支/本卦名/逐爻/用神段/末尾指令；`pillars=null` → 「信息暂不可用」；`analysis=null` → 无用神段。
- **组件**
  - `QuestionInput`：模式切换 + `?` 折叠 + `onSubmit(q,mode)` 传对 mode。
  - `ManualCast`：填满 18 钱 `成卦` 由禁用变可用；点钱实时出爻象；`onComplete` 收到正确 `Hexagram`。
  - `AiPromptBox`：点按钮出文本框含关键段；复制调用 clipboard（mock）。
- **集成/E2E**：E2E 补「手动摇卦」一条（选手动 → 录入 18 钱 → 成卦 → 出排盘）；prompt 框出现可断言（剪贴板不强断）。
- 覆盖率沿用 ≥80%。

---

## 7. 文件结构

新增：
```
src/domain/manual-cast.ts        # Coin / lineFromCoins / manualHexagram
src/domain/ai-prompt.ts          # buildAiPrompt
src/components/ManualCast.tsx     # 手动逐爻录入
src/components/AiPromptBox.tsx    # prompt 展开 + 复制
（各 .test）
```
改动：
```
src/domain/types.ts              # +CastMode
src/domain/reading.ts            # +buildReadingFromHexagram
src/hooks/useCasting.ts          # +mode 路由 / +finishManual / phase 'manual'
src/components/QuestionInput.tsx # +模式胶囊 / +折叠说明
src/App.tsx                      # +manual 路由
src/components/ResultView.tsx    # +AiPromptBox
tests/e2e/divination.spec.ts     # +手动摇卦路径
```
均 < 200 行，纯函数与展示分离。

---

## 8. 实施顺序（供 plan 拆任务）

manual-cast → reading(buildReadingFromHexagram) → ai-prompt → useCasting(mode/finishManual) → QuestionInput(模式) → ManualCast → AiPromptBox → App+ResultView 装配 → E2E。每步 TDD（红→绿→提交）。
