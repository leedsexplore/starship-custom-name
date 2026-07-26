#!/usr/bin/env python3
"""Concatenate binary STLs into one multi-body file (no boolean)."""

from __future__ import annotations

import struct
import sys
from pathlib import Path


def _facets_from_ascii(text: str) -> bytes:
    verts: list[tuple[float, float, float]] = []
    out = bytearray()
    for line in text.splitlines():
        parts = line.split()
        if len(parts) >= 4 and parts[0] == "vertex":
            verts.append((float(parts[1]), float(parts[2]), float(parts[3])))
            if len(verts) == 3:
                # zero normal — fine for most slicers
                out += struct.pack("<12fH", 0, 0, 0, *verts[0], *verts[1], *verts[2], 0)
                verts.clear()
    return bytes(out)


def read_stl_facets(path: Path) -> bytes:
    data = path.read_bytes()
    if len(data) < 15:
        raise SystemExit(f"Too small to be an STL: {path}")
    # ASCII STLs start with 'solid' and lack binary nulls in the header.
    if data[:5] == b"solid" and b"\x00" not in data[:80]:
        return _facets_from_ascii(data.decode("utf-8", errors="replace"))
    n = struct.unpack_from("<I", data, 80)[0]
    expected = 84 + n * 50
    if len(data) < expected:
        raise SystemExit(f"Truncated STL: {path}")
    return data[84:expected]


def write_merged(paths: list[Path], out: Path) -> None:
    chunks = [read_stl_facets(p) for p in paths]
    total = sum(len(c) for c in chunks) // 50
    header = b"Merged by merge_stls.py".ljust(80, b" ")
    out.write_bytes(header + struct.pack("<I", total) + b"".join(chunks))
    print(f"Wrote {out} ({total} facets from {len(paths)} files)")


def main() -> None:
    if len(sys.argv) < 4:
        print(
            "Usage: merge_stls.py ship.stl text.stl ... out.stl",
            file=sys.stderr,
        )
        raise SystemExit(2)
    *inputs, out = sys.argv[1:]
    write_merged([Path(p) for p in inputs], Path(out))


if __name__ == "__main__":
    main()
