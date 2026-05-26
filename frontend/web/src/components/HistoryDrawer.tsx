import { X } from 'lucide-react'
import type { HistoryRecord } from '../types'

export function HistoryDrawer({
  isOpen,
  history,
  loadingHistoryId,
  onClose,
  onSelectHistory,
}: {
  isOpen: boolean
  history: HistoryRecord[]
  loadingHistoryId: number | null
  onClose: () => void
  onSelectHistory: (record: HistoryRecord) => void
}) {
  if (!isOpen) return null

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="history-drawer">
        <div className="drawer-header">
          <h2>Recent scans</h2>
          <button className="drawer-close" onClick={onClose}>
            <X size={14} />
          </button>
        </div>
        <div className="drawer-body">
          {history.length === 0 ? (
            <p className="drawer-empty">No saved scans yet.</p>
          ) : (
            history.map((item) => (
              <button
                key={item.id}
                className="drawer-history-row"
                onClick={() => {
                  onSelectHistory(item)
                  onClose()
                }}
                disabled={loadingHistoryId !== null}
              >
                <span>{item.repo_url.replace('https://github.com/', '')}</span>
                <small>
                  {loadingHistoryId === item.id
                    ? 'Loading saved report...'
                    : `${item.risk_count} risks`}
                </small>
              </button>
            ))
          )}
        </div>
      </aside>
    </>
  )
}
