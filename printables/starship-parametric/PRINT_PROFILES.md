# Ready-to-slice settings — Starship hex one-piece

Canonical: https://www.printables.com/model/1792868  
Customizer: https://leedsexplore.github.io/starship-custom-name/

## Which file?

| Want | Download |
|------|----------|
| Hero desk print (CORE One / MK4 / P1S) | `starship_1_200_hex_tiles_one_piece.stl` (H 260.5 mm) |
| Two-color MMU / AMS | `starship_1_200_hex_tiles_mmu.3mf` |
| A1 mini / short Z | `starship_1_300_hex_tiles_one_piece.stl` (H ≈ 174 mm) |
| Custom name + hex tiles | Customizer → Raised → **Download STL** (hex on) |

## Recommended (all printers)

| Setting | Value |
|--------|--------|
| Orientation | Nose up · engines on bed |
| Supports | **Forward flaps only** — never “Everywhere” |
| Layer height | **0.15 mm** (crisp hex) or **0.20 mm** (faster) |
| Walls | 3 |
| Infill | 15% gyroid |
| Nozzle | 0.4 mm |
| Material | PLA (easy) or PETG (tougher desk piece) |
| Colors | Silver/steel + matte black tiles/Raptors |

Aft flaps rest on the plate — no support there. Forward flaps need light paint-on or tree supports around ~194 mm height at 1:200.

## Named lettering

- **One color:** customizer STL (hex + unioned letters) — ignore any leftover 3MF empty-layer tips
- **Letter color MMU:** customizer 3MF Hull + Letters — empty-layer warning on Letters is OK
- Keep **Embossed hex tiles in download** on unless you need the faster smooth mesh

## Prusa CORE One / MK4

Starter: `prusa_core_one_starship.ini` (import Print Settings). Envelope 250×220×270 — true 1:200 has ~9.5 mm Z margin.

## Bambu P1S / X1C / A1

Notes: `bambu_p1s_starship.ini`. **Z ≥ 261 mm** for 1:200; A1 mini → 1:300 file.
