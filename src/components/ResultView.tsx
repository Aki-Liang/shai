import { useState } from 'react'
import { Pan } from '../domain/pan'
import { Interpretation } from '../domain/interpret'
import { YongTarget } from '../domain/yongshen'
import { buildYongshenAnalysis } from '../domain/yongshen-analysis'
import { PillarsBar } from './PillarsBar'
import { YongshenSelector } from './YongshenSelector'
import { YongshenPanel } from './YongshenPanel'
import { PanGrid } from './PanGrid'

interface Props {
  pan: Pan
  interpretation: Interpretation
  onShare: () => void
}

export function ResultView({ pan, interpretation, onShare }: Props) {
  const [yong, setYong] = useState<YongTarget | null>(null)
  const [sourceAt, setSourceAt] = useState<number | null>(null) // 面板选中的作用源爻位
  const { reading } = pan
  // 用神分析：定位 + 旺衰 + 生克冲合（多现按链取一）
  const analysis = yong ? buildYongshenAnalysis(pan, yong) : null
  // 切换用神时作用源选择失效，重置
  const selectYong = (t: YongTarget | null) => {
    setYong(t)
    setSourceAt(null)
  }
  return (
    <div className="flex flex-col items-center gap-5 px-4 w-full max-w-md mx-auto font-serif">
      <div className="text-sm text-ink/70 text-center">
        所问 · <span className="text-ink">{reading.question}</span>
      </div>
      <PillarsBar pillars={pan.pillars} />
      <YongshenSelector selected={yong} onSelect={selectYong} />
      <div data-testid="board-primary" className="flex flex-col items-center gap-1 w-full">
        <div className="text-[10px] tracking-[0.3em] text-ink/40">本卦 · {reading.primary.data.name}</div>
        <PanGrid
          lines={pan.lines}
          yongshenAt={analysis?.position ?? null}
          yongshenIsFu={analysis?.isFu ?? false}
          sourceAt={sourceAt}
        />
      </div>
      {pan.changedLines && reading.changed && (
        <div data-testid="board-changed" className="flex flex-col items-center gap-1 w-full">
          <div className="text-[10px] tracking-[0.3em] text-ink/40">变卦 · {reading.changed.data.name}</div>
          <PanGrid lines={pan.changedLines} />
        </div>
      )}
      {yong && (
        <YongshenPanel
          analysis={analysis}
          target={yong}
          selectedSourceAt={sourceAt}
          onSelectSource={setSourceAt}
        />
      )}
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
