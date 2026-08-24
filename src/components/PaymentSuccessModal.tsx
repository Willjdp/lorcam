import { useEffect, useState } from 'react'
import { CheckCircle, MessageCircle, X, FileText, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { CartItem } from '../types'

interface InvoiceData {
  rfc: string
  businessName: string
  cfdiUse: string
  fiscalZip: string
  fiscalEmail: string
}

interface InvoiceErrors {
  rfc?: string
  businessName?: string
  fiscalZip?: string
  fiscalEmail?: string
}

const CFDI_USES = [
  { value: 'G03', label: 'Gastos en general' },
  { value: 'G01', label: 'Adquisición de mercancías' },
  { value: 'P01', label: 'Por definir' },
]

function validateInvoice(data: InvoiceData): InvoiceErrors {
  const errors: InvoiceErrors = {}
  if (!data.rfc.trim()) errors.rfc = 'El RFC es obligatorio'
  else if (!/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(data.rfc.trim().toUpperCase())) errors.rfc = 'Formato de RFC inválido'
  if (!data.businessName.trim()) errors.businessName = 'La razón social es obligatoria'
  if (!data.fiscalZip.trim()) errors.fiscalZip = 'El código postal es obligatorio'
  else if (!/^\d{5}$/.test(data.fiscalZip)) errors.fiscalZip = 'Ingresa 5 dígitos'
  if (!data.fiscalEmail.trim()) errors.fiscalEmail = 'El correo es obligatorio'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.fiscalEmail)) errors.fiscalEmail = 'Ingresa un correo válido'
  return errors
}

function inputClass(error?: string) {
  return `w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-colors ${
    error
      ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
      : 'border-gray-200 focus:border-[#4A5D23] focus:ring-[#4A5D23]/20'
  }`
}

interface Props {
  cart: CartItem[]
  total: number
  orderId: number | null
  buyerEmail?: string
  onClose: () => void
}

