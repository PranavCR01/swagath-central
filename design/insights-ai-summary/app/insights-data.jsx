// insights-data.jsx — deterministic analytics sample data + helpers
// Realistic single-screen Bangalore numbers. Exposes window.INSIGHTS.
(function () {
  const { rupee, num } = TOPS;

  // seeded PRNG so charts are stable across renders
  function rng(seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  // anchor: today = Fri 5 Jun 2026
  function dayLabels(n, endDate) {
    const out = [];
    const base = endDate || new Date(2026, 5, 5);
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(base); d.setDate(base.getDate() - i);
      out.push({ d: d.getDate(), m: d.getMonth(), dow: DOW[d.getDay()], date: d });
    }
    return out;
  }

  // weekend multiplier — Fri/Sat/Sun run hotter for single screens
  function dowMult(dow) {
    if (dow === 'Sat') return 1.42; if (dow === 'Sun') return 1.34;
    if (dow === 'Fri') return 1.22; if (dow === 'Mon') return 0.82;
    return 0.95 + (dow === 'Thu' ? 0.06 : 0);
  }

  // base daily revenue per theatre (₹). Sandhya slightly busier (KGF re-run pull).
  const BASE = { sandhya: 48000, manasa: 41000 };

  function dailyRevenue(theatreId, days) {
    const labels = dayLabels(days);
    const r = rng(theatreId === 'sandhya' ? 7 : 13);
    return labels.map((l, i) => {
      const trend = 1 + (i / days) * 0.10;              // slow upward trend
      const noise = 0.86 + r() * 0.28;
      const v = Math.round(BASE[theatreId] * dowMult(l.dow) * trend * noise / 100) * 100;
      return { ...l, v };
    });
  }

  // show-slot performance (avg revenue per slot over range)
  const SLOTS = ['Show 1', 'Show 2', 'Show 3', 'Show 4', 'Show 5'];
  const SLOT_TIME = { sandhya: ['10:15', '1:30', '6:45', '9:45', '—'], manasa: ['11:00', '3:15', '7:30', '10:30', '—'] };
  function showPerf(theatreId) {
    // evening shows dominate; show 5 is late-night, smaller
    const shape = theatreId === 'sandhya'
      ? [9800, 8200, 15600, 13400, 5200]
      : [8600, 9400, 14200, 11800, 0];
    return SLOTS.map((s, i) => ({ label: s, time: SLOT_TIME[theatreId][i], v: shape[i] }));
  }

  // top items this week by revenue (₹)
  function topItems(theatreId) {
    const s = theatreId === 'sandhya'
      ? [['Cone L', 41200], ['BMS Combo', 33600], ['Cone M', 28400], ['Samosa', 19200], ['Water', 14700]]
      : [['Cone L', 36800], ['Cone M', 26600], ['BMS Combo', 24000], ['Ckn Popcorn', 18400], ['Samosa', 15360]];
    return s.map(([label, v]) => ({ label, v }));
  }

  // catering suggestions for tomorrow
  const SUGG = {
    sandhya: {
      movie: 'KGF Chapter 2', lang: 'Kannada', occ: 88, slot: 'Sat · 6:45 PM peak',
      items: [
        { name: 'Cone L', qty: 95, trend: 'up' },
        { name: 'Cone M', qty: 120, trend: 'up' },
        { name: 'BMS Combo', qty: 40, trend: 'flat' },
        { name: 'Samosa', qty: 80, trend: 'down' },
        { name: 'Water', qty: 220, trend: 'up' },
        { name: 'Veg Puff', qty: 70, trend: 'flat' },
      ],
    },
    manasa: {
      movie: 'Pushpa 2', lang: 'Telugu', occ: 81, slot: 'Sat · 7:30 PM peak',
      items: [
        { name: 'Cone L', qty: 82, trend: 'up' },
        { name: 'Cone M', qty: 105, trend: 'flat' },
        { name: 'Ckn Popcorn', qty: 60, trend: 'up' },
        { name: 'BMS Combo', qty: 32, trend: 'flat' },
        { name: 'Water', qty: 190, trend: 'up' },
        { name: 'Samosa', qty: 65, trend: 'down' },
      ],
    },
  };

  // 30-day parking gap trend (₹ short). Sandhya trending up (problem), Manasa stable.
  function parkingGapTrend(theatreId) {
    const labels = dayLabels(30);
    const r = rng(theatreId === 'sandhya' ? 21 : 29);
    return labels.map((l, i) => {
      let v;
      if (theatreId === 'sandhya') {
        v = 120 + (i / 30) * 520 + (r() - 0.5) * 180;   // climbing
      } else {
        v = 180 + (r() - 0.5) * 160;                     // flat-ish
      }
      return { ...l, v: Math.max(0, Math.round(v / 10) * 10) };
    });
  }

  // is the gap trending up? compare last-third avg to first-third avg
  function gapTrendingUp(series) {
    const n = series.length, k = Math.floor(n / 3);
    const first = series.slice(0, k).reduce((s, p) => s + p.v, 0) / k;
    const last = series.slice(n - k).reduce((s, p) => s + p.v, 0) / k;
    return last > first * 1.25;
  }

  // range -> number of days for revenue/topitems window
  const RANGES = [
    { id: 'week', label: 'This Week', days: 7 },
    { id: 'month', label: 'This Month', days: 30 },
    { id: 'last30', label: 'Last 30 Days', days: 30 },
  ];

  window.INSIGHTS = {
    dailyRevenue, showPerf, topItems, parkingGapTrend, gapTrendingUp,
    SUGG, RANGES, SLOTS, BASE,
  };
})();
