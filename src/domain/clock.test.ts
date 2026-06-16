import { describe, it, expect } from 'vitest'
import { fixedClock, systemClock } from './clock'

describe('clock', () => {
  it('fixedClock 总返回同一时刻', () => {
    const d = new Date('2026-06-16T12:00:00')
    expect(fixedClock(d).now().getTime()).toBe(d.getTime())
  })
  it('systemClock 返回 Date', () => {
    expect(systemClock.now()).toBeInstanceOf(Date)
  })
})
