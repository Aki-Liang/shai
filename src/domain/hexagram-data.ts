export interface HexagramData {
  order: number // King Wen 卦序 1–64
  name: string // 卦名，如「地天泰」
  symbol: string // 卦符，如 ䷊
  upper: string // 上卦（八经卦名）
  lower: string // 下卦
  lines: boolean[] // 六爻自下而上，true=阳
  judgment: string // 卦辞
  lineTexts: string[] // 六条爻辞，自下而上，长度 6
  shiYao: number // 世爻位 1–6
  yingYao: number // 应爻位 1–6
}
