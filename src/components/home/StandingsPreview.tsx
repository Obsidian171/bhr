import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Crown, Trophy } from 'lucide-react'
import type { Pilot } from '@/lib/types'
import { CoverArt } from '@/components/ui/Primitives'
import { MEDAL_STYLES, sortByPoints } from '@/lib/race'
import { cn, formatNumber, pilotHref } from '@/lib/utils'

/**
 * Лидеры сезона: топ-3 пилотов по баллам с быстрыми переходами
 * в «Зал славы» и полную «Таблицу результатов».
 */
export function StandingsPreview({ pilots, className }: { pilots: Pilot[]; className?: string }) {
  const top = useMemo(() => sortByPoints(pilots).slice(0, 3), [pilots])

  return (
    <div className={cn('card flex h-full flex-col p-5', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/12 text-brand">
            <Crown className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold">Лидеры сезона</h2>
            <p className="text-[12px] text-muted">Топ-3 по баллам</p>
          </div>
        </div>
        <Link
          to="/hall"
          className="hidden items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[12px] font-medium transition-colors hover:border-fg/40 hover:text-fg sm:inline-flex"
        >
          <Trophy className="h-3.5 w-3.5" />
          Зал славы
        </Link>
      </div>

      {top.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
          <p className="text-[14px] font-medium">Состав ещё не опубликован</p>
          <p className="max-w-[28ch] text-[12px] text-muted">Топ сезона появится здесь, как только начнут начисляться баллы.</p>
        </div>
      ) : (
        <ol className="mt-2 flex flex-col gap-1">
          {top.map((pilot, i) => (
            <li key={pilot.id}>
              <Link
                to={pilotHref(pilot)}
                className="group -mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-fg/[0.04]"
              >
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums',
                    MEDAL_STYLES[i],
                  )}
                >
                  {i + 1}
                </span>
                <CoverArt
                  seed={pilot.id}
                  title={pilot.name}
                  subtitle={pilot.number ? `#${pilot.number}` : undefined}
                  image={pilot.photo_url ?? pilot.cover_url}
                  className="h-9 w-9 shrink-0 overflow-hidden rounded-lg"
                  size="sm"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium transition-colors group-hover:text-brand">
                    {pilot.name}
                  </span>
                  <span className="block truncate text-[11px] text-muted">
                    {pilot.car ?? pilot.country ?? (pilot.team_place ? `${pilot.team_place} место в команде` : '')}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[18px] leading-none font-bold tabular-nums">
                    {formatNumber(pilot.points)}
                  </span>
                  <span className="block text-[10px] text-muted">баллов</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
        <Link to="/pilots" className="text-[12px] font-semibold text-brand transition-colors hover:text-fg">
          Весь состав
        </Link>
        <Link
          to="/standings"
          className="inline-flex items-center gap-1 rounded-full bg-fg px-3.5 py-1.5 text-[12px] font-semibold text-bg transition-opacity hover:opacity-90"
        >
          Таблица результатов <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  )
}