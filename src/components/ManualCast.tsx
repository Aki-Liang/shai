import { useState } from 'react'
import { Hexagram } from '../domain/types'
import { Coin, lineFromCoins, manualHexagram } from '../domain/manual-cast'

interface Props {
  onComplete: (lines: Hexagram) => void
}

const YAO_NAMES = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻']

function yaoSymbol(coins: (Coin | null)[]) {
  if (coins.some((c) => c === null)) return null
  const line = lineFromCoins(coins as [Coin, Coin, Coin])
  const name = line.yinyang === 'yang' ? (line.moving ? '老阳' : '少阳') : line.moving ? '老阴' : '少阴'
  const mark = line.moving ? (line.yinyang === 'yang' ? '○' : '×') : ''
  return { line, name, mark }
}

export function ManualCast({ onComplete }: Props) {
  const [coins, setCoins] = useState<(Coin | null)[][]>(() => Array.from({ length: 6 }, () => [null, null, null]))
  const setCoin = (yao: number, idx: number, v: Coin) =>
    setCoins((prev) => prev.map((row, y) => (y === yao ? row.map((c, i) => (i === idx ? v : c)) : row)))
  const complete = coins.every((row) => row.every((c) => c !== null))

  return (
    <div data-testid="manual-cast" className="flex flex-col items-center gap-3 px-4 w-full max-w-md mx-auto font-serif">
      <h1 className="text-xl text-ink">手动摇卦</h1>
      <div className="text-[11px] text-ink-soft bg-paper-2 rounded-lg p-3 leading-relaxed max-w-sm">
        取三枚铜钱合掌摇动，<span className="text-seal">自初爻起</span>共六次。摇前自定：哪一面为
        <span className="text-seal">阳</span>、哪一面为<span className="text-seal">阴</span>（全程一致）。
        每掷如实点选三枚 → 自动成爻：三阳老阳(动)·三阴老阴(动)·一阳少阳·二阳少阴。
      </div>
      <div className="flex flex-col gap-1 w-full max-w-sm">
        {[5, 4, 3, 2, 1, 0].map((yao) => {
          const sym = yaoSymbol(coins[yao])
          return (
            <div
              key={yao}
              data-testid="manual-yao"
              className="grid grid-cols-[2.4rem_1fr_3.6rem] items-center gap-2 py-1 border-t border-ink/5 first:border-t-0"
            >
              <span className="text-xs text-ink-soft">{YAO_NAMES[yao]}</span>
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex border border-ink/20 rounded overflow-hidden text-[11px]">
                    {(['阴', '阳'] as Coin[]).map((v) => (
                      <button
                        key={v}
                        onClick={() => setCoin(yao, i, v)}
                        className={`px-2 py-0.5 ${
                          coins[yao][i] === v ? (v === '阳' ? 'bg-ink text-paper' : 'bg-ink-soft text-paper') : 'text-ink-soft'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              <span className="flex items-center justify-end gap-1 text-xs">
                {sym ? (
                  <>
                    <span className="text-seal w-2">{sym.mark}</span>
                    {sym.line.yinyang === 'yang' ? (
                      <span className="block h-2 w-7 bg-current rounded-sm" />
                    ) : (
                      <span className="flex gap-1">
                        <span className="block h-2 w-3 bg-current rounded-sm" />
                        <span className="block h-2 w-3 bg-current rounded-sm" />
                      </span>
                    )}
                    <span className="text-[10px] text-ink-soft">{sym.name}</span>
                  </>
                ) : (
                  <span className="text-[10px] text-ink/30">待填</span>
                )}
              </span>
            </div>
          )
        })}
      </div>
      <button
        data-testid="make-hexagram"
        disabled={!complete}
        onClick={() => onComplete(manualHexagram(coins.map((r) => [r[0]!, r[1]!, r[2]!] as [Coin, Coin, Coin])))}
        className="mt-2 font-serif tracking-[0.3em] text-ink border border-ink/30 rounded-full px-6 py-2 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {complete ? '成 卦' : '成 卦（待填满）'}
      </button>
    </div>
  )
}
