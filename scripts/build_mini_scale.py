#!/usr/bin/env python3
"""Scale the 1:200 hex one-piece mesh to mini printer sizes.

  1:200 → H 260.5 mm (hero / CORE One)
  1:250 → H 208.4 mm (scale 0.8)
  1:300 → H 173.7 mm (scale 2/3) — fits Bambu A1 mini Z (~180 mm with margin)

  python3 scripts/build_mini_scale.py
"""

from __future__ import annotations

import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "starship_ship_print_1_200_hex.stl"
PKG = ROOT / "printables" / "starship-parametric" / "files"

VARIANTS = [
    (250, PKG / "starship_1_250_hex_tiles_one_piece.stl"),
    (300, PKG / "starship_1_300_hex_tiles_one_piece.stl"),
]


def scale_binary_stl(src: Path, dst: Path, scale: float, label: str) -> None:
    data = bytearray(src.read_bytes())
    n = struct.unpack_from("<I", data, 80)[0]
    header = f"starship 1:{label} hex scale={scale:.6f} from 1:200".encode("ascii")[:80]
    data[0:80] = header.ljust(80, b"\0")
    off = 84
    for _ in range(n):
        for k in (12, 24, 36):
            x, y, z = struct.unpack_from("<fff", data, off + k)
            struct.pack_into("<fff", data, off + k, x * scale, y * scale, z * scale)
        off += 50
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_bytes(data)
    print(f"wrote {dst.relative_to(ROOT)}  ({dst.stat().st_size / 1e6:.2f} MB)  scale={scale:.4f}")


def main() -> int:
    if not SRC.exists():
        print(f"missing {SRC}", file=sys.stderr)
        return 1
    for denom, out in VARIANTS:
        scale_binary_stl(SRC, out, 200.0 / denom, str(denom))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
