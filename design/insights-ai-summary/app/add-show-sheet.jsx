// add-show-sheet.jsx — "Add Show" bottom sheet form. Exports window.AddShowSheet
const { useState: useSheetState, useMemo: useSheetMemo, useEffect: useSheetEffect } = React;

const LANGS = ['Kannada', 'Hindi', 'Tamil', 'Telugu', 'English', 'Other'];

// app "today" anchor (matches TOPS.TODAY = Tue, 3 Jun 2026)
const APP_TODAY = new Date(2026, 5, 3);
const isoOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const TODAY_ISO = isoOf(APP_TODAY);
const YESTERDAY_ISO = (() => { const d = new Date(APP_TODAY); d.setDate(d.getDate() - 1); return isoOf(d); })();
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function prettyDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const tag = iso === TODAY_ISO ? 'Today' : iso === YESTERDAY_ISO ? 'Yesterday' : null;
  const base = `${DOW[dt.getDay()]}, ${d} ${MON[m - 1]} ${y}`;
  return tag ? `${tag} · ${base}` : base;
}

/* toggle switch */
function Switch({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} role="switch" aria-checked={on}
      style={{
        width: 52, height: 30, flexShrink: 0, borderRadius: 999, border: 'none', cursor: 'pointer', padding: 3,
        background: on ? 'var(--accent)' : 'rgba(255,255,255,0.10)', transition: 'background .22s',
        display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start', alignItems: 'center',
      }}>
      <span style={{ width: 24, height: 24, borderRadius: '50%', background: on ? 'var(--accent-ink)' : '#cfc9da', transition: 'background .22s', boxShadow: '0 1px 3px rgba(0,0,0,.4)' }} />
    </button>
  );
}

/* language pill */
function LangPill({ label, on, onClick }) {
  return (
    <button onClick={onClick}
      style={{
        height: 40, padding: '0 15px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
        fontSize: 14, fontWeight: on ? 650 : 500, whiteSpace: 'nowrap',
        background: on ? 'var(--accent)' : 'var(--input-bg)',
        color: on ? 'var(--accent-ink)' : 'var(--muted)',
        border: `1.5px solid ${on ? 'transparent' : 'var(--input-border)'}`,
        boxShadow: on ? '0 4px 14px -4px var(--accent-glow)' : 'none', transition: 'all .18s',
      }}>
      {label}
    </button>
  );
}

/* compact ticket-class input with label above */
function TicketInput({ label, value, onChange }) {
  const [focus, setFocus] = useSheetState(false);
  return (
    <label style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
      <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, letterSpacing: '.03em', textAlign: 'center' }}>{label}</span>
      <input inputMode="numeric" value={value} placeholder="0"
        onChange={e => onChange(e.target.value.replace(/[^\d]/g, ''))}
        onFocus={e => { setFocus(true); e.target.select(); }} onBlur={() => setFocus(false)}
        style={{
          width: '100%', height: 52, textAlign: 'center', boxSizing: 'border-box',
          background: focus ? 'var(--input-bg-focus)' : 'var(--input-bg)',
          border: `1.5px solid ${focus ? 'var(--accent)' : 'var(--input-border)'}`,
          borderRadius: 'var(--r-input)', color: 'var(--text)',
          fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 600, outline: 'none',
          boxShadow: focus ? '0 0 0 4px var(--accent-ring)' : 'none', transition: 'border-color .15s, box-shadow .15s',
        }} />
    </label>
  );
}

