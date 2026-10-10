import { useEffect, useState } from 'react'
import { ArrowUpRight, Megaphone } from 'lucide-react'
import { fetchActiveAdBanners } from '@/lib/api'
import { QUERY_KEYS, useQuery } from '@/hooks/useQuery'
import type { AdBanner } from '@/lib/types'
import { cn, gradientFromSeed } from '@/lib/utils'

const ROTATE_MS = 9000

type AdVariant = 'wide' | 'sidebar'

/**
 * Рекламный блок. По умолчанию (`wide`) — горизонтальная плитка в конце главной:
 * квадратная картинка слева, справа — подпись «Реклама», заголовок, текст и ссылка.
 * Вариант `sidebar` — вертикальная карточка для левой колонки: картинка сверху,
 * под ней подпись, заголовок и кнопка перехода.
 * Подпись «Реклама» обязательна, как требует площадка.
 */
export function AdTile({
  className,
  variant = 'wide',
}: {
  className?: string
  variant?: AdVariant
}) {
  const { data: banners } = useQuery(fetchActiveAdBanners, [] as AdBanner[], [], QUERY_KEYS.adBanners)
  const [index, setIndex] = useState(0)
  const sidebar = variant === 'sidebar'

  useEffect(() => {
    if (banners.length < 2) return
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % banners.length), ROTATE_MS)
    return () => window.clearInterval(timer)
  }, [banners.length])

  if (banners.length === 0) {
    return (
      <aside
        aria-label="Рекламный блок"
        className={cn(
          'flex rounded-xl border border-dashed border-line bg-surface/30 text-muted',
          sidebar
            ? 'flex-col items-center gap-2 px-3 py-6 text-center text-[11px] leading-relaxed'
            : 'items-center gap-3 px-4 py-3 text-[12px]',
          className,
        )}
      >
        <Megaphone className="h-4 w-4 shrink-0 text-muted/70" />
        <span>
          {sidebar
            ? 'Рекламный блок свободен'
            : 'Рекламный блок свободен — баннер появится здесь после публикации.'}
        </span>
      </aside>
    )
  }

  const banner = banners[index] ?? banners[0]
  const href = banner.url?.trim()
  const art = banner.image_url ? (
    <img
      src={banner.image_url}
      alt=""
      loading="lazy"
      decoding="async"
      className={cn(
        'h-full w-full object-cover',
        !sidebar && 'transition-transform duration-500 group-hover:scale-[1.04]',
      )}
    />
  ) : (
    <span className={cn('block h-full w-full bg-gradient-to-br', gradientFromSeed(banner.id))} />
  )

  const dots = banners.length > 1 && (
    <div className="flex items-center gap-1.5" role="tablist" aria-label="Навигация по баннерам">
      {banners.map((item, i) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          onClick={() => setIndex(i)}
          aria-label={`Баннер ${i + 1}`}
          aria-selected={i === index}
          className={cn(
            'h-1.5 rounded-full transition-all duration-300',
            i === index ? 'w-6 bg-fg' : 'w-1.5 bg-line hover:bg-muted',
          )}
        />
      ))}
    </div>
  )

  if (sidebar) {
    return (
      <aside
        aria-label="Реклама"
        className={cn('group rounded-xl border border-line bg-surface/40 p-3', className)}
      >
        <p className="flex items-center gap-1.5 text-[10px] font-medium tracking-[0.18em] text-muted uppercase">
          <Megaphone className="h-3 w-3" />
          Реклама
        </p>
        <div className="relative mt-2 aspect-square w-full overflow-hidden rounded-lg">{art}</div>
        <p className="mt-2 truncate text-[14px] font-semibold tracking-[-0.01em] transition-colors group-hover:text-brand">
          {banner.advertiser ?? banner.title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[12px] text-muted">{banner.title}</p>

        <div className="mt-2.5 flex items-center justify-between gap-2">
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-line px-3.5 text-[12px] font-medium transition-colors hover:border-fg hover:bg-fg hover:text-bg focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
              Перейти
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          ) : (
            <span />
          )}
          {dots}
        </div>
      </aside>
    )
  }

  return (
    <aside
      aria-label="Реклама"
      className={cn(
        'group relative flex flex-col gap-4 rounded-xl border border-line bg-surface/40 p-3 sm:flex-row sm:items-center sm:gap-6 sm:p-4',
        className,
      )}
    >
      <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-lg sm:aspect-square sm:w-40 md:w-48">
        {art}
      </div>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[10px] font-medium tracking-[0.18em] text-muted uppercase">
          <Megaphone className="h-3 w-3" />
          Реклама
        </p>
        <p className="mt-2 truncate text-[17px] font-semibold tracking-[-0.015em] transition-colors group-hover:text-brand md:text-[19px]">
          {banner.advertiser ?? banner.title}
        </p>
        <p className="mt-1 line-clamp-2 text-[13px] text-muted">{banner.title}</p>

        <div className="mt-3 flex items-center gap-4">
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-line px-3.5 text-[12px] font-medium transition-colors hover:border-fg hover:bg-fg hover:text-bg focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
              Перейти
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          )}
          {dots}
        </div>
      </div>
    </aside>
  )
}
