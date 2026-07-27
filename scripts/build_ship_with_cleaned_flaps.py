#!/usr/bin/env python3
"""Assemble smooth hull + cleaned Block 2 flaps posed like the real Starship."""
from __future__ import annotations

import struct
import subprocess
import sys
from pathlib import Path

import numpy as np
import trimesh
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
HULL_SRC = ROOT / "assets" / "StarShipV2_no_flaps.stl"
ORIG_SRC = ROOT / "assets" / "StarShipV2_original.stl"
AFT_CLEAN = ROOT / "assets" / "flaps_cleaned" / "aft_flap_clean.stl"
FWD_CLEAN = ROOT / "assets" / "flaps_cleaned" / "fwd_flap_clean.stl"
OUT = ROOT / "assets" / "StarShipV2_cleaned_flaps.stl"
PREVIEW = ROOT / "assets" / "flaps_cleaned" / "ship_flaps_preview.png"

BODY_CENTER_X = -22.3
HULL_RADIUS = 10.70
# Hull cylinder wall reaches y=-58; engines hang lower. Aft bottoms sit on this rim.
BODY_BASE_Y = -58.0
FWD_Y_BOTTOM = 31.0  # shoulder (cylinder → ogive)

AFT_SPAN_MM = 27.0
AFT_CHORD_MM = 11.2
FWD_SPAN_MM = 14.0
FWD_CHORD_MM = 9.2
ROOT_EMBED_MM = 1.1


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


def local_hull_radius(hull_verts: np.ndarray, y: float, band: float = 1.25) -> float:
    r = np.hypot(hull_verts[:, 0] - BODY_CENTER_X, hull_verts[:, 2])
    m = np.abs(hull_verts[:, 1] - y) <= band
    if not m.any():
        return HULL_RADIUS
    return float(np.median(r[m]))


def place_flap(
    src: trimesh.Trimesh,
    *,
    side: str,
    y_bottom: float,
    target_chord: float,
    target_span: float,
    root_radius: float,
) -> trimesh.Trimesh:
    """Clean flaps are pre-baked: X=chord (root=0), Y=span (bottom=0), Z=thin."""
    v = src.vertices
    chord0 = float(v[:, 0].max() - v[:, 0].min())
    span0 = float(v[:, 1].max() - v[:, 1].min())
    sx = target_chord / chord0
    sy = target_span / span0
    u = (v[:, 0] - float(v[:, 0].min())) * sx
    vv = (v[:, 1] - float(v[:, 1].min())) * sy
    w = (v[:, 2] - 0.5 * (float(v[:, 2].min()) + float(v[:, 2].max()))) * (
        (sx + sy) * 0.5
    )

    if side == "L":
        root_x = BODY_CENTER_X - root_radius + ROOT_EMBED_MM
        x = root_x - u
        y = y_bottom + vv
        z = w
    else:
        root_x = BODY_CENTER_X + root_radius - ROOT_EMBED_MM
        x = root_x + u
        y = y_bottom + vv
        z = -w

    mesh = trimesh.Trimesh(
        vertices=np.column_stack([x, y, z]), faces=src.faces.copy(), process=False
    )
    trimesh.repair.fix_normals(mesh)
    return mesh


