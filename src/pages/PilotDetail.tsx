import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  Car,
  Check,
  Copy,
  Flag,
  Medal,
  Newspaper,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'
import { QUERY_KEYS, useQuery } from '@/hooks/useQuery'
import { usePageMeta } from '@/hooks/usePageMeta'
import { fetchHallOfFame, fetchPilots, fetchPilotBySlug, fetchPosts } from '@/lib/api'
import type { HallEntry, Pilot, Post } from '@/lib/types'
import { hallKindLabel, sortHallEntries } from '@/lib/hall'
import { absoluteUrl } from '@/lib/share'
import { cn, formatDate, formatNumber, pilotHref, postHref } from '@/lib/utils'
import { Container, EmptyState, Reveal, Section } from '@/components/ui/Layout'
import { Badge, CoverArt } from '@/components/ui/Primitives'
import { Skeleton } from '@/components/ui/Skeleton'
import { ShareButton } from '@/components/ShareButton'
import { HallKindIcon } from '@/components/HallKindIcon'

/* ------------------------------- UI Primitives ------------------------------ */

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string
  value: string | number
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
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {hint && <div className="mt-1 truncate text-[12px] text-muted">{hint}</div>}
    </div>
  )
}

function HallRow({ entry }: { entry: HallEntry }) {
  return (
    <li className="group flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-fg/[0.04]">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/12 text-brand transition-transform group-hover:scale-105">
        <HallKindIcon kind={entry.kind} className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-medium">{entry.title}</div>
        <div className="text-[12px] text-muted">
          {hallKindLabel(entry.kind)}
          {entry.year ? ` · ${entry.year}` : ''}
        </div>
      </div>
    </li>
  )
}

function NeighborRow({ pilot }: { pilot: Pilot }) {
  return (
    <Link
      to={pilotHref(pilot)}
      className="group flex items-center gap-3 rounded-xl border border-line bg-card/40 px-3 py-2.5 transition-colors hover:border-brand/40 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
    >
      <CoverArt
        seed={pilot.id}
        title={pilot.name}
        subtitle={pilot.number ? `#${pilot.number}` : undefined}
        image={pilot.photo_url}
        className="h-9 w-9 shrink-0 overflow-hidden rounded-lg"
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold transition-colors group-hover:text-brand">
          {pilot.name}
        </div>
        <div className="truncate text-[11px] text-muted">
          {pilot.team_place ? `${pilot.team_place} место` : pilot.role_text ?? 'состав'}
        </div>
      </div>
      <ArrowUpRight
        aria-hidden
        className="h-3.5 w-3.5 shrink-0 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
      />
    </Link>
  )
}

function MaterialRow({ post }: { post: Post }) {
  return (
    <li>
      <Link
        to={postHref(post)}
        className="group flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-fg/[0.04] focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
      >
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/12 text-brand">
          <Newspaper aria-hidden className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-[13.5px] font-medium leading-snug transition-colors group-hover:text-brand">
            {post.title}
          </div>
          <div className="mt-0.5 text-[11px] text-muted">
            {post.published_at ? formatDate(post.published_at) : '—'}
            {post.category ? ` · ${post.category}` : ''}
          </div>
        </div>
      </Link>
    </li>
  )
}

function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard
          ?.writeText(url)
          .then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1600)
          })
          .catch(() => undefined)
      }}
      aria-label="Скопировать ссылку на профиль"
      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[12px] font-semibold text-muted transition-colors hover:border-brand/40 hover:text-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
    >
      {copied ? (
        <Check aria-hidden className="h-3.5 w-3.5 text-brand" />
      ) : (
        <Copy aria-hidden className="h-3.5 w-3.5" />
      )}
      {copied ? 'Скопировано' : 'Ссылка'}
    </button>
  )
}

/* ---------------------------------- Skeleton -------------------------------- */

function PilotSkeleton() {
  return (
    <Section className="pt-6 pb-14 md:pt-10 md:pb-20">
      <Container>
        <Skeleton className="h-4 w-24" />
        <div className="mt-5 overflow-hidden rounded-2xl border border-line">
          <Skeleton className="h-40 w-full rounded-none md:h-56" />
          <div className="grid gap-6 p-5 md:grid-cols-[auto_1fr] md:gap-8 md:p-7">
            <Skeleton className="-mt-16 h-32 w-32 rounded-2xl md:-mt-24 md:h-40 md:w-40" />
            <div className="space-y-3 pt-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-9 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      </Container>
    </Section>
  )
}

