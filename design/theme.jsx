// theme.jsx — design tokens, currency, sample data, icons, motifs
// Exposes to window: TOPS (namespace) with everything.

// ── Currency: Indian grouping with ₹ ───────────────────────────
const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
function rupee(n) {
  const v = Math.round(Number(n) || 0);
  const sign = v < 0 ? '−' : '';
  return sign + '₹' + inrFmt.format(Math.abs(v));
}
function num(n) {
  return inrFmt.format(Math.round(Number(n) || 0));
}

// ── Accent palettes (the "amber vs alternatives" tweak) ─────────
const ACCENTS = {
  amber:    { label: 'Amber',     hex: '#f59e0b', ink: '#1a1206' },
  marigold: { label: 'Marigold',  hex: '#fbbf24', ink: '#231803' },
  rosegold: { label: 'Rose Gold', hex: '#eaa17e', ink: '#241008' },
  cyan:     { label: 'Neon Cyan', hex: '#38bdf8', ink: '#04141d' },
  magenta:  { label: 'Magenta',   hex: '#e879c6', ink: '#220519' },
};

// ── Item catalogues per counter (name, price) ───────────────────
// BMS combo is a lump-sum entry (manual ₹), flagged lump:true.
const MENU = {
  main: [
    { id: 'vegpuff',  name: 'Veg Puff',     price: 40 },
    { id: 'eggpuff',  name: 'Egg Puff',     price: 40 },
    { id: 'samosa',   name: 'Samosa',       price: 80 },
    { id: 'cknpuff',  name: 'Ckn Puff',     price: 40 },
    { id: 'hcake',    name: 'H. Cake',      price: 40 },
    { id: 'jambun',   name: 'Jam Bun',      price: 40 },
    { id: 'chips',    name: 'Chips',        price: 45 },
    { id: 'frymes',   name: 'Frymes',       price: 40 },
    { id: 'kettle',   name: 'Kettle Chips', price: 40 },
    { id: 'water',    name: 'Water',        price: 30 },
    { id: 'mshake',   name: 'Milkshake',    price: 30 },
    { id: 'frooty',   name: 'Frooty',       price: 40 },
    { id: 'tin',      name: 'Tin',          price: 70 },
  ],
  popcorn: [
    { id: 'cone_s',   name: 'Cone S',  price: 60 },
    { id: 'cone_m',   name: 'Cone M',  price: 130 },
    { id: 'cone_l',   name: 'Cone L',  price: 200 },
    { id: 'bms',      name: 'BMS Combo',     price: 0, lump: true },
  ],
  cool: [
    { id: 'c_water',  name: 'Water',             price: 30 },
    { id: 'c_tin',    name: 'Tin',               price: 70 },
    { id: 'c_frooty', name: 'Frooty / Tropicana', price: 40 },
    { id: 'c_mshake', name: 'Milkshake',         price: 50 },
    { id: 'c_fries',  name: 'French Fries',      price: 70 },
    { id: 'c_vbites', name: 'Veg Bites',         price: 70 },
    { id: 'c_osam',   name: 'Onion Samosa',      price: 80 },
    { id: 'c_cpop',   name: 'Ckn Popcorn',       price: 80 },
    { id: 'c_csam',   name: 'Ckn Samosa',        price: 120 },
    { id: 'c_cnug',   name: 'Ckn Nuggets',       price: 100 },
    { id: 'c_sand',   name: 'Sandwich',          price: 120 },
  ],
};

const PARKING = [
  { id: 'scooter', name: 'Scooter', price: 20 },
  { id: 'auto',    name: 'Auto',    price: 40 },
  { id: 'car',     name: 'Car',     price: 80 },
];

const COUNTER_TABS = [
  { id: 'main',    name: 'Main Counter' },
  { id: 'popcorn', name: 'Popcorn' },
  { id: 'cool',    name: 'Cool Drinks' },
];

// ── Slip math ───────────────────────────────────────────────────
// SALE = OB + REC − CB ;  AMT = SALE × price  (lump rows: AMT entered directly)
function saleOf(row) {
  return Math.max(0, (Number(row.ob) || 0) + (Number(row.rec) || 0) - (Number(row.cb) || 0));
}
function amtOf(row, item) {
  if (item.lump) return Number(row.lump) || 0;
  return saleOf(row) * item.price;
}
function counterTotal(rows, items) {
  return items.reduce((s, it) => s + amtOf(rows[it.id] || {}, it), 0);
}

