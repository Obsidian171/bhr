import { Link } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import type { Pilot } from '@/lib/types'
import { Badge, CoverArt } from '@/components/ui/Primitives'
import { cn, formatNumber, pilotHref } from '@/lib/utils'

function placeLabel(pilot: Pilot): string | null {
  return pilot.team_place ? `${pilot.team_place} место в команде` : null
}

export function PilotCard({ pilot, size = 'md' }: { pilot: Pilot; size?: 'md' | 'sm' }) {
  const place = placeLabel(pilot)
  const isExtra = Boolean(pilot.is_extra)
  const isLeader = !isExtra && Boolean(pilot.featured)
  const avatar = pilot.photo_url || pilot.cover_url || undefined
  const compact = size === 'sm'

  return (
    <Link
      to={pilotHref(pilot)}
      className={cn(
        'card group flex flex-col overflow-hidden transition-transform duration-300',
        'motion-safe:hover:-translate-y-0.5',
        'focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none',
        compact ? 'p-3' : 'p-4',
      )}
    >
      <div className="flex items-center gap-3">
        <CoverArt
          seed={pilot.id}
          title={pilot.name}
          subtitle={!isExtra && pilot.number ? `#${pilot.number}` : undefined}
          image={avatar}
          className={cn(
            'shrink-0 overflow-hidden rounded-xl',
            compact ? 'h-14 w-14' : 'h-16 w-16',
          )}
          size="sm"
        />

        <div className="min-w-0 flex-1">
          {(!isExtra && pilot.number) || isExtra || isLeader ? (
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              {!isExtra && pilot.number && (
                <span className="font-mono text-[12px] font-bold tabular-nums text-brand">
                  #{pilot.number}
                </span>
              )}
              {isExtra && <Badge tone="red">доп. состав</Badge>}
              {isLeader && <Badge tone="brand">Лидер</Badge>}
            </div>
          ) : null}

          <h3
            className={cn(
              'truncate font-semibold transition-colors group-hover:text-brand',
              compact ? 'text-[15px]' : 'text-[16px]',
            )}
          >
            {pilot.name}
          </h3>

          <p className="truncate text-[12px] text-muted">
            {[pilot.car, pilot.country].filter(Boolean).join(' · ') || 'пилот команды'}
          </p>

          {pilot.role_text && (
            <p
              className={cn(
                'mt-0.5 truncate text-[12px] font-semibold',
                isExtra ? 'text-brand' : 'text-[color:var(--color-gold,#d4a017)]',
              )}
            >
              {pilot.role_text}
            </p>
          )}
        </div>

        {!isExtra && (
          <div className="shrink-0 text-right">
            <div className="text-[20px] leading-none font-bold tabular-nums">
              {formatNumber(pilot.points ?? 0)}
            </div>
            <div className="mt-1 text-[11px] text-muted">баллов</div>
          </div>
        )}
      </div>

      {!compact && pilot.bio && (
        <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-muted">{pilot.bio}</p>
      )}

      {!compact && place && (
        <p className="mt-3 flex items-center gap-1.5 border-t border-line pt-3 text-[12px] text-muted">
          <Trophy aria-hidden className="h-3.5 w-3.5 text-brand/70" />
          {place}
        </p>
      )}
    </Link>
  )
}