/* ---------------------------------- Page ------------------------------------ */

export default function PilotDetail() {
  const { slug = '' } = useParams<{ slug: string }>()

  const { data: pilot, loading } = useQuery(
    () => fetchPilotBySlug(slug),
    null as Pilot | null,
    [slug],
    slug ? `pilot:${slug}` : undefined,
  )
  const { data: hall } = useQuery(fetchHallOfFame, [] as HallEntry[], [], QUERY_KEYS.hall)
  const { data: pilots } = useQuery(fetchPilots, [] as Pilot[], [], QUERY_KEYS.pilots)
  const { data: posts } = useQuery(fetchPosts, [] as Post[], [], QUERY_KEYS.posts)

  const achievements = useMemo(
    () => (pilot ? sortHallEntries(hall.filter((e) => e.pilot_id === pilot.id)) : []),
    [hall, pilot],
  )
  const winsCount = useMemo(() => achievements.filter((e) => e.kind === 'win').length, [achievements])
  const podiumCount = useMemo(() => achievements.filter((e) => e.kind === 'podium').length, [achievements])
  const bestSeason = useMemo(() => {
    const years = achievements.map((e) => e.year).filter((y): y is number => typeof y === 'number')
    return years.length ? Math.max(...years) : null
  }, [achievements])
  const trophiesWeight = useMemo(() => achievements.reduce((sum, e) => sum + (e.weight ?? 0), 0), [achievements])

  const neighbors = useMemo(
    () =>
      pilot
        ? pilots
            .filter((p) => p.id !== pilot.id && !p.is_extra && p.team_place != null)
            .sort(
              (a, b) =>
                Math.abs((a.team_place ?? 99) - (pilot.team_place ?? 99)) -
                Math.abs((b.team_place ?? 99) - (pilot.team_place ?? 99)),
            )
            .slice(0, 3)
        : [],
    [pilots, pilot],
  )

  const materials = useMemo(() => {
    if (!pilot) return []
    const name = pilot.name.toLowerCase()
    const firstWord = name.split(' ')[0]
    return posts
      .filter((p) => {
        const hay = `${p.title} ${p.excerpt ?? ''}`.toLowerCase()
        return hay.includes(name) || (firstWord.length >= 4 && hay.includes(firstWord))
      })
      .slice(0, 4)
  }, [posts, pilot])

  usePageMeta(
    pilot?.name ?? 'Пилот',
    pilot?.bio ? pilot.bio.slice(0, 150) : 'Пилот команды Bad Habit Racing.',
  )

  if (loading && !pilot) return <PilotSkeleton />
  if (!pilot) return <Navigate to="/pilots" replace />

  const isExtra = Boolean(pilot.is_extra)
  const externalLinks = Object.entries(pilot.links ?? {}).filter(([, value]) => Boolean(value))
  const shareUrl = absoluteUrl(pilotHref(pilot))
  const positionPct = pilot.team_place ? Math.max(4, Math.min(100, ((8 - pilot.team_place + 1) / 8) * 100)) : 0

  const aboutRows: [string, string][] = [
    ...(isExtra ? ([['Роль', pilot.role_text ?? '—']] as [string, string][]) : []),
    ...(!isExtra
      ? ([['Позиция', pilot.team_place ? `${pilot.team_place} в команде` : '—']] as [string, string][])
      : []),
    ...(!isExtra ? ([['Баллы', formatNumber(pilot.points)]] as [string, string][]) : []),
    ['Машина', pilot.car ?? '—'],
    ...(!isExtra ? ([['Стартовый номер', pilot.number ?? '—']] as [string, string][]) : []),
    ['Страна', pilot.country ?? '—'],
    ['В команде с', formatDate(pilot.created_at)],
  ]

  return (
    <Section className="pt-6 pb-14 md:pt-10 md:pb-20">
      <Container>
        {/* ------------------------------ Навигация ------------------------------ */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/pilots"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted transition-colors hover:text-fg focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
          >
            <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
            Все пилоты
          </Link>
          <div className="flex items-center gap-2">
            <CopyLinkButton url={shareUrl} />
            <ShareButton
              iconOnly
              url={shareUrl}
              title={`${pilot.name} — Bad Habit Racing`}
              text={`${pilot.name} — пилот Bad Habit Racing`}
              ariaLabel={`Поделиться профилем ${pilot.name}`}
            />
          </div>
        </div>

        {/* ------------------------------ Шапка ------------------------------ */}
        <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-card/40">
          <div className="relative h-40 overflow-hidden bg-surface md:h-56">
            <CoverArt
              seed={`${pilot.id}-cover`}
              title={pilot.name}
              subtitle="BAD HABIT RACING"
              image={pilot.cover_url ?? pilot.photo_url}
              className="h-full w-full"
              size="xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg/80 to-transparent"
            />
            <div className="absolute top-3 right-3 flex flex-wrap gap-2">
              {pilot.featured && (
                <Badge tone="brand">
                  <Sparkles aria-hidden className="mr-1 inline h-3 w-3" />
                  Лидер сезона
                </Badge>
              )}
              {isExtra && <Badge tone="red">доп. состав</Badge>}
              {pilot.country && <Badge>{pilot.country}</Badge>}
            </div>
          </div>

          <div className="grid gap-6 p-5 md:grid-cols-[auto_1fr] md:gap-8 md:p-7">
            <div className="-mt-16 w-fit md:-mt-24">
              <CoverArt
                seed={pilot.id}
                title={pilot.name}
                subtitle={pilot.number ? `#${pilot.number}` : undefined}
                image={pilot.photo_url}
                className="h-32 w-32 rounded-2xl border-4 border-bg shadow-xl md:h-40 md:w-40"
                size="lg"
              />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {pilot.number && (
                  <span className="font-mono text-[13px] font-bold tabular-nums text-brand">
                    #{pilot.number}
                  </span>
                )}
                {pilot.featured && <Badge tone="brand">Лидер сезона</Badge>}
              </div>

              <h1 className="mt-2 text-[30px] leading-[1.05] font-bold tracking-[-0.03em] md:text-[44px]">
                {pilot.name}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted">
                {pilot.car && (
                  <span className="flex items-center gap-1.5">
                    <Car aria-hidden className="h-3.5 w-3.5 text-brand/70" />
                    {pilot.car}
                  </span>
                )}
                {pilot.country && (
                  <span className="flex items-center gap-1.5">
                    <Flag aria-hidden className="h-3.5 w-3.5 text-brand/70" />
                    {pilot.country}
                  </span>
                )}
                {pilot.team_place && !isExtra && (
                  <span className="flex items-center gap-1.5">
                    <Trophy aria-hidden className="h-3.5 w-3.5 text-brand/70" />
                    {pilot.team_place} место в команде
                  </span>
                )}
                {bestSeason && (
                  <span className="flex items-center gap-1.5">
                    <Calendar aria-hidden className="h-3.5 w-3.5 text-brand/70" />
                    лучший сезон: {bestSeason}
                  </span>
                )}
              </div>

              {pilot.role_text && (
                <div className="mt-3">
                  <span
                    className={cn(
                      'text-[14px] font-semibold tracking-[0.02em]',
                      isExtra ? 'text-brand' : 'text-[var(--color-gold)]',
                    )}
                  >
                    {pilot.role_text}
                  </span>
                </div>
              )}

              {pilot.bio && (
                <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">{pilot.bio}</p>
              )}

              {(pilot.nova_url || externalLinks.length > 0) && (
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {pilot.nova_url && (
                    <a
                      href={pilot.nova_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-[13px] font-semibold text-white shadow-[var(--shadow-card)] transition-all duration-200 hover:brightness-110 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none"
                    >
                      Nova
                      <ArrowUpRight aria-hidden className="h-4 w-4" />
                    </a>
                  )}
                  {externalLinks.map(([label, url]) => (
                    <a
                      key={label}
                      href={url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="rounded-full border border-line px-3 py-1.5 text-[12px] font-semibold text-muted transition-colors hover:border-brand/40 hover:text-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                    >
                      {label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ------------------------------ Статистика ------------------------ */}
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {isExtra ? (
            <>
              <StatTile
                label="Роль в команде"
                value={pilot.role_text ?? '—'}
                hint="дополнительный состав"
                icon={Users}
              />
              <StatTile
                label="Машина"
                value={pilot.car ?? '—'}
                hint="вне зачёта сезона"
                icon={Car}
              />
              <StatTile
                label="Трофеи"
                value={String(achievements.length)}
                hint="в зале славы"
                icon={Trophy}
              />
              <StatTile
                label="Страна"
                value={pilot.country ?? '—'}
                hint="регион пилота"
                icon={Flag}
              />
            </>
          ) : (
            <>
              <StatTile
                label="Баллы сезона"
                value={formatNumber(pilot.points)}
                hint="очки чемпионата"
                icon={Zap}
              />
              <StatTile
                label="Место в команде"
                value={pilot.team_place ? String(pilot.team_place) : '—'}
                hint="по итогам сезона"
                icon={Trophy}
              />
              <StatTile
                label="Победы"
                value={String(winsCount)}
                hint={podiumCount ? `подиумов: ${podiumCount}` : 'в зале славы'}
                icon={Medal}
              />
              <StatTile
                label="Трофеи"
                value={String(achievements.length)}
                hint={trophiesWeight > 0 ? `вес: ${trophiesWeight}` : 'в зале славы'}
                icon={Sparkles}
              />
            </>
          )}
        </div>

        {/* ------------------------------ Позиция в команде ------------------------ */}
        {!isExtra && pilot.team_place && (
          <div className="mt-4 rounded-2xl border border-line bg-card/40 p-4">
            <div className="flex items-center justify-between text-[12px] font-semibold text-muted">
              <span>Позиция в команде</span>
              <span className="tabular-nums text-fg">{pilot.team_place} место</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-fg/5">
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-500"
                style={{ width: `${positionPct}%` }}
              />
            </div>
          </div>
        )}

        {/* ------------------------------ Достижения и о пилоте ------------------------ */}
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="flex items-center gap-2 text-[18px] font-semibold">
              <Trophy aria-hidden className="h-4 w-4 text-brand" />
              Достижения
              {achievements.length > 0 && (
                <span className="ml-1 rounded-md bg-fg/5 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-muted">
                  {achievements.length}
                </span>
              )}
            </h2>
            {achievements.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="Пока без трофеев"
                  description="Записи о победах и рекордах появятся в зале славы."
                />
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-line/60">
                {achievements.map((entry) => (
                  <HallRow key={entry.id} entry={entry} />
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="flex items-center gap-2 text-[18px] font-semibold">
              <Car aria-hidden className="h-4 w-4 text-brand" />
              О пилоте
            </h2>
            <dl className="mt-3 space-y-2.5 text-[14px]">
              {aboutRows.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-baseline justify-between gap-4 border-b border-line/60 pb-2.5"
                >
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-right font-medium tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* ------------------------------ Рядом и материалы ------------------------ */}
        {(neighbors.length > 0 || materials.length > 0) && (
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {neighbors.length > 0 && (
              <div>
                <h2 className="flex items-center gap-2 text-[18px] font-semibold">
                  <Users aria-hidden className="h-4 w-4 text-brand" />
                  Рядом в команде
                </h2>
                <div className="mt-3 space-y-2">
                  {neighbors.map((neighbor) => (
                    <NeighborRow key={neighbor.id} pilot={neighbor} />
                  ))}
                </div>
              </div>
            )}

            {materials.length > 0 && (
              <div>
                <h2 className="flex items-center gap-2 text-[18px] font-semibold">
                  <Newspaper aria-hidden className="h-4 w-4 text-brand" />
                  Материалы о пилоте
                </h2>
                <ul className="mt-3 divide-y divide-line/60">
                  {materials.map((post) => (
                    <MaterialRow key={post.id} post={post} />
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------ CTA ------------------------------ */}
        <Reveal className="mt-10 rounded-2xl border border-brand/25 bg-brand-soft px-5 py-5 md:px-7 md:py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-brand">Bad Habit Racing</div>
              <p className="mt-1 max-w-md text-[14px] leading-relaxed text-fg/80">
                Следите за выступлениями пилота: календарь трасс, результаты и записи журнала сезона.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/circuits"
                className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-4 py-2 text-[13px] font-semibold text-brand transition-colors hover:bg-brand hover:text-white focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
              >
                <Calendar aria-hidden className="h-3.5 w-3.5" />
                Календарь трасс
              </Link>
              <Link
                to="/journal"
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-[13px] font-semibold text-muted transition-colors hover:border-fg/40 hover:text-fg focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
              >
                <Newspaper aria-hidden className="h-3.5 w-3.5" />
                Журнал сезона
              </Link>
            </div>
          </div>
        </Reveal>
      </Container>
    </Section>
  )
}