import { Link, Navigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Flag,
  MapPin,
  Timer,
  Trophy,
} from 'lucide-react'
import { useQuery } from '@/hooks/useQuery'
import { fetchCircuitBySlug } from '@/lib/api'
import type { Circuit } from '@/lib/types'
import { ShareButton } from '@/components/ShareButton'
import { RaceCountdown } from '@/components/home/RaceCountdown'
import { Container, Reveal, Section, Spinner } from '@/components/ui/Layout'
import { Badge, CoverArt } from '@/components/ui/Primitives'
import { absoluteUrl } from '@/lib/share'
import { circuitHref, formatDate, isFutureDate } from '@/lib/utils'
import { usePageMeta } from '@/hooks/usePageMeta'

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string
  value: string
  hint?: string | null
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="card px-4 py-3.5 transition-colors hover:border-brand/30">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">
          {label}
        </span>
        {Icon && <Icon aria-hidden className="h-3.5 w-3.5 text-muted/60" />}
      </div>
      <div className="mt-1.5 truncate text-[22px] leading-none font-bold tabular-nums">
        {value}
      </div>
      {hint && <div className="mt-1 truncate text-[12px] text-muted">{hint}</div>}
    </div>
  )
}

export default function CircuitDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { data: circuit, loading } = useQuery(
    () => fetchCircuitBySlug(slug ?? ''),
    null as Circuit | null,
    [slug],
    slug ? `circuit:${slug}` : undefined,
  )

  usePageMeta(
    circuit?.name ?? 'Трасса',
    circuit?.description
      ? circuit.description.slice(0, 150)
      : 'Трасса календаря Bad Habit Racing.',
  )

  if (loading && !circuit) {
    return (
      <Section className="pt-16 pb-20">
        <Container className="flex justify-center">
          <Spinner className="h-8 w-8" />
        </Container>
      </Section>
    )
  }

  if (!circuit) return <Navigate to="/circuits" replace />

  const upcoming = isFutureDate(circuit.race_date)
  const shareUrl = absoluteUrl(circuitHref(circuit))

  const params: [string, string][] = [
    ['Страна', circuit.country ?? '—'],
    ['Длина круга', circuit.length_km ? `${circuit.length_km} км` : '—'],
    ['Поворотов', circuit.turns ? String(circuit.turns) : '—'],
    ['Рекорд круга', circuit.lap_record ?? '—'],
    ['Дата этапа', circuit.race_date ? formatDate(circuit.race_date) : '—'],
  ]

  return (
    <Section className="pt-6 pb-14 md:pt-10 md:pb-20">
      <Container>
        {/* ------------------------------ Назад ------------------------------ */}
        <Link
          to="/circuits"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted transition-colors hover:text-fg focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        >
          <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
          Все трассы
        </Link>

        {/* ------------------------------ Шапка ------------------------------ */}
        <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-card/40">
          <div className="relative h-52 overflow-hidden bg-surface md:h-72">
            <CoverArt
              seed={`${circuit.id}-cover`}
              title={circuit.name}
              subtitle={circuit.country ?? 'BAD HABIT RACING'}
              image={circuit.cover_url}
              className="h-full w-full"
              size="xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg/80 to-transparent"
            />
            <div className="absolute top-3 right-3 flex flex-wrap gap-2">
              {upcoming && (
                <Badge tone="brand">
                  <Flag className="mr-1 inline h-3 w-3" />
                  Скоро этап
                </Badge>
              )}
              {circuit.country && <Badge>{circuit.country}</Badge>}
            </div>
          </div>

          <div className="flex flex-wrap items-start justify-between gap-6 p-5 md:gap-8 md:p-7">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold tracking-[0.18em] text-muted uppercase">
                  Трасса · сезон 2026
                </span>
                <ShareButton
                  iconOnly
                  url={shareUrl}
                  title={`${circuit.name} — Bad Habit Racing`}
                  text={`${circuit.name} — трасса Bad Habit Racing`}
                  ariaLabel={`Поделиться трассой ${circuit.name}`}
                />
              </div>

              <h1 className="mt-2 text-[30px] leading-[1.05] font-bold tracking-[-0.03em] md:text-[44px]">
                {circuit.name}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted">
                {circuit.country && (
                  <span className="flex items-center gap-1.5">
                    <MapPin aria-hidden className="h-3.5 w-3.5 text-brand/70" />
                    {circuit.country}
                  </span>
                )}
                {circuit.race_date && (
                  <span className="flex items-center gap-1.5">
                    <CalendarDays aria-hidden className="h-3.5 w-3.5 text-brand/70" />
                    Этап: {formatDate(circuit.race_date)}
                  </span>
                )}
                {circuit.turns && (
                  <span className="flex items-center gap-1.5">
                    <Timer aria-hidden className="h-3.5 w-3.5 text-brand/70" />
                    {circuit.turns} поворотов
                  </span>
                )}
              </div>
            </div>

            {upcoming && (
              <div className="w-full max-w-sm shrink-0 md:w-72">
                <div className="card p-4">
                  <RaceCountdown circuit={circuit} divider={false} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ------------------------------ Параметры ----------------------------- */}
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile
            label="Длина круга"
            value={circuit.length_km ? `${circuit.length_km} км` : '—'}
            hint="длина круга"
            icon={MapPin}
          />
          <StatTile
            label="Поворотов"
            value={circuit.turns ? String(circuit.turns) : '—'}
            hint="конфигурация"
            icon={Timer}
          />
          <StatTile
            label="Рекорд круга"
            value={circuit.lap_record ?? '—'}
            hint="лучшее время"
            icon={Trophy}
          />
          <StatTile
            label="Дата этапа"
            value={circuit.race_date ? formatDate(circuit.race_date) : '—'}
            hint={upcoming ? 'впереди' : 'календарь сезона'}
            icon={CalendarDays}
          />
        </div>

        {/* ------------------------------ Описание + Параметры ----------------- */}
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="flex items-center gap-2 text-[18px] font-semibold">
              <Flag aria-hidden className="h-4 w-4 text-brand" />
              О трассе
            </h2>
            {circuit.description ? (
              <p className="mt-3 text-[15px] leading-relaxed text-muted">
                {circuit.description}
              </p>
            ) : (
              <p className="mt-3 text-[14px] leading-relaxed text-muted">
                Описание ещё не заполнено. Трасса будет уточняться по мере публикации календаря.
              </p>
            )}
          </div>

          <div>
            <h2 className="flex items-center gap-2 text-[18px] font-semibold">
              <Timer aria-hidden className="h-4 w-4 text-brand" />
              Параметры
            </h2>
            <dl className="mt-3 space-y-2.5 text-[14px]">
              {params.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-baseline justify-between gap-4 border-b border-line/60 pb-2.5 last:border-0 last:pb-0"
                >
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-right font-medium tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* ------------------------------ CTA ------------------------------ */}
        <Reveal className="mt-10 rounded-2xl border border-brand/25 bg-brand-soft px-5 py-5 md:px-7 md:py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-brand">Bad Habit Racing</div>
              <p className="mt-1 max-w-md text-[14px] leading-relaxed text-fg/80">
                Следите за этапами сезона: результаты заездов, таблица пилотов и записи журнала.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/standings"
                className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-4 py-2 text-[13px] font-semibold text-brand transition-colors hover:bg-brand hover:text-white focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
              >
                <Trophy aria-hidden className="h-3.5 w-3.5" />
                Таблица результатов
              </Link>
              <Link
                to="/journal"
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-[13px] font-semibold text-muted transition-colors hover:border-fg/40 hover:text-fg focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
              >
                <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
                Журнал сезона
              </Link>
            </div>
          </div>
        </Reveal>
      </Container>
    </Section>
  )
}