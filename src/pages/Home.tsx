import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  Car,
  ChevronRight,
  Flag,
  RefreshCw,
  Trophy,
} from 'lucide-react'
import { useSite } from '@/context/SiteContext'
import { QUERY_KEYS, useQuery } from '@/hooks/useQuery'
import { fetchCircuits, fetchHallOfFame, fetchNews, fetchPilots, fetchStats } from '@/lib/api'
import type { Circuit, HallEntry, Pilot, Post } from '@/lib/types'
import { hallKindLabel } from '@/lib/hall'
import { HallKindIcon } from '@/components/HallKindIcon'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Container, EmptyState, Reveal, Section, SectionHeading, Stat } from '@/components/ui/Layout'
import { CoverArt } from '@/components/ui/Primitives'
import { AdTile } from '@/components/home/AdTile'
import { PilotsTicker } from '@/components/home/PilotsTicker'
import { BhrPlate } from '@/components/BhrPlate'
import { RaceWeatherCard } from '@/components/home/RaceWeather'
import { StandingsPreview } from '@/components/home/StandingsPreview'
import { PilotCard } from '@/components/cards/PilotCard'
import { CircuitCard } from '@/components/cards/CircuitCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDate, formatNumber, isFutureDate, pilotHref, postHref } from '@/lib/utils'
import { RadioPlayer } from '@/components/RadioPlayer'
import { nextCircuit } from '@/lib/race'
import { usePageMeta } from '@/hooks/usePageMeta'
import { SkeletonGrid, SkeletonNewsList } from '@/components/ui/Skeleton'

/* ================================= decor ==================================== */

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
      <rect
        x="0"
        y="0"
        width="40"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.5"
        opacity="0.4"
      />
    </svg>
  )
}

function StartLine({ className }: { className?: string }) {
  return (
    <div aria-hidden className={'flex items-center gap-3 ' + (className ?? '')}>
      <span className="h-[2px] flex-1 rounded-full bg-[repeating-linear-gradient(90deg,var(--color-brand,#d23c46)_0_6px,transparent_6px_12px)] opacity-40" />
      <Car className="h-4 w-4 shrink-0 text-brand" />
    </div>
  )
}

function CheckerDivider({ className }: { className?: string }) {
  return (
    <div aria-hidden className={'flex items-center ' + (className ?? '')}>
      <span className="h-px flex-1 bg-line/60" />
      <CheckerFlag className="mx-3 h-3 w-6 text-muted/50" />
      <span className="h-px flex-1 bg-line/60" />
    </div>
  )
}

/* ================================= atoms ==================================== */

function MetaChip({
  icon: Icon,
  children,
  accent = false,
}: {
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  accent?: boolean
}) {
  return (
    <span
      className={
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold ' +
        (accent
          ? 'border-brand/30 bg-brand/10 text-brand'
          : 'border-line bg-card/60 text-muted')
      }
    >
      {Icon && <Icon aria-hidden className="h-3.5 w-3.5 text-brand" />}
      {children}
    </span>
  )
}

function NextRaceStrip({ name, date }: { name: string; date: string }) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-brand/30 bg-brand/[0.06] px-3.5 py-2 text-[12px]">
      <span className="inline-flex items-center gap-1.5 font-semibold text-brand">
        <Flag aria-hidden className="h-3.5 w-3.5" />
        Следующий этап
      </span>
      <span aria-hidden className="text-muted/60">
        ·
      </span>
      <span className="truncate font-medium text-fg">{name}</span>
      <span className="tabular-nums text-muted">{date}</span>
      <Car aria-hidden className="h-3.5 w-3.5 text-brand/70" />
    </div>
  )
}

