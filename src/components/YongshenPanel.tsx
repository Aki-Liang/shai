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
      <div
        data-testid="force-legend"
        className="text-[10px] text-ink-soft/80 leading-relaxed pt-1 border-t border-ink/10"
      >
        受力 · 得生（源生用神，强）· 比和（同五行，帮）· 泄（用神生源，泄气弱）· 耗（用神克源，耗力弱）· 受克（源克用神，伤）
      </div>
    </div>
  )
}
