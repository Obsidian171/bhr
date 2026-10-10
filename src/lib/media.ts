const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY
const MAX_BYTES = 8 * 1024 * 1024

export interface UploadOptions {
  maxDim?: number
  name?: string
}

export interface UploadedImage {
  url: string
  displayUrl: string
  deleteUrl: string
  width: number
  height: number
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'))
    reader.readAsDataURL(file)
  })
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

async function shrink(
  file: File,
  maxDim: number,
): Promise<{ blob: Blob; width: number; height: number }> {
  const source = await readAsDataUrl(file)
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Файл не похож на изображение'))
    image.src = source
  })

  const width0 = Math.max(1, img.naturalWidth)
  const height0 = Math.max(1, img.naturalHeight)
  const scale = Math.min(1, maxDim / Math.max(width0, height0))

  // Уже webp и компактный — не трогаем.
  if (scale === 1 && file.type === 'image/webp' && file.size < 400 * 1024) {
    return { blob: file, width: width0, height: height0 }
  }

  const width = Math.max(1, Math.round(width0 * scale))
  const height = Math.max(1, Math.round(height0 * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return { blob: file, width: width0, height: height0 }
  ctx.drawImage(img, 0, 0, width, height)

  // Фото уходят и отдаются в WebP; если браузер не умеет кодировать webp —
  // откат на jpeg (стабильно в любом браузере).
  const webp = await canvasBlob(canvas, 'image/webp', 0.86)
  if (webp && webp.type === 'image/webp') return { blob: webp, width, height }

  const jpeg = await canvasBlob(canvas, 'image/jpeg', 0.86)
  return { blob: jpeg ?? file, width, height }
}

export async function uploadImage(file: File, options: UploadOptions = {}): Promise<UploadedImage> {
  if (!IMGBB_API_KEY) throw new Error('VITE_IMGBB_API_KEY не настроен')
  if (!file.type.startsWith('image/')) throw new Error('Нужен файл изображения')
  if (file.size > MAX_BYTES) throw new Error('Файл больше 8 МБ')

  const { blob, width, height } = await shrink(file, options.maxDim ?? 1600)

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = String(reader.result)
      const idx = result.indexOf(',')
      resolve(idx >= 0 ? result.slice(idx + 1) : result)
    }
    reader.onerror = () => reject(new Error('Не удалось конвертировать файл'))
    reader.readAsDataURL(blob)
  })

  const formData = new FormData()
  formData.append('image', base64)
  if (options.name) formData.append('name', options.name)

  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || 'Ошибка загрузки на ImgBB')
  }

  const json = await res.json()
  const data = json?.data
  if (!data?.url) throw new Error('Некорректный ответ ImgBB')

  const url = data.url as string
  const deleteUrl = data.delete_url || ''

  // ImgBB отдаёт URL в исходном расширении: webp-байты → .webp (content-type image/webp).
  return { url, displayUrl: url, width: data.width || width, height: data.height || height, deleteUrl }
}
