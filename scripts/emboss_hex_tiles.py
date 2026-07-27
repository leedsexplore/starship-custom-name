#!/usr/bin/env python3
"""Build a printable hex-tile relief on the black heat-shield body.

The OpenSCAD heat shield is a smooth raised shell. This script replaces that
shell with a windward groove-floor shell plus thousands of discrete pointy-top
hex plate prisms (the construction used by the Fusion reference mesh — crisp
tile borders instead of a sampled heightfield), keeps solid OpenSCAD windward
flap halves + Raptor bells, and repairs toward zero open edges for PrusaSlicer:

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

# Tile lattice calibrated to the Fusion reference mesh
# ~/Desktop/SpaceX AI Engineer/tiles_combined.stl (H≈360 mm ⇒ 1:144.6).
# Autocorrelation of its unwrapped barrel: pointy-top hexes laid in
# circumferential rows, 2.0 mm across flats, plates ~0.30 mm proud, ~0.2 mm
# grooves — i.e. scale-true 0.29 m Starship tiles. At our 1:200 that is:
HEX_FTF = 1.45  # mm across flats (circumferential)
GROOVE_W = 0.20  # gap between plates (ref is ~10% of pitch; 14% is our nozzle floor)
GROOVE_DEPTH = 0.22  # plate height above the shell floor
PLATE_EMBED = 0.10  # how far plate prisms sink into the base shell
SHELL_DU = 0.50  # base-shell arc-length sample pitch (mm)
SHELL_DZ = 0.50
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


# Pointy-top hex plate outline (vertex up along the ship axis, flats facing
# sideways) — matches the reference tile orientation. (du, dv) offsets in mm.
_PLATE_S = (HEX_FTF - GROOVE_W) / np.sqrt(3)  # circumradius of the plate hex
_PLATE_POLY = np.array(
    [
        (_PLATE_S * np.cos(np.radians(90 + 60 * k)), _PLATE_S * np.sin(np.radians(90 + 60 * k)))
        for k in range(6)
    ]
)
ROW_DV = 1.5 * HEX_FTF / np.sqrt(3)  # axial row pitch of the lattice

# Prism face template for 12 verts: 0-5 top ring, 6-11 bottom ring.
_PRISM_FACES = np.array(
    [(0, 1, 2), (0, 2, 3), (0, 3, 4), (0, 4, 5)]  # top fan (outward)
    + [(6, 8, 7), (6, 9, 8), (6, 10, 9), (6, 11, 10)]  # bottom fan (inward)
    + [(k, 6 + k, 6 + (k + 1) % 6) for k in range(6)]
    + [(k, 6 + (k + 1) % 6, (k + 1) % 6) for k in range(6)],
    dtype=np.int64,
)


def hex_plate_prisms(centers_theta_z: np.ndarray) -> trimesh.Trimesh:
    """Closed hex prisms standing radially on the hull at (theta, z) centers.

    Each plate is a regular pointy-top hexagon in local surface coordinates,
    extruded from PLATE_EMBED inside the shell floor to GROOVE_DEPTH above it.
    Plates never touch each other (grooves separate them) so the concatenation
    stays manifold as disjoint closed shells.
    """
    verts_all = []
    faces_all = []
    for thc, zc in centers_theta_z:
        r_conv = hull_radius_at(np.array([zc]))[0]  # angular conversion radius
        zs = zc + _PLATE_POLY[:, 1]
        ths = thc + _PLATE_POLY[:, 0] / max(r_conv, 1e-6)
        r_floor = hull_radius_at(zs) + TILE_T - GROOVE_DEPTH
        r_top = r_floor + GROOVE_DEPTH
        r_bot = r_floor - PLATE_EMBED
        top = np.stack([r_top * np.cos(ths), r_top * np.sin(ths), zs], axis=-1)
        bot = np.stack([r_bot * np.cos(ths), r_bot * np.sin(ths), zs], axis=-1)
        base = len(verts_all) * 12
        verts_all.append(np.vstack([top, bot]))
        faces_all.append(_PRISM_FACES + base)
    if not verts_all:
        return trimesh.Trimesh()
    mesh = trimesh.Trimesh(
        vertices=np.vstack(verts_all), faces=np.vstack(faces_all), process=False
    )
    return mesh


def barrel_plate_centers() -> np.ndarray:
    """(theta, z) lattice over the windward wrap — rows are circumferential,
    row count per z follows the local hull radius (tiles stay regular on the
    nose and terminate naturally, like the reference)."""
    half = np.radians(TILE_WRAP_DEG / 2.0)
    centers = []
    z0 = 0.9  # keep the first row clear of the skirt edge
    k = 0
    while True:
        zc = z0 + k * ROW_DV
        if zc + _PLATE_S > SHIP_H - 0.4:
            break
        r_loc = float(hull_radius_at(np.array([zc]))[0])
        if r_loc < 1.2:
            k += 1
            continue
        arc = 2 * half * r_loc
        m = int(np.floor((arc - HEX_FTF) / HEX_FTF))
        if m >= 1:
            offset = (k % 2) * HEX_FTF / 2.0
            us = (np.arange(m) - (m - 1) / 2.0) * HEX_FTF + offset
            us = us[np.abs(us) <= arc / 2.0 - HEX_FTF / 2.0]
            for u in us:
                centers.append((u / r_loc, zc))
        k += 1
    return np.asarray(centers)


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
    """Smooth windward base shell whose outer face is the groove floor.

    The hex relief itself comes from discrete plate prisms (hex_plate_prisms)
    standing on this floor — the reference-mesh construction, which keeps tile
    borders crisp instead of smearing them through a sampled heightfield.
    """
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

    r_in = R
    r_out = R + TILE_T - GROOVE_DEPTH

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


def flap_plate_prisms(flaps: trimesh.Trimesh) -> trimesh.Trimesh:
    """Hex plates standing on the windward (+X) faces of the flap halves.

    Plate centers form the same pointy-top lattice in the flap (y, z) plane;
    each candidate is ray-cast along -X onto the flap and only kept when the
    whole plate lands on a flat windward-facing region.
    """
    if flaps is None or not len(flaps.faces):
        return trimesh.Trimesh()
    bounds = flaps.bounds
    x_hi = bounds[1][0] + 5.0
    ys = []
    k = 0
    z0 = bounds[0][2] + 0.5
    while z0 + k * ROW_DV < bounds[1][2]:
        zc = z0 + k * ROW_DV
        offset = (k % 2) * HEX_FTF / 2.0
        y = bounds[0][1] + HEX_FTF / 2.0 + offset
        while y < bounds[1][1]:
            ys.append((y, zc))
            y += HEX_FTF
        k += 1
    if not ys:
        return trimesh.Trimesh()

    intersector = trimesh.ray.ray_triangle.RayMeshIntersector(flaps)
    verts_all = []
    faces_all = []
    n_plates = 0
    for yc, zc in ys:
        # 7 probes: center + 6 hex vertices (in the flap's y-z plane).
        py = np.concatenate([[yc], yc + _PLATE_POLY[:, 0]])
        pz = np.concatenate([[zc], zc + _PLATE_POLY[:, 1]])
        origins = np.stack([np.full(7, x_hi), py, pz], axis=-1)
        dirs = np.tile([-1.0, 0.0, 0.0], (7, 1))
        locs, ray_idx, tri_idx = intersector.intersects_location(
            origins, dirs, multiple_hits=False
        )
        if len(ray_idx) < 7:
            continue
        order = np.argsort(ray_idx)
        locs = locs[order]
        tri_idx = tri_idx[order]
        nrm = flaps.face_normals[tri_idx]
        if np.any(nrm[:, 0] < 0.7):
            continue  # not the flat windward face
        xs = locs[:, 0]
        if xs.max() - xs.min() > 1.0:
            continue  # straddles an edge or step
        x_top = xs[1:] + GROOVE_DEPTH  # plate follows the local face
        x_bot = xs.min() - 0.6
        top = np.stack([x_top, py[1:], pz[1:]], axis=-1)
        bot = np.stack([np.full(6, x_bot), py[1:], pz[1:]], axis=-1)
        faces_all.append(_PRISM_FACES + n_plates * 12)
        verts_all.append(np.vstack([top, bot]))
        n_plates += 1
    if not verts_all:
        return trimesh.Trimesh()
    return trimesh.Trimesh(
        vertices=np.vstack(verts_all), faces=np.vstack(faces_all), process=False
    )


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
    # multibody: thousands of disjoint tile plates must each stay outward.
    trimesh.repair.fix_normals(mesh, multibody=True)
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
    print("building windward base shell + hex tile plates…")
    hex_shell = ensure_printable(build_hex_shell(), "hex_shell")
    centers = barrel_plate_centers()
    plates = hex_plate_prisms(centers)
    print(f"  hull plates: {len(centers)} tiles, {len(plates.faces)} faces")
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

    # OpenSCAD flaps are coarse extruded polygons (~50 tris). Subdivide a copy
    # for dense plate ray-casts, but keep the watertight coarse solid in the
    # final mesh (subdivision opens edges).
    flaps_solid = flaps
    if flaps is not None and len(flaps.faces):
        flaps_for_plates = flaps
        before = len(flaps.faces)
        try:
            flaps_for_plates = flaps.subdivide_to_size(max_edge=1.2)
            print(f"  flaps densified for plates: {before} → {len(flaps_for_plates.faces)} faces")
        except Exception as err:  # noqa: BLE001
            print(f"  warn: flap densify skipped: {err}")
            flaps_for_plates = flaps

    parts = [hex_shell, plates]
    if flaps_solid is not None and len(flaps_solid.faces):
        parts.append(flaps_solid)
        flap_plates = flap_plate_prisms(flaps_for_plates)
        print(f"  flap plates: {len(flap_plates.faces) // 20} tiles")
        if len(flap_plates.faces):
            parts.append(flap_plates)
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
