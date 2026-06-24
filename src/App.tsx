import { useEffect, useState } from 'react'
import { useCasting } from './hooks/useCasting'
import { useCastRecords } from './hooks/useCastRecords'
import { QuestionInput } from './components/QuestionInput'
import { CastingStage } from './components/CastingStage'
import { ManualCast } from './components/ManualCast'
import { ResultView } from './components/ResultView'
import { HistoryView } from './components/HistoryView'
import { RandomSource } from './domain/random'
import { Clock } from './domain/clock'
import { encodeShareLink, decodeShareLink } from './domain/share-link'
import { buildShareUrl, readShareParam } from './lib/share-url'
import { copyText } from './lib/clipboard'

export default function App({ rng, clock }: { rng?: RandomSource; clock?: Clock } = {}) {
  const records = useCastRecords()
  const {
    phase, origin, record, pan, interpretation,
    submit, finishCasting, finishManual, openHistory, openRecord, openShared, reset,
  } = useCasting(rng, clock, records.add)
  const [toast, setToast] = useState<string | null>(null)

  // 打开分享链接：挂载时解码 hash → 重建结果页（无效则忽略，正常进首页）
  // 并监听 hash 变化，支持同会话内打开分享链接（如在地址栏粘贴新链接）
  useEffect(() => {
    const handleHashChange = () => {
      const param = readShareParam()
      if (!param) return
      const rec = decodeShareLink(param)
      if (rec) openShared(rec)
    }

    handleHashChange()
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [openShared])

  const handleShareLink = async () => {
    if (!record) return
    const url = buildShareUrl(
      encodeShareLink({ question: record.question, lines: record.lines, createdAt: record.createdAt }),
    )
    setToast((await copyText(url)) ? '链接已复制' : '复制失败，请手动复制')
  }

  const resultBack =
    origin === 'shared'
      ? { label: '去 占 一 卦', onClick: reset }
      : origin === 'history'
        ? { label: '← 返 回 记 录', onClick: openHistory }
        : { label: '再 占 一 卦', onClick: reset }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center py-12">
      {phase === 'input' && <QuestionInput onSubmit={submit} onOpenHistory={openHistory} />}
      {phase === 'casting' && <CastingStage onComplete={finishCasting} />}
      {phase === 'manual' && <ManualCast onComplete={finishManual} />}
      {phase === 'history' && (
        <HistoryView
          records={records.records}
          onOpen={openRecord}
          onDelete={records.remove}
          onClear={records.clear}
          onBack={reset}
        />
      )}
      {phase === 'result' && pan && interpretation && (
        <>
          <ResultView pan={pan} interpretation={interpretation} onShare={handleShareLink} />
          <button
            className="mt-8 text-xs text-ink/40 underline font-serif"
            onClick={() => { setToast(null); resultBack.onClick() }}
          >
            {resultBack.label}
          </button>
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
