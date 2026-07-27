#!/usr/bin/env python3
"""Build a printable hex-tile relief on the black heat-shield body.

The OpenSCAD heat shield is a smooth raised shell. This script replaces that
shell with a dense procedural windward shell whose outer surface carries real
hex grooves, keeps solid OpenSCAD windward flap halves + Raptor bells, and
repairs toward zero open edges for PrusaSlicer:

  assets/starship_print_1_200_tiles_hex.stl
  assets/starship_ship_print_1_200_hex.stl   (steel + hex tiles merge)
  assets/starship_print_1_200_mmu_hex.3mf    (via build_mmu_3mf.py)

Prefer the one-shot release rebuild:

  python3 scripts/rebuild_release.py
"""

from __future__ import annotations

import argparse
import struct
import subprocess
import sys
import time
from pathlib import Path

import numpy as np
import trimesh
from trimesh.remesh import subdivide_to_size

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"

SRC_TILES = ASSETS / "starship_print_1_200_tiles.stl"
SRC_STEEL = ASSETS / "starship_print_1_200_steel.stl"
OUT_TILES = ASSETS / "starship_print_1_200_tiles_hex.stl"
OUT_ONE = ASSETS / "starship_ship_print_1_200_hex.stl"

# True 1:200 of the meter-scale OpenSCAD model.
S = 5.0  # mm per meter
SHIP_H = 52.1 * S
HULL_R = 4.5 * S
TILE_T = 0.09 * S
TILE_WRAP_DEG = 190.0

NOSE_LEN = 12.97 * S
NOSE_TIP_R = 0.60 * S

# Printable hero tiles (readable on a 0.4 mm nozzle).
# Calibrated against the Fusion reference mesh
# ~/Desktop/SpaceX AI Engineer/tiles_combined.stl (H≈360 mm, R≈31.5 mm, ~1:145):
# measured circ tile pitch ≈2.79 mm and groove depth ≈0.30 mm, which scale to
# ≈2.0 mm FTF and ≈0.21 mm depth at our 1:200 (R 22.5 mm) barrel.
HEX_FTF = 2.0
GROOVE_W = 0.35
GROOVE_DEPTH = 0.21
SHELL_DU = 0.50  # arc-length sample pitch (mm)
SHELL_DZ = 0.50
FLAP_MAX_EDGE = 1.20
FLAP_Y_THRESH = 24.0


def _nose_params():
    ogive_r = (HULL_R * HULL_R + NOSE_LEN * NOSE_LEN) / (2 * HULL_R)
    nose_zc = np.sqrt((ogive_r - NOSE_TIP_R) ** 2 - (ogive_r - HULL_R) ** 2)
    nose_yt = NOSE_TIP_R * (ogive_r - HULL_R) / (ogive_r - NOSE_TIP_R)
    nose_zt = nose_zc + np.sqrt(NOSE_TIP_R * NOSE_TIP_R - nose_yt * nose_yt)
    nose_h = nose_zc + NOSE_TIP_R
    cyl_h = SHIP_H - nose_h
    return ogive_r, nose_zc, nose_zt, nose_h, cyl_h


OGIVE_R, NOSE_ZC, NOSE_ZT, NOSE_H, CYL_H = _nose_params()


def nose_x(z: np.ndarray) -> np.ndarray:
    """Nose radius at height z above the shoulder (mm)."""
    z = np.asarray(z, dtype=np.float64)
    ogive = np.sqrt(np.maximum(OGIVE_R * OGIVE_R - z * z, 0.0)) - (OGIVE_R - HULL_R)
    cap = np.sqrt(np.maximum(NOSE_TIP_R * NOSE_TIP_R - (z - NOSE_ZC) ** 2, 0.0))
    return np.where(z <= NOSE_ZT, ogive, cap)


def hull_radius_at(z: np.ndarray) -> np.ndarray:
    z = np.asarray(z, dtype=np.float64)
    return np.where(z <= CYL_H, HULL_R, nose_x(z - CYL_H))


