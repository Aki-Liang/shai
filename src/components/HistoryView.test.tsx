import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HistoryView } from './HistoryView'
import { CastRecord } from '../domain/cast-record'

const rec = (id: string, question: string): CastRecord => ({
  id, createdAt: new Date('2026-06-16T12:34:00').getTime(), question, mode: 'cyber',
  lines: Array.from({ length: 6 }, () => ({ yinyang: 'yang' as const, moving: false })),
})

afterEach(() => vi.restoreAllMocks())

describe('HistoryView', () => {
  it('空列表显示空态', () => {
    render(<HistoryView records={[]} onOpen={vi.fn()} onDelete={vi.fn()} onClear={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByTestId('history-empty')).toBeInTheDocument()
  })
  it('渲染记录：问题、本卦名、时间', () => {
    render(<HistoryView records={[rec('a', '我该换工作吗？')]} onOpen={vi.fn()} onDelete={vi.fn()} onClear={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByText('我该换工作吗？')).toBeInTheDocument()
    expect(screen.getByText(/乾为天/)).toBeInTheDocument()
    expect(screen.getByText(/2026\.06\.16 12:34/)).toBeInTheDocument()
  })
  it('点条目触发 onOpen', async () => {
    const onOpen = vi.fn()
    render(<HistoryView records={[rec('a', '问')]} onOpen={onOpen} onDelete={vi.fn()} onClear={vi.fn()} onBack={vi.fn()} />)
    await userEvent.click(screen.getByTestId('history-item'))
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }))
  })
  it('删除（确认）触发 onDelete；取消则不触发', async () => {
    const onDelete = vi.fn()
    render(<HistoryView records={[rec('a', '问')]} onOpen={vi.fn()} onDelete={onDelete} onClear={vi.fn()} onBack={vi.fn()} />)
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    await userEvent.click(screen.getByTestId('history-delete'))
    expect(onDelete).not.toHaveBeenCalled()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await userEvent.click(screen.getByTestId('history-delete'))
    expect(onDelete).toHaveBeenCalledWith('a')
  })
  it('清空（确认）触发 onClear；返回触发 onBack', async () => {
    const onClear = vi.fn(); const onBack = vi.fn()
    render(<HistoryView records={[rec('a', '问')]} onOpen={vi.fn()} onDelete={vi.fn()} onClear={onClear} onBack={onBack} />)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await userEvent.click(screen.getByTestId('history-clear'))
    expect(onClear).toHaveBeenCalled()
    await userEvent.click(screen.getByTestId('history-back'))
    expect(onBack).toHaveBeenCalled()
  })
})
