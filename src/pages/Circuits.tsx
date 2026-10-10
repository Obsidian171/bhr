import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, Check, Flag, MapPin, Newspaper, X } from 'lucide-react'
import { QUERY_KEYS, useQuery } from '@/hooks/useQuery'
import { fetchCircuits } from '@/lib/api'
import type { Circuit } from '@/lib/types'
import { Container, EmptyState, Reveal, Section } from '@/components/ui/Layout'
import { Skeleton } from '@/components/ui/Skeleton'
import { CircuitCard } from '@/components/cards/CircuitCard'
import { cn, isFutureDate } from '@/lib/utils'
import { usePageMeta } from '@/hooks/usePageMeta'

export { CircuitCard }

const AUTUMN = true

/* ------------------------------ Autumn decor ------------------------------- */

function MapleLeaf({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      focusable="false"
      fill="currentColor"
    >
      <path d="M16 2.5l-2 4.6-3.2-1.9.4 3.6-4.6-1.2 2 4.3-4.6 1.5 3.6 2.7-3.2 3.4 4.6.6-1 4.4 4-2 1.4 4.3 2.6-3.6 2.6 3.6 1.4-4.3 4 2-1-4.4 4.6-.6-3.2-3.4 3.6-2.7-4.6-1.5 2-4.3-4.6 1.2.4-3.6-3.2 1.9L16 2.5Z" />
    </svg>
  )
}

/* ------------------------------ FilterChip ------------------------------ */

function FilterChip({
  active,
  onClick,
  children,
  count,
  icon: Icon,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  count?: number
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[12px] font-semibold transition-colors',
        'focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none',
        active
          ? 'border-brand bg-brand text-white shadow-sm shadow-brand/25'
          : 'border-line bg-card/40 text-muted hover:border-brand/40 hover:text-fg',
      )}
    >
      {Icon && (
        <Icon
          aria-hidden
          className={cn('h-3.5 w-3.5', active ? 'text-white/90' : 'text-brand/70')}
        />
      )}
      {active && !Icon && <Check aria-hidden className="h-3 w-3" />}
      <span>{children}</span>
      {typeof count === 'number' && count > 0 && (
        <span
          className={cn(
            'rounded-md px-1.5 py-0.5 font-mono text-[10px] tabular-nums',
            active ? 'bg-black/20 text-white' : 'bg-fg/5 text-muted',
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}

/* ------------------------------ Skeletons ------------------------------ */

function CircuitsSkeleton() {
  return (
    <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-line bg-card">
          <Skeleton className="aspect-[16/10] w-full rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* --------------------------------- Page --------------------------------- */

export default function Circuits() {
  usePageMeta(
    'Трассы',
    'Календарь и справочник трасс Bad Habit Racing: длина, повороты и рекорды кругов.',
  )
  const { data: circuits, loading } = useQuery(
    fetchCircuits,
    [] as Circuit[],
    [],
    QUERY_KEYS.circuits,
  )
  const [onlyUpcoming, setOnlyUpcoming] = useState(false)

  const sorted = useMemo(() => [...circuits].sort((a, b) => a.position - b.position), [circuits])

  const upcomingCount = useMemo(
    () => sorted.filter((c) => isFutureDate(c.race_date)).length,
    [sorted],
  )

  const rows = useMemo(
    () => (onlyUpcoming ? sorted.filter((c) => isFutureDate(c.race_date)) : sorted),
    [sorted, onlyUpcoming],
  )

  const isEmptyRoster = circuits.length === 0
  const isEmptyFiltered = !isEmptyRoster && rows.length === 0

  return (
    <Section className="pt-8 pb-20 md:pt-12 md:pb-24">
      <Container>
        {/* ------------------------------ Шапка ------------------------------ */}
        <header className="relative border-b border-line pb-6">
          {AUTUMN && (
            <>
              <MapleLeaf
                aria-hidden
                className="pointer-events-none absolute -top-1 right-0 hidden h-10 w-10 rotate-12 text-amber-600/25 lg:block"
              />
              <MapleLeaf
                aria-hidden
                className="pointer-events-none absolute top-6 right-12 hidden h-6 w-6 -rotate-12 text-amber-700/20 lg:block"
              />
            </>
          )}

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-[11px] font-bold tracking-[0.14em] text-brand uppercase">
                <Flag aria-hidden className="h-3.5 w-3.5" />
                Сезон · Календарь
              </div>

              <h1 className="mt-3 text-[28px] font-bold tracking-[-0.03em] md:text-[40px]">
                Трассы
              </h1>

              {circuits.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] font-semibold tabular-nums">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card/60 px-2.5 py-1 text-muted">
                    <Flag aria-hidden className="h-3.5 w-3.5 text-brand" />
                    <span className="text-fg">{circuits.length}</span> в справочнике
                  </span>
                  {upcomingCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card/60 px-2.5 py-1 text-muted">
                      <CalendarClock aria-hidden className="h-3.5 w-3.5 text-brand" />
                      <span className="text-fg">{upcomingCount}</span> этапов впереди
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <FilterChip active={!onlyUpcoming} onClick={() => setOnlyUpcoming(false)}>
                Все
              </FilterChip>
              <FilterChip
                active={onlyUpcoming}
                onClick={() => setOnlyUpcoming(true)}
                count={upcomingCount}
                icon={CalendarClock}
              >
                Скоро этапы
              </FilterChip>
            </div>
          </div>
        </header>

        {/* ------------------------------ Подсказка фильтра ------------------- */}
        {onlyUpcoming && rows.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand/25 bg-brand/[0.06] px-4 py-2.5 text-[13px]">
            <span className="flex items-center gap-2 text-fg/80">
              <CalendarClock aria-hidden className="h-4 w-4 text-brand" />
              Показаны только предстоящие этапы
              <span className="tabular-nums text-fg">— найдено {rows.length}</span>
            </span>
            <button
              type="button"
              onClick={() => setOnlyUpcoming(false)}
              className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1 text-[12px] font-semibold text-muted transition-colors hover:border-brand/40 hover:text-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
              <X aria-hidden className="h-3.5 w-3.5" />
              Сбросить
            </button>
          </div>
        )}

        {/* ------------------------------ Список ------------------------------ */}
        {loading && circuits.length === 0 ? (
          <CircuitsSkeleton />
        ) : isEmptyRoster ? (
          <div className="pt-8">
            <EmptyState
              title="Трасс пока нет"
              description="Календарь сезона появится здесь после публикации этапов."
              action={
                <Link
                  to="/journal"
                  className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-[13px] font-semibold text-muted transition-colors hover:border-brand/40 hover:text-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                >
                  <Newspaper aria-hidden className="h-3.5 w-3.5" />
                  Читать журнал
                </Link>
              }
            />
          </div>
        ) : isEmptyFiltered ? (
          <div className="pt-8">
            <EmptyState
              title="Предстоящих этапов нет"
              description="Сейчас в календаре нет запланированных гонок. Посмотрите весь справочник трасс."
              action={
                <button
                  type="button"
                  onClick={() => setOnlyUpcoming(false)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-4 py-2 text-[13px] font-semibold text-brand transition-colors hover:bg-brand hover:text-white focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                >
                  <MapPin aria-hidden className="h-3.5 w-3.5" />
                  Показать все трассы
                </button>
              }
            />
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rows.map((circuit, i) => (
              <Reveal key={circuit.id} delay={Math.min(i, 8) * 0.04} y={14}>
                <CircuitCard circuit={circuit} />
              </Reveal>
            ))}
          </div>
        )}
      </Container>
    </Section>
  )
}