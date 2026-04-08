export const queryKeys = {
  architectures: ['architectures'] as const,
  tasks: (architectureId: string) => ['tasks', architectureId] as const,
  runs: ['runs'] as const,
  terminalProjects: ['terminal-projects'] as const,
  terminalWorkspace: ['terminal-workspace'] as const,
} 
