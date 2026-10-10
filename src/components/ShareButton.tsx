import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export function ShareButton({
  url,
  title,
  text,
  className,
  iconOnly = false,
  label = 'Поделиться',
  ariaLabel,
}: {
  url?: string
  title?: string
  text?: string
  className?: string
  iconOnly?: boolean
  label?: string
  ariaLabel?: string
}) {
  const [done, setDone] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current)
    },
    [],
  )

  const flash = useCallback(() => {
    setDone(true)
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setDone(false), 2000)
  }, [])

  const share = useCallback(async () => {
    let link = url
    if (!link) {
      try {
        link = window.location.href
      } catch {
        link = ''
      }
    }
    if (!link) return

    let fallbackTitle = ''
    try {
      fallbackTitle = document.title ?? ''
    } catch {
      fallbackTitle = ''
    }

    const finalTitle = (title ?? fallbackTitle).slice(0, 300)
    const finalText = text ? String(text).slice(0, 500) : undefined

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      const payload = { title: finalTitle, text: finalText, url: link }
      let canShare = true
      if (typeof navigator.canShare === 'function') {
        try {
          canShare = navigator.canShare({ title: finalTitle, url: link })
        } catch {
          canShare = false
        }
      }
      if (canShare) {
        try {
          await navigator.share(payload)
          return
        } catch (e) {
          if (e instanceof Error && e.name === 'AbortError') return
        }
      }
    }

    const toCopy = finalText ? `${finalText}\n${link}` : link
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(toCopy)
        flash()
        return
      }
    } catch {
      /* ignore */
    }

    try {
      if (typeof document === 'undefined') return
      const textarea = document.createElement('textarea')
      textarea.value = toCopy
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.top = '-1000px'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(textarea)
      if (ok) flash()
    } catch {
      /* ignore */
    }
  }, [flash, text, title, url])

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={() => void share()}
        aria-label={done ? 'Ссылка скопирована' : ariaLabel ?? label}
        title={ariaLabel ?? label}
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:text-brand',
          'focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none',
          'opacity-0 group-hover:opacity-100',
          done && 'text-brand opacity-100',
          className,
        )}
      >
        {done ? (
          <Check aria-hidden className="h-4 w-4" />
        ) : (
          <Share2 aria-hidden className="h-4 w-4" />
        )}
      </button>
    )
  }

  return (
    <Button size="lg" variant="outline" onClick={() => void share()} className={className}>
      {done ? (
        <Check aria-hidden className="h-4 w-4" />
      ) : (
        <Share2 aria-hidden className="h-4 w-4" />
      )}
      {done ? 'Скопировано' : label}
    </Button>
  )
}