// ── Seed helpers ────────────────────────────────────────────────
function emptyRows(items) {
  const o = {};
  items.forEach(it => { o[it.id] = { ob: '', rec: '', cb: '' }; });
  return o;
}
// seed a row set with believable sold quantities
function seedRows(items, seed) {
  const o = {};
  items.forEach((it, i) => {
    const sold = seed[it.id];
    if (it.lump) { o[it.id] = { ob: '', rec: '', cb: '', lump: sold || '' }; return; }
    if (sold == null) { o[it.id] = { ob: '', rec: '', cb: '' }; return; }
    // express a sold count as ob/rec/cb that nets to `sold`
    const ob = 20 + (i % 5) * 4;
    const rec = 30;
    const cb = ob + rec - sold;
    o[it.id] = { ob: String(ob), rec: String(rec), cb: String(cb < 0 ? 0 : cb) };
  });
  return o;
}

// ── Sample data ─────────────────────────────────────────────────
const TODAY = 'Tue, 3 Jun 2026';

function seededShow(over) {
  return {
    payments: { upi: '', cash: '' },
    counters: {
      main: emptyRows(MENU.main),
      popcorn: emptyRows(MENU.popcorn),
      cool: emptyRows(MENU.cool),
    },
    parking: { scooter: '', auto: '', car: '', reported: '' },
    ...over,
  };
}

function buildSeed() {
  // Sandhya — KGF Chapter 2 (Kannada): 3 shows, ~₹33,440 running
  const sandhyaShows = [
    {
      id: 's1', n: 1, time: '10:15 AM', movie: 'KGF Chapter 2', lang: 'Kannada',
      occ: 87, status: 'complete',
      counters: {
        main: seedRows(MENU.main, { vegpuff: 42, eggpuff: 26, samosa: 18, cknpuff: 22, chips: 30, water: 55, frooty: 24, tin: 12 }),
        popcorn: seedRows(MENU.popcorn, { cone_s: 40, cone_m: 28, cone_l: 14, bms: 2400 }),
        cool: seedRows(MENU.cool, { c_water: 60, c_tin: 18, c_frooty: 22, c_fries: 16, c_cpop: 12, c_sand: 8 }),
      },
      parking: { scooter: '64', auto: '12', car: '28', reported: '3220' },
      payments: { upi: '7800', cash: '5640' },
    },
    {
      id: 's2', n: 2, time: '1:30 PM', movie: 'KGF Chapter 2', lang: 'Kannada',
      occ: 64, status: 'complete',
      counters: {
        main: seedRows(MENU.main, { vegpuff: 30, eggpuff: 18, samosa: 12, chips: 22, water: 40, frooty: 16 }),
        popcorn: seedRows(MENU.popcorn, { cone_s: 28, cone_m: 18, cone_l: 8 }),
        cool: seedRows(MENU.cool, { c_water: 44, c_tin: 12, c_frooty: 15, c_fries: 10 }),
      },
      parking: { scooter: '48', auto: '8', car: '20', reported: '2480' },
      payments: { upi: '5200', cash: '3900' },
    },
    {
      id: 's3', n: 3, time: '6:45 PM', movie: 'KGF Chapter 2', lang: 'Kannada',
      occ: 92, status: 'inprogress',
      ...seededShow({
        counters: {
          main: seedRows(MENU.main, { vegpuff: 20, water: 30, chips: 14 }),
          popcorn: seedRows(MENU.popcorn, { cone_s: 18, cone_m: 10 }),
          cool: emptyRows(MENU.cool),
        },
        parking: { scooter: '30', auto: '5', car: '12', reported: '' },
        payments: { upi: '', cash: '' },
      }),
    },
    {
      id: 's4', n: 4, time: '9:45 PM', movie: 'KGF Chapter 2', lang: 'Kannada',
      occ: 0, status: 'pending',
      ...seededShow(),
    },
  ];

  const manasaShows = [
    {
      id: 'm1', n: 1, time: '11:00 AM', movie: 'Pushpa 2', lang: 'Telugu',
      occ: 78, status: 'complete',
      counters: {
        main: seedRows(MENU.main, { vegpuff: 34, samosa: 16, chips: 26, water: 48, tin: 10 }),
        popcorn: seedRows(MENU.popcorn, { cone_s: 36, cone_m: 22, cone_l: 12, bms: 1800 }),
        cool: seedRows(MENU.cool, { c_water: 52, c_tin: 14, c_fries: 14, c_cnug: 9 }),
      },
      parking: { scooter: '58', auto: '10', car: '24', reported: '2580' },
      payments: { upi: '6400', cash: '4720' },
    },
    {
      id: 'm2', n: 2, time: '3:15 PM', movie: 'Pushpa 2', lang: 'Telugu',
      occ: 71, status: 'inprogress',
      ...seededShow({
        counters: {
          main: seedRows(MENU.main, { vegpuff: 24, water: 34 }),
          popcorn: seedRows(MENU.popcorn, { cone_s: 22, cone_m: 12 }),
          cool: emptyRows(MENU.cool),
        },
        parking: { scooter: '40', auto: '6', car: '16', reported: '' },
      }),
    },
    {
      id: 'm3', n: 3, time: '7:30 PM', movie: 'Pushpa 2', lang: 'Telugu',
      occ: 0, status: 'pending', ...seededShow(),
    },
  ];

  return {
    theatres: {
      sandhya: { id: 'sandhya', name: 'Sandhya', city: 'Gandhi Bazaar, Bengaluru', capacity: 714, shows: sandhyaShows },
      manasa:  { id: 'manasa',  name: 'Manasa',  city: 'Jayanagar, Bengaluru',     capacity: 524, shows: manasaShows },
    },
    dayClose: {
      sandhya: {
        expenses: [
          { id: 'e1', label: 'Diesel — generator', amt: '1200' },
          { id: 'e2', label: 'Housekeeping supplies', amt: '650' },
        ],
        wages: [
          { id: 'w1', name: 'Ravi (Projection)', amt: '900' },
          { id: 'w2', name: 'Lakshmi (Counter)', amt: '700' },
          { id: 'w3', name: 'Suresh (Parking)', amt: '600' },
        ],
        upi: [
          { id: 'u1', label: 'PhonePe', amt: '8200' },
          { id: 'u2', label: 'Google Pay', amt: '4800' },
        ],
      },
      manasa: { expenses: [], wages: [], upi: [] },
    },
  };
}

