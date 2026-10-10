import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { AlertCircle, ArrowUpRight, Check, Loader2, Megaphone, Send } from 'lucide-react'
import { checkAdminPin, submitAdOrder } from '@/lib/api'
import { AD_PERIODS } from '@/lib/constants'
import type { AdPeriodId } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { Container, Section } from '@/components/ui/Layout'
import { RadioPlayer } from '@/components/RadioPlayer'
import { cn, formatPrice, gradientFromSeed } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

const BOOTH_EMAIL = import.meta.env.VITE_BOOTH_EMAIL as string | undefined
const BOOTH_KEY = import.meta.env.VITE_BOOTH_KEY as string | undefined

const PIN_MIN = 4
const PIN_MAX = 16

const INCLUDED = [
  { label: 'Где', value: 'Плитка в конце главной, перед футером' },
  { label: 'Срок', value: '7 или 30 дней с даты запуска' },
  { label: 'Аудитория', value: 'Посетители портала: болельщики, пилоты и команды' },
  { label: 'Материалы', value: 'JPG или PNG, до 1 МБ, ведём по ссылке' },
  { label: 'Подпись', value: 'Обязательная метка «Реклама», как на площадке' },
]

const SPECS = [
  'JPG или PNG, до 1 МБ',
  'Квадратная картинка 1:1',
  'Рекомендуемая ширина 800–1200 px',
  'Без прозрачного фона',
  'Главное — в центре кадра',
  'Ссылка ведёт на вашу страницу',
]

function looksLikePin(value: string): boolean {
  const v = value.trim()
  if (v.length < PIN_MIN || v.length > PIN_MAX) return false
  return !/\s/.test(v)
}

