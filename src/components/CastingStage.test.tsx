import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CastingStage } from './CastingStage'

describe('CastingStage', () => {
  it('点击「跳过」立即完成并回调一次', async () => {
    const onComplete = vi.fn()
    render(<CastingStage onComplete={onComplete} />)
    await userEvent.click(screen.getByRole('button', { name: /跳过/ }))
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('显示进度「第 N / 6 爻」', () => {
    render(<CastingStage onComplete={vi.fn()} />)
    expect(screen.getByText(/\/ 6 爻/)).toBeInTheDocument()
  })
})
