import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Ghost, Menu, Moon, Skull, X } from 'lucide-react'
import { useSite } from '@/context/SiteContext'
import { cn } from '@/lib/utils'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Layout'
import { ThemeToggle } from '@/hooks/useTheme'
import { Logo } from '@/components/layout/Logo'
import { SidebarWidgets } from '@/components/sidebar/WidgetStack'
import { RadioPlayer } from '@/components/RadioPlayer'
import { AdTile } from '@/components/home/AdTile'

export { Logo }

const HALLOWEEN: boolean = true

const NAV: { to: string; label: string }[] = [
  { to: '/', label: 'Главная' },
  { to: '/pilots', label: 'Пилоты' },
  { to: '/circuits', label: 'Трассы' },
  { to: '/events', label: 'Мероприятия' },
  { to: '/journal', label: 'Журнал' },
  { to: '/hall', label: 'Зал славы' },
]

/* ---------------------------- Halloween decor ------------------------------ */

function Cobweb({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      className={className}
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="0.8"
      strokeLinecap="round"
    >
      <path d="M0 0 L80 0 M0 0 L80 20 M0 0 L80 40 M0 0 L80 60 M0 0 L80 80" />
      <path d="M0 0 L0 80 M0 0 L20 80 M0 0 L40 80 M0 0 L60 80" />
      <path d="M20 20 Q30 10 40 20" />
      <path d="M30 30 Q40 20 50 30" />
      <path d="M40 40 Q50 30 60 40" />
    </svg>
  )
}

function Bats({ className, float = false }: { className?: string; float?: boolean }) {
  return (
    <svg
      viewBox="0 0 60 24"
      className={cn(className, float && 'motion-safe:animate-[float_4s_ease-in-out_infinite]')}
      aria-hidden="true"
      focusable="false"
      fill="currentColor"
    >
      <path d="M30 6c-2 0-3 2-4 3-1-3-5-6-9-6 2 2 2 4 1 6-2-1-5-1-7 1 3 0 5 2 6 4-2 0-4 1-5 3 4-2 8 0 10 2 2-1 4-2 8-2s6 1 8 2c2-2 6-4 10-2-1-2-3-3-5-3 1-2 3-4 6-4-2-2-5-2-7-1-1-2-1-4 1-6-4 0-8 3-9 6-1-1-2-3-4-3Z" />
    </svg>
  )
}

function Pumpkin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <path
        d="M16 6c-5 0-10 5-10 12s5 10 10 10 10-3 10-10S21 6 16 6Z"
        fill="currentColor"
        opacity="0.85"
      />
      <path d="M16 3l1.4 3.2h-2.8L16 3Z" fill="currentColor" />
      <path
        d="M11 14l2 2-2 2M21 14l-2 2 2 2M14 22h4"
        stroke="#0b0b0d"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

function SpiderWeb({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="0.9"
      strokeLinecap="round"
    >
      <path d="M40 0 L0 40 M40 0 L20 40 M40 0 L40 40 M40 0 L40 20" />
      <path d="M30 10 Q22 8 20 20" />
      <path d="M20 20 Q14 18 12 30" />
    </svg>
  )
}

function PumpkinGarland({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('flex items-center justify-between px-1', className)}>
      {[0, 1, 2].map((i) => (
        <Pumpkin
          key={i}
          className={cn(
            'h-3.5 w-3.5 text-brand',
            i === 1 ? 'opacity-90' : 'opacity-60',
          )}
        />
      ))}
    </div>
  )
}

/* ---------------------------------- Header --------------------------------- */

const iconBtn =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-fg/80 transition-colors hover:bg-fg/5 hover:text-fg focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'relative flex h-9 items-center rounded-lg px-3 text-[13px] font-medium transition-colors',
    'focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none',
    isActive ? 'text-fg' : 'text-fg/70 hover:text-fg',
  )

