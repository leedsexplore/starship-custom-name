# SpaceX Starship 1:200 One-Piece Hex Heat Shield MMU

**One print job — no glue, no pins, no 26-part hunt.** Hull, forward and aft flaps, engine bay, and all six Raptors in a single nose-up print. True **1:200** (H **260.5 mm** × Ø **45 mm**). Fits a Prusa CORE One with ~9.5 mm Z margin.

This listing is the **embossed hex-tile** print: thousands of real hexagonal tile plates on the windward heat shield — scale-true ~0.29 m Starship tiles (1.45 mm across flats at 1:200), ~0.2 mm proud with crisp grooves. Real geometry, not a painted texture.

**Unofficial fan model** — not affiliated with or endorsed by SpaceX. Outer envelope matches published **Block 2 / Block 3 ship** dimensions (**52.1 m × Ø9 m**). The full V3 stack is taller (~124.4 m) because Super Heavy grew; this file is the **ship only**. Silhouette CAD: flap planform, nose, and tile layout are approximate (no docking ports / catch hardware).

## Files

- `starship_1_200_hex_tiles_one_piece.stl` — full ship, embossed hex heat shield, one filament (~36 MB; many discrete tile plates — PrusaSlicer handles this; give it a minute to load)
- `starship_1_200_hex_tiles_mmu.3mf` — same ship as two MMU3 bodies: **Stainless hull** + **Heat shield + Raptors**
- `starship_1_200_mmu_hex_with_stand.3mf` — MMU ship **plus** display stand + blank nameplate (disable objects you do not need)
- `starship_1_200_display_stand.stl` / `starship_1_200_nameplate.stl` — display stand alone
- `starship_1_250_hex_tiles_one_piece.stl` — **1:250 mini** (H ≈ 208 mm) for shorter printers (A1 / smaller Z)
- `starship_parametric.scad` — OpenSCAD source (smooth shell in CAD; hex relief is generated in the build pipeline)
- `PRINT_PROFILES.md` — ready-to-slice Prusa + Bambu settings

**Want a custom name on the hull?** Free web customizer:

**[leedsexplore.github.io/starship-custom-name](https://leedsexplore.github.io/starship-custom-name/)**

With **Original CAD** selected, an empty name at the CORE One 1:200 preset downloads these same hex STL / MMU 3MF files byte-for-byte. Enter a name to emboss or raise lettering on the smooth hull (named exports are separate from this listing). Hex files also on [GitHub Releases](https://github.com/leedsexplore/starship-custom-name/releases).

## Printing

See **PRINT_PROFILES.md** in the files for full Prusa / Bambu tables. Short version:

- **Orientation:** nose up. Engines flush with the skirt.
- **Supports:** hull/nose none; aft flaps on the plate; light supports under forward flaps (~194 mm up).
- **Recommended:** 0.4 mm nozzle, **0.15–0.20 mm** layers, 15% gyroid/cubic, PLA or PETG. Silver hull · matte black tiles + bells.
- **MMU3:** **Stainless hull** → silver, **Heat shield + Raptors** → black.
- **Stand:** print with the ship or separately; nameplate tab slides into the stand front pocket.

Please post a **Make** with filament + layer height — it helps the next printer.

Source: [github.com/leedsexplore/starship-custom-name](https://github.com/leedsexplore/starship-custom-name)

## License

**CC BY-NC 4.0** — remix and share with credit; non-commercial only. Credit "David Leeds (leedsexplore)" with a link back. SpaceX and Starship are trademarks of their respective owners.
