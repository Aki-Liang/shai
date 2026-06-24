import { useMemo } from 'react'
import { CastRecord, summarize } from '../domain/cast-record'

interface Props {
  records: CastRecord[]
  onOpen: (record: CastRecord) => void
  onDelete: (id: string) => void
  onClear: () => void
  onBack: () => void
}

function fmt(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function HistoryView({ records, onOpen, onDelete, onClear, onBack }: Props) {
  const summaries = useMemo(() => records.map(summarize), [records])

  return (
    <div data-testid="history-view" className="flex flex-col gap-4 px-4 w-full max-w-md mx-auto font-serif">
      <div className="flex items-center justify-between">
        <button data-testid="history-back" onClick={onBack} className="text-xs text-ink/50 underline">
          ← 返回
        </button>
        <h1 className="text-lg text-ink">起卦记录</h1>
        {records.length > 0 ? (
          <button
            data-testid="history-clear"
            onClick={() => { if (window.confirm('清空全部起卦记录？')) onClear() }}
            className="text-xs text-seal/80 underline"
          >
            清空
          </button>
        ) : (
          <span className="w-8" />
        )}
      </div>

      {records.length === 0 ? (
        <p data-testid="history-empty" className="text-center text-sm text-ink/40 py-16">
          还没有起卦记录
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {records.map((r, i) => (
            <li key={r.id} className="border border-ink/15 rounded-lg p-3 flex items-center gap-3">
              <button
                data-testid="history-item"
                onClick={() => onOpen(r)}
                className="flex-1 text-left min-w-0"
              >
                <div className="text-sm text-ink truncate">{r.question || '（未填）'}</div>
                <div className="text-[11px] text-ink/50 mt-1">
                  {summaries[i].primaryName}
                  {summaries[i].changedName ? ` → ${summaries[i].changedName}` : ''}
                  {summaries[i].movingCount > 0 ? ` · ${summaries[i].movingCount} 动` : ''}
                </div>
                <div className="text-[10px] text-ink/40 mt-1">
                  {fmt(r.createdAt)} · {r.mode === 'manual' ? '手动' : '赛博'}
                </div>
              </button>
              <button
                data-testid="history-delete"
                onClick={() => { if (window.confirm('删除这条记录？')) onDelete(r.id) }}
                className="text-xs text-ink/30 hover:text-seal shrink-0"
                aria-label="删除"
              >
                删除
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
