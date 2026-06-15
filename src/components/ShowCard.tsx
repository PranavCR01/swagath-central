import { Calendar, Pencil, Trash2 } from 'lucide-react'
import { fmtTime } from '@/components/dayclose/types'

const STATUS_META = {
  complete: { label: 'Complete',    dot: '✓', bg: 'rgba(34,197,94,0.16)',   fg: '#22c55e' },
  pending:  { label: 'Not Started', dot: '○', bg: 'rgba(255,255,255,0.05)', fg: 'rgba(255,255,255,0.38)' },
}

function occColor(pct: number): string {
  return pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--accent)' : 'var(--muted)'
}

interface ShowCardProps {
  showNumber: number
  startTime: string
  movieName: string
  language: string
  isFanShow: boolean
  ticketCount?: number
  occupancyPct?: number
  isComplete: boolean
  onClick: () => void
  showDate?: string
  todayIST?: string
  yesterdayIST?: string
  onEdit?: (e: React.MouseEvent) => void
  onDelete?: (e: React.MouseEvent) => void
}

export default function ShowCard({
  showNumber, startTime, movieName, language, isFanShow,
  ticketCount, occupancyPct, isComplete, onClick,
  showDate, todayIST, yesterdayIST, onEdit, onDelete,
}: ShowCardProps) {
  const displayTime = fmtTime(startTime)
  const statusKey = isComplete ? 'complete' : 'pending'
  const sm = STATUS_META[statusKey]
  const isBackDated = !!showDate && showDate !== todayIST

  return (
    <div
      onClick={onClick}
      style={{
        background: 'linear-gradient(160deg, var(--surface-2), var(--surface))',
        border: '1px solid var(--card-border)',
        borderRadius: 16,
        padding: '15px 16px',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Show number box */}
        <div style={{
          width: 46, height: 46, borderRadius: 13,
          background: 'var(--purple-chip)',
          border: '1px solid var(--purple-border)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <span style={{ fontSize: 9, color: 'var(--purple-text)', fontWeight: 700, letterSpacing: '.08em' }}>SHOW</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 19, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>
            {showNumber}
          </span>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 16, fontWeight: 650, color: 'var(--text)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {movieName}
            </span>
            {isFanShow && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '1px 6px',
                borderRadius: 999, background: 'rgba(245,158,11,0.15)', color: 'var(--accent)',
              }}>FAN</span>
            )}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginTop: 5,
            fontSize: 13, color: 'var(--muted)', flexWrap: 'wrap',
          }}>
            <span style={{ fontFamily: 'var(--mono)' }}>{displayTime}</span>
            <span style={{
              fontSize: 11, color: 'var(--purple-text)', background: 'var(--purple-chip)',
              padding: '1px 7px', borderRadius: 6, fontWeight: 600,
            }}>
              {language}
            </span>
            {occupancyPct != null && occupancyPct > 0 && (
              <span style={{ color: occColor(occupancyPct), fontWeight: 600 }}>
                {occupancyPct}% full
              </span>
            )}
            {ticketCount != null && ticketCount > 0 && occupancyPct == null && (
              <span>{ticketCount} tickets</span>
            )}
          </div>
        </div>

        {/* Status + revenue */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            height: 24, padding: '0 10px', borderRadius: 999,
            background: sm.bg, color: sm.fg,
            fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap',
          }}>
            <span style={{ fontSize: 10 }}>{sm.dot}</span>
            {sm.label}
          </span>
        </div>
      </div>

      {(isBackDated || onEdit || onDelete) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <div>
            {isBackDated && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', borderRadius: 999,
                fontSize: 10, fontWeight: 600,
                background: 'var(--purple-chip)', color: 'var(--purple-text)',
                border: '1px solid var(--purple-border)',
              }}>
                <Calendar size={10} color="var(--purple-text)" />
                {showDate === yesterdayIST ? 'Yesterday' : 'Back-dated'}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {onDelete && (
              <button
                onClick={onDelete}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'var(--surface-2)', border: '1px solid var(--card-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', padding: 0,
                }}
              >
                <Trash2 size={14} color="var(--red, #ef4444)" />
              </button>
            )}
            {onEdit && (
              <button
                onClick={onEdit}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'var(--surface-2)', border: '1px solid var(--card-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', padding: 0,
                }}
              >
                <Pencil size={14} color="var(--muted)" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
