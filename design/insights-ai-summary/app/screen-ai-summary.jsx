// screen-ai-summary.jsx — AI Daily Summary (before / loading / after states)
const { useState: useAiState, useEffect: useAiEffect, useMemo: useAiMemo } = React;
const _aiRupee = TOPS.rupee, _aiNum = TOPS.num;

/* animated amber "AI" badge */
function AiBadge() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 26, padding: '0 9px 0 8px', borderRadius: 999, background: 'color-mix(in srgb, var(--accent) 16%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 38%, transparent)' }}>
      <span className="ai-pulse" style={{ display: 'inline-flex' }}><Icon name="sparkle" size={13} color="var(--accent)" /></span>
      <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.08em', color: 'var(--accent)' }}>AI</span>
    </span>
  );
}

const trendMeta = { up: { ch: '↑', c: 'var(--green)' }, down: { ch: '↓', c: 'var(--red)' }, flat: { ch: '→', c: 'var(--muted)' } };

/* ── Section 1: Performance Snapshot ── */
function SnapshotCard({ snap }) {
  const up = snap.vsYesterday >= 0;
  return (
    <Card style={{ padding: 18 }}>
      <div style={{ fontSize: 11.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>Total revenue</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 36, fontWeight: 600, color: 'var(--accent)', letterSpacing: '-.01em', textShadow: '0 0 28px var(--accent-glow)' }}>{_aiRupee(snap.total)}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13.5, fontWeight: 650, color: up ? 'var(--green)' : 'var(--red)' }}>
          {up ? '▲' : '▼'} {Math.abs(snap.vsYesterday)}% <span style={{ color: 'var(--muted)', fontWeight: 500 }}>vs yesterday</span>
        </span>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <div style={{ flex: 1, padding: '12px 14px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: 13 }}>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 500 }}>Best show</div>
          {snap.best && <>
            <div style={{ fontSize: 14, fontWeight: 650, color: 'var(--text)', marginTop: 4 }}>Show {snap.best.n} · {snap.best.time}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 600, color: 'var(--accent)', marginTop: 2 }}>{_aiRupee(snap.best.rev)}</div>
          </>}
        </div>
        <div style={{ flex: 1, padding: '12px 14px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: 13 }}>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 500 }}>Avg occupancy</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 26, fontWeight: 600, color: 'var(--text)', marginTop: 4, lineHeight: 1 }}>{snap.occAvg}%</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>across all shows</div>
        </div>
      </div>
    </Card>
  );
}

/* ── Section 2: AI Narrative ── */
function NarrativeCard({ lines }) {
  return (
    <div style={{ position: 'relative', background: 'linear-gradient(120deg, color-mix(in srgb, var(--accent) 7%, var(--surface)), var(--surface))', border: '1px solid var(--card-border)', borderLeft: '3px solid var(--accent)', borderRadius: 'var(--r-card)', padding: '18px 20px', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', right: -14, top: -14, opacity: .07 }}><Icon name="sparkle" size={96} color="var(--accent)" stroke={1.2} /></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <AiBadge />
        <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Daily read</span>
      </div>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 11 }}>
        {lines.map((l, i) => (
          <p key={i} className="ai-line" style={{ margin: 0, fontSize: 15.5, lineHeight: 1.62, color: i === 0 ? 'var(--text)' : 'color-mix(in srgb, var(--text) 82%, transparent)', fontWeight: i === 0 ? 550 : 400, animationDelay: (i * 0.12) + 's', textWrap: 'pretty' }}>{l}</p>
        ))}
      </div>
    </div>
  );
}

/* ── Section 3: Item Intelligence ── */
function ItemCard({ kind, item }) {
  const isTop = kind === 'top';
  const tm = trendMeta[item.trend];
  return (
    <Card style={{ padding: 16, flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
        <span style={{ width: 22, height: 22, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isTop ? 'color-mix(in srgb, var(--green) 18%, transparent)' : 'color-mix(in srgb, var(--accent) 16%, transparent)' }}>
          <Icon name={isTop ? 'check' : 'warn'} size={13} color={isTop ? 'var(--green)' : 'var(--accent)'} />
        </span>
        <span style={{ fontSize: 11.5, fontWeight: 650, letterSpacing: '.04em', textTransform: 'uppercase', color: isTop ? 'var(--green)' : 'var(--accent)' }}>{isTop ? 'Top performer' : 'Underperformer'}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 17, fontWeight: 650, color: 'var(--text)' }}>{item.name}</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: tm.c }}>{tm.ch}</span>
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{_aiNum(item.units)} units · {_aiRupee(item.rev)}</div>
      {!isTop && item.suggestion && (
        <div style={{ fontSize: 12.5, color: 'var(--purple-text)', marginTop: 10, lineHeight: 1.45, paddingTop: 10, borderTop: '1px solid var(--card-border)' }}>{item.suggestion}</div>
      )}
    </Card>
  );
}

