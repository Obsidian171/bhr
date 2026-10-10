import { Link } from 'react-router-dom'
import { Flag, Home, Newspaper, Trophy, Users } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import { Container, Section } from '@/components/ui/Layout'
import { CoverArt } from '@/components/ui/Primitives'
import { usePageMeta } from '@/hooks/usePageMeta'

const LINKS = [
  { to: '/', label: 'Главная' },
  { to: '/pilots', label: 'Пилоты' },
  { to: '/circuits', label: 'Трассы' },
  { to: '/journal', label: 'Журнал' },
]

export default function NotFound() {
  usePageMeta('Страница не найдена')
  return (
    <Section className="pt-12 md:pt-20">
      <Container className="max-w-2xl text-center">
        <CoverArt seed="404" title="404" subtitle="not found" size="xl" className="mx-auto aspect-square w-32 sm:w-40" />
        <h1 className="mt-8 text-[28px] font-bold tracking-[-0.035em] md:text-[56px]">Страница потерялась</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Кажется, такого адреса у нас нет. Возможно, запись убрали из журнала или в ссылке опечатка.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink to="/" size="lg">
            <Home className="h-5 w-5" />
            На главную
          </ButtonLink>
          <ButtonLink to="/pilots" size="lg" variant="outline">
            <Users className="h-5 w-5" />
            Пилоты
          </ButtonLink>
          <ButtonLink to="/circuits" size="lg" variant="outline">
            <Flag className="h-5 w-5" />
            Трассы
          </ButtonLink>
          <ButtonLink to="/journal" size="lg" variant="outline">
            <Newspaper className="h-5 w-5" />
            Журнал
          </ButtonLink>
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-2">
          {LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-full border border-line px-4 py-2 text-sm text-muted transition-colors hover:border-fg/30 hover:text-fg"
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/hall"
            className="rounded-full border border-line px-4 py-2 text-sm text-muted transition-colors hover:border-fg/30 hover:text-fg"
          >
            <span className="inline-flex items-center gap-1.5">
              <Trophy className="h-4 w-4" />
              Зал славы
            </span>
          </Link>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-4 text-xs text-muted">
          <span>Хотите разместить рекламу на сайте команды?</span>
          <Link to="/ads" className="flex items-center gap-2 text-brand hover:underline">
            <Flag className="h-4 w-4" />
            Закажите баннер
          </Link>
        </div>
        <FlagStrip />
      </Container>
    </Section>
  )
}

function FlagStrip() {
  return (
    <div className="mx-auto mt-10 flex items-center gap-2 opacity-40" aria-hidden>
      {Array.from({ length: 10 }).map((_, i) => (
        <Flag key={i} className="h-4 w-4 text-brand" style={{ opacity: i % 2 === 0 ? 1 : 0.55 }} />
      ))}
    </div>
  )
}