def sd_hexagon(px: np.ndarray, py: np.ndarray, apothem: float) -> np.ndarray:
    """Signed distance to a flat-top hexagon (negative inside). apothem = FTF/2."""
    k0, k1, k2 = -np.sqrt(3) / 2, 0.5, np.sqrt(3) / 3
    px = np.abs(px)
    py = np.abs(py)
    t = np.minimum(k0 * px + k1 * py, 0.0)
    px = px - 2.0 * t * k0
    py = py - 2.0 * t * k1
    px = px - np.clip(px, -k2 * apothem, k2 * apothem)
    py = py - apothem
    return np.hypot(px, py) * np.sign(py)


def hex_groove_weight(u: np.ndarray, v: np.ndarray) -> np.ndarray:
    """1 in the groove, 0 in the tile interior."""
    ap = HEX_FTF / 2.0
    pitch_u = HEX_FTF
    pitch_v = HEX_FTF * np.sqrt(3) / 2.0
    row0 = np.floor(v / pitch_v)
    col0 = np.floor(u / pitch_u)
    # Signed distance to the containing hex (most-negative / nearest center).
    best_sd = np.full(u.shape, np.inf, dtype=np.float64)
    for drow in (-1, 0, 1, 2):
        for dcol in (-1, 0, 1, 2):
            row = row0 + drow
            col = col0 + dcol
            cu = (col + 0.5 * np.mod(row, 2)) * pitch_u
            cv = row * pitch_v
            sd = sd_hexagon(u - cu, v - cv, ap)
            best_sd = np.minimum(best_sd, sd)
    dist_to_edge = -best_sd  # >0 inside a tile
    half = GROOVE_W / 2.0
    return np.clip(1.0 - dist_to_edge / half, 0.0, 1.0)


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


def _grid_faces(nu: int, nv: int, flip: bool = False) -> np.ndarray:
    faces = []
    for j in range(nv - 1):
        for i in range(nu - 1):
            a = j * nu + i
            b = a + 1
            c = a + nu
            d = c + 1
            if flip:
                faces.append((a, c, b))
                faces.append((b, c, d))
            else:
                faces.append((a, b, c))
                faces.append((b, d, c))
    return np.asarray(faces, dtype=np.int64)


def build_hex_shell() -> trimesh.Trimesh:
    """Dense windward heat-shield shell with hex grooves on the outer face."""
    half = np.radians(TILE_WRAP_DEG / 2.0)
    # Sample so arc pitch at the barrel ≈ SHELL_DU.
    n_theta = max(int(np.ceil(TILE_WRAP_DEG / 360.0 * 2 * np.pi * HULL_R / SHELL_DU)), 48)
    thetas = np.linspace(-half, half, n_theta)
    zs = np.arange(0.0, SHIP_H + 1e-9, SHELL_DZ)
    if zs[-1] < SHIP_H - 1e-6:
        zs = np.append(zs, SHIP_H)
    n_z = len(zs)

    # shapes (n_z, n_theta); flatten with theta varying fastest to match _grid_faces.
    theta_grid, z_grid = np.meshgrid(thetas, zs, indexing="xy")

    R = hull_radius_at(z_grid)
    u = theta_grid * HULL_R
    v = z_grid
    groove = hex_groove_weight(u, v)

    r_in = R
    r_out = R + TILE_T - GROOVE_DEPTH * groove

    def cyl_pts(r):
        return np.stack(
            [r * np.cos(theta_grid), r * np.sin(theta_grid), z_grid], axis=-1
        ).reshape(-1, 3)

    outer = cyl_pts(r_out)
    inner = cyl_pts(r_in)

    # Index layout: outer block 0 .. N-1, inner block N .. 2N-1, row-major (z, theta)
    nu, nv = n_theta, n_z
    n = nu * nv
    faces = []
    faces.append(_grid_faces(nu, nv, flip=False))  # outer, outward
    faces.append(_grid_faces(nu, nv, flip=True) + n)  # inner, outward from solid

    # Theta-min / theta-max side walls
    for i_edge, flip in ((0, True), (nu - 1, False)):
        for j in range(nv - 1):
            a = j * nu + i_edge
            b = (j + 1) * nu + i_edge
            c = a + n
            d = b + n
            if flip:
                faces.append(np.array([[a, b, c], [b, d, c]], dtype=np.int64))
            else:
                faces.append(np.array([[a, c, b], [b, c, d]], dtype=np.int64))

    # Bottom (z=0) and top ring (last z) — seal the shell volume
    for j, flip in ((0, True), (nv - 1, False)):
        ring_o = np.arange(j * nu, j * nu + nu)
        ring_i = ring_o + n
        for i in range(nu - 1):
            a, b = ring_o[i], ring_o[i + 1]
            c, d = ring_i[i], ring_i[i + 1]
            if flip:
                faces.append(np.array([[a, c, b], [b, c, d]], dtype=np.int64))
            else:
                faces.append(np.array([[a, b, c], [b, d, c]], dtype=np.int64))

    verts = np.vstack([outer, inner])
    f = np.vstack(faces)
    mesh = trimesh.Trimesh(vertices=verts, faces=f, process=True)
    trimesh.repair.fix_normals(mesh)
    return mesh


