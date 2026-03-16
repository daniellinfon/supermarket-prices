import ProductCard from './ProductCard'

const COLORS = { Mercadona: '#00A651', Alcampo: '#0072CE', Dia: '#E2001A' }

export default function FavoritesPage({ favorites, onRemove, onClose }) {
  const grouped = favorites.reduce((acc, f) => {
    acc[f.supermarket] = acc[f.supermarket] || []
    acc[f.supermarket].push(f)
    return acc
  }, {})

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 style={{ fontFamily: "'Fraunces'", fontWeight: 900, fontSize: '1.8rem' }}>
            Mis <span style={{ fontStyle: 'italic', color: 'var(--accent)' }}>favoritos</span>
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            {favorites.length} producto{favorites.length !== 1 ? 's' : ''} guardado{favorites.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)', fontFamily: "'Cabinet Grotesk'" }}>
          ← Volver
        </button>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-20">
          <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤍</p>
          <p style={{ fontFamily: "'Fraunces'", fontSize: '1.25rem', marginBottom: '0.5rem' }}>
            Aún no tienes favoritos
          </p>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Pulsa el ♡ en cualquier producto para guardarlo aquí
          </p>
        </div>
      ) : (
        Object.entries(grouped).map(([store, products]) => (
          <section key={store} className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1 h-6 rounded-full" style={{ background: COLORS[store] }} />
              <h3 style={{ fontFamily: "'Fraunces'", fontWeight: 700, fontSize: '1.1rem' }}>{store}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: `${COLORS[store]}18`, color: COLORS[store], fontFamily: "'Cabinet Grotesk'", fontWeight: 700 }}>
                {products.length}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {products.map((p, i) => (
                <div key={p.id} style={{ animationDelay: `${i * 0.04}s`, position: 'relative' }}>
                  <ProductCard product={{ ...p, favorite_id: p.id }} accentColor={COLORS[store]}
                               onToggleFavorite={() => onRemove(p.id)} />
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
