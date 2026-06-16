import { DiZhi, WuXing, zhiWuxing } from './wuxing'
import { TRIGRAM_GAN, TRIGRAM_ZHI } from '../data/najia-tables'

export interface NaJia {
  gan: string
  zhi: DiZhi
  wuxing: WuXing
}

/** 纳甲：下卦用内干 + 内卦地支(初→三)，上卦用外干 + 外卦地支(四→上)，返回初→上 6 爻 */
export function najiaOf(lowerTrigram: string, upperTrigram: string): NaJia[] {
  const lowerZhi = TRIGRAM_ZHI[lowerTrigram]
  const upperZhi = TRIGRAM_ZHI[upperTrigram]
  const lowerGan = TRIGRAM_GAN[lowerTrigram]
  const upperGan = TRIGRAM_GAN[upperTrigram]
  if (!lowerZhi || !upperZhi) throw new Error(`najiaOf: 未知经卦 ${lowerTrigram}/${upperTrigram}`)
  const result: NaJia[] = []
  for (let i = 0; i < 3; i++) {
    const zhi = lowerZhi.inner[i]
    result.push({ gan: lowerGan.inner, zhi, wuxing: zhiWuxing(zhi) })
  }
  for (let i = 0; i < 3; i++) {
    const zhi = upperZhi.outer[i]
    result.push({ gan: upperGan.outer, zhi, wuxing: zhiWuxing(zhi) })
  }
  return result
}
