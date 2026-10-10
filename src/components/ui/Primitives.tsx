import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { cn, gradientFromSeed } from '@/lib/utils'

type Tone = 'neutral' | 'lime' | 'brand' | 'red' | 'violet' | 'magenta' | 'cyan'

const TONES: Record<Tone, string> = {
  neutral: 'bg-fg/[0.06] text-muted',
  lime: 'bg-[color:var(--color-lime,#84cc16)]/15 text-[color:var(--color-lime,#84cc16)]',
  brand: 'bg-brand/12 text-brand',
  red: 'bg-red-500/15 text-red-500',
  violet: 'bg-[color:var(--color-violet,#8b5cf6)]/15 text-[color:var(--color-violet,#8b5cf6)]',
  magenta: 'bg-[color:var(--color-violet,#8b5cf6)]/15 text-[color:var(--color-violet,#8b5cf6)]',
  cyan: 'bg-[color:var(--color-cyan,#06b6d4)]/15 text-[color:var(--color-cyan,#06b6d4)]',
}

export function Badge({
  children,
  className,
  tone = 'neutral',
}: {
  children: ReactNode
  className?: string
  tone?: Tone
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[-0.01em]',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

const COVER_SIZES = {
  sm: 'text-[11px]',
  md: 'text-[13px]',
  lg: 'text-[18px]',
  xl: 'text-[30px]',
} as const

export function CoverArt({
  seed,
  title,
  subtitle,
  image,
  className,
  size = 'md',
}: {
  seed: string
  title: string
  subtitle?: string
  image?: string | null
  className?: string
  size?: keyof typeof COVER_SIZES
}) {
  const [broken, setBroken] = useState(false)

  useEffect(() => {
    setBroken(false)
  }, [image])

  const safeTitle = (title ?? '').trim() || 'BHR'
  const safeAlt = safeTitle.slice(0, 160)

  if (image && !broken) {
    return (
      <div className={cn('relative overflow-hidden bg-surface', className)}>
        <img
          src={image}
          alt={safeAlt}
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
          className="h-full w-full object-cover"
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative isolate flex overflow-hidden bg-gradient-to-br',
        gradientFromSeed(seed),
        className,
      )}
    >
      <div aria-hidden className="grid-lines absolute inset-0 opacity-20 mix-blend-overlay" />
      <div aria-hidden className="noise absolute inset-0 opacity-[0.12] mix-blend-overlay" />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10"
      />

      <div className="relative flex h-full w-full flex-col justify-between gap-1 p-[6%] text-white">
        <span className="text-[9px] font-semibold tracking-[0.18em] uppercase opacity-80">
          BHR
        </span>

        <span
          className={cn(
            'line-clamp-3 font-bold leading-[0.95] tracking-[-0.02em] uppercase',
            COVER_SIZES[size],
          )}
        >
          {safeTitle}
        </span>

        {subtitle && (
          <span className="truncate text-[9px] font-medium tracking-[0.1em] uppercase opacity-80">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  )
}

function initialsFromName(name: string): string {
  const cleaned = (name ?? '').trim()
  if (!cleaned) return '?'
  const parts = cleaned.split(/\s+/).slice(0, 2)
  const letters = parts
    .map((w) => Array.from(w)[0] ?? '')
    .filter(Boolean)
    .join('')
  return (letters || cleaned[0] || '?').toUpperCase()
}

export function Avatar({
  name,
  image,
  className,
}: {
  name: string
  image?: string | null
  className?: string
}) {
  const initials = useMemo(() => initialsFromName(name), [name])
  const [broken, setBroken] = useState(false)

  useEffect(() => {
    setBroken(false)
  }, [image])

  if (image && !broken) {
    return (
      <img
        src={image}
        alt={name}
        loading="lazy"
        decoding="async"
        onError={() => setBroken(true)}
        className={cn('rounded-full object-cover', className)}
      />
    )
  }

  return (
    <div
      aria-label={name || undefined}
      className={cn(
        'flex items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white',
        gradientFromSeed(name || 'BHR'),
        className,
      )}
    >
      <span className="text-[1.4em] leading-none">{initials}</span>
    </div>
  )
}