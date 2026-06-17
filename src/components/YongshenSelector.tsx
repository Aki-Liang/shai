import { useState } from 'react'
import { YongTarget, YONGSHEN_HINTS, SHI_YONG_HINT } from '../domain/yongshen'

interface Props {
  selected: YongTarget | null
  onSelect: (t: YongTarget | null) => void
}

const TARGETS: YongTarget[] = [...YONGSHEN_HINTS.map((h) => h.liuqin), '世']

export function YongshenSelector({ selected, onSelect }: Props) {
  const [showHint, setShowHint] = useState(false)
  return (
    <div className="flex flex-col items-center gap-2 font-serif">
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <span className="text-[10px] text-ink/50">用神</span>
        {TARGETS.map((t) => (
          <button
            key={t}
            data-testid={`yongshen-${t}`}
            onClick={() => onSelect(selected === t ? null : t)}
            className={`text-xs rounded-full px-2 py-0.5 border ${
              selected === t ? 'bg-seal text-white border-seal' : 'border-ink/20 text-ink-soft'
            }`}
          >
            {t === '世' ? '世爻' : t}
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
        <div className="text-[10px] text-ink/50 max-w-xs text-center leading-relaxed">
          {YONGSHEN_HINTS.map(({ liuqin, hint }) => (
            <div key={liuqin}>
              <span className="text-seal">{liuqin}</span> {hint}
            </div>
          ))}
          <div>
            <span className="text-seal">世爻</span> {SHI_YONG_HINT}
          </div>
        </div>
      )}
    </div>
  )
}
