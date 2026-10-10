// Парсер записи по ссылке: тянет страницу сервером и отдаёт og-мету + текст как JSON.
// Деплой: supabase functions deploy parse-post --no-verify-jwt
// (или залей этот файл как Edge Function через Dashboard → Edge Functions).
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const HF_JSON: HeadersInit = {
  'content-type': 'application/json',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': '*',
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/g, ' ')
}

function readMeta(html: string): Record<string, string> {
  const out: Record<string, string> = {}
  const tagRe = /<meta\s+[^>]*>/gi
  for (const m of html.matchAll(tagRe)) {
    const tag = m[0]
    const attr = (n: string) => {
      const a = new RegExp(`${n}\\s*=\\s*["']([^"']*)["']`, 'i').exec(tag)
      return a ? a[1] : ''
    }
    const key = (attr('property') || attr('name')).toLowerCase()
    const value = attr('content')
    if (key && value && !(key in out)) out[key] = decodeEntities(value)
  }
  return out
}

/** Извлекает осмысленные параграфы из HTML — для постов без og:description. */
function extractParagraphs(html: string): string[] {
  // Убираем скрипты, стили, head, nav, footer, header
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')

  // Собираем текст из <p>, <article>, <main>, <div class*="content">
  const pRe = /<(?:p|article|div)[^>]*>([\s\S]*?)<\/(?:p|article|div)>/gi
  const paragraphs: string[] = []
  for (const m of pRe.execAll?.(cleaned) ?? []) {
    const text = m[1]
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (text.length > 40) paragraphs.push(decodeEntities(text))
  }
  // Если регулярка не сработала через execAll — используем matchAll
  if (paragraphs.length === 0) {
    for (const m of cleaned.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
      const text = m[1]
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
      if (text.length > 40) paragraphs.push(decodeEntities(text))
    }
  }
  return paragraphs.slice(0, 12)
}

// Polyfill execAll для старых версий Deno
;(RegExp.prototype as unknown as { execAll?: (s: string) => RegExpExecArray[] }).execAll ??= function (this: RegExp, s: string): RegExpExecArray[] {
  const results: RegExpExecArray[] = []
  let m: RegExpExecArray | null
  this.lastIndex = 0
  while ((m = this.exec(s)) !== null) {
    results.push(m)
    if (m.index === this.lastIndex) this.lastIndex++
  }
  return results
}

function resolveUrl(src: string, base: string): string {
  try {
    return new URL(src, base).toString()
  } catch {
    return src
  }
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: HF_JSON })
  }

  const url = new URL(req.url).searchParams.get('url') ?? ''
  if (!/^https?:\/\//i.test(url)) {
    return new Response(JSON.stringify({ error: 'param url required' }), { status: 400, headers: HF_JSON })
  }
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'ru-RU,ru;q=0.9,en;q=0.8',
      },
    })
    const html = await res.text()
    const meta = readMeta(html)
    const title = decodeEntities(
      (meta['og:title'] || html.match(/<title[^>]*>\s*([^<]*?)\s*<\/title>/i)?.[1] || '').trim(),
    )
    const description = decodeEntities(
      meta['og:description'] || meta['description'] || '',
    )

    // Если og:description пустой — собираем из параграфов
    let body = description
    if (!body) {
      const paragraphs = extractParagraphs(html)
      body = paragraphs.join('\n\n')
    }

    // Обложка: og:image, twitter:image, или первая <img> в контенте
    let image = meta['og:image'] || meta['twitter:image'] || ''
    if (!image) {
      const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i)
      if (imgMatch) image = imgMatch[1]
    }
    if (image) image = resolveUrl(image, url)

    return new Response(
      JSON.stringify({
        title,
        description: body.replace(/\n{3,}/g, '\n\n').trim(),
        excerpt: (description || body).replace(/\s+/g, ' ').trim().slice(0, 220),
        image,
      }),
      { status: 200, headers: HF_JSON },
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'fetch failed' }), {
      status: 502,
      headers: HF_JSON,
    })
  }
})
