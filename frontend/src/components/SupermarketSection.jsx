import ProductCard from './ProductCard'

const SUPERMARKET_META = {
  Mercadona: { color: '#00A651', emoji: '🟢', bg: 'rgba(0,166,81,0.1)' },
  Alcampo:   { color: '#0072CE', emoji: '🔵', bg: 'rgba(0,114,206,0.1)' },
  Dia:       { color: '#E2001A', emoji: '🔴', bg: 'rgba(226,0,26,0.1)' },
}

export default function SupermarketSection({ name, products }) {
  const meta = SUPERMARKET_META[name] || { color: '#888', emoji: '🏪', bg: 'rgba(255,255,255,0.05)' }
  const withPrice = products.filter(p => p.price != null)
  const cheapest = withPrice.length > 0 ? Math.min(...withPrice.map(p => p.price)) : null

  return (
    <div className="mb-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-1 h-8 rounded-full"
          style={{ background: meta.color }}
        />
        <h2 className="text-xl font-display font-bold tracking-tight">{name}</h2>
        <span className="text-white/30 text-sm ml-1">{products.length} resultados</span>
        {cheapest != null && (
          <span
            className="ml-auto text-xs px-3 py-1 rounded-full font-medium"
            style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}40` }}
          >
            Desde {cheapest.toFixed(2)}€
          </span>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {products.map((product, i) => (
          <ProductCard key={i} product={product} accentColor={meta.color} />
        ))}
      </div>
    </div>
  )
}
