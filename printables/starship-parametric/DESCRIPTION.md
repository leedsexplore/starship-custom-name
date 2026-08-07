# SpaceX Starship 1:200 — put your name on it

**One file. One print job.** Put your name on Starship: [leedsexplore.github.io/starship-custom-name](https://leedsexplore.github.io/starship-custom-name/). Not dozens of parts — **no glue, no pins, no 26-part hunt**. Real embossed hex tiles on a nose-up desk model.

True **1:200** hero scale (H **260.5 mm** × Ø **45 mm**) for CORE One / MK4 / P1S. Also **1:300** (~174 mm) **one-piece** for A1 mini / shorter Z. Other scales (e.g. 1:250) via the customizer.

This is a **print-first desk model**, not a rivet-count replica kit: hull, flaps, bay, and six Raptors as a **single solid** — download one STL and print. Windward **hex-tile groove** plates are real geometry (~1.45 mm FTF at 1:200, 0.55 mm relief), not a painted texture. Optional **MMU3** 3MF is still **one plate** (two colors: stainless hull + heat shield/Raptors) — not a multi-file assembly.

**Unofficial fan model** — not affiliated with SpaceX. Block 2/3 **ship** envelope (52.1 m × Ø9 m); ship only. Honest silhouette — approximate flaps/nose/tiles; no docking ports or catch hardware.

## Files (only three)

- `starship_1_200_hex_tiles_one_piece.stl` — hero **1:200** hex ship (~36 MB, H 260.5 mm)
- `starship_1_200_hex_tiles_mmu.3mf` — **MMU / AMS two-color** (same 1:200 geometry, stainless + heat shield/Raptors). Printables often mis-labels `.3mf` as “STL” in the file list — download it anyway; open in PrusaSlicer / Bambu Studio.
- `starship_1_300_hex_tiles_one_piece.stl` — **1:300** A1-mini one-piece (H ≈ 174 mm)

The numbers are **scale**, not version: **1:200** = desk hero for CORE One / MK4 / P1S; **1:300** = smaller print for short Z. Other scales via the [customizer](https://leedsexplore.github.io/starship-custom-name/).

## Recommended settings (start here)

| Setting | Recommendation |
|--------|----------------|
| Orientation | **Nose up**, engines flush on the bed |
| Supports | **Forward flaps only** — paint-on or organic/tree under the upper flaps. Do **not** use Supports Everywhere (wastes hours and scars the hull) |
| Layer height | **0.15 mm** for crisp hex grooves · **0.20 mm** if you want a faster desk print |
| Walls / infill | **3 walls** · **15% gyroid** (cubic OK) |
| Nozzle | **0.4 mm** |
| Filament | **PLA** for easy detail · **PETG** if the desk model will be handled a lot |
| Colors | Silver / steel hull · matte black heat shield + Raptors |
| Bed / Z | 1:200 needs **Z ≥ 261 mm** · shorter printers → **1:300** file |

Expect roughly **~60–80 g** filament and a few hours at 0.20 mm on CORE One / P1S (more with MMU or 0.15 mm). Aft flaps sit on the plate — they need no support.

## Custom name

1. Open the [customizer](https://leedsexplore.github.io/starship-custom-name/)
2. Leave **Embossed hex tiles in download** on (default)
3. Enter your name · style **Raised** · download **STL** for a single solid (letters boolean-unioned into the hex hull)

Empty name @ Original CAD 1:200 = these listing files **byte-for-byte**. Named exports use the **same embossed hex geometry** unless you turn hex off (faster smooth CAD) or enable Bare stainless.

**STL vs 3MF:** Prefer **STL** for one-color named prints (no empty-layer warnings). Use **3MF (Hull + Letters)** only when you want MMU/AMS letter colors — PrusaSlicer may warn about empty layers on Letters; that is normal (glyphs sit mid-hull). The hull is continuous; export G-code or switch to STL.

Share presets: `?name=S40`, `?name=IFT-12`, `?name=Noah`. Also on [GitHub Releases](https://github.com/leedsexplore/starship-custom-name/releases).

Want a pocket-size version? [Starship Keychain with Custom Name](https://www.printables.com/model/1802829) (6 cm, Oliver Heisel logo mesh + same customizer).

**Printed yours?** [Post a Make](https://www.printables.com/model/1792868) — photos of supports and filament choices help the next person.

## Printer notes

- **Prusa CORE One / MK4 / XL:** true 1:200 fits; ~9.5 mm Z margin on CORE One. MMU: map stainless + heat-shield bodies (or Hull + Letters from a named 3MF).
- **Bambu P1S / X1C / A1:** same; AMS for two-color. A1 mini → **1:300** one-piece.
- OpenSCAD / source: [GitHub](https://github.com/leedsexplore/starship-custom-name)

## License

**CC BY 4.0** on the original parametric print files (credit required; commercial remix OK with attribution). Credit "David Leeds (leedsexplore)" with a link back. The web customizer / tooling code remains copyright David Leeds (reuse with attribution). The classic remix mesh option in the customizer stays **CC BY-NC** (Josh1297 + anventia). SpaceX and Starship are trademarks of their respective owners.
