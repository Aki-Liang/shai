import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AiPromptBox } from './AiPromptBox'
import { Pan } from '../domain/pan'

const pan = {
  reading: { question: '问', primary: { data: { name: '乾为天' } }, changed: null },
  pillars: { year: '丙午', month: '甲午', day: '甲子', dayGan: '甲', xunKong: ['戌', '亥'] },
  palace: { trigram: '乾', element: '金', headLines: [] },
  lines: [{ position: 1, liushen: '青龙', liuqin: '父母', najia: { gan: '甲', zhi: '子', wuxing: '水' }, yinyang: 'yang', moving: false, shi: true, ying: false, kong: false }],
  changedLines: null,
} as unknown as Pan

describe('AiPromptBox', () => {
  it('点按钮展开 prompt 文本框含关键段', async () => {
    render(<AiPromptBox pan={pan} analysis={null} />)
    expect(screen.queryByTestId('ai-prompt-text')).not.toBeInTheDocument()
    await userEvent.click(screen.getByTestId('ai-prompt-btn'))
    const ta = screen.getByTestId('ai-prompt-text') as HTMLTextAreaElement
    expect(ta.value).toMatch(/【六爻起卦】/)
    expect(ta.value).toMatch(/请按六爻/)
  })
  it('一键复制调用 clipboard，显已复制', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    })
    render(<AiPromptBox pan={pan} analysis={null} />)
    await userEvent.click(screen.getByTestId('ai-prompt-btn'))
    await userEvent.click(screen.getByTestId('ai-prompt-copy'))
    expect(writeText).toHaveBeenCalled()
    expect(await screen.findByText('已复制')).toBeInTheDocument()
  })
  it('clipboard 失败 → execCommand 兜底成功仍显已复制', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      writable: true,
      configurable: true,
    })
    const exec = vi.fn().mockReturnValue(true)
    Object.defineProperty(document, 'execCommand', { value: exec, writable: true, configurable: true })
    render(<AiPromptBox pan={pan} analysis={null} />)
    await userEvent.click(screen.getByTestId('ai-prompt-btn'))
    await userEvent.click(screen.getByTestId('ai-prompt-copy'))
    expect(exec).toHaveBeenCalledWith('copy')
    expect(await screen.findByText('已复制')).toBeInTheDocument()
  })
})
