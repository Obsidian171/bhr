export interface ImportedPost {
  url: string
  title: string
  excerpt: string
  body: string
  cover_url: string | null
}

const PRIVATE_HOSTS = [
  'localhost',
  '127.',
  '0.0.0.0',
  '10.',
  '192.168.',
  '169.254.',
  '::1',
  'fc00:',
  'fd00:',
]

function looksPrivate(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (h === 'localhost') return true
  if (/^127\./.test(h)) return true
  if (/^10\./.test(h)) return true
  if (/^192\.168\./.test(h)) return true
  if (/^169\.254\./.test(h)) return true
  if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(h)) return true
  if (h === '::1') return true
  if (/^f[cd][0-9a-f]{2}:/i.test(h)) return true
  return PRIVATE_HOSTS.some((p) => h.startsWith(p))
}

export function normalizeShareUrl(input: string): string {
  const trimmed = (input ?? '').trim()
  if (!trimmed) throw new Error('Вставь ссылку.')

  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  let url: URL
  try {
    url = new URL(withProto)
  } catch {
    throw new Error('Ссылка выглядит некорректно.')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Поддерживаются только http и https.')
  }
  if (looksPrivate(url.hostname)) {
    throw new Error('Приватные адреса не поддерживаются.')
  }
  return url.toString()
}

function fetchWithTimeout(url: string, ms: number, headers?: HeadersInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return fetch(url, { signal: controller.signal, headers }).finally(() => clearTimeout(timer))
}

function clampTitle(value: string, max = 180): string {
  const clean = value.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return clean.slice(0, max).replace(/\s+\S*$/, '') + '…'
}

function clampExcerpt(value: string, max = 220): string {
  const clean = value.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return clean.slice(0, max).replace(/\s+\S*$/, '') + '…'
}

function safeResolve(maybe: string, base: string): string | null {
  const raw = (maybe ?? '').trim()
  if (!raw) return null
  if (/^https?:\/\//i.test(raw)) return raw
  if (raw.startsWith('//')) {
    try {
      return new URL(base).protocol + raw
    } catch {
      return null
    }
  }
  try {
    return new URL(raw, base).toString()
  } catch {
    return null
  }
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
}

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
}

async function fetchViaJina(url: string): Promise<ImportedPost | null> {
  try {
    const res = await fetchWithTimeout(
      `https://r.jina.ai/${encodeURIComponent(url)}`,
      20000,
      { Accept: 'text/plain' },
    )
    if (!res.ok) return null
    const text = await res.text()
    if (!text.trim()) return null

    const titleMatch = text.match(/^Title:\s*(.+)$/im)
    const imageMatch = text.match(/^(?:Image|OG Image|Screenshot URL):\s*(.+)$/im)
    const contentMatch = text.match(/Markdown Content:?\s*\n([\s\S]*)/i)

    const title = (titleMatch?.[1] ?? '').trim()
    const rawContent = (contentMatch?.[1] ?? text).trim()
    const content = stripMarkdown(rawContent)

    if (!title && !content) return null

    const paragraphs = splitParagraphs(content)
    const firstP = paragraphs.find((p) => p.length > 60) ?? paragraphs[0] ?? ''
    const body = paragraphs.join('\n\n').replace(/\n{3,}/g, '\n\n').trim()

    const image = (imageMatch?.[1] ?? '').trim()

    return {
      url,
      title: clampTitle(title),
      excerpt: clampExcerpt(firstP),
      body,
      cover_url: image ? safeResolve(image, url) : null,
    }
  } catch {
    return null
  }
}

interface ProxyDef {
  build: (url: string) => string
  json?: boolean
}

const PROXIES: ProxyDef[] = [
  { build: (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` },
  { build: (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, json: true },
  { build: (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}` },
  { build: (url) => `https://api.cors.lol/?url=${encodeURIComponent(url)}` },
]

async function fetchViaProxy(url: string): Promise<string> {
  let lastError = 'Не удалось получить содержимое страницы.'
  for (const proxy of PROXIES) {
    try {
      const res = await fetchWithTimeout(proxy.build(url), 15000)
      if (!res.ok) {
        lastError = 'Страница недоступна через прокси.'
        continue
      }
      const raw = await res.text()
      const text = proxy.json
        ? (() => {
            try {
              return (JSON.parse(raw) as { contents?: string }).contents ?? ''
            } catch {
              return ''
            }
          })()
        : raw
      if (text.trim()) return text
      lastError = 'Прокси вернул пустой ответ.'
    } catch {
      /* пробуем следующий */
    }
  }
  throw new Error(lastError)
}

function extractParagraphs(doc: Document): string[] {
  doc.querySelectorAll('script, style, nav, header, footer, aside, form, iframe').forEach((el) => el.remove())

  const paragraphs: string[] = []
  const pEls = doc.querySelectorAll('p, article, div[class*="content"], div[class*="article"]')
  for (const el of pEls) {
    const text = el.textContent?.replace(/\s+/g, ' ').trim()
    if (text && text.length > 80) paragraphs.push(text)
    if (paragraphs.length >= 12) break
  }
  return paragraphs
}

export function parseOgMeta(html: string, base: string): ImportedPost {
  const limited = html.length > 3_000_000 ? html.slice(0, 3_000_000) : html
  const doc = new DOMParser().parseFromString(limited, 'text/html')

  const meta = (prop: string) =>
    doc.querySelector(`meta[property="${prop}"]`)?.getAttribute('content') ??
    doc.querySelector(`meta[name="${prop}"]`)?.getAttribute('content') ??
    ''

  const title = (meta('og:title') || doc.querySelector('title')?.textContent || '')
    .replace(/\s+/g, ' ')
    .trim()
  const description = meta('og:description') || meta('description')

  const paragraphs = extractParagraphs(doc)
  const body = paragraphs.length > 0
    ? paragraphs.join('\n\n')
    : description.replace(/\n{3,}/g, '\n\n').trim()

  const image =
    meta('og:image') ||
    meta('twitter:image') ||
    doc.querySelector('article img')?.getAttribute('src') ||
    ''

  return {
    url: base,
    title: clampTitle(title),
    excerpt: clampExcerpt(description || body),
    body,
    cover_url: image ? safeResolve(image, base) : null,
  }
}

async function fetchEdge(url: string): Promise<ImportedPost | null> {
  const base = import.meta.env.VITE_SUPABASE_URL
  if (!base) return null
  try {
    const res = await fetchWithTimeout(
      `${base}/functions/v1/parse-post?url=${encodeURIComponent(url)}`,
      20000,
    )
    if (!res.ok) return null
    const data = (await res.json()) as {
      title?: string
      description?: string
      excerpt?: string
      image?: string
      error?: string
    }
    if (data.error) return null

    const body = (data.description ?? '').replace(/\n{3,}/g, '\n\n').trim()
    const image = (data.image ?? '').trim()

    return {
      url,
      title: clampTitle(data.title ?? ''),
      excerpt: clampExcerpt(data.excerpt ?? body),
      body,
      cover_url: image ? safeResolve(image, url) : null,
    }
  } catch {
    return null
  }
}

export async function importFromLink(input: string): Promise<ImportedPost> {
  const url = normalizeShareUrl(input)

  const viaJina = await fetchViaJina(url)
  if (viaJina && (viaJina.title || viaJina.body)) return viaJina

  const viaEdge = await fetchEdge(url).catch(() => null)
  if (viaEdge && viaEdge.title) return viaEdge

  const html = await fetchViaProxy(url)
  return parseOgMeta(html, url)
}