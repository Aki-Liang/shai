import { Yinyang } from './types'

/** 六爻（自下而上）→ 6 位二进制键，阳=1 阴=0 */
export function hexagramKey(lines: readonly { yinyang: Yinyang }[]): string {
  if (lines.length !== 6) throw new Error('必须为六爻')
  return lines.map((l) => (l.yinyang === 'yang' ? '1' : '0')).join('')
}
