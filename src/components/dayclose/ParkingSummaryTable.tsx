import { SectionHeader } from './DayCloseShared'
import { fmtTime, inrFmt, type ShowSummary } from './types'

export default function ParkingSummaryTable({ showSummaries }: { showSummaries: ShowSummary[] }) {
  return (
    <>
      <SectionHeader label="Parking Summary" />
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--r-card)',
        border: '1px solid var(--card-border)', marginBottom: 20, overflow: 'hidden',
      }}>
        {showSummaries.length === 0 ? (
          <div style={{ padding: '20px 12px', color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>
            No shows yet
          </div>
        ) : showSummaries.map((s, idx) => (
          <div key={s.showId} style={{
            padding: '11px 14px',
            borderBottom: idx < showSummaries.length - 1 ? '1px solid var(--card-border)' : 'none',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                Show {s.showNumber} · {fmtTime(s.startTime)}
              </span>
              {s.parkingMissing ? (
                <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>not entered</span>
              ) : (
                <span style={{
                  fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 700,
                  color: s.parkingGap > 0 ? 'var(--red)' : 'var(--green)',
                }}>
                  Gap {s.parkingGap > 0 ? '+' : ''}{inrFmt.format(s.parkingGap)}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 11, color: 'var(--muted)' }}>
              <span>Scooter: <b style={{ color: 'var(--text)' }}>{s.scooterCount}</b></span>
              <span>Auto: <b style={{ color: 'var(--text)' }}>{s.autoCount}</b></span>
              <span>Car: <b style={{ color: 'var(--text)' }}>{s.carCount}</b></span>
              <span style={{ marginLeft: 'auto' }}>
                Exp ₹{inrFmt.format(s.parkingExpected)} · Rep ₹{inrFmt.format(s.parkingReported)}
              </span>
            </div>
          </div>
        ))}
        {showSummaries.length > 0 && (
          <div style={{
            padding: '9px 14px', background: 'var(--surface-2)',
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Total Reported</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--accent)', fontWeight: 700 }}>
              ₹{inrFmt.format(showSummaries.reduce((s, r) => s + r.parkingReported, 0))}
            </span>
          </div>
        )}
      </div>
    </>
  )
}
