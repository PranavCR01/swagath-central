import { useState } from 'react'
import { Sparkles, Check, ChevronDown, ChevronUp } from 'lucide-react'
import type { DaySummaryData } from '@/lib/aiSummary'
import { Card, TREND } from './shared'

export default function CateringSection({ catering }: { catering: NonNullable<DaySummaryData['catering']> }) {
  const [open, setOpen] = useState(true)
  const [editing, setEditing] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [qty, setQty] = useState<Record<string, number>>(() => Object.fromEntries(catering.items.map(it => [it.name, it.qty])))
  const visible = (open || editing) ? catering.items : catering.items.slice(0, 3)
  const setQ = (name: string, v: number) => { setQty(q => ({ ...q, [name]: Math.max(0, v) })); setConfirmed(false) }
  const reset = () => setQty(Object.fromEntries(catering.items.map(it => [it.name, it.qty])))

  return (
    <Card style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 15.5, fontWeight: 650, color: 'var(--text)' }}>For Tomorrow</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{catering.tomorrowLabel}{catering.movie ? ` · ${catering.movie}` : ''}</div>
        </div>
        {catering.occupancy != null && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--purple-text)', background: 'var(--purple-chip)', padding: '5px 10px', borderRadius: 999, fontWeight: 600 }}>
            <Sparkles size={13} color="var(--purple-text)" />{catering.occupancy}% exp.
          </span>
        )}
      </div>

      <div>
        {visible.map((it, i) => {
          const tm = TREND[it.trend]
          const v = qty[it.name] ?? it.qty
          const changed = v !== it.qty
          return (
            <div key={it.name} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              minHeight: editing ? 54 : undefined, padding: editing ? '6px 2px' : '11px 2px',
              borderTop: i ? '1px solid var(--card-border)' : 'none',
            }}>
              <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>
                {it.name}
                {changed && !editing && <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 6, fontFamily: 'var(--mono)' }}>was {it.qty}</span>}
              </span>
              {editing ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {(['−', '+'] as const).map(sym => (
                    <button key={sym} onMouseDown={e => e.preventDefault()}
                      onClick={() => setQ(it.name, v + (sym === '+' ? (v >= 50 ? 5 : 1) : -(v >= 50 ? 5 : 1)))}
                      style={{
                        width: 34, height: 42, border: '1.5px solid var(--input-border)', background: 'var(--input-bg)',
                        color: 'var(--accent)', borderRadius: 10, fontSize: 19, fontWeight: 600, cursor: 'pointer',
                        fontFamily: 'inherit', lineHeight: 1,
                      }}>{sym}</button>
                  ))}
                  <input
                    inputMode="numeric" value={v}
                    onChange={e => setQ(it.name, parseInt(e.target.value.replace(/[^\d]/g, ''), 10) || 0)}
                    onFocus={e => e.target.select()}
                    style={{
                      width: 46, height: 42, textAlign: 'center', background: 'var(--input-bg-focus)',
                      border: '1.5px solid var(--accent)', borderRadius: 10, color: 'var(--accent)',
                      fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 600, outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
              ) : (
                <>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 600, color: changed ? 'var(--accent)' : 'var(--text)' }}>{v}</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)', width: 26 }}>units</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: tm.c, width: 14, textAlign: 'center' }}>{tm.ch}</span>
                </>
              )}
            </div>
          )
        })}
      </div>

      {!editing && catering.items.length > 3 && (
        <button onClick={() => setOpen(o => !o)} style={{
          width: '100%', marginTop: 4, height: 34, background: 'transparent', border: 'none', color: 'var(--muted)',
          fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        }}>
          {open ? 'Show less' : `Show all ${catering.items.length} items`}
          {open ? <ChevronUp size={14} color="var(--muted)" /> : <ChevronDown size={14} color="var(--muted)" />}
        </button>
      )}

      <div style={{ fontSize: 11.5, color: 'var(--muted)', textAlign: 'center', margin: '8px 0 14px', opacity: .8 }}>
        {editing ? 'Tap − / + or type to adjust tomorrow’s stock' : `Based on ${catering.basedOnCount} similar show${catering.basedOnCount === 1 ? '' : 's'}`}
      </div>

      {confirmed && !editing && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', marginBottom: 12, background: 'color-mix(in srgb, var(--green) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--green) 30%, transparent)', borderRadius: 12 }}>
          <Check size={16} color="var(--green)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>Stock plan confirmed for tomorrow</span>
        </div>
      )}

      {editing ? (
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setEditing(false)} style={{
            flex: 1, height: 44, border: 'none', borderRadius: 'var(--r-btn)', background: 'var(--accent)',
            color: 'var(--accent-ink)', fontFamily: 'inherit', fontSize: 14, fontWeight: 650, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}><Check size={16} />Save quantities</button>
          <button onClick={reset} style={{
            height: 44, padding: '0 18px', border: '1.5px solid var(--card-border)', borderRadius: 'var(--r-btn)',
            background: 'transparent', color: 'var(--muted)', fontFamily: 'inherit', fontSize: 14, fontWeight: 650, cursor: 'pointer', flexShrink: 0,
          }}>Reset</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setConfirmed(true)} style={{
            flex: 1, height: 44, border: 'none', borderRadius: 'var(--r-btn)', background: 'var(--accent)',
            color: 'var(--accent-ink)', fontFamily: 'inherit', fontSize: 14, fontWeight: 650, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}><Check size={16} />{confirmed ? 'Confirmed' : 'Looks good'}</button>
          <button onClick={() => { setEditing(true); setOpen(true) }} style={{
            height: 44, padding: '0 18px', border: '1.5px solid var(--accent)', borderRadius: 'var(--r-btn)',
            background: 'transparent', color: 'var(--accent)', fontFamily: 'inherit', fontSize: 14, fontWeight: 650, cursor: 'pointer', flexShrink: 0,
          }}>Adjust quantities</button>
        </div>
      )}
    </Card>
  )
}
