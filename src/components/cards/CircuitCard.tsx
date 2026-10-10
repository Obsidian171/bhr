import { Link } from 'react-router-dom'
import { CalendarDays, Flag, MapPin, Timer } from 'lucide-react'
import type { Circuit } from '@/lib/types'
import { Badge, CoverArt } from '@/components/ui/Primitives'
import { circuitHref, formatDate, isFutureDate } from '@/lib/utils'

export function CircuitCard({ circuit }: { circuit: Circuit }) {
  const upcoming = isFutureDate(circuit.race_date)

  return (
    <Link
      to={circuitHref(circuit)}
      className="card group flex flex-col overflow-hidden p-0 transition-transform duration-300 hover:-translate-y-0.5"
    >
      <div className="relative">
        <CoverArt
          seed={circuit.id}
          title={circuit.name}
          subtitle={circuit.country ?? undefined}
          image={circuit.cover_url}
          className="h-36 w-full"
          size="lg"
        />
        <div className="absolute top-3 left-3 flex gap-2">
          {upcoming && <Badge tone="brand">Скоро этап</Badge>}
          {circuit.country && (
            <span className="rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
              {circuit.country}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-[17px] leading-tight font-semibold transition-colors group-hover:text-brand">
          {circuit.name}
        </h3>

        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
          <div className="flex items-center gap-1.5">
            <Flag className="h-3.5 w-3.5 shrink-0 text-brand/70" />
            <dt className="sr-only">Длина круга</dt>
            <dd className="tabular-nums">{circuit.length_km ? `${circuit.length_km} км` : '—'}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-brand/70" />
            <dt className="sr-only">Повороты</dt>
            <dd className="tabular-nums">{circuit.turns ? `${circuit.turns} поворотов` : '—'}</dd>
          </div>
          <div className="col-span-2 flex items-center gap-1.5">
            <Timer className="h-3.5 w-3.5 shrink-0 text-brand/70" />
            <dt className="sr-only">Рекорд круга</dt>
            <dd className="truncate">{circuit.lap_record ? `Рекорд: ${circuit.lap_record}` : 'Рекорд не задан'}</dd>
          </div>
        </dl>

        {circuit.race_date && (
          <p className="mt-3 flex items-center gap-1.5 border-t border-line pt-3 text-[12px] text-muted">
            <CalendarDays className="h-3.5 w-3.5 text-brand/70" />
            Этап: {formatDate(circuit.race_date)}
          </p>
        )}

        {circuit.description && (
          <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted">{circuit.description}</p>
        )}
      </div>
    </Link>
  )
}
