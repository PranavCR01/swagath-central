import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Show, TabRows, MainCounterRow, PopcornRow, CoolDrinksRow, ParkingRow } from '@/lib/types'
import MainCounterSlip from '@/components/slips/MainCounterSlip'
import PopcornParkingSlip from '@/components/slips/PopcornParkingSlip'
import CoolDrinksSlip from '@/components/slips/CoolDrinksSlip'
import {
  MAIN_ITEMS, POPCORN_ITEMS, CD_ALL,
  MC_DB_KEY, PC_DB_KEY, CD_DB_KEY,
  TABS, type TabId,
  emptyRows, flatToRows, rowsToFlat, applyCarryForward,
} from '@/components/slips/slipData'

// ── Status helpers ────────────────────────────────────────────────
const STATUS_META = {
  complete:   { label: 'Complete',    dot: '✓', bg: 'rgba(34,197,94,0.16)',    fg: '#22c55e' },
  inprogress: { label: 'In Progress', dot: '◐', bg: 'rgba(245,158,11,0.16)',   fg: '#f59e0b' },
  pending:    { label: 'Not Started', dot: '○', bg: 'rgba(255,255,255,0.05)',  fg: 'rgba(255,255,255,0.38)' },
}

// ── Main component ────────────────────────────────────────────────
export default function ShowPage() {
  const { theatreId, showId } = useParams<{
    theatreId: string; date: string; showId: string
  }>()
  const navigate = useNavigate()
  const cancelled = useRef(false)

  const [showMeta, setShowMeta] = useState<Show | null>(null)
  const [theatreName, setTheatreName] = useState('')
  const [loading, setLoading] = useState(true)

  const [hasMc, setHasMc] = useState(false)
  const [hasPc, setHasPc] = useState(false)
  const [hasCd, setHasCd] = useState(false)

  const [activeTab, setActiveTab] = useState<TabId>('main')
  const [obNote, setObNote] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Main counter state
  const [mcRows, setMcRows] = useState<TabRows>(emptyRows(MAIN_ITEMS))
  const [mcUpi, setMcUpi] = useState('')
  const [mcCash, setMcCash] = useState('')
  const [miscDrinksMc, setMiscDrinksMc] = useState('')
  const [mcSaving, setMcSaving] = useState(false)
  const prevMiscMcRef = useRef(0)

  // Popcorn state
  const [pcRows, setPcRows] = useState<TabRows>(emptyRows(POPCORN_ITEMS))
  const [pcBms, setPcBms] = useState('')
  const [pcUpi, setPcUpi] = useState('')
  const [pcCash, setPcCash] = useState('')

  // Parking state
  const [pkScooter, setPkScooter] = useState('')
  const [pkAuto, setPkAuto] = useState('')
  const [pkCar, setPkCar] = useState('')
  const [pkReported, setPkReported] = useState('')
  const [pcSaving, setPcSaving] = useState(false)

  // Cool drinks state
  const [cdRows, setCdRows] = useState<TabRows>(emptyRows(CD_ALL))
  const [cdUpi, setCdUpi] = useState('')
  const [cdCash, setCdCash] = useState('')
  const [miscDrinksCd, setMiscDrinksCd] = useState('')
  const [cdSaving, setCdSaving] = useState(false)
  const prevMiscCdRef = useRef(0)

  // ── Load on mount ───────────────────────────────────────────────
  useEffect(() => {
    cancelled.current = false
    if (!showId || !theatreId) return

    async function loadAll() {
      const [showRes, theatreRes, mcRes, pcRes, cdRes, pkRes] = await Promise.all([
        supabase.from('theatre_shows').select('*').eq('id', showId!).single(),
        supabase.from('theatre_theatres').select('name').eq('id', theatreId!).single(),
        supabase.from('theatre_main_counter').select('*').eq('show_id', showId!).maybeSingle(),
        supabase.from('theatre_popcorn').select('*').eq('show_id', showId!).maybeSingle(),
        supabase.from('theatre_cool_drinks').select('*').eq('show_id', showId!).maybeSingle(),
        supabase.from('theatre_parking').select('*').eq('show_id', showId!).maybeSingle(),
      ])

      if (cancelled.current) return

      if (showRes.data) setShowMeta(showRes.data as Show)
      if (theatreRes.data) setTheatreName(theatreRes.data.name)

      const mcData = mcRes.data as MainCounterRow | null
      const pcData = pcRes.data as PopcornRow | null
      const cdData = cdRes.data as CoolDrinksRow | null
      const pkData = pkRes.data as ParkingRow | null

      if (mcData) {
        const miscMc = Number(mcData.misc_drinks_mc) || 0
        setMcRows(flatToRows(mcData as Record<string, unknown>, MAIN_ITEMS, MC_DB_KEY))
        setMcUpi(mcData.upi_amount ? String(mcData.upi_amount) : '')
        setMcCash(mcData.cash_amount ? String(mcData.cash_amount) : '')
        prevMiscMcRef.current = miscMc
        setMiscDrinksMc(miscMc ? String(miscMc) : '')
        setHasMc(true)
      }
      if (pcData) {
        setPcRows(flatToRows(pcData as Record<string, unknown>, POPCORN_ITEMS, PC_DB_KEY))
        setPcBms(pcData.bms_combo_amount ? String(pcData.bms_combo_amount) : '')
        setPcUpi(pcData.upi_amount ? String(pcData.upi_amount) : '')
        setPcCash(pcData.cash_amount ? String(pcData.cash_amount) : '')
        setHasPc(true)
      }
      if (cdData) {
        const miscCd = Number(cdData.misc_drinks_cd) || 0
        setCdRows(flatToRows(cdData as Record<string, unknown>, CD_ALL, CD_DB_KEY))
        setCdUpi(cdData.upi_amount ? String(cdData.upi_amount) : '')
        setCdCash(cdData.cash_amount ? String(cdData.cash_amount) : '')
        prevMiscCdRef.current = miscCd
        setMiscDrinksCd(miscCd ? String(miscCd) : '')
        setHasCd(true)
      }
      if (pkData) {
        setPkScooter(pkData.scooter_count ? String(pkData.scooter_count) : '')
        setPkAuto(pkData.auto_count ? String(pkData.auto_count) : '')
        setPkCar(pkData.car_count ? String(pkData.car_count) : '')
        setPkReported(pkData.reported_amount != null ? String(pkData.reported_amount) : '')
      }

      // OB carry-forward — only when no existing data and show_number > 1
      const showNum = showRes.data?.show_number
      if (showNum && showNum > 1 && !mcData) {
        const { data: prevShow } = await supabase
          .from('theatre_shows')
          .select('id')
          .eq('day_id', showRes.data.day_id)
          .eq('show_number', showNum - 1)
          .maybeSingle()

        if (!cancelled.current && prevShow) {
          const [prevMcRes, prevPcRes, prevCdRes] = await Promise.all([
            supabase.from('theatre_main_counter').select('*').eq('show_id', prevShow.id).maybeSingle(),
            supabase.from('theatre_popcorn').select('*').eq('show_id', prevShow.id).maybeSingle(),
            supabase.from('theatre_cool_drinks').select('*').eq('show_id', prevShow.id).maybeSingle(),
          ])

          if (cancelled.current) return

          let didCarry = false
          if (prevMcRes.data) {
            setMcRows(applyCarryForward(
              flatToRows(prevMcRes.data as Record<string, unknown>, MAIN_ITEMS, MC_DB_KEY),
              MAIN_ITEMS,
            ))
            didCarry = true
          }
          if (prevPcRes.data) {
            setPcRows(applyCarryForward(
              flatToRows(prevPcRes.data as Record<string, unknown>, POPCORN_ITEMS, PC_DB_KEY),
              POPCORN_ITEMS,
            ))
            didCarry = true
          }
          if (prevCdRes.data) {
            setCdRows(applyCarryForward(
              flatToRows(prevCdRes.data as Record<string, unknown>, CD_ALL, CD_DB_KEY),
              CD_ALL,
            ))
            didCarry = true
          }
          if (didCarry) setObNote(`OB carried from Show ${showNum - 1}`)
        }
      }

      if (!cancelled.current) setLoading(false)
    }

    loadAll()
    return () => { cancelled.current = true }
  }, [showId, theatreId])

  // ── Live-sync Misc Drinks count to Tins OB ────────────────────────
  useEffect(() => {
    const next = Number(miscDrinksMc) || 0
    const prev = prevMiscMcRef.current
    const delta = next - prev
    if (delta === 0) return
    prevMiscMcRef.current = next
    setMcRows(rows => ({
      ...rows,
      tins_mc: {
        ...rows.tins_mc,
        ob: String(Math.max(0, (Number(rows.tins_mc?.ob) || 0) - delta)),
      },
    }))
  }, [miscDrinksMc])

  useEffect(() => {
    const next = Number(miscDrinksCd) || 0
    const prev = prevMiscCdRef.current
    const delta = next - prev
    if (delta === 0) return
    prevMiscCdRef.current = next
    setCdRows(rows => ({
      ...rows,
      c_tin: {
        ...rows.c_tin,
        ob: String(Math.max(0, (Number(rows.c_tin?.ob) || 0) - delta)),
      },
    }))
  }, [miscDrinksCd])

  // ── Toast helper ────────────────────────────────────────────────
  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  // ── Recheck completion ──────────────────────────────────────────
  async function recheckCompletion() {
    const [a, b, c] = await Promise.all([
      supabase.from('theatre_main_counter').select('show_id').eq('show_id', showId!).maybeSingle(),
      supabase.from('theatre_popcorn').select('show_id').eq('show_id', showId!).maybeSingle(),
      supabase.from('theatre_cool_drinks').select('show_id').eq('show_id', showId!).maybeSingle(),
    ])
    setHasMc(!!a.data)
    setHasPc(!!b.data)
    setHasCd(!!c.data)
  }

  // ── Save functions ──────────────────────────────────────────────
  async function saveMc() {
    setMcSaving(true)
    const { error } = await supabase
      .from('theatre_main_counter')
      .upsert(
        {
          show_id: showId!,
          ...rowsToFlat(mcRows, MAIN_ITEMS, MC_DB_KEY),
          upi_amount: Number(mcUpi) || 0,
          cash_amount: Number(mcCash) || 0,
          misc_drinks_mc: Number(miscDrinksMc) || 0,
        },
        { onConflict: 'show_id' },
      )
    setMcSaving(false)
    if (!error) { showToast('✓ Saved'); recheckCompletion() }
    else showToast('Save failed')
  }

  async function savePcAndPk() {
    setPcSaving(true)
    const [pcErr, pkErr] = await Promise.all([
      supabase.from('theatre_popcorn').upsert(
        {
          show_id: showId!,
          ...rowsToFlat(pcRows, POPCORN_ITEMS, PC_DB_KEY),
          bms_combo_amount: Number(pcBms) || 0,
          upi_amount: Number(pcUpi) || 0,
          cash_amount: Number(pcCash) || 0,
        },
        { onConflict: 'show_id' },
      ).then(r => r.error),
      supabase.from('theatre_parking').upsert(
        {
          show_id: showId!,
          scooter_count: Number(pkScooter) || 0,
          auto_count: Number(pkAuto) || 0,
          car_count: Number(pkCar) || 0,
          reported_amount: pkReported !== '' ? Number(pkReported) : null,
        },
        { onConflict: 'show_id' },
      ).then(r => r.error),
    ])
    setPcSaving(false)
    if (!pcErr && !pkErr) { showToast('✓ Saved'); recheckCompletion() }
    else showToast('Save failed')
  }

  async function saveCd() {
    setCdSaving(true)
    const { error } = await supabase
      .from('theatre_cool_drinks')
      .upsert(
        {
          show_id: showId!,
          ...rowsToFlat(cdRows, CD_ALL, CD_DB_KEY),
          upi_amount: Number(cdUpi) || 0,
          cash_amount: Number(cdCash) || 0,
          misc_drinks_cd: Number(miscDrinksCd) || 0,
        },
        { onConflict: 'show_id' },
      )
    setCdSaving(false)
    if (!error) { showToast('✓ Saved'); recheckCompletion() }
    else showToast('Save failed')
  }

  // ── Derived values ──────────────────────────────────────────────
  const isComplete = hasMc && hasPc && hasCd
  const isInProgress = (hasMc || hasPc || hasCd) && !isComplete
  const statusKey = isComplete ? 'complete' : isInProgress ? 'inprogress' : 'pending'
  const statusMeta = STATUS_META[statusKey]

  const displayTime = showMeta?.start_time?.slice(0, 5) ?? ''

  const tabSaveConfig = {
    main:    { label: 'Save Main Counter',       handler: saveMc,      saving: mcSaving },
    popcorn: { label: 'Save Popcorn & Parking',  handler: savePcAndPk, saving: pcSaving },
    cool:    { label: 'Save Cool Drinks',         handler: saveCd,      saving: cdSaving },
  }
  const { label: saveLabel, handler: saveHandler, saving: isSaving } = tabSaveConfig[activeTab]

  if (loading) {
    return (
      <div className="t" style={{
        position: 'fixed', inset: 0, background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ color: 'var(--muted)', fontSize: 14 }}>Loading…</div>
      </div>
    )
  }

  return (
    <div className="t" style={{
      position: 'fixed', inset: 0,
      background: 'var(--bg)', color: 'var(--text)',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>

      {/* ── Header ───────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px 10px', flexShrink: 0,
        borderBottom: '1px solid var(--card-border)',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            width: 36, height: 36, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--surface)', border: '1px solid var(--card-border)',
            borderRadius: 10, color: 'var(--text)', cursor: 'pointer',
            fontSize: 18,
          }}
        >
          ‹
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 700, fontSize: 16, color: 'var(--text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            Show {showMeta?.show_number}{showMeta?.movie_name ? ` · ${showMeta.movie_name}` : ''}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
            {theatreName}{displayTime ? ` · ${displayTime}` : ''}
            {showMeta?.is_fan_show && (
              <span style={{
                marginLeft: 6, fontSize: 10, fontWeight: 700, padding: '1px 6px',
                borderRadius: 999, background: 'rgba(245,158,11,0.15)', color: 'var(--accent)',
              }}>FAN</span>
            )}
          </div>
        </div>

        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, height: 24, padding: '0 10px',
          borderRadius: 999, background: statusMeta.bg, color: statusMeta.fg,
          fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          <span style={{ fontSize: 11 }}>{statusMeta.dot}</span>
          {statusMeta.label}
        </span>
      </div>

      {/* ── OB carry-forward note ─────────────────────────────────── */}
      {obNote && (
        <div style={{
          padding: '6px 16px', background: 'rgba(139,92,246,0.08)',
          borderBottom: '1px solid var(--purple-border)',
          fontSize: 12, color: 'var(--purple-text)', flexShrink: 0,
        }}>
          {obNote}
        </div>
      )}

      {/* ── Tab bar ───────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', flexShrink: 0,
        borderBottom: '1px solid var(--card-border)',
      }}>
        {TABS.map(tab => {
          const on = tab.id === activeTab
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, height: 46, background: 'transparent', border: 'none',
                cursor: 'pointer', color: on ? 'var(--text)' : 'var(--muted)',
                fontSize: 13.5, fontWeight: on ? 650 : 500,
                fontFamily: 'inherit', position: 'relative',
                transition: 'color .18s',
              }}
            >
              {tab.label}
              <span style={{
                position: 'absolute', left: 8, right: 8, bottom: -1, height: 2.5,
                borderRadius: 2, background: 'var(--accent)',
                transform: on ? 'scaleX(1)' : 'scaleX(0)',
                transition: 'transform .25s cubic-bezier(.4,0,.2,1)',
                boxShadow: on ? '0 0 10px var(--accent-glow)' : 'none',
              }} />
            </button>
          )
        })}
      </div>

      {/* ── Scrollable content ────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px', overscrollBehavior: 'none' }}>

        {activeTab === 'main' && (
          <MainCounterSlip
            rows={mcRows} setRows={setMcRows}
            upi={mcUpi} cash={mcCash} onUpi={setMcUpi} onCash={setMcCash}
            miscDrinksMc={miscDrinksMc} onMiscDrinksMc={setMiscDrinksMc}
          />
        )}

        {activeTab === 'popcorn' && (
          <PopcornParkingSlip
            pcRows={pcRows} setPcRows={setPcRows}
            pcBms={pcBms} setPcBms={setPcBms}
            pcUpi={pcUpi} pcCash={pcCash} onPcUpi={setPcUpi} onPcCash={setPcCash}
            pkScooter={pkScooter} pkAuto={pkAuto} pkCar={pkCar} pkReported={pkReported}
            setPkScooter={setPkScooter} setPkAuto={setPkAuto} setPkCar={setPkCar} setPkReported={setPkReported}
          />
        )}

        {activeTab === 'cool' && (
          <CoolDrinksSlip
            rows={cdRows} setRows={setCdRows}
            upi={cdUpi} cash={cdCash} onUpi={setCdUpi} onCash={setCdCash}
            miscDrinksCd={miscDrinksCd} onMiscDrinksCd={setMiscDrinksCd}
          />
        )}

      </div>

      {/* ── Save button ───────────────────────────────────────────── */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--card-border)',
        background: 'var(--bg)',
        flexShrink: 0,
      }}>
        <button
          onClick={saveHandler}
          disabled={isSaving}
          style={{
            width: '100%', height: 52,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: isSaving ? 'rgba(245,158,11,0.6)' : 'var(--accent)',
            color: 'var(--accent-ink)',
            border: 'none', borderRadius: 'var(--r-btn)',
            fontWeight: 650, fontSize: 16, cursor: isSaving ? 'default' : 'pointer',
            boxShadow: '0 6px 22px -8px var(--accent-glow)',
            transition: 'background .15s',
            fontFamily: 'inherit',
          }}
        >
          {isSaving ? 'Saving…' : saveLabel}
        </button>
      </div>

      {/* ── Toast ─────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'absolute', bottom: 80, left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--surface-2)', border: '1px solid var(--card-border)',
          color: 'var(--green)', borderRadius: 999,
          padding: '8px 20px', fontSize: 14, fontWeight: 600,
          pointerEvents: 'none', zIndex: 50,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      )}

    </div>
  )
}
