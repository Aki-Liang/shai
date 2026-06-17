import { useState } from 'react'
import { CastMode } from '../domain/types'

interface Props {
  onSubmit: (question: string, mode: CastMode) => void
}

export function QuestionInput({ onSubmit }: Props) {
  const [value, setValue] = useState('')
  const [mode, setMode] = useState<CastMode>('cyber')
  const [showHint, setShowHint] = useState(false)
  const trimmed = value.trim()
  const valid = trimmed.length > 0

  return (
    <div className="flex flex-col items-center gap-6 px-6 w-full max-w-md mx-auto">
      <h1 className="font-serif text-2xl text-ink">心有所问</h1>
      <label className="w-full">
        <span className="block text-xs text-ink/50 mb-2 font-serif">写下你想问的事</span>
        <textarea
          className="w-full bg-transparent border-b border-ink/20 text-ink font-serif p-2 outline-none focus:border-ink/50 resize-none"
          rows={2}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="心诚则灵…"
        />
      </label>
      <div className="flex items-center gap-2 font-serif">
        {(['cyber', 'manual'] as CastMode[]).map((m) => (
          <button
            key={m}
            data-testid={`mode-${m}`}
            onClick={() => setMode(m)}
            className={`text-xs rounded-full px-3 py-1 border ${
              mode === m ? 'bg-seal text-white border-seal' : 'border-ink/20 text-ink-soft'
            }`}
          >
            {m === 'cyber' ? '赛博摇卦' : '手动摇卦'}
          </button>
        ))}
        <button
          onClick={() => setShowHint((s) => !s)}
          className="text-[10px] text-ink/40 border border-ink/20 rounded-full w-4 h-4 leading-none"
        >
          ?
        </button>
      </div>
      {showHint && (
        <p className="text-[10px] text-ink/50 font-serif text-center max-w-xs leading-relaxed">
          赛博＝密码学随机自动起卦 · 手动＝自己摇铜钱逐爻录入
        </p>
      )}
      {!valid && <p className="text-xs text-seal/80 font-serif">心诚则灵，先写下所问</p>}
      <button
        className="font-serif tracking-[0.3em] text-ink border border-ink/30 rounded-full px-6 py-2 disabled:opacity-30 disabled:cursor-not-allowed"
        disabled={!valid}
        onClick={() => valid && onSubmit(trimmed, mode)}
      >
        {mode === 'cyber' ? '诚心摇卦' : '手动起卦'}
      </button>
    </div>
  )
}
