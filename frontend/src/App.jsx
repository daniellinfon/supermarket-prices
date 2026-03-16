import { useState, useMemo } from 'react'
import ProductCard from './components/ProductCard'
import SkeletonCard from './components/SkeletonCard'
import PriceSummary from './components/PriceSummary'
import FavoritesPage from './components/FavoritesPage'
import { useFavorites } from './hooks/useFavorites'

const SUPERMARKETS = [
  { id: 'mercadona', name: 'Mercadona', color: '#00A651' },
  { id: 'alcampo',   name: 'Alcampo',   color: '#0072CE' },
  { id: 'dia',       name: 'Dia',        color: '#E2001A' },
]

const SUGGESTIONS = ['Leche entera', 'Pechuga de pollo', 'Aceite de oliva', 'Huevos', 'Pan de molde', 'Yogur natural']
const LIMIT_OPTIONS = [5, 10, 20]
const SORT_OPTIONS = [
  { value: 'default',      label: 'Relevancia' },
  { value: 'price_asc',    label: 'Precio ↑' },
  { value: 'price_desc',   label: 'Precio ↓' },
  { value: 'price_kg_asc', label: '€/kg ↑' },
]

function parsePricePerUnit(str) {
  if (!str) return null
  const m = str.match(/([\d,\.]+)\s*€/)
  if (!m) return null
  try { return parseFloat(m[1].replace(',', '.')) } catch { return null }
}

