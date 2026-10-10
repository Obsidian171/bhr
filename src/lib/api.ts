import { db, supabase } from '@/lib/supabase'
import { invalidateAll } from '@/hooks/useQuery'
import { sortHallEntries } from '@/lib/hall'
import { makeSlug, randomSuffix } from '@/lib/slug'
import type {
  AdBanner,
  AdOrder,
  AdOrderDraft,
  AdOrderStatus,
  Circuit,
  EventMode,
  EventStatus,
  HallEntry,
  Post,
  Profile,
  Pilot,
  SiteSettings,
  TeamEvent,
} from '@/lib/types'

/* ================================== constants ================================= */

const MAX_ROWS = 2000
const MAX_ID_LEN = 128
const MAX_SLUG_LEN = 80
const MAX_PIN_LEN = 16
const MAX_TEXT = 20_000

const ALLOWED_TABLES = [
  'pilots',
  'circuits',
  'posts',
  'hall_of_fame',
  'ad_banners',
  'ad_orders',
  'site_settings',
  'profiles',
  'events',
] as const
type Table = (typeof ALLOWED_TABLES)[number]

/* ================================== sanitizers ================================= */

/**
 * Строка, безопасная для отправки в PostgREST.
 * - приводится к NFC (устраняет дубликаты визуально одинаковых символов),
 * - обрезается по длине,
 * - удаляются управляющие символы, кроме \n и \t,
 * - обрезаются пробелы по краям.
 */
function sanitizeString(value: unknown, maxLen = MAX_TEXT): string {
  if (typeof value !== 'string') return ''
  const normalized = value.normalize('NFC')
  const noCtrl = normalized.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
  const trimmed = noCtrl.trim()
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen) : trimmed
}

/**
 * URL-безопасная строка. Пропускает только http(s), mailto и относительные пути.
 * `javascript:`, `vbscript:`, `file:` и прочие схемы режутся на корню.
 */
function sanitizeUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const raw = value.trim()
  if (!raw) return null
  // Относительные пути
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw.slice(0, 500)
  // Разрешаем только http/https/mailto
  const lower = raw.toLowerCase()
  const allowed = ['http://', 'https://', 'mailto:']
  if (!allowed.some((p) => lower.startsWith(p))) return null
  return raw.slice(0, 500)
}

/** Число в допустимом диапазоне или null. */
function sanitizeNumber(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return null
  if (n < min) return min
  if (n > max) return max
  return Math.trunc(n)
}

/** Slug/id для запросов: обрезка + NFC. */
function sanitizeId(value: unknown): string {
  if (typeof value !== 'string') return ''
  const s = value.normalize('NFC').trim()
  if (!s) return ''
  return s.length > MAX_ID_LEN ? s.slice(0, MAX_ID_LEN) : s
}

/** Пин для RPC. */
function sanitizePin(value: unknown): string {
  if (typeof value !== 'string') return ''
  const s = value.normalize('NFC').trim()
  if (!s) return ''
  return s.length > MAX_PIN_LEN ? s.slice(0, MAX_PIN_LEN) : s
}

/** ISO-дата или null. Невалидные строки не уходят в БД. */
function toIsoOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const raw = value.trim()
  if (!raw) return null
  const t = Date.parse(raw)
  if (Number.isNaN(t)) return null
  return new Date(t).toISOString()
}

/** Убирает `undefined` из патча — PostgREST не должен получать «пустоту». */
function pickDefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v
  }
  return out
}

/* ================================== guards ==================================== */

function assertTable(table: string): asserts table is Table {
  if (!(ALLOWED_TABLES as readonly string[]).includes(table)) {
    throw new Error('Внутренняя ошибка: неизвестный ресурс.')
  }
}

function assertPlainObject(value: unknown): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Некорректные данные для записи')
  }
}

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : []
}

function safeInvalidate(): void {
  try {
    invalidateAll()
  } catch (e) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn('[supabase] invalidateAll failed', e)
    }
  }
}

/* ================================== errors ==================================== */

const FALLBACK_MESSAGE = 'Запрос не прошёл. Попробуйте ещё раз или проверьте права доступа.'

