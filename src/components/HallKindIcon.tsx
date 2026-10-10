import { Award } from 'lucide-react'
import { HALL_KIND_ICONS } from '@/lib/hall'

/** Иконка вида достижения из «Зала славы». */
export function HallKindIcon({ kind, className = 'h-3 w-3' }: { kind: string; className?: string }) {
  const Icon = HALL_KIND_ICONS[kind] ?? Award
  return <Icon className={className} />
}