import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuestionInput } from './QuestionInput'

describe('QuestionInput', () => {
  it('空输入时摇卦按钮禁用', () => {
    render(<QuestionInput onSubmit={vi.fn()} />)
    expect(screen.getByRole('button', { name: /摇卦/ })).toBeDisabled()
  })

  it('输入后启用，点击回传问题', async () => {
    const onSubmit = vi.fn()
    render(<QuestionInput onSubmit={onSubmit} />)
    await userEvent.type(screen.getByRole('textbox'), '我该换工作吗？')
    const btn = screen.getByRole('button', { name: /摇卦/ })
    expect(btn).toBeEnabled()
    await userEvent.click(btn)
    expect(onSubmit).toHaveBeenCalledWith('我该换工作吗？')
  })

  it('纯空白视为未填', async () => {
    render(<QuestionInput onSubmit={vi.fn()} />)
    await userEvent.type(screen.getByRole('textbox'), '   ')
    expect(screen.getByRole('button', { name: /摇卦/ })).toBeDisabled()
  })
})
