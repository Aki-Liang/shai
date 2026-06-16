import { Hexagram } from './Hexagram'
import { CastReading } from '../domain/reading'
import { Interpretation } from '../domain/interpret'

interface Props {
  reading: CastReading
  interpretation: Interpretation
  onShare: () => void
}

export function ResultView({ reading, interpretation, onShare }: Props) {
  const { primary, changed } = reading
  return (
    <div className="flex flex-col items-center gap-6 px-6 w-full max-w-md mx-auto font-serif">
      <div className="flex items-start justify-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <div className="text-[10px] tracking-widest text-ink/40">本卦</div>
          <div className="text-lg text-ink">{primary.data.name}</div>
          <Hexagram lines={primary.lines} shiYao={primary.data.shiYao} yingYao={primary.data.yingYao} />
        </div>
        {changed && (
          <>
            <span className="self-center text-ink/30">→</span>
            <div className="flex flex-col items-center gap-2 opacity-60">
              <div className="text-[10px] tracking-widest text-ink/40">变卦</div>
              <div className="text-lg text-ink">{changed.data.name}</div>
              <Hexagram lines={changed.lines} shiYao={changed.data.shiYao} yingYao={changed.data.yingYao} />
            </div>
          </>
        )}
      </div>
      <div className="text-sm text-ink/80 text-center"><span className="text-seal">卦辞　</span>{interpretation.judgment}</div>
      {interpretation.movingLineTexts.map((m) => (
        <div key={m.index} className="text-xs text-ink/70 text-center">
          <span className="text-seal font-medium">动</span>
          <span className="text-ink/40"> · </span>
          {m.text}
        </div>
      ))}
      <button className="mt-2 font-serif tracking-[0.3em] text-ink border border-ink/30 rounded-full px-6 py-2" onClick={onShare}>
        生成分享图
      </button>
    </div>
  )
}
