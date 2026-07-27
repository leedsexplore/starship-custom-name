#!/usr/bin/env python3
"""Build a smooth Starship hull: no flap bodies, no aft hardpoint ridges."""
from __future__ import annotations

import struct
import sys
from pathlib import Path

import numpy as np
import trimesh

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "StarShipV2_original.stl"
OUT = ROOT / "assets" / "StarShipV2_no_flaps.stl"

BODY_CENTER_X = -22.3
BODY_CENTER_Z = 0.0
HULL_RADIUS = 10.70
# Pull proud wall verts in this Y band (above engine bells).
SMOOTH_Y0 = -58.0
SMOOTH_Y1 = -20.0
PROUD_RADIUS = 10.72
# Four aft hardpoint / hinge-fairing angles (deg from +X).
MOUNT_ANGLES_DEG = (60.0, 120.0, -60.0, -120.0)
MOUNT_HALF_WIDTH_DEG = 30.0


def write_binary_stl(path: Path, mesh: trimesh.Trimesh, header: bytes) -> None:
    faces, verts, normals = mesh.faces, mesh.vertices, mesh.face_normals
    out = bytearray(header[:80].ljust(80, b"\0"))
    out += struct.pack("<I", len(faces))
    for i in range(len(faces)):
        n = normals[i]
        a, b, c = verts[faces[i]]
        out += struct.pack(
            "<12fH",
            float(n[0]),
            float(n[1]),
            float(n[2]),
            float(a[0]),
            float(a[1]),
            float(a[2]),
            float(b[0]),
            float(b[1]),
            float(b[2]),
            float(c[0]),
            float(c[1]),
            float(c[2]),
            0,
        )
    path.write_bytes(out)


def is_flap(part: trimesh.Trimesh) -> bool:
    """Thin elongated plates (fwd/aft aero surfaces), not engine bells."""
    e = part.extents
    thin = float(e.min())
    return thin < 2.0 and float(e.max()) > 25 and len(part.faces) < 5000


def ang_dist(a: np.ndarray, b: float) -> np.ndarray:
    return np.abs((a - b + np.pi) % (2 * np.pi) - np.pi)


def smooth_aft_hardpoints(main: trimesh.Trimesh) -> int:
    """Project aft hardpoint ridges onto the mid-body cylinder."""
    v = main.vertices.copy()
    dx = v[:, 0] - BODY_CENTER_X
    dz = v[:, 2] - BODY_CENTER_Z
    r = np.hypot(dx, dz)
    theta = np.arctan2(dz, dx)
    y = v[:, 1]

    half = np.radians(MOUNT_HALF_WIDTH_DEG)
    near_mount = np.zeros(len(v), dtype=bool)
    for deg in MOUNT_ANGLES_DEG:
        near_mount |= ang_dist(theta, np.radians(deg)) <= half

    # Full cylinder above the skirt: anything proud → hull radius.
    cyl = (y >= -54.5) & (y <= SMOOTH_Y1) & (r > PROUD_RADIUS)
    # Skirt band: only the four hardpoint lobes (keep engine-bay flare).
    skirt = (y >= SMOOTH_Y0) & (y < -54.5) & (r > PROUD_RADIUS) & near_mount
    sel = cyl | skirt
    if not sel.any():
        return 0

    scale = HULL_RADIUS / np.maximum(r[sel], 1e-9)
    v[sel, 0] = BODY_CENTER_X + dx[sel] * scale
    v[sel, 2] = BODY_CENTER_Z + dz[sel] * scale
    main.vertices = v
    main.update_faces(main.nondegenerate_faces())
    main.remove_unreferenced_vertices()
    trimesh.repair.fix_normals(main)
    return int(sel.sum())


def main() -> int:
    if not SRC.is_file():
        print(f"missing source STL: {SRC}", file=sys.stderr)
        return 1

    mesh = trimesh.load_mesh(SRC, force="mesh")
    parts = mesh.split(only_watertight=False)
    keep, removed = [], []
    for p in parts:
        if is_flap(p):
            removed.append(p)
        else:
            keep.append(p)

    if len(removed) != 4:
        print(f"expected 4 flap bodies, found {len(removed)}", file=sys.stderr)
        return 1

    main_i = int(np.argmax([len(p.faces) for p in keep]))
    hull = keep[main_i].copy()
    others = [p for i, p in enumerate(keep) if i != main_i]
    n_pull = smooth_aft_hardpoints(hull)

    no_flaps = trimesh.util.concatenate([hull] + others)
    write_binary_stl(OUT, no_flaps, b"StarShipV2 smooth hull no flaps")
    print(
        f"wrote {OUT.relative_to(ROOT)} — "
        f"{len(no_flaps.faces)} faces "
        f"(removed {sum(len(p.faces) for p in removed)} flap faces, "
        f"smoothed {n_pull} hardpoint verts)"
    )
    for i, p in enumerate(removed):
        c = p.vertices.mean(0)
        print(
            f"  flap {i}: faces={len(p.faces)} "
            f"extents={np.round(p.extents, 2)} center={np.round(c, 2)}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
