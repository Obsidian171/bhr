import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Cropper, { type Area } from 'react-easy-crop'
import { Check, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  src: string
  aspect: number
  onCancel: () => void
  onDone: (blob: Blob) => void
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Не удалось прочитать изображение.'))
    img.src = src
  })
}

async function cropToBlob(
  src: string,
  pixels: Area,
  type: string,
  maxDim: number,
): Promise<Blob> {
  const image = await loadImage(src)
  const scale = Math.min(1, maxDim / Math.max(pixels.width, pixels.height, 1))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(pixels.width * scale))
  canvas.height = Math.max(1, Math.round(pixels.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas недоступен.')

  if (type !== 'image/png' && type !== 'image/webp') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(
    image,
    pixels.x,
    pixels.y,
    pixels.width,
    pixels.height,
    0,
    0,
    canvas.width,
    canvas.height,
  )

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Не удалось сохранить обрезку.'))),
      type,
      0.92,
    )
  })
}

export function ImageCropDialog({ src, aspect, onCancel, onDone }: Props) {
  const titleId = useId()
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [pixels, setPixels] = useState<Area | null>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const prevFocusRef = useRef<HTMLElement | null>(null)

  const handleCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setPixels(areaPixels)
  }, [])

  useEffect(() => {
    prevFocusRef.current = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCancel()
      }
    }
    window.addEventListener('keydown', onKey)

    const focusFirst = window.setTimeout(() => {
      dialogRef.current?.focus()
    }, 0)

    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
      window.clearTimeout(focusFirst)
      try {
        prevFocusRef.current?.focus()
      } catch {
        /* no-op */
      }
    }
  }, [onCancel])

  const apply = useCallback(() => {
    if (!pixels || busy) return
    setBusy(true)
    setProblem(null)

    Promise.resolve()
      .then(() => cropToBlob(src, pixels, 'image/jpeg', 2400))
      .then((blob) => {
        onDone(blob)
      })
      .catch((e: unknown) => {
        setProblem(e instanceof Error ? e.message : 'Не удалось обрезать изображение.')
      })
      .finally(() => {
        setBusy(false)
      })
  }, [src, pixels, busy, onDone])

  const content = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-surface shadow-2xl outline-none"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span id={titleId} className="text-[15px] font-semibold">
            Обрезать фото
          </span>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Закрыть"
            className="rounded-lg p-1 text-muted transition-colors hover:text-fg focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>

        <div className="relative h-64 sm:h-80">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
          />
        </div>

        {problem && (
          <div className="border-t border-line bg-brand/10 px-4 py-2 text-[12px] text-brand">
            {problem}
          </div>
        )}

        <div className="flex items-center gap-3 border-t border-line px-4 py-3">
          <label className="flex flex-1 items-center gap-2 text-[13px] text-muted">
            <span className="shrink-0">Увеличить</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              aria-label="Масштаб обрезки"
              className="h-1.5 flex-1 accent-[var(--color-brand)] focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            />
          </label>

          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-line px-4 py-2 text-[13px] font-medium transition-colors hover:border-fg/30 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none disabled:opacity-50"
          >
            Отмена
          </button>

          <button
            type="button"
            onClick={apply}
            disabled={busy || !pixels}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90',
              'focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-none',
              'disabled:opacity-50',
            )}
          >
            {busy ? (
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            ) : (
              <Check aria-hidden className="h-4 w-4" />
            )}
            {busy ? 'Режем…' : 'Применить'}
          </button>
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(content, document.body)
}