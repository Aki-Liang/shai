import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { YongshenSelector } from './YongshenSelector'

describe('YongshenSelector', () => {
  it('点选某六亲回调该值；再次点选取消（null）', async () => {
    const onSelect = vi.fn()
    const { rerender } = render(<YongshenSelector selected={null} onSelect={onSelect} />)
    await userEvent.click(screen.getByTestId('yongshen-官鬼'))
    expect(onSelect).toHaveBeenLastCalledWith('官鬼')
    rerender(<YongshenSelector selected="官鬼" onSelect={onSelect} />)
    await userEvent.click(screen.getByTestId('yongshen-官鬼'))
    expect(onSelect).toHaveBeenLastCalledWith(null)
  })
  it('点 ? 展开口诀提示', async () => {
    render(<YongshenSelector selected={null} onSelect={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: '?' }))
    expect(screen.getByText(/功名事业/)).toBeInTheDocument()
  })
})
