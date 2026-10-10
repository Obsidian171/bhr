import { useEffect, useId, useRef, useState } from 'react'
import { ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { uploadImage } from '@/lib/media'
import { ImageCropDialog } from '@/components/ImageCropDialog'

interface Props {
  value: string
  onChange: (url: string) => void
  label?: string
  hint?: string
  shape?: 'square' | 'wide'
  aspect?: number
  maxDim?: number
  className?: string
  error?: string | null
}

const MAX_FILE_MB = 12

function isImageFile(file: File): boolean {
  if (!file) return false
  if (file.type && file.type.startsWith('image/')) return true
  return /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(file.name)
}

function safeRevoke(url: string | null) {
  if (!url) return
  try {
    URL.revokeObjectURL(url)
  } catch {
    /* no-op */
  }
}

export function ImageUpload({
  value,
  onChange,
  label,
  hint,
  shape = 'square',
  aspect,
  maxDim,
  className,
  error,
}: Props) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)

  const cropAspect = aspect ?? (shape === 'square' ? 1 : 16 / 9)
  const previewAspect = cropAspect

  useEffect(() => {
    return () => {
      safeRevoke(cropSrc)
    }
  }, [cropSrc])

  const pick = (file: File | undefined) => {
    if (!file) return
    setProblem(null)

    if (!isImageFile(file)) {
      setProblem('Поддерживаются только изображения')
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setProblem(`Файл слишком большой: до ${MAX_FILE_MB} МБ`)
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    try {
      const url = URL.createObjectURL(file)
      setCropSrc((prev) => {
        safeRevoke(prev)
        return url
      })
    } catch {
      setProblem('Не удалось прочитать файл')
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const closeCrop = () => {
    setCropSrc((prev) => {
      safeRevoke(prev)
      return null
    })
    if (inputRef.current) inputRef.current.value = ''
  }

  const applyCrop = async (blob: Blob) => {
    setPending(true)
    setProblem(null)
    try {
      const file = new File([blob], 'bhr-crop.jpg', { type: 'image/jpeg' })
      const image = await uploadImage(file, {
        maxDim: maxDim ?? (shape === 'square' ? 1200 : 2000),
      })
      onChange(image.displayUrl || image.url)
      closeCrop()
    } catch (e) {
      setProblem(e instanceof Error ? e.message : 'Не удалось загрузить')
    } finally {
      setPending(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const clear = () => {
    setProblem(null)
    onChange('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const openPicker = () => {
    if (pending) return
    inputRef.current?.click()
  }

  const preview = (
    <div
      role="button"
      tabIndex={0}
      onClick={openPicker}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          openPicker()
        }
      }}
      aria-label={value ? 'Заменить изображение' : 'Загрузить изображение'}
      className={cn(
        'overflow-hidden rounded-xl border border-line bg-elevated',
        'cursor-pointer transition-colors hover:border-fg/30 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none',
      )}
      style={{ aspectRatio: String(previewAspect) }}
    >
      {value ? (
        <img
          src={value}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full bg-elevated object-contain"
          onError={() => setProblem('Изображение не открывается')}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted">
          <ImagePlus aria-hidden className="h-6 w-6" />
        </div>
      )}
    </div>
  )

  const message = error ?? problem ?? hint
  const messageTone = error || problem ? 'text-brand' : 'text-muted'

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-[13px] font-medium text-fg">
          {label}
        </label>
      )}

      <div className="flex gap-3">
        <div className={cn(shape === 'square' ? 'w-32 shrink-0' : 'w-44 shrink-0')}>{preview}</div>

        <div className="min-w-0 flex-1">
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="image/*"
            aria-label={label ? undefined : 'Выбрать изображение'}
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0])}
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openPicker}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] font-medium transition-colors hover:border-fg/30 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none disabled:opacity-50"
            >
              {pending ? (
                <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImagePlus aria-hidden className="h-3.5 w-3.5" />
              )}
              {pending ? 'Загружаем…' : 'Загрузить'}
            </button>

            {value && (
              <button
                type="button"
                onClick={clear}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] text-muted transition-colors hover:border-brand/50 hover:text-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none disabled:opacity-50"
              >
                <Trash2 aria-hidden className="h-3.5 w-3.5" />
                Убрать
              </button>
            )}
          </div>

          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://…"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            className="mt-2 w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13px] outline-none transition-colors focus-visible:border-fg/30 focus-visible:ring-2 focus-visible:ring-brand/40"
          />

          {message && <p className={cn('mt-1.5 text-[12px]', messageTone)}>{message}</p>}
        </div>
      </div>

      {cropSrc && (
        <ImageCropDialog
          src={cropSrc}
          aspect={cropAspect}
          onCancel={closeCrop}
          onDone={(blob) => void applyCrop(blob)}
        />
      )}
    </div>
  )
}