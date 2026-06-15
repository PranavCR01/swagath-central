import { useNavigate } from 'react-router-dom'
import { SectionHeader } from './DayCloseShared'
import { inrFmt, type ShowSummary } from './types'

export default function ShowSummaryTable({
  showSummaries, totalSales, theatreId, date,
}: {
  showSummaries: ShowSummary[]
  totalSales: number
  theatreId?: string
  date?: string
}) {
  const navigate = useNavigate()

  return (
    <>
      <SectionHeader label="Show Summary" />
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--r-card)',
        border: '1px solid var(--card-border)', marginBottom: 20, overflow: 'hidden',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '24px 1fr 58px 56px 54px 54px 58px 66px 66px',
          gap: 4, padding: '9px 12px',
          background: 'var(--surface-2)', borderBottom: '1px solid var(--card-border)',
        }}>
          {['#', 'Movie', 'MC', 'Pop', 'CDs', 'Live', 'Park', 'Total', 'Profit'].map((h, i) => (
            <div key={h} style={{
              fontSize: 10, color: 'var(--muted)', fontWeight: 700,
              textAlign: i >= 2 ? 'right' : 'left', textTransform: 'uppercase', letterSpacing: '.04em',
            }}>{h}</div>
          ))}
        </div>

        {showSummaries.length === 0 ? (
          <div style={{ padding: '20px 12px', color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>
            No shows entered yet
          </div>
        ) : showSummaries.map(s => (
          <div key={s.showId}>
            <div style={{
              display: 'grid', gridTemplateColumns: '24px 1fr 58px 56px 54px 54px 58px 66px 66px',
              gap: 4, padding: '9px 12px',
              borderBottom: '1px solid var(--card-border)', alignItems: 'center',
            }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>{s.showNumber}</div>
              <div style={{ fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.movieName}
              </div>
              {[s.mcTotal, s.popcornTotal, s.cdDrinksTotal, s.cdLiveTotal, s.parkingExpected, s.showTotal, s.showProfit].map((v, i) => (
                <div key={i} style={{
                  fontFamily: 'var(--mono)', fontSize: 11, textAlign: 'right',
                  color: i === 5 || i === 6 ? 'var(--accent)' : 'var(--text)', fontWeight: i === 5 ? 700 : 400,
                }}>
                  {i === 6
                    ? inrFmt.format(v)
                    : v > 0 ? inrFmt.format(v) : <span style={{ color: 'var(--muted)' }}>—</span>}
                </div>
              ))}
            </div>
            {!s.isComplete && (
              <button
                onClick={() => navigate(`/theatre/${theatreId}/day/${date}/show/${s.showId}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  width: '100%', padding: '6px 12px',
                  background: 'rgba(245,158,11,0.07)', border: 'none',
                  borderBottom: '1px solid var(--card-border)',
                  color: 'var(--accent)', fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                Show {s.showNumber} incomplete — tap to complete
              </button>
            )}
          </div>
        ))}

        {/* Grand total */}
        <div style={{
          display: 'grid', gridTemplateColumns: '24px 1fr 58px 56px 54px 54px 58px 66px 66px',
          gap: 4, padding: '9px 12px', background: 'var(--surface-2)',
        }}>
          <div />
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Grand Total</div>
          {[
            showSummaries.reduce((sum, r) => sum + r.mcTotal, 0),
            showSummaries.reduce((sum, r) => sum + r.popcornTotal, 0),
            showSummaries.reduce((sum, r) => sum + r.cdDrinksTotal, 0),
            showSummaries.reduce((sum, r) => sum + r.cdLiveTotal, 0),
            showSummaries.reduce((sum, r) => sum + r.parkingExpected, 0),
            totalSales,
            showSummaries.reduce((sum, r) => sum + r.showProfit, 0),
          ].map((v, i) => (
            <div key={i} style={{
              fontFamily: 'var(--mono)', fontSize: 13, textAlign: 'right',
              color: 'var(--accent)', fontWeight: 700,
            }}>
              ₹{inrFmt.format(v)}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
