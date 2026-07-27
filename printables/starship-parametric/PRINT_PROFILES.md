# Ready-to-slice print profiles — Starship 1:200 hex

Canonical listing: https://www.printables.com/model/1792868  
Customizer (named hulls): https://leedsexplore.github.io/starship-custom-name/

## Orientation

- **Nose up.** Engines flush with the skirt on the plate.
- **Supports:** hull/nose none; aft flaps on the plate; light supports under forward flaps (~194 mm up at 1:200).
- **Brim:** optional 5 mm outer brim if bed adhesion is weak.

## Prusa CORE One / MK4 / XL (0.4 mm nozzle)

| Setting | Value |
|--------|--------|
| Layer height | **0.15–0.20 mm** (0.15 for crisp hex grooves) |
| Perimeters | 2–3 |
| Infill | 15% gyroid or cubic |
| Material | PLA or PETG |
| MMU (from `…mmu_hex.3mf` / `…with_stand.3mf`) | **Stainless hull** → silver/steel · **Heat shield + Raptors** → matte black |
| Stand / nameplate | Print with hull color or contrasting accent; can disable objects in the slicer |
| Envelope | 250×220×270 — true 1:200 has ~9.5 mm Z margin |

Suggested Prusament: Galaxy Silver / Pearl Mouse (hull), Jet Black (tiles).

## Bambu Lab P1S / X1C / A1 (0.4 mm nozzle)

Same geometry targets as above. Notes:

- **Z height:** 1:200 needs ≥ **261 mm** clear Z (A1 mini is too short — use the **1:250 mini** one-piece, H ≈ 208 mm).
- AMS: map stainless → light grey/silver, heat shield → black.
- Enable supports for forward flaps only; tree or normal both work.
- 0.16 mm or 0.20 mm Fine profiles are a good starting point.

## Files cheat-sheet

| File | Use |
|------|-----|
| `starship_1_200_hex_tiles_one_piece.stl` | Single filament, full hex ship |
| `starship_1_200_hex_tiles_mmu.3mf` | Two-color MMU, ship only |
| `starship_1_200_mmu_hex_with_stand.3mf` | MMU ship + stand + blank nameplate |
| `starship_1_200_display_stand.stl` / `…nameplate.stl` | Stand alone |
| `starship_1_250_hex_tiles_one_piece.stl` | Smaller printers (H ≈ 208 mm) |

## After the print

Post a Make on Printables with filament + layer height — it helps the next person and boosts the listing. Named lettering: use the web customizer, then slice the Hull + Letters 3MF.
