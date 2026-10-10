import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarClock } from 'lucide-react'
import type { Circuit } from '@/lib/types'
import { circuitHref, cn, formatDate } from '@/lib/utils'

function diffParts(diffMs: number): { d: number; h: number; m: number; s: number } {
  const s = Math.max(0, Math.floor(diffMs / 1000))
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  }
}

/**
 * Обратный отсчёт до этапа: пересчитывается каждую секунду, пока дата
 * заезда в будущем. Рендится рядом с погодой и в шапке страницы трассы.
 */
export function RaceCountdown({
  circuit,
  className,
  divider = true,
}: {
  circuit: Circuit
  className?: string
  divider?: boolean
}) {
  const target = circuit.race_date ? new Date(circuit.race_date).getTime() : 0
  const [now, setNow] = useState<number>(() => Date.now())
  const active = target > now

  useEffect(() => {
    if (!active) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [active])

  const diff = target - now
  const live = diff > 0
  const parts = diffParts(diff)

  const blocks = [
    ['Дней', parts.d],
    ['Часов', parts.h],
    ['Минут', parts.m],
    ['Секунд', parts.s],
  ] as const

  return (
    <div className={className}>
      <div className={cn('flex flex-wrap items-center justify-between gap-2 pt-4', divider && 'border-t border-line')}>
        <p className="flex items-center gap-1.5 text-[12px] text-muted">
          <CalendarClock className="h-3.5 w-3.5 text-brand" />
          До этапа на {circuit.name}
        </p>
        <p className="text-[12px] font-medium tabular-nums">{formatDate(circuit.race_date)}</p>
      </div>

      {live ? (
        <div className="mt-2 grid grid-cols-4 gap-2">
          {blocks.map(([label, value]) => (
            <div key={label} className="rounded-lg bg-surface px-1 py-2 text-center">
              <div className="text-[20px] leading-none font-bold tabular-nums">{String(value).padStart(2, '0')}</div>
              <div className="mt-1 text-[10px] text-muted">{label}</div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 rounded-lg bg-surface px-3 py-2 text-center text-[13px] text-muted">
          Этап уже начался — смотрите календарь.
        </p>
      )}

      <Link
        to={circuitHref(circuit)}
        className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-brand transition-colors hover:text-fg"
      >
        К трассе <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}