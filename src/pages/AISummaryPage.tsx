import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Sparkles, AlertTriangle } from 'lucide-react'
import { buildDaySummary, type DaySummaryData } from '@/lib/aiSummary'
import { AiBadge, fmtDateLabel } from '@/components/ai-summary/shared'
import SnapshotCard from '@/components/ai-summary/SnapshotCard'
import NarrativeCard from '@/components/ai-summary/NarrativeCard'
import ItemCard from '@/components/ai-summary/ItemCard'
import CateringSection from '@/components/ai-summary/CateringSection'
import ParkingAlert from '@/components/ai-summary/ParkingAlert'
import Skeleton from '@/components/ai-summary/Skeleton'

type Phase = 'loading' | 'after' | 'error'

export default function AISummaryPage() {
  const { theatreId, date } = useParams<{ theatreId: string; date: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const fromReadOnly = (location.state as { readOnly?: boolean } | null)?.readOnly === true

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
          <button onClick={() => navigate(`/theatre/${theatreId}/day/${date}/close${fromReadOnly ? '?readOnly=true' : ''}`)} style={{
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
