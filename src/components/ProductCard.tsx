import { memo } from 'react'
import { Plus, Minus } from 'lucide-react'
import type { Product, CartItem } from '../types'
import { toWebP } from '../lib/image'

interface Props {
  product: Product
  cartItem: CartItem | undefined
  onAdd: (product: Product) => void
  onUpdateQuantity: (id: number, delta: number) => void
  onRemove: (id: number) => void
}

const ProductCard = memo(function ProductCard({ product, cartItem, onAdd, onUpdateQuantity, onRemove }: Props) {
  const imgSrc = toWebP(product.image_url, 400)
  const altText = product.description
    ? `${product.name} (${product.unit}) — ${product.description.slice(0, 80)}`
    : `${product.name} (${product.unit}) — Producto orgánico LORCAM, Monterrey`

  return (
    <article
      className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-lg transition-shadow animate-fade-in"
      itemScope
      itemType="https://schema.org/Product"
    >
      <div className="relative overflow-hidden aspect-square bg-gray-50">
        <img
          src={imgSrc}
          alt={altText}
          loading="lazy"
          decoding="async"
          itemProp="image"
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
          onError={e => {
            const img = e.target as HTMLImageElement
            if (img.src !== product.image_url) img.src = product.image_url
          }}
        />
      </div>
      <div className="p-3">
        <h3 className="font-bold text-sm text-gray-800 leading-snug mb-1" itemProp="name">{product.name}</h3>
        <p className="text-gray-500 text-xs mb-2" itemProp="description">{product.unit}</p>
        <div className="flex items-center justify-between">
          <span className="text-[#4A5D23] font-bold" itemProp="offers" itemScope itemType="https://schema.org/Offer">
            <meta itemProp="priceCurrency" content="MXN" />
            <span itemProp="price" content={String(product.price)}>${product.price.toFixed(2)}</span>
          </span>
          {cartItem ? (
            <div className="flex items-center gap-1">
              <button
                aria-label="Reducir cantidad"
                onClick={() => cartItem.quantity === 1 ? onRemove(product.id) : onUpdateQuantity(product.id, -1)}
                className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:border-red-400 hover:text-red-400 transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-sm font-bold w-5 text-center text-[#4A5D23]">{cartItem.quantity}</span>
              <button
                aria-label="Aumentar cantidad"
                onClick={() => onAdd(product)}
                className="w-7 h-7 rounded-full bg-[#4A5D23] text-white flex items-center justify-center hover:bg-[#6B8E23] transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onAdd(product)}
              className="text-xs px-3 py-1.5 rounded-full font-semibold bg-[#4A5D23] text-white hover:bg-[#6B8E23] transition-colors"
            >
              Agregar
            </button>
          )}
        </div>
      </div>
    </article>
  )
})

export default ProductCard
