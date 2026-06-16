import { WuXing } from '../domain/wuxing'

// 八宫首卦（六爻自下而上，true=阳）+ 宫五行
export interface PalaceHead {
  trigram: string
  element: WuXing
  lines: boolean[]
}
export const PALACE_HEADS: PalaceHead[] = [
  { trigram: '乾', element: '金', lines: [true, true, true, true, true, true] },
  { trigram: '兑', element: '金', lines: [true, true, false, true, true, false] },
  { trigram: '离', element: '火', lines: [true, false, true, true, false, true] },
  { trigram: '震', element: '木', lines: [true, false, false, true, false, false] },
  { trigram: '巽', element: '木', lines: [false, true, true, false, true, true] },
  { trigram: '坎', element: '水', lines: [false, true, false, false, true, false] },
  { trigram: '艮', element: '土', lines: [false, false, true, false, false, true] },
  { trigram: '坤', element: '土', lines: [false, false, false, false, false, false] },
]

// 八宫八卦：相对首卦的累积翻爻集（位 1=初爻）+ 世位
export interface PalaceVariant {
  flips: number[]
  shiYao: number
}
export const PALACE_VARIANTS: PalaceVariant[] = [
  { flips: [], shiYao: 6 },           // 本宫
  { flips: [1], shiYao: 1 },          // 一世
  { flips: [1, 2], shiYao: 2 },       // 二世
  { flips: [1, 2, 3], shiYao: 3 },    // 三世
  { flips: [1, 2, 3, 4], shiYao: 4 }, // 四世
  { flips: [1, 2, 3, 4, 5], shiYao: 5 }, // 五世
  { flips: [1, 2, 3, 5], shiYao: 4 }, // 游魂
  { flips: [5], shiYao: 3 },          // 归魂
]
