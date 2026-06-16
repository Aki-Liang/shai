export interface RandomSource {
  /** 返回 [0, max) 的整数 */
  nextInt(max: number): number
}

/** 生产用：crypto，拒绝采样消除取模偏差 */
export const cryptoRandom: RandomSource = {
  nextInt(max: number): number {
    if (max <= 0) throw new Error('max 必须为正')
    const limit = Math.floor(0xffffffff / max) * max
    const buf = new Uint32Array(1)
    let x = 0
    do {
      crypto.getRandomValues(buf)
      x = buf[0]
    } while (x >= limit)
    return x % max
  },
}

/** 测试用：按固定序列返回，循环复用 */
export function sequenceRandom(seq: number[]): RandomSource {
  if (seq.length === 0) throw new Error('序列不能为空')
  let i = 0
  return {
    nextInt(_max: number): number {
      const v = seq[i % seq.length]
      i++
      return v
    },
  }
}
