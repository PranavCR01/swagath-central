import { NumberInput, SectionHeader } from './DayCloseShared'
import { inrFmt, type CashState } from './types'

export default function CashBreakdownForm({
  cash, totalCash, readOnly, onChange,
}: {
  cash: CashState
  totalCash: number
  readOnly: boolean
  onChange: (key: keyof CashState, val: string) => void
}) {
  return (
    <>
      <SectionHeader label="Cash Breakdown" />
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--r-card)',
        border: '1px solid var(--card-border)', marginBottom: 20, padding: '14px 14px 10px',
      }}>
        {([
          ['Popcorn Cash', cash.popcornCash, 'popcornCash'],
          ['Main Counter Cash', cash.mcCash, 'mcCash'],
          ['Cool Drink Cash', cash.cdCash, 'cdCash'],
          ['Live Counter Cash', cash.lcCash, 'lcCash'],
          ['Parking Cash', cash.parkingCash, 'parkingCash'],
        ] as const).map(([label, val, key]) => (
          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--text)' }}>{label}</span>
            <NumberInput value={val} onChange={v => onChange(key, v)} disabled={readOnly} />
          </div>
        ))}
        <div style={{
          marginTop: 4, paddingTop: 10, borderTop: '1px solid var(--card-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Total Cash</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 16, color: 'var(--accent)', fontWeight: 700 }}>
            ₹{inrFmt.format(totalCash)}
          </span>
        </div>
      </div>
    </>
  )
}
