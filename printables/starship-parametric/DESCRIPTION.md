# SpaceX Starship 1:200 — one print file, zero assembly

**One single print file.** The whole ship — hull, forward and aft flaps, engine bay, and all six Raptors — is one monolithic body. No hunting for separate flap/nose/engine parts, no glue, no alignment pins. Drop the STL in your slicer and print.

**MMU3 / multi-color ready.** The 3MF splits the exact same geometry into two bodies: stainless hull and a black body carrying the hexagonal-tile heat shield, the windward flap faces, and the Raptor bells. Still one print job — assign two filaments and you get the iconic black windward side straight off the printer. (The color split is radial, so it needs a multi-material or toolchanger setup — single-extruder users should print the one-piece STL in silver.)

## ✏️ Put YOUR name on it — free web customizer

**[leedsexplore.github.io/starship-custom-name](https://leedsexplore.github.io/starship-custom-name/)**

Type any name, pick colors and font, choose raised or engraved lettering wrapped to the hull curve, and download a print-ready STL or multi-material 3MF in your browser. Nothing to install. (Scan the QR code in the gallery.)

## What's in the files

| File | What it is |
|------|------------|
| `starship_1_200_one_piece.stl` | The headline: complete ship, one body, 260.5 mm tall |
| `starship_1_200_two_color_mmu.3mf` | Same ship as two color-assigned bodies (steel + black) for MMU3/toolchanger |
| `starship_custom_name_sample.stl` | Example output of the web customizer ("Custom Name" on the hull) |
| `starship_parametric.scad` | The full OpenSCAD source — remix at any scale |

## Printing

- **Scale:** true 1:200 of the 52.1 m × 9 m vehicle → **H 260.5 mm × Ø 45 mm**, flap footprint ~80 mm. Fits a Prusa CORE One (250×220×270) standing nose-up with ~9.5 mm to spare.
- **Orientation:** nose up, as exported. The engine bells are recessed flush with the skirt — nothing pokes below the base plane.
- **Supports:** the hull and nose need none, and the aft flaps start right on the build plate. Add light supports under the forward flaps' flat undersides (a small ledge at ~194 mm height).
- **Two-color:** open the 3MF, assign "Stainless hull" to silver and "Heat shield + Raptors" to black. The tile shell is 0.45 mm proud — one clean perimeter with a 0.4 mm nozzle.
- **Rescale freely:** the model is a single watertight body, so 50%–200% both slice fine.

## Why this one is different

This is **not a mesh remix** — it's an original parametric CAD model written in OpenSCAD from published dimensions. Every dimension is a named variable: fork the `.scad`, change one number, and re-export at any scale or detail level.

Source, build pipeline, and the customizer web app: [github.com/leedsexplore/starship-custom-name](https://github.com/leedsexplore/starship-custom-name)

## License

**CC BY 4.0** — print it, remix it, sell prints of it. Just credit "David Leeds (leedsexplore)" with a link back. Have fun.
