import { useCallback, useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'bhr.theme'
const CHANGE_EVENT = 'bhr.theme-change'

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark'
}

function readStored(): Theme | null {
  try {
    if (typeof window === 'undefined') return null
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return isTheme(raw) ? raw : null
  } catch {
    return null
  }
}

function writeStored(theme: Theme): void {
  try {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    /* no-op */
  }
}

function readDomTheme(): Theme | null {
  try {
    if (typeof document === 'undefined') return null
    return document.documentElement.classList.contains('dark') ? 'dark' : null
  } catch {
    return null
  }
}

function apply(theme: Theme): void {
  try {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    // Приостанавливаем цветовые переходы, чтобы смена темы была мгновенной.
    // Снимаем блок на кадр позже — уже после отрисовки новых цветов.
    root.classList.add('no-transitions')
    root.classList.toggle('dark', theme === 'dark')
    root.style.colorScheme = theme
    requestAnimationFrame(() => {
      requestAnimationFrame(() => root.classList.remove('no-transitions'))
    })
  } catch {
    /* no-op */
  }
}

function initialTheme(): Theme {
  const dom = readDomTheme()
  if (dom) return dom
  const saved = readStored()
  if (saved) return saved
  return 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    apply(theme)

    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      if (isTheme(e.newValue)) {
        setTheme(e.newValue)
        apply(e.newValue)
      }
    }

    const onChange = (e: Event) => {
      const next = (e as CustomEvent<Theme>).detail
      if (isTheme(next)) setTheme(next)
    }

    window.addEventListener('storage', onStorage)
    window.addEventListener(CHANGE_EVENT, onChange as EventListener)

    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(CHANGE_EVENT, onChange as EventListener)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      apply(next)
      writeStored(next)
      try {
        window.dispatchEvent(new CustomEvent<Theme>(CHANGE_EVENT, { detail: next }))
      } catch {
        /* no-op */
      }
      return next
    })
  }, [])

  return { theme, toggle }
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme()
  const dark = theme === 'dark'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      onClick={toggle}
      aria-label={dark ? 'Включить светлую тему' : 'Включить тёмную тему'}
      title={dark ? 'Светлая тема' : 'Тёмная тема'}
      className={cn(
        'relative inline-flex h-8 w-[62px] shrink-0 items-center rounded-full border border-line bg-card/70 transition-colors',
        'hover:border-brand/40',
        'focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'theme-thumb absolute top-1 bottom-1 left-1 w-[26px] rounded-full bg-fg/10 transition-transform duration-300 ease-out',
          dark && 'translate-x-[28px]',
        )}
      />
      <span className="relative z-10 flex flex-1 items-center justify-center">
        <Sun aria-hidden className={cn('h-4 w-4 transition-colors', dark ? 'text-muted' : 'text-fg')} />
      </span>
      <span className="relative z-10 flex flex-1 items-center justify-center">
        <Moon aria-hidden className={cn('h-4 w-4 transition-colors', dark ? 'text-fg' : 'text-muted')} />
      </span>
    </button>
  )
}