import { memo, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Car,
  Clock,
  FilterX,
  Flag,
  Newspaper,
  Search,
  SlidersHorizontal,
  Tag,
  TrendingUp,
  User,
  X,
} from 'lucide-react'
import { QUERY_KEYS, useQuery } from '@/hooks/useQuery'
import { fetchPosts } from '@/lib/api'
import type { Post } from '@/lib/types'
import { Container, EmptyState, Reveal, Section } from '@/components/ui/Layout'
import { CoverArt } from '@/components/ui/Primitives'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn, formatDate, postHref } from '@/lib/utils'
import { usePageMeta } from '@/hooks/usePageMeta'

type SortOption = 'newest' | 'oldest' | 'read_time'

/* ----------------------------- Race decor (SVG) ---------------------------- */

/** Силуэт болида BHR — просто контур, декоративный. */
function CarSilhouette({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 90"
      className={className}
      aria-hidden="true"
      focusable="false"
      fill="currentColor"
    >
      <path d="M12 62c-4 0-6-2-6-6v-6c0-3 2-5 5-6l22-5 18-14c4-3 9-5 14-5h42c6 0 11 2 15 6l12 12 42 6c5 1 9 5 9 10v2c0 4-3 6-6 6H12Z" />
      <circle cx="66" cy="66" r="14" opacity="0.85" />
      <circle cx="166" cy="66" r="14" opacity="0.85" />
      <path d="M60 40h60l-8-12H70l-10 12Z" opacity="0.35" />
      <path d="M136 40h34l-10-10h-24v10Z" opacity="0.35" />
    </svg>
  )
}

/** Клетчатый финишный узор — маленький SVG для декора. */
function CheckerFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 20" className={className} aria-hidden="true" focusable="false">
      {Array.from({ length: 8 }).map((_, i) => {
        const col = i % 4
        const row = Math.floor(i / 4)
        const black = (col + row) % 2 === 0
        return (
          <rect
            key={i}
            x={col * 10}
            y={row * 10}
            width="10"
            height="10"
            fill={black ? 'currentColor' : 'transparent'}
          />
        )
      })}
      <rect x="0" y="0" width="40" height="20" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
    </svg>
  )
}

/** Полоски скорости — три тонкие линии с брендовым градиентом. */
function SpeedLines({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn('inline-flex flex-col gap-[3px]', className)}>
      <span className="h-[3px] w-10 rounded-full bg-gradient-to-r from-brand to-transparent" />
      <span className="h-[3px] w-16 rounded-full bg-gradient-to-r from-brand to-transparent opacity-70" />
      <span className="h-[3px] w-8 rounded-full bg-gradient-to-r from-brand to-transparent opacity-50" />
    </span>
  )
}

/* ---------------------------------- Chip ---------------------------------- */

const CategoryChip = memo(function CategoryChip({
  label,
  count,
  isSelected,
  onClick,
}: {
  label: string
  count: number
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[12px] font-semibold transition-colors',
        'focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none',
        isSelected
          ? 'border-brand bg-brand text-white shadow-sm shadow-brand/25'
          : 'border-line bg-card/40 text-muted hover:border-brand/40 hover:text-fg',
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          'rounded-md px-1.5 py-0.5 font-mono text-[10px] tabular-nums',
          isSelected ? 'bg-black/20 text-white' : 'bg-fg/5 text-muted',
        )}
      >
        {count}
      </span>
    </button>
  )
})

/* ----------------------------- Magazine Card ------------------------------ */

