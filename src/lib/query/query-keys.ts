export const queryKeys = {
  architectures: ['architectures'] as const,
  tasks: (architectureId: string) => ['tasks', architectureId] as const,
  runs: ['runs'] as const,
}