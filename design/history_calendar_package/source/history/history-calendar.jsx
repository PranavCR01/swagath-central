// history-calendar.jsx — calendar-first History page. Mounts into #v-cal.
const { useState: cS, useMemo: cM } = React;
const HC = window.HIST;
const crupee = HC.rupee;
const DOT = { Sandhya: '#f59e0b', Manasa: '#a78bfa' };
const TXT = { Sandhya: '#f5b454', Manasa: '#bda6f6' };
const SOFT = { Sandhya: 'rgba(245,158,11,.13)', Manasa: 'rgba(167,139,250,.14)' };
const WD = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// "today" = the most recent date present in the data (keeps calendar + seed in sync)
const TODAY = (() => {
  let best = null;
  HC.E.forEach(e => { if (!best || e.y > best.y || (e.y === best.y && (e.m > best.m || (e.m === best.m && e.d > best.d)))) best = { y: e.y, m: e.m, d: e.d }; });
  return best || { y: 2026, m: 5, d: 15 };
})();

/* index entries by y-m-d-theatre for O(1) calendar lookup */
const INDEX = (() => {
  const map = {};
  HC.E.forEach(e => {
    const k = `${e.y}-${e.m}-${e.d}`;
    (map[k] = map[k] || []).push(e);
  });
  return map;
})();
function dayEntries(y, m, d, filter) {
  let list = INDEX[`${y}-${m}-${d}`] || [];
  if (filter && filter !== 'All') list = list.filter(e => e.theatre === filter);
  // Sandhya first
  return [...list].sort((a, b) => (a.theatre === 'Sandhya' ? -1 : 1) - (b.theatre === 'Sandhya' ? -1 : 1));
}
function dayStatus(y, m, d, filter) {
  const list = dayEntries(y, m, d, filter);
  if (!list.length) return 'none';
  return list.some(e => e.status === 'open') ? 'open' : 'closed';
}

/* ── chrome ── */
function Phone({ children }) {
  return (
    <div style={{ width: 384, flexShrink: 0, borderRadius: 44, padding: 5, background: 'linear-gradient(150deg,#2a2a32,#0b0b10)', boxShadow: '0 30px 80px -24px rgba(0,0,0,.8), 0 0 0 1px rgba(160,160,180,.08)' }}>
      <div style={{ height: 812, borderRadius: 39, overflow: 'hidden', background: 'var(--h-bg)', display: 'flex', flexDirection: 'column', position: 'relative' }}>{children}</div>
    </div>
  );
}
function Bar() {
  return (
    <div style={{ height: 40, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px 0 26px', fontSize: 13, fontWeight: 600, color: 'var(--h-text)' }}>
      <span style={{ fontFamily: 'var(--h-mono)' }}>9:41</span>
      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        <svg width="16" height="10" viewBox="0 0 17 11"><g fill="currentColor"><rect x="0" y="7" width="2.6" height="4" rx=".5"/><rect x="3.8" y="5" width="2.6" height="6" rx=".5"/><rect x="7.6" y="2.6" width="2.6" height="8.4" rx=".5"/><rect x="11.4" y="0" width="2.6" height="11" rx=".5"/></g></svg>
        <svg width="20" height="10" viewBox="0 0 22 11"><rect x="0.5" y="0.5" width="18" height="10" rx="2.6" fill="none" stroke="currentColor" strokeOpacity=".4"/><rect x="2" y="2" width="13" height="7" rx="1.4" fill="currentColor"/></svg>
      </div>
    </div>
  );
}
function BackArrow() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--h-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>; }
function RightArrow() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--h-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>; }

