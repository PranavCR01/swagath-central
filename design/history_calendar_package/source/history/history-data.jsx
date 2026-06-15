// history-data.jsx — sample day-entry data for the History page.
// Each entry = one theatre's single day. Newest first. Exposes window.HIST.
(function () {
  const fmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
  const rupee = n => '₹' + fmt.format(Math.round(n));
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // seeded PRNG for stable numbers
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const r = rng(20260613);

  // weekend lift for single-screen halls
  function dowMult(dow) { return dow === 6 ? 1.4 : dow === 0 ? 1.32 : dow === 5 ? 1.2 : dow === 1 ? 0.82 : 0.95; }
  const BASE = { Sandhya: 56000, Manasa: 44000 };

  // build entries from (year, month0, day) descending. today = 13 Jun 2026.
  function entry(y, m, d, theatre, opts = {}) {
    const date = new Date(y, m, d);
    const dow = date.getDay();
    const noise = 0.84 + r() * 0.32;
    const sales = opts.sales != null ? opts.sales : Math.round(BASE[theatre] * dowMult(dow) * noise / 100) * 100;
    const shows = opts.shows != null ? opts.shows : (dow === 6 || dow === 0 ? 4 : 3);
    // balance cash ~ 58-72% of sales (rest is UPI + expenses)
    const bcash = opts.bcash != null ? opts.bcash : Math.round(sales * (0.58 + r() * 0.14) / 100) * 100;
    return {
      id: `${theatre}-${y}-${m}-${d}`,
      y, m, d, dow, theatre,
      dateLabel: `${d} ${MON[m]}`,
      dowLabel: DOW[dow],
      shows, sales, bcash,
      status: opts.status || 'closed',
      monthKey: `${y}-${m}`,
    };
  }

  const E = [];
  // ── June 2026 (partial, today = 15th) ──
  // 15th — today, both still open / in progress
  E.push(entry(2026, 5, 15, 'Sandhya', { status: 'open', shows: 2, sales: 26400, bcash: 15800 }));
  E.push(entry(2026, 5, 15, 'Manasa', { status: 'open', shows: 1, sales: 11200, bcash: 6900 }));
  // 14th — closed
  E.push(entry(2026, 5, 14, 'Sandhya'));
  E.push(entry(2026, 5, 14, 'Manasa'));
  // 13 → 1, both theatres each day (skip a few to feel real)
  const juneDays = [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
  juneDays.forEach(d => {
    E.push(entry(2026, 5, d, 'Sandhya'));
    // Manasa occasionally dark on a slow weekday
    if (!(d === 9 || d === 3)) E.push(entry(2026, 5, d, 'Manasa'));
  });
  // ── May 2026 (full) ──
  const mayDays = [31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 12, 10, 8, 5, 3, 1];
  mayDays.forEach(d => {
    E.push(entry(2026, 4, d, 'Sandhya'));
    if (!(d === 28 || d === 19 || d === 12 || d === 5)) E.push(entry(2026, 4, d, 'Manasa'));
  });
  // ── April 2026 (tail, for "load more") ──
  const aprDays = [30, 29, 28, 27, 26, 25, 24, 22, 20, 18, 16, 14, 12, 10, 8, 6, 4, 2];
  aprDays.forEach(d => {
    E.push(entry(2026, 3, d, 'Sandhya'));
    if (!(d === 27 || d === 20 || d === 12)) E.push(entry(2026, 3, d, 'Manasa'));
  });

  // group into months (preserving order), optionally filtered by theatre
  function grouped(filter) {
    const list = filter && filter !== 'All' ? E.filter(e => e.theatre === filter) : E;
    const months = [];
    const byKey = {};
    list.forEach(e => {
      if (!byKey[e.monthKey]) {
        byKey[e.monthKey] = { key: e.monthKey, y: e.y, m: e.m, label: `${MONTH_FULL[e.m]} ${e.y}`, entries: [] };
        months.push(byKey[e.monthKey]);
      }
      byKey[e.monthKey].entries.push(e);
    });
    months.forEach(mo => {
      mo.total = mo.entries.reduce((s, e) => s + e.sales, 0);
      mo.bcash = mo.entries.reduce((s, e) => s + e.bcash, 0);
      mo.days = new Set(mo.entries.map(e => e.d)).size;
      mo.count = mo.entries.length;
    });
    return months;
  }

  function counts() {
    return {
      All: E.length,
      Sandhya: E.filter(e => e.theatre === 'Sandhya').length,
      Manasa: E.filter(e => e.theatre === 'Manasa').length,
    };
  }

  // group into months → date-rows (each date holds both theatres). Newest first.
  function groupedByDate() {
    const months = [];
    const byKey = {};
    E.forEach(e => {
      if (!byKey[e.monthKey]) {
        byKey[e.monthKey] = { key: e.monthKey, y: e.y, m: e.m, label: `${MONTH_FULL[e.m]} ${e.y}`, dates: [], _dmap: {} };
        months.push(byKey[e.monthKey]);
      }
      const mo = byKey[e.monthKey];
      const dkey = e.d;
      if (!mo._dmap[dkey]) {
        mo._dmap[dkey] = { d: e.d, dow: e.dow, dowLabel: e.dowLabel, dateLabel: e.dateLabel, byTheatre: {}, list: [] };
        mo.dates.push(mo._dmap[dkey]);
      }
      mo._dmap[dkey].byTheatre[e.theatre] = e;
      mo._dmap[dkey].list.push(e);
    });
    months.forEach(mo => {
      delete mo._dmap;
      mo.dates.forEach(dt => {
        // stable order: Sandhya first, then Manasa
        dt.list.sort((a, b) => (a.theatre === 'Sandhya' ? -1 : 1) - (b.theatre === 'Sandhya' ? -1 : 1));
        dt.shows = dt.list.reduce((s, e) => s + e.shows, 0);
        dt.sales = dt.list.reduce((s, e) => s + e.sales, 0);
        dt.bcash = dt.list.reduce((s, e) => s + e.bcash, 0);
        dt.anyOpen = dt.list.some(e => e.status === 'open');
      });
      mo.total = mo.dates.reduce((s, dt) => s + dt.sales, 0);
      mo.bcash = mo.dates.reduce((s, dt) => s + dt.bcash, 0);
      mo.days = mo.dates.length;
    });
    return months;
  }

  window.HIST = { E, grouped, groupedByDate, counts, rupee, fmt, MON, DOW };

  // ── calendar helpers ──
  const TODAY = { y: 2026, m: 5, d: 15 };
  // entries for a given y/m/d, optionally filtered by theatre
  function dayEntries(y, m, d, filter) {
    return E.filter(e => e.y === y && e.m === m && e.d === d && (!filter || filter === 'All' || e.theatre === filter));
  }
  // status for a calendar cell: 'open' | 'closed' | null (no data)
  function dayStatus(y, m, d, filter) {
    const list = dayEntries(y, m, d, filter);
    if (!list.length) return null;
    return list.some(e => e.status === 'open') ? 'open' : 'closed';
  }
  // last n distinct dates (newest first) with their entries, filtered
  function recentDays(n, filter) {
    const seen = [];
    const map = {};
    E.forEach(e => {
      if (filter && filter !== 'All' && e.theatre !== filter) return;
      const k = `${e.y}-${e.m}-${e.d}`;
      if (!map[k]) { map[k] = { y: e.y, m: e.m, d: e.d, dow: e.dow, dowLabel: e.dowLabel, list: [] }; seen.push(map[k]); }
      map[k].list.push(e);
    });
    seen.forEach(s => s.list.sort((a, b) => (a.theatre === 'Sandhya' ? -1 : 1) - (b.theatre === 'Sandhya' ? -1 : 1)));
    return seen.slice(0, n);
  }

  Object.assign(window.HIST, { TODAY, dayEntries, dayStatus, recentDays, MONTH_FULL });
})();
