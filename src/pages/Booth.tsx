import { useCallback, useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowLeft,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  LayoutDashboard,
  Link2,
  ListMusic,
  Loader2,
  LogOut,
  Megaphone,
  Newspaper,
  Pencil,
  Plus,
  Radio,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useSite } from '@/context/SiteContext'
import { QUERY_KEYS, useQuery } from '@/hooks/useQuery'
import {
  createAdBanner,
  createCircuit,
  createEvent,
  createHallEntry,
  createPilot,
  createPost,
  deleteAdBanner,
  deleteAdOrder,
  deleteCircuit,
  deleteEvent,
  deleteHallEntry,
  deletePilot,
  deletePost,
  fetchAdBanners,
  fetchAdOrders,
  fetchCircuits,
  fetchEvents,
  fetchHallOfFame,
  fetchPilots,
  fetchPosts,
  moveCircuit,
  moveEvent,
  moveHallEntry,
  updateAdBanner,
  updateAdOrderStatus,
  updateCircuit,
  updateEvent,
  updateHallEntry,
  updatePilot,
  updatePost,
  updateSiteSettings,
} from '@/lib/api'
import {
  AD_ORDER_STATUSES,
  AD_PERIODS,
  EVENT_MODES,
  EVENT_STATUSES,
  HALL_KINDS,
  STAFF_ACCESS,
  TEAM_PLACES,
} from '@/lib/constants'
import { HallKindIcon } from '@/components/HallKindIcon'
import type {
  AdBanner,
  AdOrder,
  AdOrderStatus,
  Circuit,
  HallEntry,
  Pilot,
  Post,
  TeamEvent,
} from '@/lib/types'
import { Button, ButtonLink } from '@/components/ui/Button'
import { RADIO_STREAM_URL } from '@/components/RadioPlayer'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Container, EmptyState, Section, Spinner } from '@/components/ui/Layout'
import { Badge } from '@/components/ui/Primitives'
import { ImageUpload } from '@/components/ImageUpload'
import { cn, formatDate, isFutureDate } from '@/lib/utils'
import { usePageMeta } from '@/hooks/usePageMeta'

import NotFound from '@/pages/NotFound'

type Tab = 'home' | 'journal' | 'pilots' | 'circuits' | 'events' | 'hall' | 'ads' | 'settings'

const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: 'Главная' },
  { id: 'pilots', label: 'Пилоты' },
  { id: 'circuits', label: 'Трассы' },
  { id: 'events', label: 'Мероприятия' },
  { id: 'journal', label: 'Журнал' },
  { id: 'hall', label: 'Зал славы' },
  { id: 'ads', label: 'Реклама' },
  { id: 'settings', label: 'Настройки' },
]

const TAB_ICONS: Record<Tab, LucideIcon> = {
  home: LayoutDashboard,
  pilots: Users,
  circuits: ListMusic,
  events: CalendarClock,
  journal: Newspaper,
  hall: Trophy,
  ads: Megaphone,
  settings: Link2,
}

function useAction() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async (fn: () => Promise<unknown>) => {
    setPending(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить')
    } finally {
      setPending(false)
    }
  }, [])

  return { run, pending, error }
}