function NewsRow({ post }: { post: Post }) {
  return (
    <li>
      <Link
        to={postHref(post)}
        className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-fg/[0.04] focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none sm:gap-4 sm:px-3"
      >
        <CoverArt
          seed={post.id}
          title={post.title}
          subtitle={post.category ?? undefined}
          image={post.cover_url}
          className="h-14 w-14 shrink-0 overflow-hidden rounded-xl ring-1 ring-line/60 transition-transform duration-500 group-hover:scale-[1.04]"
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold leading-snug text-fg transition-colors group-hover:text-brand">
            {post.title}
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-muted">
            <span className="tabular-nums">{formatDate(post.published_at)}</span>
            {post.category && (
              <>
                <span aria-hidden>·</span>
                <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-brand uppercase">
                  {post.category}
                </span>
              </>
            )}
          </p>
          {post.excerpt && (
            <p className="mt-1 line-clamp-1 text-[12px] text-muted/90">{post.excerpt}</p>
          )}
        </div>
        <ChevronRight
          aria-hidden
          className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand"
        />
      </Link>
    </li>
  )
}

function HallRow({ entry }: { entry: HallEntry }) {
  return (
    <div className="card group relative flex items-center gap-3 p-4 transition-colors hover:border-brand/30 hover:bg-fg/[0.03]">
      <Link
        to="/hall"
        aria-label={`Открыть зал славы: ${entry.title}`}
        className="absolute inset-0 rounded-[inherit] focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
      />
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/12 text-brand transition-transform group-hover:scale-105">
        <HallKindIcon kind={entry.kind} className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold text-fg">{entry.title}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
          <span>{hallKindLabel(entry.kind)}</span>
          {entry.year && (
            <>
              <span aria-hidden>·</span>
              <span className="tabular-nums">{entry.year}</span>
            </>
          )}
          {entry.pilot && (
            <>
              <span aria-hidden>·</span>
              <Link
                to={pilotHref(entry.pilot)}
                className="relative z-10 font-semibold text-brand transition-colors hover:text-fg focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
              >
                {entry.pilot.name}
              </Link>
            </>
          )}
        </div>
      </div>
      <Trophy
        aria-hidden
        className="h-4 w-4 shrink-0 text-brand/70 transition-colors group-hover:text-brand"
      />
    </div>
  )
}

function HomeFooter() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-5 text-[13px] text-muted">
      <span className="flex items-center gap-2">
        <Car aria-hidden className="h-4 w-4 text-brand/70" />
        Bad Habit Racing · сезон 2026
      </span>
      <Link
        to="/journal"
        className="font-semibold text-brand transition-colors hover:text-fg focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
      >
        Журнал сезона
      </Link>
    </div>
  )
}

/* =============================== skeletons ================================== */

function HeroSkeleton() {
  return (
    <Section className="pt-8 pb-10 md:pt-12 md:pb-14">
      <Container>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end lg:gap-12">
          <div className="space-y-4">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-12 w-4/5" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <div className="flex gap-3 pt-2">
              <Skeleton className="h-12 w-32 rounded-full" />
              <Skeleton className="h-12 w-40 rounded-full" />
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="aspect-[498/322] w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        </div>
      </Container>
    </Section>
  )
}

function PreviewSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:gap-5">
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  )
}

function HallSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-20 rounded-2xl" />
      ))}
    </div>
  )
}

/* ================================ page ====================================== */

