# SpaceX Starship 1:200 — embossed hex-tile heat shield

**One print job — no assembly.** Hull, forward and aft flaps, engine bay, and all six Raptors in a single nose-up print. True **1:200** (H **260.5 mm** × Ø **45 mm**).

This listing is the **embossed hex-tile** print: thousands of real hexagonal tile plates on the windward heat shield — scale-true ~0.29 m Starship tiles (1.45 mm across flats at 1:200), ~0.2 mm proud with crisp grooves. Real geometry, not a painted texture.

**Unofficial fan model** — not affiliated with or endorsed by SpaceX. Outer envelope matches published **Block 2 / Block 3 ship** dimensions (**52.1 m × Ø9 m**). The full V3 *stack* is taller (~124.4 m) because Super Heavy grew; this file is the **ship only**. Silhouette CAD: flap planform, nose, and tile layout are approximate (no docking ports / catch hardware).

## Files

- `starship_1_200_hex_tiles_one_piece.stl` — full ship, embossed hex heat shield, one filament (~36 MB; many discrete tile plates — PrusaSlicer handles this; give it a minute to load)
- `starship_1_200_hex_tiles_mmu.3mf` — same ship as two MMU3 bodies: **Stainless hull** + **Heat shield + Raptors**
- `starship_parametric.scad` — OpenSCAD source (smooth shell in CAD; hex relief is generated in the build pipeline)

**Want a custom name on the hull?** Use the free web customizer:

**[leedsexplore.github.io/starship-custom-name](https://leedsexplore.github.io/starship-custom-name/)**

With **Original CAD** selected, an empty name at the CORE One 1:200 preset downloads these same hex STL / MMU 3MF files byte-for-byte. Enter a name to emboss or raise lettering on the smooth hull (named exports are separate from this listing). The same hex files are also on the project’s [GitHub Releases](https://github.com/leedsexplore/starship-custom-name/releases).

## Printing

- **Orientation:** nose up. Engines flush with the skirt.
- **Supports:** hull/nose none; aft flaps on the plate; light supports under forward flaps (~194 mm up).
- **Recommended:** 0.4 mm nozzle (or finer), **0.15–0.20 mm** layers for groove readability, 15% gyroid/cubic infill, PLA or PETG. Silver/steel filament for the hull; matte black for tiles + bells.
- **MMU3:** assign **Stainless hull** → silver, **Heat shield + Raptors** → black. Shell ~0.45 mm proud; tile plates ~0.2 mm above the groove floor.
- **Fits** Prusa CORE One (250×220×270) with ~9.5 mm Z margin at 100% / true 1:200.

Source: [github.com/leedsexplore/starship-custom-name](https://github.com/leedsexplore/starship-custom-name)

## License

**CC BY-NC 4.0** — remix and share with credit; non-commercial only. Credit "David Leeds (leedsexplore)" with a link back. SpaceX and Starship are trademarks of their respective owners.
