import { Solar } from 'lunar-typescript'
import { DiZhi } from './wuxing'

const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

export interface GanZhiPillars {
  year: string // 如 "乙巳"
  month: string // 如 "甲午"
  day: string // 如 "甲子"
  dayGan: string // 日干，如 "甲"
  xunKong: [DiZhi, DiZhi] // 当旬空亡两地支，如 ["戌","亥"]
}

/** 由日柱干支算当旬空亡：旬首地支 s=(zhi-gan+12)%12，空亡=(s+10)%12,(s+11)%12 */
export function xunKongOf(dayGanZhi: string): [DiZhi, DiZhi] {
  const gan = GAN.indexOf(dayGanZhi.charAt(0))
  const zhi = ZHI.indexOf(dayGanZhi.charAt(1))
  if (gan < 0 || zhi < 0) throw new Error(`xunKongOf: 非法日柱 ${dayGanZhi}`)
  const s = (zhi - gan + 12) % 12
  // 旬空两支必为合法地支（取自 ZHI 表），在产出处下沉为 DiZhi，消除消费侧强转
  return [ZHI[(s + 10) % 12], ZHI[(s + 11) % 12]] as [DiZhi, DiZhi]
}

/** 设备本地时间 → 干支三柱 + 旬空（年立春界 / 月节界 / 日子时换日） */
export function pillarsOf(date: Date): GanZhiPillars {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new Error('pillarsOf: 非法 Date')
  }
  const lunar = Solar.fromDate(date).getLunar()
  const year = lunar.getYearInGanZhiExact() // 立春为界
  const month = lunar.getMonthInGanZhiExact() // 节为界
  const day = lunar.getDayInGanZhiExact() // 子时(23:00)换日
  return { year, month, day, dayGan: day.charAt(0), xunKong: xunKongOf(day) }
}