/**
 * Единая трансформация ошибок БД в человекочитаемый текст.
 * Ни одно сообщение из PostgREST наружу не выходит.
 */
function explain(error: { message?: string; code?: string }): Error {
  const raw = error?.message ?? ''
  const code = error?.code

  if (import.meta.env.DEV && raw) {
    // eslint-disable-next-line no-console
    console.error('[supabase]', { code, message: raw })
  }

  if (/row-level security|violates row level|not authorized|401|403|PGRST301/i.test(raw)) {
    return new Error(
      'Нет прав на запись: роль профиля должна быть admin, editor или a&r. Проверь её SQL-запросом ниже или в Supabase → Authentication → Users.',
    )
  }
  if (/duplicate key|23505|already exists/i.test(raw) || code === '23505') {
    return new Error('Такая запись уже есть: совпал slug. Проверь название — оно участвует в ссылке.')
  }
  if (/null value|23502|violates not-null/i.test(raw)) {
    return new Error('Заполни обязательные поля — пустое значение принять нельзя.')
  }
  if (/PGRST116/i.test(raw) || /JSON object requested, multiple \(or no\) rows/i.test(raw)) {
    return new Error('Запись создалась, но не видна текущему пользователю. Обнови страницу и проверь права.')
  }
  if (/PGRST204|column .* does not exist/i.test(raw)) {
    return new Error('В базе нет нужной колонки — на сервере не применены все миграции из supabase/.')
  }
  return new Error(FALLBACK_MESSAGE)
}

/* ================================== core ====================================== */

interface Order {
  column: string
  ascending?: boolean
}

async function fromTable<T>(table: Table, order: Order = { column: 'created_at' }): Promise<T[]> {
  assertTable(table)
  const { data, error } = await db()
    .from(table)
    .select('*')
    .order(order.column, { ascending: order.ascending ?? false })
    .limit(MAX_ROWS)
  if (error) throw explain(error)
  return asArray(data) as T[]
}

async function insertRow<T>(table: Table, payload: Record<string, unknown>): Promise<T> {
  assertTable(table)
  assertPlainObject(payload)
  const clean = pickDefined(payload)
  const { data, error } = await db().from(table).insert(clean).select('*').single()
  if (error) throw explain(error)
  safeInvalidate()
  return data as T
}

