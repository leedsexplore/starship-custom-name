#!/usr/bin/env python3
"""Rebuild aft: clear bay, inset non-overlapping 3 SL + 3 Vac Raptors.

Keeps Josh flaps. Clears stock aft nozzles and installs a measured
3 sea-level + 3 vacuum layout with positive tip-plane clearances.
"""
from __future__ import annotations

import math
import struct
import sys
from pathlib import Path

import numpy as np

BODY_CX = -22.3
BODY_CZ = 0.0

# Sea-level: tight center cluster, NOT overlapping each other, clear of skirt.
# Need shipR * √3 >= 2*exit + sl_gap  →  with exit 2.15, gap 0.5 → shipR ≳ 2.77
SL_SHIP_R = 2.85
SL_ANGLES = (math.radians(90), math.radians(210), math.radians(330))
# Common tip plane = desk rest plane (outer wall extended to match).
ENGINE_TIP_Y = -61.8
SKIRT_OLD_BOTTOM_Y = -58.0  # original hull lip
SKIRT_WALL_R_OUT = 10.85
SKIRT_WALL_R_IN = 10.15

SL_TIP_Y = ENGINE_TIP_Y
SL_MOUNT_Y = -55.5  # height ≈ 6.3
SL_EXIT_OUTER = 2.15

# Vacuum: in valleys, no mutual overlap, clear of SL and of skirt (~10.9).
VAC_SHIP_R = 7.15
VAC_TIP_Y = ENGINE_TIP_Y
VAC_MOUNT_Y = -53.5  # height ≈ 8.3
VAC_EXIT_OUTER = 3.05

SEGMENTS = 48
N_STACK = 28
# Clear everything inside this radius in the aft bay (keep skirt + flaps)
BAY_CLEAR_R = 10.15
BAY_CLEAR_Y = -48.5


def normal(a, b, c):
    ax, ay, az = b[0] - a[0], b[1] - a[1], b[2] - a[2]
    bx, by, bz = c[0] - a[0], c[1] - a[1], c[2] - a[2]
    nx = ay * bz - az * by
    ny = az * bx - ax * bz
    nz = ax * by - ay * bx
    length = math.sqrt(nx * nx + ny * ny + nz * nz) or 1.0
    return (nx / length, ny / length, nz / length)


def tri(tris, a, b, c):
    tris.append((normal(a, b, c), a, b, c))


def ring_points(cx, cz, y, r, n):
    return [
        (cx + r * math.cos(2 * math.pi * i / n), y, cz + r * math.sin(2 * math.pi * i / n))
        for i in range(n)
    ]


def sl_centers():
    return [
        (BODY_CX + SL_SHIP_R * math.cos(a), BODY_CZ + SL_SHIP_R * math.sin(a), a)
        for a in SL_ANGLES
    ]


def vac_centers():
    angs = sorted(a for _x, _z, a in sl_centers())
    centers = []
    for i in range(3):
        a0 = angs[i]
        a1 = angs[(i + 1) % 3]
        if a1 < a0:
            a1 += 2 * math.pi
        a = ((a0 + a1) / 2.0 + math.pi) % (2 * math.pi) - math.pi
        centers.append(
            (BODY_CX + VAC_SHIP_R * math.cos(a), BODY_CZ + VAC_SHIP_R * math.sin(a), a)
        )
    return centers


def sl_bell_radii(t: float) -> tuple[float, float]:
    s = t * t * (3 - 2 * t)
    r_out = 1.20 + (SL_EXIT_OUTER - 1.20) * (s ** 0.9)
    wall = 0.38 - 0.05 * t
    return r_out, max(0.22, r_out - wall)


def vac_bell_radii(t: float) -> tuple[float, float]:
    if t < 0.45:
        u = t / 0.45
        r_out = 1.40 + 0.45 * u
    else:
        u = (t - 0.45) / 0.55
        s = u * u * (3 - 2 * u)
        r_out = 1.85 + (VAC_EXIT_OUTER - 1.85) * s
    wall = 0.40 - 0.05 * t
    return r_out, max(0.25, r_out - wall)


