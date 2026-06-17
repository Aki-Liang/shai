import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { YongshenPanel } from './YongshenPanel'
import { YongshenAnalysis } from '../domain/yongshen-analysis'

const base: YongshenAnalysis = {
  target: '妻财', liuqin: '妻财', najia: { gan: '甲', zhi: '寅', wuxing: '木' },
  position: 2, isFu: true, isShi: false, duplicate: null,
  wangshuai: '休', monthBreak: false, kong: false,
  wangshuaiReason: '寅木生午火泄气',
  sources: [
    { kind: '月', zhi: '午', wuxing: '火', force: { force: '泄', chong: false, he: false } },
    { kind: '日', zhi: '子', wuxing: '水', force: { force: '得生', chong: false, he: false } },
    { kind: '飞', position: 2, zhi: '亥', wuxing: '水', force: { force: '得生', chong: false, he: false } },
    { kind: '动', position: 5, zhi: '申', wuxing: '金', force: { force: '受克', chong: true, he: false } },
  ],
}

describe('YongshenPanel', () => {
  it('渲染标题（伏神标记 + 旺衰）与各 force-row', () => {
    render(<YongshenPanel analysis={base} target="妻财" />)
    const head = screen.getByTestId('yong-head')
    expect(head.textContent).toMatch(/妻财寅木/)
    expect(head.textContent).toMatch(/伏神/)
    expect(head.textContent).toMatch(/旺衰：休/)
    expect(screen.getAllByTestId('force-row')).toHaveLength(4)
    expect(screen.getByText(/飞神/)).toBeInTheDocument()
  })
  it('世爻 + 月破 标记', () => {
    render(<YongshenPanel analysis={{ ...base, isFu: false, isShi: true, monthBreak: true }} target="世" />)
    const head = screen.getByTestId('yong-head')
    expect(head.textContent).toMatch(/· 世/)
    expect(head.textContent).toMatch(/月破/)
  })
  it('两现标记', () => {
    render(<YongshenPanel analysis={{ ...base, isFu: false, duplicate: { picked: 4, ruleName: '取旺相' } }} target="父母" />)
    expect(screen.getByTestId('yong-head').textContent).toMatch(/两现按取旺相取4爻/)
  })
  it('analysis=null → 友好提示', () => {
    render(<YongshenPanel analysis={null} target="妻财" />)
    expect(screen.getByTestId('yongshen-panel').textContent).toMatch(/卦中无妻财/)
  })
  it('历法降级提示', () => {
    render(<YongshenPanel analysis={{ ...base, wangshuai: null, sources: [base.sources[3]] }} target="妻财" />)
    expect(screen.getByText(/时间信息暂不可用/)).toBeInTheDocument()
    expect(screen.getByTestId('yong-head').textContent).toMatch(/旺衰：—/)
  })
  it('受力图例解释泄/耗等词', () => {
    render(<YongshenPanel analysis={base} target="妻财" />)
    const legend = screen.getByTestId('force-legend').textContent ?? ''
    expect(legend).toMatch(/泄.*用神生源/)
    expect(legend).toMatch(/耗.*用神克源/)
  })
  it('点有爻位的作用源行（飞神 pos2）回调其爻位', async () => {
    const onSelectSource = vi.fn()
    render(<YongshenPanel analysis={base} target="妻财" onSelectSource={onSelectSource} />)
    const fly = screen.getAllByTestId('force-row').find((r) => r.textContent?.includes('飞神'))!
    await userEvent.click(fly)
    expect(onSelectSource).toHaveBeenCalledWith(2)
  })
  it('再点已选中的作用源行回调 null（取消）', async () => {
    const onSelectSource = vi.fn()
    render(<YongshenPanel analysis={base} target="妻财" selectedSourceAt={2} onSelectSource={onSelectSource} />)
    const fly = screen.getAllByTestId('force-row').find((r) => r.textContent?.includes('飞神'))!
    await userEvent.click(fly)
    expect(onSelectSource).toHaveBeenCalledWith(null)
  })
  it('月建/日辰行无爻位，不可点（不回调）', async () => {
    const onSelectSource = vi.fn()
    render(<YongshenPanel analysis={base} target="妻财" onSelectSource={onSelectSource} />)
    const month = screen.getAllByTestId('force-row').find((r) => r.textContent?.includes('月建'))!
    await userEvent.click(month)
    expect(onSelectSource).not.toHaveBeenCalled()
  })
})
