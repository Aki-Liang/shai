import { useCallback, useState } from 'react'
import { RandomSource, cryptoRandom } from '../domain/random'
import { Clock, systemClock } from '../domain/clock'
import { buildReading, CastReading } from '../domain/reading'
import { buildPan, Pan } from '../domain/pan'
import { interpret, Interpretation } from '../domain/interpret'

type Phase = 'input' | 'casting' | 'result'

export function useCasting(rng: RandomSource = cryptoRandom, clock: Clock = systemClock) {
  const [phase, setPhase] = useState<Phase>('input')
  const [question, setQuestion] = useState('')
  const [reading, setReading] = useState<CastReading | null>(null)
  const [pan, setPan] = useState<Pan | null>(null)
  const [interpretation, setInterpretation] = useState<Interpretation | null>(null)

  const submit = useCallback((q: string) => {
    setQuestion(q)
    setPhase('casting')
  }, [])

  const finishCasting = useCallback(async () => {
    const r = buildReading(question, rng)
    setReading(r)
    setPan(buildPan(r, clock.now()))
    setInterpretation(await interpret(r))
    setPhase('result')
  }, [question, rng, clock])

  const reset = useCallback(() => {
    setReading(null)
    setPan(null)
    setInterpretation(null)
    setQuestion('')
    setPhase('input')
  }, [])

  return { phase, reading, pan, interpretation, submit, finishCasting, reset }
}
