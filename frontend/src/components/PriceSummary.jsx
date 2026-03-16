const COLORS = { Mercadona: '#00A651', Alcampo: '#0072CE', Dia: '#E2001A' }

export default function PriceSummary({ results }) {
  const mins = Object.entries(results).map(([store, products]) => {
    const prices = products.map(p => p.price).filter(p => p != null)
    return { store, min: prices.length ? Math.min(...prices) : null }
  }).filter(x => x.min != null).sort((a, b) => a.min - b.min)

  if (mins.length < 2) return null
  const lowest = mins[0].min

  return (
    <div className="mb-6 p-4 rounded-2xl fade-up flex flex-wrap items-center gap-4"
         style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted2)', fontFamily: "'Cabinet Grotesk'" }}>
        Mejor precio
      </p>
      <div className="flex flex-wrap gap-4">
        {mins.map(({ store, min }) => (
          <div key={store} className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: COLORS[store] }} />
            <span className="text-xs" style={{ color: 'var(--muted)', fontFamily: "'Cabinet Grotesk'" }}>{store}</span>
            <span className="font-bold text-sm" style={{
              color: min === lowest ? COLORS[store] : 'var(--text)',
              fontFamily: "'Fraunces'",
            }}>
              {min.toFixed(2)}€
              {min === lowest && <span style={{ fontSize: '0.65rem', marginLeft: '3px', opacity: 0.8 }}>✓</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
