import { useState } from 'react'

interface Props {
  onSubmit: (question: string) => void
}

export function QuestionInput({ onSubmit }: Props) {
  const [value, setValue] = useState('')
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
      {!valid && <p className="text-xs text-seal/80 font-serif">心诚则灵，先写下所问</p>}
      <button
        className="font-serif tracking-[0.3em] text-ink border border-ink/30 rounded-full px-6 py-2 disabled:opacity-30 disabled:cursor-not-allowed"
        disabled={!valid}
        onClick={() => valid && onSubmit(trimmed)}
      >
        诚心摇卦
      </button>
    </div>
  )
}
