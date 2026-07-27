# Starship 1:200 — put your name on it

**The Starship with *your* name on the hull.** One print job — **no glue, no pins, no 26-part hunt** — then a free web tool to raise or engrave any callsign on a nose-up desk model.

True **1:200** (H **260.5 mm** × Ø **45 mm**). Fits a Prusa CORE One with ~9.5 mm Z margin.

This is a **print-first desk model**, not a rivet-count replica kit: hull, flaps, engine bay, and all six Raptors in one body. The windward side carries thousands of **hex tile plates** — scale-true ~0.29 m tiles (1.45 mm across flats), ~0.2 mm proud with crisp grooves. Real geometry, not a painted texture. MMU 3MF splits **Stainless hull** vs **Heat shield + Raptors** for silver + matte black off the printer.

**Unofficial fan model** — not affiliated with or endorsed by SpaceX. Envelope matches published **Block 2 / Block 3 ship** dimensions (**52.1 m × Ø9 m**). Ship only (full V3 stack ≈124.4 m). Flap planform, nose, and tile layout are approximate — no docking ports or catch hardware. Honest silhouette; the magic is **your name** and tiles you can feel.

## Files

- `starship_1_200_hex_tiles_one_piece.stl` — full ship, embossed hex heat shield, one filament (~36 MB; PrusaSlicer may need a minute to load)
- `starship_1_200_hex_tiles_mmu.3mf` — two MMU3 bodies: **Stainless hull** + **Heat shield + Raptors** (opens with print-hint metadata)
- `prusa_core_one_starship.ini` — PrusaSlicer print-settings starter (0.15 mm, supports for flaps)
- `bambu_p1s_starship.ini` — Bambu Studio settings cheat-sheet
- `starship_parametric.scad` — OpenSCAD source (smooth shell in CAD; hex relief from the build pipeline)

Full tables also in the repo as `PRINT_PROFILES.md`.

## Custom name (the product)

**[leedsexplore.github.io/starship-custom-name](https://leedsexplore.github.io/starship-custom-name/)**

Type a name → preview on the leeward face → download STL or Hull+Letters 3MF. Empty name + Original CAD at the CORE One 1:200 preset downloads these same hex files **byte-for-byte**. Named exports use the smooth hull so lettering stays clean. Hex files also on [GitHub Releases](https://github.com/leedsexplore/starship-custom-name/releases).

## Printing

- **Orientation:** nose up. Engines flush with the skirt.
- **Supports:** hull/nose none; aft flaps on the plate; light supports under forward flaps (~194 mm up).
- **Recommended:** 0.4 mm nozzle, **0.15–0.20 mm** layers for groove readability, 15% gyroid/cubic, PLA or PETG. Silver hull · matte black tiles + bells.
- **MMU3:** **Stainless hull** → silver, **Heat shield + Raptors** → black.
- Import the `.ini` helpers above, or follow `PRINT_PROFILES.md` in the GitHub repo.

Source: [github.com/leedsexplore/starship-custom-name](https://github.com/leedsexplore/starship-custom-name)

## License

**CC BY-NC 4.0** — remix and share with credit; non-commercial only. Credit "David Leeds (leedsexplore)" with a link back. SpaceX and Starship are trademarks of their respective owners.
