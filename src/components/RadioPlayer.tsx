import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Check, Link2, Pause, Play, Radio, Volume2 } from 'lucide-react'
import { useSite } from '@/context/SiteContext'
import { cn } from '@/lib/utils'

export const RADIO_STREAM_URL = 'https://streaming.live365.com/a19203_2'

function safeStreamUrl(value: string | null | undefined, fallback: string): string {
  const raw = (value ?? '').trim()
  if (!raw) return fallback
  if (!/^https?:\/\//i.test(raw)) return fallback
  return raw
}

function RadioBars({ playing }: { playing: boolean }) {
  if (!playing) return <span aria-hidden className="inline-block h-1 w-1 rounded-full bg-brand" />
  return (
    <span className="flex items-end gap-[3px]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[3px] rounded-sm bg-brand motion-safe:animate-pulse motion-reduce:opacity-70"
          style={{ height: `${6 + i * 4}px`, animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </span>
  )
}

export function RadioPlayer({
  className,
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  const { site } = useSite()
  const audioRef = useRef<HTMLAudioElement>(null)
  const copyTimer = useRef<number | null>(null)
  const rootId = useId()
  const [playing, setPlaying] = useState(false)
  const [broken, setBroken] = useState(false)
  const [copied, setCopied] = useState(false)
  const [fallback, setFallback] = useState<string | null>(null)

  const stream = safeStreamUrl(site.radio_stream_url, RADIO_STREAM_URL)

  useEffect(() => {
    return () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
    }
  }, [])

  useEffect(() => {
    setBroken(false)
    setPlaying(false)
  }, [stream])

  const toggle = () => {
    const el = audioRef.current
    if (!el) return
    if (el.paused) {
      setBroken(false)
      el.play()
        .then(() => setBroken(false))
        .catch(() => setBroken(true))
    } else {
      el.pause()
    }
  }

  const copyStream = useCallback(async () => {
    setFallback(null)
    let ok = false
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(stream)
        ok = true
      }
    } catch {
      ok = false
    }

    if (!ok) {
      setFallback(stream)
      return
    }

    setCopied(true)
    if (copyTimer.current) window.clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => setCopied(false), 2000)
  }, [stream])

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onError = () => setBroken(true)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('error', onError)
    return () => {
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('error', onError)
    }
  }, [stream])

  return (
    <div
      id={rootId}
      className={cn(
        'card flex flex-col gap-4 p-4 sm:p-5',
        compact ? '' : 'sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <audio ref={audioRef} src={stream} preload="metadata" />

      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/12 text-brand">
          <Radio aria-hidden className="h-5 w-5" />
        </span>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-semibold tracking-[-0.015em]">Bad Habit Radio</h3>

            {playing ? (
              <span
                aria-live="polite"
                className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand"
              >
                <span className="relative flex h-2 w-2" aria-hidden>
                  <span className="absolute inline-flex h-full w-full rounded-full bg-brand opacity-75 motion-safe:animate-ping motion-reduce:hidden" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
                </span>
                <RadioBars playing />
                <span>в эфире</span>
              </span>
            ) : (
              <span aria-live="polite" className="text-[11px] text-muted">
                прямой эфир команды
              </span>
            )}
          </div>

          <p className="mt-0.5 flex items-center gap-1 truncate text-[12px] text-muted">
            <Volume2 aria-hidden className="h-3 w-3 shrink-0" />
            {playing
              ? 'Сейчас играет — слушайте прямо на странице.'
              : 'Нажмите play, и поток заиграет здесь.'}
            <span className="hidden sm:inline" aria-hidden>· Live365</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void copyStream()}
          aria-label="Скопировать ссылку на поток"
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-line px-3.5 text-[12px] font-medium text-muted transition-colors hover:border-fg/40 hover:text-fg focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        >
          {copied ? (
            <Check aria-hidden className="h-3.5 w-3.5 text-brand" />
          ) : (
            <Link2 aria-hidden className="h-3.5 w-3.5" />
          )}
          <span aria-live="polite">{copied ? 'Скопировано' : 'Ссылка'}</span>
        </button>

        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? 'Пауза' : 'Слушать радио'}
          aria-pressed={playing}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/25 transition-transform hover:scale-[1.04] focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none active:scale-95"
        >
          {playing ? (
            <Pause aria-hidden className="h-5 w-5" />
          ) : (
            <Play aria-hidden className="ml-0.5 h-5 w-5" />
          )}
        </button>
      </div>

      {broken && (
        <p role="status" className="text-[12px] text-brand">
          Поток недоступен — проверьте ссылку в настройках.
        </p>
      )}

      {fallback && (
        <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-[12px]">
          <span className="text-muted">Скопируйте вручную:</span>
          <input
            readOnly
            value={fallback}
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 truncate rounded bg-transparent font-mono text-[11px] text-fg outline-none"
          />
        </div>
      )}
    </div>
  )
}