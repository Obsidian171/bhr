import type { ReactNode } from 'react'
import { FlagGlyph } from '@/components/layout/Logo'
import { cn } from '@/lib/utils'

/** Компактная марка BHR для вставки внутрь контента: флаг + словесный знак. */
export function BhrMark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span
        aria-hidden="true"
        className="brand-gradient flex h-7 w-7 items-center justify-center rounded-lg"
      >
        <FlagGlyph className="h-[15px] w-[15px] text-white" />
      </span>
      <span className="text-[13px] leading-none font-bold tracking-[-0.01em]">
        BAD HABIT <span className="text-brand">RACING</span>
      </span>
    </span>
  )
}

/** Плашка BHR: вставляется в ленту, статьи и разделы как фирменный блок. */
export function BhrPlate({
  title = 'Bad Habit Racing',
  text,
  action,
  className,
}: {
  title?: string
  text?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      role="complementary"
      className={cn(
        'relative overflow-hidden rounded-2xl border border-brand/25 bg-brand-soft px-5 py-5 md:px-7 md:py-6',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="noise pointer-events-none absolute inset-0 opacity-[0.06]"
      />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <BhrMark />
          {title && (
            <div className="mt-2 text-[17px] leading-tight font-semibold tracking-[-0.015em]">
              {title}
            </div>
          )}
          {text && (
            <div className="mt-1.5 max-w-lg text-[14px] leading-relaxed text-fg/80">{text}</div>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  )
}