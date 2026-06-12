export default function Skeleton({ h = 120 }: { h?: number }) {
  return <div className="ai-skel" style={{ height: h, borderRadius: 'var(--r-card)', background: 'var(--surface)', border: '1px solid var(--card-border)' }} />
}
