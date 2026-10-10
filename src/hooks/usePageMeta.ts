import { useEffect } from 'react'

const SUFFIX = 'BAD HABIT RACING'

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attr, key)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

/**
 * Title, description, canonical и Open Graph для текущей страницы.
 * Теги без переданного значения не трогаются — они остаются из index.html.
 * `noindex` закрывает страницу от поисковиков (скрытая админка).
 */
export function usePageMeta(
  title?: string,
  description?: string,
  image?: string,
  options?: { noindex?: boolean },
) {
  useEffect(() => {
    const fullTitle = title ? `${title} — ${SUFFIX}` : SUFFIX
    document.title = fullTitle
    setMeta('property', 'og:title', fullTitle)
    setMeta('property', 'og:type', 'website')

    if (description) {
      setMeta('name', 'description', description)
      setMeta('property', 'og:description', description)
    }
    if (image) {
      setMeta('property', 'og:image', image)
      setMeta('name', 'twitter:card', 'summary_large_image')
    }

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = window.location.origin + window.location.pathname

    if (options?.noindex) setMeta('name', 'robots', 'noindex, nofollow')

    return () => {
      document.title = SUFFIX
    }
  }, [title, description, image, options?.noindex])
}
