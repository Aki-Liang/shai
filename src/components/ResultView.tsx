import { useState } from 'react'
import { Pan } from '../domain/pan'
import { Interpretation } from '../domain/interpret'
import { LiuQin } from '../domain/liuqin'
import { PillarsBar } from './PillarsBar'
import { YongshenSelector } from './YongshenSelector'
import { PanGrid } from './PanGrid'

interface Props {
  pan: Pan
  interpretation: Interpretation
  onShare: () => void
}

export function ResultView({ pan, interpretation, onShare }: Props) {
  const [yong, setYong] = useState<LiuQin | null>(null)
  const { reading } = pan
  return (
    <div className="flex flex-col items-center gap-5 px-4 w-full max-w-md mx-auto font-serif">
      <div className="text-sm text-ink/70 text-center">
        所问 · <span className="text-ink">{reading.question}</span>
      </div>
      <div className="text-lg text-ink">
        {reading.primary.data.name}
        {reading.changed && <span className="text-ink/40 text-sm"> → {reading.changed.data.name}</span>}
      </div>
      <PillarsBar pillars={pan.pillars} />
      <YongshenSelector selected={yong} onSelect={setYong} />
      <PanGrid pan={pan} highlight={yong} />
      <div className="text-sm text-ink/80 text-center">
        <span className="text-seal">卦辞　</span>
        {interpretation.judgment}
      </div>
      {interpretation.movingLineTexts.map((m) => (
        <div key={m.index} className="text-xs text-ink/70 text-center">
          <span className="text-seal font-medium">动</span>
          <span className="text-ink/40"> · </span>
          {m.text}
        </div>
      ))}
      <button
        className="mt-2 font-serif tracking-[0.3em] text-ink border border-ink/30 rounded-full px-6 py-2"
        onClick={onShare}
      >
        生成分享图
      </button>
    </div>
  )
}
