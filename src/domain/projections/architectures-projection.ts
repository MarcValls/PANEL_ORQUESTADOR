import type { Architecture } from '../../lib/types'

// In the first iteration, architectures are derived from static panel data.
// Future iterations can merge runtime state (e.g., updated health scores) here.
export const projectArchitectures = (raw: Architecture[]): Architecture[] => raw
