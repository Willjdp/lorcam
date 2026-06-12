import { useState } from 'react'
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { CartItem } from '../types'

interface BuyerData {
  name: string
  email: string
  phone: string
  address: string
  city: string
  zip: string
}

interface Props {
  buyer: BuyerData
  cart: CartItem[]
  total: number
  onSuccess: () => void
  onCancel: () => void
}

export default function CheckoutForm({ buyer, cart, total, onSuccess, onCancel }: Props) {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function saveOrder(stripePaymentId: string) {
    const items = cart.map(i => ({
      product_id: i.product.id,
      product_name: i.product.name,
      product_price: i.product.price,
      quantity: i.quantity,
    }))

    const { data: order } = await supabase.from('orders').insert({
      customer_name: buyer.name,
      customer_phone: buyer.phone,
      buyer_email: buyer.email,
      buyer_address: buyer.address,
      buyer_city: buyer.city,
      buyer_zip: buyer.zip,
      total,
      status: 'paid',
      stripe_payment_id: stripePaymentId,
      items,
    }).select().single()

    // Enviar emails de confirmación
    console.log('SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL)
    console.log('ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY?.slice(0, 20))
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-order-emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ order, buyer, cart, total }),
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    setError(null)

    const { error: submitError } = await elements.submit()
    if (submitError) {
      setError(submitError.message ?? 'Error al procesar el pago')
      setLoading(false)
      return
    }

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}?pago=exitoso`,
      },
      redirect: 'if_required',
    })

    if (confirmError) {
      setError(confirmError.message ?? 'Error al confirmar el pago')
      setLoading(false)
    } else {
      await saveOrder(paymentIntent?.id ?? '')
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement />

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={!stripe || loading}
          className="flex-1 py-3 bg-[#4A5D23] text-white rounded-full font-bold text-sm hover:bg-[#6B8E23] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          {loading ? 'Procesando...' : 'Pagar ahora'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-3 border border-gray-200 text-gray-700 rounded-full font-semibold text-sm hover:border-gray-300 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
