import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BottomTrayMode, InspectorTab } from '../../lib/types'

type UIState = {
  activeArchitectureId: string
  inspectorOpen: boolean
  inspectorTab: InspectorTab
  bottomTrayOpen: boolean
  bottomTrayMode: BottomTrayMode
  setActiveArchitectureId: (architectureId: string) => void
  toggleInspector: () => void
  openInspector: () => void
  closeInspector: () => void
  setInspectorTab: (tab: InspectorTab) => void
  toggleBottomTray: () => void
  setBottomTrayMode: (mode: BottomTrayMode) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      activeArchitectureId: 'orch-core',
      inspectorOpen: true,
      inspectorTab: 'Summary',
      bottomTrayOpen: true,
      bottomTrayMode: 'Logs',
      setActiveArchitectureId: (architectureId) => set({ activeArchitectureId: architectureId }),
      toggleInspector: () => set((state) => ({ inspectorOpen: !state.inspectorOpen })),
      openInspector: () => set({ inspectorOpen: true }),
      closeInspector: () => set({ inspectorOpen: false }),
      setInspectorTab: (tab) => set({ inspectorTab: tab }),
      toggleBottomTray: () => set((state) => ({ bottomTrayOpen: !state.bottomTrayOpen })),
      setBottomTrayMode: (mode) => set({ bottomTrayMode: mode }),
    }),
    {
      name: 'panel-orquestador-ui',
      partialize: (state) => ({
        activeArchitectureId: state.activeArchitectureId,
        inspectorOpen: state.inspectorOpen,
        inspectorTab: state.inspectorTab,
        bottomTrayOpen: state.bottomTrayOpen,
        bottomTrayMode: state.bottomTrayMode,
      }),
    },
  ),
)