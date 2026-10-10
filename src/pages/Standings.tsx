import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Flag, Trophy } from 'lucide-react'
import { QUERY_KEYS, useQuery } from '@/hooks/useQuery'
import { fetchPilots } from '@/lib/api'
import type { Pilot } from '@/lib/types'
import { Container, EmptyState, Reveal, Section } from '@/components/ui/Layout'
import { CoverArt } from '@/components/ui/Primitives'
import { Skeleton } from '@/components/ui/Skeleton'
import { MEDAL_STYLES, sortByPoints } from '@/lib/race'
import { cn, formatNumber, pilotHref } from '@/lib/utils'
import { usePageMeta } from '@/hooks/usePageMeta'

function StandingsSkeleton() {
  return (
    <ol className="mt-6 divide-y divide-line/60 border-t border-line/60">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 py-4 sm:gap-4">
          <Skeleton className="h-7 w-7 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-6 w-12" />
        </li>
      ))}
    </ol>
  )
}

export default function Standings() {
  usePageMeta(
    'Таблица результатов',
    'Турнирная таблица сезона Bad Habit Racing: баллы пилотов и места в команде.',
  )
  const { data: pilots, loading } = useQuery(fetchPilots, [] as Pilot[], [], QUERY_KEYS.pilots)

  const rows = useMemo(() => sortByPoints(pilots), [pilots])
  const pointsTotal = useMemo(
    () => rows.reduce((sum, p) => sum + (Number(p.points) || 0), 0),
    [rows],
  )

  return (
    <Section className="pt-8 pb-20 md:pt-12 md:pb-24">
      <Container>
        {/* ------------------------------ Шапка ------------------------------ */}
        <header className="border-b border-line pb-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-[28px] font-bold tracking-[-0.03em] md:text-[40px]">
                Таблица результатов
              </h1>
              {rows.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card/60 px-3 py-1 text-[12px] font-semibold text-muted">
                    <span className="tabular-nums text-fg">{rows.length}</span> пилотов
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card/60 px-3 py-1 text-[12px] font-semibold text-muted">
                    <span className="tabular-nums text-fg">{formatNumber(pointsTotal)}</span> баллов сезона
                  </span>
                </div>
              )}
            </div>

            <Link
              to="/hall"
              className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-card/60 px-4 text-[13px] font-medium transition-colors hover:border-brand/40 hover:text-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
              <Trophy className="h-3.5 w-3.5" />
              Зал славы
            </Link>
          </div>
        </header>

        {/* ------------------------------ Список ------------------------------ */}
        {loading && rows.length === 0 ? (
          <StandingsSkeleton />
        ) : rows.length === 0 ? (
          <div className="pt-6">
            <EmptyState
              title="Таблицы пока нет"
              description="Результаты появятся здесь, как только пилоты начнут набирать баллы сезона."
            />
          </div>
        ) : (
          <ol className="mt-6 divide-y divide-line/60 border-t border-line/60">
            {rows.map((pilot, i) => {
              const isPodium = i < 3
              const medal = isPodium ? MEDAL_STYLES[i] : undefined
              return (
                <li key={pilot.id}>
                  <Reveal delay={Math.min(i, 10) * 0.03} y={10}>
                    <Link
                      to={pilotHref(pilot)}
                      className={cn(
                        'group relative -mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition-colors sm:gap-4 sm:px-3',
                        'hover:bg-fg/[0.04] focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none',
                        isPodium && 'bg-brand/[0.03]',
                      )}
                    >
                      {/* Брендовая полоска слева у топа‑3 */}
                      {isPodium && (
                        <span
                          aria-hidden
                          className="absolute top-1/2 left-0 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-brand/70"
                        />
                      )}

                      {/* Номер / медаль */}
                      <span
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold tabular-nums transition-transform group-hover:scale-105',
                          medal ?? 'bg-surface text-muted',
                        )}
                      >
                        {i + 1}
                      </span>

                      {/* Аватар */}
                      <CoverArt
                        seed={pilot.id}
                        title={pilot.name}
                        subtitle={pilot.number ? `#${pilot.number}` : undefined}
                        image={pilot.photo_url ?? pilot.cover_url}
                        className="h-10 w-10 shrink-0 overflow-hidden rounded-lg ring-1 ring-line/70"
                        size="sm"
                      />

                      {/* Имя + мета */}
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-[15px] font-semibold transition-colors group-hover:text-brand">
                          {pilot.name}
                        </h2>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-muted">
                          {pilot.car && <span className="truncate">{pilot.car}</span>}
                          {pilot.country && (
                            <>
                              <span aria-hidden className="hidden sm:inline">
                                ·
                              </span>
                              <span className="hidden sm:inline">{pilot.country}</span>
                            </>
                          )}
                          {pilot.team_place && (
                            <span className="inline-flex items-center gap-1">
                              <Flag className="h-3 w-3" />
                              {pilot.team_place} место в команде
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Баллы */}
                      <div className="shrink-0 text-right">
                        <span className="block text-[20px] leading-none font-bold tabular-nums transition-colors group-hover:text-brand">
                          {formatNumber(pilot.points)}
                        </span>
                        <span className="mt-1 block text-[10px] tracking-wider text-muted uppercase">
                          баллов
                        </span>
                      </div>
                    </Link>
                  </Reveal>
                </li>
              )
            })}
          </ol>
        )}

        {/* ------------------------------ Футер ------------------------------ */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-[13px] text-muted">
          <span className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-brand/70" />
            Общий зачёт сезона
          </span>
          <Link
            to="/pilots"
            className="group inline-flex items-center gap-1 font-semibold text-brand transition-colors hover:text-fg focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
          >
            Состав команды
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </Container>
    </Section>
  )
}