import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Cloud, CloudRain, CloudSun, Sun } from 'lucide-react'
import { QUERY_KEYS, useQuery } from '@/hooks/useQuery'
import { fetchCircuits, fetchPilots } from '@/lib/api'
import type { Circuit, Pilot } from '@/lib/types'
import { computeRaceWeather } from '@/lib/weather'
import { MEDAL_STYLES, nextCircuit, sortByPoints } from '@/lib/race'
import { cn, formatNumber, pilotHref } from '@/lib/utils'

const MINI_ICONS: Record<string, typeof Sun> = {
  Солнечно: Sun,
  'Переменная облачность': CloudSun,
  Пасмурно: Cloud,
  Дождь: CloudRain,
}

function WidgetTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">{children}</p>
  )
}

function WidgetFooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="group inline-flex items-center gap-1 text-[11px] font-semibold text-brand transition-colors hover:text-fg focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
    >
      {children}
      <ArrowRight
        aria-hidden
        className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  )
}

export function SidebarWidgets() {
  const { data: pilots } = useQuery(fetchPilots, [] as Pilot[], [], QUERY_KEYS.pilots)
  const { data: circuits } = useQuery(fetchCircuits, [] as Circuit[], [], QUERY_KEYS.circuits)

  const top = useMemo(() => sortByPoints(pilots).slice(0, 3), [pilots])
  const next = useMemo(() => nextCircuit(circuits), [circuits])
  const weather = useMemo(() => (next ? computeRaceWeather(next) : null), [next])
  const WeatherIcon = weather ? MINI_ICONS[weather.label] ?? Sun : Sun

  return (
    <div className="mt-5 flex flex-col gap-3">
      <div className="card p-3.5">
        <WidgetTitle>Лидеры сезона</WidgetTitle>

        {top.length === 0 ? (
          <p className="mt-2 text-[12px] text-muted">Состав ещё не опубликован.</p>
        ) : (
          <ol className="mt-2 flex flex-col gap-0.5">
            {top.map((pilot, i) => (
              <li key={pilot.id}>
                <Link
                  to={pilotHref(pilot)}
                  className="flex items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-fg/5 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                >
                  <span
                    aria-hidden
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tabular-nums',
                      MEDAL_STYLES[i],
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12px] font-medium">
                    {pilot.name}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted">
                    {formatNumber(pilot.points)}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-2.5">
          <WidgetFooterLink to="/standings">Вся таблица</WidgetFooterLink>
        </div>
      </div>

      {next && weather && (
        <Link
          to="/circuits"
          className="card block p-3.5 transition-colors hover:border-brand/30 hover:bg-fg/[0.03] focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        >
          <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">
            <WeatherIcon aria-hidden className="h-3.5 w-3.5 text-brand" />
            Погода на этапе
          </p>
          <p className="mt-2 truncate text-[13px] font-semibold leading-tight">{next.name}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted">
            <span className="tabular-nums">воздух {weather.air}°C</span>
            <span aria-hidden className="text-muted/50">·</span>
            <span className="tabular-nums">асфальт {weather.asphalt}°C</span>
            <span aria-hidden className="text-muted/50">·</span>
            <span className="tabular-nums">дождь {weather.rain}%</span>
          </div>
        </Link>
      )}
    </div>
  )
}