import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { sequenceRandom } from './domain/random'

describe('App 全流程（确定性）', () => {
  it('输入→摇卦(跳过)→出卦：全背六掷得乾为天，显示初九爻辞', async () => {
    render(<App rng={sequenceRandom([1, 1, 1])} />) // 全背=老阳 → 乾为天，六动爻
    await userEvent.type(screen.getByRole('textbox'), '我该换工作吗？')
    await userEvent.click(screen.getByRole('button', { name: '诚心摇卦' }))
    await userEvent.click(screen.getByRole('button', { name: /跳过/ }))
    // 乾为天 初九爻辞「潜龙勿用」只出现在 ResultView（ShareCard 不渲染爻辞），唯一可断言
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
