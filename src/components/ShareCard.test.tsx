import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ShareCard } from './ShareCard'
import { Interpretation } from '../domain/interpret'
import { Hexagram as Hex } from '../domain/types'

const lines: Hex = Array.from({ length: 6 }, () => ({ yinyang: 'yang', moving: false })) as Hex
const interp: Interpretation = {
  question: '我该换工作吗？',
  primaryName: '乾为天',
  changedName: null,
  judgment: '乾：元，亨，利，贞。',
  movingLineTexts: [],
}

describe('ShareCard', () => {
  it('含所问之事与卦名', () => {
    render(<ShareCard interpretation={interp} lines={lines} shiYao={6} yingYao={3} dateText="2026.06.16" />)
    expect(screen.getByText('我该换工作吗？')).toBeInTheDocument()
    expect(screen.getByText(/乾为天/)).toBeInTheDocument()
  })
  it('含站点水印', () => {
    render(<ShareCard interpretation={interp} lines={lines} shiYao={6} yingYao={3} dateText="2026.06.16" />)
    expect(screen.getByText(/六爻占/)).toBeInTheDocument()
  })
})
