import { cn } from '@/lib/utils'

export function Skeleton({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'rounded-lg bg-fg/[0.08] motion-safe:animate-pulse',
        className,
      )}
      {...rest}
    />
  )
}

export function SkeletonGrid({
  count = 6,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Загрузка карточек"
      className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={`sk-${i}`} className="card p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-16 w-16 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-12" />
          </div>
          <div className="mt-3 space-y-1.5">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonNewsList({
  count = 5,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <ul
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Загрузка новостей"
      className={cn('divide-y divide-line/60 border-t border-line/60', className)}
    >
      {Array.from({ length: count }).map((_, i) => (
        <li key={`sk-${i}`} className="flex items-center gap-3 px-2 py-2.5 sm:gap-4">
          <Skeleton className="h-12 w-12 rounded-lg sm:h-14 sm:w-14" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-4 w-4" />
        </li>
      ))}
    </ul>
  )
}