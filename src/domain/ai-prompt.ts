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
