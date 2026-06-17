import { DiZhi, zhiWuxing, generates, controls } from './wuxing'
import { chong, he } from './chonghe'

export type Force = '得生' | '受克' | '泄' | '耗' | '比和'
export interface YongForce {
  force: Force
  chong: boolean
  he: boolean
}

/** 源地支对用神地支的受力（站在用神视角）+ 地支冲/合 */
export function forceOf(source: DiZhi, yong: DiZhi): YongForce {
  const s = zhiWuxing(source)
  const y = zhiWuxing(yong)
  let force: Force
  if (s === y) force = '比和'
  else if (generates(s, y)) force = '得生' // 源生用神
  else if (controls(s, y)) force = '受克' // 源克用神
  else if (generates(y, s)) force = '泄' // 用神生源
  else force = '耗' // 用神克源（controls(y, s)）
  return { force, chong: chong(source, yong), he: he(source, yong) }
}
