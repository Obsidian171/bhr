import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function FlagGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <g fill="currentColor">
        <rect x="3" y="3" width="2" height="26" rx="1" />

        <path
          d="M6 4c3.6-1.2 7.4-1.2 11 0 3.6 1.2 7.4 1.2 11 0v13.5c-3.6 1.2-7.4 1.2-11 0-3.6-1.2-7.4-1.2-11 0V4Z"
          opacity="0.18"
        />
      </g>

      <g fill="currentColor">
        <path d="M6 4c1.8-.6 3.7-.9 5.5-.9v5.2c-1.8 0-3.7.3-5.5.9V4Z" />
        <path d="M17 3.1c1.8 0 3.7.3 5.5.9v5.2c-1.8-.6-3.7-.9-5.5-.9V3.1Z" opacity="0.55" />
        <path
          d="M11.5 3.1c1.8 0 3.7.3 5.5.9v5.2c-1.8-.6-3.7-.9-5.5-.9V3.1Z"
          opacity="0.55"
        />
        <path
          d="M22.5 4c1.8.6 3.7.9 5.5.9v5.2c-1.8 0-3.7-.3-5.5-.9V4Z"
        />
      </g>

      <g fill="currentColor">
        <path d="M6 9.2c1.8-.6 3.7-.9 5.5-.9v5.2c-1.8 0-3.7.3-5.5.9V9.2Z" opacity="0.55" />
        <path d="M17 8.3c1.8 0 3.7.3 5.5.9v5.2c-1.8-.6-3.7-.9-5.5-.9V8.3Z" />
        <path
          d="M11.5 8.3c1.8 0 3.7.3 5.5.9v5.2c-1.8-.6-3.7-.9-5.5-.9V8.3Z"
        />
        <path
          d="M22.5 9.2c1.8.6 3.7.9 5.5.9v5.2c-1.8 0-3.7-.3-5.5-.9V9.2Z"
          opacity="0.55"
        />
      </g>

      <g fill="currentColor">
        <path d="M6 14.4c1.8-.6 3.7-.9 5.5-.9v5.2c-1.8 0-3.7.3-5.5.9v-5.2Z" />
        <path d="M17 13.5c1.8 0 3.7.3 5.5.9v5.2c-1.8-.6-3.7-.9-5.5-.9v-5.2Z" opacity="0.55" />
        <path
          d="M11.5 13.5c1.8 0 3.7.3 5.5.9v5.2c-1.8-.6-3.7-.9-5.5-.9v-5.2Z"
          opacity="0.55"
        />
        <path d="M22.5 14.4c1.8.6 3.7.9 5.5.9v5.2c-1.8 0-3.7-.3-5.5-.9v-5.2Z" />
      </g>
    </svg>
  )
}

export function Logo({
  className,
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  return (
    <Link
      to="/"
      aria-label="BAD HABIT RACING — на главную"
      className={cn(
        'group inline-flex items-center gap-2.5 rounded-lg transition-opacity focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none',
        'hover:opacity-95',
        className,
      )}
    >
      <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-[#0b0b0d] shadow-[0_2px_10px_-2px_rgba(158,43,54,0.55)] ring-1 ring-brand/40">
        <span
          aria-hidden
          className="absolute inset-x-0 -top-1 h-[3px] brand-gradient"
        />
        <FlagGlyph className="relative h-[19px] w-[19px] text-white" />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-brand/40 to-transparent"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_35%,rgba(255,255,255,0.16)_50%,transparent_65%)] opacity-70 transition-transform duration-500 group-hover:translate-x-1"
        />
      </span>

      {!compact && (
        <span className="text-[15px] leading-none font-semibold tracking-[-0.015em]">
          <span className="block">BAD HABIT</span>
          <span className="mt-0.5 block text-[11px] font-semibold tracking-[0.18em] text-brand">
            RACING
          </span>
        </span>
      )}
    </Link>
  )
}