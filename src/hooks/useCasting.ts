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
type Origin = 'cast' | 'history' | 'shared'

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
  const [record, setRecord] = useState<CastRecord | null>(null)

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
    const rec: CastRecord = { id: newId(), createdAt: now.getTime(), question, mode: 'cyber', lines: r.primary.lines }
    setRecord(rec)
    onCast?.(rec)
    setPhase('result')
  }, [question, rng, clock, onCast])

  const finishManual = useCallback(async (primaryLines: Hexagram) => {
    const now = clock.now()
    const r = buildReadingFromHexagram(question, primaryLines)
    setReading(r)
    setPan(buildPan(r, now))
    setInterpretation(await interpret(r))
    const rec: CastRecord = { id: newId(), createdAt: now.getTime(), question, mode: 'manual', lines: r.primary.lines }
    setRecord(rec)
    onCast?.(rec)
    setPhase('result')
  }, [question, clock, onCast])

  const openHistory = useCallback(() => setPhase('history'), [])

  const openRecord = useCallback(async (rec: CastRecord) => {
    const rebuilt = await reconstruct(rec)
    setQuestion(rec.question)
    setReading(rebuilt.reading)
    setPan(rebuilt.pan)
    setInterpretation(rebuilt.interpretation)
    setRecord(rec)
    setOrigin('history')
    setPhase('result')
  }, [])

  const openShared = useCallback(async (rec: CastRecord) => {
    const rebuilt = await reconstruct(rec)
    setQuestion(rec.question)
    setReading(rebuilt.reading)
    setPan(rebuilt.pan)
    setInterpretation(rebuilt.interpretation)
    setRecord(rec)
    setOrigin('shared')
    setPhase('result')
  }, [])

  const reset = useCallback(() => {
    setReading(null)
    setPan(null)
    setInterpretation(null)
    setRecord(null)
    setQuestion('')
    setOrigin('cast')
    setPhase('input')
  }, [])

  return {
    phase, origin, reading, pan, interpretation, record,
    submit, finishCasting, finishManual, openHistory, openRecord, openShared, reset,
  }
}
