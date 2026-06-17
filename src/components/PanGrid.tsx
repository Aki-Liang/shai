import { PanLine } from '../domain/pan'

interface Props {
  lines: PanLine[]
  /** 用神所在爻位（解析层定位结果）：填充色高亮 */
  yongshenAt?: number | null
  /** 命中爻的用神取自伏神 → 伏神小字标「用神·伏」 */
  yongshenIsFu?: boolean
  /** 面板选中的作用源爻位：描边高亮（区别于用神填充色） */
  sourceAt?: number | null
}

export function PanGrid({ lines, yongshenAt = null, yongshenIsFu = false, sourceAt = null }: Props) {
  const rows = [...lines].reverse() // 上爻在最上
  return (
    <div className="flex flex-col gap-1 font-serif text-ink w-full max-w-sm">
      {rows.map((l) => {
        const hit = yongshenAt === l.position
        const fuLabel = hit && yongshenIsFu // 命中且取自伏神 → 标「用神·伏」
        const sourceHit = sourceAt != null && sourceAt === l.position // 作用源描边
        return (
          <div
            key={l.position}
            data-testid="pan-row"
            data-pos={l.position}
            data-highlight={hit ? 'true' : undefined}
            data-source={sourceHit ? 'true' : undefined}
            className={`grid grid-cols-[2.5rem_5.5rem_3.5rem_1fr] items-center gap-2 px-1 py-0.5 rounded ${
              hit ? 'bg-seal/10' : ''
            } ${sourceHit ? 'ring-1 ring-inset ring-seal/60' : ''}`}
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
