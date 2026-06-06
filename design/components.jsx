// components.jsx — Theatre Ops UI primitives. Exports to window.
const { useState, useRef, useEffect } = React;

/* ── Icons (minimal line set + cinema motifs) ───────────────── */
function Icon({ name, size = 20, color = 'currentColor', stroke = 1.8, style }) {
  const p = { fill: 'none', stroke: color, strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    back:   <path d="M15 18l-6-6 6-6" {...p} />,
    chevron:<path d="M9 6l6 6-6 6" {...p} />,
    logout: <g {...p}><path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3" /><path d="M10 12H3" /><path d="M6 8l-3 4 3 4" /></g>,
    plus:   <g {...p}><path d="M12 5v14" /><path d="M5 12h14" /></g>,
    trash:  <g {...p}><path d="M4 7h16" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /></g>,
    mail:   <g {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3.5 7l8.5 6 8.5-6" /></g>,
    lock:   <g {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></g>,
    eye:    <g {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></g>,
    warn:   <g {...p}><path d="M12 3l9 16H3l9-16Z" /><path d="M12 10v4" /><circle cx="12" cy="17" r="0.5" fill={color} stroke="none" /></g>,
    check:  <path d="M4 12l5 5 11-11" {...p} />,
    x:      <g {...p}><path d="M6 6l12 12" /><path d="M18 6L6 18" /></g>,
    reel:   <g {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="6.5" r="1.4" /><circle cx="12" cy="17.5" r="1.4" /><circle cx="6.5" cy="12" r="1.4" /><circle cx="17.5" cy="12" r="1.4" /></g>,
    ticket: <g {...p}><path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1 0 4 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-4 2 2 0 0 1 0-4Z" /><path d="M14 6v12" strokeDasharray="2 2.5" /></g>,
    parking:<g {...p}><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M9 17V7h4a3 3 0 0 1 0 6H9" /></g>,
    popcorn:<g {...p}><path d="M6 9l1.4 11h9.2L18 9" /><path d="M5 9a2 2 0 0 1 1-3.7A2.4 2.4 0 0 1 10 4a2.4 2.4 0 0 1 4 0 2.4 2.4 0 0 1 4 1.3A2 2 0 0 1 19 9Z" /><path d="M10 12v5M14 12v5" /></g>,
    cup:    <g {...p}><path d="M6 7h12l-1 12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7Z" /><path d="M5 7h14" /><path d="M10 3l-1 4M14 3l1 4" /></g>,
    wallet: <g {...p}><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M3 10h18" /><circle cx="17" cy="14.5" r="1.2" fill={color} stroke="none" /></g>,
    coins:  <g {...p}><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" /><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" /></g>,
    user:   <g {...p}><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></g>,
    receipt:<g {...p}><path d="M6 3h12v18l-2.5-1.5L13 21l-2.5-1.5L8 21l-2-1.5V3Z" /><path d="M9 8h6M9 12h6M9 16h3" /></g>,
    chart:  <g {...p}><path d="M4 20V4" /><path d="M4 20h16" /><path d="M8 16v-4M12.5 16V8M17 16v-7" /></g>,
    clock:  <g {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></g>,
    fan:    <g {...p}><circle cx="12" cy="12" r="2" /><path d="M12 10c.6-3.5-1-6-3.5-6.5C7 3 6 5 7.5 6.8 9 8.5 11 9.4 12 10Z" /><path d="M14 12c3.5-.6 6 1 6.5 3.5.2 1.5-1.8 2.5-3.6 1-1.7-1.5-2.3-3.5-2.9-4.5Z" /><path d="M10 14c-.6 3.5 1 6 3.5 6.5 1.5.2 2.5-1.8 1-3.6C13 15 11 14.6 10 14Z" /></g>,
    calendar:<g {...p}><rect x="3.5" y="5" width="17" height="16" rx="2.5" /><path d="M3.5 9.5h17" /><path d="M8 3v4M16 3v4" /></g>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden="true">{paths[name]}</svg>;
}

/* ── Swagath logo mark ──────────────────────────────────────── */
function Mark({ size = 64 }) {
  return <img src="assets/swagath-mark.png" alt="Swagath Enterprises"
    style={{ width: size, height: 'auto', display: 'block', filter: 'drop-shadow(0 4px 18px rgba(245,158,11,.18))' }} />;
}

/* ── Buttons ────────────────────────────────────────────────── */
function Btn({ children, onClick, full, icon, disabled, size = 'md', style }) {
  const [press, setPress] = useState(false);
  const pad = size === 'lg' ? '0 22px' : '0 18px';
  const h = size === 'lg' ? 54 : 48;
  return (
    <button className="t-btn" onClick={onClick} disabled={disabled}
      onPointerDown={() => setPress(true)} onPointerUp={() => setPress(false)} onPointerLeave={() => setPress(false)}
      style={{
        height: h, padding: pad, width: full ? '100%' : 'auto',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9,
        background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none',
        borderRadius: 'var(--r-btn)', fontWeight: 650, fontSize: 16, letterSpacing: '.01em',
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? .4 : 1,
        transform: press ? 'scale(.975)' : 'scale(1)', transition: 'transform .12s ease, box-shadow .2s',
        boxShadow: press ? 'none' : '0 6px 22px -8px var(--accent-glow)', ...style,
      }}>
      {icon && <Icon name={icon} size={19} color="var(--accent-ink)" stroke={2} />}
      {children}
    </button>
  );
}
function Ghost({ children, onClick, full, icon, tone = 'accent', size = 'md', style }) {
  const [press, setPress] = useState(false);
  const col = tone === 'red' ? 'var(--red)' : tone === 'muted' ? 'var(--muted)' : 'var(--accent)';
  const h = size === 'lg' ? 54 : 48;
  return (
    <button className="t-btn" onClick={onClick}
      onPointerDown={() => setPress(true)} onPointerUp={() => setPress(false)} onPointerLeave={() => setPress(false)}
      style={{
        height: h, padding: '0 18px', width: full ? '100%' : 'auto',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        background: 'transparent', color: col, border: `1.5px solid color-mix(in srgb, ${col} 42%, transparent)`,
        borderRadius: 'var(--r-btn)', fontWeight: 600, fontSize: 15,
        cursor: 'pointer', transform: press ? 'scale(.975)' : 'scale(1)', transition: 'transform .12s ease',
        ...style,
      }}>
      {icon && <Icon name={icon} size={18} color={col} />}
      {children}
    </button>
  );
}

/* ── Card ───────────────────────────────────────────────────── */
function Card({ children, onClick, glow, style }) {
  return (
    <div onClick={onClick} className={'t-card' + (onClick ? ' t-card-tap' : '')}
      style={{
        background: 'linear-gradient(160deg, var(--surface-2), var(--surface))',
        border: '1px solid var(--card-border)', borderRadius: 'var(--r-card)',
        position: 'relative', overflow: 'hidden',
        boxShadow: glow ? '0 0 0 1px var(--purple-border) inset' : 'none',
        cursor: onClick ? 'pointer' : 'default', ...style,
      }}>
      {children}
    </div>
  );
}

/* ── Status badge ───────────────────────────────────────────── */
function Badge({ status }) {
  const s = TOPS.STATUS[status] || TOPS.STATUS.pending;
  const tones = {
    green: { bg: 'color-mix(in srgb, var(--green) 16%, transparent)', fg: 'var(--green)' },
    amber: { bg: 'color-mix(in srgb, var(--accent) 16%, transparent)', fg: 'var(--accent)' },
    red:   { bg: 'color-mix(in srgb, var(--red) 16%, transparent)', fg: 'var(--red)' },
    muted: { bg: 'rgba(255,255,255,.05)', fg: 'var(--muted)' },
  };
  const c = tones[s.tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, height: 24, padding: '0 10px',
      borderRadius: 999, background: c.bg, color: c.fg, fontSize: 12, fontWeight: 600,
      letterSpacing: '.02em', whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: 11 }}>{s.dot}</span>{s.label}
    </span>
  );
}

/* ── Text field ─────────────────────────────────────────────── */
function Field({ label, icon, value, onChange, type = 'text', placeholder, trailing }) {
  const [focus, setFocus] = useState(false);
  return (
    <label style={{ display: 'block' }}>
      {label && <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8, fontWeight: 500 }}>{label}</div>}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, height: 52, padding: '0 14px',
        background: 'var(--input-bg)', borderRadius: 'var(--r-input)',
        border: `1.5px solid ${focus ? 'var(--accent)' : 'var(--input-border)'}`,
        boxShadow: focus ? '0 0 0 4px var(--accent-ring)' : 'none', transition: 'border-color .18s, box-shadow .18s',
      }}>
        {icon && <Icon name={icon} size={19} color={focus ? 'var(--accent)' : 'var(--muted)'} />}
        <input type={type} value={value} placeholder={placeholder}
          onChange={e => onChange && onChange(e.target.value)}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--text)', fontSize: 16, fontFamily: 'inherit', minWidth: 0,
          }} />
        {trailing}
      </div>
    </label>
  );
}

