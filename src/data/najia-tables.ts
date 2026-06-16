import { DiZhi } from '../domain/wuxing'

// 八经卦天干（乾坤分内外，其余内外同）
export const TRIGRAM_GAN: Record<string, { inner: string; outer: string }> = {
  乾: { inner: '甲', outer: '壬' },
  坤: { inner: '乙', outer: '癸' },
  震: { inner: '庚', outer: '庚' },
  巽: { inner: '辛', outer: '辛' },
  坎: { inner: '戊', outer: '戊' },
  离: { inner: '己', outer: '己' },
  艮: { inner: '丙', outer: '丙' },
  兑: { inner: '丁', outer: '丁' },
}

// 八经卦地支（内卦 初→三 / 外卦 四→上）
export const TRIGRAM_ZHI: Record<string, { inner: DiZhi[]; outer: DiZhi[] }> = {
  乾: { inner: ['子', '寅', '辰'], outer: ['午', '申', '戌'] },
  震: { inner: ['子', '寅', '辰'], outer: ['午', '申', '戌'] },
  坎: { inner: ['寅', '辰', '午'], outer: ['申', '戌', '子'] },
  艮: { inner: ['辰', '午', '申'], outer: ['戌', '子', '寅'] },
  坤: { inner: ['未', '巳', '卯'], outer: ['丑', '亥', '酉'] },
  巽: { inner: ['丑', '亥', '酉'], outer: ['未', '巳', '卯'] },
  离: { inner: ['卯', '丑', '亥'], outer: ['酉', '未', '巳'] },
  兑: { inner: ['巳', '卯', '丑'], outer: ['亥', '酉', '未'] },
}
