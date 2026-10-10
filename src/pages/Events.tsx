import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, Check, CalendarDays, MapPin, X } from 'lucide-react'
import { QUERY_KEYS, useQuery } from '@/hooks/useQuery'
import { fetchEvents } from '@/lib/api'
import type { TeamEvent } from '@/lib/types'
import { Container, EmptyState, Reveal, Section } from '@/components/ui/Layout'
import { Badge, CoverArt } from '@/components/ui/Primitives'
import { Skeleton } from '@/components/ui/Skeleton'
import { EVENT_STATUSES } from '@/lib/constants'
import { cn, circuitHref, isFutureDate } from '@/lib/utils'
import { usePageMeta } from '@/hooks/usePageMeta'

type Filter = 'all' | 'upcoming' | 'plan' | 'note'

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

function EventsSkeleton() {
  return (
    <div className="mt-6 space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-line bg-card p-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-3 h-3 w-1/2" />
          <Skeleton className="mt-3 h-3 w-3/4" />
        </div>
      ))}
    </div>
  )
}

/* ------------------------------ Result row ------------------------------ */

function formatEventTime(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

function EventRow({ event }: { event: TeamEvent }) {
  const isNote = event.mode === 'note'
  const statusLabel = EVENT_STATUSES.find((s) => s.id === event.status)?.label ?? event.status

  return (
    <article className="card group flex flex-col overflow-hidden p-0 transition-colors hover:border-brand/30 sm:flex-row">
      <div className="relative shrink-0 overflow-hidden bg-muted/20">
        <CoverArt
          seed={event.id}
          title={event.title}
          subtitle={event.circuit?.name ?? undefined}
          image={event.cover_url}
          className="h-40 w-full sm:h-full sm:w-56"
          size="lg"
        />
      </div>

      <div className="min-w-0 flex-1 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[17px] leading-tight font-semibold">{event.title}</h3>
          {isNote ? (
            <Badge tone="cyan">ожидается</Badge>
          ) : (
            <Badge
              tone={event.status === 'cancelled' ? 'red' : event.status === 'done' ? 'neutral' : 'lime'}
            >
              {statusLabel}
            </Badge>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted">
          {event.starts_at && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays aria-hidden className="h-4 w-4 text-brand/70" />
              {formatEventTime(event.starts_at)}
            </span>
          )}
          {event.circuit && (
            <Link
              to={circuitHref(event.circuit)}
              className="inline-flex items-center gap-1.5 transition-colors hover:text-brand"
            >
              <MapPin aria-hidden className="h-4 w-4 shrink-0 text-brand/70" />
              {event.circuit.name}
            </Link>
          )}
        </div>

        {event.body && (
          <p className="mt-3 line-clamp-3 text-[13px] leading-relaxed text-muted">{event.body}</p>
        )}
      </div>
    </article>
  )
}

/* --------------------------------- Page --------------------------------- */

export default function Events() {
  usePageMeta(
    'Мероприятия',
    'Календарь мероприятий Bad Habit Racing: запланированные этапы и то, что ожидается.',
  )
  const { data: events, loading } = useQuery(fetchEvents, [] as TeamEvent[], [], QUERY_KEYS.events)
  const [filter, setFilter] = useState<Filter>('all')

  const sorted = useMemo(() => {
    const withDate = [...events]
      .filter((e) => e.starts_at)
      .sort((a, b) => new Date(a.starts_at as string).getTime() - new Date(b.starts_at as string).getTime())
    const withoutDate = events.filter((e) => !e.starts_at)
    return [...withDate, ...withoutDate]
  }, [events])

  const plannedCount = useMemo(() => events.filter((e) => e.mode === 'plan').length, [events])
  const upcomingCount = useMemo(
    () => events.filter((e) => e.mode === 'plan' && isFutureDate(e.starts_at)).length,
    [events],
  )

  const rows = useMemo(() => {
    switch (filter) {
      case 'upcoming':
        return sorted.filter((e) => e.mode === 'plan' && isFutureDate(e.starts_at))
      case 'plan':
        return sorted.filter((e) => e.mode === 'plan')
      case 'note':
        return sorted.filter((e) => e.mode === 'note')
      default:
        return sorted
    }
  }, [sorted, filter])

  const isEmptyRoster = events.length === 0
  const isEmptyFiltered = !isEmptyRoster && rows.length === 0

  return (
    <Section className="pt-8 pb-20 md:pt-12 md:pb-24">
      <Container>
        {/* ------------------------------ Шапка ------------------------------ */}
        <header className="border-b border-line pb-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-[11px] font-bold tracking-[0.14em] text-brand uppercase">
                <CalendarClock aria-hidden className="h-3.5 w-3.5" />
                Сезон · Мероприятия
              </div>

              <h1 className="mt-3 text-[28px] font-bold tracking-[-0.03em] md:text-[40px]">
                Мероприятия
              </h1>

              {events.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] font-semibold tabular-nums">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card/60 px-2.5 py-1 text-muted">
                    <CalendarClock aria-hidden className="h-3.5 w-3.5 text-brand" />
                    <span className="text-fg">{events.length}</span> в плане
                  </span>
                  {plannedCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card/60 px-2.5 py-1 text-muted">
                      <span className="text-fg">{plannedCount}</span> запланировано
                    </span>
                  )}
                  {upcomingCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card/60 px-2.5 py-1 text-muted">
                      <CalendarClock aria-hidden className="h-3.5 w-3.5 text-brand" />
                      <span className="text-fg">{upcomingCount}</span> впереди
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
                Все
              </FilterChip>
              <FilterChip
                active={filter === 'upcoming'}
                onClick={() => setFilter('upcoming')}
                count={upcomingCount}
                icon={CalendarClock}
              >
                Предстоящие
              </FilterChip>
              <FilterChip
                active={filter === 'plan'}
                onClick={() => setFilter('plan')}
                count={plannedCount}
              >
                Запланировано
              </FilterChip>
              <FilterChip active={filter === 'note'} onClick={() => setFilter('note')}>
                Ожидается
              </FilterChip>
            </div>
          </div>
        </header>

        {/* ------------------------------ Подсказка фильтра ------------------- */}
        {filter === 'upcoming' && rows.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand/25 bg-brand/[0.06] px-4 py-2.5 text-[13px]">
            <span className="flex items-center gap-2 text-fg/80">
              <CalendarClock aria-hidden className="h-4 w-4 text-brand" />
              Показаны только предстоящие мероприятия
              <span className="tabular-nums text-fg">— найдено {rows.length}</span>
            </span>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1 text-[12px] font-semibold text-muted transition-colors hover:border-brand/40 hover:text-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
              <X aria-hidden className="h-3.5 w-3.5" />
              Сбросить
            </button>
          </div>
        )}

        {/* ------------------------------ Список ------------------------------ */}
        {loading && events.length === 0 ? (
          <EventsSkeleton />
        ) : isEmptyRoster ? (
          <div className="pt-8">
            <EmptyState
              title="Мероприятий пока нет"
              description="Календарь появится здесь после публикации этапов и анонсов."
            />
          </div>
        ) : isEmptyFiltered ? (
          <div className="pt-8">
            <EmptyState
              title="По этому фильтру ничего нет"
              description="Пока нет мероприятий соответствующего типа."
              action={
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-4 py-2 text-[13px] font-semibold text-brand transition-colors hover:bg-brand hover:text-white focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                >
                  <Check aria-hidden className="h-3.5 w-3.5" />
                  Показать все мероприятия
                </button>
              }
            />
          </div>
        ) : (
          <Reveal y={14}>
            <ul className="mt-6 space-y-3">
              {rows.map((event) => (
                <li key={event.id}>
                  <EventRow event={event} />
                </li>
              ))}
            </ul>
          </Reveal>
        )}
      </Container>
    </Section>
  )
}