function Header({ filter, onFilter }) {
  const c = HC.counts();
  return (
    <div style={{ flexShrink: 0, padding: '2px 16px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '2px 4px 14px' }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--h-surface)', border: '1px solid var(--h-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BackArrow /></div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--h-text)', letterSpacing: '-.02em' }}>History</h1>
      </div>
      <div style={{ display: 'flex', gap: 3, padding: 3, background: 'var(--h-surface)', border: '1px solid var(--h-border)', borderRadius: 12 }}>
        {['All', 'Sandhya', 'Manasa'].map(o => {
          const on = o === filter;
          return (
            <button key={o} onClick={() => onFilter(o)} style={{ flex: 1, height: 36, borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: on ? 650 : 500, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: on ? 'var(--h-accent)' : 'transparent', color: on ? '#1a1206' : 'var(--h-muted)', transition: 'all .16s' }}>
              {o}<span style={{ fontFamily: 'var(--h-mono)', fontSize: 11, opacity: on ? .7 : .55 }}>{c[o]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── calendar ── */
function Calendar({ y, m, sel, onSel, onNav, filter }) {
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const isFuture = (d) => (y > TODAY.y) || (y === TODAY.y && m > TODAY.m) || (y === TODAY.y && m === TODAY.m && d > TODAY.d);
  const canNext = !((y === TODAY.y && m >= TODAY.m) || y > TODAY.y);

  return (
    <div style={{ margin: '0 16px', padding: 14, background: 'var(--h-surface)', border: '1px solid var(--h-border)', borderRadius: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={() => onNav(-1)} style={navBtn}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--h-text)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>
        <span style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--h-text)' }}>{MONTHS[m]} {y}</span>
        <button onClick={() => canNext && onNav(1)} style={{ ...navBtn, opacity: canNext ? 1 : .3, cursor: canNext ? 'pointer' : 'default' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--h-text)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
        {WD.map((w, i) => <div key={i} style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 600, color: 'var(--h-muted)', padding: '2px 0' }}>{w}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const status = dayStatus(y, m, d, filter);
          const isToday = y === TODAY.y && m === TODAY.m && d === TODAY.d;
          const isSel = sel && sel.y === y && sel.m === m && sel.d === d;
          const future = isFuture(d);
          const dotColor = status === 'open' ? 'var(--h-accent)' : status === 'closed' ? 'var(--h-green)' : 'transparent';
          return (
            <button key={i} onClick={() => !future && status !== 'none' && onSel({ y, m, d })}
              style={{
                aspectRatio: '1', border: 'none', borderRadius: 10, position: 'relative', cursor: (future || status === 'none') ? 'default' : 'pointer',
                background: isSel ? 'var(--h-accent)' : 'transparent',
                boxShadow: isToday && !isSel ? 'inset 0 0 0 1.5px var(--h-accent)' : 'none',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, fontFamily: 'var(--h-mono)',
                transition: 'background .15s',
              }}>
              <span style={{ fontSize: 13.5, fontWeight: isToday || isSel ? 700 : 500, color: isSel ? '#1a1206' : future ? 'rgba(107,114,128,.45)' : 'var(--h-text)' }}>{d}</span>
              <span style={{ width: 5, height: 5, borderRadius: 9, background: isSel ? (status === 'open' ? '#1a1206' : 'rgba(26,18,6,.55)') : dotColor }} />
            </button>
          );
        })}
      </div>
      {/* legend */}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 12, paddingTop: 11, borderTop: '1px solid var(--h-border)' }}>
        {[['Open', 'var(--h-accent)'], ['Closed', 'var(--h-green)'], ['Today', null]].map(([l, c]) => (
          <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--h-muted)' }}>
            {c ? <span style={{ width: 6, height: 6, borderRadius: 9, background: c }} /> : <span style={{ width: 9, height: 9, borderRadius: 9, boxShadow: 'inset 0 0 0 1.5px var(--h-accent)' }} />}
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}
const navBtn = { width: 30, height: 30, borderRadius: 9, background: 'var(--h-bg)', border: '1px solid var(--h-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };

/* ── theatre row ── */
function TheatreRow({ e }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 13px', background: 'var(--h-surface)', border: '1px solid var(--h-border)', borderRadius: 13, cursor: 'pointer' }}>
      <span style={{ width: 9, height: 9, borderRadius: 9, background: DOT[e.theatre], flexShrink: 0, boxShadow: `0 0 8px ${DOT[e.theatre]}66` }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--h-text)' }}>{e.theatre}</div>
        <div style={{ fontSize: 11.5, color: 'var(--h-muted)', marginTop: 2, fontFamily: 'var(--h-mono)' }}>{e.shows} shows · B.Cash {crupee(e.bcash)}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: 'var(--h-mono)', fontSize: 15, fontWeight: 600, color: 'var(--h-accent)' }}>{crupee(e.sales)}</div>
        <div style={{ marginTop: 3 }}>
          {e.status === 'open'
            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 600, color: 'var(--h-accent)' }}><span className="h-blink" style={{ width: 5, height: 5, borderRadius: 9, background: 'var(--h-accent)' }} />Open</span>
            : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 600, color: 'var(--h-green)' }}><span style={{ width: 5, height: 5, borderRadius: 9, background: 'var(--h-green)' }} />Closed</span>}
        </div>
      </div>
      <RightArrow />
    </div>
  );
}

