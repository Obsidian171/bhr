import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Database, ExternalLink, FileCode2, RefreshCw } from 'lucide-react'
import { FlagGlyph } from '@/components/layout/Logo'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Layout'
import { usePageMeta } from '@/hooks/usePageMeta'

/* --------------------------------- utils ---------------------------------- */

const DOCS_URL =
  'https://supabase.com/docs/guides/getting-started/quickstarts/reactjs'

/**
 * Возвращает безопасный origin текущего окна.
 * - Не падает в SSR/тестах, где нет `window`.
 * - Не падает, если `location.origin` мусорный.
 * - Отсекает нестандартные порты/query, оставляя только схему+хост.
 * - Возвращает фолбэк, если что-то не так.
 */
function safeOrigin(fallback = 'https://example.com'): string {
  try {
    if (typeof window === 'undefined') return fallback
    const raw = window.location?.origin
    if (!raw) return fallback
    const url = new URL(raw)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return fallback
    return `${url.protocol}//${url.host}`
  } catch {
    return fallback
  }
}

/**
 * Копирует текст в буфер обмена. Не кидает исключений наружу.
 * Порядок: современный Clipboard API → fallback через execCommand.
 * Ничего не рендерит и не логирует.
 */
function copyText(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        navigator.clipboard
          .writeText(text)
          .then(() => resolve(true))
          .catch(() => resolve(copyViaExecCommand(text)))
        return
      }
      resolve(copyViaExecCommand(text))
    } catch {
      resolve(false)
    }
  })
}

/** Устаревший, но всё ещё рабочий способ — только как fallback. */
function copyViaExecCommand(text: string): boolean {
  try {
    if (typeof document === 'undefined') return false
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.top = '-1000px'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}

/** Безопасная перезагрузка страницы. */
function reloadPage(): void {
  try {
    if (typeof window === 'undefined') return
    if (typeof window.location?.reload !== 'function') return
    window.location.reload()
  } catch {
    /* no-op */
  }
}

/* -------------------------------- EnvBlock -------------------------------- */

function EnvBlock({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  const onCopy = async () => {
    const ok = await copyText(value)
    if (!ok) return
    setCopied(true)
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      setCopied(false)
      timerRef.current = null
    }, 1600)
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-elevated">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <div className="flex items-center gap-2 text-[13px] font-semibold">
          <FileCode2 aria-hidden className="h-4 w-4 text-brand" />
          <code className="font-mono text-[12px] tracking-wide">.env</code>
        </div>
        <button
          type="button"
          onClick={() => {
            void onCopy()
          }}
          aria-label={copied ? 'Скопировано' : 'Скопировать переменные'}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-[12px] font-semibold text-muted transition-colors hover:border-brand/40 hover:text-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        >
          {copied ? (
            <>
              <Check aria-hidden className="h-3.5 w-3.5 text-brand" />
              Скопировано
            </>
          ) : (
            <>
              <Copy aria-hidden className="h-3.5 w-3.5" />
              Копировать
            </>
          )}
        </button>
      </div>

      {/* Значение приходит строкой и рендерится как текст — XSS через children невозможен. */}
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed text-muted">
        <code className="font-mono">{value}</code>
      </pre>
    </div>
  )
}

/* ------------------------------ NotConfigured ------------------------------ */

export function NotConfigured() {
  usePageMeta('База данных не настроена')

  // Значение для примера .env собираем безопасно: origin валидируется, остальное — константы.
  const envSample = [
    'VITE_SUPABASE_URL=https://<project-ref>.supabase.co',
    'VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>',
    `VITE_SITE_URL=${safeOrigin('https://reverb.example')}`,
  ].join('\n')

  return (
    <div className="flex min-h-screen flex-col bg-bg text-fg">
      {/* -------------------------------- Хедер -------------------------------- */}
      <header className="border-b border-line">
        <Container className="flex h-14 items-center gap-2.5">
          <span className="brand-gradient flex h-9 w-9 items-center justify-center rounded-[10px]">
            <FlagGlyph className="h-[19px] w-[19px] text-white" />
          </span>
          <span className="text-[15px] leading-none font-semibold">
            <span className="block">BAD HABIT</span>
            <span className="block text-[11px] font-semibold tracking-[0.16em] text-brand">
              RACING
            </span>
          </span>
        </Container>
      </header>

      {/* --------------------------------- Тело -------------------------------- */}
      <main className="flex flex-1 items-center py-16 md:py-20">
        <Container className="max-w-2xl">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand/30 bg-brand/10 text-brand">
            <Database aria-hidden className="h-6 w-6" />
          </span>

          <h1 className="mt-6 text-[clamp(1.75rem,4.2vw,2.75rem)] leading-[1.05] font-bold tracking-[-0.035em] text-balance">
            База данных <span className="text-brand">не подключена</span>
          </h1>

          {/* ------------------------------- Шаги ------------------------------- */}
          <ol className="mt-8 space-y-3">
            <li className="card group flex gap-4 p-4 transition-colors hover:border-brand/30">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[12px] font-bold tabular-nums text-brand ring-1 ring-brand/20 transition-transform group-hover:scale-105">
                1
              </span>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold">Создайте проект</div>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">
                  Новый проект в Supabase и выполните supabase/schema.sql в SQL Editor.
                </p>
              </div>
            </li>

            <li className="card group flex gap-4 p-4 transition-colors hover:border-brand/30">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[12px] font-bold tabular-nums text-brand ring-1 ring-brand/20 transition-transform group-hover:scale-105">
                2
              </span>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold">Заполните .env</div>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">
                  Укажите VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY из настроек проекта.
                </p>
              </div>
            </li>

            <li className="card group flex gap-4 p-4 transition-colors hover:border-brand/30">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[12px] font-bold tabular-nums text-brand ring-1 ring-brand/20 transition-transform group-hover:scale-105">
                3
              </span>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold">Перезапустите сборку</div>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">
                  Переменные читаются только при старте — выполните npm run dev заново.
                </p>
              </div>
            </li>
          </ol>

          {/* ------------------------------ .env блок ---------------------------- */}
          <div className="mt-8 space-y-3">
            <EnvBlock value={envSample} />
            <p className="text-[13px] leading-relaxed text-muted">
              Шаблон с этими переменными — в файле{' '}
              <code className="rounded bg-fg/5 px-1.5 py-0.5 font-mono text-[12px] tabular-nums">
                .env.example
              </code>
              .
            </p>
          </div>

          {/* ------------------------------ Действия ----------------------------- */}
          <div className="mt-8 flex flex-wrap items-center gap-2.5">
            <Button onClick={reloadPage} variant="brand" size="md">
              <RefreshCw aria-hidden className="h-4 w-4" />
              Обновить страницу
            </Button>

            {/*
              Внешняя ссылка: рендерим напрямую как <a>, чтобы гарантированно
              иметь rel="noreferrer noopener" и target="_blank".
            */}
            <a
              href={DOCS_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-[14px] font-semibold text-fg transition-colors hover:border-brand/40 hover:text-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
              Документация Supabase
              <ExternalLink aria-hidden className="h-4 w-4" />
            </a>
          </div>
        </Container>
      </main>
    </div>
  )
}

export default NotConfigured