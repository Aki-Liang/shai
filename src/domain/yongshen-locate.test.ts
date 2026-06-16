import { describe, it, expect } from 'vitest'
import { locateYongshen } from './yongshen-locate'
import { PanLine } from './pan'

// 最小 PanLine 工厂
function line(position: number, liuqin: string, fushenLiuqin?: string): PanLine {
  return {
    position,
    liushen: null,
    liuqin: liuqin as PanLine['liuqin'],
    najia: { gan: '甲', zhi: '子', wuxing: '水' },
    yinyang: 'yang',
    moving: false,
    shi: false,
    ying: false,
    kong: false,
    fushen: fushenLiuqin
      ? { position, liuqin: fushenLiuqin as PanLine['liuqin'], najia: { gan: '甲', zhi: '寅', wuxing: '木' } }
      : undefined,
  }
}

describe('locateYongshen', () => {
  it('上卦单现：visible 取该爻', () => {
    const lines = [line(1, '父母'), line(2, '官鬼'), line(3, '兄弟')]
    expect(locateYongshen(lines, '官鬼')).toEqual({ kind: 'visible', positions: [2] })
  })
  it('上卦多现：visible 取诸现爻（暂不挑选）', () => {
    const lines = [line(1, '父母'), line(2, '官鬼'), line(3, '父母')]
    expect(locateYongshen(lines, '父母')).toEqual({ kind: 'visible', positions: [1, 3] })
  })
  it('不上卦：hidden 取伏神所挂爻位', () => {
    // 本卦无妻财，但二爻下伏妻财
    const lines = [line(1, '父母'), line(2, '官鬼', '妻财'), line(3, '兄弟')]
    expect(locateYongshen(lines, '妻财')).toEqual({ kind: 'hidden', position: 2 })
  })
})
