import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type InspectorTab = 'Resumen' | 'Datos' | 'JSON'
type InspectorEntityType = 'architecture' | 'task' | 'run'

type InspectorEntity = {
  type: InspectorEntityType
  id: string
}

type UIState = {
  activeWorkspacePath: string
  activeArchitectureId: string
  inspectorOpen: boolean
  inspectorTab: InspectorTab
  inspectorEntity: InspectorEntity
  setActiveWorkspacePath: (path: string) => void
  setActiveArchitectureId: (id: string) => void
  openInspector: () => void
  openInspectorForArchitecture: (architectureId: string) => void
  openInspectorForTask: (taskId: string) => void
  openInspectorForRun: (runId: string) => void
  closeInspector: () => void
  toggleInspector: () => void
  setInspectorTab: (tab: InspectorTab) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      activeWorkspacePath: '',
      activeArchitectureId: 'orch-core',
      inspectorOpen: false,
      inspectorTab: 'Resumen',
      inspectorEntity: {
        type: 'architecture',
        id: 'orch-core',
      },
      setActiveWorkspacePath: (path) => set({ activeWorkspacePath: path }),
      setActiveArchitectureId: (id) =>
        set((s) => ({
          activeArchitectureId: id,
          inspectorEntity:
            s.inspectorEntity.type === 'architecture'
              ? { type: 'architecture', id }
              : s.inspectorEntity,
        })),
      openInspector: () => set({ inspectorOpen: true }),
      openInspectorForArchitecture: (architectureId) =>
        set({
          inspectorOpen: true,
          inspectorEntity: { type: 'architecture', id: architectureId },
          inspectorTab: 'Resumen',
        }),
      openInspectorForTask: (taskId) =>
        set({
          inspectorOpen: true,
          inspectorEntity: { type: 'task', id: taskId },
          inspectorTab: 'Resumen',
        }),
      openInspectorForRun: (runId) =>
        set({
          inspectorOpen: true,
          inspectorEntity: { type: 'run', id: runId },
          inspectorTab: 'Resumen',
        }),
      closeInspector: () => set({ inspectorOpen: false }),
      toggleInspector: () => set((s) => ({ inspectorOpen: !s.inspectorOpen })),
      setInspectorTab: (tab) => set({ inspectorTab: tab }),
    }),
    {
      name: 'panel-orquestador-ui',
      partialize: (s) => ({
        activeWorkspacePath: s.activeWorkspacePath,
        activeArchitectureId: s.activeArchitectureId,
      }),
    },
  ),
)