def emboss_flaps(shell: trimesh.Trimesh) -> trimesh.Trimesh:
    """Remesh windward flap halves and cut hex grooves along (y, z)."""
    fc = shell.triangles_center
    flap_mask = np.abs(fc[:, 1]) > FLAP_Y_THRESH
    if not np.any(flap_mask):
        return trimesh.Trimesh(vertices=np.zeros((0, 3)), faces=np.zeros((0, 3), dtype=np.int64))

    flap = shell.submesh([np.where(flap_mask)[0]], append=True, repair=False)
    v, f = subdivide_to_size(
        flap.vertices, flap.faces, max_edge=FLAP_MAX_EDGE, max_iter=40
    )
    flap = trimesh.Trimesh(vertices=v, faces=f, process=True)
    flap.merge_vertices()
    trimesh.repair.fix_normals(flap)

    verts = flap.vertices.copy()
    normals = flap.vertex_normals
    # Flap UV: span along |y|, height z — readable hex on the blade.
    u = np.abs(verts[:, 1])
    v_uv = verts[:, 2]
    w = hex_groove_weight(u, v_uv)
    # Only push from the outer-ish faces (away from hull axis in XY).
    radial = verts[:, :2].copy()
    rn = np.linalg.norm(radial, axis=1, keepdims=True)
    radial = radial / np.maximum(rn, 1e-6)
    # Prefer faces whose normal has a component leaving the material along +X
    # (windward half) or along ±Y (blade face).
    outward = np.maximum(normals[:, 0], 0.0) * 0.65 + np.abs(normals[:, 1]) * 0.35
    outward = np.clip(outward, 0.0, 1.0)
    displace = (w * outward * GROOVE_DEPTH)[:, None] * (-normals)
    verts = verts + displace
    out = trimesh.Trimesh(vertices=verts, faces=flap.faces, process=True)
    trimesh.repair.fix_normals(out)
    return out


def load_engines(tiles: trimesh.Trimesh) -> list[trimesh.Trimesh]:
    parts = tiles.split(only_watertight=False)
    # Largest part is shell+flaps; remaining are Raptor bells.
    parts = sorted(parts, key=lambda p: len(p.faces), reverse=True)
    return parts[1:]


def load_solid_flaps(tiles: trimesh.Trimesh) -> trimesh.Trimesh | None:
    """Keep OpenSCAD-solid windward flap halves (watertight) — skip open emboss submeshes."""
    parts = sorted(tiles.split(only_watertight=False), key=lambda p: len(p.faces), reverse=True)
    if not parts:
        return None
    shell = parts[0]
    fc = shell.triangles_center
    flap_mask = np.abs(fc[:, 1]) > FLAP_Y_THRESH
    if not np.any(flap_mask):
        return None
    flaps = shell.submesh([np.where(flap_mask)[0]], append=True, repair=False)
    # Close the hinge cut left by the submesh extract so the black body stays printable.
    flaps.merge_vertices()
    trimesh.repair.fix_normals(flaps)
    try:
        trimesh.repair.fill_holes(flaps)
    except Exception as err:  # noqa: BLE001 — repair is best-effort
        print(f"  warn: flap fill_holes failed: {err}")
    return flaps