def build_nozzle(cx, cz, mount_y, tip_y, radii_fn, boss_r: float) -> list:
    tris = []
    n = SEGMENTS
    ys = np.linspace(mount_y, tip_y, N_STACK)
    outer, inner = [], []
    for y in ys:
        t = (float(y) - mount_y) / (tip_y - mount_y)
        ro, ri = radii_fn(t)
        outer.append(ring_points(cx, cz, float(y), ro, n))
        inner.append(ring_points(cx, cz, float(y), ri, n))

    for i in range(N_STACK - 1):
        for j in range(n):
            j2 = (j + 1) % n
            a, b = outer[i][j], outer[i][j2]
            c, d = outer[i + 1][j2], outer[i + 1][j]
            tri(tris, a, b, c)
            tri(tris, a, c, d)
            a, b = inner[i][j], inner[i][j2]
            c, d = inner[i + 1][j2], inner[i + 1][j]
            tri(tris, a, c, b)
            tri(tris, a, d, c)

    for j in range(n):
        j2 = (j + 1) % n
        a, b = outer[-1][j], outer[-1][j2]
        c, d = inner[-1][j2], inner[-1][j]
        tri(tris, a, b, c)
        tri(tris, a, c, d)
        a, b = outer[0][j], outer[0][j2]
        c, d = inner[0][j2], inner[0][j]
        tri(tris, a, c, b)
        tri(tris, a, d, c)

    center = (cx, float(ys[0]), cz)
    for j in range(n):
        j2 = (j + 1) % n
        tri(tris, center, inner[0][j2], inner[0][j])

    boss_y0 = mount_y + 1.3
    boss_y1 = mount_y - 0.12
    b0 = ring_points(cx, cz, boss_y0, boss_r, n)
    b1 = ring_points(cx, cz, boss_y1, boss_r, n)
    c0 = (cx, boss_y0, cz)
    for j in range(n):
        j2 = (j + 1) % n
        tri(tris, b0[j], b0[j2], b1[j2])
        tri(tris, b0[j], b1[j2], b1[j])
        tri(tris, c0, b0[j], b0[j2])
    return tris


def build_thrust_plate(y: float = -53.2, r_outer: float = 9.9) -> list:
    """Solid flat aft plate so the cleared bay isn't an open hole."""
    tris = []
    n = 64
    y2 = y - 0.35
    outer = ring_points(BODY_CX, BODY_CZ, y, r_outer, n)
    outer2 = ring_points(BODY_CX, BODY_CZ, y2, r_outer, n)
    c1 = (BODY_CX, y, BODY_CZ)
    c2 = (BODY_CX, y2, BODY_CZ)
    for j in range(n):
        j2 = (j + 1) % n
        tri(tris, c1, outer[j], outer[j2])
        tri(tris, c2, outer2[j2], outer2[j])
        tri(tris, outer[j], outer[j2], outer2[j2])
        tri(tris, outer[j], outer2[j2], outer2[j])
    return tris


def build_skirt_extension() -> list:
    """Extend outer wall down to ENGINE_TIP_Y so the model sits flat on a desk."""
    tris = []
    n = 72
    y0 = SKIRT_OLD_BOTTOM_Y + 0.15  # slight overlap into existing lip
    y1 = ENGINE_TIP_Y
    out0 = ring_points(BODY_CX, BODY_CZ, y0, SKIRT_WALL_R_OUT, n)
    out1 = ring_points(BODY_CX, BODY_CZ, y1, SKIRT_WALL_R_OUT, n)
    in0 = ring_points(BODY_CX, BODY_CZ, y0, SKIRT_WALL_R_IN, n)
    in1 = ring_points(BODY_CX, BODY_CZ, y1, SKIRT_WALL_R_IN, n)
    for j in range(n):
        j2 = (j + 1) % n
        tri(tris, out0[j], out0[j2], out1[j2])
        tri(tris, out0[j], out1[j2], out1[j])
        tri(tris, in0[j], in1[j2], in0[j2])
        tri(tris, in0[j], in1[j], in1[j2])
        tri(tris, out1[j], out1[j2], in1[j2])
        tri(tris, out1[j], in1[j2], in1[j])
        tri(tris, out0[j], in0[j2], out0[j2])
        tri(tris, out0[j], in0[j], in0[j2])
    return tris


