import { Hexagram as Hex } from '../domain/types'

interface Props {
  lines: Hex
  shiYao: number  // 1–6
  yingYao: number // 1–6
}

/**
 * 自上而下渲染（上爻在上），故倒序遍历；index+1 即爻位。
 * 每行三栏定宽网格：左=动爻点 / 中=定宽居中爻线 / 右=世应，
 * 保证所有爻线（阴/阳、有无标记）共享同一中轴，整列对齐。
 */
export function Hexagram({ lines, shiYao, yingYao }: Props) {
  const order = [...lines].map((_, i) => i).reverse()
  return (
    <div className="flex flex-col gap-1">
      {order.map((i) => {
        const line = lines[i]
        const pos = i + 1
        const tag = pos === shiYao ? '世' : pos === yingYao ? '应' : ''
        return (
          <div key={i} className="grid grid-cols-[1rem_5rem_1rem] items-center gap-2 h-3">
            {/* 左栏：动爻点 */}
            <span className="flex justify-end">
              {line.moving && <span className="h-2 w-2 rounded-full bg-seal" aria-label="动爻" />}
            </span>
            {/* 中栏：定宽爻线（阳=整条 80px；阴=两段等分，中间留断口） */}
            <div
              data-testid="yao"
              data-moving={line.moving}
              className="flex justify-between text-ink"
            >
              {line.yinyang === 'yang' ? (
                <span className="block h-2 w-full rounded-sm bg-current" />
              ) : (
                <>
                  <span className="block h-2 w-[1.9rem] rounded-sm bg-current" />
                  <span className="block h-2 w-[1.9rem] rounded-sm bg-current" />
                </>
              )}
            </div>
            {/* 右栏：世/应 */}
            <span className="text-xs text-seal leading-none">{tag}</span>
          </div>
        )
      })}
    </div>
  )
}
