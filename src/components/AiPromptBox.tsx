import { useMemo, useState } from 'react'
import { Pan } from '../domain/pan'
import { YongshenAnalysis } from '../domain/yongshen-analysis'
import { buildAiPrompt } from '../domain/ai-prompt'

interface Props {
  pan: Pan
  analysis: YongshenAnalysis | null
}

export function AiPromptBox({ pan, analysis }: Props) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null)
  const prompt = useMemo(() => buildAiPrompt(pan, analysis), [pan, analysis])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied('ok')
    } catch {
      setCopied('fail')
    }
  }

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <button
        data-testid="ai-prompt-btn"
        onClick={() => setOpen((o) => !o)}
        className="font-serif tracking-[0.2em] text-ink border border-ink/30 rounded-full px-5 py-2"
      >
        生成解卦 Prompt
      </button>
      {open && (
        <div className="w-full max-w-sm flex flex-col items-center gap-2">
          <textarea
            data-testid="ai-prompt-text"
            readOnly
            value={prompt}
            className="w-full h-44 bg-paper-2 border border-ink/15 rounded-lg p-2 text-[10px] leading-relaxed text-ink font-mono resize-none"
          />
          <button
            data-testid="ai-prompt-copy"
            onClick={copy}
            className="text-xs tracking-[0.2em] text-seal border border-seal rounded-full px-4 py-1"
          >
            {copied === 'ok' ? '已复制' : copied === 'fail' ? '请手动选中复制' : '一键复制'}
          </button>
        </div>
      )}
    </div>
  )
}
