import type { MainCounterRow, PopcornRow, CoolDrinksRow, TabRows } from '@/lib/types'
import {
  MAIN_ITEMS, POPCORN_ITEMS, CD_ALL,
  MC_DB_KEY, PC_DB_KEY, CD_DB_KEY,
  flatToRows, applyCarryForward,
} from '@/components/slips/slipData'

export interface MismatchEntry {
  slip: 'mc' | 'pc' | 'cd'
  expectedRows: TabRows
  prevLabel: string
  fingerprint: string
}

export function buildMismatchEntries(params: {
  prevMcRaw: Record<string, unknown> | null
  prevPcRaw: Record<string, unknown> | null
  prevCdRaw: Record<string, unknown> | null
  mcData: MainCounterRow | null
  pcData: PopcornRow | null
  cdData: CoolDrinksRow | null
  seenValue: string | null | undefined
  prevLabel: string
}): {
  mismatches: MismatchEntry[]
  mcExpected: TabRows | null
  pcExpected: TabRows | null
  cdExpected: TabRows | null
  fingerprint: string
} {
  const { prevMcRaw, prevPcRaw, prevCdRaw, mcData, pcData, cdData, seenValue, prevLabel } = params

  const mcExpected = prevMcRaw
    ? applyCarryForward(flatToRows(prevMcRaw, MAIN_ITEMS, MC_DB_KEY), MAIN_ITEMS)
    : null
  const pcExpected = prevPcRaw
    ? applyCarryForward(flatToRows(prevPcRaw, POPCORN_ITEMS, PC_DB_KEY), POPCORN_ITEMS)
    : null
  const cdExpected = prevCdRaw
    ? applyCarryForward(flatToRows(prevCdRaw, CD_ALL, CD_DB_KEY), CD_ALL)
    : null

  const fingerprint = JSON.stringify({
    mc: mcExpected ? Object.fromEntries(MAIN_ITEMS.map(i => [i.id, mcExpected[i.id]?.ob ?? '0'])) : null,
    pc: pcExpected ? Object.fromEntries(POPCORN_ITEMS.map(i => [i.id, pcExpected[i.id]?.ob ?? '0'])) : null,
    cd: cdExpected ? Object.fromEntries(CD_ALL.map(i => [i.id, cdExpected[i.id]?.ob ?? '0'])) : null,
  })

  const mismatches: MismatchEntry[] = []

  if (mcData && mcExpected && seenValue !== fingerprint) {
    const saved = flatToRows(mcData as Record<string, unknown>, MAIN_ITEMS, MC_DB_KEY)
    if (MAIN_ITEMS.some(i => (saved[i.id]?.ob ?? '0') !== (mcExpected[i.id]?.ob ?? '0')))
      mismatches.push({ slip: 'mc', expectedRows: mcExpected, prevLabel, fingerprint })
  }
  if (pcData && pcExpected && seenValue !== fingerprint) {
    const saved = flatToRows(pcData as Record<string, unknown>, POPCORN_ITEMS, PC_DB_KEY)
    if (POPCORN_ITEMS.some(i => (saved[i.id]?.ob ?? '0') !== (pcExpected[i.id]?.ob ?? '0')))
      mismatches.push({ slip: 'pc', expectedRows: pcExpected, prevLabel, fingerprint })
  }
  if (cdData && cdExpected && seenValue !== fingerprint) {
    const saved = flatToRows(cdData as Record<string, unknown>, CD_ALL, CD_DB_KEY)
    if (CD_ALL.some(i => (saved[i.id]?.ob ?? '0') !== (cdExpected[i.id]?.ob ?? '0')))
      mismatches.push({ slip: 'cd', expectedRows: cdExpected, prevLabel, fingerprint })
  }

  return { mismatches, mcExpected, pcExpected, cdExpected, fingerprint }
}
