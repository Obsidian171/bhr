import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}

export function formatDate(value?: string | null, locale = 'ru-RU'): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatNumber(value?: number | null): string {
  if (value === null || value === undefined) return '0'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.0', '')}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace('.0', '')}K`
  return String(value)
}

export function formatPrice(value?: number | null): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function isFutureDate(value?: string | null): boolean {
  if (!value) return false
  return new Date(value).getTime() > Date.now()
}

/** Ссылка на профиль: slug-адрес, а если он ещё не заполнен в базе — по id. */
export function pilotHref(pilot: { id?: string | null; slug?: string | null }): string {
  return `/pilots/${pilot.slug || pilot.id}`
}

export function circuitHref(circuit: { id?: string | null; slug?: string | null }): string {
  return `/circuits/${circuit.slug || circuit.id}`
}

export function postHref(post: { id?: string | null; slug?: string | null }): string {
  return `/journal/${post.slug || post.id}`
}

/** Deterministic pseudo-random generator so generated artwork stays stable between renders. */
export function seededRandom(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 1000) / 1000
}

export function gradientFromSeed(seed: string): string {
  const palettes = [
    'from-[#9e2b36] via-[#c03545] to-[#e05a68]',
    'from-[#6e1d25] via-[#9e2b36] to-[#cf4655]',
    'from-[#7a1f28] via-[#b8325f] to-[#e05a68]',
    'from-[#8a2530] via-[#a62735] to-[#d95563]',
    'from-[#3b3b3f] via-[#7a1f28] to-[#c03545]',
    'from-[#8a2530] via-[#c03545] to-[#ff7a6a]',
  ]
  const idx = Math.floor(seededRandom(seed) * palettes.length)
  return palettes[idx]
}