export default function App() {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(['mercadona', 'alcampo', 'dia'])
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState('')
  const [sort, setSort] = useState('default')
  const [limit, setLimit] = useState(10)
  const [page, setPage] = useState('search') // 'search' | 'favorites'

  const { favorites, addFavorite, removeFavorite, isFavorite, fetchFavorites } = useFavorites()

  const toggle = (id) => setActive(a => a.includes(id) ? a.filter(x => x !== id) : [...a, id])

  const search = async (q = query) => {
    if (!q.trim() || !active.length) return
    setLoading(true)
    setResults({})
    setSearched(q)
    setPage('search')
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&supermarkets=${active.join(',')}`)
      const data = await res.json()
      setResults(data.results || {})
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleFavorite = async (product) => {
    const existing = isFavorite(product.name, product.supermarket)
    if (existing) {
      await removeFavorite(existing.id)
    } else {
      await addFavorite(product)
    }
    // Actualizar favorite_id en resultados actuales
    await fetchFavorites()
  }

  // Inyectar favorite_id actualizado en los resultados
  const resultsWithFavs = useMemo(() => {
    const out = {}
    for (const [store, products] of Object.entries(results)) {
      out[store] = products.map(p => ({
        ...p,
        favorite_id: isFavorite(p.name, p.supermarket)?.id ?? null
      }))
    }
    return out
  }, [results, favorites])

  const processedResults = useMemo(() => {
    const out = {}
    for (const [store, products] of Object.entries(resultsWithFavs)) {
      let sorted = [...products]
      if (sort === 'price_asc') sorted.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))
      else if (sort === 'price_desc') sorted.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity))
      else if (sort === 'price_kg_asc') {
        sorted.sort((a, b) => {
          const pa = parsePricePerUnit(a.price_per_unit)
          const pb = parsePricePerUnit(b.price_per_unit)
          if (pa == null && pb == null) return 0
          if (pa == null) return 1
          if (pb == null) return -1
          return pa - pb
        })
      }
      out[store] = sorted.slice(0, limit)
    }
    return out
  }, [resultsWithFavs, sort, limit])

  const total = Object.values(processedResults).reduce((s, arr) => s + arr.length, 0)
  const rawTotal = Object.values(results).reduce((s, arr) => s + arr.length, 0)
  const onKey = (e) => { if (e.key === 'Enter') search() }

  return (
    <div className="min-h-screen content" style={{ background: 'var(--bg)' }}>
      <div className="bg-orbs" />

      {/* Header */}
      <header style={{ borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(12px)', background: 'rgba(12,13,11,0.85)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button onClick={() => setPage('search')} className="flex items-center gap-2">
            <span style={{ fontFamily: "'Fraunces'", fontWeight: 700, fontSize: '1.2rem', color: 'var(--accent)' }}>Precio</span>
            <span style={{ fontFamily: "'Fraunces'", fontWeight: 300, fontSize: '1.2rem', fontStyle: 'italic' }}>Mercado</span>
          </button>
          <button onClick={() => setPage(page === 'favorites' ? 'search' : 'favorites')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: page === 'favorites' ? 'rgba(212,245,122,0.12)' : 'var(--surface)',
                    border: `1px solid ${page === 'favorites' ? 'var(--accent)' : 'var(--border)'}`,
                    color: page === 'favorites' ? 'var(--accent)' : 'var(--muted)',
                    fontFamily: "'Cabinet Grotesk'",
                  }}>
            <span>{page === 'favorites' ? '♥' : '♡'}</span>
            <span className="hidden sm:inline">Favoritos</span>
            {favorites.length > 0 && (
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: 'var(--accent)', color: '#0c0d0b', fontSize: '0.65rem' }}>
                {favorites.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6">

        {/* Favorites page */}
        {page === 'favorites' && (
          <div className="py-8">
            <FavoritesPage
              favorites={favorites}
              onRemove={removeFavorite}
              onClose={() => setPage('search')}
            />
          </div>
        )}

        {/* Search page */}
        {page === 'search' && (
          <>
            {/* Hero */}
            <div className="py-10 sm:py-14 fade-up">
              <div className="max-w-xl mx-auto text-center mb-8">
                <h1 style={{ fontFamily: "'Fraunces'", fontWeight: 900, fontSize: 'clamp(2rem, 6vw, 3.5rem)', lineHeight: 1.1 }}>
                  ¿Cuánto cuesta<br />
                  <span style={{ fontStyle: 'italic', color: 'var(--accent)' }}>hoy</span>?
                </h1>
                <p className="text-sm sm:text-base mt-3" style={{ color: 'var(--muted)' }}>
                  Compara precios en Mercadona, Alcampo y Dia
                </p>
              </div>

              <div className="max-w-2xl mx-auto">
                <div className="flex gap-2 mb-4">
                  <div className="flex-1 flex items-center gap-3 px-4 rounded-2xl border"
                       style={{ background: 'var(--surface)', borderColor: 'var(--border-hover)' }}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: 'var(--muted2)', flexShrink: 0 }}>
                      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                    <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={onKey}
                           placeholder="Buscar producto..."
                           className="flex-1 py-3 bg-transparent outline-none text-sm"
                           style={{ color: 'var(--text)', fontFamily: "'Cabinet Grotesk'" }} />
                    {query && <button onClick={() => setQuery('')} style={{ color: 'var(--muted2)', fontSize: '1.2rem' }}>×</button>}
                  </div>
                  <button onClick={() => search()} disabled={loading}
                          className="px-5 sm:px-7 rounded-2xl font-bold text-sm disabled:opacity-40"
                          style={{ background: 'var(--accent)', color: '#0c0d0b', fontFamily: "'Cabinet Grotesk'", whiteSpace: 'nowrap' }}>
                    {loading ? '...' : 'Buscar'}
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 justify-center mb-5">
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => { setQuery(s); search(s) }}
                            className="px-3 py-1.5 rounded-full text-xs border transition-all hover:border-white/20"
                            style={{ borderColor: 'var(--border)', color: 'var(--muted)', fontFamily: "'Cabinet Grotesk'" }}>
                      {s}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 justify-center flex-wrap">
                  {SUPERMARKETS.map(({ id, name, color }) => (
                    <button key={id} onClick={() => toggle(id)}
                            className="px-4 py-2 rounded-xl text-xs font-bold border transition-all"
                            style={{
                              borderColor: active.includes(id) ? color : 'var(--border)',
                              color: active.includes(id) ? color : 'var(--muted2)',
                              background: active.includes(id) ? `${color}18` : 'transparent',
                              fontFamily: "'Cabinet Grotesk'",
                            }}>
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Skeleton */}
            {loading && (
              <div className="fade-in">
                {active.map(id => {
                  const s = SUPERMARKETS.find(x => x.id === id)
                  return (
                    <section key={id} className="mb-10">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-1 h-5 rounded-full" style={{ background: s.color, opacity: 0.3 }} />
                        <div className="h-4 w-28 rounded-lg animate-pulse" style={{ background: 'var(--surface2)' }} />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {Array.from({ length: Math.min(limit, 5) }).map((_, i) => <SkeletonCard key={i} />)}
                      </div>
                    </section>
                  )
                })}
              </div>
            )}

            {/* Results */}
            {!loading && total > 0 && (
              <div className="fade-in">
                <PriceSummary results={processedResults} />

                <div className="flex flex-wrap items-center justify-between gap-3 mb-6 py-3 px-4 rounded-2xl"
                     style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>
                    <span style={{ color: 'var(--text)', fontWeight: 700 }}>{rawTotal}</span> resultados
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex gap-1 flex-wrap">
                      {SORT_OPTIONS.map(opt => (
                        <button key={opt.value} onClick={() => setSort(opt.value)}
                                className="px-3 py-1.5 rounded-lg text-xs transition-all"
                                style={{
                                  background: sort === opt.value ? 'var(--surface2)' : 'transparent',
                                  color: sort === opt.value ? 'var(--text)' : 'var(--muted)',
                                  border: `1px solid ${sort === opt.value ? 'var(--border-hover)' : 'transparent'}`,
                                  fontFamily: "'Cabinet Grotesk'", fontWeight: sort === opt.value ? 700 : 400,
                                }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <div className="w-px h-4 hidden sm:block" style={{ background: 'var(--border)' }} />
                    <div className="flex gap-1">
                      {LIMIT_OPTIONS.map(n => (
                        <button key={n} onClick={() => setLimit(n)}
                                className="px-3 py-1.5 rounded-lg text-xs transition-all"
                                style={{
                                  background: limit === n ? 'var(--surface2)' : 'transparent',
                                  color: limit === n ? 'var(--text)' : 'var(--muted)',
                                  border: `1px solid ${limit === n ? 'var(--border-hover)' : 'transparent'}`,
                                  fontFamily: "'Cabinet Grotesk'", fontWeight: limit === n ? 700 : 400,
                                }}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {SUPERMARKETS.filter(s => processedResults[s.name]).map(({ name, color }) => (
                  <section key={name} className="mb-12">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-1 h-6 rounded-full" style={{ background: color }} />
                      <h2 style={{ fontFamily: "'Fraunces'", fontWeight: 700, fontSize: '1.1rem' }}>{name}</h2>
                      <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: `${color}18`, color, fontFamily: "'Cabinet Grotesk'", fontWeight: 700 }}>
                        {processedResults[name].length}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {processedResults[name].map((p, i) => (
                        <div key={i} style={{ animationDelay: `${i * 0.04}s` }}>
                          <ProductCard product={p} accentColor={color} onToggleFavorite={handleToggleFavorite} />
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}

            {!loading && searched && total === 0 && (
              <div className="text-center py-20 fade-up">
                <p style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔍</p>
                <p style={{ fontFamily: "'Fraunces'", fontSize: '1.25rem', marginBottom: '0.5rem' }}>Sin resultados</p>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>No encontramos "{searched}"</p>
              </div>
            )}
          </>
        )}

        <footer className="py-10 text-center" style={{ borderTop: '1px solid var(--border)', marginTop: '2rem' }}>
          <p className="text-xs" style={{ color: 'var(--muted2)' }}>
            PrecioMercado · Precios en tiempo real · No afiliado con ningún supermercado
          </p>
        </footer>
      </main>
    </div>
  )
}
