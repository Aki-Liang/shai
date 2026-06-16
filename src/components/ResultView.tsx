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
      <div className="text-xl text-gold-bright text-glow-gold">{primary.data.name}</div>
      <div className="flex items-center gap-6">
        <Hexagram lines={primary.lines} shiYao={primary.data.shiYao} yingYao={primary.data.yingYao} />
        {changed && (
          <>
            <span className="text-paper/40">→</span>
            <div className="opacity-50">
              <Hexagram lines={changed.lines} shiYao={changed.data.shiYao} yingYao={changed.data.yingYao} />
            </div>
          </>
        )}
      </div>
      {changed && <div className="text-xs text-paper/60">变卦 · {changed.data.name}</div>}
      <div className="text-sm text-paper/80 text-center"><span className="text-gold-bright">卦辞　</span>{interpretation.judgment}</div>
      {interpretation.movingLineTexts.map((m) => (
        <div key={m.index} className="text-xs text-paper/70 text-center">
          <span className="inline-block h-2 w-2 rounded-full bg-cinnabar mr-2 align-middle" />
          {m.text}
        </div>
      ))}
      <button className="mt-2 font-serif tracking-[0.3em] text-gold-bright border border-gold/60 rounded-full px-6 py-2" onClick={onShare}>
        生成分享图
      </button>
    </div>
  )
}
