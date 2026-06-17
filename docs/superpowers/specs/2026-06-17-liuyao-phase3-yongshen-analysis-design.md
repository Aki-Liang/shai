# 六爻三期 · 用神分析层 设计

> 二期产出了完整专业排盘（纳甲/六亲/六神/伏神/干支三柱/旬空/用神定位）。三期在排盘**下方**叠加一个「用神分析」面板：把生克冲合、旺相休囚死算出来，并用旺衰解决二期遗留的**用神两现**取舍。

- **一句话**：在选中用神（5 六亲或世爻）后，于盘下方展示「谁在生克冲合用神」——月建、日辰、卦中动爻、用神自身之变爻（回头）、伏神之飞神对用神的受力（得生/受克/泄/耗/比和）叠加冲/合；并给出用神的月令旺衰；用神两现时按确定性优先链取唯一爻。
- **不做**（仍留给 AI 解卦期）：进神退神、三合/半合局、相刑相害、暗动、日破、动变生克的吉凶结论性断语、用神自动判定。

---

## 0. 关键决策（来自 brainstorming）

1. **作用源**（皆对**用神地支**）：
   - **月支、日支**：恒在（pillars 非空时）。
   - **本卦动爻**：每个发动之爻，**排除用神本爻位**（显爻时即用神自身；伏神时即飞神位——另以「飞神」列出）。动爻能生克冲合用神/伏神（伏神取**乙**口径：动爻可生扶克制伏神）。
   - **用神自身的变爻（回头）**：仅当用神为显爻**且发动**——其变爻回头生克冲合用神。变爻只回头作用于本位动爻，故唯用神自身之变爻能及用神；**他爻变爻不列**。
   - **飞神 → 伏神**：仅当用神取伏神——压其上之显爻对伏神生克冲合（飞来生伏／克伏）。
   静爻「静而不发」，不列。
2. **冲合**只做**六冲 + 六合**，暂不做三合/半合/相刑/相害。
3. **旺相休囚死**只按**月令**判（日辰另以「受力」行单列，不并入旺衰）。
4. **面板布局 = B**：日/月/动/变四类源**统一一张表**，不分主宰/动态两区。
5. **受力词**：得生 / 受克 / 泄 / 耗 / 比和；地支向 **冲 / 合** 以红框徽标优先显示。
6. **用神两现取舍链**（从上至下，先满足者胜，平手看下一条）：
   ① 舍空破 → ② 取发动 → ③ 取旺相 → ④ 临日月 → ⑤ 持世 → ⑥ 离世爻最近（上下等距取较上者）。
7. 面板挂在**本卦**用神之上；变卦盘不参与分析（沿用二期「变卦盘不染用神」）。
8. `pillars` 为 null（干支历降级）时：旺衰与日/月行降级为占位文案，动/变行照常显示（不依赖历法）。
9. **世爻为用**：用神目标除 5 六亲外，增「世爻」选项（测自身/综合运势常用）。世爻按**爻位**唯一定位（持世之爻），不走六亲匹配、无伏神、无两现。
10. **高亮改按爻位**：用神高亮从「按六亲（同六亲多爻全染）」改为「按解析出的唯一爻位」——与两现取舍后只剩一爻、及世爻定位一致。变卦盘仍不染。

---

## 1. 领域定义

### 1.1 六冲 / 六合 `domain/chonghe.ts`

```
六冲（6 对，地支相隔 6）：子午 丑未 寅申 卯酉 辰戌 巳亥
六合（6 对）：           子丑 寅亥 卯戌 辰酉 巳申 午未
```

接口：
- `chong(a: DiZhi, b: DiZhi): boolean` — a、b 是否相冲（无序）
- `he(a: DiZhi, b: DiZhi): boolean` — a、b 是否相合（无序）

实现用一张对照表（地支→其冲/其合），`chong(a,b)=CHONG[a]===b`、`he(a,b)=HE[a]===b`。两者皆对称，自冲/自合不存在（同支返回 false）。

### 1.2 旺相休囚死 `domain/wangshuai.ts`

```
type WangShuai = '旺' | '相' | '休' | '囚' | '死'
```

以月令五行 M（由月支取五行）对用神五行 Y 判：

| 关系 | 判定 | 含义 |
|---|---|---|
| 旺 | Y == M | 当令 |
| 相 | M 生 Y（`generates(M,Y)`） | 受令神之生 |
| 休 | Y 生 M（`generates(Y,M)`） | 生令神而自息 |
| 囚 | Y 克 M（`controls(Y,M)`） | 克当令者反受制 |
| 死 | M 克 Y（`controls(M,Y)`） | 被当令者克 |

