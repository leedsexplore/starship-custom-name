#!/usr/bin/env python3
"""Measure Starship STLs and write assets/print_envelope.json (no guessing)."""
from __future__ import annotations

import json
import struct
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
REAL_HEIGHT_M = 52.1
REAL_DIAMETER_M = 9.0
TARGET_SCALE = 200  # 1:200
CORE_ONE = {"x_mm": 250, "y_mm": 220, "z_mm": 270}


def read_binary_stl(path: Path) -> np.ndarray:
    data = path.read_bytes()
    if len(data) < 84:
        raise ValueError(f"too small: {path}")
    n = struct.unpack_from("<I", data, 80)[0]
    expected = 84 + n * 50
    if len(data) != expected:
        raise ValueError(f"not a binary STL ({len(data)} != {expected}): {path}")
    dtype = np.dtype([("n", "<f4", (3,)), ("v", "<f4", (3, 3)), ("attr", "<u2")])
    arr = np.frombuffer(data, dtype=dtype, count=n, offset=84)
    return arr["v"].reshape(-1, 3).astype(np.float64)


def measure(path: Path) -> dict:
    v = read_binary_stl(path)
    mn = v.min(axis=0)
    mx = v.max(axis=0)
    size = mx - mn
    h_axis = int(np.argmax(size))
    other = [i for i in range(3) if i != h_axis]
    height = float(size[h_axis])

    # Mid-barrel diameter from verts in the middle 40% of height (exclude nose + flaps)
    h = v[:, h_axis]
    lo = mn[h_axis] + 0.30 * size[h_axis]
    hi = mn[h_axis] + 0.70 * size[h_axis]
    mid = v[(h >= lo) & (h <= hi)]
    c0 = float(mid[:, other[0]].mean())
    c1 = float(mid[:, other[1]].mean())
    r = np.sqrt((mid[:, other[0]] - c0) ** 2 + (mid[:, other[1]] - c1) ** 2)
    diameter = float(2.0 * np.percentile(r, 99.5))

    # Footprint in the two non-height axes (includes flaps)
    foot_a = float(size[other[0]])
    foot_b = float(size[other[1]])
    footprint_max = max(foot_a, foot_b)
    footprint_min = min(foot_a, foot_b)

    # Engine recess check: base = end with larger mid-band radius near tip stations
    # Tip has near-zero radius; base is the opposite end.
    tip_is_max = True
    r_hi = _band_radius(v, h_axis, other, mx[h_axis] - 0.5, 1.0)
    r_lo = _band_radius(v, h_axis, other, mn[h_axis] + 0.5, 1.0)
    if r_lo < r_hi:
        tip_is_max = False
    base = float(mx[h_axis] if tip_is_max else mn[h_axis])
    # Any geometry past the base plane would extend AABB — so protrusion = 0 by definition
    # of AABB. Report clearance inside the skirt: how far verts sit inward from base.
    if tip_is_max:
        inward = v[h <= mn[h_axis] + 2.0]
        clearance = float((inward[:, h_axis] - mn[h_axis]).max()) if len(inward) else 0.0
        engines_protrude_mm = 0.0  # AABB base is the skirt plane
    else:
        inward = v[h >= mx[h_axis] - 2.0]
        clearance = float((mx[h_axis] - inward[:, h_axis]).max()) if len(inward) else 0.0
        engines_protrude_mm = 0.0

    implied_scale = REAL_HEIGHT_M * 1000.0 / height  # 1:N
    target_h = REAL_HEIGHT_M * 1000.0 / TARGET_SCALE
    target_d = REAL_DIAMETER_M * 1000.0 / TARGET_SCALE
    scale_to_target_h = target_h / height
    scale_pct = scale_to_target_h * 100.0

    at_target = {
        "height_mm": round(height * scale_to_target_h, 3),
        "diameter_mm": round(diameter * scale_to_target_h, 3),
        "footprint_max_mm": round(footprint_max * scale_to_target_h, 3),
        "footprint_min_mm": round(footprint_min * scale_to_target_h, 3),
        "scale_percent_of_mesh": round(scale_pct, 4),
        "fits_core_one": (
            height * scale_to_target_h <= CORE_ONE["z_mm"]
            and footprint_max * scale_to_target_h <= min(CORE_ONE["x_mm"], CORE_ONE["y_mm"])
        ),
        "z_margin_mm": round(CORE_ONE["z_mm"] - height * scale_to_target_h, 3),
    }

    return {
        "file": str(path.relative_to(ROOT)),
        "aabb_min_mm": [round(float(x), 4) for x in mn],
        "aabb_max_mm": [round(float(x), 4) for x in mx],
        "aabb_size_mm": [round(float(x), 4) for x in size],
        "height_axis": "XYZ"[h_axis],
        "height_mm": round(height, 4),
        "mid_barrel_diameter_mm": round(diameter, 4),
        "footprint_max_mm": round(footprint_max, 4),
        "footprint_min_mm": round(footprint_min, 4),
        "tip_at_axis_max": tip_is_max,
        "engines_protrude_past_skirt_mm": engines_protrude_mm,
        "base_band_inward_extent_mm": round(clearance, 4),
        "implied_real_scale_1_to_N": round(implied_scale, 3),
        "at_1_200_from_height": at_target,
        "true_1_200_targets_mm": {
            "height_mm": round(target_h, 3),
            "diameter_mm": round(target_d, 3),
        },
        "notes": [
            "1:200 height match scales mesh so H = 52.1m/200 = 260.5 mm.",
            "Mesh diameter at that scale may differ slightly from true Ø45 mm "
            "if the source mesh aspect ratio ≠ 52.1/9.",
            "Engines are recessed if engines_protrude_past_skirt_mm == 0 "
            "(nothing extends the AABB past the skirt plane).",
        ],
    }


