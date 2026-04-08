export {}

declare global {
  interface Window {
    panelRuntime?: {
      terminalAgentUrl?: string
    }
  }
}
