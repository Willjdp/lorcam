import { useState } from 'react'
import { X } from 'lucide-react'
import type { Product, Category } from '../../types'

interface FormData {
  name: string
  description: string
  price: string
  image_url: string
  category_id: string
  unit: string
  active: boolean
}

interface FormErrors {
  name?: string
  price?: string
  image_url?: string
  category_id?: string
  unit?: string
}

function validate(data: FormData): FormErrors {
  const errors: FormErrors = {}
  if (!data.name.trim()) errors.name = 'El nombre es obligatorio'
  else if (data.name.trim().length > 100) errors.name = 'Máximo 100 caracteres'
  const price = parseFloat(data.price)
  if (!data.price.trim()) errors.price = 'El precio es obligatorio'
  else if (isNaN(price) || price <= 0) errors.price = 'Ingresa un precio mayor a $0'
  else if (price > 999_999) errors.price = 'El precio no puede superar $999,999'
  if (!data.image_url.trim()) {
    errors.image_url = 'La URL de imagen es obligatoria'
  } else {
    try {
      const { protocol } = new URL(data.image_url)
      if (protocol !== 'http:' && protocol !== 'https:') errors.image_url = 'Debe ser una URL http o https'
    } catch {
      errors.image_url = 'Ingresa una URL válida'
    }
  }
  if (!data.category_id) errors.category_id = 'Selecciona una categoría'
  if (!data.unit.trim()) errors.unit = 'La unidad es obligatoria'
  else if (data.unit.trim().length > 50) errors.unit = 'Máximo 50 caracteres'
  return errors
}

interface Props {
  product?: Product
  categories: Category[]
  onSave: (data: Product | Omit<Product, 'id'>) => Promise<string | null>
  onCancel: () => void
}

