// screens-b.jsx — Show Entry (counters + parking) and Day Close
const { rupee, num, saleOf, amtOf, MENU, PARKING } = TOPS;

/* grid template shared by header + rows so columns line up */
const SLIP_COLS = 'minmax(0,1fr) 46px 46px 46px 40px 64px';

function SlipHeader() {
  const lbl = { fontSize: 10.5, fontWeight: 600, letterSpacing: '.08em', color: 'var(--muted)', textTransform: 'uppercase', textAlign: 'center' };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: SLIP_COLS, gap: 6, alignItems: 'center', padding: '0 4px 8px' }}>
      <span style={{ ...lbl, textAlign: 'left' }}>Item</span>
      <span style={lbl}>OB</span><span style={lbl}>REC</span><span style={lbl}>CB</span>
      <span style={lbl}>SALE</span><span style={{ ...lbl, textAlign: 'right' }}>₹ AMT</span>
    </div>
  );
}

function SlipRow({ item, row, onField, alt }) {
  if (item.lump) {
    const amt = Number(row.lump) || 0;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 1fr 64px', gap: 8, alignItems: 'center', minHeight: 52, padding: '6px 4px', background: alt ? 'var(--row-alt)' : 'transparent', borderRadius: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{item.name}<span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 6 }}>lump</span></span>
        <NumCell value={row.lump || ''} onChange={v => onField('lump', v)} w={'100%'} placeholder="₹ amount" />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, color: amt ? 'var(--accent)' : 'var(--muted)', textAlign: 'right' }}>{rupee(amt)}</span>
      </div>
    );
  }
  const sale = saleOf(row);
  const amt = amtOf(row, item);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: SLIP_COLS, gap: 6, alignItems: 'center', minHeight: 52, padding: '4px', background: alt ? 'var(--row-alt)' : 'transparent', borderRadius: 10 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>₹{item.price}</div>
      </div>
      <NumCell value={row.ob} onChange={v => onField('ob', v)} w={46} />
      <NumCell value={row.rec} onChange={v => onField('rec', v)} w={46} />
      <NumCell value={row.cb} onChange={v => onField('cb', v)} w={46} />
      <span style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 600, color: sale ? 'var(--text)' : 'var(--muted)', textAlign: 'center' }}>{sale || '—'}</span>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, color: amt ? 'var(--accent)' : 'var(--muted)', textAlign: 'right' }}>{amt ? num(amt) : '—'}</span>
    </div>
  );
}

function CounterTable({ items, rows, base, setField }) {
  return (
    <div>
      <SlipHeader />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map((it, i) => (
          <SlipRow key={it.id} item={it} row={rows[it.id] || {}} alt={i % 2 === 1}
            onField={(k, v) => setField(`${base}.${it.id}.${k}`, v)} />
        ))}
      </div>
    </div>
  );
}

/* ── Parking block (lives inside Popcorn tab) ───────────────── */
function ParkingBlock({ show, setField }) {
  const expected = TOPS.parkingExpected(show);
  const gap = TOPS.parkingGap(show);
  return (
    <div style={{ marginTop: 24 }}>
      <Divider label="Parking" icon="parking" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
        {PARKING.map(p => {
          const cnt = Number(show.parking[p.id]) || 0;
          return (
            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 64px auto', gap: 12, alignItems: 'center', padding: '4px 4px' }}>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 500, color: 'var(--text)' }}>{p.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>₹{p.price} each</div>
              </div>
              <NumCell value={show.parking[p.id]} onChange={v => setField(`parking.${p.id}`, v)} w={64} />
              <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, color: cnt ? 'var(--text)' : 'var(--muted)', minWidth: 64, textAlign: 'right' }}>{rupee(cnt * p.price)}</span>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, padding: '12px 14px', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--card-border)' }}>
        <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>Expected collection</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>{rupee(expected)}</span>
      </div>
      <div style={{ marginTop: 12 }}>
        <Field label="Reported by staff (₹)" icon="wallet" type="text"
          value={show.parking.reported}
          onChange={v => setField('parking.reported', v.replace(/[^\d]/g, ''))} placeholder="Enter amount collected" />
      </div>
      {gap !== null && (
        gap > 0 ? (
          <div className="fade-up" style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, padding: '14px 16px', background: 'color-mix(in srgb, var(--red) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--red) 35%, transparent)', borderRadius: 14 }}>
            <Icon name="warn" size={22} color="var(--red)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14.5, fontWeight: 650, color: 'var(--red)' }}>Gap: {rupee(gap)} — staff short</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 1 }}>Expected {rupee(expected)} · reported {rupee(Number(show.parking.reported) || 0)}</div>
            </div>
          </div>
        ) : (
          <div className="fade-up" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, padding: '12px 16px', background: 'color-mix(in srgb, var(--green) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--green) 32%, transparent)', borderRadius: 14 }}>
            <Icon name="check" size={20} color="var(--green)" />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--green)' }}>{gap < 0 ? `Over by ${rupee(-gap)} — all clear` : 'No gap — collection tallies'}</span>
          </div>
        )
      )}
    </div>
  );
}

