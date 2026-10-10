import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, Clock, Hash } from 'lucide-react'
import { QUERY_KEYS, useQuery } from '@/hooks/useQuery'
import { fetchPostBySlug, fetchPosts } from '@/lib/api'
import { ShareButton } from '@/components/ShareButton'
import type { Post } from '@/lib/types'
import { Container, Reveal, Section } from '@/components/ui/Layout'
import { CoverArt } from '@/components/ui/Primitives'
import { Skeleton } from '@/components/ui/Skeleton'
import { absoluteUrl } from '@/lib/share'
import { formatDate, postHref } from '@/lib/utils'
import { usePageMeta } from '@/hooks/usePageMeta'

/* --------------------------------- helpers --------------------------------- */

/** Грубый слаг для анкоров TOC — не меняет данные, только UI. */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60)
}

/** Парсер блоков статьи: ## заголовки, > цитаты, обычные абзацы. */
type Block =
  | { kind: 'h2'; text: string; id: string }
  | { kind: 'quote'; text: string }
  | { kind: 'p'; text: string }

function parseBlocks(body: string): Block[] {
  return body
    .split('\n\n')
    .map((b) => b.trim())
    .filter(Boolean)
    .map((trimmed) => {
      if (trimmed.startsWith('## ')) {
        const text = trimmed.replace(/^##\s+/, '')
        return { kind: 'h2', text, id: slugify(text) }
      }
      if (trimmed.startsWith('>')) {
        return { kind: 'quote', text: trimmed.replace(/^>\s*/, '') }
      }
      return { kind: 'p', text: trimmed }
    })
}

/* -------------------------------- sub-parts -------------------------------- */

function MetaRow({ post }: { post: Post }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line pb-4 text-[12px] text-muted">
      {post.category && (
        <span className="font-semibold tracking-[0.14em] text-fg uppercase">{post.category}</span>
      )}
      <span className="inline-flex items-center gap-1.5 tabular-nums">
        <Clock aria-hidden className="h-3.5 w-3.5" />
        {post.read_minutes ?? 3} мин
      </span>
      <time className="tabular-nums" dateTime={post.published_at ?? undefined}>
        {formatDate(post.published_at)}
      </time>
      {post.author_name && <span className="truncate">{post.author_name}</span>}
      {post.via_url && (
        <a
          href={post.via_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-brand hover:underline focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        >
          оригинал <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
        </a>
      )}
      <span className="ml-auto">
        <ShareButton
          iconOnly
          url={absoluteUrl(postHref(post))}
          title={`${post.title} — BAD HABIT RACING`}
          text={post.title}
          ariaLabel="Поделиться записью"
        />
      </span>
    </div>
  )
}

function TableOfContents({ blocks }: { blocks: Block[] }) {
  const headings = blocks.filter((b): b is Extract<Block, { kind: 'h2' }> => b.kind === 'h2')
  if (headings.length < 2) return null
  return (
    <nav
      aria-label="Содержание"
      className="mt-8 rounded-2xl border border-line bg-card/40 p-4 sm:p-5"
    >
      <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.16em] text-muted uppercase">
        <Hash aria-hidden className="h-3.5 w-3.5 text-brand" />
        Содержание
      </div>
      <ol className="mt-3 space-y-1.5">
        {headings.map((h, i) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className="group flex items-baseline gap-3 rounded-lg px-2 py-1.5 text-[13px] text-fg/80 transition-colors hover:bg-fg/[0.04] hover:text-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
              <span className="w-5 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="truncate">{h.text}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}

function ReadingProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement
      const max = doc.scrollHeight - doc.clientHeight
      const value = max > 0 ? Math.min(1, Math.max(0, doc.scrollTop / max)) : 0
      setProgress(value)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <div aria-hidden className="fixed inset-x-0 top-0 z-40 h-[3px] bg-transparent">
      <div
        className="h-full bg-brand transition-[width] duration-150"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  )
}

function PostSkeleton() {
  return (
    <Section className="pt-5 pb-20 md:pt-10">
      <Container className="max-w-2xl">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-6 h-3 w-full" />
        <Skeleton className="mt-6 h-10 w-11/12" />
        <Skeleton className="mt-3 h-10 w-9/12" />
        <Skeleton className="mt-6 h-5 w-10/12" />
        <Skeleton className="mt-6 aspect-[16/9] w-full rounded-xl" />
        <div className="mt-10 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </Container>
    </Section>
  )
}

function NextPostCard({ post }: { post: Post }) {
  return (
    <Link
      to={postHref(post)}
      className="group mt-8 flex items-stretch gap-4 overflow-hidden rounded-2xl border border-line bg-card/40 p-3 transition-colors hover:border-brand/40 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none sm:p-4"
    >
      <CoverArt
        seed={post.id}
        title={post.title}
        subtitle={post.category ?? undefined}
        image={post.cover_url}
        className="hidden h-20 w-32 shrink-0 overflow-hidden rounded-xl ring-1 ring-line/60 sm:block"
        size="sm"
      />
      <div className="min-w-0 flex-1 self-center">
        <p className="font-mono text-[10px] tracking-[0.2em] text-muted uppercase">
          Следующая запись
        </p>
        <p className="mt-1.5 line-clamp-2 text-[15px] font-semibold leading-snug text-fg transition-colors group-hover:text-brand">
          {post.title}
        </p>
        <p className="mt-1 flex items-center gap-2 text-[12px] text-muted">
          <span className="tabular-nums">{formatDate(post.published_at)}</span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Clock aria-hidden className="h-3 w-3" />
            {post.read_minutes ?? 3} мин
          </span>
        </p>
      </div>
      <ArrowUpRight
        aria-hidden
        className="h-4 w-4 shrink-0 self-center text-muted transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand"
      />
    </Link>
  )
}

/* ---------------------------------- page ----------------------------------- */

export default function JournalPost() {
  const { slug } = useParams<{ slug: string }>()
  const { data: post, loading } = useQuery(
    () => fetchPostBySlug(slug ?? ''),
    null as Post | null,
    [slug],
  )
  const { data: all } = useQuery(fetchPosts, [] as Post[], [], QUERY_KEYS.posts)
  usePageMeta(post?.title ?? 'Журнал')

  const blocks = useMemo(() => (post ? parseBlocks(post.body) : []), [post])

  const next = useMemo(() => {
    if (!post || !all.length) return undefined
    const index = all.findIndex((p) => p.id === post.id)
    return index >= 0 ? all[index + 1] : undefined
  }, [post, all])

  if (!post) {
    if (loading) return <PostSkeleton />
    return <Navigate to="/journal" replace />
  }

  return (
    <Section className="pt-5 pb-20 md:pt-10">
      <ReadingProgress />

      <Container className="max-w-2xl">
        {/* Навигация назад */}
        <Link
          to="/journal"
          className="group inline-flex items-center gap-2 text-[13px] font-semibold text-muted transition-colors hover:text-fg focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        >
          <ArrowLeft
            aria-hidden
            className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5"
          />
          В ленту
        </Link>

        <Reveal>
          <div className="mt-6">
            <MetaRow post={post} />
          </div>

          <h1 className="mt-6 text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-[1.1] tracking-[-0.03em] text-fg text-balance">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="mt-5 text-[17px] leading-relaxed text-muted md:text-[19px] md:leading-[1.6]">
              {post.excerpt}
            </p>
          )}
        </Reveal>

        {post.cover_url && (
          <Reveal delay={0.05}>
            <figure className="mt-8">
              <CoverArt
                seed={post.id}
                title={post.title}
                subtitle={post.category ?? undefined}
                image={post.cover_url}
                className="aspect-[16/9] w-full overflow-hidden rounded-2xl ring-1 ring-line/60"
                size="lg"
              />
            </figure>
          </Reveal>
        )}

        {/* Оглавление из ## заголовков */}
        <TableOfContents blocks={blocks} />

        {/* Тело */}
        <Reveal delay={0.08}>
          <article className="mt-10 space-y-6 text-[16px] leading-[1.8] text-fg/85 md:text-[17px] md:leading-[1.85]">
            {blocks.map((block, i) => {
              if (block.kind === 'h2') {
                return (
                  <h2
                    key={i}
                    id={block.id}
                    className="scroll-mt-24 pt-6 text-[21px] font-bold tracking-[-0.02em] text-fg md:text-[25px]"
                  >
                    {block.text}
                  </h2>
                )
              }
              if (block.kind === 'quote') {
                return (
                  <blockquote
                    key={i}
                    className="my-8 border-l-2 border-brand/60 bg-brand/[0.05] py-3 pl-5 pr-4 text-[17px] leading-relaxed italic text-fg/80 md:text-[18px]"
                  >
                    {block.text}
                  </blockquote>
                )
              }
              return (
                <p key={i} className="text-balance">
                  {block.text}
                </p>
              )
            })}
          </article>
        </Reveal>

        {/* Теги */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-12 flex flex-wrap items-center gap-2 border-t border-line pt-5">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full border border-line bg-card/40 px-3 py-1 text-[12px] font-semibold text-muted"
              >
                <Hash aria-hidden className="h-3 w-3 text-brand/70" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Следующая запись */}
        {next && <NextPostCard post={next} />}
      </Container>
    </Section>
  )
}