/* computed read-only stat (Total / Occupancy) */
function ComputedStat({ label, value, sub }) {
  return (
    <div style={{ flex: 1, padding: '12px 16px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: 'var(--r-input)' }}>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 500 }}>{label}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 26, fontWeight: 600, color: 'var(--accent)', textShadow: '0 0 18px var(--accent-glow)', marginTop: 3, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5, opacity: .8 }}>{sub}</div>}
    </div>
  );
}

function AddShowSheet({ theatre, nextN, onClose, onSave }) {
  const [time, setTime] = useSheetState('');
  const [date, setDate] = useSheetState(TODAY_ISO);
  const [movie, setMovie] = useSheetState('');
  const [lang, setLang] = useSheetState('');
  const [fan, setFan] = useSheetState(false);
  const [box, setBox] = useSheetState('');
  const [gold, setGold] = useSheetState('');
  const [silver, setSilver] = useSheetState('');
  const [show, setShow] = useSheetState(false);   // drives slide-up animation
  const [timeFocus, setTimeFocus] = useSheetState(false);
  const [dateFocus, setDateFocus] = useSheetState(false);
  const [movieFocus, setMovieFocus] = useSheetState(false);

  useSheetEffect(() => { const id = setTimeout(() => setShow(true), 20); return () => clearTimeout(id); }, []);

  const total = (parseInt(box, 10) || 0) + (parseInt(gold, 10) || 0) + (parseInt(silver, 10) || 0);
  const occ = theatre.capacity ? Math.round((total / theatre.capacity) * 1000) / 10 : 0;
  const valid = time && movie.trim() && lang;

  const close = (after) => { setShow(false); setTimeout(() => after ? after() : onClose(), 260); };

  const save = () => {
    if (!valid) return;
    close(() => onSave({
      date, dateLabel: prettyDate(date),
      time: formatTime(time), movie: movie.trim(), lang, fan,
      tickets: { box: parseInt(box, 10) || 0, gold: parseInt(gold, 10) || 0, silver: parseInt(silver, 10) || 0 },
      occ: Math.round(occ),
    }));
  };

  const fieldBox = (focused) => ({
    display: 'flex', alignItems: 'center', gap: 10, height: 52, padding: '0 14px',
    background: 'var(--input-bg)', borderRadius: 'var(--r-input)',
    border: `1.5px solid ${focused ? 'var(--accent)' : 'var(--input-border)'}`,
    boxShadow: focused ? '0 0 0 4px var(--accent-ring)' : 'none', transition: 'border-color .18s, box-shadow .18s',
  });

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 60, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      {/* scrim */}
      <div onClick={() => close()} style={{ position: 'absolute', inset: 0, background: 'rgba(4,3,8,0.62)', backdropFilter: 'blur(2px)', opacity: show ? 1 : 0, transition: 'opacity .26s' }} />

      {/* sheet */}
      <div style={{
        position: 'relative', maxHeight: '88%', display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(180deg, var(--surface-2), var(--surface))',
        borderTopLeftRadius: 26, borderTopRightRadius: 26,
        borderTop: '1px solid var(--purple-border)', boxShadow: '0 -24px 60px -12px rgba(0,0,0,.7)',
        transform: show ? 'translateY(0)' : 'translateY(100%)', transition: 'transform .3s cubic-bezier(.22,1,.36,1)',
      }}>
        {/* drag handle + header */}
        <div style={{ flexShrink: 0, padding: '10px 18px 14px', borderBottom: '1px solid var(--card-border)' }}>
          <div style={{ width: 38, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.18)', margin: '0 auto 14px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--text)', letterSpacing: '-.02em' }}>Add Show</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 1 }}>{theatre.name} · {prettyDate(date)}</div>
            </div>
            <button onClick={() => close()} style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--surface)', border: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Icon name="x" size={18} color="var(--muted)" />
            </button>
          </div>
        </div>

        {/* scrollable body */}
        <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Show # */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 64, height: 64, flexShrink: 0, borderRadius: 16, background: 'var(--purple-chip)', border: '1px solid var(--purple-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 10, color: 'var(--purple-text)', fontWeight: 600, letterSpacing: '.08em' }}>SHOW</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 600, color: 'var(--text)', lineHeight: 1 }}>{nextN}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.45 }}>Auto-numbered as the next show of the day. Fill in the details below.</div>
          </div>

          {/* Show date */}
          <div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8, fontWeight: 500 }}>Show date</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              {[{ id: TODAY_ISO, label: 'Today' }, { id: YESTERDAY_ISO, label: 'Yesterday' }].map(c => {
                const on = date === c.id;
                return (
                  <button key={c.id} onClick={() => setDate(c.id)}
                    style={{ height: 38, padding: '0 16px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: on ? 650 : 500,
                      background: on ? 'var(--accent)' : 'var(--input-bg)', color: on ? 'var(--accent-ink)' : 'var(--muted)',
                      border: `1.5px solid ${on ? 'transparent' : 'var(--input-border)'}`, boxShadow: on ? '0 4px 14px -4px var(--accent-glow)' : 'none', transition: 'all .18s' }}>
                    {c.label}
                  </button>
                );
              })}
            </div>
            <div style={fieldBox(dateFocus)}>
              <Icon name="calendar" size={19} color={dateFocus ? 'var(--accent)' : 'var(--muted)'} />
              <input type="date" value={date} max={TODAY_ISO} onChange={e => setDate(e.target.value)}
                onFocus={() => setDateFocus(true)} onBlur={() => setDateFocus(false)}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 16, fontFamily: 'var(--mono)', colorScheme: 'dark', minWidth: 0 }} />
            </div>
            {date !== TODAY_ISO && (
              <div style={{ fontSize: 12, color: 'var(--purple-text)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="clock" size={13} color="var(--purple-text)" />
                Back-dated entry · {prettyDate(date)}
              </div>
            )}
          </div>

          {/* Start Time */}
          <label style={{ display: 'block' }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8, fontWeight: 500 }}>Start time <span style={{ color: 'var(--accent)' }}>*</span></div>
            <div style={fieldBox(timeFocus)}>
              <Icon name="clock" size={19} color={timeFocus ? 'var(--accent)' : 'var(--muted)'} />
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                onFocus={() => setTimeFocus(true)} onBlur={() => setTimeFocus(false)}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 16, fontFamily: 'var(--mono)', colorScheme: 'dark', minWidth: 0 }} />
            </div>
          </label>

          {/* Movie Name */}
          <label style={{ display: 'block' }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8, fontWeight: 500 }}>Movie name <span style={{ color: 'var(--accent)' }}>*</span></div>
            <div style={fieldBox(movieFocus)}>
              <Icon name="ticket" size={19} color={movieFocus ? 'var(--accent)' : 'var(--muted)'} />
              <input value={movie} placeholder="e.g. KGF Chapter 2" onChange={e => setMovie(e.target.value)}
                onFocus={() => setMovieFocus(true)} onBlur={() => setMovieFocus(false)}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 16, fontFamily: 'inherit', minWidth: 0 }} />
            </div>
          </label>

          {/* Language */}
          <div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10, fontWeight: 500 }}>Language <span style={{ color: 'var(--accent)' }}>*</span></div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {LANGS.map(l => <LangPill key={l} label={l} on={lang === l} onClick={() => setLang(l)} />)}
            </div>
          </div>

          {/* Fan Show */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: 'var(--r-input)' }}>
            <Icon name="fan" size={20} color={fan ? 'var(--accent)' : 'var(--muted)'} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text)' }}>Fan show</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>First-day-first-show or special event</div>
            </div>
            <Switch on={fan} onChange={setFan} />
          </div>

          {/* TICKETS & OCCUPANCY section */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 12 }}>Tickets &amp; Occupancy</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <TicketInput label="Box" value={box} onChange={setBox} />
              <TicketInput label="Gold" value={gold} onChange={setGold} />
              <TicketInput label="Silver" value={silver} onChange={setSilver} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <ComputedStat label="Total tickets" value={TOPS.num(total)} />
              <ComputedStat label="Occupancy" value={occ.toFixed(1) + '%'} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', opacity: .65, marginTop: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Icon name="user" size={12} color="var(--muted)" />
              {theatre.name} · {TOPS.num(theatre.capacity)} seats
            </div>
          </div>
        </div>

        {/* sticky save */}
        <div style={{ flexShrink: 0, padding: '14px 18px', borderTop: '1px solid var(--card-border)', background: 'var(--surface)' }}>
          <Btn full size="lg" icon="check" disabled={!valid} onClick={save}>Save Show</Btn>
        </div>
      </div>
    </div>
  );
}

/* 24h "18:45" -> "6:45 PM" */
function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

Object.assign(window, { AddShowSheet });
