#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

DEFAULT_ALLOWLIST="npm run lint,npm run build,npm test,npm run test,pnpm lint,pnpm build,pnpm test,yarn lint,yarn build,yarn test,git status,git diff,ls,pwd"

UI_PORT="${PANEL_UI_PORT:-5173}"
AGENT_PORT="${PANEL_AGENT_PORT:-8787}"
AGENT_TIMEOUT_MS="${PANEL_AGENT_TIMEOUT_MS:-600000}"
ALLOWLIST="${PANEL_COMMAND_ALLOWLIST:-$DEFAULT_ALLOWLIST}"
PROJECTS_FILE="${PANEL_PROJECTS_FILE:-$ROOT_DIR/.panel-projects.json}"
WORKSPACE_FILE_NAME="${PANEL_WORKSPACE_FILE_NAME:-.panel-orquestador-workspace.json}"

resolve_abs_dir() {
  local dir="$1"
  if [[ ! -d "$dir" ]]; then
    echo "Error: directorio no encontrado: $dir" >&2
    exit 1
  fi
  (cd "$dir" && pwd)
}

build_allowed_cwds() {
  if [[ "$#" -gt 0 ]]; then
    local resolved=()
    local dir
    for dir in "$@"; do
      resolved+=("$(resolve_abs_dir "$dir")")
    done
    local joined
    joined="$(IFS=,; echo "${resolved[*]}")"
    echo "$joined"
    return
  fi

  if [[ -n "${PANEL_PROJECT_DIRS:-}" ]]; then
    echo "$PANEL_PROJECT_DIRS"
    return
  fi

  echo "$ROOT_DIR"
}

ALLOWED_CWDS="$(build_allowed_cwds "$@")"

cd "$ROOT_DIR"

echo "Iniciando panel..."
echo "UI: http://localhost:${UI_PORT}"
echo "Terminal agent: http://localhost:${AGENT_PORT}"
echo "Allowed cwd: ${ALLOWED_CWDS}"
echo "Projects file: ${PROJECTS_FILE}"
echo "Workspace file name: ${WORKSPACE_FILE_NAME}"

VITE_PID=""
AGENT_PID=""

cleanup() {
  if [[ -n "$VITE_PID" ]] && kill -0 "$VITE_PID" 2>/dev/null; then
    kill "$VITE_PID" 2>/dev/null || true
  fi
  if [[ -n "$AGENT_PID" ]] && kill -0 "$AGENT_PID" 2>/dev/null; then
    kill "$AGENT_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

npm run dev -- --port "$UI_PORT" &
VITE_PID=$!

TERMINAL_AGENT_PORT="$AGENT_PORT" \
TERMINAL_AGENT_ALLOWED_CWDS="$ALLOWED_CWDS" \
TERMINAL_AGENT_ALLOWLIST="$ALLOWLIST" \
TERMINAL_AGENT_RUN_TIMEOUT_MS="$AGENT_TIMEOUT_MS" \
TERMINAL_AGENT_PROJECTS_FILE="$PROJECTS_FILE" \
TERMINAL_AGENT_WORKSPACE_FILE_NAME="$WORKSPACE_FILE_NAME" \
npm run terminal:agent &
AGENT_PID=$!

while true; do
  if ! kill -0 "$VITE_PID" 2>/dev/null; then
    echo "El proceso de UI termino."
    break
  fi
  if ! kill -0 "$AGENT_PID" 2>/dev/null; then
    echo "El proceso de terminal-agent termino."
    break
  fi
  sleep 1
done
