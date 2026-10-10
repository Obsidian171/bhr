import { Award, Flag, Newspaper, Trophy, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { HALL_KINDS } from './constants'
import type { HallEntry } from './types'

/** Иконка вида достижения: победа, подиум, рекорд, пресса, титул. */
export const HALL_KIND_ICONS: Record<string, LucideIcon> = {
  win: Trophy,
  podium: Award,
  record: Flag,
  press: Newspaper,
  championship: Zap,
}

export function hallKindLabel(kind: string): string {
  return HALL_KINDS.find((k) => k.id === kind)?.label ?? kind
}

/** Важное сверху, затем год, затем ручной порядок из админки. */
export function sortHallEntries(entries: HallEntry[]): HallEntry[] {
  return [...entries].sort(
    (a, b) =>
      (b.weight ?? 0) - (a.weight ?? 0) || (b.year ?? 0) - (a.year ?? 0) || a.position - b.position,
  )
}