export default function PaymentSuccessModal({ cart, total, orderId, buyerEmail, onClose }: Props) {
  const [orderNumber] = useState(() => orderId ?? Math.floor(Math.random() * 90000) + 10000)

  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [invoiceRequested, setInvoiceRequested] = useState(false)
  const [invoice, setInvoice] = useState<InvoiceData>({
    rfc: '', businessName: '', cfdiUse: 'G03', fiscalZip: '', fiscalEmail: buyerEmail ?? '',
  })
  const [touched, setTouched] = useState<Partial<Record<keyof InvoiceData, boolean>>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const errors = validateInvoice(invoice)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function contactWhatsApp() {
    const lines = cart.map(i => `• ${i.product.name} x${i.quantity}`)
    const message = `Hola LORCAM, acabo de realizar el pago de mi pedido #${orderNumber}:\n\n${lines.join('\n')}\n\nTotal pagado: $${total.toFixed(2)}`
    window.open(`https://wa.me/5218120278645?text=${encodeURIComponent(message)}`, '_blank')
  }

  function handleField(field: keyof InvoiceData, value: string) {
    setInvoice(prev => ({ ...prev, [field]: value }))
  }

  function handleBlur(field: keyof InvoiceData) {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  async function handleSubmitInvoice(e: React.FormEvent) {
    e.preventDefault()
    setTouched({ rfc: true, businessName: true, fiscalZip: true, fiscalEmail: true })
    if (Object.keys(errors).length > 0) return

    setSaving(true)
    setSaveError(null)
    try {
      const { error } = await supabase.from('invoices').insert({
        order_id: orderId,
        rfc: invoice.rfc.trim().toUpperCase(),
        business_name: invoice.businessName.trim(),
        cfdi_use: invoice.cfdiUse,
        fiscal_zip: invoice.fiscalZip.trim(),
        fiscal_email: invoice.fiscalEmail.trim(),
        status: 'pending',
      })
      if (error) throw error
      setInvoiceRequested(true)
    } catch {
      setSaveError('No se pudo enviar tu solicitud. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="success-title">
      <div className="absolute inset-0 bg-black/50 animate-fade-in" aria-hidden="true" />
      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in max-h-[92vh] overflow-y-auto">

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

        {/* ── Solicitar factura ── */}
        <div className="border-b border-gray-100">
          {!invoiceRequested ? (
            <>
              <button
                onClick={() => setShowInvoiceForm(s => !s)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                aria-expanded={showInvoiceForm}
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <FileText className="w-4 h-4 text-[#4A5D23]" aria-hidden="true" />
                  ¿Necesitas factura?
                </span>
                {showInvoiceForm ? <ChevronUp className="w-4 h-4 text-gray-400" aria-hidden="true" /> : <ChevronDown className="w-4 h-4 text-gray-400" aria-hidden="true" />}
              </button>

              {showInvoiceForm && (
                <form onSubmit={handleSubmitInvoice} noValidate className="px-6 pb-5 space-y-3">
                  {saveError && (
                    <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                      {saveError}
                    </div>
                  )}

                  <div>
                    <label htmlFor="inv-rfc" className="block text-xs font-semibold text-gray-700 mb-1">RFC <span className="text-red-500">*</span></label>
                    <input
                      id="inv-rfc"
                      type="text"
                      value={invoice.rfc}
                      onChange={e => handleField('rfc', e.target.value.toUpperCase())}
                      onBlur={() => handleBlur('rfc')}
                      maxLength={13}
                      className={`${inputClass(touched.rfc ? errors.rfc : undefined)} font-mono uppercase`}
                      placeholder="XAXX010101000"
                    />
                    {touched.rfc && errors.rfc && <p className="text-red-600 text-xs mt-1">{errors.rfc}</p>}
                  </div>

                  <div>
                    <label htmlFor="inv-name" className="block text-xs font-semibold text-gray-700 mb-1">Razón social <span className="text-red-500">*</span></label>
                    <input
                      id="inv-name"
                      type="text"
                      value={invoice.businessName}
                      onChange={e => handleField('businessName', e.target.value)}
                      onBlur={() => handleBlur('businessName')}
                      className={inputClass(touched.businessName ? errors.businessName : undefined)}
                      placeholder="Nombre o razón social"
                    />
                    {touched.businessName && errors.businessName && <p className="text-red-600 text-xs mt-1">{errors.businessName}</p>}
                  </div>

                  <div>
                    <label htmlFor="inv-cfdi" className="block text-xs font-semibold text-gray-700 mb-1">Uso de CFDI</label>
                    <select
                      id="inv-cfdi"
                      value={invoice.cfdiUse}
                      onChange={e => handleField('cfdiUse', e.target.value)}
                      className={inputClass()}
                    >
                      {CFDI_USES.map(u => <option key={u.value} value={u.value}>{u.value} — {u.label}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="inv-zip" className="block text-xs font-semibold text-gray-700 mb-1">C.P. fiscal <span className="text-red-500">*</span></label>
                      <input
                        id="inv-zip"
                        type="text"
                        value={invoice.fiscalZip}
                        onChange={e => handleField('fiscalZip', e.target.value)}
                        onBlur={() => handleBlur('fiscalZip')}
                        maxLength={5}
                        className={inputClass(touched.fiscalZip ? errors.fiscalZip : undefined)}
                        placeholder="64000"
                      />
                      {touched.fiscalZip && errors.fiscalZip && <p className="text-red-600 text-xs mt-1">{errors.fiscalZip}</p>}
                    </div>
                    <div>
                      <label htmlFor="inv-email" className="block text-xs font-semibold text-gray-700 mb-1">Correo <span className="text-red-500">*</span></label>
                      <input
                        id="inv-email"
                        type="email"
                        value={invoice.fiscalEmail}
                        onChange={e => handleField('fiscalEmail', e.target.value)}
                        onBlur={() => handleBlur('fiscalEmail')}
                        className={inputClass(touched.fiscalEmail ? errors.fiscalEmail : undefined)}
                        placeholder="correo@ejemplo.com"
                      />
                      {touched.fiscalEmail && errors.fiscalEmail && <p className="text-red-600 text-xs mt-1">{errors.fiscalEmail}</p>}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-2.5 bg-[#4A5D23] text-white rounded-full font-bold text-sm hover:bg-[#6B8E23] disabled:opacity-60 transition-colors"
                  >
                    {saving ? 'Enviando...' : 'Solicitar factura'}
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="px-6 py-4 flex items-center gap-2 text-sm text-green-700 bg-green-50">
              <CheckCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              Solicitud de factura recibida. Te la enviaremos a tu correo.
            </div>
          )}
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
