# 六爻四期 · 元神/忌神 + 力量评估 设计

> 三期产出了用神分析面板（生克冲合 + 月令旺衰 + 两现取舍 + 作用源联动高亮）。四期在作用源上叠加：标出**元神/忌神**身份，给元神/忌神做一次「子用神」力量评估（被月/日/动爻/空亡如何影响），并给**有力/无用**结论；用神旺衰也补上缘由。

- **一句话**：作用源中 `得生→元神`、`受克→忌神`；对落在动/变/飞的元神/忌神，评估其月令旺衰、日辰/月破/卦中动爻/旬空对它的影响，断「有力/无用」；用神与元忌的旺衰都带一句缘由。
- **不做**（留后期）：入墓 / 绝 / 三刑 / 三合局 / 仇神 / 泄神比和的命名。

---

## 0. 关键决策（来自 brainstorming）

1. **身份**只标 `得生→元神`、`受克→忌神`；泄/耗/比和维持原受力词，不另起名（仇神=克元神者，本期不做）。
2. **旺衰 + 力量评估**只给**动/变/飞**的元神/忌神。元忌若落在 **月建→标「当令」**、**日辰→标「主宰」**（日辰为主宰不论旺衰），不评力量。
3. **缘由**：旺衰附一句缘由；**用神旺衰也补缘由**（口径统一）。
4. **力量影响项**（对元忌爻，复用既有生克冲合）：月令旺衰 / 日辰(临·生·合扶；克·冲抑) / 月破 / 卦中动爻(标爻位) / 旬空(真空假空) / 自身发动回头生克。
5. **有力/无用 判定**：
   - **无用**：真空亡（休囚 + 静 + 不被日冲）｜ 月破（失令且静）｜（失令 且 被日/动/回头克 且 无生扶）。
   - **有力**：其余（得令 ｜ 临日月 ｜ 得日月动生扶 ｜ 发动有气），且无上述破损。
6. **变爻为孤立回头爻**：力量评估只取 月/日/空（卦中其他动爻不及变爻、自身无further回头）。
7. **面板 Layout B**：每个元忌源占两行。
8. 历法降级（pillars=null）时无旺衰/无缘由/无力量评估，沿三期降级。
9. **不做入墓/绝。**

---

## 1. 领域定义

### 1.1 旺衰缘由 `domain/wangshuai-reason.ts`

```
wangshuaiReasonOf(zhi: DiZhi, monthZhi: DiZhi): string
```
内部：`w = zhiWuxing(zhi)`、`m = zhiWuxing(monthZhi)`、`ws = wangShuaiOf(w, monthZhi)`，按五态返回缘由（X 侧 `{zhi}{w}`，月侧 `{monthZhi}{m}`）：

| 旺衰 | 关系 | 缘由文案（例：寅木/申金 在午月） |
|---|---|---|
| 旺 | w == m | `当令` |
| 相 | 月生我 | `{monthZhi}{m}生{zhi}{w}`（午火生未土） |
| 休 | 我生月 | `{zhi}{w}生{monthZhi}{m}泄气`（寅木生午火泄气） |
| 囚 | 我克月 | `{zhi}{w}克{monthZhi}{m}受制`（子水克午火受制） |
| 死 | 月克我 | `{monthZhi}{m}克{zhi}{w}`（午火克申金） |

纯函数，供用神头行与元忌力量评估共用。

### 1.2 爻力量评估 `domain/yao-strength.ts`

把某爻当「子用神」，评估月/日/月破/动爻/空/回头对它的影响并断有力/无用。**仅在 pillars 存在时调用。**

```
export type StrengthVerdict = '有力' | '无用'

export interface StrengthInfluence {
  kind: '月' | '日' | '动' | '空' | '回头'
  position?: number      // kind==='动' 时来源爻位
  text: string           // 如 "日辰子水生（扶）"、"五爻申金克（抑）"、"旬空"、"月破"
  helps: boolean | null  // 扶 true / 抑 false / 中性 null
}

export interface YaoStrength {
  wangshuai: WangShuai            // 月令旺衰
  wangshuaiReason: string         // 旺衰缘由
  kong: boolean                   // 旬空
  monthBreak: boolean             // 月破（月冲）
  influences: StrengthInfluence[] // 日/月破/动爻/空/回头 对它的影响（顺序：日、月破、动、回头、空）
  verdict: StrengthVerdict
}

export interface YaoStrengthCtx {
  monthZhi: DiZhi
  dayZhi: DiZhi
  xunKong: [DiZhi, DiZhi]
  movingLines: PanLine[]   // 卦中动爻（评估变爻时传 []）
}

export interface YaoTarget {
  zhi: DiZhi
  wuxing: WuXing
  position: number
  moving: boolean
  changed?: { najia: NaJia }  // 自身发动的变出（评估变爻时不传）
}

export function assessYaoStrength(x: YaoTarget, ctx: YaoStrengthCtx): YaoStrength
```

