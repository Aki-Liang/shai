import { useRef, useState } from 'react'
import { useCasting } from './hooks/useCasting'
import { useShareImage } from './hooks/useShareImage'
import { QuestionInput } from './components/QuestionInput'
import { CastingStage } from './components/CastingStage'
import { ResultView } from './components/ResultView'
import { ShareCard } from './components/ShareCard'
import { RandomSource } from './domain/random'
import { Clock } from './domain/clock'

export default function App({ rng, clock }: { rng?: RandomSource; clock?: Clock } = {}) {
  const { phase, pan, interpretation, submit, finishCasting, reset } = useCasting(rng, clock)
  const { capture } = useShareImage()
  const cardRef = useRef<HTMLDivElement>(null)
  const [toast, setToast] = useState<string | null>(null)

  const handleShare = async () => {
    if (!cardRef.current) return
    setToast(null)
    try {
      const { dataUrl, shared } = await capture(cardRef.current)
      if (!shared) {
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = '六爻占.png'
        a.click()
      }
    } catch {
      setToast('生成失败，可长按图片保存')
    }
  }

  const dateText = new Date().toISOString().slice(0, 10).replace(/-/g, '.')

  return (
    <main className="min-h-screen flex flex-col items-center justify-center py-12">
      {phase === 'input' && <QuestionInput onSubmit={submit} />}
      {phase === 'casting' && <CastingStage onComplete={finishCasting} />}
      {phase === 'result' && pan && interpretation && (
        <>
          <ResultView pan={pan} interpretation={interpretation} onShare={handleShare} />
          <button
            className="mt-8 text-xs text-ink/40 underline font-serif"
            onClick={() => { setToast(null); reset() }}
          >
            再 占 一 卦
          </button>
          {/* 离屏分享卡，供栅格化 */}
          <div className="fixed -left-[9999px] top-0" aria-hidden>
            <ShareCard
              ref={cardRef}
              interpretation={interpretation}
              lines={pan.reading.primary.lines}
              shiYao={pan.reading.primary.data.shiYao}
              yingYao={pan.reading.primary.data.yingYao}
              dateText={dateText}
              pillarsText={pan.pillars ? `${pan.pillars.year}年 · ${pan.pillars.month}月 · ${pan.pillars.day}日` : undefined}
            />
          </div>
        </>
      )}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 text-xs text-ink bg-paper-2 border border-ink/20 rounded-full px-4 py-2 font-serif">
          {toast}
        </div>
      )}
    </main>
  )
}
