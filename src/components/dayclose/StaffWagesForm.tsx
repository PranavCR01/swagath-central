import { NumberInput, SectionHeader } from './DayCloseShared'
import { inrFmt, type StaffRow } from './types'

export default function StaffWagesForm({
  staffRows, setStaffRows, readOnly, staffWagesTotal,
}: {
  staffRows: StaffRow[]
  setStaffRows: React.Dispatch<React.SetStateAction<StaffRow[]>>
  readOnly: boolean
  staffWagesTotal: number
}) {
  return (
    <>
      <SectionHeader label="Staff Wages" />
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--r-card)',
        border: '1px solid var(--card-border)', marginBottom: 20, padding: '14px 14px 10px',
      }}>
        {staffRows.length === 0 && readOnly && (
          <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '6px 0 10px' }}>
            No staff wages recorded
          </div>
        )}
        {staffRows.map(row => (
          <div key={row.tempId} style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
            <input
              value={row.name}
              onChange={e => setStaffRows(rs => rs.map(r => r.tempId === row.tempId ? { ...r, name: e.target.value } : r))}
              placeholder="Name"
              disabled={readOnly}
              style={{
                flex: 1, height: 38, padding: '0 10px', boxSizing: 'border-box',
                background: 'var(--input-bg)', border: '1.5px solid var(--input-border)',
                borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none',
                fontFamily: 'inherit', opacity: readOnly ? 0.6 : 1,
              }}
            />
            <NumberInput
              value={row.amount}
              onChange={v => setStaffRows(rs => rs.map(r => r.tempId === row.tempId ? { ...r, amount: v } : r))}
              disabled={readOnly}
              width={80}
              placeholder="0"
            />
            {!readOnly && (
              <button
                onClick={() => setStaffRows(rs => rs.filter(r => r.tempId !== row.tempId))}
                style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: 'transparent', border: '1px solid rgba(239,68,68,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--red)',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                </svg>
              </button>
            )}
          </div>
        ))}
        {!readOnly && (
          <button
            onClick={() => setStaffRows(rs => [...rs, { tempId: crypto.randomUUID(), name: '', amount: '' }])}
            style={{
              width: '100%', height: 38, background: 'transparent',
              border: '1.5px dashed var(--input-border)', borderRadius: 8,
              color: 'var(--muted)', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            + Add Staff
          </button>
        )}
        {staffRows.length > 0 && (
          <div style={{
            marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--card-border)',
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Running Total</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--muted)' }}>
              ₹{inrFmt.format(staffWagesTotal)}
            </span>
          </div>
        )}
      </div>
    </>
  )
}
