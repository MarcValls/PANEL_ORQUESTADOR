import { useUIStore } from '../../app/store/ui-store'
import { useTrayFeedQuery } from '../../lib/query/hooks'
import type { BottomTrayMode } from '../../lib/types'

const trayModes: BottomTrayMode[] = ['Logs', 'Queue', 'Events', 'Locks', 'Alerts']

export const BottomTray = () => {
  const { data: trayFeed } = useTrayFeedQuery()
  const open = useUIStore((state) => state.bottomTrayOpen)
  const mode = useUIStore((state) => state.bottomTrayMode)
  const setBottomTrayMode = useUIStore((state) => state.setBottomTrayMode)

  const lines = trayFeed?.[mode.toLowerCase() as keyof typeof trayFeed] ?? []

  return (
    <section className={`bottom-tray ${open ? 'is-open' : 'is-collapsed'}`}>
      <div className="tray-header">
        <strong>Bottom tray</strong>
        <div className="tray-tabs">
          {trayModes.map((trayMode) => (
            <button
              key={trayMode}
              type="button"
              className={`tab-button ${mode === trayMode ? 'is-active' : ''}`}
              onClick={() => setBottomTrayMode(trayMode)}
            >
              {trayMode}
            </button>
          ))}
        </div>
      </div>

      <div className="tray-body">
        {lines.map((line) => (
          <div key={line} className="tray-line">
            {line}
          </div>
        ))}
        {!lines.length ? <div className="empty-state compact">No hay eventos para este modo en el JSON local.</div> : null}
      </div>
    </section>
  )
}