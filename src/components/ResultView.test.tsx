import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResultView } from './ResultView'
import { Pan } from '../domain/pan'
import { Interpretation } from '../domain/interpret'

const pan = {
  reading: {
    question: '此次面试能成否',
    primary: { data: { name: '天风姤' } },
    changed: { data: { name: '天山遯' } },
  },
  pillars: { year: '丙午', month: '甲午', day: '甲子', dayGan: '甲', xunKong: ['戌', '亥'] },
  palace: { trigram: '乾', element: '金', headLines: [] },
  lines: [
    { position: 1, liushen: '青龙', liuqin: '父母', najia: { gan: '辛', zhi: '丑', wuxing: '土' }, yinyang: 'yin', moving: false, shi: true, ying: false, kong: false },
    { position: 2, liushen: '朱雀', liuqin: '官鬼', najia: { gan: '辛', zhi: '亥', wuxing: '水' }, yinyang: 'yang', moving: false, shi: false, ying: false, kong: false },
    { position: 3, liushen: '勾陈', liuqin: '兄弟', najia: { gan: '辛', zhi: '酉', wuxing: '金' }, yinyang: 'yang', moving: false, shi: false, ying: false, kong: false },
    { position: 4, liushen: '螣蛇', liuqin: '父母', najia: { gan: '壬', zhi: '午', wuxing: '火' }, yinyang: 'yang', moving: false, shi: false, ying: true, kong: false },
    { position: 5, liushen: '白虎', liuqin: '兄弟', najia: { gan: '壬', zhi: '申', wuxing: '金' }, yinyang: 'yang', moving: false, shi: false, ying: false, kong: false },
    { position: 6, liushen: '玄武', liuqin: '子孙', najia: { gan: '壬', zhi: '戌', wuxing: '土' }, yinyang: 'yang', moving: false, shi: false, ying: false, kong: false },
  ],
  // 变卦完整盘 mock（故意不含「父母」，使父母高亮仅命中本卦 1/4 行）
  changedLines: [
    { position: 1, liushen: '青龙', liuqin: '官鬼', najia: { gan: '丙', zhi: '辰', wuxing: '土' }, yinyang: 'yin', moving: false, shi: false, ying: false, kong: false },
    { position: 2, liushen: '朱雀', liuqin: '兄弟', najia: { gan: '丙', zhi: '午', wuxing: '火' }, yinyang: 'yin', moving: false, shi: true, ying: false, kong: false },
    { position: 3, liushen: '勾陈', liuqin: '子孙', najia: { gan: '丙', zhi: '申', wuxing: '金' }, yinyang: 'yang', moving: false, shi: false, ying: false, kong: false },
    { position: 4, liushen: '螣蛇', liuqin: '官鬼', najia: { gan: '壬', zhi: '午', wuxing: '火' }, yinyang: 'yang', moving: false, shi: false, ying: false, kong: false },
    { position: 5, liushen: '白虎', liuqin: '兄弟', najia: { gan: '壬', zhi: '申', wuxing: '金' }, yinyang: 'yang', moving: false, shi: false, ying: true, kong: false },
    { position: 6, liushen: '玄武', liuqin: '妻财', najia: { gan: '壬', zhi: '戌', wuxing: '土' }, yinyang: 'yang', moving: false, shi: false, ying: false, kong: false },
  ],
} as unknown as Pan

const interp: Interpretation = {
  question: '此次面试能成否', primaryName: '天风姤', changedName: '天山遯',
  judgment: '姤：女壮，勿用取女。',
  movingLineTexts: [{ index: 1, text: '九二：包有鱼，无咎，不利宾。' }],
}

describe('ResultView', () => {
  it('显示所问、本卦/变卦、干支柱、卦辞、动爻爻辞', () => {
    render(<ResultView pan={pan} interpretation={interp} onShare={vi.fn()} />)
    expect(screen.getByText(/此次面试能成否/)).toBeInTheDocument()
    expect(screen.getByText(/天风姤/)).toBeInTheDocument()
    expect(screen.getByText(/天山遯/)).toBeInTheDocument() // 变卦盘标签
    expect(screen.getByText(/丙午年/)).toBeInTheDocument()
    expect(screen.getByText(/女壮/)).toBeInTheDocument()
    expect(screen.getByText(/包有鱼/)).toBeInTheDocument()
    // 本卦 + 变卦 两盘各 6 行
    expect(screen.getAllByTestId('pan-row')).toHaveLength(12)
  })
  it('选用神高亮对应六亲行', async () => {
    render(<ResultView pan={pan} interpretation={interp} onShare={vi.fn()} />)
    await userEvent.click(screen.getByTestId('yongshen-父母'))
    const hit = screen.getAllByTestId('pan-row').filter((r) => r.getAttribute('data-highlight') === 'true')
    expect(hit.map((r) => r.getAttribute('data-pos')).sort()).toEqual(['1', '4'])
  })
})