/* ── Number cell (compact OB/REC/CB inputs) ─────────────────── */
function NumCell({ value, onChange, w = 54, placeholder = '0', accent }) {
  const [focus, setFocus] = useState(false);
  return (
    <input inputMode="numeric" value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value.replace(/[^\d]/g, ''))}
      onFocus={e => { setFocus(true); e.target.select(); }} onBlur={() => setFocus(false)}
      style={{
        width: w, height: 44, textAlign: 'center', boxSizing: 'border-box',
        background: focus ? 'var(--input-bg-focus)' : 'var(--input-bg)',
        border: `1.5px solid ${focus ? 'var(--accent)' : 'var(--input-border)'}`,
        borderRadius: 10, color: accent ? 'var(--accent)' : 'var(--text)',
        fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 500, outline: 'none',
        boxShadow: focus ? '0 0 0 3px var(--accent-ring)' : 'none', transition: 'border-color .15s, box-shadow .15s',
      }} />
  );
}

/* ── Tab bar ────────────────────────────────────────────────── */
function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--card-border)' }}>
      {tabs.map(t => {
        const on = t.id === active;
        return (
          <button key={t.id} onClick={() => onChange(t.id)}
            style={{
              flex: 1, height: 46, background: 'transparent', border: 'none', cursor: 'pointer',
              color: on ? 'var(--text)' : 'var(--muted)', fontSize: 14.5, fontWeight: on ? 650 : 500,
              fontFamily: 'inherit', position: 'relative', transition: 'color .18s',
            }}>
            {t.name}
            <span style={{
              position: 'absolute', left: 8, right: 8, bottom: -1, height: 2.5, borderRadius: 2,
              background: 'var(--accent)', transform: on ? 'scaleX(1)' : 'scaleX(0)',
              transition: 'transform .25s cubic-bezier(.4,0,.2,1)', boxShadow: '0 0 10px var(--accent-glow)',
            }} />
          </button>
        );
      })}
    </div>
  );
}