/* ════════ SHOW ENTRY ════════ */
function ShowEntryScreen({ theatre, show, tab, setTab, setField, onBack }) {
  const tabMeta = { main: MENU.main, popcorn: MENU.popcorn, cool: MENU.cool };
  const base = `counters.${tab}`;
  const counterSub = TOPS.counterTotal(show.counters[tab], tabMeta[tab]);
  const grand = TOPS.showRevenue(show);
  const upi = Number(show.payments.upi) || 0, cash = Number(show.payments.cash) || 0;
  const splitDiff = (upi + cash) - grand;

  return (
    <>
      <AppHeader
        left={<button onClick={onBack} style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--surface)', border: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginRight: 4 }}><Icon name="back" size={19} color="var(--text)" /></button>}
        title={<div><div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', lineHeight: 1.1 }}>Show {show.n} · {show.movie}</div><div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{theatre.name} · {show.time}</div></div>}
        right={<Badge status={show.status} />}
      />
      <Tabs tabs={TOPS.COUNTER_TABS} active={tab} onChange={setTab} />
      <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 18px' }}>
        <CounterTable items={tabMeta[tab]} rows={show.counters[tab]} base={base} setField={setField} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, padding: '12px 14px', background: 'var(--purple-chip)', borderRadius: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--purple-text)', fontWeight: 600 }}>{TOPS.COUNTER_TABS.find(t => t.id === tab).name} total</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 19, fontWeight: 600, color: 'var(--accent)' }}>{rupee(counterSub)}</span>
        </div>

        {tab === 'popcorn' && <ParkingBlock show={show} setField={setField} />}

        {/* Running total + payment split */}
        <Divider label="Payment Split" icon="coins" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 500 }}>Show running total</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 600, color: 'var(--accent)', textShadow: '0 0 22px var(--accent-glow)' }}>{rupee(grand)}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="UPI (₹)" value={show.payments.upi} onChange={v => setField('payments.upi', v.replace(/[^\d]/g, ''))} placeholder="0" />
          <Field label="Cash (₹)" value={show.payments.cash} onChange={v => setField('payments.cash', v.replace(/[^\d]/g, ''))} placeholder="0" />
        </div>
        {(show.payments.upi !== '' || show.payments.cash !== '') && splitDiff !== 0 && (
          <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="warn" size={14} color="var(--red)" />
            {splitDiff > 0 ? `Split exceeds total by ${rupee(splitDiff)}` : `Split under total by ${rupee(-splitDiff)}`}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0, display: 'flex', gap: 12, padding: '14px 18px', borderTop: '1px solid var(--card-border)', background: 'var(--bg)' }}>
        <Btn full icon="check" onClick={onBack}>Save Show</Btn>
      </div>
    </>
  );
}

/* ════════ DAY CLOSE ════════ */
function EditableRow({ a, b, onA, onB, onDel, aPh, bPh }) {
  return (
    <div className="fade-up" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <input value={a} onChange={e => onA(e.target.value)} placeholder={aPh}
        style={{ flex: 1, minWidth: 0, height: 48, padding: '0 14px', background: 'var(--input-bg)', border: '1.5px solid var(--input-border)', borderRadius: 'var(--r-input)', color: 'var(--text)', fontSize: 15, fontFamily: 'inherit', outline: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', height: 48, padding: '0 12px', background: 'var(--input-bg)', border: '1.5px solid var(--input-border)', borderRadius: 'var(--r-input)', width: 110 }}>
        <span style={{ color: 'var(--muted)', fontSize: 15, marginRight: 2 }}>₹</span>
        <input inputMode="numeric" value={b} onChange={e => onB(e.target.value.replace(/[^\d]/g, ''))} placeholder={bPh || '0'}
          style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 15, fontFamily: 'var(--mono)', fontWeight: 500, minWidth: 0 }} />
      </div>
      <button onClick={onDel} style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 11, background: 'transparent', border: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon name="trash" size={17} color="var(--muted)" /></button>
    </div>
  );
}

function AddRowBtn({ label, onClick }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 14px', background: 'transparent', border: '1.5px dashed var(--card-border)', borderRadius: 'var(--r-input)', color: 'var(--accent)', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', width: '100%', justifyContent: 'center', marginTop: 2 }}>
      <Icon name="plus" size={16} color="var(--accent)" />{label}
    </button>
  );
}

