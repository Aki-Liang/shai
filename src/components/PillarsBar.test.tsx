import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PillarsBar } from './PillarsBar'
import { GanZhiPillars } from '../domain/ganzhi'

const pillars: GanZhiPillars = {
  year: '丙午', month: '甲午', day: '甲子', dayGan: '甲', xunKong: ['戌', '亥'],
}

describe('PillarsBar', () => {
  it('显示三柱与旬空', () => {
    render(<PillarsBar pillars={pillars} />)
    expect(screen.getByText(/丙午年/)).toBeInTheDocument()
    expect(screen.getByText(/甲午月/)).toBeInTheDocument()
    expect(screen.getByText(/甲子日/)).toBeInTheDocument()
    expect(screen.getByText(/旬空 戌亥/)).toBeInTheDocument()
  })
})
