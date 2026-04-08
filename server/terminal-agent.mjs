#!/usr/bin/env node
import http from 'node:http'
import { spawn } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { execFile, execSync } from 'node:child_process'

const PORT = Number(process.env.TERMINAL_AGENT_PORT ?? 8787)
const SHELL = process.env.SHELL ?? '/bin/zsh'
const RUN_TIMEOUT_MS = Number(process.env.TERMINAL_AGENT_RUN_TIMEOUT_MS ?? 10 * 60 * 1000)
const PROJECTS_FILE_PATH = path.resolve(
  process.env.TERMINAL_AGENT_PROJECTS_FILE ?? path.join(process.cwd(), '.panel-projects.json'),
)
const WORKSPACE_FILE_NAME =
  process.env.TERMINAL_AGENT_WORKSPACE_FILE_NAME ?? '.panel-orquestador-workspace.json'

const DEFAULT_ALLOWLIST = [
  'npm run lint',
  'npm run build',
  'npm test',
  'npm run test',
  'pnpm lint',
  'pnpm build',
  'pnpm test',
  'yarn lint',
  'yarn build',
  'yarn test',
  'git status',
  'git diff',
  'ls',
  'pwd',
]

const ALLOWED_COMMAND_PREFIXES = (process.env.TERMINAL_AGENT_ALLOWLIST ?? DEFAULT_ALLOWLIST.join(','))
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)

const INITIAL_ALLOWED_CWD_PREFIXES = (process.env.TERMINAL_AGENT_ALLOWED_CWDS ?? process.cwd())
  .split(',')
  .map((value) => path.resolve(value.trim()))
  .filter(Boolean)

const runs = new Map()
const projectRegistry = new Map()
let activeWorkspacePath = ''
const execFileAsync = promisify(execFile)

