import { AdPromo } from '@/components/AdPromo'
import { usePageMeta } from '@/hooks/usePageMeta'

/**
 * Страница рекламы: форматы, цены и заявка. Баннер выводится плиткой в конце
 * главной — на эту страницу ведёт кнопка «Реклама» в меню.
 */
export default function Ads() {
  usePageMeta(
    'Реклама',
    'Реклама на Bad Habit Racing: плитка в конце главной, срок неделя или месяц.',
  )

  return <AdPromo />
}
