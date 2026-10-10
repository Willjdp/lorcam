import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, LogOut, AlertTriangle, RotateCcw, X, Tag, ShoppingBag, ChevronDown, ChevronUp, FileText, CheckCircle, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Product, Category } from '../types'
import ProductForm from '../components/admin/ProductForm'

interface Order {
  id: number
  created_at: string
  customer_name: string
  customer_phone: string
  buyer_email: string
  buyer_address: string
  buyer_city: string
  buyer_zip: string
  total: number
  status: string
  stripe_payment_id: string
  items: { product_name: string; product_price: number; quantity: number }[]
}

interface Invoice {
  id: number
  created_at: string
  order_id: number
  rfc: string
  business_name: string
  cfdi_use: string
  payment_method: string
  fiscal_zip: string
  fiscal_email: string
  status: string
}

// ── Diálogo de confirmación de borrado de producto ────────────────────────────
function ConfirmDialog({ product, onConfirm, onCancel, loading }: {
  product: Product
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onCancel} aria-hidden="true" />
      <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm animate-fade-in">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" aria-hidden="true" />
          </div>
          <div>
            <h2 id="confirm-title" className="font-black text-gray-900 leading-snug">¿Eliminar producto?</h2>
            <p className="text-sm text-gray-600 mt-1">
              Se eliminará <strong>"{product.name}"</strong> de forma permanente. Esta acción no se puede deshacer.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onConfirm} disabled={loading} className="flex-1 py-2.5 bg-red-600 text-white rounded-full font-bold text-sm hover:bg-red-700 disabled:opacity-60 transition-colors">
            {loading ? 'Eliminando...' : 'Eliminar'}
          </button>
          <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-full font-semibold text-sm hover:border-gray-300 transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Diálogo de confirmación de borrado de categoría ───────────────────────────
function ConfirmCategoryDialog({ category, onConfirm, onCancel, loading }: {
  category: Category
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-cat-title">
      <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onCancel} aria-hidden="true" />
      <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm animate-fade-in">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" aria-hidden="true" />
          </div>
          <div>
            <h2 id="confirm-cat-title" className="font-black text-gray-900 leading-snug">¿Eliminar categoría?</h2>
            <p className="text-sm text-gray-600 mt-1">
              Se eliminará <strong>"{category.name}"</strong>. Los productos asignados quedarán sin categoría.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onConfirm} disabled={loading} className="flex-1 py-2.5 bg-red-600 text-white rounded-full font-bold text-sm hover:bg-red-700 disabled:opacity-60 transition-colors">
            {loading ? 'Eliminando...' : 'Eliminar'}
          </button>
          <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-full font-semibold text-sm hover:border-gray-300 transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal de categoría (crear / editar) ───────────────────────────────────────
