#!/usr/bin/env python3
"""Extract Starship proportions from a straight-on 2D elevation render.

The flaps are fused to the hull in the silhouette, so they cannot be separated
by flood-filling from the centerline. Instead the barrel diameter is found as
the dominant silhouette width, and any row wider than the hull model at that
height is attributed to flaps. The nose shoulder sits behind the forward flaps,
so it is recovered by fitting a circle to the exposed ogive above them and
extrapolating down to full hull radius.

Output is in meters, scaled so the barrel is 9 m across.
"""

import sys
from collections import Counter
from pathlib import Path

import numpy as np
from PIL import Image

HULL_DIAMETER_M = 9.0
SPEC_HEIGHT_M = 52.1  # published ship height, for comparison
BG_THRESHOLD = 233
SEED_FRAC = 0.09  # top fraction of the height that is unambiguously bare nose
FLAP_MIN_FRAC = 0.10  # overhang past the hull that counts as a flap, not skirt flare


def silhouette(path: Path):
    mask = np.asarray(Image.open(path).convert("L")) < BG_THRESHOLD
    rows, left, right = [], [], []
    for i, r in enumerate(mask):
        c = np.flatnonzero(r)
        if c.size:
            rows.append(i)
            left.append(int(c[0]))
            right.append(int(c[-1]))
    return np.array(rows), np.array(left), np.array(right)


def fit_circle(x, y):
    """Kasa algebraic circle fit. Returns (cx, cy, r)."""
    a = np.column_stack([x, y, np.ones_like(x)])
    b = x**2 + y**2
    sol, *_ = np.linalg.lstsq(a, b, rcond=None)
    cx, cy = sol[0] / 2, sol[1] / 2
    r = np.sqrt(sol[2] + cx**2 + cy**2)
    return cx, cy, r


def contiguous(idx):
    groups = []
    for i in idx:
        if groups and i - groups[-1][-1] <= 4:
            groups[-1].append(i)
        else:
            groups.append([i])
    return groups


def main(path: Path) -> None:
    rows, left, right = silhouette(path)
    span = right - left + 1
    top, bottom = rows[0], rows[-1]
    height_px = bottom - top + 1
    cx = float(np.median((left + right) / 2))

    barrel_px = Counter(span[span > 0.4 * span.max()]).most_common(1)[0][0]
    m_per_px = HULL_DIAMETER_M / barrel_px
    to_m = lambda px: px * m_per_px  # noqa: E731

    # The longest stretch of exactly-barrel-width silhouette is bare hull with
    # no flaps in the outline. Its top edge is the nose shoulder; the forward
    # flaps sit above it and the aft flaps below.
    clean = np.flatnonzero(np.abs(span - barrel_px) <= 2)
    barrel_run = max(contiguous(rows[clean]), key=len)
    shoulder_row = float(barrel_run[0])
    nose_px = shoulder_row - top

    # A tangent ogive is fully determined by nose length and base radius, which
    # we now have directly, so no extrapolated circle fit is needed.
    hull_r_px = barrel_px / 2
    orad = (hull_r_px**2 + nose_px**2) / (2 * hull_r_px)

    def ogive_half(row):
        z = np.clip(shoulder_row - row, 0, nose_px)  # 0 at shoulder, nose_px at tip
        return np.sqrt(np.clip(orad**2 - z**2, 0, None)) - (orad - hull_r_px)

    hull_half = np.where(rows < shoulder_row, ogive_half(rows), hull_r_px)

    # Sanity check the ogive against the part of the nose nothing else occludes.
    seed = (rows > top + 0.01 * height_px) & (rows < top + SEED_FRAC * height_px)
    resid = right[seed] - (cx + hull_half[seed])
    nose_rms = float(np.sqrt(np.mean(resid**2)))

    overhang = span - 2 * hull_half
    flap_rows = np.flatnonzero(overhang > FLAP_MIN_FRAC * barrel_px)
    groups = [g for g in contiguous(rows[flap_rows]) if len(g) > 0.02 * height_px]

    print(f"source           : {path.name}")
    print(f"hull diameter    : {barrel_px} px -> {HULL_DIAMETER_M} m "
          f"({m_per_px:.5f} m/px)")
    print(f"drawn height     : {to_m(height_px):6.2f} m   fineness L/D "
          f"{to_m(height_px) / HULL_DIAMETER_M:.2f}")
    print(f"spec height      : {SPEC_HEIGHT_M:6.2f} m   fineness L/D "
          f"{SPEC_HEIGHT_M / HULL_DIAMETER_M:.2f}")
    print(f"  -> drawing is {to_m(height_px) / SPEC_HEIGHT_M * 100:.1f}% of spec height")
    print()
    print(f"nose ogive radius: {to_m(orad):6.2f} m  (tangent ogive)")
    print(f"nose length      : {to_m(nose_px):6.2f} m "
          f"({nose_px / height_px * 100:.1f}% of height)")
    print(f"  fit vs drawing : {nose_rms:.1f} px RMS on the exposed nose")
    print(f"barrel + skirt   : {to_m(bottom - shoulder_row):6.2f} m")
    print()

    names = ("forward flap", "aft flap")
    for name, g in zip(names, groups):
        g_top, g_bot = g[0], g[-1]
        sel = (rows >= g_top) & (rows <= g_bot)
        print(f"{name}:")
        print(f"  rows              : {g_top}..{g_bot}")
        print(f"  base of flap      : {to_m(bottom - g_bot):6.2f} m above base")
        print(f"  top of flap       : {to_m(bottom - g_top):6.2f} m above base")
        print(f"  vertical span     : {to_m(g_bot - g_top):6.2f} m")
        print(f"  chord past hull   : {to_m(overhang[sel].max() / 2):6.2f} m per side")
        print(f"  tip-to-tip        : {to_m(span[sel].max()):6.2f} m")
        print()

    flare = (rows > groups[-1][-1]) & (span > barrel_px + 2)
    if flare.any():
        print(f"aft skirt flare  : {to_m(bottom - rows[flare][0]):6.2f} m tall, "
              f"{to_m(span[flare].max()):.2f} m across "
              f"(+{to_m(span[flare].max() - barrel_px):.2f} m over hull)")

    if len(groups) != 2:
        print(f"note: found {len(groups)} flap groups, expected 2", file=sys.stderr)


if __name__ == "__main__":
    default = (
        Path.home()
        / ".cursor/projects/Users-leedsexplore-Projects-starship-custom-name"
        / "assets/starship-2d-elevation-leeward-clean.png"
    )
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else default)
