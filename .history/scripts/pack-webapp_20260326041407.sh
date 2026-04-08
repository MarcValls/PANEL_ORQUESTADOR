#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
OUT_DIR="$ROOT_DIR/dist"
STAMP="$(date +%Y%m%d-%H%M%S)"
ZIP_NAME="webapp-${STAMP}.zip"
ZIP_PATH="$OUT_DIR/$ZIP_NAME"

cd "$ROOT_DIR"

echo "Construyendo webapp..."
npm run build

if [[ ! -d "$DIST_DIR" ]]; then
  echo "Error: no existe la carpeta dist despues del build."
  exit 1
fi

mkdir -p "$OUT_DIR"

# Limpia zip previo con el mismo nombre por seguridad (reruns en el mismo segundo).
rm -f "$ZIP_PATH"

echo "Generando zip: $ZIP_PATH"
(
  cd "$DIST_DIR"
  zip -qr "$ZIP_PATH" .
)

echo "Zip generado correctamente: $ZIP_PATH"
