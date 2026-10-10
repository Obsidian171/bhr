import { Suspense, lazy, useEffect, type ComponentType } from 'react'
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { Footer, Header, PublicSidebar } from '@/components/layout/Header'
import { Spinner } from '@/components/ui/Layout'

import Home from '@/pages/Home'

type AnyProps = Record<string, unknown>

/**
 * Безопасный lazy: если модуль экспортирует компонент как named export (без default),
 * оборачиваем его в { default }, чтобы React.lazy не падал на "Cannot convert object
 * to primitive value".
 */
function lazyPage(
  loader: () => Promise<unknown>,
  exportName?: string,
): React.LazyExoticComponent<ComponentType<AnyProps>> {
  return lazy(() =>
    loader().then((mod) => {
      const m = mod as Record<string, unknown>
      const component =
        (exportName ? m[exportName] : m.default) ??
        m.default ??
        m.Page ??
        m.Component

      if (typeof component !== 'function' && typeof component !== 'object') {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.error('[lazyPage] модуль без компонента', m)
        }
        throw new Error('Страница не найдена в модуле')
      }

      return { default: component as ComponentType<AnyProps> }
    }),
  )
}

const Pilots = lazyPage(() => import('@/pages/Pilots'))
const PilotDetail = lazyPage(() => import('@/pages/PilotDetail'))
const Circuits = lazyPage(() => import('@/pages/Circuits'))
const CircuitDetail = lazyPage(() => import('@/pages/CircuitDetail'))
const Events = lazyPage(() => import('@/pages/Events'))
const Standings = lazyPage(() => import('@/pages/Standings'))
const Hall = lazyPage(() => import('@/pages/Hall'))
const Ads = lazyPage(() => import('@/pages/Ads'))
const Journal = lazyPage(() => import('@/pages/Journal'))
const JournalPost = lazyPage(() => import('@/pages/JournalPost'))
const Booth = lazyPage(() => import('@/pages/Booth'))
const NotFound = lazyPage(() => import('@/pages/NotFound'))

function LegacyMusicRedirect({ to = '/' }: { to?: string }) {
  const { slug } = useParams<{ slug: string }>()
  const suffix = slug && to === '/pilots' ? `/${slug}` : ''
  return <Navigate to={`${to}${suffix}`} replace />
}

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null
    if (target) {
      target.scrollIntoView()
      return
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname, hash])
  return null
}

export default function App() {
  return (
    <div className="flex min-h-screen">
      <a
        href="#main"
        className="sr-only-focusable fixed left-4 top-4 z-50 rounded-full bg-brand px-4 py-2 text-[13px] font-semibold text-white shadow-[var(--shadow-card)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        Перейти к содержимому
      </a>
      <PublicSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <ScrollToTop />
        <Header />
        <main id="main" tabIndex={-1} className="flex-1 pb-24">
          <Suspense
            fallback={
              <div className="flex h-[60vh] items-center justify-center">
                <Spinner className="h-8 w-8" />
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/pilots" element={<Pilots />} />
              <Route path="/pilots/:slug" element={<PilotDetail />} />
              <Route path="/circuits" element={<Circuits />} />
              <Route path="/circuits/:slug" element={<CircuitDetail />} />
              <Route path="/events" element={<Events />} />
              <Route path="/standings" element={<Standings />} />
              <Route path="/hall" element={<Hall />} />
              <Route path="/ads" element={<Ads />} />
              <Route path="/journal" element={<Journal />} />
              <Route path="/journal/:slug" element={<JournalPost />} />
              <Route path="/booth" element={<Booth />} />

              <Route path="/artists" element={<LegacyMusicRedirect to="/pilots" />} />
              <Route path="/artists/:slug" element={<LegacyMusicRedirect to="/pilots" />} />
              <Route path="/albums" element={<LegacyMusicRedirect />} />
              <Route path="/albums/:slug" element={<LegacyMusicRedirect />} />
              <Route path="/releases" element={<LegacyMusicRedirect />} />
              <Route path="/releases/:slug" element={<LegacyMusicRedirect />} />
              <Route path="/charts" element={<LegacyMusicRedirect />} />
              <Route path="/radio" element={<LegacyMusicRedirect />} />
              <Route path="/apply" element={<LegacyMusicRedirect />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </div>
  )
}