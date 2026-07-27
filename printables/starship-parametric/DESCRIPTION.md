# SpaceX Starship 1:200 — embossed hex-tile heat shield

**One print job — no assembly.** Hull, forward and aft flaps, engine bay, and all six Raptors in a single nose-up print. True **1:200** (H **260.5 mm**).

This listing is the **embossed hex-tile** print: real grooves on the windward heat shield (~2.0 mm tiles, ~0.2 mm deep, calibrated to a reference Starship tile scan) — not a painted texture.

## Files

- `starship_1_200_hex_tiles_one_piece.stl` — full ship, embossed hex heat shield, one filament
- `starship_1_200_hex_tiles_mmu.3mf` — same ship as two MMU3 bodies: stainless hull + black heat shield / windward flap faces / Raptors
- `starship_parametric.scad` — OpenSCAD source (smooth shell in CAD; hex relief is generated in the build pipeline)

**Want a custom name on the hull?** Use the free web customizer:

**[leedsexplore.github.io/starship-custom-name](https://leedsexplore.github.io/starship-custom-name/)**

The customizer puts a name on the **smooth** Original CAD (or classic remix) and exports your STL/3MF. It does **not** currently export this embossed-hex listing — grab the hex files here when you want the grooved heat shield without a name.

## Printing

- **Orientation:** nose up. Engines flush with the skirt.
- **Supports:** hull/nose none; aft flaps on the plate; light supports under forward flaps (~194 mm).
- **MMU3:** "Stainless hull" → silver, "Heat shield + Raptors" → black. Shell ~0.45 mm proud; hex grooves ~0.2 mm into that. 0.4 mm nozzle or finer; try 0.15 mm layers if grooves look soft.
- **Fits** Prusa CORE One (250×220×270) with ~9.5 mm Z margin.

Source: [github.com/leedsexplore/starship-custom-name](https://github.com/leedsexplore/starship-custom-name)

## License

**CC BY-NC 4.0** — remix and share with credit; non-commercial only. Credit "David Leeds (leedsexplore)" with a link back.
