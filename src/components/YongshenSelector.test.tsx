import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { YongshenSelector } from './YongshenSelector'

describe('YongshenSelector', () => {
  it('渲染 5 六亲 + 世爻共 6 个 chip', () => {
    render(<YongshenSelector selected={null} onSelect={vi.fn()} />)
    for (const t of ['父母', '兄弟', '子孙', '妻财', '官鬼', '世']) {
      expect(screen.getByTestId(`yongshen-${t}`)).toBeInTheDocument()
    }
  })
  it('点世爻回调 "世"', async () => {
    const onSelect = vi.fn()
    render(<YongshenSelector selected={null} onSelect={onSelect} />)
    await userEvent.click(screen.getByTestId('yongshen-世'))
    expect(onSelect).toHaveBeenCalledWith('世')
  })
  it('再点已选项取消（回调 null）', async () => {
    const onSelect = vi.fn()
    render(<YongshenSelector selected="妻财" onSelect={onSelect} />)
    await userEvent.click(screen.getByTestId('yongshen-妻财'))
    expect(onSelect).toHaveBeenCalledWith(null)
  })
})
