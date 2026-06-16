import { forwardRef } from 'react'
import { Hexagram } from './Hexagram'
import { Hexagram as Hex } from '../domain/types'
import { Interpretation } from '../domain/interpret'

interface Props {
  interpretation: Interpretation
  lines: Hex
  shiYao: number
  yingYao: number
  dateText: string
}

/** 分享卡片。离屏渲染后由 useShareImage 栅格化为 PNG。 */
export const ShareCard = forwardRef<HTMLDivElement, Props>(function ShareCard(
  { interpretation, lines, shiYao, yingYao, dateText },
  ref,
) {
  return (
    <div
      ref={ref}
      className="w-[360px] flex flex-col items-center gap-4 p-8 font-serif"
      style={{ background: '#f5f1e7' }}
    >
      <div className="text-[10px] tracking-[0.3em] text-seal">六爻 · 周易</div>
      <div className="text-[10px] tracking-widest text-seal">所 问</div>
      <div className="text-ink text-center">{interpretation.question}</div>
      <div className="text-xl text-ink">{interpretation.primaryName}</div>
      <Hexagram lines={lines} shiYao={shiYao} yingYao={yingYao} />
      <div className="text-xs text-ink/70 text-center">{interpretation.judgment}</div>
      <div className="text-[9px] text-ink/40">{dateText} · 六爻占</div>
    </div>
  )
})
