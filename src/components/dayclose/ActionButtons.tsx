import { AiSummaryButton } from './DayCloseShared'

export default function ActionButtons({
  readOnly, saving, isSaved, onSave, onDownload, onGenerateSummary,
}: {
  readOnly: boolean
  saving: boolean
  isSaved: boolean
  onSave: () => void
  onDownload: () => void
  onGenerateSummary: () => void
}) {
  if (readOnly) {
    return (
      <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={onDownload}
          style={{
            height: 52, width: '100%', background: 'transparent', color: 'var(--text)',
            border: '1.5px solid var(--card-border)', borderRadius: 14,
            fontWeight: 600, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Download Day Report
        </button>
        {isSaved && <AiSummaryButton onClick={onGenerateSummary} />}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
      <button
        onClick={onSave} disabled={saving}
        style={{
          height: 52, width: '100%',
          background: saving ? 'rgba(245,158,11,0.6)' : 'var(--accent)',
          color: 'var(--accent-ink)', border: 'none', borderRadius: 14,
          fontWeight: 650, fontSize: 16, cursor: saving ? 'default' : 'pointer',
          fontFamily: 'inherit', boxShadow: '0 6px 22px -8px var(--accent-glow)',
        }}
      >
        {saving ? 'Saving…' : 'Save Day Close'}
      </button>
      <button
        onClick={onDownload}
        style={{
          height: 52, width: '100%', background: 'transparent', color: 'var(--text)',
          border: '1.5px solid var(--card-border)', borderRadius: 14,
          fontWeight: 600, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        Download Day Report
      </button>
      {isSaved && <AiSummaryButton onClick={onGenerateSummary} />}
    </div>
  )
}
