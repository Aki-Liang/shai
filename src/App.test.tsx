import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { sequenceRandom } from './domain/random'
import { encodeShareLink } from './domain/share-link'
import * as clip from './lib/clipboard'

afterEach(() => { window.location.hash = ''; vi.restoreAllMocks() })

describe('App 全流程（确定性）', () => {
  it('输入→摇卦(跳过)→出卦：全背六掷得乾为天，显示初九爻辞', async () => {
    render(<App rng={sequenceRandom([1, 1, 1])} />) // 全背=老阳 → 乾为天，六动爻
    await userEvent.type(screen.getByRole('textbox'), '我该换工作吗？')
    await userEvent.click(screen.getByRole('button', { name: '诚心摇卦' }))
    await userEvent.click(screen.getByRole('button', { name: /跳过/ }))
    // 乾为天 初九爻辞「潜龙勿用」只出现在 ResultView（爻辞仅在 ResultView 出现），唯一可断言
    expect(await screen.findByText(/潜龙勿用/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /分享/ })).toBeInTheDocument()
  })

  it('起卦后回首页→进历史→见记录→重开→出结果（返回记录按钮）', async () => {
    render(<App rng={sequenceRandom([1, 1, 1])} />)
    await userEvent.type(screen.getByRole('textbox'), '我该换工作吗？')
    await userEvent.click(screen.getByRole('button', { name: '诚心摇卦' }))
    await userEvent.click(screen.getByRole('button', { name: /跳过/ }))
    await screen.findByText(/潜龙勿用/)
    // 回首页
    await userEvent.click(screen.getByRole('button', { name: /再 占 一 卦/ }))
    // 进历史
    await userEvent.click(screen.getByTestId('open-history'))
    expect(screen.getByTestId('history-view')).toBeInTheDocument()
    expect(screen.getByText('我该换工作吗？')).toBeInTheDocument()
    // 重开记录
    await userEvent.click(screen.getByTestId('history-item'))
    expect(await screen.findByText(/潜龙勿用/)).toBeInTheDocument()
    // 来自历史 → 底部为「返回记录」
    expect(screen.getByRole('button', { name: /返 回 记 录/ })).toBeInTheDocument()
  })
})

describe('App 分享链接', () => {
  const allYang = Array.from({ length: 6 }, () => ({ yinyang: 'yang' as const, moving: false }))

  it('打开分享链接 → 重建结果页，底部「去占一卦」', async () => {
    const enc = encodeShareLink({ question: '分享的问题', lines: allYang as never, createdAt: new Date('2026-06-16T12:00:00').getTime() })
    window.location.hash = '#s=' + enc
    render(<App />)
    expect(await screen.findByText(/分享的问题/)).toBeInTheDocument()
    expect(await screen.findByText(/卦辞/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /去 占 一 卦/ })).toBeInTheDocument()
  })

  it('起卦后点「复制分享链接」→ copyText 收到含 #s= 的 URL，toast 链接已复制', async () => {
    const spy = vi.spyOn(clip, 'copyText').mockResolvedValue(true)
    render(<App rng={sequenceRandom([1, 1, 1])} />)
    await userEvent.type(screen.getByRole('textbox'), '复制测试')
    await userEvent.click(screen.getByRole('button', { name: '诚心摇卦' }))
    await userEvent.click(screen.getByRole('button', { name: /跳过/ }))
    await screen.findByText(/潜龙勿用/)
    await userEvent.click(screen.getByTestId('share-link-btn'))
    expect(spy).toHaveBeenCalled()
    expect(spy.mock.calls[0][0]).toContain('#s=')
    expect(await screen.findByText('链接已复制')).toBeInTheDocument()
  })
})
