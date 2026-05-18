import { useEffect } from 'react'
import { X, Plus, Minus } from 'lucide-react'
import type { Product, CartItem } from '../types'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { toWebP } from '../lib/image'

interface Props {
  product: Product
  cartItem: CartItem | undefined
  onClose: () => void
  onAdd: (product: Product) => void
  onUpdateQuantity: (id: number, delta: number) => void
  onRemove: (id: number) => void
}

export default function ProductModal({ product, cartItem, onClose, onAdd, onUpdateQuantity, onRemove }: Props) {
  const trapRef = useFocusTrap(true)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const imgSrc = toWebP(product.image_url, 600)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={trapRef}
        className="relative bg-white w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-fade-in max-h-[92vh] sm:max-h-[85vh]"
      >
        {/* Cerrar */}
        <button
          onClick={onClose}
          aria-label="Cerrar detalle del producto"
          className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4 text-gray-600" aria-hidden="true" />
        </button>

        {/* Imagen */}
        <div className="w-full md:w-1/2 shrink-0 bg-gray-50 h-56 sm:h-64 md:h-auto">
          <img
            src={imgSrc}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={e => {
              const img = e.target as HTMLImageElement
              if (img.src !== product.image_url) img.src = product.image_url
            }}
          />
        </div>

        {/* Contenido */}
        <div className="flex flex-col p-6 overflow-y-auto flex-1 min-h-0">
          <p className="text-xs text-[#4A5D23] font-semibold uppercase tracking-wide mb-1">
            {product.unit}
          </p>
          <h2 id="product-modal-title" className="text-xl font-black text-gray-900 leading-snug mb-3">
            {product.name}
          </h2>
          {product.description && (
            <p className="text-gray-600 text-sm leading-relaxed mb-4 flex-1">
              {product.description}
            </p>
          )}
          <p className="text-2xl font-black text-[#4A5D23] mb-6">
            ${product.price.toFixed(2)}
          </p>

          {cartItem ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => cartItem.quantity === 1 ? onRemove(product.id) : onUpdateQuantity(product.id, -1)}
                aria-label="Reducir cantidad"
                className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:border-red-400 hover:text-red-400 transition-colors"
              >
                <Minus className="w-4 h-4" aria-hidden="true" />
              </button>
              <span
                className="text-lg font-black text-[#4A5D23] w-6 text-center"
                aria-label={`Cantidad: ${cartItem.quantity}`}
              >
                {cartItem.quantity}
              </span>
              <button
                onClick={() => onAdd(product)}
                aria-label="Aumentar cantidad"
                className="w-10 h-10 rounded-full bg-[#4A5D23] text-white flex items-center justify-center hover:bg-[#6B8E23] transition-colors"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
              </button>
              <span className="ml-1 text-sm text-gray-500">en tu carrito</span>
            </div>
          ) : (
            <button
              onClick={() => onAdd(product)}
              className="w-full py-3 bg-[#4A5D23] text-white rounded-full font-bold hover:bg-[#6B8E23] transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Agregar al carrito
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
