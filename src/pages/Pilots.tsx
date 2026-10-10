import { useMemo, useState } from 'react'
import { ArrowUpRight, Search, Users, X } from 'lucide-react'
import { QUERY_KEYS, useQuery } from '@/hooks/useQuery'
import { fetchPilots } from '@/lib/api'
import type { Pilot } from '@/lib/types'
import { Container, EmptyState, Reveal, Section } from '@/components/ui/Layout'
import { Button, ButtonLink } from '@/components/ui/Button'
import { PilotCard } from '@/components/cards/PilotCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { useSite } from '@/context/SiteContext'
import { usePageMeta } from '@/hooks/usePageMeta'

/** Карточка пилота вынесена в `components/cards/PilotCard` для переиспользования. */
export { PilotCard }

function sortRoster(rows: Pilot[]): Pilot[] {
  return [...rows].sort(
    (a, b) =>
      Number(a.is_extra) - Number(b.is_extra) ||
      (a.team_place ?? 99) - (b.team_place ?? 99) ||
      (b.points ?? 0) - (a.points ?? 0) ||
      a.name.localeCompare(b.name, 'ru'),
  )
}

function RosterSkeleton() {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-line bg-card">
          <Skeleton className="aspect-[4/5] w-full rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Pilots() {
  usePageMeta(
    'Пилоты',
    'Состав команды Bad Habit Racing: баллы, места в команде и машины пилотов.',
  )
  const { data: pilots, loading } = useQuery(fetchPilots, [] as Pilot[], [], QUERY_KEYS.pilots)
  const { site } = useSite()
  const [query, setQuery] = useState('')

  const roster = useMemo(() => sortRoster(pilots), [pilots])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return roster
    return roster.filter((p) =>
      [p.name, p.car, p.country, p.bio].some((field) => field?.toLowerCase().includes(q)),
    )
  }, [roster, query])

  const pointsTotal = useMemo(
    () => roster.reduce((sum, p) => sum + (p.is_extra ? 0 : Number(p.points) || 0), 0),
    [roster],
  )

  const racersCount = useMemo(() => roster.filter((p) => !p.is_extra).length, [roster])
  const isSearching = query.trim().length > 0

  return (
    <Section className="pt-8 pb-20 md:pt-12 md:pb-24">
      <Container>
        {/* --------------------------- Шапка с метриками --------------------------- */}
        <header className="border-b border-line pb-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-[28px] font-bold tracking-[-0.03em] md:text-[40px]">Пилоты</h1>
              {roster.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card/60 px-3 py-1 text-[12px] font-semibold text-muted">
                    <Users className="h-3.5 w-3.5 text-brand" />
                    <span className="tabular-nums text-fg">{racersCount}</span> в составе
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card/60 px-3 py-1 text-[12px] font-semibold text-muted">
                    <span className="tabular-nums text-fg">{pointsTotal}</span> баллов сезона
                  </span>
                </div>
              )}
            </div>

            {site.nova_url && (
              <ButtonLink to={site.nova_url} variant="brand">
                Подписаться в NOVA <ArrowUpRight className="h-4 w-4" />
              </ButtonLink>
            )}
          </div>
        </header>

        {/* --------------------------- Поиск (sticky) --------------------------- */}
        <div className="sticky top-16 z-10 -mx-4 mt-4 bg-bg/80 px-4 py-3 backdrop-blur-md sm:top-20 md:-mx-0 md:px-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="group relative flex min-w-0 flex-1 items-center">
              <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск по имени, машине, стране"
                aria-label="Поиск по составу"
                className="h-10 w-full rounded-full border border-line bg-card/60 pl-9 pr-10 text-[13px] transition-colors outline-none placeholder:text-muted/70 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30"
              />
              {isSearching && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Очистить поиск"
                  className="absolute right-2 flex h-6 w-6 items-center justify-center rounded-full text-muted transition-colors hover:bg-fg/5 hover:text-fg focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </label>

            {isSearching && (
              <div className="flex items-center gap-2 text-[12px] text-muted">
                <span className="tabular-nums">
                  Найдено: <span className="font-semibold text-fg">{filtered.length}</span>
                </span>
                <Button size="sm" variant="ghost" onClick={() => setQuery('')}>
                  Сбросить
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* --------------------------- Список пилотов --------------------------- */}
        {loading && roster.length === 0 ? (
          <RosterSkeleton />
        ) : filtered.length === 0 ? (
          <div className="pt-8">
            {isSearching ? (
              <EmptyState
                title="Никого не нашли"
                description={`По запросу «${query.trim()}» никого нет. Попробуйте другое имя, машину или страну.`}
              />
            ) : (
              <EmptyState
                title="Пилотов пока нет"
                description="Состав команды появится здесь, как только будет опубликован сезон."
              />
            )}
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((pilot, i) => (
              <Reveal key={pilot.id} delay={Math.min(i, 8) * 0.04} y={14}>
                <PilotCard pilot={pilot} />
              </Reveal>
            ))}
          </div>
        )}
      </Container>
    </Section>
  )
}