/** Вставка с генерацией slug; при коллизии добавляется суффикс. */
async function createSlugged<T>(table: Table, payload: Record<string, unknown>): Promise<T> {
  assertTable(table)
  assertPlainObject(payload)
  const source = String(payload.name ?? payload.title ?? '')
  let base = makeSlug(source).slice(0, MAX_SLUG_LEN)
  if (!base) base = `item-${randomSuffix()}`

  for (let attempt = 0; attempt < 4; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${randomSuffix()}`
    const { data, error } = await db()
      .from(table)
      .insert(pickDefined({ ...payload, slug }))
      .select('*')
      .single()
    if (!error) {
      safeInvalidate()
      return data as T
    }
    if (error.code !== '23505') throw explain(error)
  }
  throw new Error('Не удалось создать уникальную ссылку: попробуй другое название.')
}

async function updateRow<T>(table: Table, id: string, patch: Record<string, unknown>): Promise<T> {
  assertTable(table)
  assertPlainObject(patch)
  const safe = sanitizeId(id)
  if (!safe) throw new Error('Некорректный идентификатор записи')
  const clean = pickDefined(patch)
  const { data, error } = await db()
    .from(table)
    .update(clean)
    .eq('id', safe)
    .select('*')
    .single()
  if (error) throw explain(error)
  safeInvalidate()
  return data as T
}

async function deleteRow(table: Table, id: string): Promise<void> {
  assertTable(table)
  const safe = sanitizeId(id)
  if (!safe) return
  const { error } = await db().from(table).delete().eq('id', safe)
  if (error) throw explain(error)
  safeInvalidate()
}

/* ================================== pilots ==================================== */

export async function fetchPilots(): Promise<Pilot[]> {
  return fromTable<Pilot>('pilots', { column: 'created_at' })
}

export async function fetchPilotBySlug(slug: string): Promise<Pilot | null> {
  const safe = sanitizeId(slug)
  if (!safe) return null
  const { data, error } = await db().from('pilots').select('*').eq('slug', safe).maybeSingle()
  if (error) throw explain(error)
  if (data) return data as Pilot
  const { data: byId } = await db().from('pilots').select('*').eq('id', safe).maybeSingle()
  return (byId as Pilot) ?? null
}

async function fetchPilotsMap(): Promise<Map<string, Pilot>> {
  const rows = await fetchPilots()
  return new Map(rows.map((p) => [p.id, p]))
}

/* ================================= circuits =================================== */

export async function fetchCircuits(): Promise<Circuit[]> {
  return fromTable<Circuit>('circuits', { column: 'position', ascending: true })
}

export async function fetchCircuitBySlug(slug: string): Promise<Circuit | null> {
  const safe = sanitizeId(slug)
  if (!safe) return null
  const { data, error } = await db().from('circuits').select('*').eq('slug', safe).maybeSingle()
  if (error) throw explain(error)
  if (data) return data as Circuit
  const { data: byId } = await db().from('circuits').select('*').eq('id', safe).maybeSingle()
  return (byId as Circuit) ?? null
}

/* =================================== events =================================== */

const EVENT_MODE_IDS: readonly EventMode[] = ['plan', 'note']
const EVENT_STATUS_IDS: readonly EventStatus[] = ['planned', 'live', 'done', 'cancelled']

export async function fetchEvents(): Promise<TeamEvent[]> {
  const [rows, circuits] = await Promise.all([
    fromTable<TeamEvent>('events', { column: 'position', ascending: true }),
    fetchCircuits(),
  ])
  const byId = new Map(circuits.map((c) => [c.id, c]))
  return rows.map((row) => ({
    ...row,
    circuit: row.circuit_id ? byId.get(row.circuit_id) ?? null : null,
  }))
}

export type EventDraft = Pick<TeamEvent, 'title' | 'mode'> &
  Partial<Pick<TeamEvent, 'circuit_id' | 'status' | 'starts_at' | 'cover_url' | 'body' | 'position'>>

function normalizeEventDraft(draft: EventDraft): Record<string, unknown> {
  const mode: EventMode = EVENT_MODE_IDS.includes(draft.mode) ? draft.mode : 'plan'
  const status = draft.status && EVENT_STATUS_IDS.includes(draft.status) ? draft.status : undefined
  return pickDefined({
    title: sanitizeString(draft.title, 160),
    mode,
    circuit_id: mode === 'plan' && draft.circuit_id ? sanitizeId(draft.circuit_id) : null,
    status: mode === 'note' ? undefined : status,
    starts_at: draft.starts_at != null ? toIsoOrNull(draft.starts_at) : null,
    cover_url: draft.cover_url != null ? sanitizeUrl(draft.cover_url) : null,
    body: draft.body != null ? sanitizeString(draft.body, MAX_TEXT) : null,
    position: draft.position != null ? sanitizeNumber(draft.position, 0, 1_000_000) : undefined,
  })
}

export async function createEvent(draft: EventDraft): Promise<TeamEvent> {
  return createSlugged<TeamEvent>('events', normalizeEventDraft(draft))
}

export async function updateEvent(id: string, patch: EventDraft): Promise<TeamEvent> {
  return updateRow<TeamEvent>('events', id, normalizeEventDraft(patch))
}

export async function deleteEvent(id: string): Promise<void> {
  await deleteRow('events', id)
}

/* ================================== posts ===================================== */

export async function fetchPosts(): Promise<Post[]> {
  return fromTable<Post>('posts', { column: 'published_at' })
}

export async function fetchJournal(): Promise<Post[]> {
  const rows = await fetchPosts()
  return rows.filter((p) => (p.kind ?? 'journal') === 'journal')
}

export async function fetchNews(): Promise<Post[]> {
  const rows = await fetchPosts()
  return rows.filter((p) => p.kind === 'news')
}

export async function fetchPostBySlug(slug: string): Promise<Post | null> {
  const safe = sanitizeId(slug)
  if (!safe) return null
  const { data, error } = await db().from('posts').select('*').eq('slug', safe).maybeSingle()
  if (error) throw explain(error)
  if (data) return data as Post
  const { data: byId } = await db().from('posts').select('*').eq('id', safe).maybeSingle()
  return (byId as Post) ?? null
}

export type PostDraft = Pick<Post, 'title' | 'body'> &
  Partial<
    Pick<
      Post,
      'excerpt' | 'cover_url' | 'author_name' | 'category' | 'kind' | 'tags' | 'read_minutes' | 'published_at' | 'via_url'
    >
  >

function normalizePostDraft(draft: PostDraft): Record<string, unknown> {
  return pickDefined({
    title: sanitizeString(draft.title, 300),
    body: sanitizeString(draft.body, MAX_TEXT),
    excerpt: draft.excerpt != null ? sanitizeString(draft.excerpt, 500) : undefined,
    cover_url: draft.cover_url != null ? sanitizeUrl(draft.cover_url) : undefined,
    author_name: draft.author_name != null ? sanitizeString(draft.author_name, 120) : undefined,
    category: draft.category != null ? sanitizeString(draft.category, 80) : undefined,
    kind: draft.kind === 'news' || draft.kind === 'journal' ? draft.kind : undefined,
    tags: Array.isArray(draft.tags) ? draft.tags.map((t) => sanitizeString(t, 40)).filter(Boolean).slice(0, 20) : undefined,
    read_minutes: draft.read_minutes != null ? sanitizeNumber(draft.read_minutes, 1, 999) : undefined,
    published_at: draft.published_at != null ? toIsoOrNull(draft.published_at) : undefined,
    via_url: draft.via_url != null ? sanitizeUrl(draft.via_url) : undefined,
  })
}

export async function createPost(draft: PostDraft): Promise<Post> {
  return createSlugged<Post>('posts', { kind: 'journal', ...normalizePostDraft(draft) })
}

export async function deletePost(id: string): Promise<void> {
  await deleteRow('posts', id)
}

export async function updatePost(id: string, patch: PostDraft): Promise<Post> {
  return updateRow<Post>('posts', id, normalizePostDraft(patch))
}

/* ================================ site & account ============================== */

export async function fetchSiteSettings(): Promise<SiteSettings> {
  const { data, error } = await db().from('site_settings').select('*').eq('id', true).maybeSingle()
  if (error) throw new Error('Не удалось загрузить настройки сайта.')
  const row = data as SiteSettings | null
  if (!row) throw new Error('Настройки сайта не заполнены')
  return { ...row, socials: row.socials }
}

export async function updateSiteSettings(patch: Partial<SiteSettings>): Promise<SiteSettings> {
  assertPlainObject(patch)
  const clean = pickDefined({
    name: patch.name != null ? sanitizeString(patch.name, 80) : undefined,
    tagline: patch.tagline != null ? sanitizeString(patch.tagline, 160) : undefined,
    description: patch.description != null ? sanitizeString(patch.description, 800) : undefined,
    email: patch.email != null ? sanitizeString(patch.email, 120) : undefined,
    radio_stream_url: patch.radio_stream_url != null ? sanitizeUrl(patch.radio_stream_url) : undefined,
    nova_url: patch.nova_url != null ? sanitizeUrl(patch.nova_url) : undefined,
    nova_label: patch.nova_label != null ? sanitizeString(patch.nova_label, 80) : undefined,
    socials: patch.socials,
  })
  const { data, error } = await db().from('site_settings').update(clean).eq('id', true).select('*').single()
  if (error) throw explain(error)
  if (!data) throw new Error('Настройки не сохранились.')
  safeInvalidate()
  return data as SiteSettings
}

/* ================================== account =================================== */

async function currentUserId(): Promise<string | null> {
  try {
    if (!supabase) return null
    const { data } = await supabase.auth.getSession()
    const id = data.session?.user.id
    return id ? sanitizeId(id) : null
  } catch {
    return null
  }
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const safe = sanitizeId(userId)
  if (!safe) return null
  const { data, error } = await db().from('profiles').select('*').eq('id', safe).maybeSingle()
  if (error) throw explain(error)
  return (data as Profile) ?? null
}

/* =================================== stats ==================================== */

export async function fetchStats(): Promise<{ label: string; value: string }[]> {
  const [pilots, circuits] = await Promise.all([fetchPilots(), fetchCircuits()])
  const points = pilots.reduce((sum, p) => sum + (Number(p.points) || 0), 0)
  return [
    { label: 'Пилотов в составе', value: String(pilots.length) },
    { label: 'Трасс в календаре', value: String(circuits.length) },
    { label: 'Баллов сезона', value: String(points) },
  ]
}

/* =============================== hall of fame ================================= */

export async function fetchHallOfFame(): Promise<HallEntry[]> {
  const [rows, pilots] = await Promise.all([
    fromTable<HallEntry>('hall_of_fame', { column: 'position', ascending: true }),
    fetchPilotsMap(),
  ])
  return sortHallEntries(
    rows.map((entry) => ({
      ...entry,
      pilot: entry.pilot_id ? pilots.get(entry.pilot_id) ?? null : null,
    })),
  )
}

export async function createHallEntry(payload: Partial<HallEntry>): Promise<HallEntry> {
  return insertRow<HallEntry>('hall_of_fame', payload as Record<string, unknown>)
}

export async function updateHallEntry(id: string, patch: Partial<HallEntry>): Promise<HallEntry> {
  return updateRow<HallEntry>('hall_of_fame', id, patch as Record<string, unknown>)
}

export async function deleteHallEntry(id: string): Promise<void> {
  await deleteRow('hall_of_fame', id)
}

/* ================================== реклама =================================== */

export async function fetchAdBanners(): Promise<AdBanner[]> {
  const { data, error } = await db().from('ad_banners').select('*').order('position', { ascending: true }).limit(MAX_ROWS)
  if (error) throw explain(error)
  return asArray(data) as AdBanner[]
}

export async function fetchActiveAdBanners(): Promise<AdBanner[]> {
  const now = Date.now()
  const banners = await fetchAdBanners()
  return banners.filter((b) => {
    if (b.is_active === false) return false
    if (b.start_at) {
      const t = Date.parse(b.start_at)
      if (!Number.isNaN(t) && t > now) return false
    }
    if (b.end_at) {
      const t = Date.parse(b.end_at)
      if (!Number.isNaN(t) && t < now) return false
    }
    return true
  })
}

export type AdBannerDraft = Pick<AdBanner, 'title'> &
  Partial<Pick<AdBanner, 'advertiser' | 'image_url' | 'url' | 'is_active' | 'start_at' | 'end_at' | 'position'>>

function normalizeBannerDraft(draft: AdBannerDraft): Record<string, unknown> {
  return pickDefined({
    title: sanitizeString(draft.title, 120),
    advertiser: draft.advertiser != null ? sanitizeString(draft.advertiser, 120) : undefined,
    image_url: draft.image_url != null ? sanitizeUrl(draft.image_url) : undefined,
    url: draft.url != null ? sanitizeUrl(draft.url) : undefined,
    is_active: typeof draft.is_active === 'boolean' ? draft.is_active : undefined,
    start_at: draft.start_at != null ? toIsoOrNull(draft.start_at) : undefined,
    end_at: draft.end_at != null ? toIsoOrNull(draft.end_at) : undefined,
    position: draft.position != null ? sanitizeNumber(draft.position, 0, 1_000_000) : undefined,
  })
}

export async function createAdBanner(draft: AdBannerDraft): Promise<AdBanner> {
  const clean = normalizeBannerDraft(draft)
  if (!clean.is_active) clean.is_active = true
  return insertRow<AdBanner>('ad_banners', clean)
}

export async function updateAdBanner(id: string, patch: Partial<AdBannerDraft>): Promise<AdBanner> {
  return updateRow<AdBanner>('ad_banners', id, normalizeBannerDraft(patch as AdBannerDraft))
}

export async function deleteAdBanner(id: string): Promise<void> {
  await deleteRow('ad_banners', id)
}

export async function submitAdOrder(payload: AdOrderDraft): Promise<{ ok: boolean; message: string }> {
  try {
    const userId = await currentUserId()
    const { error } = await db().from('ad_orders').insert({
      name: sanitizeString(payload.name, 120),
      link: payload.link != null ? sanitizeUrl(payload.link) : null,
      budget: payload.budget != null ? sanitizeString(payload.budget, 60) : null,
      period: payload.period,
      message: payload.message != null ? sanitizeString(payload.message, 2000) : null,
      user_id: userId,
    })
    if (error) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error('[ad_orders.insert]', error)
      }
      return { ok: false, message: 'Не удалось отправить заявку. Попробуйте ещё раз чуть позже.' }
    }
    return { ok: true, message: 'Заявка отправлена. Свяжемся с вами по контактам из формы.' }
  } catch {
    return { ok: false, message: 'Не удалось отправить заявку. Попробуйте ещё раз чуть позже.' }
  }
}

export async function checkAdminPin(pin: string): Promise<boolean> {
  const safe = sanitizePin(pin)
  if (!safe) return false
  try {
    const { data, error } = await db().rpc('check_admin_pin', { pin: safe })
    if (error) return false
    return data === true
  } catch {
    return false
  }
}

export async function fetchAdOrders(): Promise<AdOrder[]> {
  const { data, error } = await db()
    .from('ad_orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(MAX_ROWS)
  if (error) throw explain(error)
  return asArray(data) as AdOrder[]
}

export async function updateAdOrderStatus(id: string, status: AdOrderStatus): Promise<void> {
  await updateRow('ad_orders', id, { status })
}

export async function deleteAdOrder(id: string): Promise<void> {
  await deleteRow('ad_orders', id)
}

/* ============================ content editing ================================= */

export type PilotDraft = Pick<Pilot, 'name'> &
  Partial<
    Pick<
      Pilot,
      | 'photo_url'
      | 'cover_url'
      | 'points'
      | 'team_place'
      | 'bio'
      | 'car'
      | 'number'
      | 'country'
      | 'links'
      | 'featured'
      | 'is_extra'
      | 'role_text'
    >
  >

function normalizePilotDraft(draft: PilotDraft): Record<string, unknown> {
  return pickDefined({
    name: sanitizeString(draft.name, 120),
    photo_url: draft.photo_url != null ? sanitizeUrl(draft.photo_url) : undefined,
    cover_url: draft.cover_url != null ? sanitizeUrl(draft.cover_url) : undefined,
    points: draft.points != null ? sanitizeNumber(draft.points, 0, 1_000_000) : undefined,
    team_place: draft.team_place != null ? sanitizeNumber(draft.team_place, 1, 99) : undefined,
    bio: draft.bio != null ? sanitizeString(draft.bio, 2000) : undefined,
    car: draft.car != null ? sanitizeString(draft.car, 120) : undefined,
    number: draft.number != null ? sanitizeString(draft.number, 10) : undefined,
    country: draft.country != null ? sanitizeString(draft.country, 80) : undefined,
    links: draft.links && typeof draft.links === 'object' ? draft.links : undefined,
    featured: typeof draft.featured === 'boolean' ? draft.featured : undefined,
    is_extra: typeof draft.is_extra === 'boolean' ? draft.is_extra : undefined,
    role_text: draft.role_text != null ? sanitizeString(draft.role_text, 160) : undefined,
  })
}

export async function createPilot(draft: PilotDraft): Promise<Pilot> {
  const clean = normalizePilotDraft(draft)
  if (!clean.links) clean.links = {}
  return createSlugged<Pilot>('pilots', clean)
}

export async function updatePilot(id: string, patch: PilotDraft): Promise<Pilot> {
  const clean = normalizePilotDraft(patch)
  if (!clean.links) clean.links = {}
  return updateRow<Pilot>('pilots', id, clean)
}

export async function deletePilot(id: string): Promise<void> {
  await deleteRow('pilots', id)
}

export type CircuitDraft = Pick<Circuit, 'name'> &
  Partial<
    Pick<
      Circuit,
      'country' | 'length_km' | 'turns' | 'lap_record' | 'race_date' | 'cover_url' | 'description' | 'position'
    >
  >

function normalizeCircuitDraft(draft: CircuitDraft): Record<string, unknown> {
  return pickDefined({
    name: sanitizeString(draft.name, 160),
    country: draft.country != null ? sanitizeString(draft.country, 80) : undefined,
    length_km: draft.length_km != null ? sanitizeNumber(draft.length_km, 0, 100) : undefined,
    turns: draft.turns != null ? sanitizeNumber(draft.turns, 0, 200) : undefined,
    lap_record: draft.lap_record != null ? sanitizeString(draft.lap_record, 40) : undefined,
    race_date: draft.race_date != null ? toIsoOrNull(draft.race_date) : undefined,
    cover_url: draft.cover_url != null ? sanitizeUrl(draft.cover_url) : undefined,
    description: draft.description != null ? sanitizeString(draft.description, 4000) : undefined,
    position: draft.position != null ? sanitizeNumber(draft.position, 0, 1_000_000) : undefined,
  })
}

export async function createCircuit(draft: CircuitDraft): Promise<Circuit> {
  return createSlugged<Circuit>('circuits', normalizeCircuitDraft(draft))
}

export async function updateCircuit(id: string, patch: Partial<CircuitDraft>): Promise<Circuit> {
  return updateRow<Circuit>('circuits', id, normalizeCircuitDraft(patch as CircuitDraft))
}

export async function deleteCircuit(id: string): Promise<void> {
  await deleteRow('circuits', id)
}

/* =============================== reordering =================================== */

type OrderRow = { id: string; position: number }

type OrderTable = 'circuits' | 'hall_of_fame' | 'events'

async function swapOrder(table: OrderTable, a: OrderRow, b: OrderRow): Promise<void> {
  assertTable(table)
  const parked = -Math.max(a.position, b.position) - 1
  await updateRow(table, a.id, { position: parked })
  try {
    await updateRow(table, b.id, { position: a.position })
    await updateRow(table, a.id, { position: b.position })
  } catch (err) {
    try {
      await updateRow(table, a.id, { position: a.position })
    } catch {
      /* no-op */
    }
    throw err
  }
}

async function listOrder(table: OrderTable): Promise<OrderRow[]> {
  assertTable(table)
  const { data, error } = await db()
    .from(table)
    .select('id, position')
    .order('position', { ascending: true })
    .limit(MAX_ROWS)
  if (error) throw explain(error)
  return asArray(data) as OrderRow[]
}

export async function moveCircuit(id: string, direction: -1 | 1): Promise<void> {
  const safe = sanitizeId(id)
  if (!safe) return
  const { data, error } = await db().from('circuits').select('position').eq('id', safe).maybeSingle()
  if (error) throw explain(error)
  if (!data) return
  const current = data as unknown as OrderRow
  const rows = await listOrder('circuits')
  const index = rows.findIndex((row) => row.id === safe)
  if (index < 0) return
  const target = rows[index + direction]
  if (!target) return
  await swapOrder('circuits', { id: safe, position: current.position }, target)
}

export async function moveHallEntry(id: string, direction: -1 | 1): Promise<void> {
  const safe = sanitizeId(id)
  if (!safe) return
  const { data, error } = await db().from('hall_of_fame').select('position').eq('id', safe).maybeSingle()
  if (error) throw explain(error)
  if (!data) return
  const current = data as unknown as OrderRow
  const rows = await listOrder('hall_of_fame')
  const index = rows.findIndex((row) => row.id === safe)
  if (index < 0) return
  const target = rows[index + direction]
  if (!target) return
  await swapOrder('hall_of_fame', { id: safe, position: current.position }, target)
}

export async function moveEvent(id: string, direction: -1 | 1): Promise<void> {
  const safe = sanitizeId(id)
  if (!safe) return
  const { data, error } = await db().from('events').select('position').eq('id', safe).maybeSingle()
  if (error) throw explain(error)
  if (!data) return
  const current = data as unknown as OrderRow
  const rows = await listOrder('events')
  const index = rows.findIndex((row) => row.id === safe)
  if (index < 0) return
  const target = rows[index + direction]
  if (!target) return
  await swapOrder('events', { id: safe, position: current.position }, target)
}