def ensure_printable(mesh: trimesh.Trimesh, label: str) -> trimesh.Trimesh:
    """Dedup / repair toward a slicer-friendly mesh (zero open edges when possible)."""
    mesh = mesh.copy()
    mesh.merge_vertices()
    # trimesh 4.x: unique_faces() + update_faces (remove_duplicate_faces was removed)
    try:
        mesh.update_faces(mesh.unique_faces())
    except Exception:
        pass
    mesh.remove_unreferenced_vertices()
    trimesh.repair.fix_normals(mesh)
    try:
        trimesh.repair.fill_holes(mesh)
    except Exception as err:  # noqa: BLE001
        print(f"  warn: {label} fill_holes failed: {err}")
    from collections import Counter

    def _ek(a, b, nd=5):
        a = tuple(np.round(a, nd))
        b = tuple(np.round(b, nd))
        return (a, b) if a <= b else (b, a)

    edges: Counter = Counter()
    for face in mesh.faces:
        verts = mesh.vertices[face]
        for i, j in ((0, 1), (1, 2), (2, 0)):
            edges[_ek(verts[i], verts[j])] += 1
    open_n = sum(1 for c in edges.values() if c == 1)
    non_n = sum(1 for c in edges.values() if c > 2)
    print(
        f"  {label}: faces={len(mesh.faces)} open_edges={open_n} "
        f"nonmanifold_edges={non_n} watertight={mesh.is_watertight}"
    )
    return mesh


def merge_stls(paths: list[Path], out: Path) -> None:
    chunks = []
    total = 0
    for p in paths:
        data = p.read_bytes()
        n = struct.unpack_from("<I", data, 80)[0]
        chunks.append(data[84 : 84 + n * 50])
        total += n
    header = b"Hex heat-shield merge".ljust(80, b" ")
    out.write_bytes(header + struct.pack("<I", total) + b"".join(chunks))


def build_mmu_hex() -> None:
    script = ROOT / "scripts" / "build_mmu_3mf.py"
    subprocess.check_call(
        [
            sys.executable,
            str(script),
            "--tiles",
            str(OUT_TILES),
            "--out",
            str(ASSETS / "starship_print_1_200_mmu_hex.3mf"),
        ]
    )


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--skip-mmu", action="store_true")
    ap.add_argument("--skip-onepiece", action="store_true")
    args = ap.parse_args()

    if not SRC_TILES.exists():
        sys.exit(f"missing {SRC_TILES} — export print tiles first")

    t0 = time.time()
    print("building procedural hex windward shell…")
    hex_shell = ensure_printable(build_hex_shell(), "hex_shell")
    print(f"  shell wall time ({time.time() - t0:.1f}s)")

    src = trimesh.load_mesh(SRC_TILES, force="mesh")
    engines = [ensure_printable(e, f"engine_{i}") for i, e in enumerate(load_engines(src))]
    print(f"  engines: {len(engines)} parts, {sum(len(e.faces) for e in engines)} faces")

    flaps_path = ASSETS / "starship_print_1_200_flaps_tiles.stl"
    if flaps_path.exists():
        print(f"loading solid windward flaps from {flaps_path.name}…")
        flaps = ensure_printable(trimesh.load_mesh(flaps_path, force="mesh"), "flaps")
    else:
        print("solid flaps STL missing — falling back to repaired submesh extract…")
        flaps = load_solid_flaps(src)
        if flaps is not None and len(flaps.faces):
            flaps = ensure_printable(flaps, "flaps")
        else:
            flaps = None

    parts = [hex_shell]
    if flaps is not None and len(flaps.faces):
        parts.append(flaps)
    parts.extend(engines)
    combined = ensure_printable(trimesh.util.concatenate(parts), "tiles_hex")

    ASSETS.mkdir(exist_ok=True)
    write_binary_stl(OUT_TILES, combined, b"starship_print_1_200_tiles_hex")
    print(
        f"wrote {OUT_TILES.relative_to(ROOT)}  "
        f"{len(combined.faces)} faces  {OUT_TILES.stat().st_size / 1e6:.2f} MB"
    )

    if not args.skip_onepiece:
        if not SRC_STEEL.exists():
            sys.exit(f"missing {SRC_STEEL}")
        steel = trimesh.load_mesh(SRC_STEEL, force="mesh")
        one = ensure_printable(
            trimesh.util.concatenate([steel, combined]), "one_piece_hex"
        )
        write_binary_stl(OUT_ONE, one, b"starship_ship_print_1_200_hex")
        print(f"wrote {OUT_ONE.relative_to(ROOT)}  {OUT_ONE.stat().st_size / 1e6:.2f} MB")

    if not args.skip_mmu:
        build_mmu_hex()

    print(f"done in {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