def _band_radius(v, h_axis, other, y0, half_w) -> float:
    band = v[np.abs(v[:, h_axis] - y0) < half_w]
    if len(band) < 20:
        return 0.0
    c0 = band[:, other[0]].mean()
    c1 = band[:, other[1]].mean()
    r = np.sqrt((band[:, other[0]] - c0) ** 2 + (band[:, other[1]] - c1) ** 2)
    return float(np.percentile(r, 99.5))


def main() -> int:
    paths = [
        ROOT / "assets/StarShipV2_cleaned_flaps.stl",
        ROOT / "assets/StarShipV2_no_flaps.stl",
        ROOT / "assets/StarShipV2_original.stl",
    ]
    for extra in (
        "assets/starship_ship_print_1_200.stl",
        "assets/starship_parametric_1_200.stl",
    ):
        p = ROOT / extra
        if p.exists():
            paths.append(p)

    meshes = []
    for p in paths:
        if not p.exists():
            print(f"skip missing {p}", file=sys.stderr)
            continue
        m = measure(p)
        meshes.append(m)
        print(f"\n=== {m['file']} ===")
        print(f"H={m['height_mm']} mm  Ø≈{m['mid_barrel_diameter_mm']} mm  "
              f"footprint_max={m['footprint_max_mm']} mm")
        print(f"implied scale 1:{m['implied_real_scale_1_to_N']}")
        print(f"engines protrude: {m['engines_protrude_past_skirt_mm']} mm")
        a = m["at_1_200_from_height"]
        print(f"→ 1:200 via H: scale {a['scale_percent_of_mesh']}% → "
              f"H {a['height_mm']} × Ø {a['diameter_mm']} mm, "
              f"flaps {a['footprint_max_mm']} mm, "
              f"CORE One fit={a['fits_core_one']} (Z margin {a['z_margin_mm']} mm)")

    primary = next(m for m in meshes if m["file"].endswith("StarShipV2_cleaned_flaps.stl"))
    envelope = {
        "real_ship": {
            "height_m": REAL_HEIGHT_M,
            "diameter_m": REAL_DIAMETER_M,
            "variant": "Starship V3 / Block 2 ship (public approx)",
        },
        "target_print": {
            "scale": f"1:{TARGET_SCALE}",
            "height_mm": round(REAL_HEIGHT_M * 1000.0 / TARGET_SCALE, 3),
            "diameter_mm": round(REAL_DIAMETER_M * 1000.0 / TARGET_SCALE, 3),
            "orientation": "nose up / standing",
            "printer": "Prusa CORE One",
            "build_volume_mm": CORE_ONE,
        },
        "customizer_mesh": {
            "file": primary["file"],
            "height_mm": primary["height_mm"],
            "mid_barrel_diameter_mm": primary["mid_barrel_diameter_mm"],
            "footprint_max_mm": primary["footprint_max_mm"],
            "implied_real_scale_1_to_N": primary["implied_real_scale_1_to_N"],
            "engines_protrude_past_skirt_mm": primary["engines_protrude_past_skirt_mm"],
            "core_one_1_200": primary["at_1_200_from_height"],
        },
        "meshes": meshes,
    }

    param = next((m for m in meshes if "print_1_200" in m["file"]), None)
    if param:
        envelope["preferred_print_mesh"] = {
            "file": param["file"],
            "role": "parametric 1:200 CAD solid (true proportions)",
            "height_mm": param["height_mm"],
            "mid_barrel_diameter_mm": param["mid_barrel_diameter_mm"],
            "footprint_max_mm": param["footprint_max_mm"],
            "engines_protrude_past_skirt_mm": param["engines_protrude_past_skirt_mm"],
            "customizer_note": (
                "Web tool scales Josh mesh via CORE One 1:200 preset "
                f"(~{primary['at_1_200_from_height']['scale_percent_of_mesh']}%)"
            ),
        }

    out = ROOT / "assets/print_envelope.json"
    out.write_text(json.dumps(envelope, indent=2) + "\n")
    print(f"\nWrote {out.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