def render_ship_preview(hull: trimesh.Trimesh, flaps: list[trimesh.Trimesh], path: Path) -> None:
    parts = [hull, *flaps]
    size = 720
    img = Image.new("RGB", (size, size), (12, 16, 24))
    draw = ImageDraw.Draw(img)
    all_v = np.vstack([p.vertices for p in parts])
    xmin, xmax = float(all_v[:, 0].min()), float(all_v[:, 0].max())
    ymin, ymax = float(all_v[:, 1].min()), float(all_v[:, 1].max())
    pad = 0.06
    span = max(xmax - xmin, ymax - ymin)
    cx, cy = (xmin + xmax) / 2, (ymin + ymax) / 2

    def P(x, y):
        return (
            int((x - cx) / span * (1 - 2 * pad) * size + size / 2),
            int(-(y - cy) / span * (1 - 2 * pad) * size + size / 2),
        )

    hv, hf = hull.vertices, hull.faces
    order = np.argsort(hv[hf][:, :, 2].mean(1))
    step = max(1, len(order) // 16000)
    for fi in order[::step]:
        tri = hv[hf[fi]]
        z = float(tri[:, 2].mean())
        t = np.clip((z + 11) / 22, 0, 1)
        fill = (int(90 + 100 * t), int(20 + 20 * t), int(18 + 18 * t))
        draw.polygon([P(p[0], p[1]) for p in tri], fill=fill)

    for fl in flaps:
        for f in fl.faces:
            draw.polygon([P(*fl.vertices[j, :2]) for j in f], fill=(100, 170, 255))

    draw.text((12, 12), "flaps · level bottoms · aft on base", fill=(180, 190, 210))
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path)


def main() -> int:
    for path in (ORIG_SRC, AFT_CLEAN, FWD_CLEAN):
        if not path.is_file():
            print(f"missing {path}", file=sys.stderr)
            return 1

    subprocess.check_call([sys.executable, str(ROOT / "scripts" / "strip_flaps.py")], cwd=ROOT)

    hull = trimesh.load_mesh(HULL_SRC, force="mesh")
    aft_src = trimesh.load_mesh(AFT_CLEAN, force="mesh")
    fwd_src = trimesh.load_mesh(FWD_CLEAN, force="mesh")

    print(
        f"aft clean extents={np.round(aft_src.extents, 2)} "
        f"(expect chord,span,thick ≈ chord<span)"
    )
    print(f"fwd clean extents={np.round(fwd_src.extents, 2)}")

    hull_main = max(hull.split(only_watertight=False), key=lambda p: len(p.faces))
    hv = hull_main.vertices

    flaps = []
    for side in ("L", "R"):
        # Aft: cylinder — mid-span radius is fine. Fwd: ogive tapers up, so seat
        # the root using the wider radius at the horizontal bottom to kill the gap.
        aft_r = local_hull_radius(hv, BODY_BASE_Y + 0.5 * AFT_SPAN_MM)
        fwd_r = local_hull_radius(hv, FWD_Y_BOTTOM)
        aft = place_flap(
            aft_src,
            side=side,
            y_bottom=BODY_BASE_Y,
            target_chord=AFT_CHORD_MM,
            target_span=AFT_SPAN_MM,
            root_radius=aft_r,
        )
        fwd = place_flap(
            fwd_src,
            side=side,
            y_bottom=FWD_Y_BOTTOM,
            target_chord=FWD_CHORD_MM,
            target_span=FWD_SPAN_MM,
            root_radius=fwd_r,
        )
        flaps.extend([aft, fwd])
        print(
            f"{side}: aft y=[{aft.bounds[0,1]:.1f},{aft.bounds[1,1]:.1f}] "
            f"x=[{aft.bounds[0,0]:.1f},{aft.bounds[1,0]:.1f}] | "
            f"fwd y=[{fwd.bounds[0,1]:.1f},{fwd.bounds[1,1]:.1f}] "
            f"x=[{fwd.bounds[0,0]:.1f},{fwd.bounds[1,0]:.1f}]"
        )
        # Bottoms must be ground-parallel (constant y)
        for label, m in (("aft", aft), ("fwd", fwd)):
            bot = m.vertices[m.vertices[:, 1] <= m.bounds[0, 1] + 0.25]
            spread = float(bot[:, 1].max() - bot[:, 1].min()) if len(bot) else 0.0
            print(f"  {label} bottom y-spread={spread:.4f} mm")

    assembled = trimesh.util.concatenate([hull, *flaps])
    write_binary_stl(OUT, assembled, b"StarShipV2 Block2 flaps posed + 6 Raptors")
    render_ship_preview(hull, flaps, PREVIEW)
    print(f"wrote {OUT.relative_to(ROOT)} — {len(assembled.faces)} faces")
    print(f"preview {PREVIEW.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
