import { contextBridge } from 'electron'

const ARG_PREFIX = '--terminal-agent-url='

const resolveTerminalAgentUrl = () => {
  const arg = process.argv.find((entry) => entry.startsWith(ARG_PREFIX))
  if (!arg) return ''
  return arg.slice(ARG_PREFIX.length)
}

contextBridge.exposeInMainWorld('panelRuntime', {
  terminalAgentUrl: resolveTerminalAgentUrl(),
})
