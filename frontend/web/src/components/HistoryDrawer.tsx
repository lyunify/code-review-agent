import { useEffect } from 'react'
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
  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <aside className="history-drawer" aria-label="Recent scans">
        <div className="drawer-header">
          <h2>Recent scans</h2>
          <button className="drawer-close" onClick={onClose} aria-label="Close history">
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
                disabled={loadingHistoryId === item.id}
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
