// screens-a.jsx — Login, Home, Day View
const { rupee, num } = TOPS;

/* ════════ LOGIN ════════ */
function LoginScreen({ onSignIn }) {
  const [email, setEmail] = React.useState('owner@swagath.in');
  const [pass, setPass] = React.useState('••••••••');
  const [show, setShow] = React.useState(false);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 28px', position: 'relative' }}>
      {/* ambient amber glow from "LED strips" */}
      <div style={{ position: 'absolute', top: '8%', left: '50%', transform: 'translateX(-50%)', width: 320, height: 220, background: 'radial-gradient(ellipse, color-mix(in srgb, var(--accent) 14%, transparent), transparent 70%)', filter: 'blur(20px)', pointerEvents: 'none' }} />
      <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 40, position: 'relative' }}>
        <Mark size={92} />
        <h1 style={{ fontSize: 30, fontWeight: 700, color: 'var(--text)', margin: '22px 0 0', letterSpacing: '-.02em' }}>Theatre Ops</h1>
        <p style={{ fontSize: 15, color: 'var(--purple-text)', margin: '8px 0 0', fontWeight: 500, letterSpacing: '.03em' }}>Sandhya &amp; Manasa</p>
      </div>
      <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 16, animationDelay: '.08s' }}>
        <Field label="Email" icon="mail" value={email} onChange={setEmail} placeholder="you@swagath.in" />
        <Field label="Password" icon="lock" type={show ? 'text' : 'password'} value={pass} onChange={setPass}
          trailing={<button onClick={() => setShow(s => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}><Icon name="eye" size={18} color="var(--muted)" /></button>} />
        <div style={{ height: 6 }} />
        <Btn full size="lg" onClick={onSignIn}>Sign In</Btn>
      </div>
      <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--muted)', marginTop: 28, opacity: .7 }}>Swagath Enterprises · Bengaluru</p>
    </div>
  );
}

/* ════════ HOME ════════ */
function AppHeader({ title, right, left }) {
  return (
    <div style={{ flexShrink: 0, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', borderBottom: '1px solid var(--card-border)', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>{left}{title}</div>
      {right}
    </div>
  );
}

function TheatreCard({ t, onOpen }) {
  const rev = TOPS.theatreRevenue(t);
  const count = TOPS.showsToday(t);
  return (
    <Card glow onClick={onOpen} style={{ padding: 20 }}>
      {/* faint film-reel watermark */}
      <div style={{ position: 'absolute', right: -22, top: -22, opacity: .05, pointerEvents: 'none' }}><Icon name="reel" size={130} color="var(--purple-text)" stroke={1.2} /></div>
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: '-.02em' }}>{t.name}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>{t.city}</div>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--purple-text)', background: 'var(--purple-chip)', padding: '6px 11px', borderRadius: 999, fontWeight: 600 }}>
            <Icon name="ticket" size={15} color="var(--purple-text)" />{count} {count === 1 ? 'show' : 'shows'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 22 }}>
          <div>
            <div style={{ fontSize: 11.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>Today's revenue</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 34, fontWeight: 600, color: 'var(--accent)', letterSpacing: '-.01em', marginTop: 4, textShadow: '0 0 28px var(--accent-glow)' }}>{rupee(rev)}</div>
          </div>
          <span className="open-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--accent)', fontWeight: 650, fontSize: 15 }}>
            Open <Icon name="chevron" size={17} color="var(--accent)" />
          </span>
        </div>
      </div>
    </Card>
  );
}

