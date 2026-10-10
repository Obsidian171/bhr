import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('container-x', className)}>{children}</div>
}

export function Section({
  children,
  className,
  id,
}: {
  children: ReactNode
  className?: string
  id?: string
}) {
  return (
    <section id={id} className={cn('py-14 md:py-20', className)}>
      {children}
    </section>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  action,
  className,
}: {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  align?: 'left' | 'center'
  action?: ReactNode
  className?: string
}) {
  const centered = align === 'center'
  return (
    <div
      className={cn(
        'mb-8 flex flex-col gap-4 md:mb-10',
        centered
          ? 'items-center text-center'
          : 'md:flex-row md:items-end md:justify-between',
        className,
      )}
    >
      <div className={cn('max-w-2xl', centered && 'mx-auto')}>
        {eyebrow && (
          <span className="mb-3 block text-[13px] font-semibold tracking-[-0.01em] text-brand">
            {eyebrow}
          </span>
        )}
        <h2 className="text-[28px] leading-[1.08] font-bold md:text-[40px]">{title}</h2>
        {description && (
          <p className="mt-3 text-[15px] leading-relaxed text-muted">{description}</p>
        )}
      </div>
      {action && (
        <div className={cn('shrink-0', centered && 'mx-auto md:mx-auto')}>{action}</div>
      )}
    </div>
  )
}

export function Reveal({
  children,
  delay = 0,
  y = 18,
  className,
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
}) {
  const reduced = useReducedMotion()
  const duration = reduced ? 0 : 0.5

  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      animate={reduced ? { opacity: 1, y: 0 } : undefined}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration, delay: reduced ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

export function Stat({
  value,
  label,
  hint,
}: {
  value: string
  label: string
  hint?: string | null
}) {
  return (
    <div>
      <div className="text-[34px] leading-none font-bold tabular-nums tracking-[-0.03em] md:text-[44px]">
        {value}
      </div>
      <div className="mt-2 text-[15px] text-fg">{label}</div>
      {hint && <div className="mt-0.5 text-[13px] text-muted">{hint}</div>}
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Загрузка"
      className={cn(
        'inline-block h-5 w-5 rounded-full border-2 border-fg/15 border-t-fg',
        'motion-safe:animate-spin motion-reduce:animate-none',
        className,
      )}
    />
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div
      role="status"
      className="card flex flex-col items-center gap-3 px-6 py-16 text-center"
    >
      <h3 className="text-xl font-semibold">{title}</h3>
      {description && <p className="max-w-md text-[15px] text-muted">{description}</p>}
      {action}
    </div>
  )
}