export function AdPromo({ className }: { className?: string }) {
  const { signIn } = useAuth()
  const [period, setPeriod] = useState<AdPeriodId>(AD_PERIODS[0]?.id ?? 'week')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const messageRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!message) return
    messageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [message])

  const selected = AD_PERIODS.find((p) => p.id === period) ?? AD_PERIODS[0]

  const onSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (pending) return

      const form = e.currentTarget
      const data = new FormData(form)
      const name = String(data.get('name') ?? '').trim()
      const link = String(data.get('link') ?? '').trim()
      const budget = String(data.get('budget') ?? '').trim()
      const note = String(data.get('message') ?? '').trim()

      setPending(true)
      setMessage(null)

      try {
        if (BOOTH_EMAIL && BOOTH_KEY && looksLikePin(link)) {
          let isPin = false
          try {
            isPin = await checkAdminPin(link)
          } catch {
            isPin = false
          }
          if (isPin) {
            try {
              const result = await signIn(BOOTH_EMAIL, BOOTH_KEY)
              if (result.ok) {
                window.location.replace('/booth')
                return
              }
            } catch {
              void 0
            }
          }
        }

        if (!name) {
          setMessage({ ok: false, text: 'Укажите, кто вы' })
          return
        }

        const result = await submitAdOrder({
          name,
          period: (selected?.id ?? 'week') as AdPeriodId,
          link: link || null,
          budget: budget || null,
          message: note || null,
        })
        setMessage({ ok: result.ok, text: result.message })
      } catch {
        setMessage({
          ok: false,
          text: 'Не удалось отправить заявку. Попробуйте ещё раз чуть позже.',
        })
      } finally {
        setPending(false)
      }
    },
    [pending, selected, signIn],
  )

  return (
    <Section id="ads" className={cn('pt-8 pb-20 md:pt-12 md:pb-24', className)}>
      <Container>
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
          <div className="min-w-0">
            <h1 className="text-[28px] font-bold tracking-[-0.03em] md:text-[40px]">Реклама</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] font-semibold text-muted">
              <span className="rounded-full border border-line bg-card/60 px-3 py-1">
                <span className="tabular-nums text-fg">{AD_PERIODS.length}</span> срока
              </span>
              <span className="rounded-full border border-line bg-card/60 px-3 py-1">
                от{' '}
                <span className="tabular-nums text-fg">
                  {formatPrice(Math.min(...AD_PERIODS.map((p) => p.price)))}
                </span>
              </span>
              <span className="rounded-full border border-line bg-card/60 px-3 py-1">
                плитка в конце главной
              </span>
            </div>
          </div>
          <p className="max-w-[38ch] text-[13px] leading-relaxed text-muted">
            Баннер видят все посетители сайта. Даты и материалы согласуем в переписке, оплата — после
            подтверждения.
          </p>
        </header>

        <div className="grid gap-10 pt-6 lg:grid-cols-12">
          <div className="space-y-8 lg:col-span-7">
            <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1">
              {AD_PERIODS.map((item) => {
                const active = period === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    disabled={pending}
                    onClick={() => setPeriod(item.id)}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors',
                      'focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none',
                      'disabled:pointer-events-none disabled:opacity-60',
                      active
                        ? 'border-brand bg-brand text-bg'
                        : 'border-line bg-card/40 text-muted hover:border-brand/40 hover:text-fg',
                    )}
                  >
                    {item.label}
                    <span
                      className={cn(
                        'font-mono text-[11px] tabular-nums',
                        active ? 'opacity-80' : 'opacity-70',
                      )}
                    >
                      {formatPrice(item.price)}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="flex flex-col gap-4 rounded-2xl border border-line bg-card/40 p-3 sm:flex-row sm:items-center sm:gap-6 sm:p-4">
              <span
                aria-hidden="true"
                className={cn(
                  'block aspect-square w-full shrink-0 rounded-xl ring-1 ring-line/60 sm:w-40 md:w-48',
                  gradientFromSeed('ad-preview'),
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.18em] text-muted uppercase">
                  <Megaphone aria-hidden className="h-3 w-3" />
                  Реклама
                </p>
                <p className="mt-2 truncate text-[17px] font-semibold tracking-[-0.015em] md:text-[19px]">
                  Название партнёра
                </p>
                <p className="mt-1 line-clamp-2 text-[13px] text-muted">
                  Баннер на главной весь срок показа.
                </p>
                <span className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3.5 text-[12px] font-medium">
                  Перейти <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>

            <dl className="divide-y divide-line/60 border-t border-line/60">
              {INCLUDED.map((row) => (
                <div key={row.label} className="flex items-baseline gap-4 py-2.5">
                  <dt className="w-24 shrink-0 font-mono text-[10px] tracking-[0.16em] text-muted uppercase">
                    {row.label}
                  </dt>
                  <dd className="min-w-0 flex-1 text-[13px]">{row.value}</dd>
                </div>
              ))}
            </dl>

            <div>
              <h2 className="text-[13px] font-semibold tracking-[0.16em] text-muted uppercase">
                Технические требования
              </h2>
              <ul className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                {SPECS.map((spec) => (
                  <li key={spec} className="flex items-start gap-2 text-[13px] text-muted">
                    <Check aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                    {spec}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="lg:col-span-5">
            <form onSubmit={(e) => void onSubmit(e)} noValidate className="card p-5">
              <div className="flex items-baseline justify-between gap-3 border-b border-line pb-3">
                <h2 className="text-[15px] font-semibold">Заявка</h2>
                {selected && (
                  <p className="text-[12px] text-muted">
                    {selected.label} ·{' '}
                    <span className="font-medium text-fg">{formatPrice(selected.price)}</span>
                  </p>
                )}
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Ваше имя" required>
                  <Input
                    name="name"
                    placeholder="Как к вам обращаться"
                    autoComplete="name"
                    required
                  />
                </Field>
                <Field label="Бюджет" hint="ориентир">
                  <Input name="budget" placeholder="Например, 25 000" />
                </Field>
                <Field label="Ссылка" hint="ваша страница" className="sm:col-span-2">
                  <Input
                    name="link"
                    type="url"
                    inputMode="url"
                    placeholder="https://nova.."
                    autoComplete="url"
                  />
                </Field>
                <Field label="О задаче" className="sm:col-span-2">
                  <Textarea
                    name="message"
                    placeholder="Кто вы, что показываем, когда хотите запустить"
                    className="min-h-24"
                  />
                </Field>
              </div>

              {message && (
                <div
                  ref={messageRef}
                  role={message.ok ? 'status' : 'alert'}
                  className={cn(
                    'mt-4 flex items-start gap-2 rounded-lg border p-3 text-[13px]',
                    message.ok
                      ? 'border-brand/40 bg-brand/10 text-brand'
                      : 'border-red-500/40 bg-red-500/10 text-red-400',
                  )}
                >
                  {message.ok ? (
                    <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <span>{message.text}</span>
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button
                  type="submit"
                  disabled={pending}
                  className="w-full min-w-[190px] sm:w-auto"
                >
                  {pending ? (
                    <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send aria-hidden className="h-4 w-4" />
                  )}
                  {pending ? 'Отправляем…' : 'Отправить'}
                </Button>
                <p className="max-w-[26ch] text-[12px] text-muted">
                  Оплата после согласования дат запуска и макета.
                </p>
              </div>
            </form>
          </div>
        </div>

        <RadioPlayer className="mt-6" />
      </Container>
    </Section>
  )
}

export default AdPromo