function MagazineCard({ post, compact = false }: { post: Post; compact?: boolean }) {
  return (
    <Link
      to={postHref(post)}
      aria-label={`Читать статью: ${post.title}`}
      className={cn(
        'group relative flex overflow-hidden rounded-2xl border border-line bg-card/50 transition-colors',
        'hover:border-brand/40 hover:bg-card',
        'focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none',
        compact ? 'flex-row items-center gap-3.5 p-3' : 'flex-col',
      )}
    >
      <div
        className={cn(
          'relative shrink-0 overflow-hidden bg-muted/20',
          compact ? 'h-16 w-16 rounded-xl' : 'aspect-[3/2] w-full',
        )}
      >
        <CoverArt
          seed={post.id}
          title={post.title}
          subtitle={post.category ?? undefined}
          image={post.cover_url}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          size={compact ? 'sm' : 'lg'}
        />
        {!compact && post.category && (
          <span className="absolute top-3 left-3 rounded-md bg-brand px-2.5 py-1 text-[10px] font-bold tracking-[0.14em] text-white uppercase ring-1 ring-white/20">
            {post.category}
          </span>
        )}
      </div>

      <div className={cn('flex flex-1 flex-col', compact ? 'min-w-0' : 'p-4 sm:p-5')}>
        <div className="flex items-center gap-2 text-[11px] font-semibold tabular-nums text-muted">
          <time dateTime={post.published_at ?? undefined}>{formatDate(post.published_at)}</time>
          {post.read_minutes && (
            <>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <Clock aria-hidden className="h-3 w-3 text-brand" />
                {post.read_minutes} мин
              </span>
            </>
          )}
        </div>

        <h3
          className={cn(
            'font-extrabold text-fg transition-colors group-hover:text-brand',
            compact
              ? 'mt-1 truncate text-[13px]'
              : 'mt-2 line-clamp-2 text-[15px] leading-snug sm:text-[16px]',
          )}
        >
          {post.title}
        </h3>

        {!compact && post.excerpt && (
          <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted">
            {post.excerpt}
          </p>
        )}

        {!compact && (
          <div className="mt-auto flex items-center justify-between gap-2 border-t border-line/60 pt-4">
            <div className="min-w-0 flex-1">
              {post.author_name && (
                <span className="flex items-center gap-1.5 truncate text-[12px] font-medium text-muted">
                  <User aria-hidden className="h-3.5 w-3.5 shrink-0 text-brand/80" />
                  <span className="truncate">{post.author_name}</span>
                </span>
              )}
            </div>

            {post.via_url && (
              <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-bold text-brand transition-transform group-hover:translate-x-0.5">
                оригинал <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}

/* --------------------------------- Skeleton ------------------------------- */

function JournalSkeleton() {
  return (
    <div className="mt-6 space-y-6" aria-busy="true">
      <div className="overflow-hidden rounded-2xl border border-line bg-card lg:grid lg:grid-cols-12">
        <Skeleton className="aspect-[16/9] w-full rounded-none lg:col-span-7 lg:aspect-auto lg:min-h-[440px]" />
        <div className="flex flex-col justify-center space-y-4 p-6 lg:col-span-5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="space-y-3 overflow-hidden rounded-2xl border border-line bg-card p-4"
          >
            <Skeleton className="aspect-[3/2] w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ----------------------------------- Page --------------------------------- */

export default function Journal() {
  usePageMeta(
    'Журнал',
    'Журнал Bad Habit Racing: аналитика, интервью, обзоры этапов и новости.',
  )
  const { data: posts, loading } = useQuery(fetchPosts, [] as Post[], [], QUERY_KEYS.posts)

  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState<SortOption>('newest')

  const { categories, categoryCounts } = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of posts) {
      if (p.category) counts[p.category] = (counts[p.category] ?? 0) + 1
    }
    return { categories: Object.keys(counts), categoryCounts: counts }
  }, [posts])

  const totalReadMinutes = useMemo(
    () => posts.reduce((acc, p) => acc + (p.read_minutes ?? 3), 0),
    [posts],
  )

  const filteredPosts = useMemo(() => {
    const query = search.toLowerCase().trim()
    return posts
      .filter((post) => {
        const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory
        const matchesSearch =
          !query ||
          post.title.toLowerCase().includes(query) ||
          post.excerpt?.toLowerCase().includes(query) ||
          post.author_name?.toLowerCase().includes(query)
        return matchesCategory && matchesSearch
      })
      .sort((a, b) => {
        if (sortBy === 'oldest') {
          return new Date(a.published_at ?? 0).getTime() - new Date(b.published_at ?? 0).getTime()
        }
        if (sortBy === 'read_time') {
          return (b.read_minutes ?? 0) - (a.read_minutes ?? 0)
        }
        return new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime()
      })
  }, [posts, selectedCategory, search, sortBy])

  const trendingPosts = useMemo(() => posts.slice(0, 4), [posts])

  const heroPost = filteredPosts[0]
  const mainGridPosts = heroPost ? filteredPosts.slice(1) : []
  const isFiltered = selectedCategory !== 'all' || search.trim() !== ''

  const handleResetFilters = () => {
    setSelectedCategory('all')
    setSearch('')
  }

  return (
    <Section className="pt-8 pb-16 md:pt-14 md:pb-24">
      <Container>
        {/* --------------------------------- Шапка -------------------------------- */}
        <header className="relative flex flex-col gap-6 overflow-hidden border-b border-line pb-8 lg:flex-row lg:items-end lg:justify-between">
          {/* Фон-силуэт болида */}
          <CarSilhouette className="pointer-events-none absolute -top-2 right-0 hidden h-[140px] w-[380px] text-brand opacity-[0.06] lg:block" />
          <Flag
            aria-hidden
            className="pointer-events-none absolute -top-1 right-40 hidden h-6 w-6 text-brand opacity-[0.08] lg:block"
          />

          <div className="relative min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-[11px] font-bold tracking-[0.14em] text-brand uppercase">
              <Newspaper aria-hidden className="h-3.5 w-3.5" />
              Официальный дайджест
            </div>

            <h1 className="mt-3 text-[clamp(2rem,5vw,3.5rem)] leading-[1.02] font-black tracking-tight text-fg">
              ЖУРНАЛ СЕЗОНА
            </h1>

            <SpeedLines className="mt-3 hidden lg:inline-flex" />

            {posts.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px] font-semibold tabular-nums">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card/60 px-2.5 py-1 text-muted">
                  <Newspaper aria-hidden className="h-3.5 w-3.5 text-brand" />
                  {posts.length} публикаций
                </span>
                {categories.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card/60 px-2.5 py-1 text-muted">
                    <Tag aria-hidden className="h-3.5 w-3.5 text-brand" />
                    {categories.length} категорий
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card/60 px-2.5 py-1 text-muted">
                  <Clock aria-hidden className="h-3.5 w-3.5 text-brand" />~{totalReadMinutes} мин чтения
                </span>
              </div>
            )}
          </div>

          <div className="relative flex flex-col gap-4 lg:items-end">
            <p className="max-w-md text-[13px] leading-relaxed text-muted lg:text-right">
              Тактические разборы, обзоры конфигураций трасс, инсайды из боксов и технические сводки
              команды Bad Habit Racing.
            </p>

            <div className="relative w-full sm:w-80">
              <Search
                aria-hidden
                className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по статьям и тегам…"
                aria-label="Поиск по журналу"
                className="h-10 w-full rounded-xl border border-line bg-card/60 pr-9 pl-9 text-[13px] font-medium text-fg transition-colors placeholder:text-muted focus:border-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Очистить поиск"
                  className="absolute top-1/2 right-2.5 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:bg-fg/5 hover:text-fg focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                >
                  <X aria-hidden className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* -------------------------------- Фильтр -------------------------------- */}
        <div className="sticky top-0 z-20 -mx-4 border-b border-line/60 bg-bg/90 px-4 py-3 backdrop-blur-md">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative min-w-0 flex-1">
              <div className="pointer-events-none absolute top-0 bottom-0 left-0 z-10 w-4 bg-gradient-to-r from-bg to-transparent" />
              <div className="pointer-events-none absolute top-0 right-0 bottom-0 z-10 w-8 bg-gradient-to-l from-bg to-transparent" />

              <nav
                role="tablist"
                aria-label="Категории статей"
                className="flex items-center gap-2 overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                <CategoryChip
                  label="Все темы"
                  count={posts.length}
                  isSelected={selectedCategory === 'all'}
                  onClick={() => setSelectedCategory('all')}
                />
                {categories.map((c) => (
                  <CategoryChip
                    key={c}
                    label={c}
                    count={categoryCounts[c]}
                    isSelected={selectedCategory === c}
                    onClick={() => setSelectedCategory(c)}
                  />
                ))}
              </nav>
            </div>

            <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
              {isFiltered && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[12px] font-semibold text-muted transition-colors hover:border-brand/40 hover:text-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                >
                  <FilterX aria-hidden className="h-3.5 w-3.5" />
                  Сбросить
                </button>
              )}

              <div className="relative">
                <SlidersHorizontal
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted"
                />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  aria-label="Сортировка статей"
                  className="h-9 cursor-pointer appearance-none rounded-full border border-line bg-card/60 pr-8 pl-8 text-[12px] font-semibold text-fg transition-colors focus:border-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none"
                >
                  <option value="newest">Сначала новые</option>
                  <option value="oldest">Сначала старые</option>
                  <option value="read_time">По времени чтения</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* -------------------------------- Контент ------------------------------- */}
        {loading && posts.length === 0 ? (
          <JournalSkeleton />
        ) : filteredPosts.length === 0 ? (
          <div className="pt-12">
            <EmptyState
              title="Материалы не найдены"
              description="По вашему запросу нет подходящих публикаций. Попробуйте сбросить фильтры."
              action={
                isFiltered ? (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-[13px] font-semibold text-white shadow-sm shadow-brand/25 transition-colors hover:brightness-110 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none"
                  >
                    <FilterX aria-hidden className="h-4 w-4" />
                    Показать все статьи
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="mt-6 grid gap-8 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-8">
              {heroPost && (
                <Reveal y={12}>
                  <Link
                    to={postHref(heroPost)}
                    aria-label={`Главная статья: ${heroPost.title}`}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-card/60 transition-colors hover:border-brand/40 hover:bg-card focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none lg:grid lg:grid-cols-12"
                  >
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted/20 lg:col-span-7 lg:aspect-auto lg:min-h-[440px]">
                      <CoverArt
                        seed={heroPost.id}
                        title={heroPost.title}
                        subtitle={heroPost.category ?? undefined}
                        image={heroPost.cover_url}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                        size="xl"
                      />
                      {heroPost.category && (
                        <span className="absolute top-4 left-4 rounded-md bg-brand px-3 py-1 text-[10px] font-bold tracking-[0.14em] text-white uppercase ring-1 ring-white/20">
                          {heroPost.category}
                        </span>
                      )}
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
                      />

                      {/* Финишная клетка поверх обложки */}
                      <CheckerFlag className="pointer-events-none absolute right-4 bottom-4 h-5 w-10 text-white/70" />

                      {/* Маленькая машинка в углу */}
                      <Car
                        aria-hidden
                        className="pointer-events-none absolute bottom-4 left-4 h-5 w-5 text-white/80"
                      />
                    </div>

                    <div className="flex flex-col justify-between p-6 sm:p-8 lg:col-span-5">
                      <div>
                        <div className="flex items-center gap-2 text-[12px] font-semibold tabular-nums text-muted">
                          <time dateTime={heroPost.published_at ?? undefined}>
                            {formatDate(heroPost.published_at)}
                          </time>
                          {heroPost.read_minutes && (
                            <>
                              <span aria-hidden>·</span>
                              <span className="inline-flex items-center gap-1">
                                <Clock aria-hidden className="h-3.5 w-3.5 text-brand" />
                                {heroPost.read_minutes} мин
                              </span>
                            </>
                          )}
                        </div>
                        <h2 className="mt-3 line-clamp-3 text-[24px] leading-[1.1] font-black tracking-tight text-fg transition-colors group-hover:text-brand sm:text-[28px] lg:text-[32px]">
                          {heroPost.title}
                        </h2>
                        {heroPost.excerpt && (
                          <p className="mt-3 line-clamp-4 text-[13px] leading-relaxed text-muted">
                            {heroPost.excerpt}
                          </p>
                        )}
                      </div>

                      <div className="mt-6 flex items-center justify-between border-t border-line/60 pt-4 text-[12px] font-bold text-brand">
                        <span>Читать материал</span>
                        <ArrowUpRight
                          aria-hidden
                          className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                        />
                      </div>
                    </div>
                  </Link>
                </Reveal>
              )}

              {mainGridPosts.length > 0 && (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {mainGridPosts.map((post, i) => (
                    <Reveal key={post.id} delay={Math.min(i, 8) * 0.03} y={12}>
                      <MagazineCard post={post} />
                    </Reveal>
                  ))}
                </div>
              )}
            </div>

            <aside className="space-y-6 lg:col-span-4">
              <div className="relative overflow-hidden rounded-2xl border border-line bg-card/40 p-5">
                {/* Полоски скорости за заголовком */}
                <SpeedLines className="pointer-events-none absolute top-5 right-5 opacity-40" />

                <div className="mb-4 flex items-center gap-2 text-[11px] font-bold tracking-[0.14em] text-brand uppercase">
                  <TrendingUp aria-hidden className="h-4 w-4" />
                  В тренде
                </div>

                {trendingPosts.length === 0 ? (
                  <p className="text-[13px] text-muted">Пока нет статей.</p>
                ) : (
                  <div className="space-y-3">
                    {trendingPosts.map((post) => (
                      <MagazineCard key={post.id} post={post} compact />
                    ))}
                  </div>
                )}

                <div className="mt-5 flex items-center justify-between border-t border-line/60 pt-4">
                  <CheckerFlag className="h-4 w-8 text-muted/60" />
                  <span className="text-[10px] font-semibold tracking-[0.14em] text-muted uppercase">
                    BHR · Journal
                  </span>
                </div>
              </div>
            </aside>
          </div>
        )}
      </Container>
    </Section>
  )
}