import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import swagathMark from '@/assets/swagath-mark.png'

function DarkInput({
  id, type, label, value, onChange, autoComplete,
}: {
  id: string; type: string; label: string; value: string
  onChange: (v: string) => void; autoComplete?: string
}) {
  const [focus, setFocus] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label
        htmlFor={id}
        style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)' }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        required
        style={{
          height: 48, padding: '0 14px', boxSizing: 'border-box',
          background: focus ? 'var(--input-bg-focus)' : 'var(--input-bg)',
          border: `1.5px solid ${focus ? 'var(--accent)' : 'var(--input-border)'}`,
          borderRadius: 'var(--r-input)',
          color: 'var(--text)', fontSize: 16, outline: 'none',
          fontFamily: 'inherit',
          boxShadow: focus ? '0 0 0 4px var(--accent-ring)' : 'none',
          transition: 'border-color .18s, box-shadow .18s',
        }}
      />
    </div>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }
    navigate('/home')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        width: '100%', maxWidth: 360,
        background: 'var(--surface)',
        border: '1px solid var(--card-border)',
        borderRadius: 'var(--r-card)',
        padding: '32px 24px',
      }}>

        {/* Logo + title */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 28 }}>
          <img
            src={swagathMark}
            alt="Swagath"
            style={{ width: 80, height: 80, objectFit: 'contain', marginBottom: 14,
              filter: 'drop-shadow(0 4px 18px rgba(245,158,11,.18))' }}
          />
          <h1 style={{
            margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text)',
            letterSpacing: '-.01em',
          }}>
            Swagath Central
          </h1>
          <p style={{
            marginTop: 4, fontSize: 13, color: 'var(--purple-text)', fontWeight: 500,
          }}>
            Sandhya &amp; Manasa
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <DarkInput
            id="email"
            type="email"
            label="Email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
          />
          <DarkInput
            id="password"
            type="password"
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />

          {error && (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--red)', fontWeight: 500 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4,
              height: 52, width: '100%',
              background: loading ? 'rgba(245,158,11,0.6)' : 'var(--accent)',
              color: 'var(--accent-ink)',
              border: 'none', borderRadius: 'var(--r-btn)',
              fontWeight: 650, fontSize: 16, cursor: loading ? 'default' : 'pointer',
              boxShadow: '0 6px 22px -8px var(--accent-glow)',
              transition: 'background .15s',
              fontFamily: 'inherit',
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

      </div>
    </div>
  )
}
