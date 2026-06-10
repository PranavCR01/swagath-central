import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Sparkles, Check, AlertTriangle, ChevronDown, ChevronUp, SquareParking,
} from 'lucide-react'
import { rupee } from '@/components/charts/LineChart'
import { buildDaySummary, type DaySummaryData, type ItemRev } from '@/lib/aiSummary'

type Phase = 'loading' | 'after' | 'error'

const TREND: Record<string, { ch: string; c: string }> = {
  up: { ch: '↑', c: 'var(--green)' },
  down: { ch: '↓', c: 'var(--red)' },
  flat: { ch: '→', c: 'var(--muted)' },
}

function ordinal(n: number): string {
  return n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'
}

function fmtDateLabel(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}

function AiBadge() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, height: 26, padding: '0 9px 0 8px',
      borderRadius: 999, background: 'color-mix(in srgb, var(--accent) 16%, transparent)',
      border: '1px solid color-mix(in srgb, var(--accent) 38%, transparent)',
    }}>
      <span className="ai-pulse" style={{ display: 'inline-flex' }}><Sparkles size={13} color="var(--accent)" /></span>
      <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.08em', color: 'var(--accent)' }}>AI</span>
    </span>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', borderRadius: 'var(--r-card)', ...style }}>
      {children}
    </div>
  )
}

// ── Section 1: Performance Snapshot ──
function SnapshotCard({ data }: { data: DaySummaryData }) {
  const total = data.shows.reduce((s, sh) => s + sh.revenue, 0)
  const best = data.shows.reduce((b, sh) => (!b || sh.revenue > b.revenue ? sh : b), null as DaySummaryData['shows'][number] | null)
  const occAvg = data.shows.length
    ? Math.round(data.shows.reduce((s, sh) => s + sh.occ, 0) / data.shows.length)
    : 0
  const vsYesterday = data.vsYesterday
  const up = (vsYesterday ?? 0) >= 0

  return (
    <Card style={{ padding: 18 }}>
      <div style={{ fontSize: 11.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>Total revenue</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 36, fontWeight: 600, color: 'var(--accent)', letterSpacing: '-.01em', textShadow: '0 0 28px var(--accent-glow)' }}>{rupee(total)}</span>
        {vsYesterday != null && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13.5, fontWeight: 650, color: up ? 'var(--green)' : 'var(--red)' }}>
            {up ? '▲' : '▼'} {Math.abs(vsYesterday)}% <span style={{ color: 'var(--muted)', fontWeight: 500 }}>vs yesterday</span>
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <div style={{ flex: 1, padding: '12px 14px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: 13 }}>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 500 }}>Best show</div>
          {best && <>
            <div style={{ fontSize: 14, fontWeight: 650, color: 'var(--text)', marginTop: 4 }}>Show {best.n} · {best.time}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 600, color: 'var(--accent)', marginTop: 2 }}>{rupee(best.revenue)}</div>
          </>}
        </div>
        <div style={{ flex: 1, padding: '12px 14px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: 13 }}>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 500 }}>Avg occupancy</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 26, fontWeight: 600, color: 'var(--text)', marginTop: 4, lineHeight: 1 }}>{occAvg}%</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>across all shows</div>
        </div>
      </div>
    </Card>
  )
}

// ── Section 2: AI Narrative ──
function NarrativeCard({ lines }: { lines: string[] }) {
  return (
    <div style={{
      position: 'relative', background: 'linear-gradient(120deg, color-mix(in srgb, var(--accent) 7%, var(--surface)), var(--surface))',
      border: '1px solid var(--card-border)', borderLeft: '3px solid var(--accent)', borderRadius: 'var(--r-card)',
      padding: '18px 20px', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', right: -14, top: -14, opacity: .07 }}><Sparkles size={96} color="var(--accent)" strokeWidth={1.2} /></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <AiBadge />
        <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Daily read</span>
      </div>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 11 }}>
        {lines.map((l, i) => (
          <p key={i} className="ai-line" style={{
            margin: 0, fontSize: 15.5, lineHeight: 1.62,
            color: i === 0 ? 'var(--text)' : 'color-mix(in srgb, var(--text) 82%, transparent)',
            fontWeight: i === 0 ? 550 : 400, animationDelay: (i * 0.12) + 's',
          }}>{l}</p>
        ))}
      </div>
    </div>
  )
}

// ── Section 3: Item Intelligence ──
function ItemCard({ kind, item }: { kind: 'top' | 'under'; item: ItemRev & { suggestion?: string } }) {
  const isTop = kind === 'top'
  const tm = TREND[item.trend]
  return (
    <Card style={{ padding: 16, flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
        <span style={{
          width: 22, height: 22, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isTop ? 'color-mix(in srgb, var(--green) 18%, transparent)' : 'color-mix(in srgb, var(--accent) 16%, transparent)',
        }}>
          {isTop ? <Check size={13} color="var(--green)" /> : <AlertTriangle size={13} color="var(--accent)" />}
        </span>
        <span style={{ fontSize: 11.5, fontWeight: 650, letterSpacing: '.04em', textTransform: 'uppercase', color: isTop ? 'var(--green)' : 'var(--accent)' }}>
          {isTop ? 'Top performer' : 'Underperformer'}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 17, fontWeight: 650, color: 'var(--text)' }}>{item.name}</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: tm.c }}>{tm.ch}</span>
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{item.units} units · {rupee(item.revenue)}</div>
      {!isTop && item.suggestion && (
        <div style={{ fontSize: 12.5, color: 'var(--purple-text)', marginTop: 10, lineHeight: 1.45, paddingTop: 10, borderTop: '1px solid var(--card-border)' }}>
          {item.suggestion}
        </div>
      )}
    </Card>
  )
}

