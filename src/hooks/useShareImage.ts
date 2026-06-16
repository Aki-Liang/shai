import { useCallback } from 'react'
import { domToPng } from 'modern-screenshot'

export interface CaptureResult {
  dataUrl: string
  shared: boolean // 是否已通过原生分享面板分享（true 则调用方不必再触发下载）
}

export function useShareImage() {
  const capture = useCallback(async (node: HTMLElement): Promise<CaptureResult> => {
    // 截图前确保衬线字体就绪，避免回退字体。domToPng 若失败将向上抛出，由调用方兜底。
    if (document.fonts?.ready) await document.fonts.ready
    const dataUrl = await domToPng(node, { scale: 3 })

    let shared = false
    try {
      if (navigator.share && navigator.canShare) {
        const blob = await (await fetch(dataUrl)).blob()
        const file = new File([blob], 'liuyao.png', { type: 'image/png' })
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: '六爻占' })
          shared = true
        }
      }
    } catch {
      // 用户取消或原生分享不可用，回退由调用方下载
      shared = false
    }
    return { dataUrl, shared }
  }, [])

  return { capture }
}
