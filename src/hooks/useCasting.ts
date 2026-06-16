import { useCallback, useState } from 'react'
import { RandomSource, cryptoRandom } from '../domain/random'
import { buildReading, CastReading } from '../domain/reading'
import { interpret, Interpretation } from '../domain/interpret'

type Phase = 'input' | 'casting' | 'result'

export function useCasting(rng: RandomSource = cryptoRandom) {
  const [phase, setPhase] = useState<Phase>('input')
  const [question, setQuestion] = useState('')
  const [reading, setReading] = useState<CastReading | null>(null)
  const [interpretation, setInterpretation] = useState<Interpretation | null>(null)

  const submit = useCallback((q: string) => {
    setQuestion(q)
    setPhase('casting')
  }, [])

  const finishCasting = useCallback(async () => {
    const r = buildReading(question, rng)
    setReading(r)
    setInterpretation(await interpret(r))
    setPhase('result')
  }, [question, rng])

  const reset = useCallback(() => {
    setReading(null)
    setInterpretation(null)
    setQuestion('')
    setPhase('input')
  }, [])

  return { phase, reading, interpretation, submit, finishCasting, reset }
}
