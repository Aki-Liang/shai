import { useCallback, useState } from 'react'
import { RandomSource, cryptoRandom } from '../domain/random'
import { Clock, systemClock } from '../domain/clock'
import { buildReading, buildReadingFromHexagram, CastReading } from '../domain/reading'
import { buildPan, Pan } from '../domain/pan'
import { interpret, Interpretation } from '../domain/interpret'
import { CastMode, Hexagram } from '../domain/types'

type Phase = 'input' | 'casting' | 'manual' | 'result'

export function useCasting(rng: RandomSource = cryptoRandom, clock: Clock = systemClock) {
  const [phase, setPhase] = useState<Phase>('input')
  const [question, setQuestion] = useState('')
  const [reading, setReading] = useState<CastReading | null>(null)
  const [pan, setPan] = useState<Pan | null>(null)
  const [interpretation, setInterpretation] = useState<Interpretation | null>(null)

  const submit = useCallback((q: string, mode: CastMode = 'cyber') => {
    setQuestion(q)
    setPhase(mode === 'manual' ? 'manual' : 'casting')
  }, [])

  const finishCasting = useCallback(async () => {
    const r = buildReading(question, rng)
    setReading(r)
    setPan(buildPan(r, clock.now()))
    setInterpretation(await interpret(r))
    setPhase('result')
  }, [question, rng, clock])

  const finishManual = useCallback(async (primaryLines: Hexagram) => {
    const r = buildReadingFromHexagram(question, primaryLines)
    setReading(r)
    setPan(buildPan(r, clock.now()))
    setInterpretation(await interpret(r))
    setPhase('result')
  }, [question, clock])

  const reset = useCallback(() => {
    setReading(null)
    setPan(null)
    setInterpretation(null)
    setQuestion('')
    setPhase('input')
  }, [])

  return { phase, reading, pan, interpretation, submit, finishCasting, finishManual, reset }
}