接口：`wangShuaiOf(yong: WuXing, monthZhi: DiZhi): WangShuai`。
五者必居其一且互斥（生克为全序环，故覆盖完备）。

### 1.3 用神受力 `domain/yong-force.ts`

源地支 S（五行 Sw）对用神地支 Y（五行 Yw）：

```
type Force = '得生' | '受克' | '泄' | '耗' | '比和'
interface YongForce { force: Force; chong: boolean; he: boolean }
forceOf(source: DiZhi, yong: DiZhi): YongForce
```

- 五行向（互斥全覆盖）：
  - `generates(Sw,Yw)` → **得生**（源生用神）
  - `controls(Sw,Yw)`  → **受克**（源克用神）
  - `generates(Yw,Sw)` → **泄**（用神生源）
  - `controls(Yw,Sw)`  → **耗**（用神克源）
  - `Sw==Yw`           → **比和**
- 地支向：`chong = chong(S,Y)`，`he = he(S,Y)`。两者最多一真（六冲六合对不相交）。
- 展示时冲/合作徽标优先，受力词照常并列（如「冲 · 受克」）。

### 1.4 用神两现取舍 `domain/yongshen-pick.ts`

仅在选中六亲于**本卦显爻出现 ≥2 处**时调用（伏神不存在两现）。候选为这些爻位。

```
interface PickContext {
  lines: PanLine[]          // 本卦
  monthZhi: DiZhi | null    // pillars?.month 末字；null=历法降级
  dayZhi: DiZhi | null
  xunKong: [DiZhi, DiZhi] | null
  shiPos: number            // 世爻位（本卦）
}
interface PickResult { position: number; rule: number; ruleName: string }
pickYongshen(candidates: PanLine[], ctx: PickContext): PickResult
```

链（逐条筛选候选集，候选缩到 1 即定，并记录命中条号；缩不到 1 进入下一条；走到 ⑥ 必出唯一）：

1. **舍空破**：去掉「旬空或月破」的候选（若全部空破则不去、保持原集）。
   - 旬空：`xunKong` 含该爻地支。
   - 月破：`monthZhi` 与该爻地支六冲。
   - `pillars` 降级（monthZhi/xunKong 为 null）时本条跳过。
2. **取发动**：若候选中有动爻，仅留动爻。
3. **取旺相**：`monthZhi` 非空时，按旺衰排序，仅留旺衰最优者（旺>相>休>囚>死）；降级时跳过。
4. **临日月**：`dayZhi`/`monthZhi` 非空时，仅留「地支==日支 或 ==月支」者（若无人临则不筛）；降级时跳过。
5. **持世**：若候选含持世爻，仅留持世爻。
6. **离世爻最近**：取 `|position - shiPos|` 最小者；上下等距则取**较上者**（position 较大）。本条必产唯一解。

`ruleName` 用于面板文案，如「两现 · 按〔取旺相〕取四爻」。

### 1.5 用神分析装配 `domain/yongshen-analysis.ts`

```
type Source = { kind: '月'|'日'|'飞'|'动'|'变'; position?: number; zhi: DiZhi; wuxing: WuXing; force: YongForce }

type YongTarget = LiuQin | '世'   // 用神目标：5 六亲之一，或世爻

interface YongshenAnalysis {
  target: YongTarget
  liuqin: LiuQin             // 用神所在爻之六亲（世爻情形即该爻六亲）
  najia: NaJia               // 用神地支五行（显爻 / 伏神 / 世爻）
  position: number           // 用神所在本卦爻位
  isFu: boolean              // 取自伏神
  isShi: boolean             // 世爻为用
  duplicate: { picked: number; ruleName: string } | null   // 两现取舍结果
  wangshuai: WangShuai | null  // null=历法降级
  monthBreak: boolean        // 用神月破
  kong: boolean              // 用神旬空
  sources: Source[]          // 顺序固定：月、日、飞、动(按爻位升序)、变（与布局 B 一致）
}

buildYongshenAnalysis(pan: Pan, target: YongTarget): YongshenAnalysis | null
```

