import { Sparkles } from 'lucide-react'
import { AiBadge } from './shared'

export default function NarrativeCard({ lines }: { lines: string[] }) {
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
