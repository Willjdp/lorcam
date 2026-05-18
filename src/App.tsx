import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'
import { validateProduct, validateCategory, validateCart, MAX_QUANTITY } from './lib/validation'
import type { Category, Product, CartItem } from './types'
import { ShoppingCart, X, Plus, Minus, MessageCircle, Menu, Leaf, Truck, Users, Star, ChevronRight, ChevronUp, ChevronLeft, Search } from 'lucide-react'
import ProductCard from './components/ProductCard'
import ProductModal from './components/ProductModal'
import { useFocusTrap } from './hooks/useFocusTrap'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
}

const PAGE_SIZE = 12

export default function App() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [activeCategory, setActiveCategory] = useState<number | null>(null)
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('lorcam_cart')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [cartOpen, setCartOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  // Focus trap para el drawer del carrito
  const cartTrapRef = useFocusTrap(cartOpen)

  // ── Efectos del sistema ────────────────────────────────────────────────────
  useEffect(() => { loadData() }, [])

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setPage(1) }, [activeCategory])
  useEffect(() => { setPage(1) }, [searchQuery])

  useEffect(() => {
    localStorage.setItem('lorcam_cart', JSON.stringify(cart))
  }, [cart])

  // Cerrar modales con Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (cartOpen) setCartOpen(false)
      if (menuOpen) setMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [cartOpen, menuOpen])

  // Sincronizar URL → categoría al cargar
  useEffect(() => {
    if (categories.length === 0) return
    const slug = new URLSearchParams(window.location.search).get('categoria')
    if (slug) {
      const cat = categories.find(c => c.slug === slug)
      if (cat) setActiveCategory(cat.id)
    }
  }, [categories])

  // Botón "Atrás" del navegador
  useEffect(() => {
    const onPopState = () => {
      const slug = new URLSearchParams(window.location.search).get('categoria')
      if (!slug) {
        setActiveCategory(null)
      } else {
        const cat = categories.find(c => c.slug === slug)
        setActiveCategory(cat?.id ?? null)
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [categories])

  // ── Carga de datos ────────────────────────────────────────────────────────
  async function loadData() {
    setLoading(true)
    setFetchError(null)
    await Promise.all([fetchCategories(), fetchProducts()])
    setLoading(false)
  }

  async function fetchCategories() {
    try {
      const { data, error } = await supabase.from('categories').select('*')
      if (error) throw error
      if (data) setCategories(data.map(validateCategory).filter((c): c is Category => c !== null))
    } catch { /* non-critical */ }
  }

  async function fetchProducts() {
    try {
      const { data, error } = await supabase.from('products').select('*').eq('active', true)
      if (error) throw error
      if (data) setProducts(data.map(validateProduct).filter((p): p is Product => p !== null))
    } catch {
      setFetchError('No pudimos cargar los productos. Verifica tu conexión e intenta de nuevo.')
    }
  }

  // ── Categorías con URL amigable ───────────────────────────────────────────
  const handleCategoryChange = useCallback((id: number | null) => {
    const url = new URL(window.location.href)
    if (id === null) {
      url.searchParams.delete('categoria')
    } else {
      const cat = categories.find(c => c.id === id)
      if (cat?.slug) url.searchParams.set('categoria', cat.slug)
    }
    history.pushState({}, '', url)
    setActiveCategory(id)
  }, [categories])

  // ── Toasts ────────────────────────────────────────────────────────────────
  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  // ── Carrito ───────────────────────────────────────────────────────────────
  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { product, quantity: 1 }]
    })
    addToast(`${product.name} agregado al carrito`)
  }, [addToast])

  const handleOpenDetail = useCallback((product: Product) => setSelectedProduct(product), [])
  const handleCloseDetail = useCallback(() => setSelectedProduct(null), [])

  const removeFromCart = useCallback((productId: number) => {
    setCart(prev => prev.filter(i => i.product.id !== productId))
  }, [])

  const updateQuantity = useCallback((productId: number, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.product.id !== productId) return i
      const newQty = Math.min(MAX_QUANTITY, Math.max(1, i.quantity + delta))
      return { ...i, quantity: newQty }
    }))
  }, [])

  // ── Valores derivados ─────────────────────────────────────────────────────
  const total = useMemo(() => cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0), [cart])
  const cartCount = useMemo(() => cart.reduce((sum, i) => sum + i.quantity, 0), [cart])

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return products
      .filter(p => !activeCategory || p.category_id === activeCategory)
      .filter(p => !q || p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
  }, [products, activeCategory, searchQuery])

  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE)

  const paginatedProducts = useMemo(
    () => filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredProducts, page]
  )

  const activeCat = useMemo(() => categories.find(c => c.id === activeCategory), [categories, activeCategory])

  const pageTitle = activeCat
    ? `${activeCat.name} | LORCAM - Lombricultura Monterrey`
    : 'LORCAM - Lombriz Roja Californiana · Monterrey, NL'

  const pageDescription = activeCat
    ? `Compra ${activeCat.name} orgánico de alta calidad. LORCAM, productores de lombriz roja californiana en Monterrey, NL. Envíos a todo México.`
    : 'Lombriz roja californiana, humus y lixiviado orgánico de alta calidad. Productores en Monterrey, NL. Envíos a todo México con asesoría gratuita incluida.'

  // ── WhatsApp ──────────────────────────────────────────────────────────────
  function sendWhatsApp() {
    const error = validateCart(cart)
    if (error) { addToast(error, 'error'); return }
    const lines = cart.map(i => `• ${i.product.name} x${i.quantity} — $${(i.product.price * i.quantity).toFixed(2)}`)
    const message = `Hola LORCAM! Me gustaría hacer el siguiente pedido:\n\n${lines.join('\n')}\n\nTotal: $${total.toFixed(2)}`
    if (message.length > 4000) { addToast('El pedido es muy extenso. Reduce la cantidad de productos distintos.', 'error'); return }
    window.open(`https://wa.me/5218120278645?text=${encodeURIComponent(message)}`, '_blank')
  }

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMenuOpen(false)
  }

  const navLinks = [
    { label: 'Inicio', id: 'inicio' },
    { label: 'Tienda', id: 'tienda' },
    { label: 'Nosotros', id: 'nosotros' },
    { label: 'Contacto', id: 'contacto' },
  ]

  return (
    <>
      {/* Meta tags dinámicos — React 19 los mueve a <head> automáticamente */}
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:url" content={window.location.href} />
      <link rel="canonical" href={`${window.location.origin}/`} />

      {/* Skip-to-content: primer elemento del DOM, visible solo al recibir foco */}
      <a href="#main-content" className="skip-link">
        Saltar al contenido principal
      </a>

      <div className="min-h-screen bg-white font-sans">

        {/* NAVBAR */}
        <header className="fixed w-full top-0 z-50 bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <button
                onClick={() => scrollTo('inicio')}
                aria-label="Ir al inicio — LORCAM"
                className="flex items-center gap-2"
              >
                <img
                  src="/Logo.jpeg"
                  alt="Logo de LORCAM — Lombriz Roja Californiana Monterrey"
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full object-cover"
                />
                <span className="text-xl font-black text-[#4A5D23]" aria-hidden="true">LORCAM</span>
              </button>

              <nav aria-label="Navegación principal" className="hidden md:flex gap-6">
                {navLinks.map(item => (
                  <button
                    key={item.id}
                    onClick={() => scrollTo(item.id)}
                    className="text-sm font-medium text-gray-600 hover:text-[#4A5D23] transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </nav>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCartOpen(true)}
                  aria-label={cartCount > 0 ? `Abrir carrito, ${cartCount} ${cartCount === 1 ? 'producto' : 'productos'}` : 'Abrir carrito'}
                  aria-expanded={cartOpen}
                  className="relative p-2"
                >
                  <ShoppingCart className="w-6 h-6 text-gray-700" aria-hidden="true" />
                  {cartCount > 0 && (
                    <span
                      className="absolute -top-1 -right-1 bg-[#4A5D23] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold"
                      aria-hidden="true"
                    >
                      {cartCount}
                    </span>
                  )}
                </button>

                <button
                  className="md:hidden p-2"
                  onClick={() => setMenuOpen(!menuOpen)}
                  aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
                  aria-expanded={menuOpen}
                  aria-controls="mobile-nav"
                >
                  <Menu className="w-6 h-6" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          {menuOpen && (
            <nav
              id="mobile-nav"
              aria-label="Navegación móvil"
              className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3 animate-fade-in"
            >
              {navLinks.map(item => (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className="block w-full text-left text-gray-700 font-medium py-1"
                >
                  {item.label}
                </button>
              ))}
            </nav>
          )}
        </header>

        <main id="main-content">

          {/* HERO */}
          <section id="inicio" aria-label="Inicio">
            <div className="pt-16 w-full">
              <h1 className="sr-only">LORCAM — Lombriz Roja Californiana y productos orgánicos desde Monterrey, NL</h1>
              <img
                src="Fondo.jpeg"
                alt="LORCAM — Productores de lombriz roja californiana y humus orgánico en Monterrey, Nuevo León"
                fetchPriority="high"
                className="w-full object-cover object-center"
                style={{ maxHeight: '420px' }}
                onError={e => { (e.target as HTMLImageElement).src = 'https://i.imgur.com/Sm5VuyJ.jpeg' }}
              />
            </div>
          </section>

          {/* BENEFICIOS */}
          <section aria-label="Beneficios de comprar en LORCAM" className="bg-[#4A5D23] py-8">
            <div className="max-w-7xl mx-auto px-6">
              <ul className="grid grid-cols-2 md:grid-cols-4 gap-6 list-none">
                {[
                  { icon: '🚚', title: 'Envíos nacionales', sub: 'A todo México' },
                  { icon: '🤝', title: 'Asesoría gratuita', sub: 'Con cada compra' },
                  { icon: '🌿', title: '100% Orgánico', sub: 'Sin químicos' },
                  { icon: '⭐', title: 'Mayoreo y menudeo', sub: 'Precios especiales' },
                ].map(b => (
                  <li key={b.title} className="flex items-center gap-3 text-white">
                    <span className="text-2xl" aria-hidden="true">{b.icon}</span>
                    <div>
                      <p className="font-bold text-sm">{b.title}</p>
                      {/* text-white/80 = contraste ~5.2:1 sobre #4A5D23 ✓ WCAG AA */}
                      <p className="text-white/80 text-xs">{b.sub}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* TIENDA */}
          <section id="tienda" aria-label="Tienda — Catálogo de productos orgánicos LORCAM" className="py-16 bg-gray-50">
            <div className="max-w-7xl mx-auto px-6">
              <h2 className="text-3xl font-black text-[#1A1A1A] mb-2">Nuestros Productos</h2>
              <p className="text-gray-600 mb-4">Calidad orgánica directo desde Monterrey</p>

              {/* Breadcrumbs */}
              <nav aria-label="Ruta de navegación" className="flex items-center gap-1.5 text-sm mb-6">
                <button
                  onClick={() => scrollTo('inicio')}
                  className="text-gray-500 hover:text-[#4A5D23] transition-colors"
                >
                  Inicio
                </button>
                {/* Separadores decorativos: aria-hidden */}
                <ChevronRight className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
                <button
                  onClick={() => handleCategoryChange(null)}
                  aria-current={!activeCategory ? 'page' : undefined}
                  className={`transition-colors ${activeCategory ? 'text-gray-500 hover:text-[#4A5D23]' : 'text-[#4A5D23] font-semibold'}`}
                >
                  Tienda
                </button>
                {activeCat && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
                    <span className="text-[#4A5D23] font-semibold animate-fade-in" aria-current="page">
                      {activeCat.name}
                    </span>
                  </>
                )}
              </nav>

              {/* Buscador */}
              <div className="relative mb-6 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar productos..."
                  aria-label="Buscar productos"
                  className="w-full pl-9 pr-4 py-2.5 rounded-full border border-gray-200 text-sm bg-white focus:outline-none focus:border-[#4A5D23] focus:ring-2 focus:ring-[#4A5D23]/20 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    aria-label="Limpiar búsqueda"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>

              {/* Filtros de categoría */}
              <div role="group" aria-label="Filtrar por categoría" className="flex gap-2 flex-wrap mb-8">
                <button
                  onClick={() => handleCategoryChange(null)}
                  aria-pressed={activeCategory === null}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${activeCategory === null ? 'bg-[#4A5D23] text-white' : 'bg-white text-gray-700 border border-gray-200 hover:border-[#4A5D23]'}`}
                >
                  Todos
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.id)}
                    aria-pressed={activeCategory === cat.id}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${activeCategory === cat.id ? 'bg-[#4A5D23] text-white' : 'bg-white text-gray-700 border border-gray-200 hover:border-[#4A5D23]'}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Error */}
              {fetchError && (
                <div role="alert" className="text-center py-20 animate-fade-in">
                  <p className="text-5xl mb-4" aria-hidden="true">😕</p>
                  <p className="text-gray-800 font-semibold text-lg mb-2">Ups, algo salió mal</p>
                  {/* text-gray-600 = contraste ~7:1 sobre blanco ✓ WCAG AA */}
                  <p className="text-gray-600 text-sm mb-6">{fetchError}</p>
                  <button
                    onClick={loadData}
                    className="px-6 py-2.5 bg-[#4A5D23] text-white rounded-full text-sm font-semibold hover:bg-[#6B8E23] transition-colors"
                  >
                    Reintentar
                  </button>
                </div>
              )}

              {/* Skeleton loader */}
              {loading && (
                <div aria-busy="true" aria-label="Cargando productos" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                    <div key={i} className="bg-white border border-gray-100 rounded-xl overflow-hidden animate-pulse" aria-hidden="true">
                      <div className="aspect-square bg-gray-200" />
                      <div className="p-3 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                        <div className="h-6 bg-gray-200 rounded w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Estado vacío */}
              {!loading && !fetchError && filteredProducts.length === 0 && (
                <div className="text-center py-20 animate-fade-in">
                  <p className="text-5xl mb-4" aria-hidden="true">{searchQuery ? '🔍' : '🌱'}</p>
                  <p className="text-gray-800 font-semibold text-lg mb-2">
                    {searchQuery ? 'Sin resultados' : 'Sin productos aquí'}
                  </p>
                  <p className="text-gray-600 text-sm mb-6">
                    {searchQuery
                      ? `No encontramos productos para "${searchQuery}".`
                      : 'No encontramos productos en esta categoría.'}
                  </p>
                  <button
                    onClick={() => { setSearchQuery(''); handleCategoryChange(null) }}
                    className="px-6 py-2.5 bg-[#4A5D23] text-white rounded-full text-sm font-semibold hover:bg-[#6B8E23] transition-colors"
                  >
                    Ver todos los productos
                  </button>
                </div>
              )}

              {/* Grid de productos */}
              {!loading && !fetchError && paginatedProducts.length > 0 && (
                <>
                  {/* text-gray-500 = contraste ~4.9:1 sobre gris-50 ✓ WCAG AA */}
                  <p className="text-xs text-gray-500 mb-4" aria-live="polite">
                    Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredProducts.length)} de {filteredProducts.length} productos
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {paginatedProducts.map(product => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        cartItem={cart.find(i => i.product.id === product.id)}
                        onAdd={addToCart}
                        onUpdateQuantity={updateQuantity}
                        onRemove={removeFromCart}
                        onOpenDetail={handleOpenDetail}
                      />
                    ))}
                  </div>

                  {/* Paginación */}
                  {totalPages > 1 && (
                    <nav aria-label="Paginación del catálogo" className="flex items-center justify-center gap-3 mt-10">
                      <button
                        onClick={() => { setPage(p => Math.max(1, p - 1)); scrollTo('tienda') }}
                        disabled={page === 1}
                        aria-label="Página anterior"
                        className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:border-[#4A5D23] hover:text-[#4A5D23] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }).map((_, i) => {
                          const p = i + 1
                          const isActive = p === page
                          const isNear = Math.abs(p - page) <= 1 || p === 1 || p === totalPages
                          if (!isNear) return (p === 2 || p === totalPages - 1)
                            ? <span key={p} className="w-2 text-gray-500 text-center select-none" aria-hidden="true">…</span>
                            : null
                          return (
                            <button
                              key={p}
                              onClick={() => { setPage(p); scrollTo('tienda') }}
                              aria-label={`Ir a la página ${p}`}
                              aria-current={isActive ? 'page' : undefined}
                              className={`w-9 h-9 rounded-full text-sm font-semibold transition-colors ${isActive ? 'bg-[#4A5D23] text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                            >
                              {p}
                            </button>
                          )
                        })}
                      </div>
                      <button
                        onClick={() => { setPage(p => Math.min(totalPages, p + 1)); scrollTo('tienda') }}
                        disabled={page === totalPages}
                        aria-label="Página siguiente"
                        className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:border-[#4A5D23] hover:text-[#4A5D23] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </nav>
                  )}
                </>
              )}
            </div>
          </section>

          {/* NOSOTROS */}
          <section id="nosotros" aria-label="Quiénes somos — Historia de LORCAM" className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-6">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <span className="text-[#4A5D23] text-sm font-bold uppercase tracking-widest">Quiénes somos</span>
                  <h2 className="text-4xl font-black text-gray-900 mt-2 mb-6 leading-tight">
                    Cultivando vida desde<br />Monterrey
                  </h2>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Somos LORCAM, un proyecto regiomontano dedicado a la producción y comercialización de lombriz roja californiana (<em>Eisenia foetida</em>), humus de lombriz y lixiviado orgánico. Nacimos de la pasión por la agricultura sostenible y la lombricultura responsable.
                  </p>
                  <p className="text-gray-700 leading-relaxed mb-8">
                    Trabajamos con productores, educadores, agricultores urbanos y familias que buscan devolver nutrientes a la tierra de forma natural. Desde pie de cría hasta asesoría completa para tu proyecto, estamos contigo en cada etapa.
                  </p>
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    {[
                      { value: '100%', label: 'Orgánico' },
                      { value: 'MTY', label: 'Monterrey, NL' },
                      { value: '7 días', label: 'Supervivencia en envío' },
                    ].map(s => (
                      <div key={s.label} className="text-center p-3 rounded-xl bg-gray-50">
                        <p className="text-[#4A5D23] font-black text-xl">{s.value}</p>
                        <p className="text-gray-600 text-xs mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <a
                    href="https://wa.me/5218120278645"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Contactar a LORCAM por WhatsApp para platicar tu proyecto"
                    className="inline-flex items-center gap-2 bg-[#4A5D23] text-white px-6 py-3 rounded-full font-bold hover:bg-[#6B8E23] transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" aria-hidden="true" />
                    Platícanos tu proyecto
                  </a>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: <Leaf className="w-6 h-6 text-[#4A5D23]" aria-hidden="true" />, title: 'Producción propia', desc: 'Lombriz roja californiana criada en condiciones óptimas para garantizar vitalidad y reproducción rápida.' },
                    { icon: <Truck className="w-6 h-6 text-[#4A5D23]" aria-hidden="true" />, title: 'Envíos a todo México', desc: 'Empaque especializado que garantiza la supervivencia de las lombrices hasta 7 días en tránsito.' },
                    { icon: <Users className="w-6 h-6 text-[#4A5D23]" aria-hidden="true" />, title: 'Asesoría personalizada', desc: 'Acompañamos tu proyecto desde cero: hogares, escuelas, huertas urbanas y operaciones de escala media.' },
                    { icon: <Star className="w-6 h-6 text-[#4A5D23]" aria-hidden="true" />, title: 'Resultados garantizados', desc: 'Con la guía correcta, tu proyecto puede estar produciendo y generando ventas en menos de un mes.' },
                  ].map(card => (
                    <article key={card.title} className="p-5 rounded-2xl border border-gray-100 hover:border-[#4A5D23]/30 hover:shadow-md transition-all">
                      <div className="w-10 h-10 bg-[#4A5D23]/10 rounded-xl flex items-center justify-center mb-3">
                        {card.icon}
                      </div>
                      <h3 className="font-bold text-gray-800 text-sm mb-1">{card.title}</h3>
                      <p className="text-gray-600 text-xs leading-relaxed">{card.desc}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* CONTACTO */}
          <section id="contacto" aria-label="Contacto" className="py-16 bg-[#4A5D23]">
            <div className="max-w-xl mx-auto px-6 text-center">
              <h2 className="text-3xl font-black text-white mb-4">¿Listo para empezar?</h2>
              {/* text-white/80 = contraste ~5.2:1 sobre #4A5D23 ✓ WCAG AA */}
              <p className="text-white/80 mb-8">Escríbenos y te asesoramos sin costo sobre qué producto necesitas.</p>
              <a
                href="https://wa.me/5218120278645"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Escribir a LORCAM por WhatsApp"
                className="focus-ring-white inline-flex items-center gap-2 bg-white text-[#4A5D23] px-8 py-3 rounded-full font-bold hover:bg-gray-100 transition-colors"
              >
                <MessageCircle className="w-5 h-5" aria-hidden="true" />
                Escribir por WhatsApp
              </a>
            </div>
          </section>

        </main>

        {/* FOOTER */}
        <footer className="bg-gray-900 text-white py-10">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <p className="font-black text-xl mb-2">L◉RCAM</p>
            {/* text-gray-400 sobre bg-gray-900 = contraste ~6.5:1 ✓ WCAG AA */}
            <p className="text-gray-400 text-sm">Lombriz Roja Californiana Monterrey · Nutriendo la tierra, cultivando la vida</p>
            <p className="text-gray-500 text-xs mt-4">© 2026 LORCAM · Todos los derechos reservados</p>
          </div>
        </footer>

        {/* CARRITO DRAWER */}
        {cartOpen && (
          <div
            className="fixed inset-0 z-50 flex justify-end"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-dialog-title"
          >
            <div
              className="absolute inset-0 bg-black/40 animate-fade-in"
              onClick={() => setCartOpen(false)}
              aria-hidden="true"
            />
            {/* Focus trap aplicado a este panel */}
            <div
              ref={cartTrapRef}
              className="relative bg-white w-full max-w-sm h-full flex flex-col shadow-xl animate-slide-in-right"
            >
              <div className="flex justify-between items-center p-5 border-b border-gray-100">
                <h2 id="cart-dialog-title" className="font-black text-lg text-gray-800">Tu carrito</h2>
                <button
                  onClick={() => setCartOpen(false)}
                  aria-label="Cerrar carrito"
                  className="p-1 rounded"
                >
                  <X className="w-5 h-5 text-gray-500" aria-hidden="true" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {cart.length === 0 ? (
                  <div className="text-center mt-16 animate-fade-in">
                    <p className="text-4xl mb-3" aria-hidden="true">🛒</p>
                    <p className="text-gray-700 text-sm font-medium">Tu carrito está vacío</p>
                    {/* text-gray-500 = contraste ~4.9:1 ✓ WCAG AA */}
                    <p className="text-gray-500 text-xs mt-1">Agrega productos para comenzar</p>
                  </div>
                ) : cart.map(item => (
                  <div key={item.product.id} className="flex gap-3 items-center animate-fade-in">
                    <img
                      src={item.product.image_url}
                      alt={`${item.product.name} — producto en carrito`}
                      loading="lazy"
                      decoding="async"
                      width={64}
                      height={64}
                      className="w-16 h-16 object-cover rounded-lg bg-gray-50 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-800 leading-snug truncate">{item.product.name}</p>
                      <p className="text-[#4A5D23] font-bold text-sm mt-1">${(item.product.price * item.quantity).toFixed(2)}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => updateQuantity(item.product.id, -1)}
                          aria-label={`Reducir cantidad de ${item.product.name}`}
                          className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center hover:border-[#4A5D23] transition-colors"
                        >
                          <Minus className="w-3 h-3" aria-hidden="true" />
                        </button>
                        <span
                          className="text-sm font-semibold w-4 text-center"
                          aria-label={`Cantidad: ${item.quantity}`}
                        >
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, 1)}
                          aria-label={`Aumentar cantidad de ${item.product.name}`}
                          className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center hover:border-[#4A5D23] transition-colors"
                        >
                          <Plus className="w-3 h-3" aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          aria-label={`Eliminar ${item.product.name} del carrito`}
                          /* text-gray-500 = contraste ~4.9:1 ✓ WCAG AA */
                          className="ml-auto text-gray-500 hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {cart.length > 0 && (
                <div className="p-5 border-t border-gray-100">
                  <div className="flex justify-between mb-4">
                    <span className="font-semibold text-gray-700">Total</span>
                    <span className="font-black text-[#4A5D23] text-lg">${total.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={sendWhatsApp}
                    className="w-full bg-[#4A5D23] text-white py-3 rounded-full font-bold flex items-center justify-center gap-2 hover:bg-[#6B8E23] transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" aria-hidden="true" />
                    Pedir por WhatsApp
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal de detalle de producto */}
        {selectedProduct && (
          <ProductModal
            product={selectedProduct}
            cartItem={cart.find(i => i.product.id === selectedProduct.id)}
            onClose={handleCloseDetail}
            onAdd={addToCart}
            onUpdateQuantity={updateQuantity}
            onRemove={removeFromCart}
          />
        )}

        {/* Toasts — aria-live anuncia cambios a lectores de pantalla */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="false"
          className="fixed top-20 right-4 z-50 flex flex-col gap-2 pointer-events-none"
        >
          {toasts.map(toast => (
            <div
              key={toast.id}
              className={`px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium flex items-center gap-2 animate-slide-in-up pointer-events-auto ${toast.type === 'success' ? 'bg-[#4A5D23]' : 'bg-red-600'}`}
            >
              <span className="shrink-0" aria-hidden="true">{toast.type === 'success' ? '✓' : '✕'}</span>
              <span>{toast.message}</span>
            </div>
          ))}
        </div>

        {/* Scroll to top */}
        {showScrollTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Volver al inicio de la página"
            className="fixed bottom-24 right-6 z-40 w-12 h-12 bg-white border border-gray-200 rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-[#4A5D23] hover:border-[#4A5D23] hover:bg-gray-50 transition-all animate-fade-in"
          >
            <ChevronUp className="w-5 h-5" aria-hidden="true" />
          </button>
        )}

        {/* WhatsApp flotante */}
        <a
          href="https://wa.me/5218120278645"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contactar a LORCAM por WhatsApp"
          className="focus-ring-white fixed bottom-6 right-6 z-40 w-14 h-14 bg-green-600 rounded-full shadow-lg flex items-center justify-center hover:bg-green-700 transition-colors hover:scale-110 transform"
        >
          <MessageCircle className="w-7 h-7 text-white" aria-hidden="true" />
        </a>

      </div>
    </>
  )
}
