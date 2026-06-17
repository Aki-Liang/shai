import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuestionInput } from './QuestionInput'

describe('QuestionInput', () => {
  it('默认赛博：提交带 cyber', async () => {
    const onSubmit = vi.fn()
    render(<QuestionInput onSubmit={onSubmit} />)
    await userEvent.type(screen.getByRole('textbox'), '我该换工作吗？')
    await userEvent.click(screen.getByRole('button', { name: '诚心摇卦' }))
    expect(onSubmit).toHaveBeenCalledWith('我该换工作吗？', 'cyber')
  })
  it('选手动：CTA 变手动起卦，提交带 manual', async () => {
    const onSubmit = vi.fn()
    render(<QuestionInput onSubmit={onSubmit} />)
    await userEvent.type(screen.getByRole('textbox'), '问')
    await userEvent.click(screen.getByTestId('mode-manual'))
    await userEvent.click(screen.getByRole('button', { name: '手动起卦' }))
    expect(onSubmit).toHaveBeenCalledWith('问', 'manual')
  })
  it('? 折叠模式说明', async () => {
    render(<QuestionInput onSubmit={vi.fn()} />)
    expect(screen.queryByText(/密码学随机/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '?' }))
    expect(screen.getByText(/密码学随机/)).toBeInTheDocument()
  })
})
