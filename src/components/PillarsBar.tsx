import { GanZhiPillars } from '../domain/ganzhi'

interface Props {
  pillars: GanZhiPillars
}

export function PillarsBar({ pillars }: Props) {
  return (
    <div className="flex items-center justify-center gap-3 text-xs text-ink-soft font-serif">
      <span>{pillars.year}年</span>
      <span>{pillars.month}月</span>
      <span>{pillars.day}日</span>
      <span className="text-seal">旬空 {pillars.xunKong[0]}{pillars.xunKong[1]}</span>
    </div>
  )
}
