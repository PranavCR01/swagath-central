// app.jsx — root: state, navigation, scaling stage, tweaks
const { useState, useEffect, useRef, useMemo } = React;

/* immutable deep set: setIn(obj, 'a.b.c', val) */
function setIn(obj, path, val) {
  const keys = path.split('.');
  const clone = Array.isArray(obj) ? [...obj] : { ...obj };
  let cur = clone;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    cur[k] = Array.isArray(cur[k]) ? [...cur[k]] : { ...cur[k] };
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = val;
  return clone;
}

const DEVICES = {
  iphone: { w: 390, h: 844, label: 'iPhone' },
  max:    { w: 430, h: 932, label: 'iPhone Max' },
  ipad:   { w: 834, h: 1120, label: 'iPad' },
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#f59e0b",
  "device": "iphone",
  "corners": "rounded",
  "grain": true
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [data, setData] = useState(() => TOPS.buildSeed());
  const [nav, setNav] = useState({ screen: 'login' });
  const [tab, setTab] = useState('main');
  const [sheet, setSheet] = useState(null);   // null | 'addShow'

  // ── accent ink lookup ──
  const accentInk = useMemo(() => {
    const hit = Object.values(TOPS.ACCENTS).find(a => a.hex.toLowerCase() === String(t.accent).toLowerCase());
    return hit ? hit.ink : '#1a1206';
  }, [t.accent]);

  const dev = DEVICES[t.device] || DEVICES.iphone;
  const radii = t.corners === 'sharp'
    ? { card: '10px', btn: '9px', input: '8px' }
    : { card: '22px', btn: '14px', input: '13px' };

  // ── scaling stage ──
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => {
      const pad = 48;
      const s = Math.min((window.innerWidth - pad) / dev.w, (window.innerHeight - pad) / dev.h, 1.1);
      setScale(s);
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [dev.w, dev.h]);

  // ── navigation helpers ──
  const go = (screen, extra = {}) => setNav({ screen, ...extra });
  const theatre = nav.theatreId ? data.theatres[nav.theatreId] : null;
  const showIdx = theatre && nav.showId ? theatre.shows.findIndex(s => s.id === nav.showId) : -1;
  const show = showIdx >= 0 ? theatre.shows[showIdx] : null;

  // setField for the active show: path relative to the show object
  const setShowField = (path, val) => {
    setData(d => {
      const full = `theatres.${nav.theatreId}.shows.${showIdx}.${path}`;
      let next = setIn(d, full, val);
      // first edit on a pending show promotes it to in-progress
      const st = next.theatres[nav.theatreId].shows[showIdx].status;
      if (st === 'pending') next = setIn(next, `theatres.${nav.theatreId}.shows.${showIdx}.status`, 'inprogress');
      return next;
    });
  };

  const addShow = (form) => {
    setData(d => {
      const ths = d.theatres[nav.theatreId];
      const n = ths.shows.length + 1;
      const newShow = {
        id: nav.theatreId + '_' + Date.now(), n,
        time: form.time, date: form.date, dateLabel: form.dateLabel, movie: form.movie, lang: form.lang, fan: form.fan,
        tickets: form.tickets, occ: form.occ, status: 'pending',
        payments: { upi: '', cash: '' },
        counters: { main: TOPS.emptyRows(TOPS.MENU.main), popcorn: TOPS.emptyRows(TOPS.MENU.popcorn), cool: TOPS.emptyRows(TOPS.MENU.cool) },
        parking: { scooter: '', auto: '', car: '', reported: '' },
      };
      return setIn(d, `theatres.${nav.theatreId}.shows`, [...ths.shows, newShow]);
    });
  };

  const setClose = (next) => setData(d => setIn(d, `dayClose.${nav.theatreId}`, next));

  // open a show -> reset tab to main
  const openShow = (id) => { setTab('main'); go('show', { theatreId: nav.theatreId, showId: id }); };

  const appVars = {
    '--accent': t.accent, '--accent-ink': accentInk,
    '--r-card': radii.card, '--r-btn': radii.btn, '--r-input': radii.input,
  };

  return (
    <div className="stage" data-wide={dev.w >= 700 ? '1' : undefined}>
      {/* theatre ambience */}
      <div className="amb amb-amber" />
      <div className="amb amb-purple" />
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'center', transition: 'transform .25s ease' }}>
        <div className="app-root" style={{ width: dev.w, height: dev.h, ...appVars }}>
          <DeviceFrame width={dev.w}>
            <StatusBar />
            {t.grain && <div className="grain" />}
            <div key={nav.screen + (nav.showId || '')} className="screen-anim" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {nav.screen === 'login' && <LoginScreen onSignIn={() => go('home')} />}
              {nav.screen === 'home' && <HomeScreen data={data} onOpen={id => go('day', { theatreId: id })} onLogout={() => go('login')} onInsights={() => go('insights')} />}
              {nav.screen === 'insights' && <InsightsScreen data={data} onBack={() => go('home')} />}
              {nav.screen === 'day' && theatre && <DayScreen theatre={theatre} onBack={() => go('home')} onOpenShow={openShow} onAddShow={() => setSheet('addShow')} onClose={() => go('close', { theatreId: nav.theatreId })} />}
              {nav.screen === 'show' && show && <ShowEntryScreen theatre={theatre} show={show} tab={tab} setTab={setTab} setField={setShowField} onBack={() => go('day', { theatreId: nav.theatreId })} />}
              {nav.screen === 'close' && theatre && <DayCloseScreen theatre={theatre} close={data.dayClose[nav.theatreId]} setClose={setClose} onBack={() => go('day', { theatreId: nav.theatreId })} />}
            </div>
            {sheet === 'addShow' && theatre && (
              <AddShowSheet theatre={theatre} nextN={theatre.shows.length + 1}
                onClose={() => setSheet(null)}
                onSave={(form) => { addShow(form); setSheet(null); }} />
            )}
          </DeviceFrame>
        </div>
      </div>

      <TweaksPanel>
        <TweakSection label="Accent" />
        <TweakColor label="Action color" value={t.accent}
          options={Object.values(TOPS.ACCENTS).map(a => a.hex)}
          onChange={v => setTweak('accent', v)} />
        <TweakSection label="Device" />
        <TweakRadio label="Frame" value={t.device}
          options={['iphone', 'max', 'ipad']}
          onChange={v => setTweak('device', v)} />
        <TweakSection label="Style" />
        <TweakRadio label="Corners" value={t.corners} options={['rounded', 'sharp']} onChange={v => setTweak('corners', v)} />
        <TweakToggle label="Film grain" value={t.grain} onChange={v => setTweak('grain', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
