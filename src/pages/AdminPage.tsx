import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, LogOut, AlertTriangle, RotateCcw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Product, Category } from '../types'
import ProductForm from '../components/admin/ProductForm'

// ── Diálogo de confirmación de borrado ────────────────────────────────────────
function ConfirmDialog({ product, onConfirm, onCancel, loading }: {
  product: Product
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
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
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-full font-bold text-sm hover:bg-red-700 disabled:opacity-60 transition-colors"
          >
            {loading ? 'Eliminando...' : 'Eliminar'}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-full font-semibold text-sm hover:border-gray-300 transition-colors"
          >
            Cancelar
          </button>
        </div>
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

        {/* Formulario (visible al crear/editar) */}
        {formMode !== 'hidden' && (
          <ProductForm
            product={editingProduct ?? undefined}
            categories={categories}
            onSave={handleSave}
            onCancel={closeForm}
          />
        )}

        {/* Tabla de productos */}
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

          {/* Cargando */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-[#4A5D23] border-t-transparent rounded-full animate-spin" aria-label="Cargando productos" />
            </div>
          )}

          {/* Error */}
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

          {/* Tabla */}
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
      </main>

      {/* Confirmar eliminación */}
      {deletingProduct && (
        <ConfirmDialog
          product={deletingProduct}
          onConfirm={handleDelete}
          onCancel={() => setDeletingProduct(null)}
          loading={deleteLoading}
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