export default function Home() {
  usePageMeta(
    'Главная',
    'Bad Habit Racing: пилоты, календарь трасс, лента новостей, журнал сезона и зал славы гоночной команды.',
    '/og.png',
  )

  const { site } = useSite()

  const { data: pilots, loading: loadingPilots, error: errorPilots, refetch: refetchPilots } = useQuery(
    fetchPilots,
    [] as Pilot[],
    [],
    QUERY_KEYS.pilots,
  )
  const { data: circuits, loading: loadingCircuits, error: errorCircuits, refetch: refetchCircuits } = useQuery(
    fetchCircuits,
    [] as Circuit[],
    [],
    QUERY_KEYS.circuits,
  )
  const { data: news, loading: loadingNews, error: errorNews, refetch: refetchNews } = useQuery(
    fetchNews,
    [] as Post[],
    [],
    `${QUERY_KEYS.posts}:news`,
  )
  const { data: hall } = useQuery(fetchHallOfFame, [] as HallEntry[], [], QUERY_KEYS.hall)
  const { data: stats } = useQuery(fetchStats, [] as { label: string; value: string }[], [], QUERY_KEYS.stats)

  const [heroBroken, setHeroBroken] = useState(false)

  const roster = useMemo(
    () =>
      [...pilots].sort(
        (a, b) =>
          Number(a.is_extra) - Number(b.is_extra) ||
          (a.team_place ?? 99) - (b.team_place ?? 99) ||
          (b.points ?? 0) - (a.points ?? 0),
      ),
    [pilots],
  )

  const calendar = useMemo(() => {
    const sorted = [...circuits].sort((a, b) => a.position - b.position)
    const upcoming = sorted.filter((c) => isFutureDate(c.race_date))
    return (upcoming.length > 0 ? upcoming : sorted).slice(0, 3)
  }, [circuits])

  const newsRows = useMemo(() => news.slice(0, 5), [news])
  const hallRows = useMemo(
    () => [...hall].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0)).slice(0, 4),
    [hall],
  )
  const nextRace = useMemo(() => nextCircuit(circuits), [circuits])

  const pointsTotal = useMemo(
    () => roster.reduce((sum, p) => sum + (p.is_extra ? 0 : Number(p.points) || 0), 0),
    [roster],
  )

  const loading = loadingPilots || loadingCircuits || loadingNews
  const fatalError = Boolean(errorPilots || errorCircuits || errorNews)

  const handleRetry = () => {
    void refetchPilots()
    void refetchCircuits()
    void refetchNews()
  }

  if (loading && pilots.length === 0 && circuits.length === 0 && news.length === 0) {
    return (
      <>
        <HeroSkeleton />
        <Section className="py-6 md:py-8">
          <Container>
            <RadioPlayer />
          </Container>
        </Section>
        <Section className="py-10 md:py-14">
          <Container>
            <PreviewSkeleton />
          </Container>
        </Section>
      </>
    )
  }

  if (fatalError) {
    return (
      <Section className="pt-12 pb-20 md:pt-20">
        <Container className="max-w-xl">
          <EmptyState
            title="Не удалось загрузить данные"
            description="Проверьте соединение и попробуйте снова."
            action={
              <Button type="button" size="sm" variant="brand" onClick={handleRetry}>
                <RefreshCw aria-hidden className="h-3.5 w-3.5" />
                Повторить
              </Button>
            }
          />
        </Container>
      </Section>
    )
  }

  return (
    <>
      {/* ------------------------------ HERO ------------------------------ */}
      <Section className="relative pt-8 pb-10 md:pt-12 md:pb-14">
        <CarSilhouette className="pointer-events-none absolute -top-2 right-0 hidden h-[140px] w-[380px] text-brand opacity-[0.05] lg:block" />

        <Container>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end lg:gap-12">
            <div className="relative min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand" />
                Bad Habit Racing · сезон 2026
              </div>

              <h1 className="mt-3 text-[clamp(2rem,5.6vw,3.4rem)] leading-[0.98] font-bold tracking-[-0.035em] text-balance">
                Держим темп на каждом круге
              </h1>

              <StartLine className="mt-4 max-w-md" />

              <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-muted md:text-[15px]">
                Гоночная команда Bad Habit Racing: состав пилотов, календарь трасс, лента новостей сезона,
                журнал и зал славы команды.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-2.5">
                <ButtonLink to="/pilots" size="lg">
                  Пилоты <ArrowRight className="h-4 w-4" />
                </ButtonLink>
                <ButtonLink to="/circuits" size="lg" variant="outline">
                  Календарь трасс
                </ButtonLink>
                {site.nova_url && (
                  <ButtonLink to={site.nova_url} size="lg" variant="outline">
                    {site.nova_label || 'Мы в NOVA'} <ArrowUpRight className="h-4 w-4" />
                  </ButtonLink>
                )}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <MetaChip icon={Car}>
                  <span className="tabular-nums text-fg">{roster.length}</span> пилотов
                </MetaChip>
                <MetaChip icon={Flag}>
                  <span className="tabular-nums text-fg">{circuits.length}</span> трасс
                </MetaChip>
                <MetaChip icon={Trophy}>
                  <span className="tabular-nums text-fg">{hall.length}</span> трофеев
                </MetaChip>
              </div>

              {nextRace && isFutureDate(nextRace.race_date) && (
                <NextRaceStrip name={nextRace.name} date={formatDate(nextRace.race_date)} />
              )}
            </div>

            <Reveal delay={0.06} className="w-full lg:w-auto">
              <div className="relative aspect-[498/322] w-full overflow-hidden rounded-2xl border border-brand/25 bg-surface">
                {!heroBroken ? (
                  <>
                    <img
                      src="/gifs/hero-cover.jpg"
                      alt="Гоночный болид Bad Habit Racing на стартовой прямой"
                      fetchPriority="high"
                      decoding="async"
                      onError={() => setHeroBroken(true)}
                      className="pointer-events-none absolute inset-0 h-full w-full object-cover select-none"
                    />
                    <img
                      src="/gifs/hero.gif"
                      alt=""
                      aria-hidden
                      loading="lazy"
                      decoding="async"
                      onLoad={(e) => {
                        e.currentTarget.style.opacity = '1'
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                      className="gif-overlay pointer-events-none absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 select-none"
                    />
                  </>
                ) : (
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-br from-brand/25 via-transparent to-brand/10"
                  />
                )}
              </div>

              <div className="mt-3 overflow-hidden rounded-2xl border border-brand/25">
                <div className="brand-gradient relative px-5 py-6 text-white md:px-6 md:py-7">
                  <div aria-hidden className="grid-lines absolute inset-0 opacity-25 mix-blend-overlay" />
                  <div aria-hidden className="noise absolute inset-0 opacity-[0.12] mix-blend-overlay" />
                  <CheckerFlag className="pointer-events-none absolute top-4 right-4 h-4 w-8 text-white/60" />
                  <div className="relative">
                    <div className="text-[11px] font-semibold tracking-[0.2em] uppercase opacity-80">
                      Bad Habit Racing
                    </div>
                    <div className="mt-2 text-[28px] leading-none font-bold tracking-[-0.03em]">
                      BHR
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/25 pt-4">
                      {[
                        ['Пилотов', String(roster.length)],
                        ['Трасс', String(circuits.length)],
                        ['Баллов', formatNumber(pointsTotal)],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <div className="text-[20px] leading-none font-bold tabular-nums">
                            {value}
                          </div>
                          <div className="mt-1 text-[10px] tracking-[0.14em] uppercase opacity-75">
                            {label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          <div className="mt-6">
            <PilotsTicker />
          </div>
        </Container>
      </Section>

      {/* ------------------------------ RADIO ------------------------------ */}
      <Section className="py-6 md:py-8">
        <Container>
          <RadioPlayer />
        </Container>
      </Section>

      {/* ---------------------- PREVIEW: зачёт + погода ---------------------- */}
      <Section className="py-10 md:py-14">
        <Container>
          <div className="grid gap-4 md:grid-cols-2 lg:gap-5">
            <Reveal>
              <StandingsPreview pilots={roster} />
            </Reveal>
            <Reveal delay={0.06}>
              <RaceWeatherCard circuit={nextRace} />
            </Reveal>
          </div>
        </Container>
      </Section>

      {/* ------------------------------ СВОДКА ------------------------------ */}
      {stats.length > 0 && (
        <Section className="py-10 md:py-14">
          <Container>
            <Reveal>
              <div className="card grid grid-cols-1 gap-6 p-5 sm:grid-cols-3 sm:p-7">
                {stats.map((item) => (
                  <Stat key={item.label} value={item.value} label={item.label} />
                ))}
              </div>
            </Reveal>
          </Container>
        </Section>
      )}

      {/* --------------------------- ФИНИШ КРУГА ---------------------------- */}
      <Container>
        <CheckerDivider />
      </Container>

      {/* ------------------------------ ПИЛОТЫ ------------------------------ */}
      <Section className="py-10 md:py-14">
        <Container>
          <SectionHeading
            eyebrow="Pilots"
            title="Пилоты"
            description="Баллы сезона, места в команде и машины — весь состав в одном месте."
            className="mb-5 md:mb-6"
            action={
              <ButtonLink to="/pilots" variant="outline" size="md">
                Весь состав <ArrowRight className="h-4 w-4" />
              </ButtonLink>
            }
          />

          {loadingPilots && roster.length === 0 ? (
            <SkeletonGrid count={6} />
          ) : roster.length === 0 ? (
            <EmptyState
              title="Состав пока пуст"
              description="Пилоты появятся здесь, как только будет опубликован состав сезона."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {roster.slice(0, 6).map((pilot, i) => (
                <Reveal key={pilot.id} delay={Math.min(i, 2) * 0.04} y={14}>
                  <PilotCard pilot={pilot} />
                </Reveal>
              ))}
            </div>
          )}
        </Container>
      </Section>

      {/* ------------------------------ ТРАССЫ ------------------------------ */}
      <Section className="py-10 md:py-14">
        <Container>
          <SectionHeading
            eyebrow="Calendar"
            title="Календарь трасс"
            description="Длина круга, повороты, рекорды и даты этапов сезона."
            className="mb-5 md:mb-6"
            action={
              <ButtonLink to="/circuits" variant="outline" size="md">
                Все трассы <ArrowRight className="h-4 w-4" />
              </ButtonLink>
            }
          />

          {loadingCircuits && calendar.length === 0 ? (
            <SkeletonGrid count={3} />
          ) : calendar.length === 0 ? (
            <EmptyState
              title="Календарь пока пуст"
              description="Этапы сезона появятся здесь после публикации календаря."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {calendar.map((circuit, i) => (
                <Reveal key={circuit.id} delay={Math.min(i, 2) * 0.04} y={14}>
                  <CircuitCard circuit={circuit} />
                </Reveal>
              ))}
            </div>
          )}
        </Container>
      </Section>

      {/* --------------------------- ЛЕНТА НОВОСТЕЙ ------------------------- */}
      <Section className="py-10 md:py-14">
        <Container>
          <SectionHeading
            eyebrow="News"
            title="Лента новостей"
            description="Короткие сообщения команды: результаты, составы и объявления."
            className="mb-5 md:mb-6"
            action={
              <ButtonLink to="/journal" variant="outline" size="md">
                Весь журнал <ArrowRight className="h-4 w-4" />
              </ButtonLink>
            }
          />

          {loadingNews && newsRows.length === 0 ? (
            <SkeletonNewsList count={5} />
          ) : newsRows.length === 0 ? (
            <EmptyState
              title="Новостей пока нет"
              description="Лента появится здесь, как только команда опубликует первые новости сезона."
            />
          ) : (
            <ul className="divide-y divide-line/60 border-t border-line/60">
              {newsRows.map((post) => (
                <NewsRow key={post.id} post={post} />
              ))}
            </ul>
          )}
        </Container>
      </Section>

      {/* ------------------------------ ЗАЛ СЛАВЫ --------------------------- */}
      {hall.length > 0 && (
        <Section className="py-10 md:py-14">
          <Container>
            <SectionHeading
              eyebrow="Hall of Fame"
              title="Зал славы"
              description="Победы, подиумы, рекорды и титулы команды."
              className="mb-5 md:mb-6"
              action={
                <ButtonLink to="/hall" variant="outline" size="md">
                  Все трофеи <ArrowRight className="h-4 w-4" />
                </ButtonLink>
              }
            />

            {hallRows.length === 0 ? (
              <HallSkeleton />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {hallRows.map((entry) => (
                  <Reveal key={entry.id} delay={0} y={12}>
                    <HallRow entry={entry} />
                  </Reveal>
                ))}
              </div>
            )}
          </Container>
        </Section>
      )}

      {/* --------------------- ПРОМО + РЕКЛАМА + ФУТЕР ---------------------- */}
      <Section className="py-10 md:py-14">
        <Container className="space-y-4">
          <BhrPlate
            text="Реклама на сайте команды: размещайте баннеры в ленте главной и на страницах журнала."
            action={
              <ButtonLink to="/ads" size="md">
                Заказать рекламу <ArrowRight className="h-4 w-4" />
              </ButtonLink>
            }
          />
          <AdTile />
          <HomeFooter />
        </Container>
      </Section>
    </>
  )
}