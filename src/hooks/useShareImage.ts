import { useCallback } from 'react'
import { domToPng } from 'modern-screenshot'

export function useShareImage() {
  const capture = useCallback(async (node: HTMLElement): Promise<string> => {
    // 截图前确保衬线字体就绪，避免回退字体
    if (document.fonts?.ready) await document.fonts.ready
    const dataUrl = await domToPng(node, { scale: 3 })

    // 优先原生分享（移动端）
    try {
      if (navigator.share && navigator.canShare) {
        const blob = await (await fetch(dataUrl)).blob()
        const file = new File([blob], 'liuyao.png', { type: 'image/png' })
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: '六爻占' })
        }
      }
    } catch {
      // 用户取消或不支持，回退到 dataUrl 由调用方提供下载
    }
    return dataUrl
  }, [])

  return { capture }
}
