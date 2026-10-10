import type { Circuit } from '@/lib/types'
import { seededRandom } from '@/lib/utils'

export interface RaceWeather {
  label: string
  air: number
  asphalt: number
  rain: number
  note: string
}

/** Средняя температура воздуха по месяцам (сезон гонок — тёплое полугодие). */
const AIR_BY_MONTH = [2, 4, 8, 13, 18, 22, 25, 24, 19, 13, 7, 3]

/**
 * «Атмосферный» прогноз этапа: считается детерминированно из слага и даты
 * трассы, поэтому стабилен между рендерами и не требует внешних API.
 */
export function computeRaceWeather(circuit: Circuit, when?: string | Date): RaceWeather | null {
  const date = when ? new Date(when) : circuit.race_date ? new Date(circuit.race_date) : new Date()
  if (Number.isNaN(date.getTime())) return null

  const key = `${circuit.slug}:${date.toISOString().slice(0, 10)}`
  const r = (tag: string) => seededRandom(`${key}:${tag}`)

  const air = AIR_BY_MONTH[date.getUTCMonth()] + Math.round((r('air') * 12 - 6) * 2) / 2
  const asphalt = Math.round(air + 6 + r('asphalt') * 9)
  const rain = Math.round(r('rain') * 100)

  let label: string
  if (rain < 15) label = 'Солнечно'
  else if (rain < 40) label = 'Переменная облачность'
  else if (rain < 65) label = 'Пасмурно'
  else label = 'Дождь'

  let note: string
  if (rain < 15) note = 'Сухой асфальт — ждём быстрые круги'
  else if (rain < 40) note = 'Сухо, возможны отдельные порывы ветра'
  else if (rain < 65) note = 'Влажно — следите за стратегией пит-стопов'
  else note = 'Дождь — решат шины и пит-стопы'

  return { label, air, asphalt, rain, note }
}