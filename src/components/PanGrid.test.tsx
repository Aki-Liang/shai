import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PanGrid } from './PanGrid'
import { Pan } from '../domain/pan'

// 手搭一份最小 Pan：二爻动+空+伏神+变出，世初应四
const pan = {
  reading: {},
  pillars: { year: '丙午', month: '甲午', day: '甲子', dayGan: '甲', xunKong: ['亥', '子'] },
  palace: { trigram: '乾', element: '金', headLines: [] },
  lines: [
    { position: 1, liushen: '青龙', liuqin: '父母', najia: { gan: '辛', zhi: '丑', wuxing: '土' }, yinyang: 'yin', moving: false, shi: true, ying: false, kong: false },
    { position: 2, liushen: '朱雀', liuqin: '子孙', najia: { gan: '辛', zhi: '亥', wuxing: '水' }, yinyang: 'yang', moving: true, shi: false, ying: false, kong: true,
      fushen: { position: 2, liuqin: '妻财', najia: { gan: '甲', zhi: '寅', wuxing: '木' } },
      changed: { najia: { gan: '丙', zhi: '午', wuxing: '火' }, liuqin: '官鬼' } },
    { position: 3, liushen: '勾陈', liuqin: '兄弟', najia: { gan: '辛', zhi: '酉', wuxing: '金' }, yinyang: 'yang', moving: false, shi: false, ying: false, kong: false },
    { position: 4, liushen: '螣蛇', liuqin: '官鬼', najia: { gan: '壬', zhi: '午', wuxing: '火' }, yinyang: 'yang', moving: false, shi: false, ying: true, kong: false },
    { position: 5, liushen: '白虎', liuqin: '兄弟', najia: { gan: '壬', zhi: '申', wuxing: '金' }, yinyang: 'yang', moving: false, shi: false, ying: false, kong: false },
    { position: 6, liushen: '玄武', liuqin: '父母', najia: { gan: '壬', zhi: '戌', wuxing: '土' }, yinyang: 'yang', moving: false, shi: false, ying: false, kong: false },
  ],
} as unknown as Pan

describe('PanGrid', () => {
  it('渲染六神/六亲纳甲/伏神/变出/世应/动/空', () => {
    render(<PanGrid lines={pan.lines} highlight={null} />)
    expect(screen.getByText('青龙')).toBeInTheDocument()
    expect(screen.getByText(/子孙亥水/)).toBeInTheDocument()
    expect(screen.getByText(/伏 妻财寅木/)).toBeInTheDocument()
    expect(screen.getByText(/→官鬼午火/)).toBeInTheDocument()
    expect(screen.getByText('世')).toBeInTheDocument()
    expect(screen.getByText('应')).toBeInTheDocument()
    expect(screen.getByText('空')).toBeInTheDocument()
  })
  it('上爻在最上（首行 position=6）', () => {
    render(<PanGrid lines={pan.lines} highlight={null} />)
    const rows = screen.getAllByTestId('pan-row')
    expect(rows[0].getAttribute('data-pos')).toBe('6')
    expect(rows[5].getAttribute('data-pos')).toBe('1')
  })
  it('highlight 命中六亲的行打标', () => {
    render(<PanGrid lines={pan.lines} highlight="官鬼" />)
    const hit = screen.getAllByTestId('pan-row').filter((r) => r.getAttribute('data-highlight') === 'true')
    expect(hit).toHaveLength(1)
    expect(hit[0].getAttribute('data-pos')).toBe('4')
  })
  it('伏藏用神：yongshenHiddenAt 高亮该爻位并把伏神标为用神', () => {
    render(<PanGrid lines={pan.lines} highlight={null} yongshenHiddenAt={2} />)
    const hit = screen.getAllByTestId('pan-row').filter((r) => r.getAttribute('data-highlight') === 'true')
    expect(hit).toHaveLength(1)
    expect(hit[0].getAttribute('data-pos')).toBe('2')
    expect(screen.getByText(/用神·伏 妻财寅木/)).toBeInTheDocument()
  })
})
