import type { Circuit, Pilot } from '@/lib/types'
import { isFutureDate } from '@/lib/utils'

/** Сортировка пилотов по баллам сезона (общий зачёт). Дополнительный состав не участвует. */
export function sortByPoints(rows: Pilot[]): Pilot[] {
  return [...rows]
    .filter((p) => !p.is_extra)
    .sort(
      (a, b) =>
        (b.points ?? 0) - (a.points ?? 0) ||
        (a.team_place ?? 99) - (b.team_place ?? 99) ||
        a.name.localeCompare(b.name, 'ru'),
    )
}

/** Оформление медалей в топ-3: 1, 2, 3 места. */
export const MEDAL_STYLES = [
  'bg-fg text-bg',
  'bg-[#c8ccd4] text-[#1d1719]',
  'bg-[#b8863b] text-white',
] as const

/** Ближайший этап сезона: ближайшая будущая дата, иначе последний по календарю. */
export function nextCircuit(circuits: Circuit[]): Circuit | null {
  const sorted = [...circuits].sort((a, b) => a.position - b.position)
  return sorted.find((c) => isFutureDate(c.race_date)) ?? sorted[0] ?? null
}