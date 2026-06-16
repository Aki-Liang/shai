import { CastReading } from './reading'

export interface MovingLineText {
  index: number // 0=初爻
  text: string
}

export interface Interpretation {
  question: string
  primaryName: string
  changedName: string | null
  judgment: string
  movingLineTexts: MovingLineText[]
}

/**
 * 解卦接缝。一期：本地组装周易原文（取爻辞规则：有动爻列出各动爻爻辞，无动爻看卦辞）。
 * 二期：替换为 fetch 调 serverless 的 AI 解读，签名不变。
 */
export async function interpret(reading: CastReading): Promise<Interpretation> {
  const { question, primary, changed, movingIndexes } = reading
  return {
    question,
    primaryName: primary.data.name,
    changedName: changed?.data.name ?? null,
    judgment: primary.data.judgment,
    movingLineTexts: movingIndexes.map((i) => ({ index: i, text: primary.data.lineTexts[i] })),
  }
}