/* ── Section divider with label ─────────────────────────────── */
function Divider({ label, icon }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon && <Icon name={icon} size={16} color="var(--muted)" />}
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>{label}</span>
      </div>
      <div style={{ flex: 1, height: 1, background: 'var(--card-border)' }} />
    </div>
  );
}

/* ── Custom phone/tablet frame ──────────────────────────────── */
function DeviceFrame({ width = 390, children }) {
  const radius = width > 600 ? 34 : 46;
  return (
    <div style={{
      width, maxWidth: '100%', height: '100%', maxHeight: '100%',
      borderRadius: radius, padding: 5, boxSizing: 'border-box',
      background: 'linear-gradient(150deg, #2a2733, #0c0b12)',
      boxShadow: '0 40px 120px -30px rgba(0,0,0,.9), 0 0 0 1px rgba(160,120,200,.12), inset 0 0 0 1px rgba(255,255,255,.04)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        width: '100%', height: '100%', borderRadius: radius - 5, overflow: 'hidden',
        background: 'var(--bg)', position: 'relative', display: 'flex', flexDirection: 'column',
      }}>
        {children}
      </div>
    </div>
  );
}

/* ── Phone status bar (cinematic, theme-tinted) ─────────────── */
function StatusBar() {
  return (
    <div style={{
      height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 26px 0 30px', fontSize: 14.5, fontWeight: 600, color: 'var(--text)',
    }}>
      <span style={{ fontFamily: 'var(--mono)', letterSpacing: '.02em' }}>9:41</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="17" height="11" viewBox="0 0 17 11"><g fill="currentColor"><rect x="0" y="7" width="2.6" height="4" rx=".5"/><rect x="3.8" y="5" width="2.6" height="6" rx=".5"/><rect x="7.6" y="2.6" width="2.6" height="8.4" rx=".5"/><rect x="11.4" y="0" width="2.6" height="11" rx=".5"/></g></svg>
        <svg width="22" height="11" viewBox="0 0 22 11"><rect x="0.5" y="0.5" width="18" height="10" rx="2.6" fill="none" stroke="currentColor" strokeOpacity=".4"/><rect x="2" y="2" width="14" height="7" rx="1.4" fill="currentColor"/><rect x="20" y="3.5" width="1.6" height="4" rx=".8" fill="currentColor" fillOpacity=".4"/></svg>
      </div>
    </div>
  );
}

Object.assign(window, { Icon, Mark, Btn, Ghost, Card, Badge, Field, NumCell, Tabs, Divider, DeviceFrame, StatusBar });
