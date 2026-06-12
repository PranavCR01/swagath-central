import { useState } from 'react'
import { rupee } from './slipData'

// ── Column header row ─────────────────────────────────────────────
export function ColHeaders() {
  const hStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase',
    color: 'var(--muted)', flexShrink: 0,
  }
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '6px 0 4px',
      position: 'sticky', top: 0, zIndex: 5,
      background: 'var(--bg)',
      borderBottom: '1px solid var(--card-border)',
    }}>
      <div style={{ flex: 1, ...hStyle }}>ITEM</div>
      <div style={{ width: 52, textAlign: 'center', ...hStyle }}>OB</div>
      <div style={{ width: 52, textAlign: 'center', ...hStyle }}>REC</div>
      <div style={{ width: 52, textAlign: 'center', ...hStyle }}>CB</div>
      <div style={{ width: 36, textAlign: 'right', ...hStyle }}>SALE</div>
      <div style={{ width: 64, textAlign: 'right', ...hStyle }}>₹ AMT</div>
    </div>
  )
}

// ── Payment section (UPI + Cash + Total) ──────────────────────────
export function PaymentSection({
  upi, cash, total, slipTotal,
  onUpi, onCash,
}: {
  upi: string; cash: string; total: number; slipTotal: number
  onUpi: (v: string) => void; onCash: (v: string) => void
}) {
  function handleUpi(v: string) {
    onUpi(v)
    if (slipTotal > 0) {
      const diff = slipTotal - (Number(v) || 0)
      if (diff >= 0) onCash(String(diff))
    }
  }
  function handleCash(v: string) {
    onCash(v)
    if (slipTotal > 0) {
      const diff = slipTotal - (Number(v) || 0)
      if (diff >= 0) onUpi(String(diff))
    }
  }
  const paymentDiff = total - slipTotal

  return (
    <div style={{
      margin: '12px 0 4px',
      background: 'var(--surface)',
      border: '1px solid var(--card-border)',
      borderRadius: 'var(--r-card)',
      padding: '12px 16px',
    }}>
      <PayRow label="UPI" value={upi} onChange={handleUpi} />
      <PayRow label="Cash" value={cash} onChange={handleCash} />
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 10, marginTop: 6, borderTop: '1px solid var(--card-border)',
      }}>
        <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>Total</span>
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 700, color: 'var(--accent)',
        }}>
          {rupee(total)}
        </span>
      </div>
      {slipTotal > 0 && paymentDiff !== 0 && (
        <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>
          {paymentDiff > 0
            ? `⚠ Payment ${rupee(total)} exceeds sales ${rupee(slipTotal)}`
            : total > 0
              ? `⚠ Payment ${rupee(total)} is less than sales ${rupee(slipTotal)}`
              : null}
        </div>
      )}
    </div>
  )
}

export function PayRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [focus, setFocus] = useState(false)
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500, width: 40 }}>{label}</span>
      <input
        inputMode="numeric"
        value={value}
        placeholder="0"
        onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
        onFocus={e => { setFocus(true); e.target.select() }}
        onBlur={() => setFocus(false)}
        style={{
          flex: 1, marginLeft: 12, height: 40, textAlign: 'right', boxSizing: 'border-box',
          padding: '0 12px',
          background: focus ? 'var(--input-bg-focus)' : 'var(--input-bg)',
          border: `1.5px solid ${focus ? 'var(--accent)' : 'var(--input-border)'}`,
          borderRadius: 'var(--r-input)', color: 'var(--text)',
          fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 500, outline: 'none',
          boxShadow: focus ? '0 0 0 3px var(--accent-ring)' : 'none',
          transition: 'border-color .15s, box-shadow .15s',
        }}
      />
    </div>
  )
}

// ── Total card ────────────────────────────────────────────────────
export function TotalCard({ label, amount }: { label: string; amount: number }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      background: 'var(--purple-chip)',
      border: '1px solid var(--purple-border)',
      borderRadius: 'var(--r-card)',
      padding: '12px 16px',
      margin: '12px 0 4px',
    }}>
      <span style={{ fontSize: 14, color: 'var(--purple-text)', fontWeight: 500 }}>{label}</span>
      <span style={{
        fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, color: 'var(--accent)',
      }}>
        {rupee(amount)}
      </span>
    </div>
  )
}

// ── Divider ───────────────────────────────────────────────────────
export function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 6px' }}>
      <span style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase',
        color: 'var(--muted)', whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--card-border)' }} />
    </div>
  )
}

// ── Parking count row ─────────────────────────────────────────────
export function ParkingRow({
  label, rate, count, onChange,
}: {
  label: string; rate: number; count: string; onChange: (v: string) => void
}) {
  const [focus, setFocus] = useState(false)
  const expected = (Number(count) || 0) * rate
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      minHeight: 52, padding: '6px 0',
      borderBottom: '1px solid var(--card-border)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>₹{rate} each</div>
      </div>
      <input
        inputMode="numeric"
        value={count}
        placeholder="0"
        onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
        onFocus={e => { setFocus(true); e.target.select() }}
        onBlur={() => setFocus(false)}
        style={{
          width: 72, height: 44, textAlign: 'center', boxSizing: 'border-box',
          background: focus ? 'var(--input-bg-focus)' : 'var(--input-bg)',
          border: `1.5px solid ${focus ? 'var(--accent)' : 'var(--input-border)'}`,
          borderRadius: 'var(--r-input)', color: 'var(--text)',
          fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 500, outline: 'none',
          boxShadow: focus ? '0 0 0 3px var(--accent-ring)' : 'none',
          transition: 'border-color .15s, box-shadow .15s',
          flexShrink: 0,
        }}
      />
      <div style={{
        width: 72, textAlign: 'right', flexShrink: 0,
        fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600,
        color: expected > 0 ? 'var(--muted)' : 'var(--muted)',
      }}>
        {expected > 0 ? rupee(expected) : '—'}
      </div>
    </div>
  )
}
