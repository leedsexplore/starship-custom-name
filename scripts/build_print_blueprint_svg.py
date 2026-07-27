#!/usr/bin/env python3
"""Build a CAD blueprint SVG from assets/print_envelope.json (measured numbers)."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENV = ROOT / "assets/print_envelope.json"
OUT = ROOT / "assets/starship-cad-blueprint.svg"


def main() -> None:
    data = json.loads(ENV.read_text())
    real = data["real_ship"]
    target = data["target_print"]
    mesh = data["customizer_mesh"]
    c1 = mesh["core_one_1_200"]
    bv = target["build_volume_mm"]

    svg = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <rect width="1600" height="900" fill="#f4f7fb"/>
  <defs>
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#d5e0ee" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1600" height="900" fill="url(#grid)"/>
  <text x="40" y="48" font-family="IBM Plex Mono, Menlo, monospace" font-size="28" fill="#0b1c2c" font-weight="700">STARSHIP — CAD / PRINT BLUEPRINT</text>
  <text x="40" y="78" font-family="IBM Plex Mono, Menlo, monospace" font-size="14" fill="#345">Measured envelope · not an official SpaceX drawing</text>

  <!-- Side silhouette (schematic, proportioned to H/D) -->
  <g transform="translate(180,120)">
    <text x="0" y="-16" font-family="IBM Plex Mono, Menlo, monospace" font-size="13" fill="#234">SIDE ELEVATION (schematic)</text>
    <!-- scale: 260.5 mm model → 520 px tall => 2 px/mm -->
    <g transform="translate(80,0)">
      <!-- body -->
      <rect x="55" y="40" width="90" height="400" rx="2" fill="none" stroke="#111" stroke-width="2"/>
      <!-- nose -->
      <path d="M55 40 Q100 0 145 40" fill="none" stroke="#111" stroke-width="2"/>
      <!-- fwd flaps -->
      <path d="M55 70 L20 70 L28 120 L55 120" fill="none" stroke="#111" stroke-width="1.5"/>
      <path d="M145 70 L180 70 L172 120 L145 120" fill="none" stroke="#111" stroke-width="1.5"/>
      <!-- aft flaps -->
      <path d="M55 360 L10 360 L10 430 L55 440" fill="none" stroke="#111" stroke-width="1.5"/>
      <path d="M145 360 L190 360 L190 430 L145 440" fill="none" stroke="#111" stroke-width="1.5"/>
      <!-- skirt (no engines) -->
      <line x1="55" y1="440" x2="145" y2="440" stroke="#111" stroke-width="2"/>
      <text x="100" y="470" text-anchor="middle" font-family="IBM Plex Mono, Menlo, monospace" font-size="11" fill="#444">ENGINES RECESSED — SEE AFT</text>
    </g>
    <!-- height dim -->
    <line x1="20" y1="40" x2="20" y2="440" stroke="#c23" stroke-width="1.5"/>
    <text x="8" y="250" transform="rotate(-90 8 250)" font-family="IBM Plex Mono, Menlo, monospace" font-size="12" fill="#c23">H {c1['height_mm']} mm (1:200 of {real['height_m']} m)</text>
    <!-- diameter -->
    <line x1="135" y1="500" x2="225" y2="500" stroke="#c23" stroke-width="1.5"/>
    <text x="180" y="520" text-anchor="middle" font-family="IBM Plex Mono, Menlo, monospace" font-size="12" fill="#c23">Ø {c1['diameter_mm']} mm mesh · true 1:200 Ø {target['diameter_mm']} mm</text>
  </g>

  <!-- Aft plan schematic -->
  <g transform="translate(620,160)">
    <text x="0" y="-16" font-family="IBM Plex Mono, Menlo, monospace" font-size="13" fill="#234">AFT PLAN (engine layout)</text>
    <circle cx="160" cy="160" r="120" fill="none" stroke="#111" stroke-width="2"/>
    <!-- SL cluster -->
    <circle cx="160" cy="145" r="18" fill="none" stroke="#333" stroke-width="1.5"/>
    <circle cx="145" cy="172" r="18" fill="none" stroke="#333" stroke-width="1.5"/>
    <circle cx="175" cy="172" r="18" fill="none" stroke="#333" stroke-width="1.5"/>
    <text x="160" y="160" text-anchor="middle" font-family="IBM Plex Mono, Menlo, monospace" font-size="10" fill="#333">SL×3</text>
    <!-- RVac -->
    <circle cx="160" cy="255" r="36" fill="none" stroke="#111" stroke-width="1.5"/>
    <circle cx="80" cy="110" r="36" fill="none" stroke="#111" stroke-width="1.5"/>
    <circle cx="240" cy="110" r="36" fill="none" stroke="#111" stroke-width="1.5"/>
    <text x="160" y="310" text-anchor="middle" font-family="IBM Plex Mono, Menlo, monospace" font-size="11" fill="#444">RVac×3 · recessed inside skirt</text>
    <!-- flaps -->
    <rect x="-40" y="140" width="70" height="40" fill="none" stroke="#111" stroke-width="1.5"/>
    <rect x="290" y="140" width="70" height="40" fill="none" stroke="#111" stroke-width="1.5"/>
  </g>

  <!-- CORE One box -->
  <g transform="translate(1100,140)">
    <text x="0" y="-16" font-family="IBM Plex Mono, Menlo, monospace" font-size="13" fill="#234">PRUSA CORE ONE</text>
    <rect x="40" y="20" width="200" height="216" fill="none" stroke="#1a6" stroke-width="2" stroke-dasharray="6 4"/>
    <rect x="117" y="28" width="36" height="200" fill="#ccd5e0" stroke="#111" stroke-width="1"/>
    <text x="140" y="260" text-anchor="middle" font-family="IBM Plex Mono, Menlo, monospace" font-size="11" fill="#1a6">{bv['x_mm']}×{bv['y_mm']}×{bv['z_mm']} mm</text>
    <text x="140" y="280" text-anchor="middle" font-family="IBM Plex Mono, Menlo, monospace" font-size="11" fill="#234">model H {c1['height_mm']} · Z margin {c1['z_margin_mm']} mm</text>
    <text x="140" y="300" text-anchor="middle" font-family="IBM Plex Mono, Menlo, monospace" font-size="11" fill="#234">flaps ~{c1['footprint_max_mm']} mm wide</text>
  </g>

  <!-- title block -->
  <g transform="translate(40,620)">
    <rect x="0" y="0" width="1520" height="240" fill="#fff" stroke="#223" stroke-width="1.5"/>
    <text x="24" y="36" font-family="IBM Plex Mono, Menlo, monospace" font-size="16" font-weight="700" fill="#111">TITLE BLOCK</text>
    <text x="24" y="70" font-family="IBM Plex Mono, Menlo, monospace" font-size="14" fill="#222">Real: {real['variant']} — {real['height_m']} m × Ø{real['diameter_m']} m</text>
    <text x="24" y="98" font-family="IBM Plex Mono, Menlo, monospace" font-size="14" fill="#222">Customizer mesh: {mesh['file']} — H {mesh['height_mm']} mm · Ø {mesh['mid_barrel_diameter_mm']} mm · ≈1:{mesh['implied_real_scale_1_to_N']}</text>
    <text x="24" y="126" font-family="IBM Plex Mono, Menlo, monospace" font-size="14" fill="#222">CORE One 1:200: scale {c1['scale_percent_of_mesh']}% of mesh → H {c1['height_mm']} × Ø {c1['diameter_mm']} mm · engines protrude {mesh['engines_protrude_past_skirt_mm']} mm</text>
    <text x="24" y="154" font-family="IBM Plex Mono, Menlo, monospace" font-size="14" fill="#222">True geometric 1:200 diameter target: Ø {target['diameter_mm']} mm (parametric export). Mesh Ø differs because source aspect ≠ 52.1/9.</text>
    <text x="24" y="182" font-family="IBM Plex Mono, Menlo, monospace" font-size="14" fill="#222">Orientation: {target['orientation']} · Printer: {target['printer']}</text>
    <text x="24" y="210" font-family="IBM Plex Mono, Menlo, monospace" font-size="12" fill="#555">Source of numbers: scripts/measure_ship_mesh.py → assets/print_envelope.json · Parametric: python3 scripts/build_starship_cad.py --export</text>
  </g>
</svg>
"""
    OUT.write_text(svg)
    print(f"Wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
