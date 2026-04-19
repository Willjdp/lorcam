import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
interface Category {
  id: number
  name: string
  slug: string
  image_url: string
}

interface Product {
  id: number
  name: string
  description: string
  price: number
  image_url: string
  category_id: number
  unit: string
  active: boolean
}

interface CartItem {
  product: Product
  quantity: number
}
import { ShoppingCart, X, Plus, Minus, MessageCircle, Menu } from 'lucide-react'

export default function App() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [activeCategory, setActiveCategory] = useState<number | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    fetchCategories()
    fetchProducts()
  }, [])

  async function fetchCategories() {
    const { data } = await supabase.from('categories').select('*')
    if (data) setCategories(data)
  }

  async function fetchProducts() {
    const { data } = await supabase.from('products').select('*').eq('active', true)
    if (data) setProducts(data)
  }

  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  function removeFromCart(productId: number) {
    setCart(prev => prev.filter(i => i.product.id !== productId))
  }

  function updateQuantity(productId: number, delta: number) {
    setCart(prev => prev.map(i => {
      if (i.product.id !== productId) return i
      const newQty = i.quantity + delta
      return newQty < 1 ? i : { ...i, quantity: newQty }
    }))
  }

  const total = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0)

  const filteredProducts = activeCategory
    ? products.filter(p => p.category_id === activeCategory)
    : products

  function sendWhatsApp() {
    const lines = cart.map(i => `• ${i.product.name} x${i.quantity} — $${(i.product.price * i.quantity).toFixed(2)}`)
    const message = `Hola LORCAM! Me gustaría hacer el siguiente pedido:\n\n${lines.join('\n')}\n\nTotal: $${total.toFixed(2)}`
    window.open(`https://wa.me/5218120278645?text=${encodeURIComponent(message)}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* NAVBAR */}
      <header className="fixed w-full top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <a href="#" className="flex items-center gap-2">
              <img src="https://i.imgur.com/prWkgS5.jpeg" alt="LORCAM" className="h-10 w-10 rounded-full object-cover"/>
              <span className="text-xl font-black text-[#4A5D23]">LORCAM</span>
            </a>
            <nav className="hidden md:flex gap-6">
              {['Inicio','Tienda','Nosotros','Contacto'].map(item => (
                <a key={item} href={`#${item.toLowerCase()}`} className="text-sm font-medium text-gray-600 hover:text-[#4A5D23] transition-colors">{item}</a>
              ))}
            </nav>
            <div className="flex items-center gap-3">
              <button onClick={() => setCartOpen(true)} className="relative p-2">
                <ShoppingCart className="w-6 h-6 text-gray-700"/>
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#4A5D23] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{cartCount}</span>
                )}
              </button>
              <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
                <Menu className="w-6 h-6"/>
              </button>
            </div>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
            {['Inicio','Tienda','Nosotros','Contacto'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setMenuOpen(false)} className="block text-gray-700 font-medium">{item}</a>
            ))}
          </div>
        )}
      </header>

      {/* HERO */}
      <section id="inicio" className="pt-16">
        <img src="Fondo.jpeg" alt="LORCAM" className="w-full h-auto block"
          onError={e => { (e.target as HTMLImageElement).src = 'https://i.imgur.com/Sm5VuyJ.jpeg' }}/>
      </section>

      {/* BENEFITS */}
      <section className="bg-[#4A5D23] py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: '🚚', title: 'Envíos nacionales', sub: 'A todo México' },
              { icon: '🤝', title: 'Asesoría gratuita', sub: 'Con cada compra' },
              { icon: '🌿', title: '100% Orgánico', sub: 'Sin químicos' },
              { icon: '⭐', title: 'Mayoreo y menudeo', sub: 'Precios especiales' },
            ].map(b => (
              <div key={b.title} className="flex items-center gap-3 text-white">
                <span className="text-2xl">{b.icon}</span>
                <div>
                  <p className="font-bold text-sm">{b.title}</p>
                  <p className="text-white/70 text-xs">{b.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TIENDA */}
      <section id="tienda" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-black text-[#1A1A1A] mb-2">Nuestros Productos</h2>
          <p className="text-gray-500 mb-8">Calidad orgánica directo desde Monterrey</p>

          {/* Filtros */}
          <div className="flex gap-2 flex-wrap mb-8">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${activeCategory === null ? 'bg-[#4A5D23] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-[#4A5D23]'}`}>
              Todos
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${activeCategory === cat.id ? 'bg-[#4A5D23] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-[#4A5D23]'}`}>
                {cat.name}
              </button>
            ))}
          </div>

          {/* Grid productos */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map(product => (
              <div key={product.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-lg transition-shadow product-card-hover">
                <div className="relative overflow-hidden aspect-square bg-gray-50">
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"/>
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-sm text-gray-800 leading-snug mb-1">{product.name}</h3>
                  <p className="text-gray-400 text-xs mb-2">{product.unit}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[#4A5D23] font-bold">${product.price.toFixed(2)}</span>
                    <button
                      onClick={() => addToCart(product)}
                      className="bg-[#4A5D23] text-white text-xs px-3 py-1.5 rounded-full hover:bg-[#6B8E23] transition-colors font-semibold">
                      Agregar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACTO */}
      <section id="contacto" className="py-16 bg-[#4A5D23]">
        <div className="max-w-xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-black text-white mb-4">¿Listo para empezar?</h2>
          <p className="text-white/80 mb-8">Escríbenos y te asesoramos sin costo sobre qué producto necesitas.</p>
          <a href="https://wa.me/5218120278645" target="_blank"
            className="inline-flex items-center gap-2 bg-white text-[#4A5D23] px-8 py-3 rounded-full font-bold hover:bg-gray-100 transition-colors">
            <MessageCircle className="w-5 h-5"/>
            Escribir por WhatsApp
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-white py-10">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="font-black text-xl mb-2">L◉RCAM</p>
          <p className="text-gray-400 text-sm">Lombriz Roja Californiana Monterrey · Nutriendo la tierra, cultivando la vida</p>
          <p className="text-gray-600 text-xs mt-4">© 2026 LORCAM · Todos los derechos reservados</p>
        </div>
      </footer>

      {/* CARRITO DRAWER */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCartOpen(false)}/>
          <div className="relative bg-white w-full max-w-sm h-full flex flex-col shadow-xl">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h2 className="font-black text-lg text-gray-800">Tu carrito</h2>
              <button onClick={() => setCartOpen(false)}><X className="w-5 h-5 text-gray-500"/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cart.length === 0 ? (
                <p className="text-gray-400 text-center mt-12 text-sm">Tu carrito está vacío</p>
              ) : cart.map(item => (
                <div key={item.product.id} className="flex gap-3 items-center">
                  <img src={item.product.image_url} alt={item.product.name} className="w-16 h-16 object-cover rounded-lg bg-gray-50"/>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-800 leading-snug">{item.product.name}</p>
                    <p className="text-[#4A5D23] font-bold text-sm mt-1">${(item.product.price * item.quantity).toFixed(2)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => updateQuantity(item.product.id, -1)} className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center hover:border-[#4A5D23]">
                        <Minus className="w-3 h-3"/>
                      </button>
                      <span className="text-sm font-semibold w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product.id, 1)} className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center hover:border-[#4A5D23]">
                        <Plus className="w-3 h-3"/>
                      </button>
                      <button onClick={() => removeFromCart(item.product.id)} className="ml-auto text-gray-300 hover:text-red-400">
                        <X className="w-4 h-4"/>
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
                <button onClick={sendWhatsApp}
                  className="w-full bg-[#4A5D23] text-white py-3 rounded-full font-bold flex items-center justify-center gap-2 hover:bg-[#6B8E23] transition-colors">
                  <MessageCircle className="w-5 h-5"/>
                  Pedir por WhatsApp
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* WhatsApp flotante */}
      <a href="https://wa.me/5218120278645" target="_blank"
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-green-500 rounded-full shadow-lg flex items-center justify-center hover:bg-green-600 transition-colors hover:scale-110 transform">
        <MessageCircle className="w-7 h-7 text-white"/>
      </a>

    </div>
  )
}