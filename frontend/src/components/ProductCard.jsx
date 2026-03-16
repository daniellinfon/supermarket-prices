import { useState } from 'react'

const API_BASE = '/api'
const COLORS = { Mercadona: '#00A651', Alcampo: '#0072CE', Dia: '#E2001A' }

function getImg(url, supermarket) {
  if (!url) return ''
  if (supermarket === 'Mercadona') return url
  return `${API_BASE}/image-proxy?url=${encodeURIComponent(url)}`
}

export default function ProductCard({ product, accentColor, onToggleFavorite }) {
  const { name, price, price_per_unit, description, image_url, product_url, supermarket, is_offer, favorite_id } = product
  const imgSrc = getImg(image_url, supermarket)
  const showUnit = price_per_unit && /\d/.test(price_per_unit)
  const nameFontSize = name.length > 50 ? '0.68rem' : name.length > 35 ? '0.75rem' : '0.82rem'
  const [animating, setAnimating] = useState(false)
  const color = accentColor || COLORS[supermarket] || '#888'

  const handleFavorite = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setAnimating(true)
    setTimeout(() => setAnimating(false), 400)
    if (onToggleFavorite) onToggleFavorite(product)
  }

  return (
    <a href={product_url || '#'} target="_blank" rel="noopener noreferrer"
       className="product-card fade-up flex flex-col rounded-2xl overflow-hidden"
       style={{ border: '1px solid var(--border)', background: 'var(--surface)', height: '100%' }}>

      {/* Image */}
      <div className="relative flex items-center justify-center p-3"
           style={{ background: 'rgba(255,255,255,0.025)', aspectRatio: '1', maxHeight: '140px' }}>
        {is_offer && (
          <span className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full font-bold"
                style={{ background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b33', fontFamily: "'Cabinet Grotesk'", fontSize: '0.65rem' }}>
            ↓ Oferta
          </span>
        )}
        {/* Favorite button */}
        <button onClick={handleFavorite}
                className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full transition-all"
                style={{
                  background: favorite_id ? `${color}22` : 'rgba(0,0,0,0.3)',
                  border: `1px solid ${favorite_id ? color : 'transparent'}`,
                  transform: animating ? 'scale(1.3)' : 'scale(1)',
                  transition: 'transform 0.2s ease, background 0.2s ease',
                }}>
          <span style={{ fontSize: '0.75rem', lineHeight: 1 }}>
            {favorite_id ? '♥' : '♡'}
          </span>
        </button>

        {imgSrc ? (
          <img src={imgSrc} alt={name}
               className="w-full h-full object-contain"
               style={{ maxHeight: '110px' }}
               onError={e => { e.target.style.display = 'none' }} />
        ) : (
          <span style={{ fontSize: '2rem', opacity: 0.15 }}>🛒</span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-3">
        <p className="line-clamp-2 leading-snug mb-1"
           style={{ color: 'var(--muted)', fontFamily: "'Cabinet Grotesk'", fontSize: nameFontSize, fontWeight: 500 }}>
          {name}
        </p>
        {description ? (
          <p className="mb-auto" style={{ color: 'var(--muted2)', fontSize: '0.68rem', fontFamily: "'Cabinet Grotesk'" }}>
            {description}
          </p>
        ) : <div className="mb-auto" />}

        <div className="mt-3 flex items-end justify-between gap-1">
          <div>
            {price != null ? (
              <>
                <span className="font-bold leading-none"
                      style={{ color, fontFamily: "'Fraunces'", fontSize: '1.15rem' }}>
                  {price.toFixed(2)}€
                </span>
                {showUnit && (
                  <p style={{ color: 'var(--muted2)', fontSize: '0.65rem', marginTop: '2px', fontFamily: "'Cabinet Grotesk'" }}>
                    {price_per_unit}
                  </p>
                )}
              </>
            ) : (
              <span style={{ color: 'var(--muted2)', fontSize: '0.72rem', fontStyle: 'italic' }}>Ver precio</span>
            )}
          </div>
          <span style={{ color: 'var(--muted2)', fontSize: '0.7rem' }}>→</span>
        </div>
      </div>

      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${color}80, transparent)` }} />
    </a>
  )
}
