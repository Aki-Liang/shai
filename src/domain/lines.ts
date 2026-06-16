import { Line } from './types'

/** 三铜钱之和（字=2，背=3）映射到爻。和的奇偶定阴阳；6/9（全同）为动爻。 */
export function lineFromSum(sum: number): Line {
  switch (sum) {
    case 6: return { yinyang: 'yin', moving: true }    // 老阴
    case 7: return { yinyang: 'yang', moving: false }  // 少阳
    case 8: return { yinyang: 'yin', moving: false }   // 少阴
    case 9: return { yinyang: 'yang', moving: true }   // 老阳
    default: throw new Error(`无效的铜钱之和: ${sum}（应为 6–9）`)
  }
}