规则：
- 定位用神：
  - `target === '世'` → 取 `pan.lines` 中 `shi===true` 之爻（唯一）：`isShi=true`、`isFu=false`、`duplicate=null`、`liuqin=`该爻六亲、用神地支=该爻 najia。
  - 否则（六亲）复用 `locateYongshen`：
    - `none`（本卦无该六亲、无伏神）→ 返回 `null`（面板显示「卦中无○○，亦无伏神」）。
    - `hidden`（取伏神）→ `isFu=true`，用神地支取伏神 najia；`duplicate=null`。
    - `visible` 且单现 → 直接用之；多现 → 调 `pickYongshen` 定爻，填 `duplicate`。
- 用神地支确定后：
  - `wangshuai = monthZhi ? wangShuaiOf(用神五行, monthZhi) : null`
  - `monthBreak = monthZhi ? chong(monthZhi, 用神地支) : false`
  - `kong = pan.lines 中该爻.kong`（伏神情形：伏神地支是否在旬空内，`xunKong.includes`）
- `sources` 构造（顺序 月、日、飞、动、变）：
  - 月：`{kind:'月', zhi:monthZhi, force:forceOf(monthZhi,用神)}`（pillars 非空才有）
  - 日：`{kind:'日', zhi:dayZhi, force:forceOf(dayZhi,用神)}`（pillars 非空才有）
  - 飞：仅 `isFu` 时——用神所伏之飞神（`pan.lines[position-1]` 该显爻）→ `{kind:'飞', position, zhi, wuxing, force:forceOf(飞神地支,用神)}`。注文：得生→「飞来生伏」、受克→「飞来克伏」。
  - 动：本卦每个 `moving` 且**爻位 ≠ 用神本爻位**的爻 → `{kind:'动', position, zhi:najia.zhi, force:forceOf(najia.zhi,用神)}`。显爻时排除用神自身，伏神时排除飞神位（已单列）；两情形动爻皆作用于用神/伏神。
  - 变：**仅用神为显爻且发动**时，用神本爻的 `changed.najia`（回头）→ `{kind:'变', position:用神爻位, zhi:changed.zhi, force:forceOf(changed.zhi,用神)}`。他爻变爻只回头作用其本位动爻，不及用神，故不列。
- 装配为纯函数，不抛异常；缺历法只少日/月两源。

---

## 2. 组件改动

### 2.1 `YongshenSelector.tsx`（改）
- `selected`/`onSelect` 类型：`LiuQin | null` → `YongTarget | null`。
- 5 六亲 chip 后增「**世爻**」chip（`data-testid="yongshen-世"`），切换逻辑同其它 chip。
- 口诀面板增世爻一条（取自 `yongshen.ts` 新增的世爻提示）。

### 2.2 `PanGrid.tsx`（改高亮模型）
- props：`{ lines: PanLine[]; yongshenAt?: number|null; yongshenIsFu?: boolean }`；**移除** `highlight: LiuQin` 与 `yongshenHiddenAt`。
- 命中：`position === yongshenAt`。命中行 `bg-seal/10`、`data-highlight="true"`、六亲字转 seal。
- `yongshenIsFu` 且命中 → 该行伏神小字标「用神·伏 …」(seal)；否则伏神小字常态「伏 …」。
- 变卦盘调用不传 `yongshenAt`（不染），与二期一致。

### 2.3 `YongshenPanel.tsx`（新，B 布局）
- props：`{ analysis: YongshenAnalysis | null; target: YongTarget }`（target 供 null 提示文案）。
- `analysis == null`（仅六亲 none；世爻必有）→ 居中提示「卦中无{target}，亦无伏神，暂不可分析」。
- 否则：
  - **标题行**：`{liuqin}{地支}{五行}` · `{position}爻`〔`· 世`〕〔`· 伏神`〕〔`· 两现按{ruleName}取{n}爻`〕〔`· 月破`〕　右侧 `旺衰：{wangshuai|—}`。
  - **明细表**：`sources` 逐行 `{源标签} · {地支}{五行}` | 〔`冲`|`合` 徽标〕`{受力}` | `{小字注：如「水生木」「飞来克伏」「寅申冲，金克木」「用神克土，回头」}`。源标签：月→「月建」、日→「日辰」、飞→「飞神」、动→「动爻{n}」、变→「变爻{n}·回头」。
  - `pillars` 降级（日/月源缺失）→ 表上方浅色提示「时间信息暂不可用，旺衰与日月生克略」。
  - 配色：朱砂红仅「冲 / 受克 / 月破」与徽标；余墨色。testid：面板 `yongshen-panel`、标题 `yong-head`、每行 `force-row`。