/* ── Section 4: Catering (with inline-edit) ── */
function CateringSection({ catering }) {
  const [open, setOpen] = useAiState(true);
  const [editing, setEditing] = useAiState(false);
  const [qty, setQty] = useAiState(() => Object.fromEntries(catering.items.map(it => [it.name, it.qty])));
  const visible = (open || editing) ? catering.items : catering.items.slice(0, 3);
  const setQ = (name, v) => setQty(q => ({ ...q, [name]: Math.max(0, v) }));
  const reset = () => setQty(Object.fromEntries(catering.items.map(it => [it.name, it.qty])));

  return (
    <Card style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 15.5, fontWeight: 650, color: 'var(--text)' }}>For Tomorrow</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{catering.tomorrowLabel} · {catering.movie}</div>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--purple-text)', background: 'var(--purple-chip)', padding: '5px 10px', borderRadius: 999, fontWeight: 600 }}>
          <Icon name="sparkle" size={13} color="var(--purple-text)" />{catering.occ}% exp.
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {visible.map((it, i) => {
          const tm = trendMeta[it.trend];
          const v = qty[it.name] ?? it.qty;
          const changed = v !== it.qty;
          return (
            <div key={it.name} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: editing ? 54 : undefined, padding: editing ? '6px 2px' : '11px 2px', borderTop: i ? '1px solid var(--card-border)' : 'none' }}>
              <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{it.name}{changed && !editing && <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 6, fontFamily: 'var(--mono)' }}>was {it.qty}</span>}</span>
              {editing ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {['−', '+'].map(sym => (
                    <button key={sym} onMouseDown={e => e.preventDefault()} onClick={() => setQ(it.name, v + (sym === '+' ? (v >= 50 ? 5 : 1) : -(v >= 50 ? 5 : 1)))}
                      style={{ width: 34, height: 42, border: '1.5px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--accent)', borderRadius: 10, fontSize: 19, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1 }}>{sym}</button>
                  ))}
                  <input inputMode="numeric" value={v} onChange={e => setQ(it.name, parseInt(e.target.value.replace(/[^\d]/g, ''), 10) || 0)} onFocus={e => e.target.select()}
                    style={{ width: 46, height: 42, textAlign: 'center', background: 'var(--input-bg-focus)', border: '1.5px solid var(--accent)', borderRadius: 10, color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 600, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ) : (
                <>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 600, color: changed ? 'var(--accent)' : 'var(--text)' }}>{v}</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)', width: 26 }}>units</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: tm.c, width: 14, textAlign: 'center' }}>{tm.ch}</span>
                </>
              )}
            </div>
          );
        })}
      </div>

      {!editing && (
        <button onClick={() => setOpen(o => !o)} style={{ width: '100%', marginTop: 4, height: 34, background: 'transparent', border: 'none', color: 'var(--muted)', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          {open ? 'Show less' : `Show all ${catering.items.length} items`}
          <span style={{ display: 'inline-block', transform: open ? 'rotate(-90deg)' : 'rotate(90deg)', transition: 'transform .2s' }}><Icon name="chevron" size={14} color="var(--muted)" /></span>
        </button>
      )}

      <div style={{ fontSize: 11.5, color: 'var(--muted)', textAlign: 'center', margin: '8px 0 14px', opacity: .8 }}>
        {editing ? 'Tap − / + or type to adjust tomorrow’s stock' : `Based on ${catering.confidence} similar shows`}
      </div>

      {editing ? (
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn full icon="check" onClick={() => setEditing(false)}>Save quantities</Btn>
          <Ghost tone="muted" style={{ flexShrink: 0 }} onClick={reset}>Reset</Ghost>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn full icon="check">Looks good</Btn>
          <Ghost tone="accent" style={{ flexShrink: 0 }} onClick={() => { setEditing(true); setOpen(true); }}>Adjust quantities</Ghost>
        </div>
      )}
    </Card>
  );
}

