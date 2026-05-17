const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''

/**
 * Convierte una URL de Supabase Storage al endpoint de transformación WebP.
 * Para otros CDNs devuelve la URL original.
 * Requiere plan Pro de Supabase para funcionar; el onError del <img> maneja el fallback.
 */
export function toWebP(url: string, width = 600, quality = 80): string {
  if (!url || !SUPABASE_URL) return url
  if (url.includes(`${SUPABASE_URL}/storage/v1/object/public/`)) {
    const base = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
    return `${base}?format=webp&width=${width}&quality=${quality}`
  }
  return url
}
