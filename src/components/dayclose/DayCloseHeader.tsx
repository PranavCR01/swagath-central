import { useNavigate } from 'react-router-dom'

export default function DayCloseHeader({
  theatreId, date, theatreName, displayDate, readOnly, toast,
}: {
  theatreId?: string
  date?: string
  theatreName: string
  displayDate: string
  readOnly: boolean
  toast: string
}) {
  const navigate = useNavigate()

  return (
    <>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--green)', color: '#fff',
          padding: '10px 22px', borderRadius: 12, fontWeight: 600, fontSize: 14,
          zIndex: 200, boxShadow: '0 4px 20px rgba(34,197,94,0.4)', whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      )}

      <div style={{
        height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 18px', borderBottom: '1px solid var(--card-border)',
        background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <button
            onClick={() => navigate(`/theatre/${theatreId}/day/${date}`)}
            style={{
              width: 38, height: 38, borderRadius: 11,
              background: 'var(--surface)', border: '1px solid var(--card-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none"
              stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', lineHeight: 1.1 }}>
              {readOnly ? 'Day Report' : 'Close Day'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{theatreName} · {displayDate}</div>
          </div>
        </div>
        {readOnly && (
          <button
            onClick={() => navigate(`/theatre/${theatreId}/day/${date}`)}
            style={{
              height: 36, padding: '0 16px',
              background: 'transparent', border: '1.5px solid var(--accent)',
              borderRadius: 10, color: 'var(--accent)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Edit Day
          </button>
        )}
      </div>
    </>
  )
}
