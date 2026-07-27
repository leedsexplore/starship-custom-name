#!/usr/bin/env bash
# Convenience wrapper → scripts/build_starship_cad.py --export (1:200 / 260.5 mm).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec python3 "$ROOT/scripts/build_starship_cad.py" --export "$@"