export default function Booth() {
  usePageMeta('Панель', undefined, undefined, { noindex: true })
  const { user, loading, signOut, profile, profileLoading } = useAuth()
  const { site } = useSite()
  const [tab, setTab] = useState<Tab>('home')

  // Права известны только после загрузки профиля. До этого «не решаем» про доступ.
  const canEdit =
    Boolean(user) && STAFF_ACCESS.includes((profile?.role ?? '') as (typeof STAFF_ACCESS)[number])

  // Данные тянем только когда точно есть доступ — аноним/не-сотрудник не грузит базу.
  const { data: posts } = useQuery(
    () => (canEdit ? fetchPosts() : Promise.resolve([] as Post[])),
    [] as Post[],
    [canEdit],
    QUERY_KEYS.posts,
  )
  const { data: pilots } = useQuery(
    () => (canEdit ? fetchPilots() : Promise.resolve([] as Pilot[])),
    [] as Pilot[],
    [canEdit],
    QUERY_KEYS.pilots,
  )
  const { data: circuits } = useQuery(
    () => (canEdit ? fetchCircuits() : Promise.resolve([] as Circuit[])),
    [] as Circuit[],
    [canEdit],
    QUERY_KEYS.circuits,
  )
  const { data: events } = useQuery(
    () => (canEdit ? fetchEvents() : Promise.resolve([] as TeamEvent[])),
    [] as TeamEvent[],
    [canEdit],
    QUERY_KEYS.events,
  )
  const { data: hallEntries } = useQuery(
    () => (canEdit ? fetchHallOfFame() : Promise.resolve([] as HallEntry[])),
    [] as HallEntry[],
    [canEdit],
    QUERY_KEYS.hall,
  )
  const { data: orders } = useQuery(
    () => (canEdit ? fetchAdOrders() : Promise.resolve([] as AdOrder[])),
    [] as AdOrder[],
    [canEdit],
    QUERY_KEYS.adOrders,
  )

  const newOrders = orders.filter((o) => o.status === 'new').length

  const tabCounts: Partial<Record<Tab, { total: number; alert?: number }>> = {
    pilots: { total: pilots.length },
    circuits: { total: circuits.length },
    events: { total: events.length },
    journal: { total: posts.length },
    hall: { total: hallEntries.length },
    ads: { total: orders.length, alert: newOrders },
  }

  // Ждём и сессию, и профиль: так не мелькает 404 перед тем, как роль доехала.
  if (loading || profileLoading) {
    return (
      <Section className="pt-6 pb-20 md:pt-10">
        <Container>
          <div className="flex justify-center py-24">
            <Spinner className="h-8 w-8" />
          </div>
        </Container>
      </Section>
    )
  }

  // Панель доступна только залогиненным staff. Без входа/прав — честный 404.
  if (!user || !canEdit) return <NotFound />

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <Section className="pt-6 pb-20 md:pt-10">
      <Container>
        {/* ------------------------------- Шапка панели ------------------------------- */}
        <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-brand/30 bg-brand/10 text-brand">
              <LayoutDashboard className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-[24px] leading-tight font-bold tracking-[-0.03em] md:text-[32px]">
                Редакция
              </h1>
              <p className="truncate text-[12px] text-muted">{user.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonLink to={site.radio_stream_url ?? RADIO_STREAM_URL} size="sm" variant="outline">
              <Radio className="h-4 w-4" />
              Радио
            </ButtonLink>
            <ButtonLink to="/" size="sm" variant="outline">
              <ArrowLeft className="h-4 w-4" />
              На сайт
            </ButtonLink>
            <Button size="sm" variant="outline" onClick={() => void handleSignOut()}>
              <LogOut className="h-4 w-4" />
              Выйти
            </Button>
          </div>
        </header>

        <div className="mt-6 gap-8 md:flex md:items-start">
          {/* --------------------- Мобильные табы (пилюли) --------------------- */}
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 md:hidden no-scrollbar">
            {TABS.map((item) => {
              const count = tabCounts[item.id]
              const active = tab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none',
                    active
                      ? 'border-brand bg-brand text-bg'
                      : 'border-line bg-card/60 text-muted hover:border-brand/40 hover:text-fg',
                  )}
                >
                  {item.label}
                  {count && (
                    <span
                      className={cn(
                        'rounded-md px-1.5 py-0.5 text-[10px] tabular-nums',
                        active ? 'bg-bg/20' : 'bg-fg/5 text-muted',
                      )}
                    >
                      {count.total}
                    </span>
                  )}
                  {count?.alert ? (
                    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-bg">
                      {count.alert}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>

          {/* --------------------- Десктопная навигация --------------------- */}
          <nav
            aria-label="Разделы панели"
            className="sticky top-24 hidden w-56 shrink-0 flex-col gap-1 md:flex"
          >
            {TABS.map((item) => {
              const Icon = TAB_ICONS[item.id]
              const count = tabCounts[item.id]
              const active = tab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'group relative flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-[14px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none',
                    active ? 'bg-fg/[0.06] text-fg' : 'text-fg/70 hover:bg-fg/[0.04] hover:text-fg',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand transition-opacity',
                      active ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {count && (
                    <span className="shrink-0 text-[12px] tabular-nums text-muted">{count.total}</span>
                  )}
                  {count?.alert ? (
                    <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-bg">
                      {count.alert}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </nav>

          {/* --------------------- Контент --------------------- */}
          <div className="mt-6 min-w-0 flex-1 md:mt-0">
            {tab === 'home' && <DashboardTab onNavigate={setTab} />}
            {tab === 'pilots' && <PilotsTab />}
            {tab === 'circuits' && <CircuitsTab />}
            {tab === 'events' && <EventsTab />}
            {tab === 'journal' && <JournalTab />}
            {tab === 'hall' && <HallTab />}
            {tab === 'ads' && <AdsTab />}
            {tab === 'settings' && <SettingsTab />}
          </div>
        </div>
      </Container>
    </Section>
  )
}

/* --------------------------------- dashboard --------------------------------- */

function DashboardTab({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const { data: posts } = useQuery(fetchPosts, [] as Post[], [], QUERY_KEYS.posts)
  const { data: pilots } = useQuery(fetchPilots, [] as Pilot[], [], QUERY_KEYS.pilots)
  const { data: circuits } = useQuery(fetchCircuits, [] as Circuit[], [], QUERY_KEYS.circuits)
  const { data: events } = useQuery(fetchEvents, [] as TeamEvent[], [], QUERY_KEYS.events)
  const { data: entries } = useQuery(fetchHallOfFame, [] as HallEntry[], [], QUERY_KEYS.hall)
  const { data: orders } = useQuery(fetchAdOrders, [] as AdOrder[], [], QUERY_KEYS.adOrders)

  const empty = pilots.length === 0

  const stats: { label: string; value: number; icon: LucideIcon }[] = [
    { label: 'Пилоты', value: pilots.length, icon: Users },
    { label: 'Трассы', value: circuits.length, icon: ListMusic },
    { label: 'Мероприятия', value: events.length, icon: CalendarClock },
    { label: 'Журнал', value: posts.length, icon: Newspaper },
    { label: 'Зал славы', value: entries.length, icon: Trophy },
    { label: 'Баннеры', value: orders.length, icon: Megaphone },
  ]

  const quick: { label: string; icon: LucideIcon; to: Tab }[] = [
    { label: 'Пилот', icon: Users, to: 'pilots' },
    { label: 'Трасса', icon: ListMusic, to: 'circuits' },
    { label: 'Мероприятие', icon: CalendarClock, to: 'events' },
    { label: 'Запись в журнал', icon: Newspaper, to: 'journal' },
    { label: 'Зал славы', icon: Trophy, to: 'hall' },
    { label: 'Баннер', icon: Megaphone, to: 'ads' },
    { label: 'Настройки сайта', icon: Link2, to: 'settings' },
  ]

  return (
    <div>
      <TabHeader title="Главная" hint="Сводка материалов команды." />

      {empty && (
        <div className="mb-5 rounded-xl border border-brand/30 bg-brand/[0.06] p-4 text-[13px] leading-relaxed text-fg/80">
          Команда пока пуста. Начните с <span className="font-semibold text-fg">пилота</span> — остальное
          подтянется само.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((item) => (
          <div key={item.label} className="card p-4 transition-colors hover:border-brand/30">
            <div className="flex items-center justify-between">
              <span className="text-[11px] tracking-[0.12em] text-muted uppercase">{item.label}</span>
              <item.icon className="h-4 w-4 text-muted/60" />
            </div>
            <div className="mt-2 text-[28px] leading-none font-bold tabular-nums">{item.value}</div>
          </div>
        ))}
      </div>

      <div className="card mt-4 p-4">
        <div className="text-[11px] tracking-[0.12em] text-muted uppercase">Быстрые действия</div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {quick.map((item) => (
            <button
              key={item.to}
              onClick={() => onNavigate(item.to)}
              className="flex items-center gap-2 rounded-lg border border-line px-3 py-2.5 text-[13px] font-medium transition-colors hover:border-brand/40 hover:text-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] tracking-[0.12em] text-muted uppercase">Заявки на рекламу</div>
            {orders.length > 0 && (
              <button
                onClick={() => onNavigate('ads')}
                className="flex items-center gap-1 text-[12px] font-semibold text-brand hover:underline"
              >
                Все ({orders.length}) <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {orders.length === 0 ? (
            <p className="mt-3 text-[13px] text-muted">Заявок пока нет.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {orders.slice(0, 4).map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-semibold">{order.name}</div>
                    <div className="text-[11px] text-muted">{formatDate(order.created_at)}</div>
                  </div>
                  <Badge
                    tone={
                      order.status === 'new' ? 'lime' : order.status === 'rejected' ? 'red' : 'neutral'
                    }
                  >
                    {AD_ORDER_STATUSES.find((s) => s.id === order.status)?.label ?? order.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] tracking-[0.12em] text-muted uppercase">Свежие записи журнала</div>
            {posts.length > 0 && (
              <button
                onClick={() => onNavigate('journal')}
                className="flex items-center gap-1 text-[12px] font-semibold text-brand hover:underline"
              >
                Все ({posts.length}) <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {posts.length === 0 ? (
            <p className="mt-3 text-[13px] text-muted">В журнале пока пусто.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {posts.slice(0, 4).map((post) => (
                <li key={post.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-semibold">{post.title}</div>
                    <div className="text-[11px] text-muted">
                      {post.published_at ? formatDate(post.published_at) : '—'}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted/60" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------ journal --------------------------------- */

const EMPTY_POST = {
  title: '',
  body: '',
  excerpt: '',
  category: '',
  cover_url: '',
  via_url: '',
  published_at: '',
  kind: 'journal',
}

function JournalTab() {
  const { data: posts, refetch } = useQuery(fetchPosts, [] as Post[], [], QUERY_KEYS.posts)
  const [form, setForm] = useState(EMPTY_POST)
  const [editingId, setEditingId] = useState<string | null>(null)
  const { run, pending, error } = useAction()

  const buildDraft = () => ({
    title: form.title.trim(),
    body: form.body.trim(),
    excerpt: form.excerpt.trim() || form.body.trim().slice(0, 160),
    category: form.category.trim() || null,
    cover_url: form.cover_url.trim() || null,
    via_url: form.via_url.trim() || null,
    kind: form.kind as Post['kind'],
    published_at: form.published_at ? new Date(form.published_at).toISOString() : new Date().toISOString(),
    read_minutes: Math.max(1, Math.round(form.body.split(/\s+/).filter(Boolean).length / 180)),
  })

  const save = (e: FormEvent) => {
    e.preventDefault()
    void run(async () => {
      if (editingId) await updatePost(editingId, buildDraft())
      else await createPost(buildDraft())
      setForm(EMPTY_POST)
      setEditingId(null)
      refetch()
    })
  }

  const startEdit = (post: Post) => {
    setEditingId(post.id)
    setForm({
      title: post.title,
      body: post.body,
      excerpt: post.excerpt ?? '',
      category: post.category ?? '',
      cover_url: post.cover_url ?? '',
      via_url: post.via_url ?? '',
      published_at: post.published_at ? post.published_at.slice(0, 10) : '',
      kind: post.kind ?? 'journal',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div>
      <TabHeader
        title="Журнал"
        hint="Статьи журнала и строки ленты новостей. Порядок — по дате публикации."
      />

      <ErrorNote message={error} />

      <form onSubmit={save} className="card mb-6 p-4 sm:p-5">
        <FormSection title={editingId ? 'Редактирование записи' : 'Новая запись'}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Заголовок" required className="sm:col-span-2">
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </Field>
            <Field label="Формат">
              <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                <option value="journal">Статья журнала</option>
                <option value="news">Запись в ленте новостей</option>
              </Select>
            </Field>
            <Field label="Рубрика">
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Новости, Интервью, Разбор"
              />
            </Field>
            <Field label="Дата">
              <Input
                type="date"
                value={form.published_at}
                onChange={(e) => setForm({ ...form, published_at: e.target.value })}
              />
            </Field>
            <Field label="Короткое описание">
              <Input
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                placeholder="Если пусто — возьмём начало текста"
              />
            </Field>
            <Field label="Обложка" className="sm:col-span-2">
              <ImageUpload
                value={form.cover_url}
                onChange={(url) => setForm({ ...form, cover_url: url })}
                aspect={16 / 9}
                hint="Загрузится в хранилище BHR, можно вставить ссылку вручную. Максимум 1200×1200."
              />
            </Field>
            <Field label="Текст" hint="абзацы разделяются пустой строкой" className="sm:col-span-2">
              <Textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                className="min-h-40"
                required
              />
            </Field>
          </div>
        </FormSection>

        <FormActions>
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : editingId ? (
              <Pencil className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {editingId ? 'Сохранить' : 'Опубликовать'}
          </Button>
          {editingId && (
            <CancelEdit
              onClick={() => {
                setEditingId(null)
                setForm(EMPTY_POST)
              }}
            />
          )}
        </FormActions>
      </form>

      {posts.length === 0 ? (
        <EmptyState title="Записей пока нет" />
      ) : (
        <ul className="space-y-2">
          {posts.map((post) => (
            <li
              key={post.id}
              className="card flex items-start justify-between gap-3 p-4 transition-colors hover:border-brand/30"
            >
              <div className="min-w-0">
                <div className="text-[15px] font-semibold">{post.title}</div>
                <div className="truncate text-[12px] text-muted">
                  {(post.kind === 'news' ? 'новость · ' : '') +
                    (post.category ?? 'без рубрики') +
                    ' · ' +
                    (post.published_at
                      ? new Date(post.published_at).toLocaleDateString('ru-RU')
                      : 'без даты')}
                </div>
              </div>
              <RowActions
                onEdit={() => startEdit(post)}
                onDelete={() =>
                  run(() => {
                    if (!window.confirm(`Удалить запись «${post.title}»?`)) return Promise.resolve()
                    return deletePost(post.id).then(refetch)
                  })
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ------------------------------------ pilots ---------------------------------- */

const EMPTY_PILOT = {
  name: '',
  photo_url: '',
  cover_url: '',
  points: '0',
  team_place: '',
  bio: '',
  car: '',
  number: '',
  country: '',
  nova_url: '',
  featured: false,
  is_extra: false,
  role_text: '',
}

function PilotsTab() {
  const { data: pilots, refetch } = useQuery(fetchPilots, [] as Pilot[], [], QUERY_KEYS.pilots)
  const [form, setForm] = useState(EMPTY_PILOT)
  const [editingId, setEditingId] = useState<string | null>(null)
  const { run, pending, error } = useAction()

  const startEdit = (pilot: Pilot) => {
    setEditingId(pilot.id)
    setForm({
      name: pilot.name,
      photo_url: pilot.photo_url ?? '',
      cover_url: pilot.cover_url ?? '',
      points: String(pilot.points ?? 0),
      team_place: pilot.team_place != null ? String(pilot.team_place) : '',
      bio: pilot.bio ?? '',
      car: pilot.car ?? '',
      number: pilot.number ?? '',
      country: pilot.country ?? '',
      nova_url: pilot.nova_url ?? '',
      featured: Boolean(pilot.featured),
      is_extra: Boolean(pilot.is_extra),
      role_text: pilot.role_text ?? '',
    })
  }

  const save = (e: FormEvent) => {
    e.preventDefault()
    void run(async () => {
      const draft = {
        name: form.name.trim(),
        photo_url: form.photo_url.trim() || null,
        cover_url: form.cover_url.trim() || null,
        points: form.is_extra ? 0 : Number(form.points) || 0,
        team_place: form.is_extra ? null : form.team_place ? Number(form.team_place) : null,
        bio: form.bio.trim() || null,
        car: form.car.trim() || null,
        number: form.is_extra ? null : form.number.trim() || null,
        country: form.country.trim() || null,
        nova_url: form.nova_url.trim() || null,
        featured: form.is_extra ? false : form.featured,
        is_extra: form.is_extra,
        role_text: form.role_text.trim() || null,
      }
      if (editingId) await updatePilot(editingId, draft)
      else await createPilot(draft)
      setForm(EMPTY_PILOT)
      setEditingId(null)
      refetch()
    })
  }

  return (
    <div>
      <TabHeader
        title="Пилоты"
        hint="Состав команды: фото, баллы, место в составе, машина и мини-биография."
      />

      <ErrorNote message={error} />

      <form onSubmit={save} className="card mb-6 p-4 sm:p-5">
        <FormSection title={editingId ? 'Редактирование пилота' : 'Новый пилот'}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Имя" required>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Стартовый номер">
              <Input
                value={form.number}
                disabled={form.is_extra}
                onChange={(e) => setForm({ ...form, number: e.target.value })}
                placeholder={form.is_extra ? 'нет — доп. состав' : 'например, 7'}
              />
            </Field>
            <Field label="Страна">
              <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </Field>
            <Field label="Баллы сезона">
              <Input
                type="number"
                min={0}
                value={form.points}
                disabled={form.is_extra}
                onChange={(e) => setForm({ ...form, points: e.target.value })}
              />
            </Field>
            <Field label="Место в команде">
              <Select
                value={form.team_place}
                disabled={form.is_extra}
                onChange={(e) => setForm({ ...form, team_place: e.target.value })}
              >
                <option value="">— без места —</option>
                {TEAM_PLACES.map((place) => (
                  <option key={place} value={place}>
                    {place} место
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Машина">
              <Input
                value={form.car}
                onChange={(e) => setForm({ ...form, car: e.target.value })}
                placeholder="модель и класс"
              />
            </Field>
            <Field label="Ссылка на Nova" hint="профиль в соцсети" className="sm:col-span-2 lg:col-span-3">
              <Input
                value={form.nova_url}
                onChange={(e) => setForm({ ...form, nova_url: e.target.value })}
                placeholder="https://nova.gambit-rp.com/..."
              />
            </Field>
            <Field label="Фото пилота" className="sm:col-span-2 lg:col-span-3">
              <ImageUpload
                value={form.photo_url}
                onChange={(url) => setForm({ ...form, photo_url: url })}
                label="Фото"
                hint="Загрузится в хранилище BHR, можно вставить ссылку вручную."
              />
            </Field>
            <Field label="Обложка" className="sm:col-span-2 lg:col-span-3">
              <ImageUpload
                value={form.cover_url}
                onChange={(url) => setForm({ ...form, cover_url: url })}
                shape="wide"
                aspect={16 / 9}
                label="Обложка профиля"
                hint="Широкая картинка в шапке профиля пилота."
              />
            </Field>
            <Field label="Мини-биография" className="sm:col-span-2 lg:col-span-3">
              <Textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Пара предложений о пилоте"
                className="min-h-24"
              />
            </Field>
            <Field
              label="Роль / должность"
              hint="Пилотам — золотая, доп. составу — красная"
              className="sm:col-span-2 lg:col-span-3"
            >
              <Input
                value={form.role_text}
                onChange={(e) => setForm({ ...form, role_text: e.target.value })}
                placeholder={form.is_extra ? 'например, техник, инженер, врач' : 'например, второй пилот'}
              />
            </Field>
          </div>

          <div className="mt-4 flex flex-col gap-2 rounded-xl border border-line bg-surface/60 p-3">
            <CheckRow
              checked={form.featured}
              disabled={form.is_extra}
              onChange={(v) => setForm({ ...form, featured: v })}
              label="Лидер сезона (плашка на карточке)"
            />
            <CheckRow
              checked={form.is_extra}
              onChange={(v) => setForm({ ...form, is_extra: v })}
              label="Дополнительный состав (не гонщик: без номера, баллов и места; вне зачёта сезона)"
            />
          </div>
        </FormSection>

        <FormActions>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {editingId ? 'Сохранить' : 'Добавить пилота'}
          </Button>
          {editingId && (
            <CancelEdit
              onClick={() => {
                setEditingId(null)
                setForm(EMPTY_PILOT)
              }}
            />
          )}
        </FormActions>
      </form>

      {pilots.length === 0 ? (
        <EmptyState title="В команде пока пусто" description="Добавьте первого пилота — он появится на главной." />
      ) : (
        <ul className="space-y-2">
          {pilots.map((pilot) => (
            <li
              key={pilot.id}
              className="card flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:border-brand/30"
            >
              <div className="flex min-w-0 items-center gap-3">
                {pilot.photo_url ? (
                  <img
                    src={pilot.photo_url}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-elevated text-[11px] text-muted">
                    {pilot.name.slice(0, 1)}
                  </span>
                )}
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-semibold">
                    {pilot.number && <span className="text-brand">#{pilot.number} </span>}
                    {pilot.name}
                  </div>
                  <div className="truncate text-[12px] text-muted">
                    {[
                      pilot.role_text,
                      pilot.team_place && !pilot.is_extra ? `${pilot.team_place} место` : null,
                      pilot.car,
                      pilot.country,
                      !pilot.is_extra ? `баллов: ${pilot.points ?? 0}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'без данных'}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge tone={pilot.is_extra ? 'red' : pilot.featured ? 'brand' : 'neutral'}>
                  {pilot.is_extra ? 'доп. состав' : pilot.featured ? 'лидер' : 'состав'}
                </Badge>
                <RowActions
                  onEdit={() => startEdit(pilot)}
                  onDelete={() => {
                    if (!window.confirm(`Удалить пилота «${pilot.name}»?`)) return
                    void run(() => deletePilot(pilot.id).then(refetch))
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ----------------------------------- circuits --------------------------------- */

const EMPTY_CIRCUIT = {
  name: '',
  country: '',
  length_km: '',
  turns: '',
  lap_record: '',
  race_date: '',
  cover_url: '',
  description: '',
}

function CircuitsTab() {
  const { data: circuits, refetch } = useQuery(fetchCircuits, [] as Circuit[], [], QUERY_KEYS.circuits)
  const [form, setForm] = useState(EMPTY_CIRCUIT)
  const [editingId, setEditingId] = useState<string | null>(null)
  const { run, pending, error } = useAction()

  const startEdit = (circuit: Circuit) => {
    setEditingId(circuit.id)
    setForm({
      name: circuit.name,
      country: circuit.country ?? '',
      length_km: circuit.length_km != null ? String(circuit.length_km) : '',
      turns: circuit.turns != null ? String(circuit.turns) : '',
      lap_record: circuit.lap_record ?? '',
      race_date: circuit.race_date ? circuit.race_date.slice(0, 10) : '',
      cover_url: circuit.cover_url ?? '',
      description: circuit.description ?? '',
    })
  }

  const save = (e: FormEvent) => {
    e.preventDefault()
    void run(async () => {
      const draft = {
        name: form.name.trim(),
        country: form.country.trim() || null,
        length_km: form.length_km ? Number(form.length_km) : null,
        turns: form.turns ? Number(form.turns) : null,
        lap_record: form.lap_record.trim() || null,
        race_date: form.race_date || null,
        cover_url: form.cover_url.trim() || null,
        description: form.description.trim() || null,
      }
      if (editingId) await updateCircuit(editingId, draft)
      else await createCircuit(draft)
      setForm(EMPTY_CIRCUIT)
      setEditingId(null)
      refetch()
    })
  }

  return (
    <div>
      <TabHeader title="Трассы" hint="Справочник трасс: длина круга, повороты, рекорд и дата этапа." />

      <ErrorNote message={error} />

      <form onSubmit={save} className="card mb-6 p-4 sm:p-5">
        <FormSection title={editingId ? 'Редактирование трассы' : 'Новая трасса'}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Название трассы" required>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Страна">
              <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </Field>
            <Field label="Дата этапа">
              <Input
                type="date"
                value={form.race_date}
                onChange={(e) => setForm({ ...form, race_date: e.target.value })}
              />
            </Field>
            <Field label="Длина круга, км">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.length_km}
                onChange={(e) => setForm({ ...form, length_km: e.target.value })}
              />
            </Field>
            <Field label="Поворотов">
              <Input
                type="number"
                min={0}
                value={form.turns}
                onChange={(e) => setForm({ ...form, turns: e.target.value })}
              />
            </Field>
            <Field label="Рекорд круга">
              <Input
                value={form.lap_record}
                onChange={(e) => setForm({ ...form, lap_record: e.target.value })}
                placeholder="1:32.420"
              />
            </Field>
            <Field label="Обложка" className="sm:col-span-2 lg:col-span-3">
              <ImageUpload
                value={form.cover_url}
                onChange={(url) => setForm({ ...form, cover_url: url })}
                shape="wide"
                aspect={16 / 9}
                label="Картинка трассы"
                hint="Загрузится в хранилище BHR, можно вставить ссылку вручную."
              />
            </Field>
            <Field label="Описание" className="sm:col-span-2 lg:col-span-3">
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Пара слов о конфигурации и особенностях"
                className="min-h-24"
              />
            </Field>
          </div>
        </FormSection>

        <FormActions>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {editingId ? 'Сохранить' : 'Добавить трассу'}
          </Button>
          {editingId && (
            <CancelEdit
              onClick={() => {
                setEditingId(null)
                setForm(EMPTY_CIRCUIT)
              }}
            />
          )}
        </FormActions>
      </form>

      {circuits.length === 0 ? (
        <EmptyState title="Трасс пока нет" description="Добавьте трассу — она появится в календаре и на главной." />
      ) : (
        <ul className="space-y-2">
          {circuits.map((circuit, index) => (
            <li
              key={circuit.id}
              className="card flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:border-brand/30"
            >
              <div className="min-w-0">
                <div className="text-[15px] font-semibold">{circuit.name}</div>
                <div className="truncate text-[12px] text-muted">
                  {[
                    circuit.country,
                    circuit.length_km ? `${circuit.length_km} км` : null,
                    circuit.turns ? `${circuit.turns} поворотов` : null,
                    circuit.lap_record ? `рекорд ${circuit.lap_record}` : null,
                    circuit.race_date ? formatDate(circuit.race_date) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'без данных'}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <RowActions
                  onEdit={() => startEdit(circuit)}
                  onMoveUp={index > 0 ? () => void run(() => moveCircuit(circuit.id, -1).then(refetch)) : undefined}
                  onMoveDown={
                    index < circuits.length - 1
                      ? () => void run(() => moveCircuit(circuit.id, 1).then(refetch))
                      : undefined
                  }
                  onDelete={() => {
                    if (!window.confirm(`Удалить трассу «${circuit.name}»?`)) return
                    void run(() => deleteCircuit(circuit.id).then(refetch))
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ----------------------------------- events ----------------------------------- */

const EMPTY_EVENT = {
  title: '',
  mode: 'plan',
  circuit_id: '',
  status: 'planned',
  starts_at: '',
  cover_url: '',
  body: '',
}

/** ISO → локальное значение для <input type="datetime-local">. */
function toDatetimeLocal(value?: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatEventTime(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

function EventsTab() {
  const { data: circuits } = useQuery(fetchCircuits, [] as Circuit[], [], QUERY_KEYS.circuits)
  const { data: events, refetch } = useQuery(fetchEvents, [] as TeamEvent[], [], QUERY_KEYS.events)
  const [form, setForm] = useState(EMPTY_EVENT)
  const [editingId, setEditingId] = useState<string | null>(null)
  const { run, pending, error } = useAction()

  const mode = (form.mode === 'note' ? 'note' : 'plan') as TeamEvent['mode']

  const startEdit = (event: TeamEvent) => {
    setEditingId(event.id)
    setForm({
      title: event.title,
      mode: event.mode,
      circuit_id: event.circuit_id ?? '',
      status: event.status,
      starts_at: toDatetimeLocal(event.starts_at),
      cover_url: event.cover_url ?? '',
      body: event.body ?? '',
    })
  }

  const save = (e: FormEvent) => {
    e.preventDefault()
    void run(async () => {
      const draft = {
        title: form.title.trim(),
        mode,
        circuit_id: mode === 'plan' ? form.circuit_id || null : undefined,
        status: mode === 'plan' ? (form.status as TeamEvent['status']) : undefined,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        cover_url: form.cover_url.trim() || null,
        body: form.body.trim() || null,
      }
      if (editingId) await updateEvent(editingId, draft)
      else await createEvent({ ...draft, position: events.length })
      setForm(EMPTY_EVENT)
      setEditingId(null)
      refetch()
    })
  }

  return (
    <div>
      <TabHeader
        title="Мероприятия"
        hint="Запланированные этапы и заметки о том, что ожидается. Порядок — как в списке."
      />

      <ErrorNote message={error} />

      <form onSubmit={save} className="card mb-6 p-4 sm:p-5">
        <FormSection title={editingId ? 'Редактирование мероприятия' : 'Новое мероприятие'}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Название" required className="sm:col-span-2 lg:col-span-3">
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </Field>
            <Field label="Режим" hint="как оформить запись">
              <Select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                {EVENT_MODES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </Field>

            {mode === 'plan' ? (
              <>
                <Field label="Трасса">
                  <Select
                    value={form.circuit_id}
                    onChange={(e) => setForm({ ...form, circuit_id: e.target.value })}
                  >
                    <option value="">— без трассы —</option>
                    {circuits.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Статус">
                  <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {EVENT_STATUSES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </>
            ) : (
              <div className="rounded-xl border border-line bg-surface/60 p-3 text-[12px] text-muted">
                {EVENT_MODES.find((m) => m.id === 'note')?.hint}
              </div>
            )}

            <Field
              label={mode === 'plan' ? 'Дата и время' : 'Когда (необязательно)'}
              hint={mode === 'plan' ? 'старт этапа' : undefined}
            >
              <Input
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
              />
            </Field>
            <Field
              label={mode === 'plan' ? 'Что ожидается' : 'Когда и что ожидается'}
              className="sm:col-span-2 lg:col-span-3"
            >
              <Textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder={
                  mode === 'plan'
                    ? 'Формат, кто участвует, трансляция — детали этапа'
                    : 'Например: анонс, тренировки, превью этапа'
                }
                className="min-h-24"
              />
            </Field>
            <Field label="Обложка" className="sm:col-span-2 lg:col-span-3">
              <ImageUpload
                value={form.cover_url}
                onChange={(url) => setForm({ ...form, cover_url: url })}
                shape="wide"
                aspect={16 / 9}
                label="Картинка мероприятия"
                hint="Загрузится в хранилище BHR, можно вставить ссылку вручную."
              />
            </Field>
          </div>
        </FormSection>

        <FormActions>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {editingId ? 'Сохранить' : 'Добавить мероприятие'}
          </Button>
          {editingId && (
            <CancelEdit
              onClick={() => {
                setEditingId(null)
                setForm(EMPTY_EVENT)
              }}
            />
          )}
        </FormActions>
      </form>

      {events.length === 0 ? (
        <EmptyState
          title="Мероприятий пока нет"
          description="Добавьте этап или заметку о том, что ожидается."
        />
      ) : (
        <ul className="space-y-2">
          {events.map((event, index) => {
            const statusLabel = EVENT_STATUSES.find((s) => s.id === event.status)?.label ?? event.status
            const isNote = event.mode === 'note'
            return (
              <li
                key={event.id}
                className="card flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:border-brand/30"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {event.cover_url ? (
                    <img
                      src={event.cover_url}
                      alt=""
                      className="h-12 w-20 shrink-0 rounded-lg object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="flex h-12 w-20 shrink-0 items-center justify-center rounded-lg bg-elevated text-[10px] text-muted">
                      нет фото
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-semibold">{event.title}</span>
                      {isNote ? (
                        <Badge tone="cyan">ожидается</Badge>
                      ) : (
                        <Badge
                          tone={
                            event.status === 'cancelled'
                              ? 'red'
                              : event.status === 'done'
                                ? 'neutral'
                                : 'lime'
                          }
                        >
                          {statusLabel}
                        </Badge>
                      )}
                    </div>
                    <div className="truncate text-[12px] text-muted">
                      {[
                        event.circuit?.name,
                        event.starts_at ? formatEventTime(event.starts_at) : null,
                        event.body,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'без данных'}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <RowActions
                    onEdit={() => startEdit(event)}
                    onMoveUp={index > 0 ? () => void run(() => moveEvent(event.id, -1).then(refetch)) : undefined}
                    onMoveDown={
                      index < events.length - 1
                        ? () => void run(() => moveEvent(event.id, 1).then(refetch))
                        : undefined
                    }
                    onDelete={() => {
                      if (!window.confirm(`Удалить мероприятие «${event.title}»?`)) return
                      void run(() => deleteEvent(event.id).then(refetch))
                    }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/* --------------------------------- hall of fame ------------------------------- */

const EMPTY_HALL = {
  title: '',
  pilot_id: '',
  kind: 'win',
  place: '',
  year: String(new Date().getFullYear()),
  source: '',
  body: '',
  weight: '0',
}

function HallTab() {
  const { data: pilots } = useQuery(fetchPilots, [] as Pilot[], [], QUERY_KEYS.pilots)
  const { data: entries, refetch } = useQuery(fetchHallOfFame, [] as HallEntry[], [], QUERY_KEYS.hall)
  const [form, setForm] = useState(EMPTY_HALL)
  const { run, pending, error } = useAction()
  const [editingId, setEditingId] = useState<string | null>(null)

  const startEdit = (entry: HallEntry) => {
    setEditingId(entry.id)
    setForm({
      title: entry.title,
      pilot_id: entry.pilot_id ?? '',
      kind: entry.kind,
      place: entry.place ?? '',
      year: entry.year != null ? String(entry.year) : '',
      source: entry.source ?? '',
      body: entry.body ?? '',
      weight: String(entry.weight ?? 0),
    })
  }

  const save = (e: FormEvent) => {
    e.preventDefault()
    void run(async () => {
      const draft = {
        title: form.title.trim(),
        pilot_id: form.pilot_id || null,
        kind: form.kind as HallEntry['kind'],
        place: form.place.trim() || null,
        year: Number(form.year) || null,
        source: form.source.trim() || null,
        body: form.body.trim() || null,
        weight: Number(form.weight) || 0,
      }
      if (editingId) {
        await updateHallEntry(editingId, draft)
      } else {
        await createHallEntry({ ...draft, position: entries.length })
      }
      setForm({ ...EMPTY_HALL, pilot_id: form.pilot_id, kind: form.kind, year: form.year })
      setEditingId(null)
      refetch()
    })
  }

  return (
    <div>
      <TabHeader
        title="Зал славы"
        hint="Победы, подиумы, рекорды, пресса и титулы — то, что попадёт на страницу «Зал славы»."
      />

      <ErrorNote message={error} />

      <form onSubmit={save} className="card mb-6 p-4 sm:p-5">
        <FormSection title={editingId ? 'Редактирование записи' : 'Новая запись'}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Достижение" required>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </Field>
            <Field label="Пилот">
              <Select value={form.pilot_id} onChange={(e) => setForm({ ...form, pilot_id: e.target.value })}>
                <option value="">— вся команда —</option>
                {pilots.map((pilot) => (
                  <option key={pilot.id} value={pilot.id}>
                    {pilot.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Категория">
              <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                {HALL_KINDS.map((kind) => (
                  <option key={kind.id} value={kind.id}>
                    {kind.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Место" hint="например, 1 место">
              <Input value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} />
            </Field>
            <Field label="Год">
              <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
            </Field>
            <Field label="Вес" hint="выше — важнее">
              <Input
                type="number"
                min={0}
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
              />
            </Field>
            <Field label="Источник">
              <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
            </Field>
            <Field label="Подробности" className="sm:col-span-2 lg:col-span-3">
              <Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </Field>
          </div>
        </FormSection>

        <FormActions>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {editingId ? 'Сохранить' : 'Добавить в зал славы'}
          </Button>
          {editingId && (
            <CancelEdit
              onClick={() => {
                setEditingId(null)
                setForm(EMPTY_HALL)
              }}
            />
          )}
        </FormActions>
      </form>

      {entries.length === 0 ? (
        <EmptyState title="В зале славы пока пусто" />
      ) : (
        <ul className="space-y-2">
          {entries.map((entry, index) => (
            <li
              key={entry.id}
              className="card flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:border-brand/30"
            >
              <div className="min-w-0">
                <div className="text-[15px] font-semibold">{entry.title}</div>
                <div className="truncate text-[12px] text-muted">
                  {(entry.pilot?.name ?? 'вся команда') + ' · ' + (entry.year ?? '—')}
                  {(entry.weight ?? 0) > 0 && ` · вес ${entry.weight}`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <HallKindIcon kind={entry.kind} className="h-4 w-4 shrink-0 text-muted" />
                <RowActions
                  onEdit={() => startEdit(entry)}
                  onMoveUp={index > 0 ? () => void run(() => moveHallEntry(entry.id, -1).then(refetch)) : undefined}
                  onMoveDown={
                    index < entries.length - 1
                      ? () => void run(() => moveHallEntry(entry.id, 1).then(refetch))
                      : undefined
                  }
                  onDelete={() => {
                    if (!window.confirm(`Удалить запись «${entry.title}»?`)) return
                    void run(() => deleteHallEntry(entry.id).then(refetch))
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ------------------------------------- ads ----------------------------------- */

function isBannerLive(banner: AdBanner): boolean {
  if (banner.is_active === false) return false
  if (banner.start_at && isFutureDate(banner.start_at)) return false
  if (banner.end_at && banner.end_at < new Date().toISOString().slice(0, 10)) return false
  return true
}

const EMPTY_BANNER = {
  title: '',
  advertiser: '',
  image_url: '',
  url: '',
  start_at: '',
  end_at: '',
  is_active: true,
  position: 0,
}

function AdsTab() {
  const { data: banners, refetch: refetchBanners } = useQuery(
    fetchAdBanners,
    [] as AdBanner[],
    [],
    QUERY_KEYS.adBanners,
  )
  const { data: orders, refetch: refetchOrders } = useQuery(
    fetchAdOrders,
    [] as AdOrder[],
    [],
    QUERY_KEYS.adOrders,
  )
  const [form, setForm] = useState(EMPTY_BANNER)
  const [editingId, setEditingId] = useState<string | null>(null)
  const { run, pending, error } = useAction()

  const startEdit = (banner: AdBanner) => {
    setEditingId(banner.id)
    setForm({
      title: banner.title,
      advertiser: banner.advertiser ?? '',
      image_url: banner.image_url ?? '',
      url: banner.url ?? '',
      start_at: banner.start_at ?? '',
      end_at: banner.end_at ?? '',
      is_active: banner.is_active ?? true,
      position: banner.position,
    })
  }

  const save = (e: FormEvent) => {
    e.preventDefault()
    void run(async () => {
      const draft = {
        title: form.title.trim(),
        advertiser: form.advertiser.trim() || null,
        image_url: form.image_url.trim() || null,
        url: form.url.trim() || null,
        start_at: form.start_at || null,
        end_at: form.end_at || null,
        is_active: form.is_active,
        position: Number(form.position) || 0,
      }
      if (editingId) await updateAdBanner(editingId, draft)
      else await createAdBanner(draft)
      setForm(EMPTY_BANNER)
      setEditingId(null)
      refetchBanners()
    })
  }

  return (
    <div>
      <TabHeader
        title="Реклама"
        hint="Баннеры показываются на главной сверху вниз, пока включены и не просрочены. Заявки приходят из секции «Реклама»."
      />

      <ErrorNote message={error} />

      <form onSubmit={save} className="card mb-6 p-4 sm:p-5">
        <FormSection title={editingId ? 'Редактирование баннера' : 'Новый баннер'}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Кто рекламируется" required>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Сервис, команда, спонсор"
                required
              />
            </Field>
            <Field label="Подпись на баннере" hint="необязательно">
              <Input
                value={form.advertiser}
                onChange={(e) => setForm({ ...form, advertiser: e.target.value })}
                placeholder="Название партнёра"
              />
            </Field>
            <Field label="Куда ведёт" hint="https://…">
              <Input
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="Без ссылки баннер просто покажется"
              />
            </Field>
            <Field label="Картинка" className="sm:col-span-2 lg:col-span-3">
              <ImageUpload
                value={form.image_url}
                onChange={(url) => setForm({ ...form, image_url: url })}
                shape="wide"
                aspect={1}
                label="Картинка"
                hint="Квадрат 1:1, как показано на главной. Загрузится в хранилище BHR, можно вставить ссылку вручную."
              />
            </Field>
            <Field label="Показывать с">
              <Input
                type="date"
                value={form.start_at}
                onChange={(e) => setForm({ ...form, start_at: e.target.value })}
              />
            </Field>
            <Field label="Показывать по">
              <Input
                type="date"
                value={form.end_at}
                onChange={(e) => setForm({ ...form, end_at: e.target.value })}
              />
            </Field>
            <Field label="Порядок" hint="меньше — выше">
              <Input
                type="number"
                value={String(form.position)}
                onChange={(e) => setForm({ ...form, position: Number(e.target.value) || 0 })}
              />
            </Field>
          </div>

          <div className="mt-4 rounded-xl border border-line bg-surface/60 p-3">
            <CheckRow
              checked={form.is_active}
              onChange={(v) => setForm({ ...form, is_active: v })}
              label="Показывать на главной"
            />
          </div>
        </FormSection>

        <FormActions>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {editingId ? 'Сохранить' : 'Добавить баннер'}
          </Button>
          {editingId && (
            <CancelEdit
              onClick={() => {
                setEditingId(null)
                setForm(EMPTY_BANNER)
              }}
            />
          )}
        </FormActions>
      </form>

      {banners.length === 0 ? (
        <EmptyState title="Баннеров пока нет" description="Добавьте первый — он появится на главной." />
      ) : (
        <ul className="space-y-2">
          {banners.map((banner) => {
            const live = banner.is_active !== false && isBannerLive(banner)
            return (
              <li
                key={banner.id}
                className="card flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:border-brand/30"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {banner.image_url ? (
                    <img
                      src={banner.image_url}
                      alt=""
                      className="h-10 w-20 shrink-0 rounded-lg object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="flex h-10 w-20 shrink-0 items-center justify-center rounded-lg bg-elevated text-[10px] text-muted">
                      нет картинки
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-semibold">{banner.title}</div>
                    <div className="truncate text-[12px] text-muted">
                      {[
                        banner.advertiser,
                        banner.url,
                        banner.start_at ? `с ${formatDate(banner.start_at)}` : null,
                        banner.end_at ? `по ${formatDate(banner.end_at)}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'без ссылки и дат'}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={live ? 'lime' : 'neutral'}>{live ? 'показывается' : 'выключен'}</Badge>
                  <RowActions
                    onEdit={() => startEdit(banner)}
                    onDelete={() => {
                      if (!window.confirm(`Удалить баннер «${banner.title}»?`)) return
                      void run(() => deleteAdBanner(banner.id).then(refetchBanners))
                    }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-10">
        <TabHeader
          title="Заявки на рекламу"
          hint="Всё, что пришло через форму в секции «Реклама» на главной."
        >
          <Button size="sm" variant="outline" onClick={refetchOrders}>
            Обновить
          </Button>
        </TabHeader>

        {orders.length === 0 ? (
          <EmptyState title="Заявок пока нет" />
        ) : (
          <ul className="space-y-3">
            {orders.map((order) => (
              <li key={order.id} className="card p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold">{order.name}</div>
                    <div className="break-all text-[12px] text-muted">
                      {order.link ? (
                        <a
                          href={order.link}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="transition-colors hover:text-brand"
                        >
                          {order.link}
                        </a>
                      ) : (
                        'ссылки нет'
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={order.status}
                      onChange={(e) =>
                        void run(async () => {
                          await updateAdOrderStatus(order.id, e.target.value as AdOrderStatus)
                          refetchOrders()
                        })
                      }
                      className="h-9 w-full text-[13px] sm:w-48"
                    >
                      {AD_ORDER_STATUSES.map((status) => (
                        <option key={status.id} value={status.id}>
                          {status.label}
                        </option>
                      ))}
                    </Select>
                    <DeleteButton
                      onClick={() => run(() => deleteAdOrder(order.id).then(refetchOrders))}
                      label={`Удалить заявку от «${order.name}»?`}
                    />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge tone="brand">
                    {AD_PERIODS.find((p) => p.id === order.period)?.label ?? order.period}
                  </Badge>
                  {order.budget && <Badge>бюджет: {order.budget}</Badge>}
                  {order.created_at && <Badge>{formatDate(order.created_at)}</Badge>}
                </div>

                {order.message && (
                  <p className="mt-2 text-[13px] leading-relaxed text-muted">{order.message}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/* ----------------------------------- settings --------------------------------- */

function SettingsTab() {
  const { site, refetch } = useSite()
  const [draft, setDraft] = useState<{
    name: string
    tagline: string
    description: string
    email: string
    radio_stream_url: string
    nova_url: string
    nova_label: string
  } | null>(null)
  const form = draft ?? {
    name: site.name ?? 'Bad Habit Racing',
    tagline: site.tagline ?? '',
    description: site.description ?? '',
    email: site.email ?? '',
    radio_stream_url: site.radio_stream_url ?? '',
    nova_url: site.nova_url ?? '',
    nova_label: site.nova_label || 'Мы в NOVA',
  }
  const { run, pending, error } = useAction()

  const save = (e: FormEvent) => {
    e.preventDefault()
    void run(async () => {
      await updateSiteSettings({
        name: form.name.trim() || 'Bad Habit Racing',
        tagline: form.tagline.trim() || null,
        description: form.description.trim() || null,
        email: form.email.trim() || null,
        radio_stream_url: form.radio_stream_url.trim() || null,
        nova_url: form.nova_url.trim() || null,
        nova_label: form.nova_label.trim() || null,
      })
      await refetch()
      setDraft(null)
    })
  }

  return (
    <div>
      <TabHeader title="Настройки сайта" hint="Название, слоган, описание, почта, ссылка на радио и NOVA." />

      <ErrorNote message={error} />

      <form onSubmit={save} className="card max-w-xl p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Название" className="sm:col-span-2">
            <Input value={form.name} onChange={(e) => setDraft({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Слоган" className="sm:col-span-2">
            <Input value={form.tagline} onChange={(e) => setDraft({ ...form, tagline: e.target.value })} />
          </Field>
          <Field label="Описание" className="sm:col-span-2">
            <Textarea
              value={form.description}
              onChange={(e) => setDraft({ ...form, description: e.target.value })}
              className="min-h-24"
            />
          </Field>
          <Field label="Почта команды" className="sm:col-span-2">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setDraft({ ...form, email: e.target.value })}
              placeholder="team@example.com"
            />
          </Field>
          <Field
            label="Ссылка на радио"
            hint="значение по умолчанию — поток команды на Live365"
            className="sm:col-span-2"
          >
            <Input
              type="url"
              value={form.radio_stream_url}
              onChange={(e) => setDraft({ ...form, radio_stream_url: e.target.value })}
              placeholder="https://streaming.live365.com/a19203_2"
            />
          </Field>
          <Field
            label="Ссылка на сообщество (NOVA)"
            hint="Показывается кнопкой на главной странице. Пусто — ссылка скрыта"
            className="sm:col-span-2"
          >
            <Input
              type="url"
              value={form.nova_url}
              onChange={(e) => setDraft({ ...form, nova_url: e.target.value })}
              placeholder="https://nova.gambit-rp.com/…"
            />
          </Field>
          <Field label="Надпись на кнопке" className="sm:col-span-2">
            <Input
              value={form.nova_label}
              onChange={(e) => setDraft({ ...form, nova_label: e.target.value })}
              placeholder="Мы в NOVA"
            />
          </Field>
        </div>
        <FormActions>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Сохранить
          </Button>
        </FormActions>
      </form>
    </div>
  )
}

/* ----------------------------------- helpers ---------------------------------- */

const ICON_BUTTON =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-brand hover:text-brand disabled:pointer-events-none disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none'

function DeleteButton({
  onClick,
  label = 'Удалить?',
}: {
  onClick: () => void
  label?: string
}) {
  return (
    <button
      type="button"
      onClick={() => {
        if (!window.confirm(label)) return
        onClick()
      }}
      aria-label="Удалить"
      className={ICON_BUTTON}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  )
}

function RowActions({
  onEdit,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  onEdit?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      {onEdit && (
        <button type="button" onClick={onEdit} aria-label="Изменить" className={ICON_BUTTON}>
          <Pencil className="h-4 w-4" />
        </button>
      )}
      {onMoveUp && (
        <button type="button" onClick={onMoveUp} aria-label="Выше" className={ICON_BUTTON}>
          <ChevronUp className="h-4 w-4" />
        </button>
      )}
      {onMoveDown && (
        <button type="button" onClick={onMoveDown} aria-label="Ниже" className={ICON_BUTTON}>
          <ChevronDown className="h-4 w-4" />
        </button>
      )}
      <DeleteButton onClick={onDelete} />
    </div>
  )
}

function CancelEdit({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" onClick={onClick}>
      Отмена
    </Button>
  )
}

function FormSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div>
      {title && (
        <div className="mb-4 text-[11px] tracking-[0.12em] text-muted uppercase">{title}</div>
      )}
      {children}
    </div>
  )
}

function FormActions({ children }: { children: ReactNode }) {
  return <div className="mt-5 flex flex-wrap items-center gap-3">{children}</div>
}

function CheckRow({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-2 text-[13px]',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[var(--color-brand)]"
      />
      {label}
    </label>
  )
}

function TabHeader({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-[20px] font-bold tracking-[-0.02em]">{title}</h2>
        {hint && <p className="mt-1 text-[13px] text-muted">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="mb-5 rounded-xl border border-brand/40 bg-brand/10 p-3 text-[13px] text-brand">
      {message}
    </div>
  )
}