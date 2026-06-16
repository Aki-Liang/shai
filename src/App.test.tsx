import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('App 全流程', () => {
  it('输入→摇卦(跳过)→出卦', async () => {
    render(<App />)
    await userEvent.type(screen.getByRole('textbox'), '我该换工作吗？')
    await userEvent.click(screen.getByRole('button', { name: /摇卦/ }))
    await userEvent.click(screen.getByRole('button', { name: /跳过/ }))
    expect(await screen.findByRole('button', { name: /分享/ })).toBeInTheDocument()
  })
})
