/** Пилот команды: фото, обложка, баллы, место в составе, мини-био, машина. */
export interface Pilot {
  id: string
  slug: string
  name: string
  photo_url?: string | null
  cover_url?: string | null
  /** Очки пилота. */
  points?: number | null
  /** Место в командном зачёте: используется в турнирной таблице. */
  team_place?: number | null
  /** Биография пилота. */
  bio?: string | null
  /** Автомобиль пилота. */
  car?: string | null
  number?: string | null
  country?: string | null
  links?: Record<string, string> | null
  nova_url?: string | null
  featured?: boolean
  /** Дополнительный состав: не участвует в основном зачёте, может отображаться отдельно. */
  is_extra?: boolean
  /** Роль/амплуа: в командном составе или в штабе. */
  role_text?: string | null
  owner_id?: string | null
  created_at?: string
}

/** Трасса: карточка-справочник. */
export interface Circuit {
  id: string
  slug: string
  name: string
  country?: string | null
  /** Длина в км. */
  length_km?: number | null
  /** Число поворотов. */
  turns?: number | null
  /** Рекорд круга. */
  lap_record?: string | null
  /** Дата заезда (ISO). */
  race_date?: string | null
  cover_url?: string | null
  description?: string | null
  position: number
  created_at?: string
}

/** Режим мероприятия: план (дата/трасса/статус) или заметка «когда и что ожидается». */
export type EventMode = 'plan' | 'note'

/** Статус запланированного мероприятия. */
export type EventStatus = 'planned' | 'live' | 'done' | 'cancelled'

/** Мероприятие команды: запланированный этап или заметка о том, что ожидается. */
export interface TeamEvent {
  id: string
  slug: string
  title: string
  mode: EventMode
  /** Привязка к трассе — для запланированного режима. */
  circuit_id?: string | null
  circuit?: Circuit | null
  status: EventStatus
  /** Начало (ISO) — для запланированного режима. */
  starts_at?: string | null
  cover_url?: string | null
  /** Описание: что ожидается. */
  body?: string | null
  position: number
  created_at?: string
}

export type PostKind = 'journal' | 'news'

export interface Post {
  id: string
  slug: string
  title: string
  excerpt?: string | null
  body: string
  cover_url?: string | null
  author_id?: string | null
  author_name?: string | null
  category?: string | null
  /** journal — статья журнала, news — строка ленты новостей. */
  kind: PostKind
  /** Ссылка-первоисточник, если запись сделана по «Поделиться». */
  via_url?: string | null
  tags: string[]
  read_minutes?: number | null
  published_at?: string | null
  created_at?: string
}

/** Виды достижений в зале славы BHR. */
export type HallKind = 'win' | 'podium' | 'record' | 'press' | 'championship'

/** Зал славы: достижения пилотов и команды. */
export interface HallEntry {
  id: string
  pilot_id?: string | null
  pilot?: Pilot | null
  title: string
  kind: HallKind
  place?: string | null
  year?: number | null
  source?: string | null
  body?: string | null
  /** Вес: чем больше, тем выше строка в «Зале славы». */
  weight?: number
  position: number
  created_at?: string
}

/** Сроки показа: реклама идёт либо неделю, либо месяц. */
export type AdPeriodId = 'week' | 'month'

export type AdOrderStatus = 'new' | 'in_review' | 'agreed' | 'paid' | 'rejected'

/** Баннер на главной. Публично видны только is_active в пределах start_at/end_at. */
export interface AdBanner {
  id: string
  title: string
  advertiser?: string | null
  image_url?: string | null
  url?: string | null
  is_active?: boolean
  start_at?: string | null
  end_at?: string | null
  position: number
  created_at?: string
}

/** Заявка на размещение рекламы, пришедшая с главной. */
export interface AdOrder {
  id: string
  name: string
  link?: string | null
  budget?: string | null
  period: AdPeriodId
  message?: string | null
  email?: string | null
  status: AdOrderStatus
  user_id?: string | null
  created_at: string
}

/** Поля формы «заказать баннер»: обязазательны только имя и срок. */
export type AdOrderDraft = Pick<AdOrder, 'name' | 'period'> &
  Partial<Pick<AdOrder, 'link' | 'budget' | 'message'>>

export interface Profile {
  id: string
  stage_name?: string | null
  avatar_url?: string | null
  bio?: string | null
  role?: string | null
  created_at?: string
}

export interface SiteSettings {
  name: string
  short_name: string
  tagline: string | null
  description: string | null
  email: string | null
  demo_email: string | null
  press_email: string | null
  phone: string | null
  address: string | null
  timezone: string
  founded_year: number | null
  response_hours: string | null
  working_hours: string | null
  nova_url: string | null
  nova_label: string | null
  socials: Record<string, string> | null
  radio_stream_url: string | null
}

export interface PageBlock {
  id: string
  page: string
  key: string
  title?: string | null
  subtitle?: string | null
  body?: string | null
  icon?: string | null
  url?: string | null
  position: number
  meta: Record<string, unknown> | null
  is_active: boolean
}

export interface LegalDocument {
  id: string
  key: string
  title: string
  revision_date: string
  body: string[]
  position: number
}

export interface Profile {
  id: string
  username?: string | null
  display_name?: string | null
  avatar_url?: string | null
  cover_url?: string | null
  bio?: string | null
  is_private?: boolean
  followers_count?: number
  following_count?: number
  posts_count?: number
  /** Реальный email аккаунта (в т.ч. синтетический «ник@reverb.local») — для входа по нику. */
  auth_email?: string | null
  created_at?: string
  updated_at?: string
}