function DayCloseScreen({ theatre, close, setClose, onBack }) {
  const sales = TOPS.theatreRevenue(theatre);
  const expenses = close.expenses.reduce((s, e) => s + (Number(e.amt) || 0), 0);
  const wages = close.wages.reduce((s, w) => s + (Number(w.amt) || 0), 0);
  const upiTotal = close.upi.reduce((s, u) => s + (Number(u.amt) || 0), 0);
  const totalExp = expenses + wages;
  const balanceCash = sales - totalExp - upiTotal;
  const uid = () => Math.random().toString(36).slice(2, 8);

  const setList = (key, list) => setClose({ ...close, [key]: list });
  const upd = (key, id, field, val) => setList(key, close[key].map(r => r.id === id ? { ...r, [field]: val } : r));
  const del = (key, id) => setList(key, close[key].filter(r => r.id !== id));

  return (
    <>
      <AppHeader
        left={<button onClick={onBack} style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--surface)', border: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginRight: 4 }}><Icon name="back" size={19} color="var(--text)" /></button>}
        title={<div><div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', lineHeight: 1.1 }}>Close Day</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{theatre.name} · {TOPS.TODAY}</div></div>}
      />
      <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
        {/* show summary */}
        <Divider label="Show Summary" icon="reel" />
        <Card style={{ overflow: 'hidden' }}>
          {theatre.shows.filter(s => s.status !== 'pending').map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderTop: i ? '1px solid var(--card-border)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--muted)' }}>{s.time}</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>Show {s.n}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{s.occ}%</span>
              </div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{rupee(TOPS.showRevenue(s))}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderTop: '1px solid var(--card-border)', background: 'var(--purple-chip)' }}>
            <span style={{ fontSize: 14, fontWeight: 650, color: 'var(--purple-text)' }}>Total Sales</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 17, fontWeight: 600, color: 'var(--accent)' }}>{rupee(sales)}</span>
          </div>
        </Card>

        {/* expenses */}
        <div style={{ marginTop: 22 }}><Divider label="Expenses" icon="receipt" /></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {close.expenses.map(e => <EditableRow key={e.id} a={e.label} b={e.amt} aPh="Expense" onA={v => upd('expenses', e.id, 'label', v)} onB={v => upd('expenses', e.id, 'amt', v)} onDel={() => del('expenses', e.id)} />)}
          <AddRowBtn label="Add expense" onClick={() => setList('expenses', [...close.expenses, { id: uid(), label: '', amt: '' }])} />
        </div>

        {/* wages */}
        <div style={{ marginTop: 22 }}><Divider label="Staff Wages" icon="user" /></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {close.wages.map(w => <EditableRow key={w.id} a={w.name} b={w.amt} aPh="Staff name" onA={v => upd('wages', w.id, 'name', v)} onB={v => upd('wages', w.id, 'amt', v)} onDel={() => del('wages', w.id)} />)}
          <AddRowBtn label="Add staff wage" onClick={() => setList('wages', [...close.wages, { id: uid(), name: '', amt: '' }])} />
        </div>

        {/* upi breakdown */}
        <div style={{ marginTop: 22 }}><Divider label="UPI Breakdown" icon="wallet" /></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {close.upi.map(u => <EditableRow key={u.id} a={u.label} b={u.amt} aPh="App / source" onA={v => upd('upi', u.id, 'label', v)} onB={v => upd('upi', u.id, 'amt', v)} onDel={() => del('upi', u.id)} />)}
          <AddRowBtn label="Add UPI source" onClick={() => setList('upi', [...close.upi, { id: uid(), label: '', amt: '' }])} />
        </div>
        <div style={{ height: 8 }} />
      </div>

      {/* sticky settlement bar */}
      <div style={{ flexShrink: 0, padding: '14px 18px', borderTop: '1px solid var(--card-border)', background: 'linear-gradient(180deg, var(--surface), var(--bg))' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <Mini label="Total Sales" value={rupee(sales)} />
          <Mini label="Total Expenses" value={rupee(totalExp)} tone="red" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'var(--bg)', border: '1px solid var(--card-border)', borderRadius: 16 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>Balance Cash</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>after {rupee(upiTotal)} UPI</div>
          </div>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 30, fontWeight: 600, color: 'var(--accent)', textShadow: '0 0 26px var(--accent-glow)' }}>{rupee(balanceCash)}</span>
        </div>
      </div>
    </>
  );
}
function Mini({ label, value, tone }) {
  return (
    <div style={{ flex: 1, padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--card-border)', borderRadius: 12 }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>{label}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 600, color: tone === 'red' ? 'var(--red)' : 'var(--text)', marginTop: 3 }}>{value}</div>
    </div>
  );
}

Object.assign(window, { ShowEntryScreen, DayCloseScreen });