export default function ProductForm({ product, categories, onSave, onCancel }: Props) {
  const isEditing = !!product

  const [form, setForm] = useState<FormData>({
    name: product?.name ?? '',
    description: product?.description ?? '',
    price: product?.price.toString() ?? '',
    image_url: product?.image_url ?? '',
    category_id: product?.category_id.toString() ?? '',
    unit: product?.unit ?? '',
    active: product?.active ?? true,
  })

  const [touched, setTouched] = useState<Partial<Record<keyof FormData, boolean>>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const errors = validate(form)

  function set(field: keyof FormData, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function blur(field: keyof FormData) {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  function inputClass(field: keyof FormErrors) {
    return `w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-colors ${
      touched[field] && errors[field]
        ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
        : 'border-gray-200 focus:border-[#4A5D23] focus:ring-[#4A5D23]/20'
    }`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched({ name: true, price: true, image_url: true, category_id: true, unit: true })
    if (Object.keys(errors).length > 0) return
    setSaving(true)
    setServerError(null)
    const payload = {
      ...(isEditing ? { id: product.id } : {}),
      name: form.name.trim(),
      description: form.description.trim(),
      price: Math.round(parseFloat(form.price) * 100) / 100,
      image_url: form.image_url.trim(),
      category_id: parseInt(form.category_id),
      unit: form.unit.trim(),
      active: form.active,
    }
    const error = await onSave(payload as Product)
    if (error) {
      setServerError(error)
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-black text-gray-900">
          {isEditing ? 'Editar producto' : 'Nuevo producto'}
        </h2>
        <button
          onClick={onCancel}
          aria-label="Cancelar"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {serverError && (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            {serverError}
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">

          {/* Nombre */}
          <div className="sm:col-span-2">
            <label htmlFor="pf-name" className="block text-sm font-semibold text-gray-700 mb-1.5">
              Nombre <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="pf-name"
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              onBlur={() => blur('name')}
              aria-invalid={touched.name && !!errors.name}
              aria-describedby={touched.name && errors.name ? 'pf-name-error' : undefined}
              maxLength={100}
              className={inputClass('name')}
              placeholder="Lombriz Roja Californiana 1 kg"
            />
            {touched.name && errors.name && (
              <p id="pf-name-error" role="alert" className="text-red-600 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          {/* Precio */}
          <div>
            <label htmlFor="pf-price" className="block text-sm font-semibold text-gray-700 mb-1.5">
              Precio (MXN) <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="pf-price"
              type="number"
              min="0.01"
              step="0.01"
              value={form.price}
              onChange={e => set('price', e.target.value)}
              onBlur={() => blur('price')}
              aria-invalid={touched.price && !!errors.price}
              aria-describedby={touched.price && errors.price ? 'pf-price-error' : undefined}
              className={inputClass('price')}
              placeholder="250.00"
            />
            {touched.price && errors.price && (
              <p id="pf-price-error" role="alert" className="text-red-600 text-xs mt-1">{errors.price}</p>
            )}
          </div>

          {/* Unidad */}
          <div>
            <label htmlFor="pf-unit" className="block text-sm font-semibold text-gray-700 mb-1.5">
              Unidad <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="pf-unit"
              type="text"
              value={form.unit}
              onChange={e => set('unit', e.target.value)}
              onBlur={() => blur('unit')}
              aria-invalid={touched.unit && !!errors.unit}
              aria-describedby={touched.unit && errors.unit ? 'pf-unit-error' : undefined}
              maxLength={50}
              className={inputClass('unit')}
              placeholder="1 kg · 500 g · Paquete"
            />
            {touched.unit && errors.unit && (
              <p id="pf-unit-error" role="alert" className="text-red-600 text-xs mt-1">{errors.unit}</p>
            )}
          </div>

          {/* Categoría */}
          <div>
            <label htmlFor="pf-category" className="block text-sm font-semibold text-gray-700 mb-1.5">
              Categoría <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <select
              id="pf-category"
              value={form.category_id}
              onChange={e => set('category_id', e.target.value)}
              onBlur={() => blur('category_id')}
              aria-invalid={touched.category_id && !!errors.category_id}
              aria-describedby={touched.category_id && errors.category_id ? 'pf-category-error' : undefined}
              className={inputClass('category_id')}
            >
              <option value="">Selecciona una categoría</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {touched.category_id && errors.category_id && (
              <p id="pf-category-error" role="alert" className="text-red-600 text-xs mt-1">{errors.category_id}</p>
            )}
          </div>

          {/* Toggle activo */}
          <div className="flex items-center gap-3 pt-6">
            <button
              type="button"
              role="switch"
              aria-checked={form.active}
              aria-label={form.active ? 'Producto activo' : 'Producto inactivo'}
              onClick={() => set('active', !form.active)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.active ? 'bg-[#4A5D23]' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.active ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm text-gray-700">
              {form.active ? 'Visible en tienda' : 'Oculto en tienda'}
            </span>
          </div>

          {/* URL imagen */}
          <div className="sm:col-span-2">
            <label htmlFor="pf-image" className="block text-sm font-semibold text-gray-700 mb-1.5">
              URL de imagen <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="pf-image"
              type="url"
              value={form.image_url}
              onChange={e => set('image_url', e.target.value)}
              onBlur={() => blur('image_url')}
              aria-invalid={touched.image_url && !!errors.image_url}
              aria-describedby={touched.image_url && errors.image_url ? 'pf-image-error' : undefined}
              className={inputClass('image_url')}
              placeholder="https://..."
            />
            {touched.image_url && errors.image_url && (
              <p id="pf-image-error" role="alert" className="text-red-600 text-xs mt-1">{errors.image_url}</p>
            )}
          </div>

          {/* Descripción */}
          <div className="sm:col-span-2">
            <label htmlFor="pf-desc" className="block text-sm font-semibold text-gray-700 mb-1.5">
              Descripción <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              id="pf-desc"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#4A5D23] focus:ring-2 focus:ring-[#4A5D23]/20 transition-colors resize-none"
              placeholder="Descripción del producto..."
            />
            <p className="text-gray-400 text-xs mt-1 text-right" aria-live="polite">
              {form.description.length}/500
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 bg-[#4A5D23] text-white rounded-full font-bold text-sm hover:bg-[#6B8E23] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear producto'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 border border-gray-200 text-gray-700 rounded-full font-semibold text-sm hover:border-gray-300 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