// ── Status meta ─────────────────────────────────────────────────
const STATUS = {
  complete:   { label: 'Complete',    tone: 'green', dot: '✓' },
  inprogress: { label: 'In Progress', tone: 'amber', dot: '◐' },
  pending:    { label: 'Not Started', tone: 'muted', dot: '○' },
  incomplete: { label: 'Incomplete',  tone: 'red',   dot: '!' },
};

// ── Aggregations ────────────────────────────────────────────────
function foodTotal(show) {
  return counterTotal(show.counters.main, MENU.main)
    + counterTotal(show.counters.popcorn, MENU.popcorn)
    + counterTotal(show.counters.cool, MENU.cool);
}
function parkingExpected(show) {
  return PARKING.reduce((s, p) => s + (Number(show.parking[p.id]) || 0) * p.price, 0);
}
function parkingGap(show) {
  const rep = show.parking.reported;
  if (rep === '' || rep == null) return null;            // not yet reported
  return parkingExpected(show) - (Number(rep) || 0);     // >0 means short
}
function showRevenue(show) {
  return foodTotal(show) + (Number(show.parking.reported) || 0);
}
function theatreRevenue(t) {
  return t.shows.reduce((s, sh) => s + showRevenue(sh), 0);
}
function showsToday(t) {
  return t.shows.filter(s => s.status !== 'pending').length;
}

window.TOPS = {
  rupee, num, ACCENTS, MENU, PARKING, COUNTER_TABS, STATUS,
  saleOf, amtOf, counterTotal, emptyRows, buildSeed, TODAY,
  foodTotal, parkingExpected, parkingGap, showRevenue, theatreRevenue, showsToday,
};
