# SpaceX Starship 1:200 — embossed hex-tile heat shield

**One single print file.** Hull, forward and aft flaps, engine bay, and all six Raptors in one body. No assembly. True **1:200** (H **260.5 mm**).

This listing is the **embossed hex-tile** print: real grooves on the windward heat shield (~2.8 mm tiles, ~0.2 mm deep) — not a painted texture.

## Files

| File | What you get |
|------|----------------|
| `starship_1_200_hex_tiles_one_piece.stl` | Full ship, one body, embossed hex heat shield — print in one filament |
| `starship_1_200_hex_tiles_mmu.3mf` | Same ship as two MMU3 bodies: stainless hull + black heat shield / windward flap faces / Raptors |
| `starship_parametric.scad` | OpenSCAD source (smooth shell in CAD; hex relief is generated in the build pipeline) |

**Want a name on the hull, smooth heat shield, or your own colors?** Use the free web customizer — it exports your STL/3MF directly (no sample file needed here):

**[leedsexplore.github.io/starship-custom-name](https://leedsexplore.github.io/starship-custom-name/)**

On Original CAD, pick **Heat shield: Hex relief** or **Flat**, type a name, download.

## Printing

- **Orientation:** nose up. Engines flush with the skirt.
- **Supports:** hull/nose none; aft flaps on the plate; light supports under forward flaps (~194 mm).
- **MMU3:** "Stainless hull" → silver, "Heat shield + Raptors" → black. Shell ~0.45 mm proud; hex grooves ~0.2 mm into that. 0.4 mm nozzle or finer; try 0.15 mm layers if grooves look soft.
- **Fits** Prusa CORE One (250×220×270) with ~9.5 mm Z margin.

Source: [github.com/leedsexplore/starship-custom-name](https://github.com/leedsexplore/starship-custom-name)

## License

**CC BY 4.0** — print, remix, sell prints. Credit "David Leeds (leedsexplore)" with a link back.
