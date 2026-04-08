import type { Tool } from './types'
import { localReadTool } from '../../infrastructure/tools/local-read-tool'
import { localWriteTool } from '../../infrastructure/tools/local-write-tool'
import { localLogTool } from '../../infrastructure/tools/local-log-tool'

const builtInTools: Tool[] = [localReadTool, localWriteTool, localLogTool]
const toolMap = new Map<string, Tool>(builtInTools.map((t) => [t.name, t]))

export const toolRegistry = {
  getAll: (): Tool[] => Array.from(toolMap.values()),
  getByName: (name: string): Tool | undefined => toolMap.get(name),
  register: (tool: Tool): void => {
    toolMap.set(tool.name, tool)
  },
}
