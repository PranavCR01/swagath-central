import { useEffect, useState } from 'react'
import { rupee, niceCeil } from './LineChart'

export interface HBarDatum {
  label: string
  v: number
  sub?: string
}

interface HBarChartProps {
  data: HBarDatum[]
  height?: number
  barColor?: string
  fmt?: (n: number) => string
  animateKey?: string | number
}

/** Horizontal bar chart with animated, glowing fill bars. */
export function HBarChart({ data, barColor = 'var(--accent)', fmt = rupee, animateKey }: HBarChartProps) {
  const maxV = Math.max(...data.map(d => d.v), 1)
  const niceMax = niceCeil(maxV)
  const [grown, setGrown] = useState(false)

  useEffect(() => {
    setGrown(false)
    const t = requestAnimationFrame(() => setGrown(true))
    return () => cancelAnimationFrame(t)
  }, [animateKey, data.length])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {data.map(d => {
        const pct = (d.v / niceMax) * 100
        return (
          <div key={d.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
              <span style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 500 }}>
                {d.label}
                {d.sub && <span style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 11.5, marginLeft: 6 }}>{d.sub}</span>}
              </span>
              <span style={{ fontSize: 13, fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--accent)' }}>{fmt(d.v)}</span>
            </div>
            <div style={{ height: 10, borderRadius: 6, background: 'rgba(150,120,190,0.10)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: (grown ? pct : 0) + '%', borderRadius: 6,
                background: `linear-gradient(90deg, color-mix(in srgb, ${barColor} 72%, transparent), ${barColor})`,
                boxShadow: `0 0 12px color-mix(in srgb, ${barColor} 55%, transparent)`,
                transition: 'width .7s cubic-bezier(.22,1,.36,1)',
              }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
