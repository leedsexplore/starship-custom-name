#!/usr/bin/env python3
"""Optional matplotlib gallery renders from the hex STL (experimental).

Prefer lit customizer / OpenSCAD screenshots for Printables gallery images —
this script is a fallback when you only have the STL. Writes:
  03-heat-shield-side.png, 05-hex-tiles-closeup.png
"""

from __future__ import annotations

import argparse
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import trimesh
from mpl_toolkits.mplot3d.art3d import Poly3DCollection

ROOT = Path(__file__).resolve().parents[1]
STL = ROOT / "assets" / "starship_ship_print_1_200_hex.stl"
OUT = ROOT / "printables" / "starship-parametric" / "images"


def _load_faces(path: Path, max_faces: int = 180_000):
    mesh = trimesh.load_mesh(path, force="mesh")
    faces = mesh.faces
    if len(faces) > max_faces:
        rng = np.random.default_rng(0)
        faces = faces[rng.choice(len(faces), max_faces, replace=False)]
    tris = mesh.vertices[faces]
    # Color by outward-ish radius: darker = tiles-ish (larger r), lighter = steel.
    centers = tris.mean(axis=1)
    r = np.hypot(centers[:, 0], centers[:, 1])
    r_n = (r - r.min()) / max(float(np.ptp(r)), 1e-6)
    colors = np.zeros((len(tris), 4))
    # blend steel grey → heat-shield charcoal by radius
    steel = np.array([0.72, 0.75, 0.80])
    tile = np.array([0.12, 0.13, 0.15])
    colors[:, :3] = steel * (1 - r_n)[:, None] + tile * r_n[:, None]
    colors[:, 3] = 1.0
    return tris, colors, mesh.bounds


def _render(tris, colors, bounds, *, elev, azim, xlim=None, ylim=None, zlim=None, out: Path, dpi=160):
    fig = plt.figure(figsize=(8, 10), facecolor="#0b0d12")
    ax = fig.add_subplot(111, projection="3d", computed_zorder=False)
    ax.set_facecolor("#0b0d12")
    coll = Poly3DCollection(tris, linewidths=0.0)
    coll.set_facecolors(colors)
    ax.add_collection3d(coll)
    mn, mx = bounds
    ax.set_xlim(*(xlim or (mn[0], mx[0])))
    ax.set_ylim(*(ylim or (mn[1], mx[1])))
    ax.set_zlim(*(zlim or (mn[2], mx[2])))
    # Equal aspect
    spans = np.array(
        [
            (xlim or (mn[0], mx[0]))[1] - (xlim or (mn[0], mx[0]))[0],
            (ylim or (mn[1], mx[1]))[1] - (ylim or (mn[1], mx[1]))[0],
            (zlim or (mn[2], mx[2]))[1] - (zlim or (mn[2], mx[2]))[0],
        ]
    )
    ax.set_box_aspect(spans)
    ax.view_init(elev=elev, azim=azim)
    ax.set_axis_off()
    ax.set_proj_type("ortho")
    fig.tight_layout(pad=0)
    out.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out, dpi=dpi, facecolor=fig.get_facecolor(), bbox_inches="tight", pad_inches=0.05)
    plt.close(fig)
    print(f"wrote {out.relative_to(ROOT)}  {out.stat().st_size / 1024:.0f} KB")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--all", action="store_true", help="also refresh steel-side + engine-bay")
    args = ap.parse_args()
    if not STL.exists():
        raise SystemExit(f"missing {STL}")
    print(f"loading {STL.name}…")
    tris, colors, bounds = _load_faces(STL)
    mn, mx = bounds
    mid_z = 0.5 * (mn[2] + mx[2])

    # Windward (tiles face camera): +X toward viewer → azim looking from +X
    _render(
        tris,
        colors,
        bounds,
        elev=8,
        azim=0,
        out=OUT / "03-heat-shield-side.png",
    )

    # Mid-barrel close-up on windward tiles
    _render(
        tris,
        colors,
        bounds,
        elev=5,
        azim=10,
        xlim=(mn[0] + 8, mx[0] + 2),
        ylim=(-18, 18),
        zlim=(mid_z - 35, mid_z + 35),
        out=OUT / "05-hex-tiles-closeup.png",
        dpi=180,
    )

    if args.all:
        _render(tris, colors, bounds, elev=8, azim=180, out=OUT / "02-steel-side.png")
        _render(
            tris,
            colors,
            bounds,
            elev=-25,
            azim=35,
            zlim=(mn[2] - 2, mn[2] + 55),
            out=OUT / "04-engine-bay.png",
        )


if __name__ == "__main__":
    main()
