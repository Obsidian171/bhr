import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { SITE } from '@/lib/constants'
import { fetchSiteSettings } from '@/lib/api'
import { QUERY_KEYS, useQuery } from '@/hooks/useQuery'
import type { SiteSettings } from '@/lib/types'

export const SITE_DEFAULTS: SiteSettings = {
  name: SITE.name,
  short_name: SITE.shortName,
  tagline: SITE.tagline,
  description: SITE.description,
  email: SITE.email,
  demo_email: null,
  press_email: null,
  phone: null,
  address: null,
  timezone: '',
  founded_year: SITE.foundedYear,
  response_hours: '48',
  working_hours: null,
  nova_url: '',
  nova_label: 'Мы в NOVA',
  socials: null,
  radio_stream_url: 'https://streaming.live365.com/a19203_2',
}

const SITE_KEYS: (keyof SiteSettings)[] = [
  'name',
  'short_name',
  'tagline',
  'description',
  'email',
  'demo_email',
  'press_email',
  'phone',
  'address',
  'timezone',
  'founded_year',
  'response_hours',
  'working_hours',
  'nova_url',
  'nova_label',
  'socials',
  'radio_stream_url',
]

interface SiteState {
  site: SiteSettings
  loading: boolean
  error: string | null
  refetch: () => void | Promise<void>
}

const DEFAULT_STATE: SiteState = {
  site: SITE_DEFAULTS,
  loading: true,
  error: null,
  refetch: () => {},
}

const SiteContext = createContext<SiteState>(DEFAULT_STATE)

function toErrorMessage(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === 'string') return value || null
  if (value instanceof Error) return value.message || null
  return String(value)
}

function mergeSite(row: Partial<SiteSettings> | null | undefined): SiteSettings {
  if (!row) return SITE_DEFAULTS
  const out: SiteSettings = { ...SITE_DEFAULTS }
  for (const key of SITE_KEYS) {
    const incoming = row[key]
    if (incoming === undefined) continue
    ;(out as unknown as Record<string, unknown>)[key] = incoming
  }
  return out as SiteSettings
}

export function SiteProvider({ children }: { children: ReactNode }) {
  const { data, loading, error, refetch } = useQuery(
    fetchSiteSettings,
    null as SiteSettings | null,
    [],
    QUERY_KEYS.site,
  )

  const site = useMemo<SiteSettings>(() => mergeSite(data), [data])

  const value = useMemo<SiteState>(
    () => ({
      site,
      loading,
      error: toErrorMessage(error),
      refetch,
    }),
    [site, loading, error, refetch],
  )

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>
}

export function useSite(): SiteState {
  return useContext(SiteContext)
}