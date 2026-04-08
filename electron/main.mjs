import { app, BrowserWindow, dialog, shell } from 'electron'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

let agentProcess = null
let mainWindow = null
let agentPort = 8787

const isPositivePort = (value) => Number.isInteger(value) && value > 0 && value <= 65535

const findFreePort = () => new Promise((resolve) => {
  const server = net.createServer()
  server.listen(0, '127.0.0.1', () => {
    const address = server.address()
    const port = typeof address === 'object' && address !== null ? address.port : 8787
    server.close(() => resolve(port))
  })
  server.on('error', () => resolve(8787))
})

const resolveServerScriptPath = () => {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'server', 'terminal-agent.mjs')
  }
  return path.join(projectRoot, 'server', 'terminal-agent.mjs')
}

const resolveRendererEntryPath = () => {
  if (app.isPackaged) {
    return path.join(app.getAppPath(), 'dist', 'index.html')
  }
  return path.join(projectRoot, 'dist', 'index.html')
}

const logAgentOutput = (streamName, chunk) => {
  const text = String(chunk).trim()
  if (!text) return
  console.log(`[terminal-agent:${streamName}] ${text}`)
}

const stopAgent = () => {
  if (!agentProcess) return
  if (!agentProcess.killed) {
    agentProcess.kill('SIGTERM')
  }
  agentProcess = null
}

const startAgent = async () => {
  const explicitPort = Number(process.env.TERMINAL_AGENT_PORT)
  agentPort = isPositivePort(explicitPort) ? explicitPort : await findFreePort()

  const serverScriptPath = resolveServerScriptPath()
  if (!fs.existsSync(serverScriptPath)) {
    throw new Error(`No se encontró terminal-agent en: ${serverScriptPath}`)
  }

  const projectsFilePath = path.join(app.getPath('userData'), '.panel-projects.json')
  const workspaceFileName = process.env.TERMINAL_AGENT_WORKSPACE_FILE_NAME ?? '.panel-orquestador-workspace.json'

  const env = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    TERMINAL_AGENT_PORT: String(agentPort),
    TERMINAL_AGENT_PROJECTS_FILE: projectsFilePath,
    TERMINAL_AGENT_ALLOWED_CWDS:
      process.env.TERMINAL_AGENT_ALLOWED_CWDS?.trim() || os.homedir(),
    TERMINAL_AGENT_WORKSPACE_FILE_NAME: workspaceFileName,
  }

  agentProcess = spawn(process.execPath, [serverScriptPath], {
    cwd: app.getPath('home'),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  agentProcess.stdout?.on('data', (chunk) => logAgentOutput('stdout', chunk))
  agentProcess.stderr?.on('data', (chunk) => logAgentOutput('stderr', chunk))
  agentProcess.on('exit', (code, signal) => {
    console.log(`[terminal-agent] exited code=${code ?? 'null'} signal=${signal ?? 'null'}`)
    agentProcess = null
  })
}

const createMainWindow = async () => {
  const terminalAgentUrl = `http://127.0.0.1:${agentPort}`

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    title: 'Panel Orquestador',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      additionalArguments: [`--terminal-agent-url=${terminalAgentUrl}`],
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  const devRendererUrl = process.env.ELECTRON_RENDERER_URL?.trim()
  if (devRendererUrl) {
    await mainWindow.loadURL(devRendererUrl)
    return
  }

  const rendererEntryPath = resolveRendererEntryPath()
  if (!fs.existsSync(rendererEntryPath)) {
    throw new Error(
      `No se encontró la UI compilada en ${rendererEntryPath}. Ejecuta: npm run build`,
    )
  }

  await mainWindow.loadFile(rendererEntryPath)
}

const bootstrap = async () => {
  try {
    await startAgent()
    await createMainWindow()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    dialog.showErrorBox('No se pudo iniciar Panel Orquestador', message)
    app.quit()
  }
}

app.whenReady().then(bootstrap)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createMainWindow()
  }
})

app.on('before-quit', () => {
  stopAgent()
})
