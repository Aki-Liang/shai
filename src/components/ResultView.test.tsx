import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
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
    { position: 2, liushen: '朱雀', liuqin: '官鬼', najia: { gan: '辛', zhi: '亥', wuxing: '水' }, yinyang: 'yang', moving: false, shi: false, ying: false, kong: false,
      fushen: { position: 2, liuqin: '妻财', najia: { gan: '甲', zhi: '寅', wuxing: '木' } } },
    { position: 3, liushen: '勾陈', liuqin: '兄弟', najia: { gan: '辛', zhi: '酉', wuxing: '金' }, yinyang: 'yang', moving: false, shi: false, ying: false, kong: false },
    { position: 4, liushen: '螣蛇', liuqin: '父母', najia: { gan: '壬', zhi: '午', wuxing: '火' }, yinyang: 'yang', moving: false, shi: false, ying: true, kong: false },
    { position: 5, liushen: '白虎', liuqin: '兄弟', najia: { gan: '壬', zhi: '申', wuxing: '金' }, yinyang: 'yang', moving: false, shi: false, ying: false, kong: false },
    { position: 6, liushen: '玄武', liuqin: '子孙', najia: { gan: '壬', zhi: '戌', wuxing: '土' }, yinyang: 'yang', moving: true, shi: false, ying: false, kong: false,
      changed: { najia: { gan: '壬', zhi: '戌', wuxing: '土' }, liuqin: '妻财' } },
  ],
  // 变卦完整盘 mock（pos1 设为「父母」以验证选父母时变卦不被高亮）
  changedLines: [
    { position: 1, liushen: '青龙', liuqin: '父母', najia: { gan: '丙', zhi: '辰', wuxing: '土' }, yinyang: 'yin', moving: false, shi: false, ying: false, kong: false },
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
  it('用神（上卦单/多现）只在本卦按爻位高亮、变卦不染，并出现分析面板', async () => {
    render(<ResultView pan={pan} interpretation={interp} onShare={vi.fn()} />)
    await userEvent.click(screen.getByTestId('yongshen-父母'))
    const primaryHit = within(screen.getByTestId('board-primary'))
      .getAllByTestId('pan-row')
      .filter((r) => r.getAttribute('data-highlight') === 'true')
    expect(primaryHit).toHaveLength(1)
    expect(['1', '4']).toContain(primaryHit[0].getAttribute('data-pos'))
    const changedHit = within(screen.getByTestId('board-changed'))
      .getAllByTestId('pan-row')
      .filter((r) => r.getAttribute('data-highlight') === 'true')
    expect(changedHit).toHaveLength(0)
    expect(screen.getByTestId('yongshen-panel')).toBeInTheDocument()
    expect(screen.getAllByTestId('force-row').length).toBeGreaterThan(0)
  })
  it('用神不上卦取伏神：高亮伏神所挂爻并标用神·伏', async () => {
    render(<ResultView pan={pan} interpretation={interp} onShare={vi.fn()} />)
    await userEvent.click(screen.getByTestId('yongshen-妻财'))
    const primaryHit = within(screen.getByTestId('board-primary'))
      .getAllByTestId('pan-row')
      .filter((r) => r.getAttribute('data-highlight') === 'true')
    expect(primaryHit.map((r) => r.getAttribute('data-pos'))).toEqual(['2'])
    expect(screen.getByText(/用神·伏 妻财寅木/)).toBeInTheDocument()
  })
  it('选世爻：高亮持世爻（初爻）', async () => {
    render(<ResultView pan={pan} interpretation={interp} onShare={vi.fn()} />)
    await userEvent.click(screen.getByTestId('yongshen-世'))
    const primaryHit = within(screen.getByTestId('board-primary'))
      .getAllByTestId('pan-row')
      .filter((r) => r.getAttribute('data-highlight') === 'true')
    expect(primaryHit.map((r) => r.getAttribute('data-pos'))).toEqual(['1'])
  })
  it('点作用源行（飞神 pos2）→ 本卦对应爻加描边高亮（data-source）', async () => {
    render(<ResultView pan={pan} interpretation={interp} onShare={vi.fn()} />)
    await userEvent.click(screen.getByTestId('yongshen-妻财')) // 伏神在二爻，作用源含飞神 pos2
    const flyRow = screen.getAllByTestId('force-row').find((r) => r.textContent?.includes('飞神'))!
    await userEvent.click(flyRow)
    const sourced = within(screen.getByTestId('board-primary'))
      .getAllByTestId('pan-row')
      .filter((r) => r.getAttribute('data-source') === 'true')
    expect(sourced.map((r) => r.getAttribute('data-pos'))).toEqual(['2'])
  })
  it('点变爻·回头行 → 高亮变卦对应爻（非本卦）', async () => {
    render(<ResultView pan={pan} interpretation={interp} onShare={vi.fn()} />)
    await userEvent.click(screen.getByTestId('yongshen-子孙')) // 六爻子孙发动 → 变爻源 pos6
    const bianRow = screen.getAllByTestId('force-row').find((r) => r.textContent?.includes('变爻'))!
    await userEvent.click(bianRow)
    // 变卦盘 pos6 被描边
    const changedSourced = within(screen.getByTestId('board-changed'))
      .getAllByTestId('pan-row')
      .filter((r) => r.getAttribute('data-source') === 'true')
    expect(changedSourced.map((r) => r.getAttribute('data-pos'))).toEqual(['6'])
    // 本卦盘无作用源描边
    const primarySourced = within(screen.getByTestId('board-primary'))
      .getAllByTestId('pan-row')
      .filter((r) => r.getAttribute('data-source') === 'true')
    expect(primarySourced).toHaveLength(0)
  })
  it('显示「复制分享链接」按钮并触发 onShare', async () => {
    const onShare = vi.fn()
    render(<ResultView pan={pan} interpretation={interp} onShare={onShare} />)
    const btn = screen.getByTestId('share-link-btn')
    expect(btn).toHaveTextContent('复制分享链接')
    await userEvent.click(btn)
    expect(onShare).toHaveBeenCalled()
  })
})
