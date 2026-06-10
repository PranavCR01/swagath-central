// screen-insights.jsx — Insights / analytics dashboard
const { useState: useInsState, useMemo: useInsMemo } = React;
const _I = () => window.INSIGHTS;

/* section card shell */
function InsightCard({ title, action, children, sub }) {
  return (
    <Card style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 15.5, fontWeight: 650, color: 'var(--text)', letterSpacing: '-.01em' }}>{title}</div>
          {sub && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

/* empty state */
function EmptyState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '34px 16px', textAlign: 'center' }}>
      <Icon name="reel" size={42} color="var(--muted)" stroke={1.3} style={{ opacity: .4 }} />
      <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 12, maxWidth: 200 }}>Not enough data yet — keep logging shows</div>
    </div>
  );
}

/* theatre selector — Sandhya / Manasa / Both */
function TheatreToggle({ value, onChange, names }) {
  const opts = [{ id: 'sandhya', label: names.sandhya }, { id: 'manasa', label: names.manasa }, { id: 'both', label: 'Both' }];
  return (
    <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--surface)', border: '1px solid var(--card-border)', borderRadius: 999 }}>
      {opts.map(o => {
        const on = o.id === value;
        return (
          <button key={o.id} onClick={() => onChange(o.id)}
            style={{
              flex: 1, height: 38, border: 'none', cursor: 'pointer', borderRadius: 999,
              background: on ? 'var(--accent)' : 'transparent', color: on ? 'var(--accent-ink)' : 'var(--muted)',
              fontFamily: 'inherit', fontSize: 13.5, fontWeight: on ? 650 : 500,
              transition: 'background .2s, color .2s', boxShadow: on ? '0 4px 14px -4px var(--accent-glow)' : 'none',
            }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* range pills */
function RangePills({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {_I().RANGES.map(r => {
        const on = r.id === value;
        return (
          <button key={r.id} onClick={() => onChange(r.id)}
            style={{
              flex: 1, height: 34, border: `1px solid ${on ? 'transparent' : 'var(--card-border)'}`, cursor: 'pointer', borderRadius: 999,
              background: on ? 'var(--purple-chip)' : 'transparent', color: on ? 'var(--purple-text)' : 'var(--muted)',
              fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, transition: 'all .2s',
            }}>
            {r.label}
          </button>
        );
      })}
    </div>
  );
}

const trendArrow = { up: { ch: '↑', c: 'var(--green)' }, down: { ch: '↓', c: 'var(--red)' }, flat: { ch: '→', c: 'var(--muted)' } };

/* small touch-friendly stepper */
function QtyStepper({ value, onChange }) {
  const btn = (label, fn) => (
    <button onMouseDown={e => e.preventDefault()} onClick={fn} style={{ width: 36, height: 44, flexShrink: 0, border: '1.5px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--accent)', borderRadius: 10, fontSize: 20, fontWeight: 600, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>{label}</button>
  );
  const step = value >= 50 ? 5 : 1;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {btn('−', () => onChange(Math.max(0, value - step)))}
      <input inputMode="numeric" value={value}
        onChange={e => onChange(Math.max(0, parseInt(e.target.value.replace(/[^\d]/g, ''), 10) || 0))}
        onFocus={e => e.target.select()}
        style={{ width: 48, height: 44, textAlign: 'center', boxSizing: 'border-box', background: 'var(--input-bg-focus)', border: '1.5px solid var(--accent)', borderRadius: 10, color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 600, outline: 'none' }} />
      {btn('+', () => onChange(value + step))}
    </div>
  );
}

/* catering suggestion card */
function CateringCard({ theatreId }) {
  const single = theatreId === 'both' ? 'sandhya' : theatreId;
  const sugg = _I().SUGG[single];
  const [open, setOpen] = useInsState(true);
  const [editing, setEditing] = useInsState(false);
  const [confirmed, setConfirmed] = useInsState(false);
  const [qty, setQty] = useInsState(() => Object.fromEntries(sugg.items.map(it => [it.name, it.qty])));
  React.useEffect(() => {
    setQty(Object.fromEntries(sugg.items.map(it => [it.name, it.qty])));
    setEditing(false); setConfirmed(false); setOpen(true);
  }, [single]);
  const setQ = (name, v) => { setQty(q => ({ ...q, [name]: v })); setConfirmed(false); };
  const dirty = sugg.items.some(it => (qty[it.name] ?? it.qty) !== it.qty);
  const visible = (editing || open) ? sugg.items : sugg.items.slice(0, 3);
  return (
    <InsightCard
      title="Catering Suggestions"
      sub="For tomorrow"
      action={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--purple-text)', background: 'var(--purple-chip)', padding: '5px 10px', borderRadius: 999, fontWeight: 600 }}><Icon name="reel" size={13} color="var(--purple-text)" />{single === 'sandhya' ? 'Sandhya' : 'Manasa'}</span>}
    >
      {/* movie + occupancy header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--purple-chip)', borderRadius: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 650, color: 'var(--text)' }}>{sugg.movie}</div>
          <div style={{ fontSize: 12, color: 'var(--purple-text)', marginTop: 1 }}>{sugg.lang} · {sugg.slot}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 600, color: 'var(--accent)', textShadow: '0 0 18px var(--accent-glow)' }}>{sugg.occ}%</div>
          <div style={{ fontSize: 10.5, color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Exp. occupancy</div>
        </div>
      </div>

      {/* item rows */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {visible.map((it, i) => {
          const ta = trendArrow[it.trend];
          const v = qty[it.name] ?? it.qty;
          const changed = v !== it.qty;
          return (
            <div key={it.name} className="fade-up" style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: editing ? 56 : undefined, padding: editing ? '7px 4px' : '11px 4px', borderTop: i ? '1px solid var(--card-border)' : 'none', animationDelay: (i * 0.03) + 's' }}>
              <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>
                {it.name}
                {changed && !editing && <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 6, fontFamily: 'var(--mono)' }}>was {it.qty}</span>}
              </span>
              {editing ? (
                <QtyStepper value={v} onChange={nv => setQ(it.name, nv)} />
              ) : (
                <>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 600, color: changed ? 'var(--accent)' : 'var(--text)' }}>{v}</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)', width: 26 }}>units</span>
                </>
              )}
              <span style={{ fontSize: 16, fontWeight: 700, color: ta.c, width: 16, textAlign: 'center' }}>{ta.ch}</span>
            </div>
          );
        })}
      </div>

      {!editing && (
        <button onClick={() => setOpen(o => !o)} style={{ width: '100%', marginTop: 6, height: 36, background: 'transparent', border: 'none', color: 'var(--muted)', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          {open ? 'Show less' : `Show all ${sugg.items.length} items`}
          <span style={{ display: 'inline-block', transform: open ? 'rotate(-90deg)' : 'rotate(90deg)', transition: 'transform .2s' }}><Icon name="chevron" size={14} color="var(--muted)" /></span>
        </button>
      )}

      <div style={{ fontSize: 11.5, color: 'var(--muted)', textAlign: 'center', margin: '8px 0 14px', opacity: .75 }}>
        {editing ? 'Tap − / + or type to adjust tomorrow’s stock' : 'Based on last 4 similar shows'}
      </div>

      {confirmed && !editing && (
        <div className="fade-up" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', marginBottom: 12, background: 'color-mix(in srgb, var(--green) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--green) 30%, transparent)', borderRadius: 12 }}>
          <Icon name="check" size={16} color="var(--green)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>Stock plan confirmed for tomorrow</span>
        </div>
      )}

      {editing ? (
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn full icon="check" onClick={() => setEditing(false)}>Save quantities</Btn>
          {dirty && <Ghost tone="muted" style={{ flexShrink: 0 }} onClick={() => setQty(Object.fromEntries(sugg.items.map(it => [it.name, it.qty])))}>Reset</Ghost>}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn full icon="check" onClick={() => setConfirmed(true)}>{confirmed ? 'Confirmed' : 'Looks good'}</Btn>
          <Ghost tone="accent" style={{ flexShrink: 0 }} onClick={() => { setEditing(true); setOpen(true); setConfirmed(false); }}>{dirty ? 'Edit' : 'Adjust'}</Ghost>
        </div>
      )}
    </InsightCard>
  );
}

/* parking gap section */
function ParkingGapSection({ theatreId, names }) {
  const single = theatreId === 'both' ? 'sandhya' : theatreId;
  const series = useInsMemo(() => _I().parkingGapTrend(single), [single]);
  const up = _I().gapTrendingUp(series);
  const avg = Math.round(series.reduce((s, p) => s + p.v, 0) / series.length / 10) * 10;
  return (
    <InsightCard title="Parking Gap Trend" sub={`Last 30 days · ${single === 'sandhya' ? names.sandhya : names.manasa}`}>
      <LineChart
        series={[{ id: 'gap', name: 'Daily gap', color: up ? '#ef4444' : '#22c55e', points: series.map(p => ({ label: `${p.d}`, v: p.v })) }]}
        height={170} yTicks={3} glow={true} />
      <div style={{ marginTop: 14 }}>
        {up ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', background: 'color-mix(in srgb, var(--accent) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 34%, transparent)', borderRadius: 13 }}>
            <Icon name="warn" size={20} color="var(--accent)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 650, color: 'var(--accent)' }}>Parking gaps increasing</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>Avg ₹{avg}/day · review with staff</div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: 'color-mix(in srgb, var(--green) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--green) 30%, transparent)', borderRadius: 999 }}>
            <Icon name="check" size={16} color="var(--green)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>Gaps stable · avg ₹{avg}/day</span>
          </div>
        )}
      </div>
    </InsightCard>
  );
}

/* ════════ INSIGHTS SCREEN ════════ */
function InsightsScreen({ data, onBack }) {
  const [theatreId, setTheatreId] = useInsState('sandhya');
  const [range, setRange] = useInsState('week');
  const names = { sandhya: data.theatres.sandhya.name, manasa: data.theatres.manasa.name };
  const rangeMeta = _I().RANGES.find(r => r.id === range);
  const days = rangeMeta.days;

  // revenue series (1 or 2 lines)
  const revSeries = useInsMemo(() => {
    const mk = (id, color, name) => ({ id, color, name, points: _I().dailyRevenue(id, days).map(p => ({ label: `${p.d}`, v: p.v })) });
    if (theatreId === 'both') return [mk('sandhya', '#f59e0b', names.sandhya), mk('manasa', '#a78bfa', names.manasa)];
    return [mk(theatreId, '#f59e0b', theatreId === 'sandhya' ? names.sandhya : names.manasa)];
  }, [theatreId, days]);

  const totalRev = useInsMemo(() => revSeries.reduce((s, ser) => s + ser.points.reduce((a, p) => a + p.v, 0), 0), [revSeries]);
  const single = theatreId === 'both' ? null : theatreId;

  // show perf + top items (single theatre; if both, sum/sandhya primary)
  const perf = useInsMemo(() => {
    if (theatreId === 'both') {
      const a = _I().showPerf('sandhya'), b = _I().showPerf('manasa');
      return a.map((r, i) => ({ label: r.label, time: r.time, v: r.v + b[i].v }));
    }
    return _I().showPerf(theatreId);
  }, [theatreId]);
  const tops = useInsMemo(() => {
    if (theatreId === 'both') {
      const map = {};
      [..._I().topItems('sandhya'), ..._I().topItems('manasa')].forEach(it => { map[it.label] = (map[it.label] || 0) + it.v; });
      return Object.entries(map).map(([label, v]) => ({ label, v })).sort((a, b) => b.v - a.v).slice(0, 5);
    }
    return _I().topItems(theatreId);
  }, [theatreId]);

  return (
    <>
      <AppHeader
        left={<button onClick={onBack} style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--surface)', border: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginRight: 4 }}><Icon name="back" size={19} color="var(--text)" /></button>}
        title={<div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Insights</div>}
        right={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--purple-text)', background: 'var(--purple-chip)', padding: '6px 11px', borderRadius: 999, fontWeight: 600 }}><Icon name="reel" size={14} color="var(--purple-text)" />Live</span>}
      />
      {/* range pills below header */}
      <div style={{ flexShrink: 0, padding: '12px 18px', borderBottom: '1px solid var(--card-border)', background: 'var(--bg)' }}>
        <RangePills value={range} onChange={setRange} />
      </div>

      <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
        {/* theatre selector */}
        <TheatreToggle value={theatreId} onChange={setTheatreId} names={names} />

        <div className="ins-grid" style={{ display: 'grid', gap: 16, marginTop: 16 }}>
          {/* Revenue overview — full width */}
          <div className="ins-span">
            <InsightCard
              title="Revenue Overview"
              sub={`Last ${days} days`}
              action={<div style={{ textAlign: 'right' }}><div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 600, color: 'var(--accent)', textShadow: '0 0 16px var(--accent-glow)' }}>{TOPS.rupee(totalRev)}</div><div style={{ fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Total</div></div>}
            >
              <LineChart series={revSeries} height={216} />
              {theatreId === 'both' && (
                <div style={{ display: 'flex', gap: 18, justifyContent: 'center', marginTop: 14 }}>
                  {revSeries.map(s => (
                    <span key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--muted)' }}>
                      <span style={{ width: 16, height: 3, borderRadius: 2, background: s.color }} />{s.name}
                    </span>
                  ))}
                </div>
              )}
            </InsightCard>
          </div>

          {/* Show performance */}
          <InsightCard title="Show Performance" sub="Avg revenue by slot">
            <HBarChart data={perf.map(p => ({ label: p.label, sub: p.time, v: p.v }))} animateKey={theatreId} />
          </InsightCard>

          {/* Top items */}
          <InsightCard title="Top Items This Week" sub="By food-court revenue">
            <HBarChart data={tops} animateKey={theatreId} />
          </InsightCard>

          {/* Catering — full width */}
          <div className="ins-span"><CateringCard theatreId={theatreId} /></div>

          {/* Parking gap — full width */}
          <div className="ins-span"><ParkingGapSection theatreId={theatreId} names={names} /></div>
        </div>
        <div style={{ height: 6 }} />
      </div>
    </>
  );
}

Object.assign(window, { InsightsScreen });