### 2.4 `ResultView.tsx`（装配）
- 选中态 `yong: YongTarget | null`（替原 `LiuQin|null`）。
- `const analysis = yong ? buildYongshenAnalysis(pan, yong) : null`
- 本卦盘：`<PanGrid lines={pan.lines} yongshenAt={analysis?.position ?? null} yongshenIsFu={analysis?.isFu ?? false} />`
- 变卦盘：`<PanGrid lines={pan.changedLines} />`（不染）
- 两盘后、卦辞前：`{yong && <YongshenPanel analysis={analysis} target={yong} />}`
- 移除原 `locateYongshen`/`primaryHighlight`/`yongshenHiddenAt` 直接调用（统一归入 analysis）。`locateYongshen` 仍由 analysis 内部复用。

---

## 3. 文件结构

新增：
```
src/domain/
  chonghe.ts            # 六冲六合
  wangshuai.ts          # 旺相休囚死
  yong-force.ts         # 受力（得生/受克/泄/耗/比和 + 冲合）
  yongshen-pick.ts      # 两现取舍链
  yongshen-analysis.ts  # 装配 YongshenAnalysis（含 YongTarget 定位）
src/components/
  YongshenPanel.tsx     # B 布局面板
```
改动既有：
```
src/domain/yongshen.ts        # +YongTarget 类型、+世爻口诀
src/components/YongshenSelector.tsx  # +世爻 chip、类型改 YongTarget
src/components/PanGrid.tsx     # 高亮改按爻位（yongshenAt/yongshenIsFu）
src/components/ResultView.tsx  # 装配 analysis + 面板 + 新高亮
src/components/PanGrid.test.tsx       # 随 props 改写（去 highlight，用 yongshenAt）
src/components/ResultView.test.tsx    # 随 props/两现单染改写
src/domain/yongshen.test.ts   # 随 YongTarget/世爻口诀补断言
tests/e2e/divination.spec.ts  # 用神后断言面板出现
```
均 < 200 行，纯函数与展示分离，沿用既有 immutable 风格（只造新对象）。

---

## 4. 错误处理与降级

- 历法降级（`pan.pillars == null`）：analysis 的 `wangshuai=null`、无日/月源、两现链跳过依赖历法的 ①③④ 条；面板顶部提示时间信息缺失。动/变分析照常。
- 用神 = none：装配返回 null，面板友好提示，不报错。
- 所有领域函数对非法地支/五行 fail-fast 抛错（仅内部不可达路径），装配层只调已校验数据，对外不抛。

---

## 5. 测试

- **单元**
  - `chonghe`：6 冲对 + 6 合对全真；非冲非合若干假；同支假；对称性。
  - `wangshuai`：5 态各至少一例（含 5 行 × 代表月支抽样）。
  - `yong-force`：得生/受克/泄/耗/比和 各一例；冲且克（寅申）、合（如子丑）叠加例。
  - `yongshen-pick`：6 条链各构造一例「恰由该条定案」；等距取较上；全空破不误删；历法降级跳过 ①③④。
  - `yongshen-analysis`：固定 Pan（天风姤例，用神取伏神 → 断言含「飞神」源 + 卦中动爻作用于伏神【乙】）；另构显爻发动例 → 断言取「用神自身变爻·回头」且他爻变爻不列；**世爻目标** → 断言按持世爻定位、`isShi`、源构造；旺衰/月破/两现/历法降级各断言。
- **组件**：
  - `YongshenPanel`：渲染标题（含 世/伏/两现/月破 标记）与各 force-row；null 提示；降级提示。
  - `YongshenSelector`：6 chip（含 `yongshen-世`）切换。
  - `PanGrid`：`yongshenAt` 按爻位高亮单行；`yongshenIsFu` 标「用神·伏」。
- **集成**：`ResultView` 选六亲/世爻后出现 `yongshen-panel` 且本卦盘对应爻高亮。
- **E2E**：摇卦 → 选一个用神（含世爻）→ 断言面板出现且至少一条 force-row。
- 覆盖率沿用 ≥80%。

---

## 6. 实施顺序（供 plan 拆任务）

chonghe → wangshuai → yong-force → yongshen-pick → yongshen-analysis（含世爻/飞神/乙口径）→ yongshen.ts(+世爻口诀/YongTarget) → YongshenSelector(+世爻 chip) → PanGrid(高亮改按爻位) → YongshenPanel → ResultView 装配 → E2E。每步 TDD（红→绿→提交）。
