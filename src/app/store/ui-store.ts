import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type InspectorTab = 'Resumen' | 'Datos' | 'JSON'

type UIState = {
  activeArchitectureId: string
  inspectorOpen: boolean
  inspectorTab: InspectorTab
  setActiveArchitectureId: (id: string) => void
  openInspector: () => void
  closeInspector: () => void
  toggleInspector: () => void
  setInspectorTab: (tab: InspectorTab) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      activeArchitectureId: 'orch-core',
      inspectorOpen: false,
      inspectorTab: 'Resumen',
      setActiveArchitectureId: (id) => set({ activeArchitectureId: id }),
      openInspector: () => set({ inspectorOpen: true }),
      closeInspector: () => set({ inspectorOpen: false }),
      toggleInspector: () => set((s) => ({ inspectorOpen: !s.inspectorOpen })),
      setInspectorTab: (tab) => set({ inspectorTab: tab }),
    }),
    {
      name: 'panel-orquestador-ui',
      partialize: (s) => ({
        activeArchitectureId: s.activeArchitectureId,
      }),
    },
  ),
)