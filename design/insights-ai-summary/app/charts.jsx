// charts.jsx — cinematic SVG charts (line + horizontal bars). Exports to window.
const { useState: useChState, useRef: useChRef, useEffect: useChEffect } = React;

/* compact ₹ for axis ticks: 48000 -> ₹48k, 120000 -> ₹1.2L */
function rupeeShort(n) {
  const v = Math.round(Number(n) || 0);
  if (v >= 100000) return '₹' + (v / 100000).toFixed(v % 100000 ? 1 : 0) + 'L';
  if (v >= 1000) return '₹' + Math.round(v / 1000) + 'k';
  return '₹' + v;
}

/* ── Line chart ─────────────────────────────────────────────────
   series: [{ id, color, points: [{label, v}] }]  (1 or 2 lines)     */
function LineChart({ series, height = 210, yTicks = 4, showDots = true, glow = true, fmtY = rupeeShort }) {
  const wrapRef = useChRef(null);
  const [w, setW] = useChState(320);
  const [hover, setHover] = useChState(null);
  useChEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el); setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const padL = 44, padR = 12, padT = 14, padB = 26;
  const n = series[0].points.length;
  const allV = series.flatMap(s => s.points.map(p => p.v));
  const maxV = Math.max(...allV, 1);
  const niceMax = niceCeil(maxV);
  const iw = Math.max(10, w - padL - padR), ih = height - padT - padB;
  const x = i => padL + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = v => padT + ih - (v / niceMax) * ih;

  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => (niceMax / yTicks) * i);
  // x labels: show ~5 evenly spaced
  const step = Math.max(1, Math.round(n / 5));
  const uid = React.useMemo(() => 'lc' + Math.random().toString(36).slice(2, 7), []);

  return (
    <div ref={wrapRef} style={{ width: '100%', position: 'relative' }}
      onMouseLeave={() => setHover(null)}
      onMouseMove={e => {
        const rect = wrapRef.current.getBoundingClientRect();
        const px = e.clientX - rect.left;
        let idx = Math.round(((px - padL) / iw) * (n - 1));
        idx = Math.max(0, Math.min(n - 1, idx));
        setHover(idx);
      }}>
      <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} style={{ display: 'block' }}>
        <defs>
          {series.map(s => (
            <linearGradient key={s.id} id={`${uid}-fill-${s.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.26" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
          <filter id={`${uid}-glow`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* grid + y ticks */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} stroke="rgba(150,120,190,0.10)" strokeWidth="1" />
            <text x={padL - 8} y={y(t) + 3.5} textAnchor="end" fontSize="10" fontFamily="var(--mono)" fill="var(--muted)">{fmtY(t)}</text>
          </g>
        ))}
        {/* x labels */}
        {series[0].points.map((p, i) => (i % step === 0 || i === n - 1) ? (
          <text key={i} x={x(i)} y={height - 8} textAnchor="middle" fontSize="9.5" fontFamily="var(--mono)" fill="var(--muted)">{p.label}</text>
        ) : null)}

        {/* area + line per series */}
        {series.map(s => {
          const line = s.points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.v)}`).join(' ');
          const area = `${line} L${x(n - 1)},${padT + ih} L${x(0)},${padT + ih} Z`;
          return (
            <g key={s.id}>
              <path d={area} fill={`url(#${uid}-fill-${s.id})`} />
              <path d={line} fill="none" stroke={s.color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
                filter={glow ? `url(#${uid}-glow)` : undefined} />
              {showDots && hover != null && (
                <circle cx={x(hover)} cy={y(s.points[hover].v)} r="4" fill="var(--bg)" stroke={s.color} strokeWidth="2.4" />
              )}
            </g>
          );
        })}

        {/* hover guide */}
        {hover != null && (
          <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + ih} stroke="rgba(245,158,11,0.35)" strokeWidth="1" strokeDasharray="3 3" />
        )}
      </svg>

      {/* hover tooltip */}
      {hover != null && (
        <div style={{
          position: 'absolute', top: 4,
          left: Math.min(Math.max(x(hover) - 60, 4), w - 124),
          background: 'var(--surface-2)', border: '1px solid var(--card-border)', borderRadius: 10,
          padding: '7px 10px', pointerEvents: 'none', boxShadow: '0 8px 24px rgba(0,0,0,.5)', minWidth: 96,
        }}>
          <div style={{ fontSize: 10.5, color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 3 }}>{series[0].points[hover].label}</div>
          {series.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
              <span style={{ color: 'var(--muted)', flex: 1 }}>{s.name}</span>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--text)' }}>{TOPS.rupee(s.points[hover].v)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Horizontal bar chart ───────────────────────────────────────
   data: [{ label, v, sub? }]                                        */
function HBarChart({ data, height, barColor = 'var(--accent)', fmt = TOPS.rupee, animateKey }) {
  const maxV = Math.max(...data.map(d => d.v), 1);
  const niceMax = niceCeil(maxV);
  const rowH = 44;
  const h = height || data.length * rowH + 8;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} key={animateKey}>
      {data.map((d, i) => {
        const pct = (d.v / niceMax) * 100;
        return (
          <div key={d.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
              <span style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 500 }}>{d.label}{d.sub && <span style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 11.5, marginLeft: 6 }}>{d.sub}</span>}</span>
              <span style={{ fontSize: 13, fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--accent)' }}>{fmt(d.v)}</span>
            </div>
            <div style={{ height: 10, borderRadius: 6, background: 'rgba(150,120,190,0.10)', overflow: 'hidden' }}>
              <div className="hbar-fill" style={{
                height: '100%', width: pct + '%', borderRadius: 6,
                background: `linear-gradient(90deg, color-mix(in srgb, ${barColor} 72%, transparent), ${barColor})`,
                boxShadow: `0 0 12px color-mix(in srgb, ${barColor} 55%, transparent)`,
                transition: 'width .7s cubic-bezier(.22,1,.36,1)',
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function niceCeil(v) {
  if (v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const norm = v / mag;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return step * mag;
}

Object.assign(window, { LineChart, HBarChart, rupeeShort });
