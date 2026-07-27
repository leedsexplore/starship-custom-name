# Ready-to-slice settings — Starship 1:200 hex

Canonical: https://www.printables.com/model/1792868  
Customizer (put your name on it): https://leedsexplore.github.io/starship-custom-name/

Open `starship_1_200_hex_tiles_mmu.3mf` (or the one-piece STL), then apply:

## All printers

- **Orientation:** nose up · engines flush with the skirt on the plate
- **Supports:** none on hull/nose · aft flaps on the plate · light supports under **forward flaps only** (~194 mm up)
- **Layer height:** 0.15–0.20 mm (0.15 for crisp hex grooves)
- **Nozzle:** 0.4 mm · **Infill:** 15% gyroid/cubic · PLA or PETG
- **Colors:** stainless hull → silver/steel · heat shield + Raptors → matte black

## Prusa CORE One / MK4

Import `prusa_core_one_starship.ini` (Print Settings) or match the table above.
MMU: assign **Stainless hull** and **Heat shield + Raptors** extruders.
Envelope 250×220×270 — true 1:200 has ~9.5 mm Z margin.

## Bambu P1S / X1C / A1

Import `bambu_p1s_starship.ini` notes into Bambu Studio Fine 0.16/0.20, or match the table.
AMS: map the two bodies to silver + black.
**Z:** needs ≥261 mm clear (A1 mini is short — scale down in the slicer if needed).

Named lettering: use the customizer, then slice Hull + Letters 3MF separately.