// ── Section 4: Catering ──
function CateringSection({ catering }: { catering: NonNullable<DaySummaryData['catering']> }) {
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

// ── Section 5: Parking Alert ──
function ParkingAlert({ parking, navigate }: { parking: NonNullable<DaySummaryData['parking']>; navigate: (path: string) => void }) {
  return (
    <div style={{
      background: 'color-mix(in srgb, var(--red) 11%, var(--surface))', border: '1px solid color-mix(in srgb, var(--red) 34%, transparent)',
      borderRadius: 'var(--r-card)', padding: 18,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <AlertTriangle size={18} color="var(--red)" />
        <span style={{ fontSize: 13, fontWeight: 650, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--red)' }}>Parking alert</span>
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 32, fontWeight: 600, color: 'var(--red)', lineHeight: 1, textShadow: '0 0 22px color-mix(in srgb, var(--red) 40%, transparent)' }}>{rupee(parking.gap)}</div>
      <div style={{ fontSize: 14, color: 'var(--text)', marginTop: 8, fontWeight: 500 }}>Staff short by {rupee(parking.gap)} today</div>
      {parking.trendingUp && (
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>
          {parking.consecutive}{ordinal(parking.consecutive)} consecutive day with a gap — investigate
        </div>
      )}
      <div style={{ marginTop: 14 }}>
        <button onClick={() => navigate('/insights')} style={{
          height: 40, padding: '0 16px', border: '1.5px solid var(--red)', borderRadius: 'var(--r-btn)',
          background: 'transparent', color: 'var(--red)', fontFamily: 'inherit', fontSize: 13, fontWeight: 650, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 8,
        }}><SquareParking size={15} />View parking history</button>
      </div>
    </div>
  )
}

function Skeleton({ h = 120 }: { h?: number }) {
  return <div className="ai-skel" style={{ height: h, borderRadius: 'var(--r-card)', background: 'var(--surface)', border: '1px solid var(--card-border)' }} />
}

export default function AISummaryPage() {
  const { theatreId, date } = useParams<{ theatreId: string; date: string }>()
  const navigate = useNavigate()

  const [phase, setPhase] = useState<Phase>('loading')
  const [data, setData] = useState<DaySummaryData | null>(null)
  const [narrative, setNarrative] = useState<string[]>([])
  const [errorMsg, setErrorMsg] = useState('')

  const displayDate = date ? fmtDateLabel(date) : ''

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { generate() }, [])

  async function generate() {
    if (!theatreId || !date) return
    setPhase('loading')
    try {
      let d = data
      if (!d) {
        d = await buildDaySummary(theatreId, date)
        if (!d) {
          setErrorMsg('No shows logged for this day yet.')
          setPhase('error')
          return
        }
        setData(d)
      }

      // Note: /api/generate-summary is a Vercel serverless function — only reachable
      // under `vercel dev` or a real deployment. Plain `vite dev` will 404 here.
      const res = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theatreName: d.theatreName, date: d.date, dayData: d }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Request failed (${res.status})`)
      }
      const body = await res.json() as { summary: string }
      const lines = body.summary.split(/\n\s*\n/).map(l => l.trim()).filter(Boolean)
      setNarrative(lines)
      setPhase('after')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setPhase('error')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        height: 60, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 18px', borderBottom: '1px solid var(--card-border)', background: 'var(--bg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <button onClick={() => navigate(`/theatre/${theatreId}/day/${date}/close`)} style={{
            width: 38, height: 38, borderRadius: 11, background: 'var(--surface)', border: '1px solid var(--card-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
          }}>
            <ArrowLeft size={19} color="var(--text)" />
          </button>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', lineHeight: 1.1 }}>Daily Summary</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{data?.theatreName ?? ''} · {displayDate}</div>
          </div>
        </div>
        <AiBadge />
      </div>

      {phase === 'loading' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'var(--accent)', fontSize: 13.5, fontWeight: 600 }}>
            <span className="ai-spin" style={{ display: 'inline-flex' }}><Sparkles size={17} color="var(--accent)" /></span>
            Reading {data?.theatreName ?? 'today'}'s day…
          </div>
          <Skeleton h={130} />
          <Skeleton h={150} />
          <div style={{ display: 'flex', gap: 12 }}><Skeleton h={110} /><Skeleton h={110} /></div>
          <Skeleton h={180} />
        </div>
      )}

      {phase === 'error' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 28px', textAlign: 'center' }}>
          <AlertTriangle size={36} color="var(--red)" style={{ marginBottom: 14 }} />
          <div style={{ fontSize: 15, fontWeight: 650, color: 'var(--text)', marginBottom: 6 }}>Couldn't generate summary</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 300, lineHeight: 1.5, marginBottom: 22 }}>{errorMsg}</div>
          <button onClick={generate} style={{
            height: 44, padding: '0 22px', border: '1.5px solid var(--accent)', borderRadius: 'var(--r-btn)',
            background: 'transparent', color: 'var(--accent)', fontFamily: 'inherit', fontSize: 14, fontWeight: 650, cursor: 'pointer',
          }}>Try again</button>
        </div>
      )}

      {phase === 'after' && data && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
          <div className="ai-grid" style={{ display: 'grid', gap: 16 }}>
            <div className="ai-span ai-rise" style={{ animationDelay: '0s' }}><SnapshotCard data={data} /></div>
            <div className="ai-span ai-rise" style={{ animationDelay: '.06s' }}><NarrativeCard lines={narrative} /></div>

            {(data.itemIntel.top || data.itemIntel.under) && (
              <div className="ai-rise" style={{ display: 'flex', gap: 12, alignItems: 'stretch', animationDelay: '.12s' }}>
                {data.itemIntel.top && <ItemCard kind="top" item={data.itemIntel.top} />}
                {data.itemIntel.under && <ItemCard kind="under" item={data.itemIntel.under} />}
              </div>
            )}

            {data.catering && <div className="ai-rise" style={{ animationDelay: '.2s' }}><CateringSection catering={data.catering} /></div>}
            {data.parking && <div className="ai-span ai-rise" style={{ animationDelay: '.24s' }}><ParkingAlert parking={data.parking} navigate={navigate} /></div>}

            <div className="ai-span" style={{ display: 'flex', justifyContent: 'center', paddingTop: 4, paddingBottom: 6 }}>
              <button onClick={generate} style={{
                height: 40, padding: '0 18px', border: '1px solid var(--card-border)', borderRadius: 'var(--r-btn)',
                background: 'transparent', color: 'var(--muted)', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}><Sparkles size={14} />Regenerate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
