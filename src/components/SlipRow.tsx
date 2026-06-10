import { useState } from 'react'
import { calcSale, calcAmount } from '@/lib/calculations'

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

function NumCell({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [focus, setFocus] = useState(false)
  return (
    <input
      inputMode="numeric"
      value={value}
      placeholder="0"
      onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
      onFocus={e => { setFocus(true); e.target.select() }}
      onBlur={() => setFocus(false)}
      style={{
        width: 52, height: 44, textAlign: 'center', boxSizing: 'border-box',
        background: focus ? 'var(--input-bg-focus)' : 'var(--input-bg)',
        border: `1.5px solid ${focus ? 'var(--accent)' : 'var(--input-border)'}`,
        borderRadius: 'var(--r-input)', color: 'var(--text)',
        fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 500, outline: 'none',
        boxShadow: focus ? '0 0 0 3px var(--accent-ring)' : 'none',
        transition: 'border-color .15s, box-shadow .15s',
        flexShrink: 0,
      }}
    />
  )
}

export interface SlipRowProps {
  label: string
  subLabel: string
  price: number
  ob: string
  rec: string
  cb: string
  onObChange: (v: string) => void
  onRecChange: (v: string) => void
  onCbChange: (v: string) => void
}

export default function SlipRow({
  label, subLabel, price,
  ob, rec, cb,
  onObChange, onRecChange, onCbChange,
}: SlipRowProps) {
  const sale = calcSale(Number(ob) || 0, Number(rec) || 0, Number(cb) || 0)
  const amount = calcAmount(sale, price)
  const saleColor = sale < 0 ? 'var(--red)' : sale === 0 ? 'var(--text)' : 'var(--text)'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      minHeight: 52, padding: '6px 0',
      borderBottom: '1px solid var(--card-border)',
      opacity: sale === 0 ? 0.45 : 1,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 600, color: 'var(--text)', fontSize: 14,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {label}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
          {subLabel}
        </div>
      </div>

      <NumCell value={ob} onChange={onObChange} />
      <NumCell value={rec} onChange={onRecChange} />
      <NumCell value={cb} onChange={onCbChange} />

      <div style={{
        width: 36, flexShrink: 0, textAlign: 'right',
        fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, color: saleColor,
      }}>
        {sale === 0 ? '—' : sale}
      </div>

      <div style={{
        width: 64, flexShrink: 0, textAlign: 'right',
        fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600,
        color: sale < 0 ? 'var(--red)' : amount > 0 ? 'var(--accent)' : 'var(--muted)',
      }}>
        {sale < 0 ? '—' : amount === 0 ? '—' : '₹' + inrFmt.format(amount)}
      </div>
    </div>
  )
}

// BMS Combo variant — single lump ₹ input, no OB/REC/CB
export interface LumpRowProps {
  label: string
  value: string
  onChange: (v: string) => void
}

export function LumpRow({ label, value, onChange }: LumpRowProps) {
  const [focus, setFocus] = useState(false)
  const amount = Number(value) || 0

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      minHeight: 52, padding: '6px 0',
      borderBottom: '1px solid var(--card-border)',
    }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{label}</span>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
          background: 'var(--purple-chip)', color: 'var(--purple-text)',
          border: '1px solid var(--purple-border)', letterSpacing: '.05em',
        }}>
          lump
        </span>
      </div>

      {/* Wide input spanning OB+gap+REC+gap+CB = 52+4+52+4+52 = 164px */}
      <input
        inputMode="numeric"
        value={value}
        placeholder="₹ amount"
        onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
        onFocus={e => { setFocus(true); e.target.select() }}
        onBlur={() => setFocus(false)}
        style={{
          width: 164, flexShrink: 0, height: 44, textAlign: 'center', boxSizing: 'border-box',
          background: focus ? 'var(--input-bg-focus)' : 'var(--input-bg)',
          border: `1.5px solid ${focus ? 'var(--accent)' : 'var(--input-border)'}`,
          borderRadius: 'var(--r-input)',
          color: focus ? 'var(--accent)' : 'var(--text)',
          fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 500, outline: 'none',
          boxShadow: focus ? '0 0 0 3px var(--accent-ring)' : 'none',
          transition: 'border-color .15s, box-shadow .15s',
        }}
      />

      {/* SALE placeholder */}
      <div style={{ width: 36, flexShrink: 0 }} />

      {/* ₹ AMT */}
      <div style={{
        width: 64, flexShrink: 0, textAlign: 'right',
        fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600,
        color: amount > 0 ? 'var(--accent)' : 'var(--muted)',
      }}>
        {amount === 0 ? '—' : '₹' + inrFmt.format(amount)}
      </div>
    </div>
  )
}
