import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Award,
  CalendarRange,
  Check,
  Filter,
  Newspaper,
  RotateCcw,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react'
import { QUERY_KEYS, useQuery } from '@/hooks/useQuery'
import { fetchHallOfFame } from '@/lib/api'
import { HALL_KINDS } from '@/lib/constants'
import { hallKindLabel, sortHallEntries } from '@/lib/hall'
import type { HallEntry } from '@/lib/types'
import { Container, EmptyState, Section } from '@/components/ui/Layout'
import { HallKindIcon } from '@/components/HallKindIcon'
import { Avatar } from '@/components/ui/Primitives'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn, pilotHref } from '@/lib/utils'
import { usePageMeta } from '@/hooks/usePageMeta'

/* ------------------------------- pluralization ------------------------------- */

const pluralRecords = (n: number) => {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'достижение'
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'достижения'
  return 'достижений'
}

/* --------------------------------- FilterChip -------------------------------- */

function FilterChip({
  active,
  onClick,
  children,
  count,
  mono = false,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  count?: number
  mono?: boolean
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition-colors',
        'focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none',
        active
          ? 'border-brand bg-brand text-bg shadow-[0_0_0_1px_var(--color-brand)]'
          : 'border-line bg-card/40 text-muted hover:border-brand/40 hover:text-fg',
        mono && 'font-mono tabular-nums',
      )}
    >
      {active && !mono && <Check className="h-3 w-3" />}
      {children}
      {typeof count === 'number' && count > 0 && (
        <span
          className={cn(
            'rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
            active ? 'bg-bg/20 text-bg' : 'bg-fg/5 text-muted',
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}

/* --------------------------------- Skeletons --------------------------------- */

function HallSkeleton() {
  return (
    <ol className="mt-6 divide-y divide-line/60 border-t border-line/60">
      {Array.from({ length: 8 }).map((_, i) => (
        <li key={i} className="flex items-center gap-4 py-3.5">
          <Skeleton className="h-4 w-6" />
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-3 w-10" />
        </li>
      ))}
    </ol>
  )
}

/* ---------------------------------- Entry ------------------------------------ */

/** Медальный акцент топ-3 — только за счёт UI, без изменений в БД. */
const PODIUM_STYLES = [
  'bg-gradient-to-br from-amber-400/25 to-amber-500/10 text-amber-400 ring-1 ring-amber-400/30',
  'bg-gradient-to-br from-zinc-300/25 to-zinc-400/10 text-zinc-300 ring-1 ring-zinc-300/30',
  'bg-gradient-to-br from-amber-700/25 to-amber-800/10 text-amber-500 ring-1 ring-amber-700/30',
]

function HallRow({
  entry,
  index,
  isPodium,
}: {
  entry: HallEntry
  index: number
  isPodium: boolean
}) {
  const hasWeight = (entry.weight ?? 0) > 0

  return (
    <li>
      <article
        className={cn(
          'group -mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition-colors sm:gap-4 sm:px-3',
          'hover:bg-fg/[0.04] focus-within:bg-fg/[0.04]',
        )}
      >
        {/* Rank */}
        <span
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold tabular-nums transition-transform group-hover:scale-105',
            isPodium ? PODIUM_STYLES[index] : 'bg-surface text-muted',
          )}
          aria-hidden
        >
          {index + 1}
        </span>

        {/* Kind icon */}
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-bg text-brand">
          <HallKindIcon kind={entry.kind} className="h-4 w-4" />
        </span>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold leading-snug text-fg transition-colors group-hover:text-brand">
            <span className="truncate">{entry.title}</span>
            {hasWeight && (
              <span
                aria-label="Ключевое достижение"
                title="Ключевое достижение"
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
              />
            )}
          </h2>

          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-muted">
            <span className="inline-flex items-center gap-1">
              <HallKindIcon kind={entry.kind} className="h-3 w-3" />
              {hallKindLabel(entry.kind)}
            </span>
            {entry.place && (
              <>
                <span aria-hidden>·</span>
                <span className="truncate">{entry.place}</span>
              </>
            )}
            {entry.pilot && (
              <>
                <span aria-hidden>·</span>
                <Link
                  to={pilotHref(entry.pilot)}
                  className="inline-flex min-w-0 items-center gap-1.5 rounded-full transition-colors hover:text-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                >
                  <Avatar
                    name={entry.pilot.name}
                    image={entry.pilot.photo_url}
                    className="h-4 w-4 text-[8px]"
                  />
                  <span className="truncate">{entry.pilot.name}</span>
                </Link>
              </>
            )}
            {entry.source && (
              <>
                <span aria-hidden className="hidden sm:inline">
                  ·
                </span>
                <span className="hidden truncate sm:inline">{entry.source}</span>
              </>
            )}
          </p>

          {entry.body && (
            <p className="mt-1 line-clamp-1 text-[12px] text-muted/80">{entry.body}</p>
          )}
        </div>

        {/* Year */}
        <span className="w-12 shrink-0 text-right font-mono text-[12px] tabular-nums text-muted">
          {entry.year ?? '—'}
        </span>
      </article>
    </li>
  )
}

/* ----------------------------------- Page ------------------------------------ */

export default function Hall() {
  usePageMeta(
    'Зал славы',
    'Победы, подиумы, рекорды и пресса пилотов Bad Habit Racing.',
  )
  const { data: raw, loading } = useQuery(
    fetchHallOfFame,
    [] as HallEntry[],
    [],
    QUERY_KEYS.hall,
  )
  const [kind, setKind] = useState('all')
  const [year, setYear] = useState('all')

  const entries = useMemo(() => sortHallEntries(raw), [raw])

  const kindCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const entry of entries) counts[entry.kind] = (counts[entry.kind] ?? 0) + 1
    return counts
  }, [entries])

  const kinds = useMemo(() => HALL_KINDS.filter((k) => kindCounts[k.id]), [kindCounts])

  const years = useMemo(
    () =>
      Array.from(new Set(entries.map((e) => e.year).filter((y): y is number => y != null))).sort(
        (a, b) => b - a,
      ),
    [entries],
  )

  const filtered = useMemo(() => {
    let list = entries
    if (kind !== 'all') list = list.filter((entry) => entry.kind === kind)
    if (year !== 'all') list = list.filter((entry) => String(entry.year) === year)
    return list
  }, [entries, kind, year])

  const hasFilters = kind !== 'all' || year !== 'all'
  const resetFilters = () => {
    setKind('all')
    setYear('all')
  }

  const period = years.length > 0 ? `${years[years.length - 1]}—${years[0]}` : null

  const isEmptyRoster = entries.length === 0
  const isEmptyFiltered = !isEmptyRoster && filtered.length === 0

  return (
    <Section className="pt-8 pb-20 md:pt-12 md:pb-24">
      <Container>
        {/* ------------------------------- Шапка ------------------------------- */}
        <header className="border-b border-line pb-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-[28px] font-bold tracking-[-0.03em] md:text-[40px]">
                Зал славы
              </h1>
              {entries.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card/60 px-3 py-1 text-[12px] font-semibold text-muted">
                    <Trophy className="h-3.5 w-3.5 text-brand" />
                    <span className="tabular-nums text-fg">{entries.length}</span>{' '}
                    {pluralRecords(entries.length)}
                  </span>
                  {period && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card/60 px-3 py-1 text-[12px] font-semibold text-muted">
                      <CalendarRange className="h-3.5 w-3.5 text-brand" />
                      <span className="tabular-nums text-fg">{period}</span>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card/60 px-3 py-1 text-[12px] font-semibold text-muted">
                    <Sparkles className="h-3.5 w-3.5 text-brand" />
                    <span className="tabular-nums text-fg">{kinds.length}</span> категорий
                  </span>
                </div>
              )}
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-card/60 px-3.5 text-[12px] font-semibold text-muted transition-colors hover:border-brand/40 hover:text-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
              >
                <RotateCcw className="h-3.5 w-3.5 transition-transform group-hover:-rotate-45" />
                Сбросить
              </button>
            )}
          </div>
        </header>

        {/* ------------------------------ Фильтры ------------------------------ */}
        {(kinds.length > 1 || years.length > 1) && (
          <nav
            aria-label="Фильтры зала славы"
            className="border-b border-line/60 py-4"
          >
            {kinds.length > 1 && (
              <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-2 sm:-mx-0 sm:px-0">
                <FilterChip
                  active={kind === 'all'}
                  onClick={() => setKind('all')}
                  count={entries.length}
                >
                  Все
                </FilterChip>
                {kinds.map((k) => (
                  <FilterChip
                    key={k.id}
                    active={kind === k.id}
                    onClick={() => setKind(k.id)}
                    count={kindCounts[k.id]}
                  >
                    <HallKindIcon kind={k.id} className="h-3 w-3" />
                    {k.label}
                  </FilterChip>
                ))}
              </div>
            )}

            {years.length > 1 && (
              <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 sm:-mx-0 sm:px-0">
                <FilterChip
                  active={year === 'all'}
                  onClick={() => setYear('all')}
                  mono
                >
                  Все годы
                </FilterChip>
                {years.map((y) => (
                  <FilterChip
                    key={y}
                    active={year === String(y)}
                    onClick={() => setYear(String(y))}
                    mono
                  >
                    {y}
                  </FilterChip>
                ))}
              </div>
            )}
          </nav>
        )}

        {/* ------------------------------ Список ------------------------------- */}
        {loading && entries.length === 0 ? (
          <HallSkeleton />
        ) : isEmptyRoster ? (
          <div className="pt-8">
            <EmptyState
              title="Зал пока пуст"
              description="Первые достижения появятся здесь после публикации."
            />
          </div>
        ) : isEmptyFiltered ? (
          <div className="pt-8">
            <EmptyState
              title="Ничего не найдено"
              description="Попробуйте другую категорию или год — или покажите все записи."
              action={
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-4 py-2 text-[13px] font-semibold text-brand transition-colors hover:bg-brand hover:text-white focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                >
                  <X className="h-3.5 w-3.5" />
                  Показать все
                </button>
              }
            />
          </div>
        ) : (
          <>
            {hasFilters && (
              <div className="flex items-center justify-between pt-4 text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">
                <span className="tabular-nums">
                  {filtered.length} из {entries.length}
                </span>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 transition-colors hover:text-fg"
                >
                  <Filter className="h-3 w-3" />
                  Сбросить
                </button>
              </div>
            )}

            <ol className="mt-2 divide-y divide-line/60 border-t border-line/60">
              {filtered.map((entry, i) => (
                <HallRow
                  key={entry.id}
                  entry={entry}
                  index={i}
                  isPodium={i < 3 && !hasFilters}
                />
              ))}
            </ol>
          </>
        )}

        {/* -------------------------- Футер-подсказка -------------------------- */}
        {entries.length > 0 && !hasFilters && (
          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-[13px] text-muted">
            <span className="flex items-center gap-2">
              <Award className="h-4 w-4 text-brand/70" />
              Медальный акцент — топ-3 по весу достижения
            </span>
            <Link
              to="/journal"
              className="group inline-flex items-center gap-1 font-semibold text-brand transition-colors hover:text-fg focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
              <Newspaper className="h-3.5 w-3.5" />
              Читать журнал
            </Link>
          </div>
        )}
      </Container>
    </Section>
  )
}