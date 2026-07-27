#!/usr/bin/env python3
"""Rebuild the hex MMU 3MF with print-hint metadata for one-click slicer opens.

Uses the same steel + hex tiles bodies as Printables. Metadata is advisory —
import prusa_core_one_starship.ini / bambu_p1s_starship.ini for full settings.

  python3 scripts/build_sliced_hints_3mf.py
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
]

HINTS = {
    "Title": "Starship 1:200 hex — put your name on it",
    "Description": (
        "Nose up. Layer 0.15–0.20 mm. Supports under forward flaps only. "
        "MMU: Stainless hull=silver, Heat shield+Raptors=black. "
        "See PRINT_PROFILES.md + prusa_core_one_starship.ini / bambu_p1s_starship.ini. "
        "Customizer: https://leedsexplore.github.io/starship-custom-name/"
    ),
    "LayerHeight": "0.15",
    "Printer": "Prusa CORE One / MK4 or Bambu P1S/X1C (Z>=261mm)",
    "License": "CC BY-NC 4.0",
}


def main() -> int:
    for _, path, _ in PARTS:
        if not path.exists():
            print(f"missing {path}", file=sys.stderr)
            return 1
    out_asset = ASSETS / "starship_print_1_200_mmu_hex.3mf"
    out_pkg = PKG / "starship_1_200_hex_tiles_mmu.3mf"
    build(PARTS, out_asset, metadata=HINTS, assembly_name="Starship 1:200 hex MMU")
    out_pkg.write_bytes(out_asset.read_bytes())
    print(f"synced {out_pkg.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