function SectionLabel({ children, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px 9px' }}>
      <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--h-muted)' }}>{children}</span>
      {right}
    </div>
  );
}

/* ── recent 7 days ── */
function recentDays(filter) {
  // build last 7 calendar days from TODAY backward that have data
  const out = [];
  let cur = new Date(TODAY.y, TODAY.m, TODAY.d);
  let guard = 0;
  while (out.length < 7 && guard < 40) {
    const y = cur.getFullYear(), m = cur.getMonth(), d = cur.getDate();
    const list = dayEntries(y, m, d, filter);
    if (list.length) out.push({ y, m, d, dow: cur.getDay(), list });
    cur.setDate(cur.getDate() - 1);
    guard++;
  }
  return out;
}

function CalendarHistory() {
  const [filter, setFilter] = cS('All');
  const [view, setView] = cS({ y: TODAY.y, m: TODAY.m });
  const [sel, setSel] = cS({ y: TODAY.y, m: TODAY.m, d: TODAY.d });
  const nav = (dir) => setView(v => { const nm = v.m + dir; return { y: v.y + Math.floor(nm / 12), m: ((nm % 12) + 12) % 12 }; });
  const selList = sel ? dayEntries(sel.y, sel.m, sel.d, filter) : [];
  const recents = cM(() => recentDays(filter), [filter]);
  const dowFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const selDate = sel ? new Date(sel.y, sel.m, sel.d) : null;
  const selIsToday = sel && sel.y === TODAY.y && sel.m === TODAY.m && sel.d === TODAY.d;

  return (
    <Phone>
      <Bar />
      <Header filter={filter} onFilter={setFilter} />
      <div className="h-scroll" style={{ flex: 1, overflowY: 'auto', paddingBottom: 18 }}>
        <Calendar y={view.y} m={view.m} sel={sel} onSel={setSel} onNav={nav} filter={filter} />

        {/* selected day panel */}
        <div style={{ padding: '18px 16px 4px' }}>
          <SectionLabel right={sel && <span style={{ fontFamily: 'var(--h-mono)', fontSize: 11.5, color: 'var(--h-muted)' }}>{selList.reduce((s, e) => s + e.shows, 0)} shows · {crupee(selList.reduce((s, e) => s + e.sales, 0))}</span>}>
            {sel ? `${selIsToday ? 'Today · ' : ''}${dowFull[selDate.getDay()]}, ${sel.d} ${MONTHS[sel.m].slice(0, 3)}` : 'Select a date'}
          </SectionLabel>
          {selList.length
            ? <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{selList.map(e => <TheatreRow key={e.id} e={e} />)}</div>
            : <div style={{ padding: '24px 16px', textAlign: 'center', background: 'var(--h-surface)', border: '1px dashed var(--h-border)', borderRadius: 14 }}>
                <div style={{ fontSize: 13.5, color: 'var(--h-muted)' }}>No shows logged for this date</div>
              </div>}
        </div>

        {/* recent strip */}
        <div style={{ padding: '16px 16px 0' }}>
          <SectionLabel>Recent</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {recents.map(day => (
              <div key={`${day.y}-${day.m}-${day.d}`}>
                <button onClick={() => { setSel({ y: day.y, m: day.m, d: day.d }); setView({ y: day.y, m: day.m }); document.querySelector('#v-cal .h-scroll').scrollTop = 0; }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 2px 8px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                  <span style={{ fontFamily: 'var(--h-mono)', fontSize: 12.5, fontWeight: 600, color: 'var(--h-text)' }}>{day.d} {MONTHS[day.m].slice(0, 3)}</span>
                  <span style={{ fontSize: 11, color: 'var(--h-muted)' }}>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day.dow]}</span>
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{day.list.map(e => <TheatreRow key={e.id} e={e} />)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Phone>
  );
}

window.HISTCAL = { CalendarHistory };
