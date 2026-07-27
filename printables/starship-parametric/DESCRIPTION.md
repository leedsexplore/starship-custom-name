# SpaceX Starship 1:200 — one print file, zero assembly

**One single print file.** The whole ship — hull, forward and aft flaps, engine bay, and all six Raptors — is one monolithic body. No hunting for separate flap/nose/engine parts, no glue, no alignment pins. Drop the STL in your slicer and print.

## Which file should I print?

Pick **one** print path. Everything is already true **1:200** (H **260.5 mm**).

| If you want… | Download this | What comes off the printer |
|---|---|---|
| **Simplest** — one body, one filament | `starship_1_200_one_piece.stl` | Full ship in one color. Windward heat shield is a **smooth raised black-ready shell** (no hex grooves). Print silver/steel-looking filament. |
| **Two-color MMU3** — steel + black, smooth shield | `starship_1_200_two_color_mmu.3mf` | Same geometry as the one-piece, split into **two bodies** in one job: stainless hull + black heat shield / windward flap faces / Raptors. Heat shield is still **smooth** (proud shell, no hex texture). |
| **Hex tiles you can feel** — one body | `starship_1_200_hex_tiles_one_piece.stl` | Full ship with **real embossed hexagon grooves** on the windward heat shield (~2.8 mm tiles, ~0.2 mm deep). Not a painted texture — the STL has the grooves. |
| **Hex tiles + two-color MMU3** | `starship_1_200_hex_tiles_mmu.3mf` | Same embossed hex heat shield as above, as a two-body MMU 3MF (steel + black). |

**Important:** the default one-piece / MMU files do **not** print a hexagon pattern. Only the files with `hex_tiles` in the name have printable grooves. Gallery closeups of hexes match those hex files (or the web customizer’s Hex relief mode).

**MMU note:** the color split is radial (windward vs leeward), so you need a multi-material / toolchanger setup. Single-extruder → use a one-piece STL.

## ✏️ Put YOUR name on it — free web customizer

**[leedsexplore.github.io/starship-custom-name](https://leedsexplore.github.io/starship-custom-name/)**

Type any name, pick colors and font, raised or engraved lettering, and on Original CAD choose **Heat shield: Hex relief** or **Flat**. Download STL / multi-material 3MF in the browser. (Scan the QR code in the gallery.)

## All files

| File | Role |
|------|------|
| `starship_1_200_one_piece.stl` | Headline: complete ship, **smooth** heat-shield shell, one body |
| `starship_1_200_two_color_mmu.3mf` | Same ship, two MMU bodies, **smooth** black shield |
| `starship_1_200_hex_tiles_one_piece.stl` | Complete ship with **embossed hex grooves** |
| `starship_1_200_hex_tiles_mmu.3mf` | Two-color MMU with **embossed hex** black body |
| `starship_custom_name_sample.stl` | Example customizer output |
| `starship_parametric.scad` | OpenSCAD source (smooth shell; hex relief is built in the repo pipeline) |

## Printing

- **Scale:** true 1:200 of the 52.1 m × 9 m vehicle → **H 260.5 mm × Ø 45 mm**, flap footprint ~80 mm. Fits a Prusa CORE One (250×220×270) standing nose-up with ~9.5 mm to spare.
- **Orientation:** nose up, as exported. Engine bells sit flush with the skirt — nothing below the base plane.
- **Supports:** hull/nose need none; aft flaps sit on the plate. Light supports under the forward flaps (~194 mm height).
- **Two-color:** assign "Stainless hull" → silver, "Heat shield + Raptors" → black. Smooth shell is **0.45 mm proud** (one perimeter at 0.4 mm). Hex grooves cut an extra **~0.2 mm** into that shell — use a 0.4 mm nozzle or finer.
- **Hex tip:** if grooves look soft, drop layer height to **0.15 mm** on outer walls; don’t iron the windward face flat.
- **Rescale:** 50%–200% both slice fine (hex detail gets harder below ~75%).

## Why this one is different

This is **not a mesh remix** — original parametric CAD in OpenSCAD from published dimensions. Fork the `.scad`, change a variable, re-export.

Source + customizer: [github.com/leedsexplore/starship-custom-name](https://github.com/leedsexplore/starship-custom-name)

## License

**CC BY 4.0** — print it, remix it, sell prints. Credit "David Leeds (leedsexplore)" with a link back.
