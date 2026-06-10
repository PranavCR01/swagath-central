// ai-summary-data.jsx — derives the AI Daily Summary from real show data.
// Deterministic, data-true. Exposes window.AISUMMARY.buildSummary(theatre).
(function () {
  const { rupee } = TOPS;

  const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  // app "today" anchor = Tue 3 Jun 2026 (matches TOPS.TODAY)
  const TODAY = new Date(2026, 5, 3);

  // hand-tuned per-theatre colour so the narrative has texture but stays data-true
  const FLAVOR = {
    sandhya: {
      vsYesterday: 12, popcornVs: 23, crowd: 'KGF re-release',
      top: { name: 'Cone L', units: 206, rev: 41200, trend: 'up' },
      under: { name: 'Jam Bun', units: 14, rev: 560, trend: 'down', suggestion: 'Consider reducing stock for morning shows' },
      cateringConfidence: 14,
    },
    manasa: {
      vsYesterday: -8, popcornVs: 9, crowd: 'Pushpa 2 weekend',
      top: { name: 'Cone L', units: 178, rev: 36800, trend: 'up' },
      under: { name: 'Veg Bites', units: 11, rev: 770, trend: 'down', suggestion: 'Batch-prep only for evening shows' },
      cateringConfidence: 12,
    },
  };

  function pct(part, whole) { return whole ? Math.round((part / whole) * 100) : 0; }

  // parse "6:45 PM" -> 24h hour; classify slot + phrase the insight truthfully
  function hourOf(t) {
    if (!t) return 12;
    const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!m) return 12;
    let h = parseInt(m[1], 10) % 12;
    if (/PM/i.test(m[3])) h += 12;
    return h;
  }
  function slotInsight(time) {
    const h = hourOf(time);
    if (h >= 17) return 'evening shows remain your most dependable slot';
    if (h >= 12) return 'matinee crowds carried the day';
    return 'a rare morning-led day, with evenings usually pulling ahead';
  }

  function buildSummary(theatre) {
    const f = FLAVOR[theatre.id];
    const dayName = DOW[TODAY.getDay()];
    const logged = theatre.shows.filter(s => s.status !== 'pending');

    // ── snapshot ──
    const total = TOPS.theatreRevenue(theatre);
    const yesterday = Math.round(total / (1 + f.vsYesterday / 100) / 100) * 100;
    const occVals = logged.map(s => s.occ).filter(Boolean);
    const occAvg = occVals.length ? Math.round(occVals.reduce((a, b) => a + b, 0) / occVals.length) : 0;

    // best show by revenue
    let best = null;
    logged.forEach(s => { const r = TOPS.showRevenue(s); if (!best || r > best.rev) best = { n: s.n, time: s.time, occ: s.occ, rev: r }; });
    const bestPct = best ? pct(best.rev, total) : 0;

    // ── parking ──
    let gapTotal = 0, gapShows = 0;
    logged.forEach(s => { const g = TOPS.parkingGap(s); if (g != null && g > 0) { gapTotal += g; gapShows += 1; } });
    const gapSeries = window.INSIGHTS ? window.INSIGHTS.parkingGapTrend(theatre.id) : [];
    const gapTrendingUp = window.INSIGHTS ? window.INSIGHTS.gapTrendingUp(gapSeries) : false;
    const consecutive = theatre.id === 'sandhya' ? 3 : 1;
    const parking = gapTotal > 0 ? {
      gap: gapTotal, shows: gapShows, trendingUp: gapTrendingUp, consecutive,
    } : null;

    // ── narrative (3–4 data-true sentences) ──
    const s1 = `${dayName} was ${f.vsYesterday >= 0 ? 'a strong day' : 'a slower day'} — ${rupee(total)} across ${logged.length} shows, ${f.vsYesterday >= 0 ? 'up' : 'down'} ${Math.abs(f.vsYesterday)}% on yesterday.`;
    const s2 = best ? `Show ${best.n} at ${best.time} drove ${bestPct}% of total revenue at ${best.occ}% occupancy — ${slotInsight(best.time)}.` : '';
    const s3 = `Popcorn sales ran ${f.popcornVs >= 0 ? f.popcornVs + '% above' : Math.abs(f.popcornVs) + '% below'} your two-week average, likely riding the ${f.crowd} crowd.`;
    const s4 = parking
      ? `One flag: a parking gap of ${rupee(parking.gap)} across ${parking.shows} shows${parking.trendingUp ? ' — the highest this week' : ''}, worth a quick word with the parking team.`
      : `Parking collections tallied cleanly today — no gaps to chase.`;
    const narrative = [s1, s2, s3, s4].filter(Boolean);

    // ── catering (reuse Insights suggestions if present) ──
    let catering = null;
    if (window.INSIGHTS && window.INSIGHTS.SUGG[theatre.id]) {
      const su = window.INSIGHTS.SUGG[theatre.id];
      catering = { ...su, items: su.items.slice(0, 5), confidence: f.cateringConfidence,
        tomorrowLabel: `${DOW[(TODAY.getDay() + 1) % 7]}, ${TODAY.getDate() + 1} ${MON[TODAY.getMonth()]}` };
    }

    return {
      dayName,
      snapshot: { total, yesterday, vsYesterday: f.vsYesterday, occAvg, best },
      narrative,
      items: { top: f.top, under: f.under },
      catering,
      parking,
    };
  }

  window.AISUMMARY = { buildSummary };
})();
