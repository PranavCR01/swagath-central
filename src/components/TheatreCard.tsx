import swagathMark from '@/assets/swagath-mark.png'

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

interface TheatreCardProps {
  name: string
  showCount: number
  totalAmount: number
  onOpen: () => void
}

export default function TheatreCard({ name, showCount, totalAmount, onOpen }: TheatreCardProps) {
  return (
    <div
      onClick={onOpen}
      style={{
        background: 'linear-gradient(160deg, var(--surface-2), var(--surface))',
        border: '1px solid var(--card-border)',
        borderRadius: 22,
        padding: 20,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 0 0 1px var(--purple-border) inset',
      }}
    >
      {/* Film reel watermark */}
      <div style={{
        position: 'absolute', right: -22, top: -22,
        opacity: 0.05, pointerEvents: 'none',
      }}>
        <svg width="130" height="130" viewBox="0 0 24 24" fill="none"
          stroke="var(--purple-text)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="6.5" r="1.4" />
          <circle cx="12" cy="17.5" r="1.4" />
          <circle cx="6.5" cy="12" r="1.4" />
          <circle cx="17.5" cy="12" r="1.4" />
        </svg>
      </div>

      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: '-.02em' }}>
              {name}
            </div>
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 13, color: 'var(--purple-text)',
            background: 'var(--purple-chip)', padding: '6px 11px',
            borderRadius: 999, fontWeight: 600,
            border: '1px solid var(--purple-border)',
          }}>
            {/* ticket icon */}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="var(--purple-text)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1 0 4 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-4 2 2 0 0 1 0-4Z" />
              <path d="M14 6v12" strokeDasharray="2 2.5" />
            </svg>
            {showCount} {showCount === 1 ? 'show' : 'shows'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 22 }}>
          <div>
            <div style={{
              fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase',
              color: 'var(--muted)', fontWeight: 600,
            }}>
              Today's Revenue
            </div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 34, fontWeight: 600,
              color: 'var(--accent)', letterSpacing: '-.01em', marginTop: 4,
              textShadow: '0 0 28px var(--accent-glow)',
            }}>
              ₹{inrFmt.format(totalAmount)}
            </div>
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            color: 'var(--accent)', fontWeight: 650, fontSize: 15,
          }}>
            Open
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
              stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  )
}

export { swagathMark }
