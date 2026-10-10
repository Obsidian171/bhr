import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowUpRight, MapPin, Megaphone, Sparkles, Zap } from 'lucide-react'
import { QUERY_KEYS, useQuery } from '@/hooks/useQuery'
import { fetchActiveAdBanners, fetchCircuits, fetchHallOfFame, fetchPilots } from '@/lib/api'
import type { AdBanner, Circuit, HallEntry, Pilot } from '@/lib/types'
import { CoverArt } from '@/components/ui/Primitives'
import { cn, formatNumber, gradientFromSeed, pilotHref } from '@/lib/utils'

const SLIDE_MS = 6000

interface Slide {
  pilot: Pilot
  tracks: string[]
}

type RotationItem = { kind: 'pilot'; slide: Slide } | { kind: 'ad'; banner: AdBanner }

/**
 * Небольшой виджет-«шапка» на главной: пилоты показываются по очереди —
 * имя, мини-описание, баллы сезона и трассы, где пилот участвовал.
 * Ротация идёт через раз с рекламой: пилот → баннер → пилот → баннер.
 * Трассы берутся из записей Зала славы пилота: если в названии или тексте
 * достижения упоминается трасса из календаря — она попадает в список.
 */
export function PilotsTicker() {
  const reduced = useReducedMotion()
  const { data: pilots } = useQuery(fetchPilots, [] as Pilot[], [], QUERY_KEYS.pilots)
  const { data: circuits } = useQuery(fetchCircuits, [] as Circuit[], [], QUERY_KEYS.circuits)
  const { data: hall } = useQuery(fetchHallOfFame, [] as HallEntry[], [], QUERY_KEYS.hall)
  const { data: banners } = useQuery(fetchActiveAdBanners, [] as AdBanner[], [], QUERY_KEYS.adBanners)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const slides = useMemo<Slide[]>(() => {
    const circuitNames = circuits.map((c) => c.name?.trim()).filter(Boolean)
    const lookup = new Map(circuitNames.map((name) => [name.toLowerCase(), name]))

    return [...pilots]
      .filter((p) => !p.is_extra)
      .sort(
        (a, b) =>
          (a.team_place ?? 99) - (b.team_place ?? 99) || (b.points ?? 0) - (a.points ?? 0),
      )
      .map((pilot) => {
        const tracks: string[] = []
        for (const entry of hall) {
          if (entry.pilot_id !== pilot.id) continue
          const hay = `${entry.title} ${entry.body ?? ''}`.toLowerCase()
          for (const [lower, display] of lookup) {
            if (lower.length >= 3 && hay.includes(lower) && !tracks.includes(display)) {
              tracks.push(display)
            }
          }
        }
        return { pilot, tracks }
      })
  }, [pilots, circuits, hall])

  // Ротация через раз: пилот → баннер. Баннеров нет — только пилоты.
  const rotation = useMemo<RotationItem[]>(() => {
    const items: RotationItem[] = []
    let adSeq = 0
    for (const slide of slides) {
      items.push({ kind: 'pilot', slide })
      if (banners.length > 0) {
        items.push({ kind: 'ad', banner: banners[adSeq % banners.length] })
        adSeq++
      }
    }
    return items
  }, [slides, banners])

  useEffect(() => {
    if (rotation.length < 2 || paused) return
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % rotation.length), SLIDE_MS)
    return () => window.clearInterval(timer)
  }, [rotation.length, paused])

  const item = rotation.length > 0 ? rotation[index % rotation.length] : undefined
  if (!item) return null

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-line bg-card/40 transition-colors hover:border-brand/30"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Фоновая полоса-«шапка» */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1 brand-gradient opacity-90"
      />

      {rotation.length > 1 && (
        <div
          className="absolute top-3 right-3 flex items-center gap-1.5"
          role="tablist"
          aria-label="Пилоты и реклама"
        >
          {rotation.map((r, i) => (
            <button
              key={`${r.kind}-${i}`}
              type="button"
              role="tab"
              onClick={() => setIndex(i)}
              aria-label={
                r.kind === 'pilot' ? `Пилот ${i + 1}: ${r.slide.pilot.name}` : `Реклама ${i + 1}`
              }
              aria-selected={i === index}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === index ? 'w-6 bg-brand' : 'w-1.5 bg-line hover:bg-muted',
              )}
            />
          ))}
        </div>
      )}

      <motion.div
        key={item.kind === 'pilot' ? item.slide.pilot.id : `ad-${item.banner.id}`}
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={reduced ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        {item.kind === 'pilot' ? (
          <PilotSlide slide={item.slide} />
        ) : (
          <AdSlide banner={item.banner} />
        )}
      </motion.div>
    </div>
  )
}

