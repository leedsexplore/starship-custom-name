#!/usr/bin/env python3
"""Build assets/flap_placement_sketch.html from cleaned flap STLs + no-flaps hull."""
from __future__ import annotations

from pathlib import Path

import numpy as np
import trimesh
from shapely.geometry import Polygon
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "flap_placement_sketch.html"
HULL_SRC = ROOT / "assets" / "StarShipV2_no_flaps.stl"
FWD_STL = ROOT / "assets" / "flaps_cleaned" / "fwd_flap_clean.stl"
AFT_STL = ROOT / "assets" / "flaps_cleaned" / "aft_flap_clean.stl"

BODY_CENTER_X = -22.3
HULL_RADIUS = 10.70
BODY_BASE_Y = -58.0
SHOULDER_Y = 38.0

# Pose on hull (mm) — fwd raised so top sits at/above shoulder
AFT_SPAN_MM = 27.0
AFT_CHORD_MM = 11.2
FWD_SPAN_MM = 14.0
FWD_CHORD_MM = 9.2
FWD_Y_BOTTOM = 38.0
AFT_Y_BOTTOM = BODY_BASE_Y


def to_svg(
    x: float,
    y: float,
    *,
    mx0: float = -48,
    mx1: float = 4,
    my0: float = -64,
    my1: float = 62,
    sx0: float = 50,
    sx1: float = 370,
    sy0: float = 610,
    sy1: float = 50,
) -> tuple[float, float]:
    sx = sx0 + (x - mx0) / (mx1 - mx0) * (sx1 - sx0)
    sy = sy0 + (y - my0) / (my1 - my0) * (sy1 - sy0)
    return float(sx), float(sy)


def pts_attr(pts: list[tuple[float, float]]) -> str:
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)


def path_d(pts: list[tuple[float, float]], close: bool = True) -> str:
    if not pts:
        return ""
    parts = [f"M {pts[0][0]:.1f} {pts[0][1]:.1f}"]
    for x, y in pts[1:]:
        parts.append(f"L {x:.1f} {y:.1f}")
    if close:
        parts.append("Z")
    return " ".join(parts)


def smooth(seq: list[tuple[float, float]], k: int = 3) -> list[tuple[float, float]]:
    if len(seq) < k * 2:
        return seq
    out = []
    for i in range(len(seq)):
        lo, hi = max(0, i - k), min(len(seq), i + k + 1)
        xs = [p[0] for p in seq[lo:hi]]
        out.append((sum(xs) / len(xs), seq[i][1]))
    return out


def planform_coords(path: Path) -> np.ndarray:
    mesh = trimesh.load_mesh(path, force="mesh")
    flat = np.abs(mesh.face_normals[:, 2]) > 0.7
    if int(flat.sum()) < 1:
        flat = np.ones(len(mesh.faces), dtype=bool)
    polys = [Polygon(mesh.vertices[f, :2]) for f in mesh.faces[flat]]
    union = unary_union(polys)
    if union.geom_type == "MultiPolygon":
        union = max(union.geoms, key=lambda g: g.area)
    simple = union.simplify(0.1, preserve_topology=True)
    return np.asarray(simple.exterior.coords, float)


def posed_flap(
    path: Path,
    *,
    chord_mm: float,
    span_mm: float,
    root_x: float,
    y_bottom: float,
    side: str,
) -> list[tuple[float, float]]:
    coords = planform_coords(path)
    u0, v0 = float(coords[:, 0].min()), float(coords[:, 1].min())
    w = float(coords[:, 0].max() - u0)
    h = float(coords[:, 1].max() - v0)
    sx, sy = chord_mm / w, span_mm / h
    out = []
    for uu, vv in coords:
        u = (uu - u0) * sx
        v = (vv - v0) * sy
        x = root_x - u if side == "L" else root_x + u
        out.append(to_svg(x, y_bottom + v))
    return out


def inset_poly(coords: np.ndarray, ox: float, oy: float, scale: float) -> list[tuple[float, float]]:
    u0, v0 = float(coords[:, 0].min()), float(coords[:, 1].min())
    pts = []
    for uu, vv in coords:
        pts.append((ox + (uu - u0) * scale, oy - (vv - v0) * scale))
    return pts


