import { useRef } from 'react'
import { useCasting } from './hooks/useCasting'
import { useShareImage } from './hooks/useShareImage'
import { QuestionInput } from './components/QuestionInput'
import { CastingStage } from './components/CastingStage'
import { ResultView } from './components/ResultView'
import { ShareCard } from './components/ShareCard'

export default function App() {
  const { phase, reading, interpretation, submit, finishCasting, reset } = useCasting()
  const { capture } = useShareImage()
  const cardRef = useRef<HTMLDivElement>(null)

  const handleShare = async () => {
    if (!cardRef.current) return
    const url = await capture(cardRef.current)
    const a = document.createElement('a')
    a.href = url
    a.download = '六爻占.png'
    a.click()
  }

  const dateText = new Date().toISOString().slice(0, 10).replace(/-/g, '.')

  return (
    <main className="min-h-screen flex flex-col items-center justify-center py-12">
      {phase === 'input' && <QuestionInput onSubmit={submit} />}
      {phase === 'casting' && <CastingStage onComplete={finishCasting} />}
      {phase === 'result' && reading && interpretation && (
        <>
          <ResultView reading={reading} interpretation={interpretation} onShare={handleShare} />
          <button className="mt-8 text-xs text-paper/40 underline font-serif" onClick={reset}>再 占 一 卦</button>
          {/* 离屏分享卡，供栅格化 */}
          <div className="fixed -left-[9999px] top-0" aria-hidden>
            <ShareCard
              ref={cardRef}
              interpretation={interpretation}
              lines={reading.primary.lines}
              shiYao={reading.primary.data.shiYao}
              yingYao={reading.primary.data.yingYao}
              dateText={dateText}
            />
          </div>
        </>
      )}
    </main>
  )
}
