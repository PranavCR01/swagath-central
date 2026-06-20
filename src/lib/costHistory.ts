import { supabase } from './supabase'

// Keyed by item_key, entries sorted descending by effective_from (most recent first).
export type CostHistoryMap = Record<string, { effective_from: string; cost_price: number }[]>

// CD_COST uses column-prefix keys that differ from the canonical item_cost_history keys
// for three items whose PRICES/COSTS map uses a 'cd_' prefix to avoid collisions with
// the identically-named Main Counter items:
//   CD_COST['water']    → item_key 'cd_water'   (MC also has key 'water' → item_key 'water')
//   CD_COST['tin']      → item_key 'cd_tin'
//   CD_COST['milkshake']→ item_key 'cd_milkshake'
// Pass this as colKeyToHistKey whenever building a resolved map from CD_COST.
export const CD_COL_TO_HIST_KEY: Record<string, string> = {
  water:    'cd_water',
  tin:      'cd_tin',
  milkshake: 'cd_milkshake',
}

// Fetch all cost history for a theatre in one query.
// Returns {} (empty) on error so callers silently fall back to static COSTS.
export async function fetchCostHistory(theatreId: string): Promise<CostHistoryMap> {
  const { data, error } = await supabase
    .from('item_cost_history')
    .select('item_key, cost_price, effective_from')
    .eq('theatre_id', theatreId)
    .order('effective_from', { ascending: false })
  if (error || !data) return {}
  const map: CostHistoryMap = {}
  for (const row of data) {
    const key = row.item_key as string
    if (!map[key]) map[key] = []
    map[key].push({ effective_from: row.effective_from as string, cost_price: Number(row.cost_price) })
  }
  return map
}

// Find the most recent cost price effective on or before `date`.
// Falls back to `fallback` (the static COSTS value) when no matching row exists.
export function getCostOnDate(
  history: CostHistoryMap,
  item_key: string,
  date: string,
  fallback: number
): number {
  const entries = history[item_key]
  if (!entries || entries.length === 0) return fallback
  // entries are pre-sorted descending; first entry where effective_from <= date wins
  const entry = entries.find(e => e.effective_from <= date)
  return entry ? entry.cost_price : fallback
}

// Build a resolved cost map for a specific date.
// Produces a new object with the same keys as `staticCostMap`, each value resolved
// from history. Falls back to the static value when no history row covers that date.
//
// colKeyToHistKey: optional translator from the derived-map column-prefix key to the
// canonical item_cost_history item_key — required for CD_COST (pass CD_COL_TO_HIST_KEY).
// MC_COST and PC_COST keys are identical to the COSTS map keys, so no translator needed.
export function buildResolvedCostMap(
  history: CostHistoryMap,
  staticCostMap: Record<string, number>,
  date: string,
  colKeyToHistKey: Record<string, string> = {}
): Record<string, number> {
  const resolved: Record<string, number> = {}
  for (const colKey in staticCostMap) {
    const histKey = colKeyToHistKey[colKey] ?? colKey
    resolved[colKey] = getCostOnDate(history, histKey, date, staticCostMap[colKey])
  }
  return resolved
}