def hull_sides(mesh: trimesh.Trimesh):
    v = mesh.vertices
    ys = np.linspace(float(v[:, 1].min()), float(v[:, 1].max()), 140)
    left, right = [], []
    dy = ys[1] - ys[0]
    for y in ys:
        sl = v[np.abs(v[:, 1] - y) <= dy * 0.55]
        if len(sl) < 2:
            continue
        if y < -56.5:
            left.append((float(sl[:, 0].min()), float(y)))
            right.append((float(sl[:, 0].max()), float(y)))
        else:
            near = sl[np.abs(sl[:, 2]) < 2.8]
            use = near if len(near) >= 4 else sl
            left.append((float(use[:, 0].min()), float(y)))
            right.append((float(use[:, 0].max()), float(y)))
    return smooth(left), smooth(right)


def main() -> int:
    for p in (HULL_SRC, FWD_STL, AFT_STL):
        if not p.is_file():
            raise SystemExit(f"missing {p}")

    hull = trimesh.load_mesh(HULL_SRC, force="mesh")
    main_body = max(hull.split(only_watertight=False), key=lambda p: len(p.faces))
    left, right = hull_sides(main_body)

    hull_poly = [to_svg(x, y) for x, y in left] + [
        to_svg(x, y) for x, y in reversed(right)
    ]
    wind = [to_svg(x, y) for x, y in left] + [
        to_svg(BODY_CENTER_X, left[-1][1]),
        to_svg(BODY_CENTER_X, left[0][1]),
    ]

    root_l = BODY_CENTER_X - HULL_RADIUS
    root_r = BODY_CENTER_X + HULL_RADIUS
    aft_l = posed_flap(
        AFT_STL,
        chord_mm=AFT_CHORD_MM,
        span_mm=AFT_SPAN_MM,
        root_x=root_l,
        y_bottom=AFT_Y_BOTTOM,
        side="L",
    )
    aft_r = posed_flap(
        AFT_STL,
        chord_mm=AFT_CHORD_MM,
        span_mm=AFT_SPAN_MM,
        root_x=root_r,
        y_bottom=AFT_Y_BOTTOM,
        side="R",
    )
    fwd_l = posed_flap(
        FWD_STL,
        chord_mm=FWD_CHORD_MM,
        span_mm=FWD_SPAN_MM,
        root_x=root_l,
        y_bottom=FWD_Y_BOTTOM,
        side="L",
    )
    fwd_r = posed_flap(
        FWD_STL,
        chord_mm=FWD_CHORD_MM,
        span_mm=FWD_SPAN_MM,
        root_x=root_r,
        y_bottom=FWD_Y_BOTTOM,
        side="R",
    )

    eng = []
    for ang_deg, r in (
        (90, 3.1),
        (210, 3.1),
        (330, 3.1),
        (30, 7.0),
        (150, 7.0),
        (270, 7.0),
    ):
        a = np.radians(ang_deg)
        ex = BODY_CENTER_X + r * np.cos(a)
        sx, sy = to_svg(ex, -61.2)
        eng.append((sx, sy, 9 if r < 4 else 11))

    base_y = to_svg(BODY_CENTER_X, BODY_BASE_Y)[1]
    shoulder_y = to_svg(BODY_CENTER_X, SHOULDER_Y)[1]
    cx_svg = to_svg(BODY_CENTER_X, 0)[0]

    fwd_c = planform_coords(FWD_STL)
    aft_c = planform_coords(AFT_STL)
    # Insets on the right margin so they don't cover outboard flaps
    fwd_inset = inset_poly(fwd_c, 318, 210, 1.55)
    aft_inset = inset_poly(aft_c, 318, 430, 1.25)

    eng_svg = "".join(
        f'<ellipse cx="{ex:.1f}" cy="{ey:.1f}" rx="{rx}" ry="7"/>' for ex, ey, rx in eng
    )

    doc = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Starship flap placement — 2D sketch (from cleaned STLs)</title>
  <style>
    :root {{
      --bg: #0b0f14; --panel: #141a22; --ink: #e8edf4; --muted: #9aa6b5; --flap: #5eb0ff;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      font: 15px/1.45 "IBM Plex Sans", "Segoe UI", sans-serif;
      color: var(--ink);
      background: var(--bg);
    }}
    header {{ padding: 1.2rem 1.5rem 0.4rem; max-width: 1200px; margin: 0 auto; }}
    header h1 {{
      font: 600 1.3rem/1.2 "IBM Plex Sans", sans-serif;
      margin: 0 0 0.35rem;
    }}
    header p {{ margin: 0; color: var(--muted); max-width: 72ch; }}
    .grid {{
      display: grid;
      grid-template-columns: 1fr 1.05fr;
      gap: 1rem;
      max-width: 1200px;
      margin: 1rem auto 2rem;
      padding: 0 1.5rem;
    }}
    @media (max-width: 900px) {{ .grid {{ grid-template-columns: 1fr; }} }}
    figure {{
      margin: 0;
      background: var(--panel);
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid #2a3340;
    }}
    figure .label {{
      padding: 0.65rem 0.9rem;
      font-size: 0.78rem;
      letter-spacing: 0.03em;
      color: var(--muted);
      border-bottom: 1px solid #2a3340;
      text-transform: uppercase;
    }}
    figure img {{
      display: block;
      width: 100%;
      height: auto;
      max-height: 640px;
      object-fit: contain;
      background: #111820;
    }}
    figure svg {{ display: block; width: 100%; height: auto; background: #0e141c; }}
    .notes {{
      max-width: 1200px;
      margin: 0 auto 2.5rem;
      padding: 0 1.5rem;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }}
    @media (max-width: 900px) {{ .notes {{ grid-template-columns: 1fr; }} }}
    .card {{
      background: var(--panel);
      border: 1px solid #2a3340;
      border-radius: 10px;
      padding: 1rem 1.1rem;
    }}
    .card h2 {{ margin: 0 0 0.45rem; font-size: 0.95rem; color: var(--flap); }}
    .card ul {{ margin: 0; padding-left: 1.15rem; color: var(--muted); }}
    .card li {{ margin: 0.28rem 0; }}
    .card strong {{ color: var(--ink); }}
    .card code {{ color: #cfe8ff; font-size: 0.86em; }}
    .banner {{ max-width: 1200px; margin: 0 auto 1rem; padding: 0 1.5rem; }}
    .banner > div {{
      border-radius: 10px;
      padding: 0.85rem 1.1rem;
      border: 1px solid #2e4a3a;
      background: #142019;
      color: #9fd6b4;
    }}
  </style>
</head>
<body>
  <header>
    <h1>2D flap placement — from cleaned flap STLs</h1>
    <p>
      Flap silhouettes are the true planforms of
      <code>fwd_flap_clean.stl</code> / <code>aft_flap_clean.stl</code>,
      scaled and posed on a hull outline sampled from
      <code>StarShipV2_no_flaps.stl</code>. Forward flaps raised. Confirm before 3D.
    </p>
  </header>

  <div class="banner"><div>
    Kept sources:
    <code>assets/flaps_cleaned/*_flap_clean.stl</code>,
    <code>preview.html</code>, <code>README.md</code>,
    <code>scripts/build_cleaned_flaps.py</code>, <code>scripts/stl_util.py</code>
  </div></div>

  <div class="grid">
    <figure>
      <div class="label">1 · Reference photo</div>
      <img src="./starship_flaps_reference.png" alt="Real Starship flap reference" />
    </figure>
    <figure>
      <div class="label">2 · Proposed placement (planforms from cleaned STLs)</div>
      <svg viewBox="0 0 420 660" xmlns="http://www.w3.org/2000/svg" role="img">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#152032"/>
            <stop offset="100%" stop-color="#0e141c"/>
          </linearGradient>
          <pattern id="tiles" width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M6 0H0V6" fill="none" stroke="#3a4048" stroke-width="0.6"/>
          </pattern>
        </defs>
        <rect width="420" height="660" fill="url(#sky)"/>

        <line x1="40" y1="{base_y:.1f}" x2="300" y2="{base_y:.1f}" stroke="#4a5563" stroke-width="1" stroke-dasharray="5 4"/>
        <text x="48" y="{base_y - 6:.1f}" fill="#8b97a6" font-size="10" font-family="IBM Plex Sans, sans-serif">hull base rim · aft bottoms</text>

        <line x1="40" y1="{shoulder_y:.1f}" x2="300" y2="{shoulder_y:.1f}" stroke="#5a6572" stroke-width="1" stroke-dasharray="3 3"/>
        <text x="210" y="{shoulder_y - 5:.1f}" fill="#8b97a6" font-size="10" font-family="IBM Plex Sans, sans-serif">shoulder</text>

        <g fill="#1a2028" stroke="#6a7380" stroke-width="1">{eng_svg}</g>

        <path d="{path_d(hull_poly)}" fill="#9aa3ad" stroke="#d0d6dc" stroke-width="1.2"/>
        <path d="{path_d(wind)}" fill="#2c3036"/>
        <path d="{path_d(wind)}" fill="url(#tiles)" opacity="0.55"/>
        <path d="{path_d(hull_poly)}" fill="none" stroke="#e2e7ec" stroke-width="1.1"/>
        <line x1="{cx_svg:.1f}" y1="55" x2="{cx_svg:.1f}" y2="{base_y:.1f}" stroke="#6b7785" stroke-width="0.8" stroke-dasharray="2 4"/>

        <g fill="#5eb0ff" fill-opacity="0.93" stroke="#b9deff" stroke-width="1.15">
          <polygon points="{pts_attr(aft_l)}"/>
          <polygon points="{pts_attr(aft_r)}"/>
          <polygon points="{pts_attr(fwd_l)}"/>
          <polygon points="{pts_attr(fwd_r)}"/>
        </g>

        <g font-family="IBM Plex Sans, sans-serif" font-size="11" fill="#c5ced8">
          <text x="48" y="36">Planforms = cleaned flap STLs</text>
          <text x="48" y="52" fill="#9aa6b5">fwd raised · y={FWD_Y_BOTTOM:.0f} → {FWD_Y_BOTTOM + FWD_SPAN_MM:.0f}</text>
          <text x="48" y="68" fill="#9aa6b5">aft on rim · y={AFT_Y_BOTTOM:.0f} → {AFT_Y_BOTTOM + AFT_SPAN_MM:.0f}</text>
        </g>
        <text x="48" y="{to_svg(root_l - FWD_CHORD_MM, FWD_Y_BOTTOM)[1] + 14:.1f}" fill="#9fd0ff" font-size="11" font-family="IBM Plex Sans, sans-serif">fwd_flap_clean</text>
        <text x="48" y="{base_y + 16:.1f}" fill="#9fd0ff" font-size="11" font-family="IBM Plex Sans, sans-serif">aft_flap_clean</text>

        <g font-family="IBM Plex Sans, sans-serif">
          <text x="312" y="120" fill="#8b97a6" font-size="10">STL planforms</text>
          <polygon points="{pts_attr(fwd_inset)}" fill="#1a3040" stroke="#5eb0ff" stroke-width="1.2"/>
          <text x="312" y="220" fill="#8b97a6" font-size="9">fwd_flap_clean</text>
          <polygon points="{pts_attr(aft_inset)}" fill="#1a3040" stroke="#5eb0ff" stroke-width="1.2"/>
          <text x="312" y="445" fill="#8b97a6" font-size="9">aft_flap_clean</text>
        </g>
      </svg>
    </figure>
  </div>

  <div class="notes">
    <div class="card">
      <h2>Flap files used (kept)</h2>
      <ul>
        <li><code>assets/flaps_cleaned/fwd_flap_clean.stl</code></li>
        <li><code>assets/flaps_cleaned/aft_flap_clean.stl</code></li>
        <li><code>preview.html</code> · <code>README.md</code></li>
        <li><code>scripts/build_cleaned_flaps.py</code> · <code>scripts/stl_util.py</code></li>
      </ul>
    </div>
    <div class="card">
      <h2>Placement on hull</h2>
      <ul>
        <li><strong>Fwd:</strong> raised — bottom y={FWD_Y_BOTTOM:.0f}, span {FWD_SPAN_MM:.0f} mm (top ≈{FWD_Y_BOTTOM + FWD_SPAN_MM:.0f})</li>
        <li><strong>Aft:</strong> bottom on base rim y={AFT_Y_BOTTOM:.0f}, span {AFT_SPAN_MM:.0f} mm</li>
        <li><strong>Hull:</strong> silhouette + engines from <code>StarShipV2_no_flaps.stl</code>; windward tiles / leeward steel</li>
      </ul>
    </div>
    <div class="card">
      <h2>Confirm before 3D</h2>
      <ul>
        <li>Fwd height / size OK?</li>
        <li>Note: current <code>aft_flap_clean.stl</code> planform is a near-rectangle — keep or restore swept tip in the clean solid first?</li>
        <li>Chord/span mm feel right vs the photo?</li>
      </ul>
    </div>
    <div class="card">
      <h2>Regenerate this sketch</h2>
      <ul>
        <li><code>python3 scripts/build_flap_placement_sketch.py</code></li>
        <li>Open <code>assets/flap_placement_sketch.html</code></li>
      </ul>
    </div>
  </div>
</body>
</html>
"""
    OUT.write_text(doc)
    print(f"wrote {OUT.relative_to(ROOT)}")
    print(f"fwd y={FWD_Y_BOTTOM:.1f} → {FWD_Y_BOTTOM + FWD_SPAN_MM:.1f}")
    print(f"aft y={AFT_Y_BOTTOM:.1f} → {AFT_Y_BOTTOM + AFT_SPAN_MM:.1f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
