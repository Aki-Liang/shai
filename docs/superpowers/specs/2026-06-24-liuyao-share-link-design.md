# 六爻 · 生成分享链接设计

> 上一期做了起卦记录（最小字段 + 确定性重算 `reconstruct`）。本期加**分享链接**：把一卦编进自包含 URL，别人打开即重算出同一结果页。**替换掉**原 PNG 分享图。

- **一句话**：结果页「复制分享链接」→ 把 `{问题, 本卦六爻, 时间戳}` base64url 编进 URL hash（`…/shai/#s=…`）；打开该链接 → 解码 → 复用 `reconstruct()` → 进结果页。无后端，链接自包含。
- **不做**：短链/服务端存储（无后端）；二维码；分享链接写入查看者历史；保留 PNG 分享图（本期删除）。

---

## 0. 关键决策（来自 brainstorming）

1. **替换 PNG 分享图**：删除 `ShareCard` + `useShareImage` + `modern-screenshot` 依赖；结果页按钮改「复制分享链接」。
2. **hash 编码**（`#s=…`，非 query）：hash 不发往服务器（GitHub Pages 日志不留问题文本，隐私更好），静态站零 404 风险。
3. **链接含问题文本**（base64url，非加密；用户知悉拿到链接者可见）。
4. **payload 只需 `{question, lines, createdAt}`**：`createdAt`（epoch ms）决定干支时间层，必带；`mode` 不入 payload（结果页不显示，解码时默认 `'cyber'`）。版本化 `{v:1,…}`。
5. **打开分享链接不写入查看者历史**；结果页底部 origin='shared' 显「去占一卦」(→reset 回首页)。
6. 复用既有 `reconstruct(record)`（来自起卦记录期）、`isCastRecord` 校验、剪贴板 API + execCommand 兜底口径。
7. immutable、纯逻辑与视图分离、不信任外部数据先校验。

---

## 1. 领域 / 库

### 1.1 编解码 `domain/share-link.ts`（新）

```ts
import { CastRecord } from './cast-record'
import { Hexagram } from './types'

export const SHARE_PARAM = 's'

/** 把一卦编成 URL 片段值（base64url(JSON {v:1,q,l,t})） */
export function encodeShareLink(input: { question: string; lines: Hexagram; createdAt: number }): string

/** 解码 → CastRecord（合成 id='shared'、mode='cyber'）；非法返回 null */
export function decodeShareLink(param: string): CastRecord | null
```

- `encodeShareLink`：`payload = { v: 1, q: question, t: createdAt, l: lines.map(x => [x.yinyang === 'yang' ? 1 : 0, x.moving ? 1 : 0]) }`；`JSON.stringify` → `utf8 → base64 → base64url`（`+/=`→`-_`、去尾 `=`）。
- `decodeShareLink`：base64url→base64→解码→`JSON.parse`，try/catch；校验 `v===1`、`q` 为 string、`t` 为有限 number、`l` 为长度 6 的数组且每项 `[0|1, 0|1]`；任一不符返回 null。还原 `lines: Hexagram`（`yinyang: 1?'yang':'yin'`，`moving: 1?true:false`），组装 `record = { id: 'shared', createdAt: t, question: q, mode: 'cyber', lines }`，最后 `return isCastRecord(record) ? record : null`（双保险）。
- 编码用紧凑数组（非完整 Line 对象）控制 URL 长度；问题文本是主要长度来源，普通长度 URL 完全可用。

### 1.2 URL 助手 `lib/share-url.ts`（新）

```ts
export function buildShareUrl(encoded: string): string
export function readShareParam(): string | null
```

- `buildShareUrl`：`${location.origin}${import.meta.env.BASE_URL}#${SHARE_PARAM}=${encoded}`（`BASE_URL` 即 `/shai/`）。
- `readShareParam`：从 `location.hash`（去头 `#`）按 `&` 拆，找 `s=` 取值；无则 null。
- 触碰 `location`/`import.meta.env`，非纯函数，单独成文件便于 mock。

### 1.3 剪贴板 `lib/clipboard.ts`（新）

```ts
export function copyText(text: string): Promise<boolean>
```

- 先 `await navigator.clipboard.writeText(text)` → true；catch 后兜底：建临时 `<textarea>`（`position:fixed;opacity:0`）→ `value=text` → `select()` → `document.execCommand('copy')` → 移除 → 返回布尔；全程 try/catch，失败 false。
- 供新分享按钮用。`AiPromptBox` 暂不改（其兜底依赖可见 textarea），留作后续 DRY。

---

## 2. 状态机 `hooks/useCasting.ts`（改）

- 新增状态 `record: CastRecord | null`（当前这卦的记录，分享按钮要 `createdAt`，`pan` 不存原始时间戳）：
  - `finishCasting`/`finishManual`：构造 record 时一并 `setRecord(rec)`（与 `onCast(rec)` 同一对象）。
  - `openRecord(rec)`：`setRecord(rec)`。
  - 新增 `openShared(rec: CastRecord)`：`reconstruct` → set reading/pan/interpretation → `setRecord(rec)` → `setOrigin('shared')` → `setPhase('result')`；**不**调 `onCast`（不写历史）。
  - `reset`：`setRecord(null)`、`setOrigin('cast')`。
- `Origin = 'cast' | 'history' | 'shared'`。
- 返回新增：`record`、`openShared`。

