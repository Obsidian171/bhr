/** Абсолютные ссылки для «Поделиться»: путь склеивается с origin текущей вкладки. */

export function absoluteUrl(path: string): string {
  return `${window.location.origin}${path}`
}
