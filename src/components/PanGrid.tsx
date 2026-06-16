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
            <span className="text-xs text-ink-soft">{l.liushen ?? ''}</span>
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
