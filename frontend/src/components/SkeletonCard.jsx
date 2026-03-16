export default function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
      <div className="animate-pulse" style={{ background: 'rgba(255,255,255,0.03)', aspectRatio: '1', maxHeight: '140px' }} />
      <div className="p-3">
        <div className="h-3 rounded-lg animate-pulse mb-1.5" style={{ background: 'var(--surface2)', width: '85%' }} />
        <div className="h-3 rounded-lg animate-pulse mb-4" style={{ background: 'var(--surface2)', width: '55%', opacity: 0.6 }} />
        <div className="h-5 rounded-lg animate-pulse" style={{ background: 'var(--surface2)', width: '45%' }} />
      </div>
      <div className="h-0.5" style={{ background: 'var(--border)' }} />
    </div>
  )
}
