import { DiZhi, zhiWuxing } from './wuxing'
import { wangShuaiOf } from './wangshuai'

/** 旺衰缘由：X 侧 {地支}{五行}，月侧 {月支}{五行} */
export function wangshuaiReasonOf(zhi: DiZhi, monthZhi: DiZhi): string {
  const w = zhiWuxing(zhi)
  const m = zhiWuxing(monthZhi)
  const X = `${zhi}${w}`
  const M = `${monthZhi}${m}`
  const ws = wangShuaiOf(w, monthZhi)
  if (ws === '旺') return '当令'
  if (ws === '相') return `${M}生${X}`
  if (ws === '休') return `${X}生${M}泄气`
  if (ws === '囚') return `${X}克${M}受制`
  return `${M}克${X}` // 死
}
