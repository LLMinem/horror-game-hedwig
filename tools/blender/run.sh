#!/usr/bin/env bash
set -euo pipefail

# No shell evaluation: BLENDER_BIN is a single executable path or command name.
if [[ -n "${BLENDER_BIN:-}" ]]; then
  blender=$(command -v "$BLENDER_BIN") || {
    printf 'BLENDER_BIN is not executable: %s\n' "$BLENDER_BIN" >&2
    exit 1
  }
elif [[ -x /Applications/Blender.app/Contents/MacOS/Blender ]]; then
  blender=/Applications/Blender.app/Contents/MacOS/Blender
elif command -v blender >/dev/null 2>&1; then
  blender=$(command -v blender)
else
  printf 'Blender not found. Set BLENDER_BIN to its executable path.\n' >&2
  exit 1
fi

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
printf 'Blender executable: %s\n' "$blender" >&2
if [[ "${1:-}" == version ]]; then
  [[ $# == 1 ]] || { printf 'Usage: bash tools/blender/run.sh version\n' >&2; exit 2; }
  exec "$blender" --background --factory-startup --disable-autoexec --version
fi
exec "$blender" --background --factory-startup --disable-autoexec \
  --python-exit-code 1 --python "$script_dir/workbench.py" -- "$@"
