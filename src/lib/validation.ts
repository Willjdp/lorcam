import type { Product, Category, CartItem } from '../types'

export const MAX_QUANTITY = 99
const MAX_PRICE = 999_999

function sanitizeString(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength).replace(/[<>]/g, '')
}

function sanitizeUrl(value: unknown): string {
  if (typeof value !== 'string') return ''
  try {
    const { protocol, href } = new URL(value)
    return protocol === 'http:' || protocol === 'https:' ? href : ''
  } catch {
    return ''
  }
}

export function validateProduct(raw: unknown): Product | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const name = sanitizeString(r.name, 100)
  if (
    typeof r.id !== 'number' ||
    !name ||
    typeof r.price !== 'number' ||
    r.price <= 0 ||
    r.price > MAX_PRICE ||
    !isFinite(r.price) ||
    typeof r.active !== 'boolean'
  ) return null

  return {
    id: r.id,
    name,
    description: sanitizeString(r.description, 500),
    price: Math.round(r.price * 100) / 100,
    image_url: sanitizeUrl(r.image_url),
    category_id: typeof r.category_id === 'number' ? r.category_id : 0,
    unit: sanitizeString(r.unit, 50),
    active: r.active,
  }
}

export function validateCategory(raw: unknown): Category | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const name = sanitizeString(r.name, 100)
  if (typeof r.id !== 'number' || !name) return null
  return {
    id: r.id,
    name,
    slug: sanitizeString(r.slug, 100),
    image_url: sanitizeUrl(r.image_url),
  }
}

export function validateCart(cart: CartItem[]): string | null {
  if (cart.length === 0) return 'El carrito está vacío'
  for (const item of cart) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QUANTITY)
      return `Cantidad inválida para "${item.product.name}"`
    if (item.product.price <= 0 || !isFinite(item.product.price))
      return `Precio inválido para "${item.product.name}"`
  }
  return null
}
