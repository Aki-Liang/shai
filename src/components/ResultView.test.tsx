import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ResultView } from './ResultView'
import { CastReading } from '../domain/reading'
import { Interpretation } from '../domain/interpret'
import { Hexagram as Hex } from '../domain/types'

const lines: Hex = Array.from({ length: 6 }, () => ({ yinyang: 'yang', moving: true })) as Hex
const reading = {
  question: '问',
  primary: { lines, data: { name: '乾为天', shiYao: 6, yingYao: 3 } },
  changed: { lines, data: { name: '坤为地', shiYao: 6, yingYao: 3 } },
  movingIndexes: [0, 1, 2, 3, 4, 5],
} as unknown as CastReading
const interp: Interpretation = {
  question: '问', primaryName: '乾为天', changedName: '坤为地',
  judgment: '乾：元，亨，利，贞。',
  movingLineTexts: [{ index: 0, text: '初九：潜龙勿用。' }],
}

describe('ResultView', () => {
  it('显示卦名、卦辞、动爻爻辞', () => {
    render(<ResultView reading={reading} interpretation={interp} onShare={vi.fn()} />)
    expect(screen.getByText(/乾为天/)).toBeInTheDocument()
    expect(screen.getByText(/元，亨，利，贞/)).toBeInTheDocument()
    expect(screen.getByText(/潜龙勿用/)).toBeInTheDocument()
  })
  it('有变卦时显示变卦名', () => {
    render(<ResultView reading={reading} interpretation={interp} onShare={vi.fn()} />)
    expect(screen.getByText(/坤为地/)).toBeInTheDocument()
  })
})
