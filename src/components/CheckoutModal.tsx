import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import { X, ChevronRight, ChevronLeft, User, MapPin } from 'lucide-react'
import CheckoutForm from './CheckoutForm'
import type { CartItem } from '../types'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

interface BuyerData {
  name: string
  email: string
  phone: string
  address: string
  city: string
  zip: string
}

interface BuyerErrors {
  name?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  zip?: string
}

interface Props {
  cart: CartItem[]
  total: number
  onClose: () => void
  onSuccess: (buyer: BuyerData) => void
}

function validateBuyer(data: BuyerData): BuyerErrors {
  const errors: BuyerErrors = {}
  if (!data.name.trim()) errors.name = 'El nombre es obligatorio'
  if (!data.email.trim()) errors.email = 'El correo es obligatorio'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Ingresa un correo válido'
  if (!data.phone.trim()) errors.phone = 'El teléfono es obligatorio'
  else if (!/^\d{10}$/.test(data.phone.replace(/\s|-/g, ''))) errors.phone = 'Ingresa 10 dígitos'
  if (!data.address.trim()) errors.address = 'La dirección es obligatoria'
  if (!data.city.trim()) errors.city = 'La ciudad es obligatoria'
  if (!data.zip.trim()) errors.zip = 'El código postal es obligatorio'
  else if (!/^\d{5}$/.test(data.zip)) errors.zip = 'Ingresa 5 dígitos'
  return errors
}

function inputClass(error?: string) {
  return `w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-colors ${
    error
      ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
      : 'border-gray-200 focus:border-[#4A5D23] focus:ring-[#4A5D23]/20'
  }`
}

