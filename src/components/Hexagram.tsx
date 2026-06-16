import { Hexagram as Hex } from '../domain/types'

interface Props {
  lines: Hex
  shiYao: number  // 1–6
  yingYao: number // 1–6
}

/** 自上而下渲染（上爻在上），故倒序遍历；index+1 即爻位 */
export function Hexagram({ lines, shiYao, yingYao }: Props) {
  return (
    <div className="flex flex-col gap-2 items-center">
      {[...lines].map((_, i) => i).reverse().map((i) => {
        const line = lines[i]
        const pos = i + 1
        const tag = pos === shiYao ? '世' : pos === yingYao ? '应' : ''
        return (
          <div key={i} className="flex items-center gap-3">
            <div
              data-testid="yao"
              data-moving={line.moving}
              className="flex gap-2 glow-gold text-gold"
            >
              {line.yinyang === 'yang' ? (
                <span className="block h-2 w-20 rounded-sm bg-current" />
              ) : (
                <>
                  <span className="block h-2 w-8 rounded-sm bg-current" />
                  <span className="block h-2 w-8 rounded-sm bg-current" />
                </>
              )}
            </div>
            <span className="w-4 text-xs text-cinnabar">{tag}</span>
            {line.moving && <span className="h-2 w-2 rounded-full bg-cinnabar" aria-label="动爻" />}
          </div>
        )
      })}
    </div>
  )
}
