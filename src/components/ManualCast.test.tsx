import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ManualCast } from './ManualCast'

// 渲染顺序为 上→初，反转后 bottomUp[0]=初爻 … bottomUp[5]=上爻
const bottomUpRows = () => [...screen.getAllByTestId('manual-yao')].reverse()
const yangOf = (row: HTMLElement) => within(row).getAllByRole('button', { name: '阳' })

describe('ManualCast', () => {
  it('顺序解锁：初爻可填、上爻初始锁定；按序填满后成卦回传初→上 Hexagram', async () => {
    const onComplete = vi.fn()
    render(<ManualCast onComplete={onComplete} />)
    const make = screen.getByTestId('make-hexagram')
    expect(make).toBeDisabled()

    const rows = bottomUpRows()
    expect(yangOf(rows[0])[0]).toBeEnabled() // 初爻可填
    expect(yangOf(rows[5])[0]).toBeDisabled() // 上爻锁定

    // 自初爻而上逐爻点三枚阳
    for (const row of rows) {
      for (const b of yangOf(row)) await userEvent.click(b)
    }
    expect(make).toBeEnabled()
    await userEvent.click(make)
    const lines = onComplete.mock.calls[0][0]
    expect(lines).toHaveLength(6)
    expect(lines.every((l: { yinyang: string; moving: boolean }) => l.yinyang === 'yang' && l.moving)).toBe(true)
  })

  it('填满初爻后二爻解锁，并实时显示爻象（全阳→老阳）', async () => {
    render(<ManualCast onComplete={vi.fn()} />)
    const rows = bottomUpRows()
    expect(yangOf(rows[1])[0]).toBeDisabled() // 二爻初始锁定
    for (const b of yangOf(rows[0])) await userEvent.click(b) // 填满初爻三阳
    expect(yangOf(rows[1])[0]).toBeEnabled() // 二爻解锁
    expect(within(rows[0]).getByText('老阳')).toBeInTheDocument() // 初爻实时爻象
  })
})