function CategoryModal({ category, onSave, onCancel }: {
  category?: Category
  onSave: (name: string, slug: string) => Promise<string | null>
  onCancel: () => void
}) {
  const [name, setName] = useState(category?.name ?? '')
  const [slug, setSlug] = useState(category?.slug ?? '')
  const [slugManual, setSlugManual] = useState(!!category?.slug)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function toSlug(val: string) {
    return val.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  function handleNameChange(val: string) {
    setName(val)
    if (!slugManual) setSlug(toSlug(val))
  }

  function handleSlugChange(val: string) {
    setSlugManual(true)
    setSlug(toSlug(val))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('El nombre es obligatorio'); return }
    if (!slug.trim()) { setError('El slug es obligatorio'); return }
    setSaving(true)
    setError(null)
    const err = await onSave(name.trim(), slug.trim())
    if (err) { setError(err); setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="cat-modal-title">
      <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onCancel} aria-hidden="true" />
      <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm animate-fade-in">
        <div className="flex items-center justify-between mb-5">
          <h2 id="cat-modal-title" className="font-black text-gray-900">
            {category ? 'Editar categoría' : 'Nueva categoría'}
          </h2>
          <button onClick={onCancel} aria-label="Cerrar" className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {error && (
            <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="cat-name" className="block text-sm font-semibold text-gray-700 mb-1.5">
              Nombre <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="cat-name"
              type="text"
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              maxLength={60}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#4A5D23] focus:ring-2 focus:ring-[#4A5D23]/20 transition-colors"
              placeholder="Ej. Sustratos"
            />
          </div>

          <div>
            <label htmlFor="cat-slug" className="block text-sm font-semibold text-gray-700 mb-1.5">
              Slug <span className="text-gray-400 font-normal">(URL amigable)</span>
            </label>
            <input
              id="cat-slug"
              type="text"
              value={slug}
              onChange={e => handleSlugChange(e.target.value)}
              maxLength={60}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#4A5D23] focus:ring-2 focus:ring-[#4A5D23]/20 transition-colors font-mono"
              placeholder="ej. sustratos"
            />
            <p className="text-gray-400 text-xs mt-1">Se genera automáticamente desde el nombre</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-[#4A5D23] text-white rounded-full font-bold text-sm hover:bg-[#6B8E23] disabled:opacity-60 transition-colors"
            >
              {saving ? 'Guardando...' : category ? 'Guardar cambios' : 'Crear categoría'}
            </button>
            <button type="button" onClick={onCancel} className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-full font-semibold text-sm hover:border-gray-300 transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── AdminPage ─────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [formMode, setFormMode] = useState<'hidden' | 'new' | 'edit'>('hidden')
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // ── Estado de categorías
  const [categoryModal, setCategoryModal] = useState<'hidden' | 'new' | 'edit'>('hidden')
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [deleteCatLoading, setDeleteCatLoading] = useState(false)

  // ── Estado de órdenes
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null)

  // ── Estado de facturas
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    setFetchError(null)
    try {
      const [{ data: prods, error: e1 }, { data: cats, error: e2 }] = await Promise.all([
        supabase.from('products').select('*').order('id'),
        supabase.from('categories').select('*').order('name'),
      ])
      if (e1) throw new Error(e1.message)
      if (e2) throw new Error(e2.message)
      setProducts((prods ?? []) as Product[])
      setCategories((cats ?? []) as Category[])
    } catch {
      setFetchError('No se pudieron cargar los datos. Verifica tu conexión e intenta de nuevo.')
    } finally {
      setLoading(false)
    }
    // Cargar órdenes por separado
    setOrdersLoading(true)
    const { data: ords } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
    setOrders((ords ?? []) as Order[])
    setOrdersLoading(false)

    // Cargar facturas
    setInvoicesLoading(true)
    const { data: invs } = await supabase.from('invoices').select('*').order('created_at', { ascending: false })
    setInvoices((invs ?? []) as Invoice[])
    setInvoicesLoading(false)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function openNew() {
    setEditingProduct(null)
    setFormMode('new')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openEdit(product: Product) {
    setEditingProduct(product)
    setFormMode('edit')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function closeForm() {
    setFormMode('hidden')
    setEditingProduct(null)
  }

  async function handleSave(data: Product | Omit<Product, 'id'>): Promise<string | null> {
    try {
      if ('id' in data) {
        const { error } = await supabase.from('products').update(data).eq('id', data.id)
        if (error) throw error
        setProducts(prev => prev.map(p => p.id === (data as Product).id ? data as Product : p))
        showToast('Producto actualizado correctamente')
      } else {
        const { data: inserted, error } = await supabase.from('products').insert(data).select().single()
        if (error) throw error
        setProducts(prev => [...prev, inserted as Product])
        showToast('Producto creado correctamente')
      }
      closeForm()
      return null
    } catch {
      return 'Error al guardar. Verifica los datos e intenta de nuevo.'
    }
  }

  async function handleDelete() {
    if (!deletingProduct) return
    setDeleteLoading(true)
    try {
      const { error } = await supabase.from('products').delete().eq('id', deletingProduct.id)
      if (error) throw error
      setProducts(prev => prev.filter(p => p.id !== deletingProduct.id))
      showToast('Producto eliminado')
      setDeletingProduct(null)
    } catch {
      showToast('Error al eliminar. Intenta de nuevo.')
    } finally {
      setDeleteLoading(false)
    }
  }

  async function toggleActive(product: Product) {
    const updated = { ...product, active: !product.active }
    const { error } = await supabase.from('products').update({ active: updated.active }).eq('id', product.id)
    if (error) { showToast('Error al actualizar el estado del producto'); return }
    setProducts(prev => prev.map(p => p.id === product.id ? updated : p))
  }

  async function handleSignOut() {
    await signOut()
    navigate('/admin/login')
  }

  const categoryName = useCallback(
    (id: number) => categories.find(c => c.id === id)?.name ?? '—',
    [categories]
  )

  // ── Handlers de categorías
  async function handleSaveCategory(name: string, slug: string): Promise<string | null> {
    try {
      if (editingCategory) {
        const { error } = await supabase.from('categories').update({ name, slug }).eq('id', editingCategory.id)
        if (error) throw error
        setCategories(prev => prev.map(c => c.id === editingCategory.id ? { ...c, name, slug } : c))
        showToast('Categoría actualizada')
      } else {
        const { data, error } = await supabase.from('categories').insert({ name, slug }).select().single()
        if (error) throw error
        setCategories(prev => [...prev, data as Category].sort((a, b) => a.name.localeCompare(b.name)))
        showToast('Categoría creada')
      }
      setCategoryModal('hidden')
      setEditingCategory(null)
      return null
    } catch {
      return 'Error al guardar. El nombre o slug puede estar duplicado.'
    }
  }

  async function handleDeleteCategory() {
    if (!deletingCategory) return
    setDeleteCatLoading(true)
    try {
      const { error } = await supabase.from('categories').delete().eq('id', deletingCategory.id)
      if (error) throw error
      setCategories(prev => prev.filter(c => c.id !== deletingCategory.id))
      showToast('Categoría eliminada')
      setDeletingCategory(null)
    } catch {
      showToast('Error al eliminar. Intenta de nuevo.')
    } finally {
      setDeleteCatLoading(false)
    }
  }

  async function toggleInvoiceStatus(invoice: Invoice) {
    const newStatus = invoice.status === 'pending' ? 'issued' : 'pending'
    const { error } = await supabase.from('invoices').update({ status: newStatus }).eq('id', invoice.id)
    if (error) { showToast('Error al actualizar el estado'); return }
    setInvoices(prev => prev.map(i => i.id === invoice.id ? { ...i, status: newStatus } : i))
    showToast(newStatus === 'issued' ? 'Factura marcada como emitida' : 'Factura marcada como pendiente')
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/Logo.jpeg" alt="LORCAM" className="w-8 h-8 rounded-full object-cover" />
            <div className="leading-none">
              <p className="text-sm font-black text-[#4A5D23]">LORCAM</p>
              <p className="text-xs text-gray-500 mt-0.5">Panel de administración</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-xs text-gray-500 truncate max-w-[200px]">{user?.email}</span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-red-600 transition-colors"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline font-medium">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Formulario de producto (visible al crear/editar) */}
        {formMode !== 'hidden' && (
          <ProductForm
            product={editingProduct ?? undefined}
            categories={categories}
            onSave={handleSave}
            onCancel={closeForm}
          />
        )}

        {/* ── Tabla de productos ── */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h1 className="font-black text-gray-900 text-lg">Productos</h1>
            <button
              onClick={openNew}
              disabled={formMode !== 'hidden'}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#4A5D23] text-white rounded-full text-sm font-semibold hover:bg-[#6B8E23] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Nuevo producto
            </button>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-[#4A5D23] border-t-transparent rounded-full animate-spin" aria-label="Cargando productos" />
            </div>
          )}

          {fetchError && !loading && (
            <div className="flex flex-col items-center py-20 gap-3 text-center px-6">
              <p className="text-gray-700 text-sm">{fetchError}</p>
              <button
                onClick={loadData}
                className="flex items-center gap-1.5 px-5 py-2 bg-[#4A5D23] text-white rounded-full text-sm font-semibold hover:bg-[#6B8E23] transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                Reintentar
              </button>
            </div>
          )}

          {!loading && !fetchError && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="px-6 py-3">Producto</th>
                    <th className="px-6 py-3 hidden md:table-cell">Categoría</th>
                    <th className="px-6 py-3">Precio</th>
                    <th className="px-6 py-3 hidden sm:table-cell">Unidad</th>
                    <th className="px-6 py-3">Estado</th>
                    <th className="px-6 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-gray-500 text-sm">
                        No hay productos. Agrega el primero con el botón "Nuevo producto".
                      </td>
                    </tr>
                  ) : products.map(p => (
                    <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.image_url}
                            alt=""
                            aria-hidden="true"
                            className="w-9 h-9 rounded-lg object-cover bg-gray-100 shrink-0"
                            onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }}
                          />
                          <span className="font-semibold text-gray-800 truncate max-w-[160px]" title={p.name}>
                            {p.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3 hidden md:table-cell text-gray-600">{categoryName(p.category_id)}</td>
                      <td className="px-6 py-3 font-semibold text-[#4A5D23]">${p.price.toFixed(2)}</td>
                      <td className="px-6 py-3 hidden sm:table-cell text-gray-600">{p.unit}</td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => toggleActive(p)}
                          role="switch"
                          aria-checked={p.active}
                          aria-label={p.active ? `Desactivar ${p.name}` : `Activar ${p.name}`}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${p.active ? 'bg-[#4A5D23]' : 'bg-gray-200'}`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${p.active ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                        </button>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => openEdit(p)}
                            aria-label={`Editar ${p.name}`}
                            className="p-2 text-gray-400 hover:text-[#4A5D23] transition-colors rounded-lg hover:bg-gray-100"
                          >
                            <Pencil className="w-4 h-4" aria-hidden="true" />
                          </button>
                          <button
                            onClick={() => setDeletingProduct(p)}
                            aria-label={`Eliminar ${p.name}`}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Tabla de categorías ── */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#4A5D23]" aria-hidden="true" />
              <h2 className="font-black text-gray-900 text-lg">Categorías</h2>
            </div>
            <button
              onClick={() => { setEditingCategory(null); setCategoryModal('new') }}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#4A5D23] text-white rounded-full text-sm font-semibold hover:bg-[#6B8E23] transition-colors"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Nueva categoría
            </button>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-[#4A5D23] border-t-transparent rounded-full animate-spin" aria-label="Cargando categorías" />
            </div>
          )}

          {!loading && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="px-6 py-3">Nombre</th>
                    <th className="px-6 py-3 hidden sm:table-cell">Slug</th>
                    <th className="px-6 py-3 hidden md:table-cell">Productos</th>
                    <th className="px-6 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-500 text-sm">
                        No hay categorías. Agrega la primera con el botón "Nueva categoría".
                      </td>
                    </tr>
                  ) : categories.map(c => (
                    <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 font-semibold text-gray-800">{c.name}</td>
                      <td className="px-6 py-3 hidden sm:table-cell">
                        <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">{c.slug}</span>
                      </td>
                      <td className="px-6 py-3 hidden md:table-cell text-gray-500">
                        {products.filter(p => p.category_id === c.id).length} producto(s)
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => { setEditingCategory(c); setCategoryModal('edit') }}
                            aria-label={`Editar categoría ${c.name}`}
                            className="p-2 text-gray-400 hover:text-[#4A5D23] transition-colors rounded-lg hover:bg-gray-100"
                          >
                            <Pencil className="w-4 h-4" aria-hidden="true" />
                          </button>
                          <button
                            onClick={() => setDeletingCategory(c)}
                            aria-label={`Eliminar categoría ${c.name}`}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Tabla de órdenes ── */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#4A5D23]" aria-hidden="true" />
              <h2 className="font-black text-gray-900 text-lg">Órdenes</h2>
              {orders.length > 0 && (
                <span className="text-xs bg-[#4A5D23]/10 text-[#4A5D23] font-semibold px-2 py-0.5 rounded-full">
                  {orders.length}
                </span>
              )}
            </div>
          </div>

          {ordersLoading && (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-[#4A5D23] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!ordersLoading && orders.length === 0 && (
            <div className="px-6 py-12 text-center text-gray-500 text-sm">
              No hay órdenes todavía.
            </div>
          )}

          {!ordersLoading && orders.length > 0 && (
            <div className="divide-y divide-gray-50">
              {orders.map(order => (
                <div key={order.id} className="px-6 py-4">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-400">#{order.id}</span>
                          <p className="font-semibold text-gray-900 text-sm">{order.customer_name}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{order.buyer_email} · {order.customer_phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="font-black text-[#4A5D23] text-sm">${Number(order.total).toFixed(2)}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(order.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <span className="text-xs bg-green-100 text-green-700 font-semibold px-2.5 py-1 rounded-full">
                        {order.status === 'paid' ? 'Pagado' : order.status}
                      </span>
                      {expandedOrder === order.id
                        ? <ChevronUp className="w-4 h-4 text-gray-400" aria-hidden="true" />
                        : <ChevronDown className="w-4 h-4 text-gray-400" aria-hidden="true" />
                      }
                    </div>
                  </div>

                  {expandedOrder === order.id && (
                    <div className="mt-4 pt-4 border-t border-gray-100 grid sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Productos</p>
                        <div className="space-y-1.5">
                          {(order.items ?? []).map((item, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-gray-600">{item.product_name} <span className="text-gray-400">×{item.quantity}</span></span>
                              <span className="font-semibold text-gray-800">${(item.product_price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                          <div className="flex justify-between text-sm font-black text-gray-900 pt-1.5 border-t border-gray-100">
                            <span>Total</span>
                            <span className="text-[#4A5D23]">${Number(order.total).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Envío</p>
                        <p className="text-sm text-gray-600">{order.buyer_address}</p>
                        <p className="text-sm text-gray-600">{order.buyer_city}, C.P. {order.buyer_zip}</p>
                        {order.stripe_payment_id && (
                          <p className="text-xs text-gray-400 mt-2 font-mono truncate">ID: {order.stripe_payment_id}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Tabla de facturas ── */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#4A5D23]" aria-hidden="true" />
              <h2 className="font-black text-gray-900 text-lg">Solicitudes de factura</h2>
              {invoices.length > 0 && (
                <span className="text-xs bg-[#4A5D23]/10 text-[#4A5D23] font-semibold px-2 py-0.5 rounded-full">
                  {invoices.length}
                </span>
              )}
            </div>
          </div>

          {invoicesLoading && (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-[#4A5D23] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!invoicesLoading && invoices.length === 0 && (
            <div className="px-6 py-12 text-center text-gray-500 text-sm">
              No hay solicitudes de factura todavía.
            </div>
          )}

          {!invoicesLoading && invoices.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="px-6 py-3">RFC / Razón social</th>
                    <th className="px-6 py-3 hidden md:table-cell">Orden</th>
                    <th className="px-6 py-3 hidden sm:table-cell">Uso CFDI</th>
                    <th className="px-6 py-3 hidden lg:table-cell">Correo fiscal</th>
                    <th className="px-6 py-3 hidden lg:table-cell">C.P.</th>
                    <th className="px-6 py-3 hidden xl:table-cell">Forma de pago</th>
                    <th className="px-6 py-3">Estado</th>
                    <th className="px-6 py-3 hidden md:table-cell">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3">
                        <p className="font-semibold text-gray-800 font-mono text-xs">{inv.rfc}</p>
                        <p className="text-gray-500 text-xs mt-0.5 truncate max-w-[160px]">{inv.business_name}</p>
                      </td>
                      <td className="px-6 py-3 hidden md:table-cell text-gray-600">#{inv.order_id}</td>
                      <td className="px-6 py-3 hidden sm:table-cell">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg font-mono">{inv.cfdi_use}</span>
                      </td>
                      <td className="px-6 py-3 hidden lg:table-cell text-gray-600 text-xs">{inv.fiscal_email}</td>
                      <td className="px-6 py-3 hidden lg:table-cell text-gray-600">{inv.fiscal_zip}</td>
                      <td className="px-6 py-3 hidden xl:table-cell">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg font-mono">{inv.payment_method ?? '—'}</span>
                      </td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => toggleInvoiceStatus(inv)}
                          className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
                            inv.status === 'issued'
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                          }`}
                        >
                          {inv.status === 'issued'
                            ? <><CheckCircle className="w-3 h-3" aria-hidden="true" /> Emitida</>
                            : <><Clock className="w-3 h-3" aria-hidden="true" /> Pendiente</>
                          }
                        </button>
                      </td>
                      <td className="px-6 py-3 hidden md:table-cell text-gray-400 text-xs">
                        {new Date(inv.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>

      {/* Confirmar eliminación de producto */}
      {deletingProduct && (
        <ConfirmDialog
          product={deletingProduct}
          onConfirm={handleDelete}
          onCancel={() => setDeletingProduct(null)}
          loading={deleteLoading}
        />
      )}

      {/* Modal de categoría */}
      {categoryModal !== 'hidden' && (
        <CategoryModal
          category={editingCategory ?? undefined}
          onSave={handleSaveCategory}
          onCancel={() => { setCategoryModal('hidden'); setEditingCategory(null) }}
        />
      )}

      {/* Confirmar eliminación de categoría */}
      {deletingCategory && (
        <ConfirmCategoryDialog
          category={deletingCategory}
          onConfirm={handleDeleteCategory}
          onCancel={() => setDeletingCategory(null)}
          loading={deleteCatLoading}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-full shadow-lg animate-fade-in whitespace-nowrap"
        >
          {toast}
        </div>
      )}
    </div>
  )
}
