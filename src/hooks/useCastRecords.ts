import { useCallback, useState } from 'react'
import { CastRecord } from '../domain/cast-record'
import { loadRecords, addRecord, removeRecord, clearRecords } from '../storage/cast-record-store'

export function useCastRecords() {
  const [records, setRecords] = useState<CastRecord[]>(() => loadRecords())

  const add = useCallback((record: CastRecord) => {
    setRecords(addRecord(record))
  }, [])

  const remove = useCallback((id: string) => {
    setRecords(removeRecord(id))
  }, [])

  const clear = useCallback(() => {
    clearRecords()
    setRecords([])
  }, [])

  return { records, add, remove, clear }
}
