import { inrFmt } from './types'

export default function BCashBar({
  totalSales, totalExpenses, bCash,
}: {
  totalSales: number
  totalExpenses: number
  bCash: number
}) {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'var(--surface)', borderTop: '1px solid var(--card-border)',
      padding: '12px 18px 20px', zIndex: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>Total Sales</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>
          ₹{inrFmt.format(totalSales)}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>Total Expenses</span>
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600,
          color: totalExpenses > totalSales ? 'var(--red)' : 'var(--text)',
        }}>
          ₹{inrFmt.format(totalExpenses)}
        </span>
      </div>
      <div style={{ height: 1, background: 'var(--card-border)', marginBottom: 8 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Balance Cash</span>
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700,
          color: bCash > 0 ? 'var(--green)' : bCash < 0 ? 'var(--red)' : 'var(--accent)',
        }}>
          ₹{inrFmt.format(bCash)}
        </span>
      </div>
    </div>
  )
}