/* ---------------------------------- slide ---------------------------------- */

function PilotSlide({ slide }: { slide: Slide }) {
  const { pilot, tracks } = slide
  const points = pilot.is_extra ? null : Number(pilot.points) || 0

  return (
    <Link
      to={pilotHref(pilot)}
      className="flex items-center gap-4 p-4 sm:gap-5 sm:p-5 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
    >
      <CoverArt
        seed={pilot.id}
        title={pilot.name}
        subtitle={pilot.number ? `#${pilot.number}` : undefined}
        image={pilot.photo_url ?? pilot.cover_url}
        className="h-14 w-14 shrink-0 overflow-hidden rounded-xl ring-1 ring-line/70 sm:h-16 sm:w-16"
        size="sm"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.18em] text-brand uppercase">
          <Sparkles aria-hidden className="h-3 w-3" />
          Пилот сезона
        </div>

        <div className="mt-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          <h3 className="truncate text-[18px] leading-tight font-bold tracking-[-0.02em] transition-colors group-hover:text-brand">
            {pilot.name}
          </h3>
          {pilot.team_place && (
            <span className="shrink-0 text-[12px] font-medium text-muted">
              {pilot.team_place} место в команде
            </span>
          )}
        </div>

        <p className="mt-1 line-clamp-1 text-[12.5px] leading-snug text-muted sm:line-clamp-2">
          {pilot.bio ?? pilot.role_text ?? 'Без описания'}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {tracks.length > 0 ? (
            <>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted">
                <MapPin aria-hidden className="h-3 w-3 text-brand/70" />
                На трассах:
              </span>
              {tracks.map((name) => (
                <span
                  key={name}
                  className="max-w-[160px] truncate rounded-full border border-line bg-surface/60 px-2.5 py-0.5 text-[11px] font-medium text-fg/80"
                >
                  {name}
                </span>
              ))}
            </>
          ) : (
            <span className="text-[11px] text-muted">Заезды пилота появятся в зале славы.</span>
          )}
        </div>
      </div>

      <div className="shrink-0 text-right max-sm:hidden">
        {points != null && (
          <>
            <div className="flex items-center justify-end gap-1 text-[26px] leading-none font-bold tabular-nums text-brand">
              <Zap aria-hidden className="h-4 w-4" />
              {formatNumber(points)}
            </div>
            <div className="mt-1 text-[10px] tracking-[0.14em] text-muted uppercase">
              баллов сезона
            </div>
          </>
        )}
        {pilot.car && (
          <div className="mt-1.5 max-w-[150px] truncate text-[11px] text-muted">{pilot.car}</div>
        )}
      </div>

      <ArrowUpRight
        aria-hidden
        className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 max-sm:hidden"
      />
    </Link>
  )
}

function AdSlide({ banner }: { banner: AdBanner }) {
  const href = banner.url?.trim()
  const art = banner.image_url ? (
    <img
      src={banner.image_url}
      alt=""
      loading="lazy"
      decoding="async"
      className="h-full w-full object-cover"
    />
  ) : (
    <span className={cn('block h-full w-full bg-gradient-to-br', gradientFromSeed(banner.id))} />
  )

  return (
    <div className="flex items-center gap-4 p-4 sm:gap-5 sm:p-5">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl ring-1 ring-line/70 sm:h-20 sm:w-20">
        {art}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.18em] text-muted uppercase">
          <Megaphone aria-hidden className="h-3 w-3 text-brand/70" />
          Реклама
        </div>

        <div className="mt-1 truncate text-[17px] font-bold tracking-[-0.02em] transition-colors group-hover:text-brand sm:text-[19px]">
          {banner.advertiser ?? banner.title}
        </div>

        <p className="mt-1 line-clamp-1 text-[12.5px] leading-snug text-muted sm:line-clamp-2">
          {banner.title}
        </p>
      </div>

      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line px-4 text-[12px] font-semibold transition-colors hover:border-fg hover:bg-fg hover:text-bg focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none max-sm:hidden"
        >
          Перейти
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      ) : (
        <span className="shrink-0 text-[11px] font-medium text-muted max-sm:hidden">Баннер</span>
      )}
    </div>
  )
}