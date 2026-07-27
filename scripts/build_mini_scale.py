#!/usr/bin/env python3
"""Scale the 1:200 hex one-piece mesh to 1:250 (fits more printers).

  1:200 → H 260.5 mm; 1:250 → H 208.4 mm (scale 0.8).

  python3 scripts/build_mini_scale.py
"""

from __future__ import annotations

import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "starship_ship_print_1_200_hex.stl"
OUT_ASSET = ROOT / "assets" / "starship_ship_print_1_250_hex.stl"
OUT_PKG = (
    ROOT
    / "printables"
    / "starship-parametric"
    / "files"
    / "starship_1_250_hex_tiles_one_piece.stl"
)
SCALE = 200.0 / 250.0  # 0.8


def scale_binary_stl(src: Path, dst: Path, scale: float) -> None:
    data = bytearray(src.read_bytes())
    n = struct.unpack_from("<I", data, 80)[0]
    header = f"starship 1:250 hex scale={scale:.4f} from 1:200".encode("ascii")[:80]
    data[0:80] = header.ljust(80, b"\0")
    off = 84
    for _ in range(n):
        # normal (12) + 3 verts (36) + attr (2) = 50
        for k in (12, 24, 36):
            x, y, z = struct.unpack_from("<fff", data, off + k)
            struct.pack_into("<fff", data, off + k, x * scale, y * scale, z * scale)
        # Renormalize normal roughly from first triangle edge cross — skip; slicers recompute
        off += 50
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_bytes(data)
    print(f"wrote {dst}  ({dst.stat().st_size / 1e6:.2f} MB)  scale={scale}")


def main() -> int:
    if not SRC.exists():
        print(f"missing {SRC}", file=sys.stderr)
        return 1
    scale_binary_stl(SRC, OUT_ASSET, SCALE)
    scale_binary_stl(SRC, OUT_PKG, SCALE)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
