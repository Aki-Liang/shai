import { useState } from 'react'
import { LiuQin } from '../domain/liuqin'
import { YONGSHEN_HINTS } from '../domain/yongshen'

interface Props {
  selected: LiuQin | null
  onSelect: (lq: LiuQin | null) => void
}

export function YongshenSelector({ selected, onSelect }: Props) {
  const [showHint, setShowHint] = useState(false)
  return (
    <div className="flex flex-col items-center gap-2 font-serif">
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <span className="text-[10px] text-ink/50">用神</span>
        {YONGSHEN_HINTS.map(({ liuqin }) => (
          <button
            key={liuqin}
            data-testid={`yongshen-${liuqin}`}
            onClick={() => onSelect(selected === liuqin ? null : liuqin)}
            className={`text-xs rounded-full px-2 py-0.5 border ${
              selected === liuqin ? 'bg-seal text-white border-seal' : 'border-ink/20 text-ink-soft'
            }`}
          >
            {liuqin}
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
        </div>
      )}
    </div>
  )
}