const nowIso = () => new Date().toISOString()
const createRunId = () =>
  `RUN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

const buildCorsHeaders = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
})

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, {
    ...buildCorsHeaders(),
    'Content-Type': 'application/json; charset=utf-8',
  })
  res.end(JSON.stringify(payload))
}

const parseBody = async (req) => {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return {}
  return JSON.parse(raw)
}

const isCommandAllowed = (command) =>
  ALLOWED_COMMAND_PREFIXES.some((prefix) => command === prefix || command.startsWith(`${prefix} `))

const isNodePackageManagerCommand = (command) =>
  /^(npm|pnpm|yarn)\b/.test(command.trim())

const sanitizePackageName = (name) => {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return normalized || 'workspace-project'
}

const hasAnyFile = (entries, names) => names.some((name) => entries.has(name))

const getRequestedScriptName = (command) => {
  const trimmed = command.trim()
  const npmRunMatch = trimmed.match(/^npm\s+run\s+([a-zA-Z0-9:_-]+)/)
  if (npmRunMatch !== null) return npmRunMatch[1]
  const npmAliasMatch = trimmed.match(/^npm\s+(test|start|stop|restart)\b/)
  if (npmAliasMatch !== null) return npmAliasMatch[1]

  const pnpmRunMatch = trimmed.match(/^pnpm\s+run\s+([a-zA-Z0-9:_-]+)/)
  if (pnpmRunMatch !== null) return pnpmRunMatch[1]
  const pnpmAliasMatch = trimmed.match(/^pnpm\s+([a-zA-Z0-9:_-]+)\b/)
  if (
    pnpmAliasMatch !== null
    && !['install', 'add', 'remove', 'update', 'up', 'dlx', 'exec', 'i'].includes(pnpmAliasMatch[1])
  ) {
    return pnpmAliasMatch[1]
  }

  const yarnRunMatch = trimmed.match(/^yarn\s+run\s+([a-zA-Z0-9:_-]+)/)
  if (yarnRunMatch !== null) return yarnRunMatch[1]
  const yarnAliasMatch = trimmed.match(/^yarn\s+([a-zA-Z0-9:_-]+)\b/)
  if (
    yarnAliasMatch !== null
    && !['install', 'add', 'remove', 'upgrade', 'up', 'dlx', 'exec'].includes(yarnAliasMatch[1])
  ) {
    return yarnAliasMatch[1]
  }

  return null
}

const inferPackageJson = (cwdPath) => {
  const entries = new Set(fs.readdirSync(cwdPath))
  const hasVite = hasAnyFile(entries, [
    'vite.config.ts',
    'vite.config.js',
    'vite.config.mjs',
    'vite.config.cjs',
  ])
  const hasNext = hasAnyFile(entries, [
    'next.config.js',
    'next.config.mjs',
    'next.config.ts',
  ])
  const hasAngular = entries.has('angular.json')
  const hasTsConfig = entries.has('tsconfig.json')
  const hasJest = hasAnyFile(entries, [
    'jest.config.js',
    'jest.config.cjs',
    'jest.config.mjs',
    'jest.config.ts',
  ])
  const hasVitest = hasAnyFile(entries, [
    'vitest.config.js',
    'vitest.config.cjs',
    'vitest.config.mjs',
    'vitest.config.ts',
  ])
  const hasEslint = entries.has('eslint.config.js')
    || Array.from(entries).some((entry) => entry.startsWith('.eslintrc'))
  const hasMjsRootFile = Array.from(entries).some((entry) => entry.endsWith('.mjs'))

  const scripts = {}
  if (hasVite) {
    scripts.dev = 'vite'
    scripts.build = 'vite build'
    scripts.preview = 'vite preview'
  } else if (hasNext) {
    scripts.dev = 'next dev'
    scripts.build = 'next build'
    scripts.start = 'next start'
  } else if (hasAngular) {
    scripts.start = 'ng serve'
    scripts.build = 'ng build'
    scripts.test = 'ng test'
  } else if (entries.has('index.js')) {
    scripts.start = 'node index.js'
  } else if (entries.has('server.js')) {
    scripts.start = 'node server.js'
  } else if (entries.has('main.js')) {
    scripts.start = 'node main.js'
  } else if (entries.has('index.ts')) {
    scripts.start = 'tsx index.ts'
  }

  if (!scripts.build && hasTsConfig) {
    scripts.build = 'tsc -p tsconfig.json'
  }
  if (!scripts.lint && hasEslint) {
    scripts.lint = 'eslint .'
  }
  if (!scripts.test && hasVitest) {
    scripts.test = 'vitest'
  }
  if (!scripts.test && hasJest) {
    scripts.test = 'jest'
  }

  const packageJson = {
    name: sanitizePackageName(path.basename(cwdPath)),
    version: '0.1.0',
    private: true,
  }
  if (hasVite || hasMjsRootFile) {
    packageJson.type = 'module'
  }
  if (Object.keys(scripts).length > 0) {
    packageJson.scripts = scripts
  }
  return packageJson
}

const listObjectKeys = (value) => (
  value !== null
  && !Array.isArray(value)
  && typeof value === 'object'
    ? Object.keys(value)
    : []
)

const inferDependenciesFromPackageJson = (packageJson) => {
  const scripts =
    packageJson !== null
    && !Array.isArray(packageJson)
    && typeof packageJson === 'object'
    && packageJson.scripts !== null
    && typeof packageJson.scripts === 'object'
      ? packageJson.scripts
      : {}

  const scriptText = Object.values(scripts)
    .filter((value) => typeof value === 'string')
    .join('\n')

  const existing = new Set([
    ...listObjectKeys(packageJson?.dependencies),
    ...listObjectKeys(packageJson?.devDependencies),
  ])

  const deps = new Set()
  const devDeps = new Set()
  const addDep = (name) => {
    if (!existing.has(name)) deps.add(name)
  }
  const addDevDep = (name) => {
    if (!existing.has(name)) devDeps.add(name)
  }
  const uses = (regex) => regex.test(scriptText)

  if (uses(/\bnext\b/)) {
    addDep('next')
    addDep('react')
    addDep('react-dom')
  }
  if (uses(/\bng\b/)) {
    addDevDep('@angular/cli')
  }
  if (uses(/\bvite\b/)) {
    addDevDep('vite')
  }
  if (uses(/\beslint\b/)) {
    addDevDep('eslint')
  }
  if (uses(/\bvitest\b/)) {
    addDevDep('vitest')
  }
  if (uses(/\bjest\b/)) {
    addDevDep('jest')
  }
  if (uses(/\btsc\b/)) {
    addDevDep('typescript')
  }
  if (uses(/\btsx\b/)) {
    addDevDep('tsx')
    addDevDep('typescript')
  }

  return {
    deps: Array.from(deps).sort(),
    devDeps: Array.from(devDeps).sort(),
  }
}

const runShellCommandInPath = (command, targetPath) => {
  try {
    const stdout = execSync(command, {
      cwd: targetPath,
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
    }).trim()
    return {
      ok: true,
      stdout,
      error: null,
    }
  } catch (err) {
    const stderr =
      err !== null
      && typeof err === 'object'
      && 'stderr' in err
      && typeof err.stderr === 'string'
        ? err.stderr
        : err !== null
          && typeof err === 'object'
          && 'stderr' in err
          && Buffer.isBuffer(err.stderr)
            ? err.stderr.toString('utf8')
            : ''
    const stdout =
      err !== null
      && typeof err === 'object'
      && 'stdout' in err
      && typeof err.stdout === 'string'
        ? err.stdout
        : err !== null
          && typeof err === 'object'
          && 'stdout' in err
          && Buffer.isBuffer(err.stdout)
            ? err.stdout.toString('utf8')
            : ''
    const message = err instanceof Error ? err.message : String(err)
    return {
      ok: false,
      stdout: '',
      error: [stderr, stdout, message]
        .map((value) => value.trim())
        .filter(Boolean)
        .join('\n')
        .slice(0, 1200),
    }
  }
}

const getPreferredPackageManager = (cwdPath) => {
  if (fs.existsSync(path.join(cwdPath, 'pnpm-lock.yaml'))) return 'pnpm'
  if (fs.existsSync(path.join(cwdPath, 'yarn.lock'))) return 'yarn'
  return 'npm'
}

const installDependenciesForProject = ({
  cwdPath,
  packageJson,
  addInferredDependencies = true,
}) => {
  const preferred = getPreferredPackageManager(cwdPath)
  const candidates = Array.from(new Set([preferred, 'npm', 'pnpm', 'yarn']))
  const inferred = addInferredDependencies
    ? inferDependenciesFromPackageJson(packageJson)
    : {
      deps: [],
      devDeps: [],
    }

  const commandBuilders = {
    npm: {
      install: () => 'npm install',
      addDeps: (deps) => `npm install ${deps.join(' ')}`,
      addDevDeps: (deps) => `npm install -D ${deps.join(' ')}`,
    },
    pnpm: {
      install: () => 'pnpm install',
      addDeps: (deps) => `pnpm add ${deps.join(' ')}`,
      addDevDeps: (deps) => `pnpm add -D ${deps.join(' ')}`,
    },
    yarn: {
      install: () => 'yarn install',
      addDeps: (deps) => `yarn add ${deps.join(' ')}`,
      addDevDeps: (deps) => `yarn add -D ${deps.join(' ')}`,
    },
  }

  const errors = []
  for (const manager of candidates) {
    const builder = commandBuilders[manager]
    if (!builder) continue

    const installBase = runShellCommandInPath(builder.install(), cwdPath)
    if (!installBase.ok) {
      errors.push(`${manager}: ${installBase.error ?? 'fallo al ejecutar instalación base'}`)
      continue
    }

    if (inferred.deps.length > 0) {
      const installDeps = runShellCommandInPath(builder.addDeps(inferred.deps), cwdPath)
      if (!installDeps.ok) {
        return {
          attempted: true,
          packageManager: manager,
          installedDependencies: [],
          installedDevDependencies: [],
          warning:
            `Se ejecutó ${manager} install, pero falló añadir dependencias requeridas (${inferred.deps.join(', ')}). ` +
            `${installDeps.error ?? ''}`.trim(),
        }
      }
    }

    if (inferred.devDeps.length > 0) {
      const installDevDeps = runShellCommandInPath(builder.addDevDeps(inferred.devDeps), cwdPath)
      if (!installDevDeps.ok) {
        return {
          attempted: true,
          packageManager: manager,
          installedDependencies: inferred.deps,
          installedDevDependencies: [],
          warning:
            `Se ejecutó ${manager} install, pero falló añadir devDependencies requeridas (${inferred.devDeps.join(', ')}). ` +
            `${installDevDeps.error ?? ''}`.trim(),
        }
      }
    }

    return {
      attempted: true,
      packageManager: manager,
      installedDependencies: inferred.deps,
      installedDevDependencies: inferred.devDeps,
      warning: null,
    }
  }

  return {
    attempted: true,
    packageManager: null,
    installedDependencies: [],
    installedDevDependencies: [],
    warning:
      errors.length > 0
        ? `No se pudo instalar dependencias automáticamente.\n${errors.join('\n')}`
        : 'No se pudo instalar dependencias automáticamente.',
  }
}

const autoPrepareWorkspaceProject = ({
  workspacePath,
  firstOpen,
}) => {
  const packageJsonPath = path.join(workspacePath, 'package.json')
  const nodeModulesPath = path.join(workspacePath, 'node_modules')
  const preparation = {
    firstOpen,
    packageJsonCreated: false,
    dependenciesInstallAttempted: false,
    dependenciesInstalled: false,
    packageManager: null,
    installedDependencies: [],
    installedDevDependencies: [],
    warning: null,
  }

  if (!fs.existsSync(packageJsonPath)) {
    const saved = writePackageJsonForProject({
      cwdPath: workspacePath,
      packageJsonPayload: undefined,
      overwrite: false,
      installDependencies: true,
    })
    preparation.packageJsonCreated = !saved.existedBefore
    preparation.dependenciesInstallAttempted = saved.installResult.attempted
    preparation.dependenciesInstalled = saved.installResult.attempted && !saved.installResult.warning
    preparation.packageManager = saved.installResult.packageManager
    preparation.installedDependencies = saved.installResult.installedDependencies
    preparation.installedDevDependencies = saved.installResult.installedDevDependencies
    preparation.warning = saved.installResult.warning
    return preparation
  }

  if (!firstOpen && fs.existsSync(nodeModulesPath)) {
    return preparation
  }

  const parsed = parsePackageJsonFile(packageJsonPath, workspacePath)
  const installResult = installDependenciesForProject({
    cwdPath: workspacePath,
    packageJson: parsed,
    addInferredDependencies: false,
  })
  preparation.dependenciesInstallAttempted = installResult.attempted
  preparation.dependenciesInstalled = installResult.attempted && !installResult.warning
  preparation.packageManager = installResult.packageManager
  preparation.installedDependencies = installResult.installedDependencies
  preparation.installedDevDependencies = installResult.installedDevDependencies
  preparation.warning = installResult.warning
  return preparation
}

const ensurePackageJsonForCommand = (cwdPath, command) => {
  const packageJsonPath = path.join(cwdPath, 'package.json')
  let packageJson
  let created = false

  if (!fs.existsSync(packageJsonPath)) {
    packageJson = inferPackageJson(cwdPath)
    try {
      fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
    } catch {
      throw new Error(
        `No se pudo crear package.json en ${cwdPath}. Revisa permisos de escritura de la carpeta.`,
      )
    }
    created = true
    console.log(`[terminal-agent] package.json creado automáticamente en ${packageJsonPath}`)
  } else {
    try {
      const raw = fs.readFileSync(packageJsonPath, 'utf8')
      packageJson = JSON.parse(raw)
    } catch {
      throw new Error(`package.json inválido en ${cwdPath}. Corrige el JSON antes de ejecutar comandos npm/pnpm/yarn.`)
    }
  }

  const requestedScript = getRequestedScriptName(command)
  if (requestedScript === null) return

  const scripts = packageJson !== null && typeof packageJson === 'object' ? packageJson.scripts : undefined
  const hasScript = scripts !== null
    && typeof scripts === 'object'
    && typeof scripts?.[requestedScript] === 'string'
  if (!hasScript) {
    if (!created && packageJson !== null && typeof packageJson === 'object') {
      const inferred = inferPackageJson(cwdPath)
      const inferredScripts =
        inferred !== null && typeof inferred === 'object' ? inferred.scripts : undefined
      const inferredCommand = inferredScripts !== null
        && typeof inferredScripts === 'object'
        && typeof inferredScripts?.[requestedScript] === 'string'
        ? inferredScripts[requestedScript]
        : null

      if (typeof inferredCommand === 'string') {
        const currentScripts =
          packageJson.scripts !== null && typeof packageJson.scripts === 'object'
            ? packageJson.scripts
            : {}
        packageJson = {
          ...packageJson,
          scripts: {
            ...currentScripts,
            [requestedScript]: inferredCommand,
          },
        }
        try {
          fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
          console.log(
            `[terminal-agent] script "${requestedScript}" añadido automáticamente en ${packageJsonPath}`,
          )
          return
        } catch {
          throw new Error(
            `No se pudo actualizar ${packageJsonPath} para añadir script "${requestedScript}".`,
          )
        }
      }
    }

    if (created) {
      throw new Error(
        `Se creó package.json en ${cwdPath}, pero no se detectó script "${requestedScript}". ` +
        'Edita package.json o ejecuta un comando compatible con esa carpeta.',
      )
    }
    throw new Error(
      `Falta el script "${requestedScript}" en ${packageJsonPath}. ` +
      'Edita package.json o usa otro comando.',
    )
  }
}

const parsePackageJsonFile = (packageJsonPath, cwdPath) => {
  try {
    const raw = fs.readFileSync(packageJsonPath, 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
      throw new Error(`package.json inválido en ${cwdPath}. Debe ser un objeto JSON.`)
    }
    return parsed
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(
      message.includes('package.json inválido')
        ? message
        : `package.json inválido en ${cwdPath}. Corrige el JSON antes de continuar.`,
    )
  }
}

const validatePackageJsonObject = (value) => {
  if (value === null || Array.isArray(value) || typeof value !== 'object') {
    throw new Error('packageJson debe ser un objeto JSON válido.')
  }
  return value
}

const previewPackageJsonForProject = (cwdPath) => {
  const packageJsonPath = path.join(cwdPath, 'package.json')
  const inferredPackageJson = inferPackageJson(cwdPath)
  if (!fs.existsSync(packageJsonPath)) {
    return {
      packageJsonPath,
      exists: false,
      packageJson: inferredPackageJson,
      inferredPackageJson,
    }
  }

  const existingPackageJson = parsePackageJsonFile(packageJsonPath, cwdPath)
  return {
    packageJsonPath,
    exists: true,
    packageJson: existingPackageJson,
    inferredPackageJson,
  }
}

const writePackageJsonForProject = ({
  cwdPath,
  packageJsonPayload,
  overwrite,
  installDependencies,
}) => {
  const packageJsonPath = path.join(cwdPath, 'package.json')
  const existedBefore = fs.existsSync(packageJsonPath)
  if (existedBefore && !overwrite) {
    throw new Error(
      `Ya existe package.json en ${cwdPath}. Activa "sobrescribir" o edítalo manualmente.`,
    )
  }

  const packageJson =
    packageJsonPayload === undefined
      ? inferPackageJson(cwdPath)
      : validatePackageJsonObject(packageJsonPayload)

  try {
    fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
  } catch {
    throw new Error(`No se pudo guardar package.json en ${cwdPath}. Revisa permisos de escritura.`)
  }

  const installResult = installDependencies
    ? installDependenciesForProject({
      cwdPath,
      packageJson,
    })
    : {
      attempted: false,
      packageManager: null,
      installedDependencies: [],
      installedDevDependencies: [],
      warning: null,
    }

  const latestPackageJson = parsePackageJsonFile(packageJsonPath, cwdPath)

  return {
    packageJsonPath,
    existedBefore,
    packageJson: latestPackageJson,
    installResult,
  }
}

const getWorkspaceJsonState = (workspacePath) => {
  if (!workspacePath) {
    return {
      workspaceFilePath: null,
      workspaceFileExists: false,
      packageJsonPath: null,
      hasPackageJson: false,
    }
  }
  const normalized = normalizeCwdPath(workspacePath)
  const workspaceFilePath = path.join(normalized, WORKSPACE_FILE_NAME)
  const packageJsonPath = path.join(normalized, 'package.json')
  return {
    workspaceFilePath,
    workspaceFileExists: fs.existsSync(workspaceFilePath),
    packageJsonPath,
    hasPackageJson: fs.existsSync(packageJsonPath),
  }
}

const safeExecInPath = (command, targetPath) => {
  try {
    return execSync(command, {
      cwd: targetPath,
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
    }).trim()
  } catch {
    return ''
  }
}

const proposeTasksForPath = (targetPath, maxTodos) => {
  const tasks = []
  let seq = 1
  const makeTask = ({ priority, title, description, evidence = [], commands = [] }) => ({
    id: `TASK-${String(seq++).padStart(3, '0')}`,
    priority,
    title,
    description,
    evidence,
    commands,
  })

  const hasRg = safeExecInPath('command -v rg', targetPath) !== ''
  const todoCommand = hasRg
    ? "rg -n --hidden --glob '!node_modules' --glob '!.git' --glob '!dist' --glob '!release' --glob '!package-lock.json' '\\b(TODO|FIXME|HACK|XXX)\\b' ."
    : "grep -RInE '\\b(TODO|FIXME|HACK|XXX)\\b' . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=release --exclude=package-lock.json"
  const rawTodos = safeExecInPath(todoCommand, targetPath)
  const todoMatches = rawTodos
    ? rawTodos.split('\n').filter(Boolean).slice(0, Math.max(1, maxTodos))
    : []

  if (todoMatches.length > 0) {
    tasks.push(makeTask({
      priority: todoMatches.length > 10 ? 'P1' : 'P2',
      title: 'Resolver deuda técnica marcada en comentarios',
      description: 'Se detectaron marcadores TODO/FIXME/HACK/XXX en el código.',
      evidence: todoMatches.slice(0, 5),
      commands: [hasRg ? "rg -n '(TODO|FIXME|HACK|XXX)' ." : "grep -RInE '(TODO|FIXME|HACK|XXX)' ."],
    }))
  }

  const packageJsonPath = path.join(targetPath, 'package.json')
  if (!fs.existsSync(packageJsonPath)) {
    tasks.push(makeTask({
      priority: 'P1',
      title: 'Crear package.json en el proyecto',
      description: 'Falta package.json y es necesario para scripts npm/pnpm/yarn.',
      evidence: [packageJsonPath],
      commands: ['npm init -y'],
    }))
  } else {
    try {
      const parsed = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
      const scripts = parsed !== null && typeof parsed === 'object' ? parsed.scripts ?? {} : {}
      const missingRequired = ['build', 'lint'].filter((name) => typeof scripts?.[name] !== 'string')
      const missingRecommended = ['test'].filter((name) => typeof scripts?.[name] !== 'string')

      if (missingRequired.length > 0) {
        tasks.push(makeTask({
          priority: 'P1',
          title: 'Completar scripts obligatorios',
          description: 'Faltan scripts base en package.json para calidad y build.',
          evidence: [`Scripts faltantes: ${missingRequired.join(', ')}`],
          commands: ['npm run lint', 'npm run build'],
        }))
      } else if (missingRecommended.length > 0) {
        tasks.push(makeTask({
          priority: 'P2',
          title: 'Agregar script de test',
          description: 'Conviene añadir script test para validación automática.',
          evidence: [`Scripts faltantes: ${missingRecommended.join(', ')}`],
          commands: ['npm run test'],
        }))
      }
    } catch {
      tasks.push(makeTask({
        priority: 'P1',
        title: 'Corregir package.json inválido',
        description: 'No se pudo parsear package.json como JSON válido.',
        evidence: [packageJsonPath],
        commands: ["node -e \"JSON.parse(require('fs').readFileSync('package.json','utf8'))\""],
      }))
    }
  }

  const isGitRepo = safeExecInPath('git rev-parse --is-inside-work-tree', targetPath) === 'true'
  if (isGitRepo) {
    const rawStatus = safeExecInPath('git status --porcelain=v1', targetPath)
    const changedLines = rawStatus ? rawStatus.split('\n').filter(Boolean) : []
    if (changedLines.length > 0) {
      tasks.push(makeTask({
        priority: changedLines.length > 20 ? 'P1' : 'P2',
        title: 'Ordenar cambios locales pendientes',
        description: 'Hay cambios sin integrar que conviene agrupar y validar.',
        evidence: [`Cambios detectados: ${changedLines.length}`],
        commands: ['git status --short', 'git diff --name-only'],
      }))
    }
  }

  const workflowsDir = path.join(targetPath, '.github', 'workflows')
  if (fs.existsSync(workflowsDir) && fs.statSync(workflowsDir).isDirectory()) {
    const workflowFiles = fs.readdirSync(workflowsDir)
      .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
      .sort()
    if (workflowFiles.length > 0) {
      const hasPushOrPr = workflowFiles.some((name) => {
        const content = fs.readFileSync(path.join(workflowsDir, name), 'utf8')
        return /\bon:\s*[\s\S]*\b(push|pull_request)\b/m.test(content)
      })
      if (!hasPushOrPr) {
        tasks.push(makeTask({
          priority: 'P2',
          title: 'Activar CI en push/pull_request',
          description: 'Los workflows actuales no parecen dispararse automáticamente en cambios de código.',
          evidence: workflowFiles.map((file) => path.join('.github/workflows', file)),
          commands: ['npm run lint', 'npm run build'],
        }))
      }
    }
  }

  if (tasks.length === 0) {
    tasks.push(makeTask({
      priority: 'P3',
      title: 'Sin riesgos obvios en análisis rápido',
      description: 'No se detectaron gaps claros en scripts, TODOs o estado git con este barrido.',
      evidence: ['Mantener lint/build como baseline de validación.'],
      commands: ['npm run lint', 'npm run build'],
    }))
  }

  const severityOrder = { P1: 1, P2: 2, P3: 3 }
  tasks.sort((a, b) => {
    const sa = severityOrder[a.priority] ?? 99
    const sb = severityOrder[b.priority] ?? 99
    if (sa !== sb) return sa - sb
    return a.id.localeCompare(b.id)
  })

  return {
    generatedAt: nowIso(),
    targetPath,
    todoCount: todoMatches.length,
    isGitRepo,
    tasks,
  }
}

const pathExistsAndIsDirectory = (targetPath) => {
  try {
    return fs.statSync(targetPath).isDirectory()
  } catch {
    return false
  }
}

const normalizeCwdPath = (targetPath) => path.resolve(targetPath.trim())

const assertWorkspaceWritable = (workspacePath) => {
  try {
    fs.accessSync(workspacePath, fs.constants.W_OK)
  } catch {
    throw new Error(
      `No se puede escribir en la carpeta seleccionada: ${workspacePath}. ` +
      `El panel necesita crear ${WORKSPACE_FILE_NAME} en esa ruta.`,
    )
  }
}

const readProjectsFile = () => {
  if (!fs.existsSync(PROJECTS_FILE_PATH)) {
    return {
      projects: [],
      activeWorkspacePath: '',
    }
  }
  const raw = fs.readFileSync(PROJECTS_FILE_PATH, 'utf8').trim()
  if (!raw) {
    return {
      projects: [],
      activeWorkspacePath: '',
    }
  }
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {
      projects: [],
      activeWorkspacePath: '',
    }
  }

  if (Array.isArray(parsed)) {
    return {
      projects: parsed
        .filter((entry) => typeof entry === 'string')
        .map((entry) => ({ path: entry, favorite: false })),
      activeWorkspacePath: '',
    }
  }
  if (parsed && Array.isArray(parsed.projects)) {
    return {
      projects: parsed.projects,
      activeWorkspacePath:
        typeof parsed.activeWorkspacePath === 'string'
          ? parsed.activeWorkspacePath
          : '',
    }
  }
  return {
    projects: [],
    activeWorkspacePath: '',
  }
}

const persistProjectsFile = () => {
  const projects = Array.from(projectRegistry.values())
    .map((project) => ({
      path: project.path,
      name: project.name,
      favorite: project.favorite,
      createdAt: project.createdAt,
    }))
    .sort((a, b) => a.path.localeCompare(b.path))
  const payload = JSON.stringify(
    {
      activeWorkspacePath,
      projects,
    },
    null,
    2,
  )
  fs.mkdirSync(path.dirname(PROJECTS_FILE_PATH), { recursive: true })
  fs.writeFileSync(PROJECTS_FILE_PATH, payload)
}

const upsertProject = ({
  projectPath,
  name,
  favorite,
  createdAt,
}) => {
  const normalized = normalizeCwdPath(projectPath)
  if (!pathExistsAndIsDirectory(normalized)) {
    throw new Error(`Directorio no encontrado: ${normalized}`)
  }
  const previous = projectRegistry.get(normalized)
  const next = {
    path: normalized,
    name:
      typeof name === 'string' && name.trim().length > 0
        ? name.trim()
        : previous?.name ?? path.basename(normalized),
    favorite:
      typeof favorite === 'boolean'
        ? favorite
        : previous?.favorite ?? false,
    createdAt: createdAt ?? previous?.createdAt ?? nowIso(),
  }
  projectRegistry.set(normalized, next)
  return next
}

const removeProject = (targetPath) => {
  const normalized = normalizeCwdPath(targetPath)
  return projectRegistry.delete(normalized)
}

const listProjects = () =>
  Array.from(projectRegistry.values()).sort((a, b) => {
    if (a.favorite !== b.favorite) {
      return a.favorite ? -1 : 1
    }
    return a.name.localeCompare(b.name)
  })

const ensureWorkspaceFile = (workspacePath) => {
  const workspaceFilePath = path.join(workspacePath, WORKSPACE_FILE_NAME)
  const now = nowIso()
  let workspaceState = {
    version: 1,
    projectPath: workspacePath,
    createdAt: now,
    updatedAt: now,
    selectionHistory: [now],
  }

  if (fs.existsSync(workspaceFilePath)) {
    try {
      const raw = fs.readFileSync(workspaceFilePath, 'utf8').trim()
      if (raw) {
        const parsed = JSON.parse(raw)
        const existingHistory = Array.isArray(parsed.selectionHistory)
          ? parsed.selectionHistory.filter((entry) => typeof entry === 'string')
          : []
        workspaceState = {
          version: typeof parsed.version === 'number' ? parsed.version : 1,
          projectPath: workspacePath,
          createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : now,
          updatedAt: now,
          selectionHistory: [...existingHistory, now].slice(-30),
        }
      }
    } catch {
      workspaceState = {
        version: 1,
        projectPath: workspacePath,
        createdAt: now,
        updatedAt: now,
        selectionHistory: [now],
      }
    }
  }

  try {
    fs.writeFileSync(workspaceFilePath, JSON.stringify(workspaceState, null, 2))
  } catch {
    throw new Error(
      `No se pudo crear/actualizar ${WORKSPACE_FILE_NAME} en ${workspacePath}. ` +
      'Revisa permisos de escritura de la carpeta.',
    )
  }
  return workspaceFilePath
}

const setActiveWorkspace = ({ workspacePath, favorite }) => {
  const project = upsertProject({
    projectPath: workspacePath,
    favorite,
  })
  assertWorkspaceWritable(project.path)
  const workspaceFileExistedBefore = fs.existsSync(path.join(project.path, WORKSPACE_FILE_NAME))
  activeWorkspacePath = project.path
  const workspaceFilePath = ensureWorkspaceFile(project.path)
  const autoPrepared = autoPrepareWorkspaceProject({
    workspacePath: project.path,
    firstOpen: !workspaceFileExistedBefore,
  })
  persistProjectsFile()
  return {
    workspacePath: project.path,
    workspaceFilePath,
    autoPrepared,
  }
}

const pickFolderWithNativeDialog = async () => {
  if (process.platform === 'darwin') {
    const prompt = 'Selecciona la carpeta de trabajo del panel'
    const { stdout } = await execFileAsync('osascript', [
      '-e',
      `POSIX path of (choose folder with prompt "${prompt}")`,
    ])
    const selectedPath = stdout.trim()
    if (!selectedPath) {
      throw new Error('No se seleccionó ninguna carpeta.')
    }
    return normalizeCwdPath(selectedPath)
  }

  if (process.platform === 'linux') {
    const { stdout } = await execFileAsync('zenity', [
      '--file-selection',
      '--directory',
      '--title=Selecciona carpeta de trabajo',
    ])
    const selectedPath = stdout.trim()
    if (!selectedPath) {
      throw new Error('No se seleccionó ninguna carpeta.')
    }
    return normalizeCwdPath(selectedPath)
  }

  if (process.platform === 'win32') {
    const pickScript = [
      'Add-Type -AssemblyName System.Windows.Forms',
      '$dialog = New-Object System.Windows.Forms.FolderBrowserDialog',
      '$dialog.Description = "Selecciona carpeta de trabajo"',
      '$dialog.UseDescriptionForTitle = $true',
      'if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {',
      '  Write-Output $dialog.SelectedPath',
      '}',
    ].join('; ')
    const { stdout } = await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-Command',
      pickScript,
    ])
    const selectedPath = stdout.trim()
    if (!selectedPath) {
      throw new Error('No se seleccionó ninguna carpeta.')
    }
    return normalizeCwdPath(selectedPath)
  }

  throw new Error('Selector nativo de carpetas no soportado en este sistema.')
}

const initializeProjects = () => {
  for (const projectPath of INITIAL_ALLOWED_CWD_PREFIXES) {
    upsertProject({
      projectPath,
      favorite: false,
    })
  }

  const persistedState = readProjectsFile()
  for (const rawProject of persistedState.projects) {
    if (rawProject === null || typeof rawProject !== 'object') continue
    const projectPath = typeof rawProject.path === 'string' ? rawProject.path : ''
    if (!projectPath) continue
    try {
      upsertProject({
        projectPath,
        name: typeof rawProject.name === 'string' ? rawProject.name : undefined,
        favorite: rawProject.favorite === true,
        createdAt: typeof rawProject.createdAt === 'string' ? rawProject.createdAt : undefined,
      })
    } catch {
      // Ignora rutas no válidas en archivo persistido.
    }
  }

  if (typeof persistedState.activeWorkspacePath === 'string' && persistedState.activeWorkspacePath.trim()) {
    const normalized = normalizeCwdPath(persistedState.activeWorkspacePath)
    if (projectRegistry.has(normalized)) {
      activeWorkspacePath = normalized
    }
  }
  if (!activeWorkspacePath) {
    const firstProject = listProjects()[0]
    activeWorkspacePath = firstProject?.path ?? ''
  }

  persistProjectsFile()
}

initializeProjects()

const resolveSafeCwd = (cwd) => {
  const resolved = path.resolve(cwd ?? process.cwd())
  const allowedPrefixes = Array.from(projectRegistry.keys())
  const allowed = allowedPrefixes.some((prefix) => (
    resolved === prefix || resolved.startsWith(`${prefix}${path.sep}`)
  ))
  if (!allowed) {
    throw new Error(`cwd no permitido: ${resolved}`)
  }
  return resolved
}

const broadcast = (run, eventName, payload) => {
  const data = JSON.stringify(payload)
  for (const client of run.clients) {
    client.write(`event: ${eventName}\n`)
    client.write(`data: ${data}\n\n`)
  }
}

const appendOutput = (run, stream, chunk) => {
  const line = {
    stream,
    chunk,
    at: nowIso(),
  }
  run.logs.push(line)
  if (run.logs.length > 2000) {
    run.logs.shift()
  }
  broadcast(run, 'output', line)
}

const finalizeRun = (run, status, exitCode, signal) => {
  if (run.status !== 'running') return
  run.status = status
  run.exitCode = exitCode
  run.signal = signal
  run.endedAt = nowIso()
  if (run.timeoutId !== undefined) {
    clearTimeout(run.timeoutId)
    run.timeoutId = undefined
  }
  broadcast(run, 'complete', {
    runId: run.id,
    status: run.status,
    exitCode: run.exitCode,
    signal: run.signal,
    endedAt: run.endedAt,
  })
  for (const client of run.clients) {
    client.end()
  }
  run.clients.clear()
}

const startRun = ({ command, cwd, runId }) => {
  if (!isCommandAllowed(command)) {
    throw new Error('Comando no permitido por allowlist')
  }

  const safeCwd = resolveSafeCwd(cwd)
  if (isNodePackageManagerCommand(command)) {
    ensurePackageJsonForCommand(safeCwd, command)
  }
  const id = runId ?? createRunId()
  if (runs.has(id)) {
    throw new Error(`runId ya existe: ${id}`)
  }

  const child = spawn(SHELL, ['-lc', command], {
    cwd: safeCwd,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const run = {
    id,
    command,
    cwd: safeCwd,
    status: 'running',
    startedAt: nowIso(),
    endedAt: undefined,
    exitCode: null,
    signal: null,
    logs: [],
    clients: new Set(),
    process: child,
    timeoutId: undefined,
  }
  runs.set(id, run)

  run.timeoutId = setTimeout(() => {
    appendOutput(run, 'stderr', '[terminal-agent] Timeout alcanzado, terminando proceso.')
    child.kill('SIGTERM')
    setTimeout(() => {
      if (run.status === 'running') {
        child.kill('SIGKILL')
      }
    }, 2000)
  }, RUN_TIMEOUT_MS)

  child.stdout.on('data', (buffer) => {
    appendOutput(run, 'stdout', String(buffer))
  })

  child.stderr.on('data', (buffer) => {
    appendOutput(run, 'stderr', String(buffer))
  })

  child.on('error', (err) => {
    appendOutput(run, 'stderr', `[terminal-agent] ${err.message}`)
    finalizeRun(run, 'failed', null, null)
  })

  child.on('close', (code, signal) => {
    finalizeRun(run, code === 0 ? 'succeeded' : 'failed', code, signal)
  })

  return run
}

const attachStreamClient = (run, res) => {
  res.writeHead(200, {
    ...buildCorsHeaders(),
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })

  res.write(`event: ready\n`)
  res.write(`data: ${JSON.stringify({
    runId: run.id,
    status: run.status,
    command: run.command,
    cwd: run.cwd,
    startedAt: run.startedAt,
  })}\n\n`)

  for (const line of run.logs) {
    res.write(`event: output\n`)
    res.write(`data: ${JSON.stringify(line)}\n\n`)
  }

  if (run.status !== 'running') {
    res.write(`event: complete\n`)
    res.write(`data: ${JSON.stringify({
      runId: run.id,
      status: run.status,
      exitCode: run.exitCode,
      signal: run.signal,
      endedAt: run.endedAt,
    })}\n\n`)
    res.end()
    return
  }

  run.clients.add(res)
  res.on('close', () => {
    run.clients.delete(res)
  })
}

const server = http.createServer(async (req, res) => {
  try {
    const method = req.method ?? 'GET'
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
    const pathname = url.pathname

    if (method === 'OPTIONS') {
      res.writeHead(204, buildCorsHeaders())
      res.end()
      return
    }

    if (method === 'GET' && pathname === '/api/terminal/health') {
      sendJson(res, 200, {
        ok: true,
        runs: runs.size,
        allowlist: ALLOWED_COMMAND_PREFIXES,
        allowedCwds: Array.from(projectRegistry.keys()),
        activeWorkspacePath,
        workspaceFileName: WORKSPACE_FILE_NAME,
        projectsFile: PROJECTS_FILE_PATH,
      })
      return
    }

    if (method === 'GET' && pathname === '/api/terminal/projects') {
      sendJson(res, 200, {
        projects: listProjects(),
      })
      return
    }

    if (method === 'GET' && pathname === '/api/terminal/workspace') {
      const workspaceState = getWorkspaceJsonState(activeWorkspacePath)
      sendJson(res, 200, {
        activeWorkspacePath,
        workspaceFileName: WORKSPACE_FILE_NAME,
        workspaceFilePath: workspaceState.workspaceFilePath,
        workspaceFileExists: workspaceState.workspaceFileExists,
        packageJsonPath: workspaceState.packageJsonPath,
        hasPackageJson: workspaceState.hasPackageJson,
      })
      return
    }

    if (method === 'POST' && pathname === '/api/terminal/projects') {
      const body = await parseBody(req)
      const projectPath = typeof body.path === 'string' ? body.path.trim() : ''
      if (!projectPath) {
        sendJson(res, 400, { error: 'path es requerido' })
        return
      }
      const project = upsertProject({
        projectPath,
        name: typeof body.name === 'string' ? body.name : undefined,
        favorite: body.favorite === true,
      })
      persistProjectsFile()
      sendJson(res, 201, {
        project,
        projects: listProjects(),
      })
      return
    }

    if (method === 'POST' && pathname === '/api/terminal/projects/pick') {
      const selectedPath = await pickFolderWithNativeDialog()
      sendJson(res, 200, {
        path: selectedPath,
      })
      return
    }

    if (method === 'POST' && pathname === '/api/terminal/projects/package/preview') {
      const body = await parseBody(req)
      const projectPath = typeof body.path === 'string' ? body.path.trim() : ''
      if (!projectPath) {
        sendJson(res, 400, { error: 'path es requerido' })
        return
      }

      try {
        const safeProjectPath = resolveSafeCwd(projectPath)
        const preview = previewPackageJsonForProject(safeProjectPath)
        sendJson(res, 200, {
          projectPath: safeProjectPath,
          packageJsonPath: preview.packageJsonPath,
          exists: preview.exists,
          packageJson: preview.packageJson,
          inferredPackageJson: preview.inferredPackageJson,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        sendJson(res, 400, { error: message })
      }
      return
    }

    if (method === 'POST' && pathname === '/api/terminal/projects/package') {
      const body = await parseBody(req)
      const projectPath = typeof body.path === 'string' ? body.path.trim() : ''
      if (!projectPath) {
        sendJson(res, 400, { error: 'path es requerido' })
        return
      }

      try {
        const safeProjectPath = resolveSafeCwd(projectPath)
        assertWorkspaceWritable(safeProjectPath)
        const saved = writePackageJsonForProject({
          cwdPath: safeProjectPath,
          packageJsonPayload: body.packageJson,
          overwrite: body.overwrite === true,
          installDependencies: body.installDependencies !== false,
        })
        sendJson(res, saved.existedBefore ? 200 : 201, {
          projectPath: safeProjectPath,
          packageJsonPath: saved.packageJsonPath,
          existedBefore: saved.existedBefore,
          packageJson: saved.packageJson,
          installResult: saved.installResult,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        sendJson(res, 400, { error: message })
      }
      return
    }

    if (method === 'POST' && pathname === '/api/terminal/tasks/propose') {
      const body = await parseBody(req)
      const requestedPath = typeof body.path === 'string' ? body.path.trim() : ''
      const maxTodosValue = Number(body.maxTodos ?? 10)
      const maxTodos = Number.isFinite(maxTodosValue)
        ? Math.max(1, Math.min(50, Math.floor(maxTodosValue)))
        : 10
      const targetPath = requestedPath || activeWorkspacePath
      if (!targetPath) {
        sendJson(res, 400, { error: 'path es requerido (o workspace activo).' })
        return
      }

      try {
        const safeTargetPath = resolveSafeCwd(targetPath)
        const report = proposeTasksForPath(safeTargetPath, maxTodos)
        sendJson(res, 200, report)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        sendJson(res, 400, { error: message })
      }
      return
    }

    if (method === 'POST' && pathname === '/api/terminal/workspace') {
      const body = await parseBody(req)
      const workspacePath = typeof body.path === 'string' ? body.path.trim() : ''
      if (!workspacePath) {
        sendJson(res, 400, { error: 'path es requerido' })
        return
      }
      let workspace
      try {
        workspace = setActiveWorkspace({
          workspacePath,
          favorite: body.favorite !== false,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        sendJson(res, 400, { error: message })
        return
      }
      sendJson(res, 200, {
        activeWorkspacePath: workspace.workspacePath,
        workspaceFileName: WORKSPACE_FILE_NAME,
        workspaceFilePath: workspace.workspaceFilePath,
        workspaceFileExists: true,
        packageJsonPath: path.join(workspace.workspacePath, 'package.json'),
        hasPackageJson: fs.existsSync(path.join(workspace.workspacePath, 'package.json')),
        projects: listProjects(),
        autoPrepared: workspace.autoPrepared,
      })
      return
    }

    if (method === 'PATCH' && pathname === '/api/terminal/projects') {
      const body = await parseBody(req)
      const projectPath = typeof body.path === 'string' ? body.path.trim() : ''
      if (!projectPath) {
        sendJson(res, 400, { error: 'path es requerido' })
        return
      }
      const normalizedPath = normalizeCwdPath(projectPath)
      if (!projectRegistry.has(normalizedPath)) {
        sendJson(res, 404, { error: 'Proyecto no encontrado' })
        return
      }
      const project = upsertProject({
        projectPath: normalizedPath,
        name: typeof body.name === 'string' ? body.name : undefined,
        favorite: typeof body.favorite === 'boolean' ? body.favorite : undefined,
      })
      persistProjectsFile()
      sendJson(res, 200, {
        project,
        projects: listProjects(),
      })
      return
    }

    if (method === 'DELETE' && pathname === '/api/terminal/projects') {
      const projectPath = url.searchParams.get('path')?.trim() ?? ''
      if (!projectPath) {
        sendJson(res, 400, { error: 'path es requerido' })
        return
      }
      const removed = removeProject(projectPath)
      if (!removed) {
        sendJson(res, 404, { error: 'Proyecto no encontrado' })
        return
      }
      if (activeWorkspacePath === normalizeCwdPath(projectPath)) {
        activeWorkspacePath = listProjects()[0]?.path ?? ''
      }
      persistProjectsFile()
      sendJson(res, 200, {
        ok: true,
        activeWorkspacePath,
        projects: listProjects(),
      })
      return
    }

    if (method === 'POST' && pathname === '/api/terminal/exec') {
      const body = await parseBody(req)
      const command = typeof body.command === 'string' ? body.command.trim() : ''
      const cwd = typeof body.cwd === 'string' && body.cwd.trim() ? body.cwd.trim() : process.cwd()
      const runId = typeof body.runId === 'string' && body.runId.trim() ? body.runId.trim() : undefined

      if (!command) {
        sendJson(res, 400, { error: 'command es requerido' })
        return
      }

      const run = startRun({ command, cwd, runId })
      sendJson(res, 201, {
        runId: run.id,
        status: run.status,
        startedAt: run.startedAt,
        cwd: run.cwd,
        command: run.command,
      })
      return
    }

    const streamMatch = pathname.match(/^\/api\/terminal\/exec\/([^/]+)\/stream$/)
    if (method === 'GET' && streamMatch !== null) {
      const runId = decodeURIComponent(streamMatch[1])
      const run = runs.get(runId)
      if (run === undefined) {
        sendJson(res, 404, { error: `Run no encontrado: ${runId}` })
        return
      }
      attachStreamClient(run, res)
      return
    }

    const killMatch = pathname.match(/^\/api\/terminal\/exec\/([^/]+)\/kill$/)
    if (method === 'POST' && killMatch !== null) {
      const runId = decodeURIComponent(killMatch[1])
      const run = runs.get(runId)
      if (run === undefined) {
        sendJson(res, 404, { error: `Run no encontrado: ${runId}` })
        return
      }
      if (run.status !== 'running') {
        sendJson(res, 200, {
          ok: true,
          message: `Run ${runId} ya finalizado`,
          status: run.status,
        })
        return
      }
      appendOutput(run, 'stderr', '[terminal-agent] Solicitud de stop recibida.')
      run.process.kill('SIGTERM')
      setTimeout(() => {
        if (run.status === 'running') {
          run.process.kill('SIGKILL')
        }
      }, 2000)
      sendJson(res, 202, { ok: true, runId, status: 'stopping' })
      return
    }

    sendJson(res, 404, { error: 'Ruta no encontrada' })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    sendJson(res, 500, { error: message })
  }
})

server.listen(PORT, () => {
  console.log(`[terminal-agent] listening on http://localhost:${PORT}`)
  console.log(`[terminal-agent] allowed commands: ${ALLOWED_COMMAND_PREFIXES.join(' | ')}`)
  console.log(`[terminal-agent] active workspace: ${activeWorkspacePath || '(none)'}`)
  console.log(`[terminal-agent] workspace file name: ${WORKSPACE_FILE_NAME}`)
  console.log(`[terminal-agent] projects file: ${PROJECTS_FILE_PATH}`)
  console.log(`[terminal-agent] allowed cwd roots: ${Array.from(projectRegistry.keys()).join(' | ')}`)
})
