import { PanLine } from './pan'
import { LiuQin } from './liuqin'

/**
 * 用神定位结果：
 * - visible：所选六亲上卦，positions 为诸现爻位（多现暂不挑选，待旺衰那期按规则取一）
 * - hidden：所选六亲不上卦，取其伏神，position 为伏神所挂的本卦爻位
 * - none：理论不发生（伏神必含全五类六亲），兜底
 */
export type YongshenLocation =
  | { kind: 'visible'; positions: number[] }
  | { kind: 'hidden'; position: number }
  | { kind: 'none' }

/** 在本卦中定位用神：先看是否上卦，否则取伏神 */
export function locateYongshen(lines: PanLine[], liuqin: LiuQin): YongshenLocation {
  const positions = lines.filter((l) => l.liuqin === liuqin).map((l) => l.position)
  if (positions.length > 0) return { kind: 'visible', positions }
  const fuLine = lines.find((l) => l.fushen?.liuqin === liuqin)
  if (fuLine) return { kind: 'hidden', position: fuLine.position }
  return { kind: 'none' }
}
