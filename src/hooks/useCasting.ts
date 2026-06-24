import { useCallback, useState } from 'react'
import { RandomSource, cryptoRandom } from '../domain/random'
import { Clock, systemClock } from '../domain/clock'
import { buildReading, buildReadingFromHexagram, CastReading } from '../domain/reading'
import { buildPan, Pan } from '../domain/pan'
import { interpret, Interpretation } from '../domain/interpret'
import { CastMode, Hexagram } from '../domain/types'
import { CastRecord, reconstruct } from '../domain/cast-record'
import { newId } from '../storage/cast-record-store'

type Phase = 'input' | 'casting' | 'manual' | 'result' | 'history'
type Origin = 'cast' | 'history'

export function useCasting(
  rng: RandomSource = cryptoRandom,
  clock: Clock = systemClock,
  onCast?: (record: CastRecord) => void,
) {
  const [phase, setPhase] = useState<Phase>('input')
  const [origin, setOrigin] = useState<Origin>('cast')
  const [question, setQuestion] = useState('')
  const [reading, setReading] = useState<CastReading | null>(null)
  const [pan, setPan] = useState<Pan | null>(null)
  const [interpretation, setInterpretation] = useState<Interpretation | null>(null)

  const submit = useCallback((q: string, mode: CastMode = 'cyber') => {
    setQuestion(q)
    setOrigin('cast')
    setPhase(mode === 'manual' ? 'manual' : 'casting')
  }, [])

  const finishCasting = useCallback(async () => {
    const now = clock.now()
    const r = buildReading(question, rng)
    setReading(r)
    setPan(buildPan(r, now))
    setInterpretation(await interpret(r))
    onCast?.({ id: newId(), createdAt: now.getTime(), question, mode: 'cyber', lines: r.primary.lines })
    setPhase('result')
  }, [question, rng, clock, onCast])

  const finishManual = useCallback(async (primaryLines: Hexagram) => {
    const now = clock.now()
    const r = buildReadingFromHexagram(question, primaryLines)
    setReading(r)
    setPan(buildPan(r, now))
    setInterpretation(await interpret(r))
    onCast?.({ id: newId(), createdAt: now.getTime(), question, mode: 'manual', lines: r.primary.lines })
    setPhase('result')
  }, [question, clock, onCast])

  const openHistory = useCallback(() => setPhase('history'), [])

  const openRecord = useCallback(async (record: CastRecord) => {
    const rebuilt = await reconstruct(record)
    setQuestion(record.question)
    setReading(rebuilt.reading)
    setPan(rebuilt.pan)
    setInterpretation(rebuilt.interpretation)
    setOrigin('history')
    setPhase('result')
  }, [])

  const reset = useCallback(() => {
    setReading(null)
    setPan(null)
    setInterpretation(null)
    setQuestion('')
    setOrigin('cast')
    setPhase('input')
  }, [])

  return {
    phase, origin, reading, pan, interpretation,
    submit, finishCasting, finishManual, openHistory, openRecord, reset,
  }
}
