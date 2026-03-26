export const queryKeys = {
  panelData: ['panel-data'] as const,
  architectures: ['architectures'] as const,
  tasks: (architectureId: string) => ['tasks', architectureId] as const,
  runs: ['runs'] as const,
}