def clear_engine_bay(tris: list) -> list:
    """Remove original aft nozzles / thrust fill inside the skirt."""
    kept = []
    removed = 0
    for nrm, a, b, c in tris:
        cx = (a[0] + b[0] + c[0]) / 3.0
        cy = (a[1] + b[1] + c[1]) / 3.0
        cz = (a[2] + b[2] + c[2]) / 3.0
        sr = math.hypot(cx - BODY_CX, cz - BODY_CZ)
        if cy <= BAY_CLEAR_Y and sr < BAY_CLEAR_R:
            removed += 1
            continue
        kept.append((nrm, a, b, c))
    print(f"cleared bay tris: {removed}")
    return kept


def read_stl(path: Path):
    data = path.read_bytes()
    count = struct.unpack_from("<I", data, 80)[0]
    tris = []
    off = 84
    for _ in range(count):
        vals = struct.unpack_from("<12fH", data, off)
        tris.append((vals[0:3], vals[3:6], vals[6:9], vals[9:12]))
        off += 50
    return tris


def write_stl(path: Path, tris, header: bytes = b"Starship 3SL+3RVac clear"):
    out = bytearray(header[:80].ljust(80, b"\0"))
    out += struct.pack("<I", len(tris))
    for _nrm, a, b, c in tris:
        nx, ny, nz = normal(a, b, c)
        out += struct.pack("<12fH", nx, ny, nz, *a, *b, *c, 0)
    path.write_bytes(out)


def rebuild(src: Path, dst: Path) -> None:
    # Keep Josh flaps — only rebuild the engine bay + skirt extension.
    base = clear_engine_bay(read_stl(src))
    added = build_thrust_plate()
    added.extend(build_skirt_extension())
    for cx, cz, _a in sl_centers():
        added.extend(build_nozzle(cx, cz, SL_MOUNT_Y, SL_TIP_Y, sl_bell_radii, 1.20))
    for cx, cz, _a in vac_centers():
        added.extend(build_nozzle(cx, cz, VAC_MOUNT_Y, VAC_TIP_Y, vac_bell_radii, 1.40))
    write_stl(dst, base + added)
    print(f"wrote {dst} (base {len(base)} + new {len(added)})")


def report():
    sl = [(x, z) for x, z, _ in sl_centers()]
    vac = [(x, z) for x, z, _ in vac_centers()]
    sl_d = math.hypot(sl[0][0] - sl[1][0], sl[0][1] - sl[1][1])
    vac_d = math.hypot(vac[0][0] - vac[1][0], vac[0][1] - vac[1][1])
    sl_gap = sl_d - 2 * SL_EXIT_OUTER
    vac_gap = vac_d - 2 * VAC_EXIT_OUTER
    sv = []
    for sx, sz in sl:
        for vx, vz in vac:
            sv.append(math.hypot(vx - sx, vz - sz) - SL_EXIT_OUTER - VAC_EXIT_OUTER)
    print(
        f"SL↔SL gap={sl_gap:.2f} | Vac↔Vac gap={vac_gap:.2f} | "
        f"SL↔Vac min={min(sv):.2f} | "
        f"desk plane y={ENGINE_TIP_Y} (wall+engines) | "
        f"Vac tip edge={VAC_SHIP_R + VAC_EXIT_OUTER:.2f}"
    )


def main():
    root = Path(__file__).resolve().parents[1]
    backup = root / "assets/backup/StarShipV2_original_3engine.stl"
    out = root / "assets/StarShipV2_original.stl"
    if not backup.exists():
        print(f"missing 3-engine backup: {backup}", file=sys.stderr)
        sys.exit(1)
    rebuild(backup, out)
    report()


if __name__ == "__main__":
    main()