/* ── Section 5: Parking Alert (conditional) ── */
function ParkingAlert({ parking }) {
  return (
    <div style={{ background: 'color-mix(in srgb, var(--red) 11%, var(--surface))', border: '1px solid color-mix(in srgb, var(--red) 34%, transparent)', borderRadius: 'var(--r-card)', padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Icon name="warn" size={18} color="var(--red)" />
        <span style={{ fontSize: 13, fontWeight: 650, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--red)' }}>Parking alert</span>
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 32, fontWeight: 600, color: 'var(--red)', lineHeight: 1, textShadow: '0 0 22px color-mix(in srgb, var(--red) 40%, transparent)' }}>{_aiRupee(parking.gap)}</div>
      <div style={{ fontSize: 14, color: 'var(--text)', marginTop: 8, fontWeight: 500 }}>Staff short by {_aiRupee(parking.gap)} today</div>
      {parking.trendingUp && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>{parking.consecutive}{ordinal(parking.consecutive)} consecutive day with a gap — investigate</div>}
      <div style={{ marginTop: 14 }}><Ghost tone="red" icon="parking">View parking history</Ghost></div>
    </div>
  );
}
function ordinal(n) { return n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'; }

/* ── skeleton (loading) ── */
function Skeleton({ h = 120 }) {
  return <div className="ai-skel" style={{ height: h, borderRadius: 'var(--r-card)', background: 'var(--surface)', border: '1px solid var(--card-border)' }} />;
}

/* ════════ SCREEN ════════ */
function AiSummaryScreen({ theatre, onBack }) {
  // 'before' | 'loading' | 'after'
  const [phase, setPhase] = useAiState('before');
  const summary = useAiMemo(() => window.AISUMMARY.buildSummary(theatre), [theatre.id, phase === 'after']);

  const generate = () => {
    setPhase('loading');
    setTimeout(() => setPhase('after'), 2600);
  };

  return (
    <>
      <AppHeader
        left={<button onClick={onBack} style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--surface)', border: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginRight: 4 }}><Icon name="back" size={19} color="var(--text)" /></button>}
        title={<div><div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', lineHeight: 1.1 }}>Daily Summary</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{theatre.name} · {TOPS.TODAY}</div></div>}
        right={<AiBadge />}
      />

      {phase === 'before' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 28px', textAlign: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '24%', left: '50%', transform: 'translateX(-50%)', width: 260, height: 200, background: 'radial-gradient(ellipse, color-mix(in srgb, var(--accent) 16%, transparent), transparent 70%)', filter: 'blur(22px)', pointerEvents: 'none' }} />
          <div className="ai-float" style={{ position: 'relative', width: 78, height: 78, borderRadius: 22, background: 'color-mix(in srgb, var(--accent) 14%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 34%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
            <Icon name="sparkle" size={38} color="var(--accent)" />
          </div>
          <h2 style={{ position: 'relative', fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0, letterSpacing: '-.02em' }}>Generate AI Summary</h2>
          <p style={{ position: 'relative', fontSize: 14.5, color: 'var(--muted)', margin: '10px 0 0', maxWidth: 280, lineHeight: 1.55 }}>A plain-language read of today’s numbers, item trends, and tomorrow’s stock — built from your logged shows.</p>
          <div style={{ position: 'relative', width: '100%', maxWidth: 300, marginTop: 28 }}>
            <Btn full size="lg" icon="sparkle" onClick={generate}>Generate AI Summary</Btn>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--muted)', marginTop: 14 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
            Powered by Groq · Usually takes 3–5 seconds
          </div>
        </div>
      )}

      {phase === 'loading' && (
        <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'var(--accent)', fontSize: 13.5, fontWeight: 600 }}>
            <span className="ai-spin" style={{ display: 'inline-flex' }}><Icon name="sparkle" size={17} color="var(--accent)" /></span>
            Reading {theatre.name}’s day…
          </div>
          <Skeleton h={130} />
          <Skeleton h={150} />
          <div style={{ display: 'flex', gap: 12 }}><Skeleton h={110} /><Skeleton h={110} /></div>
          <Skeleton h={180} />
        </div>
      )}

      {phase === 'after' && (
        <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
          <div className="ai-grid" style={{ display: 'grid', gap: 16 }}>
            <div className="ai-span ai-rise" style={{ animationDelay: '0s' }}><SnapshotCard snap={summary.snapshot} /></div>
            <div className="ai-span ai-rise" style={{ animationDelay: '.06s' }}><NarrativeCard lines={summary.narrative} /></div>

            {/* Item intelligence — two side-by-side cards (section 3) */}
            <div className="ai-rise" style={{ display: 'flex', gap: 12, alignItems: 'stretch', animationDelay: '.12s' }}>
              <ItemCard kind="top" item={summary.items.top} />
              <ItemCard kind="under" item={summary.items.under} />
            </div>

            {summary.catering && <div className="ai-rise" style={{ animationDelay: '.2s' }}><CateringSection catering={summary.catering} /></div>}
            {summary.parking && <div className="ai-span ai-rise" style={{ animationDelay: '.24s' }}><ParkingAlert parking={summary.parking} /></div>}

            <div className="ai-span" style={{ display: 'flex', justifyContent: 'center', paddingTop: 4, paddingBottom: 6 }}>
              <Ghost icon="sparkle" tone="muted" onClick={generate}>Regenerate</Ghost>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* item-intelligence two-up: on phone they sit side by side as a nested row.
   We achieve this by making the two ItemCards share a row via CSS. */
Object.assign(window, { AiSummaryScreen });
