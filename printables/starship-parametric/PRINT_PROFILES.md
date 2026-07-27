# Ready-to-slice settings — Starship hex one-piece

Canonical: https://www.printables.com/model/1792868  
Customizer (put your name on it): https://leedsexplore.github.io/starship-custom-name/

## Which file?

| Want | Download |
|------|----------|
| Hero desk print (CORE One / MK4 / P1S) | `starship_1_200_hex_tiles_one_piece.stl` (H 260.5 mm) |
| Two-color MMU / AMS | `starship_1_200_hex_tiles_mmu.3mf` (same geometry, two bodies) |
| A1 mini / short Z | `starship_1_300_hex_tiles_one_piece.stl` (H ≈ 174 mm) |

Other scales (e.g. 1:250): use the customizer scale presets.

## All printers

- **Orientation:** nose up · engines flush with the skirt on the plate
- **Supports:** none on hull/nose · aft flaps on the plate · light supports under **forward flaps only** (~194 mm up at 1:200)
- **Layer height:** 0.15–0.20 mm (0.15 for crisp hex grooves)
- **Nozzle:** 0.4 mm · **Infill:** 15% gyroid/cubic · PLA or PETG
- **Colors:** stainless hull → silver/steel · heat shield + Raptors → matte black

## Prusa CORE One / MK4

Optional starter: `prusa_core_one_starship.ini` (Print Settings import) in this folder.
MMU: assign **Stainless hull** and **Heat shield + Raptors** extruders.
Envelope 250×220×270 — true 1:200 has ~9.5 mm Z margin.

## Bambu P1S / X1C / A1

Optional notes: `bambu_p1s_starship.ini` in this folder (not a full machine project).
AMS: map the two bodies to silver + black.
**Z:** 1:200 needs ≥261 mm. A1 mini → use the **1:300** one-piece.

Named lettering: use the customizer, then slice Hull + Letters 3MF separately.
