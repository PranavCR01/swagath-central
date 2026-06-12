import { Sparkles } from 'lucide-react'

export const TREND: Record<string, { ch: string; c: string }> = {
  up: { ch: '↑', c: 'var(--green)' },
  down: { ch: '↓', c: 'var(--red)' },
  flat: { ch: '→', c: 'var(--muted)' },
}

export function ordinal(n: number): string {
  return n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'
}

export function fmtDateLabel(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function AiBadge() {
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

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', borderRadius: 'var(--r-card)', ...style }}>
      {children}
    </div>
  )
}