const navUnderline = (isActive: boolean) =>
  cn(
    'pointer-events-none absolute inset-x-3 -bottom-0.5 h-[2px] rounded-full transition-opacity',
    HALLOWEEN
      ? 'bg-[repeating-linear-gradient(90deg,#f97316_0_4px,#7c2d12_4px_8px)]'
      : 'bg-brand',
    isActive ? 'opacity-100' : 'opacity-0',
  )

export function Header() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(
    () => typeof window !== 'undefined' && window.scrollY > 8,
  )
  const { pathname } = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <header className="sticky top-0 z-30">
      <div
        className={cn(
          'relative transition-colors duration-300',
          scrolled ? 'glass border-b border-line' : 'border-b border-transparent',
        )}
      >
        {HALLOWEEN && (
          <>
            <Cobweb className="pointer-events-none absolute top-0 left-0 hidden h-10 w-10 text-fg/20 md:block" />
            <Cobweb className="pointer-events-none absolute top-0 right-0 hidden h-8 w-8 scale-x-[-1] text-fg/15 md:block" />
          </>
        )}

        <Container className="relative flex h-14 items-center gap-3">
          <div className="relative flex items-center">
            <Logo />
            {HALLOWEEN && (
              <>
                <Bats className="pointer-events-none absolute -top-3 left-full ml-2 hidden h-3 w-8 text-brand/60 md:block" />
                <Bats
                  float
                  className="pointer-events-none absolute -top-4 left-full ml-10 hidden h-2.5 w-6 text-brand/40 md:block"
                />
              </>
            )}
          </div>

          <nav className="ml-6 hidden items-center gap-0.5 md:flex">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className={navLinkClass}>
                {({ isActive }) => (
                  <>
                    <span>{item.label}</span>
                    <span aria-hidden className={navUnderline(isActive)} />
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {HALLOWEEN && (
              <>
                <Ghost
                  aria-hidden
                  className="hidden h-4 w-4 text-brand/70 md:block"
                />
                <Pumpkin className="hidden h-4 w-4 text-brand/70 md:block" />
              </>
            )}

            <ButtonLink
              to="/journal"
              size="sm"
              variant="outline"
              className="hidden sm:inline-flex"
            >
              Журнал
            </ButtonLink>

            <ThemeToggle />

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
              aria-expanded={open}
              aria-controls="mobile-menu"
              className={cn(iconBtn, 'md:hidden')}
            >
              {open ? (
                <X aria-hidden className="h-[18px] w-[18px]" />
              ) : (
                <Menu aria-hidden className="h-[18px] w-[18px]" />
              )}
            </button>
          </div>
        </Container>
      </div>

      {open && (
        <div
          id="mobile-menu"
          className="relative max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b border-line bg-bg md:hidden"
        >
          {HALLOWEEN && (
            <>
              <SpiderWeb className="pointer-events-none absolute top-0 right-0 h-12 w-12 text-brand/25" />
              <SpiderWeb className="pointer-events-none absolute top-0 left-0 h-10 w-10 scale-x-[-1] text-brand/15" />
            </>
          )}

          <Container className="relative space-y-1 py-3">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'block rounded-lg px-3 py-3 text-[15px] font-medium transition-colors',
                    'focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none',
                    isActive ? 'bg-fg/[0.06] text-fg' : 'text-fg/85 hover:bg-fg/[0.04]',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}

            <div className="mt-2 border-t border-line pt-2">
              <NavLink
                to="/ads"
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'block rounded-lg px-3 py-3 text-[15px] font-semibold transition-colors',
                    'focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none',
                    isActive ? 'bg-fg/[0.06] text-fg' : 'text-fg/85 hover:bg-fg/[0.04]',
                  )
                }
              >
                Заказ рекламы
              </NavLink>

              {HALLOWEEN && (
                <div className="mt-3 flex items-center justify-center gap-2 pb-1 text-[11px] font-semibold tracking-[0.2em] text-brand/60 uppercase">
                  <Skull aria-hidden className="h-3.5 w-3.5" />
                  Happy Halloween
                  <Skull aria-hidden className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          </Container>
        </div>
      )}
    </header>
  )
}

