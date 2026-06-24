import { SHARE_PARAM } from '../domain/share-link'

export function buildShareUrl(encoded: string): string {
  return `${location.origin}${import.meta.env.BASE_URL}#${SHARE_PARAM}=${encoded}`
}

export function readShareParam(): string | null {
  const hash = location.hash.replace(/^#/, '')
  if (!hash) return null
  for (const part of hash.split('&')) {
    const [k, v] = part.split('=')
    if (k === SHARE_PARAM && v) return v
  }
  return null
}
