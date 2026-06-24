import { NumberInput, SectionHeader } from './DayCloseShared'
import { inrFmt, type UpiState } from './types'

export default function UpiBreakdownForm({
  upi, totalUpi, readOnly, onChange,
}: {
  upi: UpiState
  totalUpi: number
  readOnly: boolean
  onChange: (key: keyof UpiState, val: string) => void
}) {
  return (
    <>
      <SectionHeader label="UPI Breakdown" />
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--r-card)',
        border: '1px solid var(--card-border)', marginBottom: 20, padding: '14px 14px 10px',
      }}>
        {([
          ['Popcorn UPI', upi.popcornUpi, 'popcornUpi'],
          ['Main Counter UPI', upi.mcUpi, 'mcUpi'],
          ['Cool Drink UPI', upi.cdUpi, 'cdUpi'],
          ['Live Counter UPI', upi.lcUpi, 'lcUpi'],
          ['BMS UPI', upi.bmsUpi, 'bmsUpi'],
          ['Parking UPI', upi.parkingUpi, 'parkingUpi'],
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
          <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Total UPI</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 16, color: 'var(--accent)', fontWeight: 700 }}>
            ₹{inrFmt.format(totalUpi)}
          </span>
        </div>
      </div>
    </>
  )
}