/* ------------------------------ PublicSidebar ------------------------------ */

export function PublicSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-7 overflow-y-auto border-r border-line px-5 pt-6 pb-24 md:flex">
      <div className="relative">
        <Logo />
        {HALLOWEEN && (
          <>
            <Bats className="pointer-events-none absolute -top-2 -right-2 h-3 w-8 text-brand/60" />
            <Pumpkin className="pointer-events-none absolute top-8 -right-1 h-5 w-5 text-brand/70" />
          </>
        )}
      </div>

      {HALLOWEEN && <PumpkinGarland className="opacity-80" />}

      <nav className="flex flex-col gap-1">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-[14px] font-medium transition-colors',
                'focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none',
                isActive ? 'bg-fg/[0.06] text-fg' : 'text-fg/70 hover:bg-fg/[0.04] hover:text-fg',
                HALLOWEEN && isActive && 'shadow-[0_0_0_1px_rgba(249,115,22,0.25)]',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span>{item.label}</span>
                {HALLOWEEN && isActive && (
                  <Ghost
                    aria-hidden
                    className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-brand/70"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}

        <NavLink
          to="/ads"
          className={({ isActive }) =>
            cn(
              'mt-1 flex items-center justify-center rounded-lg border px-3.5 py-2.5 text-[14px] font-semibold transition-colors',
              'focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none',
              isActive
                ? 'border-brand/30 bg-brand/10 text-brand'
                : 'border-line text-fg/80 hover:border-brand/30 hover:text-brand',
            )
          }
        >
          Заказ рекламы
        </NavLink>
      </nav>

      <div className="relative">
        {HALLOWEEN && (
          <>
            <Moon
              aria-hidden
              className="pointer-events-none absolute -top-1 right-0 h-4 w-4 text-brand/60"
            />
            <Bats className="pointer-events-none absolute -top-3 right-4 h-2.5 w-6 text-brand/40" />
          </>
        )}
        <RadioPlayer compact className="mt-5" />
      </div>

      <AdTile variant="sidebar" />

      <SidebarWidgets />
    </aside>
  )
}

/* ---------------------------------- Footer --------------------------------- */

function FooterLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="text-muted transition-colors hover:text-fg focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
    >
      {children}
    </Link>
  )
}

export function Footer() {
  const { site } = useSite()
  const year = new Date().getFullYear()

  return (
    <footer className="relative border-t border-line">
      {HALLOWEEN && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-brand)_0%,transparent_60%)] opacity-[0.04]"
        />
      )}

      <Container className="relative flex flex-col gap-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Logo />
          <p className="mt-3 max-w-sm text-[12px] leading-relaxed text-muted">
            Гоночная команда Bad Habit Racing: пилоты, календарь трасс, журнал сезона и зал славы.
          </p>
        </div>

        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
          {NAV.map((item) => (
            <FooterLink key={item.to} to={item.to}>
              {item.label}
            </FooterLink>
          ))}
          <FooterLink to="/ads">Заказ рекламы</FooterLink>
          {site.email && (
            <a
              href={`mailto:${site.email}`}
              className="text-muted transition-colors hover:text-fg focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
              {site.email}
            </a>
          )}
        </nav>
      </Container>

      <Container className="relative flex flex-wrap items-center justify-between gap-2 border-t border-line py-4 text-[12px] text-muted">
        <span>
          © {year} {site.name || 'Bad Habit Racing'}
        </span>
        {HALLOWEEN && (
          <span className="inline-flex items-center gap-1.5 text-brand/70">
            <Ghost aria-hidden className="h-3.5 w-3.5" />
            <Pumpkin className="h-3.5 w-3.5" />
            <span className="font-semibold tracking-[0.14em] uppercase">Spooky season</span>
            <Skull aria-hidden className="h-3.5 w-3.5" />
          </span>
        )}
      </Container>
    </footer>
  )
}