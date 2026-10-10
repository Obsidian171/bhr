import { useCallback, useEffect, useRef, useState } from 'react'

export interface QueryState<T> {
  data: T
  loading: boolean
  error: string | null
  refetch: () => void
}

/** Сколько живут данные в кэше. После этого приём повторяет запрос. */
const FRESH_MS = 5 * 60 * 1000

interface CacheEntry {
  data: unknown
  at: number
}

const cache = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<unknown>>()
const listeners = new Map<string, Set<() => void>>()
const invalidators = new Set<() => void>()

function isFresh(key: string): boolean {
  const entry = cache.get(key)
  return Boolean(entry) && Date.now() - (entry as CacheEntry).at < FRESH_MS
}

/** Один запрос на ключ: параллельные вызовы ждут первого. */
function load<T>(key: string | undefined, fetcher: () => Promise<T>): Promise<T> {
  if (!key) return fetcher()
  const running = inflight.get(key)
  if (running) return running as Promise<T>
  const promise = fetcher().finally(() => {
    inflight.delete(key)
  })
  inflight.set(key, promise)
  return promise
}

function publish(key: string, data: unknown) {
  cache.set(key, { data, at: Date.now() })
  listeners.get(key)?.forEach((notify) => notify())
}

function subscribe(key: string, notify: () => void): () => void {
  const set = listeners.get(key) ?? new Set()
  set.add(notify)
  listeners.set(key, set)
  return () => {
    set.delete(notify)
    if (!set.size) listeners.delete(key)
  }
}

let bustCounter = 0

/** Очистка кэша + перечитывание смонтированных запросов, без broadcast. */
function bust(): void {
  cache.clear()
  invalidators.forEach((notify) => notify())
}

// Запись в других вкладках / возврат на вкладку = кэш мог устареть.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'bhr:query-cache-bust') bust()
  })
  const onVisible = () => {
    if (document.visibilityState === 'visible') bust()
  }
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('focus', onVisible)
}

/**
 * Сбрасывает кэш после записи в базу. Без этого следующий экран пять минут
 * показывал бы данные, которые сотрудник только что изменил в /booth.
 */
export function invalidateAll(): void {
  bust()
  // Сообщаем другим вкладкам браузера, что база изменилась: открытая там
  // страница /journal или /events обновит данные без ручной перезагрузки.
  try {
    localStorage.setItem('bhr:query-cache-bust', String(++bustCounter))
  } catch {
    /* приватный режим и т.п. — кэш обновится по focus/visibility */
  }
}

// Запись в других вкладках / возврат на вкладку = кэш мог устареть.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'bhr:query-cache-bust') bust()
  })
  const onVisible = () => {
    if (document.visibilityState === 'visible') bust()
  }
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('focus', onVisible)
}

function onInvalidate(notify: () => void): () => void {
  invalidators.add(notify)
  return () => {
    invalidators.delete(notify)
  }
}

export const QUERY_KEYS = {
  pilots: 'pilots',
  circuits: 'circuits',
  events: 'events',
  posts: 'posts',
  hall: 'hall',
  site: 'site',
  plans: 'plans',
  testimonials: 'testimonials',
  stats: 'stats',
  adBanners: 'ad-banners',
  adOrders: 'ad-orders',
} as const

/**
 * Загружает данные из Supabase и отдаёт loading/error.
 * С `key` данные кэшируются на FRESH_MS и делятся между всеми экранами,
 * поэтому переходы по страницам не дёргают базу повторно.
 * Без `key` поведение прежнее: запрос на каждое монтирование.
 */
export function useQuery<T>(
  fetcher: () => Promise<T>,
  initial: T,
  deps: unknown[] = [],
  key?: string,
): QueryState<T> {
  const [data, setData] = useState<T>(() => (key && cache.has(key) ? (cache.get(key) as CacheEntry).data as T : initial))
  const [loading, setLoading] = useState(() => !key || !isFresh(key))
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const forceRef = useRef(false)
  const ranOnce = useRef(false)

  const refetch = useCallback(() => {
    forceRef.current = true
    setTick((t) => t + 1)
  }, [])

  // Другая вкладка/экран с тем же ключом обновит нас из кэша.
  useEffect(() => {
    if (!key) return
    return subscribe(key, () => {
      const entry = cache.get(key)
      if (entry) setData(entry.data as T)
    })
  }, [key])

  // Кто-то записал в базу: перечитываем, даже если кэш считался свежим.
  useEffect(() => {
    if (!key) return
    return onInvalidate(() => setTick((t) => t + 1))
  }, [key])

  useEffect(() => {
    let alive = true
    // Свежий кэш берём только при первом выполнении после монтирования. После
    // изменения зависимостей (например, canEdit в /booth) или tick — всегда
    // перечитываем: кэш мог содержать устаревший/пустой результат, иначе списки
    // остались бы пустыми до истечения FRESH_MS.
    const firstRun = !ranOnce.current
    ranOnce.current = true
    if (firstRun && key && isFresh(key) && !forceRef.current) {
      setData((cache.get(key) as CacheEntry).data as T)
      setLoading(false)
      return
    }
    forceRef.current = false
    setLoading(true)
    load(key, fetcher)
      .then((result) => {
        if (!alive) return
        setData(result)
        setError(null)
        if (key) publish(key, result)
      })
      .catch((e: unknown) => {
        if (!alive) return
        setError(e instanceof Error ? e.message : 'Не удалось загрузить данные. Попробуйте позже.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  return { data, loading, error, refetch }
}

export function useSubmit<TPayload, TResult>(submitter: (payload: TPayload) => Promise<TResult>) {
  const [pending, setPending] = useState(false)
  const [state, setState] = useState<TResult | null>(null)

  const run = useCallback(
    async (payload: TPayload) => {
      setPending(true)
      setState(null)
      try {
        const result = await submitter(payload)
        setState(result)
        return result
      } finally {
        setPending(false)
      }
    },
    [submitter],
  )

  return { run, pending, state }
}
