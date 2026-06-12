import { useEffect, useState } from 'react'
import { CheckCircle, MessageCircle, X } from 'lucide-react'
import type { CartItem } from '../types'

interface Props {
  cart: CartItem[]
  total: number
  onClose: () => void
}

export default function PaymentSuccessModal({ cart, total, onClose }: Props) {
  const [orderNumber] = useState(() => Math.floor(Math.random() * 90000) + 10000)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function contactWhatsApp() {
    const lines = cart.map(i => `• ${i.product.name} x${i.quantity}`)
    const message = `Hola LORCAM, acabo de realizar el pago de mi pedido #${orderNumber}:\n\n${lines.join('\n')}\n\nTotal pagado: $${total.toFixed(2)}`
    window.open(`https://wa.me/5218120278645?text=${encodeURIComponent(message)}`, '_blank')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="success-title">
      <div className="absolute inset-0 bg-black/50 animate-fade-in" aria-hidden="true" />
      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in">

        {/* Encabezado verde */}
        <div className="bg-[#4A5D23] px-6 py-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-9 h-9 text-white" aria-hidden="true" />
          </div>
          <h2 id="success-title" className="text-2xl font-black text-white mb-1">¡Pago exitoso!</h2>
          <p className="text-white/80 text-sm">Tu pedido ha sido procesado correctamente</p>
        </div>

        {/* Número de orden */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Número de pedido</p>
          <p className="text-2xl font-black text-gray-900">#{orderNumber}</p>
        </div>

        {/* Resumen de productos */}
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Resumen</p>
          <div className="space-y-2">
            {cart.map(item => (
              <div key={item.product.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.product.name} <span className="text-gray-400">×{item.quantity}</span></span>
                <span className="font-semibold text-gray-800">${(item.product.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between font-black text-gray-900 mt-3 pt-3 border-t border-gray-100">
            <span>Total pagado</span>
            <span className="text-[#4A5D23]">${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Acciones */}
        <div className="px-6 py-5 space-y-3">
          <p className="text-sm text-gray-500 text-center">
            Contáctanos por WhatsApp para coordinar tu envío
          </p>
          <button
            onClick={contactWhatsApp}
            className="w-full py-3 bg-[#4A5D23] text-white rounded-full font-bold flex items-center justify-center gap-2 hover:bg-[#6B8E23] transition-colors"
          >
            <MessageCircle className="w-5 h-5" aria-hidden="true" />
            Coordinar envío por WhatsApp
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 border border-gray-200 text-gray-700 rounded-full font-semibold text-sm hover:border-gray-300 transition-colors"
          >
            Seguir comprando
          </button>
        </div>

        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-3 right-3 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
        >
          <X className="w-4 h-4 text-white" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}