**判据计算**（`gen=generates`、`ctrl=controls`、`zw=zhiWuxing`）：
- `ws = wangShuaiOf(x.wuxing, ctx.monthZhi)`；`deLing = ws==='旺'||ws==='相'`；`shiLing = ws==='休'||ws==='囚'||ws==='死'`
- `kong = ctx.xunKong.includes(x.zhi)`
- `linRi = x.zhi===ctx.dayZhi`；`linYue = x.zhi===ctx.monthZhi`
- `riSheng = gen(zw(ctx.dayZhi), x.wuxing)`；`riKe = ctrl(zw(ctx.dayZhi), x.wuxing)`；`riChong = chong(ctx.dayZhi, x.zhi)`；`riHe = he(ctx.dayZhi, x.zhi)`
- `yuePo = chong(ctx.monthZhi, x.zhi)`
- 卦中动爻（`l.position!==x.position`）：`dongSheng = l 中 gen(l.najia.wuxing, x.wuxing)`、`dongKe = ctrl(...)`、`dongChong = chong(l.najia.zhi, x.zhi)`
- 回头：`huiSheng = x.moving && x.changed && gen(x.changed.najia.wuxing, x.wuxing)`；`huiKe = x.moving && x.changed && ctrl(x.changed.najia.wuxing, x.wuxing)`
- `扶 = linRi || linYue || riSheng || riHe || ws==='相' || dongSheng存在 || x.moving || huiSheng`
- `被克 = riKe || dongKe存在 || huiKe`
- `真空 = kong && shiLing && !x.moving && !riChong`（旺/动/逢日冲皆不为真空）
- `月破致命 = yuePo && shiLing && !x.moving`

**verdict**：
```
if (真空 || 月破致命) verdict = '无用'
else if (deLing)      verdict = '有力'
else if (shiLing && 被克 && !扶) verdict = '无用'
else                  verdict = '有力'   // 含：失令但有扶/发动；失令静而无伤
```

**influences 收集**（仅收非中性的，顺序 日、月破、动、回头、空）：
- 日：`linRi`→「临日辰{dayZhi}（扶）」helps=true；`riSheng`→「日辰{dayZhi}{五行}生（扶）」true；`riHe`→「日辰{dayZhi}合（扶）」true；`riKe`→「日辰{dayZhi}{五行}克（抑）」false；`riChong`→「日辰{dayZhi}冲（{shiLing?'破':'动'}）」(shiLing→false, 否则 null)
- 月破：`yuePo`→「月破」helps=false（月冲）
- 动：每个 `dongSheng`→「{爻位}爻{支}{五行}生（扶）」true、`dongKe`→「…克（抑）」false、`dongChong`→「…冲」null（同一爻多关系取最重：克 > 冲 > 生 顺序择一）
- 回头：`huiSheng`→「回头生（扶）」true、`huiKe`→「回头克（抑）」false
- 空：`kong`→「{真空?'真空':'假空'}」(真空 false / 假空 null)

### 1.3 装配扩展 `domain/yongshen-analysis.ts`

`Source` 增字段：
```
export interface Source {
  kind: SourceKind
  position?: number
  zhi: DiZhi
  wuxing: WuXing
  force: YongForce
  role?: '元神' | '忌神'        // 得生→元神，受克→忌神（其余 undefined）
  special?: '当令' | '主宰'      // 元忌落月→当令、落日→主宰（不评力量）
  strength?: YaoStrength        // 元忌落动/变/飞 且 pillars 存在时
}
```

`YongshenAnalysis` 增字段：
```
  wangshuaiReason: string | null   // 用神旺衰缘由（pillars 存在时）
```

构造逻辑（在现有 sources 构造之后，pillars 存在时遍历每个 source）：
- `role`：`force.force==='得生'?'元神':force.force==='受克'?'忌神':undefined`
- 若 `role` 存在：
  - `kind==='月'` → `special='当令'`
  - `kind==='日'` → `special='主宰'`
  - `kind==='动'||'飞'` → `strength=assessYaoStrength(本卦该爻 as YaoTarget, { monthZhi, dayZhi, xunKong, movingLines: 本卦所有动爻 })`
  - `kind==='变'` → `strength=assessYaoStrength({zhi,wuxing,position,moving:false}, { monthZhi, dayZhi, xunKong, movingLines: [] })`（变爻孤立）
