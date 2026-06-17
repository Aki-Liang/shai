import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ManualCast } from './ManualCast'

describe('ManualCast', () => {
  it('未填满成卦禁用；填满启用并回传初→上 Hexagram', async () => {
    const onComplete = vi.fn()
    render(<ManualCast onComplete={onComplete} />)
    const make = screen.getByTestId('make-hexagram')
    expect(make).toBeDisabled()
    const yang = screen.getAllByRole('button', { name: '阳' })
    expect(yang).toHaveLength(18)
    for (const b of yang) await userEvent.click(b)
    expect(make).toBeEnabled()
    await userEvent.click(make)
    const lines = onComplete.mock.calls[0][0]
    expect(lines).toHaveLength(6)
    expect(lines.every((l: { yinyang: string; moving: boolean }) => l.yinyang === 'yang' && l.moving)).toBe(true)
  })
  it('三钱齐显示爻象（全阳→老阳）', async () => {
    render(<ManualCast onComplete={vi.fn()} />)
    const yang = screen.getAllByRole('button', { name: '阳' })
    for (const b of yang.slice(0, 3)) await userEvent.click(b)
    expect(screen.getAllByText('老阳').length).toBeGreaterThan(0)
  })
})
