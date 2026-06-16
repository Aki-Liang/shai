import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Hexagram } from './Hexagram'
import { Hexagram as Hex } from '../domain/types'

const tai: Hex = [
  { yinyang: 'yang', moving: false },
  { yinyang: 'yang', moving: true },
  { yinyang: 'yang', moving: false },
  { yinyang: 'yin', moving: false },
  { yinyang: 'yin', moving: false },
  { yinyang: 'yin', moving: false },
]

describe('Hexagram', () => {
  it('渲染六爻', () => {
    render(<Hexagram lines={tai} shiYao={3} yingYao={6} />)
    expect(screen.getAllByTestId('yao')).toHaveLength(6)
  })
  it('动爻有 data-moving 标记', () => {
    render(<Hexagram lines={tai} shiYao={3} yingYao={6} />)
    const moving = screen.getAllByTestId('yao').filter((el) => el.getAttribute('data-moving') === 'true')
    expect(moving).toHaveLength(1)
  })
  it('显示世应标记', () => {
    render(<Hexagram lines={tai} shiYao={3} yingYao={6} />)
    expect(screen.getByText('世')).toBeInTheDocument()
    expect(screen.getByText('应')).toBeInTheDocument()
  })
})
