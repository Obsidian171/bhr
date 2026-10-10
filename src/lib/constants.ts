import type { AdPeriodId } from '@/lib/types'

export const SITE = {
  name: 'BAD HABIT RACING',
  shortName: 'BHR',
  tagline: 'Пилоты, трассы и результаты сезона',
  description:
    'Bad Habit Racing — команда пилотов: состав, баллы, машины и карта трасс. Плюс журнал, лента новостей, зал славы и заказ рекламы.',
  email: 'team@badhabit-racing.com',
  foundedYear: 2026,
} as const

/** Accounts allowed through the hidden entrance at /booth. */
export const STAFF_ACCESS = ['admin', 'editor', 'a&r'] as const

export const HALL_KINDS = [
  { id: 'win', label: 'Победа' },
  { id: 'podium', label: 'Подиум' },
  { id: 'record', label: 'Рекорд' },
  { id: 'press', label: 'Пресса' },
  { id: 'championship', label: 'Чемпионат' },
] as const

/** Место в команде: порядок в составе пилотов. */
export const TEAM_PLACES = [1, 2, 3, 4] as const

/** Режимы мероприятия: план с датой и трассой либо заметка «когда и что ожидается». */
export const EVENT_MODES = [
  { id: 'plan', label: 'Запланировано', hint: 'Дата, трасса и статус' },
  { id: 'note', label: 'Ожидается', hint: 'Когда и что ожидается — свободным текстом' },
] as const

/** Статусы запланированного мероприятия. */
export const EVENT_STATUSES = [
  { id: 'planned', label: 'Запланировано' },
  { id: 'live', label: 'Идёт сейчас' },
  { id: 'done', label: 'Завершено' },
  { id: 'cancelled', label: 'Отменено' },
] as const

export const AD_ORDER_STATUSES = [
  { id: 'new', label: 'Новая' },
  { id: 'in_review', label: 'На рассмотрении' },
  { id: 'agreed', label: 'Согласована' },
  { id: 'paid', label: 'Оплачена' },
  { id: 'rejected', label: 'Отклонена' },
] as const

/**
 * Периоды рекламы: как они пишутся в базе (поле ad_orders.period), как дают
 * один и тот же кубль чата и сколько стоят. Цены можно править прямо здесь.
 */
export const AD_PERIODS: { id: AdPeriodId; label: string; price: number; note: string }[] = [
  { id: 'week', label: 'Неделя', price: 25_000, note: 'Плитка в конце главной' },
  { id: 'month', label: 'Месяц', price: 50_000, note: 'Плитка в конце главной' },
]