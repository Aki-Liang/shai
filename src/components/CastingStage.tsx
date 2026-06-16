import { useEffect, useRef, useState } from 'react'
import { CoinToss } from './CoinToss'

interface Props {
  onComplete: () => void
  /** 每掷间隔（ms），测试可传 0 */
  throwInterval?: number
}

const TOTAL = 6

export function CastingStage({ onComplete, throwInterval = 900 }: Props) {
  // 注：此处铜钱动画纯粹为视觉演示；实际起卦运算在 finishCasting（即 onComplete 回调）中执行。
  const [thrown, setThrown] = useState(0)
  const done = useRef(false)

  const finish = () => {
    if (done.current) return
    done.current = true
    onComplete()
  }

  useEffect(() => {
    if (thrown >= TOTAL) {
      finish()
      return
    }
    const t = setTimeout(() => setThrown((n) => n + 1), throwInterval)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thrown, throwInterval])

  return (
    <div className="flex flex-col items-center gap-8">
      <p className="text-xs tracking-widest text-cinnabar font-serif">第 {Math.min(thrown + 1, TOTAL)} / {TOTAL} 爻</p>
      <CoinToss spinning={thrown < TOTAL} />
      <button className="text-xs text-paper/40 underline font-serif" onClick={finish}>
        跳过
      </button>
    </div>
  )
}
