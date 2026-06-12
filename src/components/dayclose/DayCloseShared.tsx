import { useState } from 'react'
import { Sparkles } from 'lucide-react'

export function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <span style={{
        fontSize: 11, fontWeight: 700, color: 'var(--muted)',
        letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--card-border)' }} />
    </div>
  )
}

export function NumberInput({
  value, onChange, disabled, width, placeholder,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  width?: number
  placeholder?: string
}) {
  const [focus, setFocus] = useState(false)
  return (
    <input
      type="text"
      inputMode="numeric"
      value={value}
      onChange={e => onChange(e.target.value.replace(/[^\d]/g, ''))}
      disabled={disabled}
      placeholder={placeholder ?? '0'}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{
        width: width ?? 82, height: 38, padding: '0 8px', boxSizing: 'border-box',
        background: focus ? 'var(--input-bg-focus)' : 'var(--input-bg)',
        border: `1.5px solid ${focus ? 'var(--accent)' : 'var(--input-border)'}`,
        borderRadius: 8, color: 'var(--text)', fontSize: 14, outline: 'none',
        fontFamily: 'var(--mono)', textAlign: 'right',
        opacity: disabled ? 0.6 : 1,
        boxShadow: focus ? '0 0 0 3px var(--accent-ring)' : 'none',
        transition: 'border-color .15s, box-shadow .15s',
      }}
    />
  )
}

export function AiSummaryButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 52, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
        background: 'var(--purple-chip)', border: '1px solid var(--purple-border)', borderRadius: 14,
        color: 'var(--purple-text)', cursor: 'pointer', fontFamily: 'inherit',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 650, fontSize: 15 }}>
        <Sparkles size={16} />Generate AI Summary
      </span>
      <span style={{ fontSize: 11, color: 'var(--muted)' }}>Powered by Groq</span>
    </button>
  )
}
