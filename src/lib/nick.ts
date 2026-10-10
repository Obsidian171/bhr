import { translit } from '@/lib/slug'

/** Синтетический домен: почта нужна Supabase, а не самому пользователю. */
export const REVERB_EMAIL_DOMAIN = 'reverb.local'

/** Ник: буквы (в т.ч. кириллица), цифры, `_ . -`; от 2 до 24 знаков. */
export function isValidNick(nick: string): boolean {
  return /^[a-zа-яё0-9._-]{2,24}$/i.test(nick.trim())
}

/** Канонический handle: единый регистр, чтобы ник не «плодил» дубли. */
export function nickToHandle(nick: string): string {
  return nick.trim().toLowerCase()
}

/** URL-имя для ленты — тот же handle, но пригодный для транслита при желании. */
export function handleToSlug(handle: string): string {
  const slug = translit(handle).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return slug || 'user'
}

/** Детерминированный хэш ника, чтобы два ника не получали один email. */
function hashHandle(handle: string): number {
  let h = 5381
  for (let i = 0; i < handle.length; i += 1) {
    h = ((h * 33) ^ handle.charCodeAt(i)) >>> 0
  }
  return h % 46656
}

/** Синтетический email для аккаунта по нику. Детерминирован: тот же ник —
 * тот же адрес, поэтому вход по нику работает без записи в базу. */
export function emailForHandle(handle: string): string {
  return `${handleToSlug(handle)}-${hashHandle(handle).toString(36)}@${REVERB_EMAIL_DOMAIN}`
}