> `record` 也让结果页「复制分享链接」拿到准确 `createdAt`。

---

## 3. 视图

### 3.1 `components/ResultView.tsx`（改）
- 现 `onShare: () => void` 改名 `onShareLink: () => void`；底部「生成分享图」按钮改文案「复制分享链接」，`data-testid="share-link-btn"`，`onClick={onShareLink}`。
- 移除离屏 ShareCard 相关（ResultView 本身不含 ShareCard，离屏卡在 App）。

### 3.2 `App.tsx`（改）
- 引入 `useCastRecords`（已有）、`useCasting`（已有）；从 useCasting 取 `record, origin, openShared`。
- **挂载读分享链接**：`useEffect(() => { const p = readShareParam(); if (!p) return; const rec = decodeShareLink(p); if (rec) openShared(rec) }, [])`（StrictMode 双调用幂等无害）。
- **复制链接**：`handleShareLink = async () => { if (!record) return; const url = buildShareUrl(encodeShareLink({ question: record.question, lines: record.lines, createdAt: record.createdAt })); setToast(await copyText(url) ? '链接已复制' : '复制失败，请手动复制') }`。
- 结果页传 `onShareLink={handleShareLink}`。
- 结果页底部按 origin 切：`'shared'`→「去 占 一 卦」(onClick reset)、`'history'`→「← 返 回 记 录」(openHistory)、否则「再 占 一 卦」(reset)。
- **移除 PNG 分享**：删 `useShareImage`、`cardRef`、离屏 `<ShareCard>`、`handleShare`、`dateText`（仅 ShareCard 用则一并删）。toast 状态保留（复制提示用）。

### 3.3 删除文件
- `src/components/ShareCard.tsx`、`src/components/ShareCard.test.tsx`
- `src/hooks/useShareImage.ts`、`src/hooks/useShareImage.test.ts`
- `package.json` 移除 `modern-screenshot` 依赖（确认无其他引用后）。

---

## 4. 错误处理与边界

- 解码失败 / `v` 不符 / 缺字段 / lines 形状错 → `decodeShareLink` 返回 null → App 忽略，正常进首页，不崩。
- `record` 为 null（理论上结果页必有）→ 复制按钮静默不动。
- 剪贴板 API 缺失/被拒（非 HTTPS、webview）→ execCommand 兜底 → 仍失败 toast 提示手动复制。
- `reconstruct` 内干支历失败 → 沿用既有降级（pillars=null）。
- 不信任 URL 数据：解码后必过 `isCastRecord`。

---

## 5. 测试（TDD，≥80%）

- **单元**
  - `share-link`：`encodeShareLink`→`decodeShareLink` 往返还原 question/lines/createdAt；`decodeShareLink` 对空串/非 base64/坏 JSON/`v=9`/缺字段/lines 长度错 → null；含中文问题往返不乱码。
  - `share-url`：`buildShareUrl('X')` 含 `/shai/#s=X`（mock location.origin + BASE_URL）；`readShareParam` 从 `#s=abc` 取 `abc`、从无 s 的 hash 取 null。
  - `clipboard`：`copyText` clipboard 成功→true（mock writeText）；writeText 抛错→execCommand 兜底（mock execCommand 返回 true/false）。
- **Hook**：`useCasting` `openShared(rec)` → phase=result、origin='shared'、record=rec、reading.question 对；`finishCasting`/`openRecord` 后 `record` 非空。
- **组件**：`ResultView` 渲染「复制分享链接」（`share-link-btn`）并触发 `onShareLink`。
- **App**：设 `window.location.hash = '#s=<有效编码>'` 后 render → 结果页重建（断言所问/卦辞）、origin='shared' 底部「去占一卦」；正常起卦后点 `share-link-btn` → `copyText`/clipboard 被调用、toast「链接已复制」；断言不再有「生成分享图」。
- **E2E**（`tests/e2e/divination.spec.ts` 补）：起卦→点「复制分享链接」→ toast「链接已复制」；授予剪贴板权限读出链接 → `page.goto(链接)` → 结果页出现（卦辞可见）、底部「去占一卦」。

---

## 6. 文件结构

新增：
```
src/domain/share-link.ts          # encodeShareLink/decodeShareLink/SHARE_PARAM
src/lib/share-url.ts              # buildShareUrl/readShareParam
src/lib/clipboard.ts             # copyText
（各 .test）
```
改动：
```
src/hooks/useCasting.ts          # +record 状态 / +openShared / origin 'shared'
src/components/ResultView.tsx    # onShare→onShareLink，按钮「复制分享链接」
src/App.tsx                      # 挂载读分享链接 / 复制链接 / 底部按 origin / 移除 PNG 分享
tests/e2e/divination.spec.ts     # +分享链接路径
```
删除：
```
src/components/ShareCard.tsx(.test) / src/hooks/useShareImage.ts(.test)
package.json: -modern-screenshot
```
均 < 200 行；纯逻辑（domain）/ 副作用助手（lib）/ 视图（components）分层。

---

## 7. 实施顺序（供 plan 拆任务）

share-link（encode/decode）→ share-url → clipboard → useCasting（record/openShared）→ ResultView（按钮改名）→ App（读链接+复制+底部+移除PNG）→ 删除 ShareCard/useShareImage + 移依赖 → E2E。每步 TDD（红→绿→提交）。
