#!/usr/bin/env python3
"""Build a profiled multi-object 3MF: hex MMU ship + display stand + nameplate.

Includes metadata hints for CORE One @ 0.15 mm layers. Objects stay separate so
slicers can assign MMU colors and optionally disable the stand/nameplate.

  python3 scripts/build_profiled_3mf.py
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from build_mmu_3mf import build  # noqa: E402

ASSETS = ROOT / "assets"
PKG = ROOT / "printables" / "starship-parametric" / "files"

PARTS = [
    ("Stainless hull", ASSETS / "starship_print_1_200_steel.stl", "#FFC8CED6"),
    (
        "Heat shield + Raptors",
        ASSETS / "starship_print_1_200_tiles_hex.stl",
        "#FF17191D",
    ),
    ("Display stand", ASSETS / "starship_display_stand.stl", "#FF5A6A7A"),
    ("Nameplate", ASSETS / "starship_nameplate.stl", "#FFE8ECF0"),
]

OUT_ASSET = ASSETS / "starship_print_1_200_mmu_hex_with_stand.3mf"
OUT_PKG = PKG / "starship_1_200_mmu_hex_with_stand.3mf"


def main() -> int:
    for _, path, _ in PARTS:
        if not path.exists():
            print(f"missing {path}", file=sys.stderr)
            return 1
    build(PARTS, OUT_ASSET)
    OUT_PKG.write_bytes(OUT_ASSET.read_bytes())
    print(f"copied → {OUT_PKG.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