function HomeScreen({ data, onOpen, onLogout, onInsights }) {
  return (
    <>
      <AppHeader
        title={<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Mark size={26} /><span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Theatre Ops</span></div>}
        right={<div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onInsights} style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon name="chart" size={19} color="var(--muted)" /></button>
          <button onClick={onLogout} style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon name="logout" size={19} color="var(--muted)" /></button>
        </div>}
      />
      <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>{TOPS.TODAY}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginTop: 2, letterSpacing: '-.02em' }}>Good evening, Owner</div>
        </div>
        <div className="home-grid" style={{ display: 'grid', gap: 16 }}>
          {Object.values(data.theatres).map(t => <TheatreCard key={t.id} t={t} onOpen={() => onOpen(t.id)} />)}
        </div>
        <div onClick={onInsights} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
          <SummaryStat label="Combined revenue" value={rupee(Object.values(data.theatres).reduce((s, t) => s + TOPS.theatreRevenue(t), 0))} icon="coins" />
          <SummaryStat label="Shows logged today" value={Object.values(data.theatres).reduce((s, t) => s + TOPS.showsToday(t), 0)} icon="reel" />
        </div>
        <button onClick={onInsights} className="t-card-tap" style={{ width: '100%', marginTop: 12, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, background: 'var(--purple-chip)', border: '1px solid var(--purple-border)', borderRadius: 'var(--r-btn)', color: 'var(--purple-text)', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          <Icon name="chart" size={18} color="var(--purple-text)" />View Insights &amp; Suggestions
          <Icon name="chevron" size={16} color="var(--purple-text)" />
        </button>
      </div>
    </>
  );
}

function SummaryStat({ label, value, icon }) {
  return (
    <Card style={{ padding: 16 }}>
      <Icon name={icon} size={18} color="var(--muted)" />
      <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 600, color: 'var(--text)', marginTop: 10 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{label}</div>
    </Card>
  );
}

/* ════════ DAY VIEW ════════ */
function ShowRow({ show, onOpen }) {
  return (
    <Card onClick={onOpen} style={{ padding: '15px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 46, height: 46, borderRadius: 13, background: 'var(--purple-chip)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: 'var(--purple-text)', fontWeight: 600, letterSpacing: '.06em' }}>SHOW</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 19, fontWeight: 600, color: 'var(--text)', lineHeight: 1 }}>{show.n}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 650, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{show.movie}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
            <span style={{ fontFamily: 'var(--mono)' }}>{show.time}</span>
            <span style={{ fontSize: 11.5, color: 'var(--purple-text)', background: 'var(--purple-chip)', padding: '1px 7px', borderRadius: 6, fontWeight: 600 }}>{show.lang}</span>
            {show.status !== 'pending' && <span style={{ color: occColor(show.occ), fontWeight: 600 }}>{show.occ}%</span>}
            {show.date && show.date !== '2026-06-03' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--purple-text)', background: 'var(--purple-chip)', padding: '1px 7px', borderRadius: 6, fontWeight: 600 }}><Icon name="calendar" size={11} color="var(--purple-text)" />{show.dateLabel ? show.dateLabel.replace(/ · .*$/, '') : 'Back-dated'}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
          <Badge status={show.status} />
          {show.status !== 'pending' && <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, color: 'var(--accent)' }}>{rupee(TOPS.showRevenue(show))}</span>}
        </div>
      </div>
    </Card>
  );
}
function occColor(o) { return o >= 80 ? 'var(--green)' : o >= 50 ? 'var(--accent)' : 'var(--muted)'; }

function DayScreen({ theatre, onBack, onOpenShow, onAddShow, onClose }) {
  const total = TOPS.theatreRevenue(theatre);
  return (
    <>
      <AppHeader
        left={<button onClick={onBack} style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--surface)', border: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginRight: 4 }}><Icon name="back" size={19} color="var(--text)" /></button>}
        title={<div><div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', lineHeight: 1.1 }}>{theatre.name}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{TOPS.TODAY}</div></div>}
        right={<div style={{ textAlign: 'right' }}><div style={{ fontSize: 10.5, color: 'var(--muted)', letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 600 }}>Running</div><div style={{ fontFamily: 'var(--mono)', fontSize: 17, fontWeight: 600, color: 'var(--accent)' }}>{rupee(total)}</div></div>}
      />
      <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: 18, paddingBottom: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {theatre.shows.map(s => <ShowRow key={s.id} show={s} onOpen={() => onOpenShow(s.id)} />)}
        </div>
      </div>
      <div style={{ flexShrink: 0, display: 'flex', gap: 12, padding: '14px 18px', borderTop: '1px solid var(--card-border)', background: 'var(--bg)' }}>
        <Btn full icon="plus" onClick={onAddShow}>Add Show</Btn>
        <Ghost icon="check" tone="muted" onClick={onClose} style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>Close Day</Ghost>
      </div>
    </>
  );
}

Object.assign(window, { LoginScreen, HomeScreen, DayScreen, AppHeader });