export default function CheckoutModal({ cart, total, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<1 | 2>(1)
  const [buyer, setBuyer] = useState<BuyerData>({ name: '', email: '', phone: '', address: '', city: '', zip: '' })
  const [touched, setTouched] = useState<Partial<Record<keyof BuyerData, boolean>>>({})
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const errors = validateBuyer(buyer)

  function handleField(field: keyof BuyerData, value: string) {
    setBuyer(prev => ({ ...prev, [field]: value }))
  }

  function handleBlur(field: keyof BuyerData) {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  function handleNextStep(e: React.FormEvent) {
    e.preventDefault()
    setTouched({ name: true, email: true, phone: true, address: true, city: true, zip: true })
    if (Object.keys(errors).length > 0) return
    setStep(2)
  }

  useEffect(() => {
    if (step !== 2) return
    async function createIntent() {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/create-payment-intent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ amount: total }),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        setClientSecret(data.clientSecret)
      } catch {
        setFetchError('No se pudo iniciar el pago. Intenta de nuevo.')
      }
    }
    createIntent()
  }, [step, total])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl shadow-2xl overflow-hidden animate-fade-in max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button onClick={() => setStep(1)} aria-label="Volver" className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                <ChevronLeft className="w-5 h-5" aria-hidden="true" />
              </button>
            )}
            <h2 id="checkout-title" className="font-black text-gray-900">
              {step === 1 ? 'Datos de envío' : 'Pago con tarjeta'}
            </h2>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Indicador de pasos */}
        <div className="flex items-center px-6 py-3 bg-gray-50 border-b border-gray-100 gap-2">
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${step === 1 ? 'text-[#4A5D23]' : 'text-gray-400'}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${step === 1 ? 'bg-[#4A5D23] text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
            <User className="w-3.5 h-3.5" aria-hidden="true" />
            Datos
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300" aria-hidden="true" />
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${step === 2 ? 'text-[#4A5D23]' : 'text-gray-400'}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${step === 2 ? 'bg-[#4A5D23] text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
            Pago
          </div>
        </div>

        {/* Resumen del carrito */}
        <div className="px-6 py-3 border-b border-gray-50">
          <div className="space-y-1">
            {cart.map(item => (
              <div key={item.product.id} className="flex justify-between text-sm text-gray-600">
                <span>{item.product.name} × {item.quantity}</span>
                <span>${(item.product.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between font-black text-gray-900 mt-2 pt-2 border-t border-gray-100">
            <span>Total</span>
            <span className="text-[#4A5D23]">${total.toFixed(2)}</span>
          </div>
        </div>

        <div className="px-6 py-5">

          {/* Paso 1: Datos del comprador */}
          {step === 1 && (
            <form onSubmit={handleNextStep} noValidate className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4 text-[#4A5D23]" aria-hidden="true" />
                <p className="text-sm font-semibold text-gray-700">Información personal</p>
              </div>

              <div>
                <label htmlFor="buyer-name" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Nombre completo <span className="text-red-500">*</span>
                </label>
                <input
                  id="buyer-name"
                  type="text"
                  value={buyer.name}
                  onChange={e => handleField('name', e.target.value)}
                  onBlur={() => handleBlur('name')}
                  className={inputClass(touched.name ? errors.name : undefined)}
                  placeholder="Juan García López"
                />
                {touched.name && errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="buyer-email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Correo electrónico <span className="text-red-500">*</span>
                </label>
                <input
                  id="buyer-email"
                  type="email"
                  value={buyer.email}
                  onChange={e => handleField('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                  className={inputClass(touched.email ? errors.email : undefined)}
                  placeholder="correo@ejemplo.com"
                />
                {touched.email && errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="buyer-phone" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Teléfono <span className="text-red-500">*</span>
                </label>
                <input
                  id="buyer-phone"
                  type="tel"
                  value={buyer.phone}
                  onChange={e => handleField('phone', e.target.value)}
                  onBlur={() => handleBlur('phone')}
                  className={inputClass(touched.phone ? errors.phone : undefined)}
                  placeholder="8121234567"
                  maxLength={10}
                />
                {touched.phone && errors.phone && <p className="text-red-600 text-xs mt-1">{errors.phone}</p>}
              </div>

              <div className="flex items-center gap-2 pt-2 mb-1">
                <MapPin className="w-4 h-4 text-[#4A5D23]" aria-hidden="true" />
                <p className="text-sm font-semibold text-gray-700">Dirección de envío</p>
              </div>

              <div>
                <label htmlFor="buyer-address" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Calle y número <span className="text-red-500">*</span>
                </label>
                <input
                  id="buyer-address"
                  type="text"
                  value={buyer.address}
                  onChange={e => handleField('address', e.target.value)}
                  onBlur={() => handleBlur('address')}
                  className={inputClass(touched.address ? errors.address : undefined)}
                  placeholder="Av. Constitución 123, Col. Centro"
                />
                {touched.address && errors.address && <p className="text-red-600 text-xs mt-1">{errors.address}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="buyer-city" className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Ciudad <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="buyer-city"
                    type="text"
                    value={buyer.city}
                    onChange={e => handleField('city', e.target.value)}
                    onBlur={() => handleBlur('city')}
                    className={inputClass(touched.city ? errors.city : undefined)}
                    placeholder="Monterrey"
                  />
                  {touched.city && errors.city && <p className="text-red-600 text-xs mt-1">{errors.city}</p>}
                </div>
                <div>
                  <label htmlFor="buyer-zip" className="block text-sm font-semibold text-gray-700 mb-1.5">
                    C.P. <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="buyer-zip"
                    type="text"
                    value={buyer.zip}
                    onChange={e => handleField('zip', e.target.value)}
                    onBlur={() => handleBlur('zip')}
                    className={inputClass(touched.zip ? errors.zip : undefined)}
                    placeholder="64000"
                    maxLength={5}
                  />
                  {touched.zip && errors.zip && <p className="text-red-600 text-xs mt-1">{errors.zip}</p>}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#4A5D23] text-white rounded-full font-bold text-sm hover:bg-[#6B8E23] transition-colors flex items-center justify-center gap-2 mt-2"
              >
                Continuar al pago
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </form>
          )}

          {/* Paso 2: Pago con Stripe */}
          {step === 2 && (
            <>
              {/* Resumen de datos */}
              <div className="bg-gray-50 rounded-xl px-4 py-3 mb-5 text-sm text-gray-600 space-y-0.5">
                <p className="font-semibold text-gray-800">{buyer.name}</p>
                <p>{buyer.email} · {buyer.phone}</p>
                <p>{buyer.address}, {buyer.city} {buyer.zip}</p>
              </div>

              {fetchError && (
                <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
                  {fetchError}
                </div>
              )}

              {!clientSecret && !fetchError && (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-[#4A5D23] border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {clientSecret && (
                <Elements stripe={stripePromise} options={{ clientSecret, locale: 'es' }}>
                  <CheckoutForm
                    buyer={buyer}
                    cart={cart}
                    total={total}
                    onSuccess={() => onSuccess(buyer)}
                    onCancel={onClose}
                  />
                </Elements>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
