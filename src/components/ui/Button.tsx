import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'fill' | 'outline' | 'ghost' | 'violet' | 'brand'
type Size = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-[-0.01em] transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.97] whitespace-nowrap tap'

const variants: Record<Variant, string> = {
  primary: 'bg-fg text-bg shadow-[var(--shadow-card)] hover:opacity-85',
  fill: 'bg-surface text-fg hover:bg-fg/10',
  outline: 'border border-line bg-transparent text-fg hover:bg-surface',
  ghost: 'bg-transparent text-muted hover:bg-surface hover:text-fg',
  violet: 'bg-violet text-white hover:brightness-110',
  brand: 'bg-brand text-white shadow-[var(--shadow-card)] hover:brightness-110',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-[13px]',
  md: 'h-10 px-5 text-[14px]',
  lg: 'h-12 px-7 text-[15px]',
}

interface CommonProps {
  variant?: Variant
  size?: Size
  className?: string
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
    </button>
  )
}

export function ButtonLink({
  to,
  variant = 'primary',
  size = 'md',
  className,
  children,
  onClick,
  ...rest
}: CommonProps & { to: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  const isExternal = /^https?:\/\//.test(to)
  const classes = cn(base, variants[variant], sizes[size], className)

  if (isExternal) {
    return (
      <a href={to} target="_blank" rel="noreferrer noopener" className={classes} onClick={onClick} {...rest}>
        {children}
      </a>
    )
  }

  return (
    <Link to={to} className={classes} onClick={onClick}>
      {children}
    </Link>
  )
}
