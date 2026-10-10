import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Cloud,
  CloudRain,
  CloudSun,
  MapPin,
  Sun,
  Thermometer,
} from 'lucide-react'
import type { Circuit } from '@/lib/types'
import { computeRaceWeather } from '@/lib/weather'
import { RaceCountdown } from '@/components/home/RaceCountdown'
import { cn, formatDate, isFutureDate } from '@/lib/utils'
import { EmptyState } from '@/components/ui/Layout'

const WEATHER_ICONS: Record<string, { icon: typeof Sun; className: string }> = {
  Солнечно: { icon: Sun, className: 'text-[#ffb340]' },
  'Переменная облачность': { icon: CloudSun, className: 'text-[#ffd479]' },
  Пасмурно: { icon: Cloud, className: 'text-muted' },
  Дождь: { icon: CloudRain, className: 'text-sky-500' },
}

export function RaceWeatherCard({
  circuit,
  className,
}: {
  circuit: Circuit | null
  className?: string
}) {
  const weather = useMemo(() => (circuit ? computeRaceWeather(circuit) : null), [circuit])
  const meta = weather ? WEATHER_ICONS[weather.label] : undefined
  const Icon = meta?.icon ?? Sun
  const iconClass = meta?.className ?? 'text-muted'

  if (!circuit || !weather) {
    return (
      <div className={cn('card flex h-full flex-col p-0', className)}>
        <EmptyState
          title="Календарь ещё не опубликован"
          description="Прогноз появится здесь, когда появится ближайший этап сезона."
          action={
            <Link
              to="/circuits"
              className="inline-flex items-center gap-1.5 rounded-full bg-fg px-4 py-2 text-[12px] font-semibold text-bg transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
              Календарь трасс
              <ArrowRight aria-hidden className="h-3.5 w-3.5" />
            </Link>
          }
        />
      </div>
    )
  }

  const metrics: [string, string][] = [
    ['Воздух', `${weather.air}°C`],
    ['Асфальт', `${weather.asphalt}°C`],
    ['Дождь', `${weather.rain}%`],
  ]

  return (
    <div className={cn('card relative flex h-full flex-col overflow-hidden p-5', className)}>
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <img
          src="/gifs/race-cover.jpg"
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover opacity-[0.13] select-none"
        />
      </div>
      <img
        src="/gifs/race.gif"
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        onLoad={(e) => {
          e.currentTarget.style.opacity = '0.13'
        }}
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
        className="gif-overlay pointer-events-none absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 select-none"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg/40"
      />

      <div className="relative flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/12 text-brand">
              <Thermometer aria-hidden className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold leading-tight">Погода на этапе</h2>
              <p className="mt-0.5 flex items-center gap-1 text-[12px] text-muted">
                <MapPin aria-hidden className="h-3 w-3 shrink-0" />
                <span className="truncate">{circuit.name}</span>
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-line bg-card/60 px-3 py-1.5 text-[11px] font-semibold text-muted tabular-nums">
            {formatDate(circuit.race_date)}
          </span>
        </div>

        <div className="flex flex-1 items-center gap-4 py-5">
          <Icon aria-hidden className={cn('h-12 w-12 shrink-0', iconClass)} />
          <div className="min-w-0 flex-1">
            <div className="text-[20px] leading-none font-bold tracking-[-0.01em]">
              {weather.label}
            </div>
            <p className="mt-1.5 text-[12px] leading-snug text-muted">{weather.note}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {metrics.map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-line/60 bg-card/60 px-3 py-2.5 text-center"
            >
              <div className="text-[18px] leading-none font-bold tabular-nums">{value}</div>
              <div className="mt-1 text-[11px] font-medium text-muted">{label}</div>
            </div>
          ))}
        </div>

        {isFutureDate(circuit.race_date) && (
          <RaceCountdown circuit={circuit} className="mt-4 border-t border-line/60 pt-4" />
        )}

        <Link
          to="/circuits"
          className="group mt-4 inline-flex items-center gap-1.5 self-start text-[12px] font-semibold text-brand transition-colors hover:text-fg focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        >
          Календарь трасс
          <ArrowRight
            aria-hidden
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </div>
  )
}