- `wangshuaiReason = pillars ? wangshuaiReasonOf(用神najia.zhi, monthZhi) : null`
- 降级（pillars=null）：不设 role/special/strength，`wangshuaiReason=null`。

> 「本卦该爻」：动→对应本卦动爻 line；飞→`lines[position-1]` 飞神显爻（其 moving/changed 照实）。

---

## 2. 组件 `components/YongshenPanel.tsx`（改 Layout B）

用神头行：旺衰后接缘由——`旺衰 {wangshuai} · {wangshuaiReason}`（`wangshuaiReason` 为 null 时只显旺衰或 `—`）。

每个 source 两行制：
- **行1**：`{源标签} · {zhi}{wuxing}`　〔role 框：元神(墨框)/忌神(朱框)〕　〔冲/合 徽标〕　`{受力词}`（受克朱色）
- **行2**（小字，仅 role 存在时）：
  - `special==='当令'` → `当令`
  - `special==='主宰'` → `主宰 · 日辰不论旺衰`
  - `strength` 存在 → `旺衰 {wangshuai} · {wangshuaiReason}` + `；` + `influences.map(text).join('、')` + ` → ` + `{verdict}`（**有力**墨色、**无用**朱色）
  - 无 role 的源（泄/耗/比和）不出行2
- 保留三期：行可点（动/变/飞 有爻位）联动卦象高亮（变→变卦盘，飞/动→本卦盘）；点击态 active 底色。
- 受力图例（三期）保留。
- role 框配色：`元神` 墨框（border-ink/45, text-ink）、`忌神` 朱框（border-seal, text-seal）。
- testid 保留 `yongshen-panel`/`yong-head`/`force-row`/`force-legend`；行2 力量区可加 `data-testid="strength-line"`，verdict 文本可断言。

---

## 3. 文件结构

新增：
```
src/domain/wangshuai-reason.ts   # 旺衰缘由句
src/domain/yao-strength.ts       # 爻力量评估 + 有力/无用
（各 .test）
```
改动既有：
```
src/domain/yongshen-analysis.ts      # Source +role/special/strength；+用神 wangshuaiReason
src/domain/yongshen-analysis.test.ts # 补元忌/力量/缘由断言
src/components/YongshenPanel.tsx      # Layout B 两行制 + 力量行
src/components/YongshenPanel.test.tsx # 补 role 框/力量行/缘由断言
```
均 < 200 行；力量评估纯函数与展示分离，沿用 immutable（只造新对象）。

---

## 4. 错误处理与降级

- pillars=null：`wangshuaiReason=null`、sources 无 role/special/strength；面板头行无缘由、各源无行2；三期作用源/受力/冲合照常。
- `assessYaoStrength` 仅在 pillars 存在时被调用，入参 monthZhi/dayZhi/xunKong 均非空；纯函数不抛。
- 领域函数对非法地支/五行 fail-fast（仅内部不可达）。

---

## 5. 测试

- **单元**
  - `wangshuai-reason`：午月代表五行各一（火→旺 / 土→相 / 木→休 / 水→囚 / 金→死），断言缘由文案。
  - `yao-strength`：
    - 有力：旺相得令；失令但临日/日生/动爻生/发动；
    - 无用：真空亡（休囚静空不被冲）、月破失令、失令且被日克无扶；
    - 假空不判空陷（旺空/动空/空逢日冲）；
    - influences 收集正确（日生扶、动克抑、旬空、月破各命中一例）。
  - `yongshen-analysis`：固定 Pan（午月甲子日）→ 断言：某动爻 `role='忌神'`+`strength.verdict`；月/日元忌 `special`；用神 `wangshuaiReason`；变爻 strength 不含动爻 influence；降级 pillars=null 时无 role/strength/reason。
- **组件**：`YongshenPanel` 渲染元神/忌神框、力量行（旺衰·缘由·影响·verdict）、用神头行缘由；降级无行2；有力墨/无用朱。
- **集成/E2E**：沿用三期（选用神→面板→作用源联动）；E2E 不强断力量文案（随机卦）。
- 覆盖率沿用 ≥80%。

---

## 6. 实施顺序（供 plan 拆任务）

wangshuai-reason → yao-strength → yongshen-analysis 扩展（role/special/strength/用神缘由）→ YongshenPanel Layout B + 力量行 → 回归 E2E。每步 TDD（红→绿→提交）。
