# Starship Custom Name

**v2.1.8** · by [David Leeds](https://github.com/leedsexplore) ([@leedsexplore](https://github.com/leedsexplore))

An **original parametric SpaceX Starship CAD** (OpenSCAD, built from published dimensions)
plus a **web customizer** that puts any name on the hull and exports print-ready meshes.

- **One single print file** — hull, flaps, engine bay, and all six Raptors in one
  watertight body. Zero assembly.
- **MMU3 / multi-color ready** — Printables ships a two-body 3MF (stainless hull +
  black heat shield & Raptor bells) that still prints as one job, plus optional
  **hex-tile relief** files. The web customizer’s 3MF is separate: Hull + Letters
  for name coloring.
- **Type a name → preview colors → download STL, Hull+Letters 3MF, or a PNG cover.**

## Licenses (read this)

| What | License |
|------|---------|
| Parametric CAD model (`openscad/starship_parametric.scad` and every mesh exported from it, incl. `assets/starship_ship_print_1_200.stl`, the split print bodies, and the MMU 3MF) | **[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/)** — original work by David Leeds; remix with credit, non-commercial only |
| Legacy customizer mesh (`assets/StarShipV2_*.stl`, remix of Josh1297 + anventia flaps) | **[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/)** — credit Josh1297 and anventia, non-commercial only |
| Tooling code (HTML/CSS/JS/Python/OpenSCAD wrappers) | Reuse with attribution |

See [ATTRIBUTION.md](ATTRIBUTION.md) for details.

## Use the web tool

**Live:** [https://leedsexplore.github.io/starship-custom-name/](https://leedsexplore.github.io/starship-custom-name/)  
**Source:** [github.com/leedsexplore/starship-custom-name](https://github.com/leedsexplore/starship-custom-name)

1. Open the site above (or run locally — see below).
2. Pick a base model: **Parametric CAD 1:200** (default, CC BY-NC) or the classic
   v1.x remix mesh (CC BY-NC).
3. Enter hull text, fonts, colors, and placement.
4. Download:
   - **Empty name + Original CAD at 100%** — exact Printables hex one-piece STL /
     hex MMU 3MF (byte-identical to the listing files).
   - **With a name — STL** — engraved uses a true boolean subtract. Raised overlays
     letters on the smooth hull (prefer **3MF** for clean multi-material).
   - **With a name — 3MF (Hull + Letters)** — raised: separate objects for lettering
     MMU. Engraved: booleaned solid (or Hull + cutter fallback if CSG fails).
   - **PNG cover** — square full-ship snapshot for Printables gallery images.
   - **OpenSCAD params** *(optional)* — settings snippet for the advanced flat path in `openscad/` (GitHub only; not needed for most users).
5. Slice and print nose-up. The parametric ship at 100% is already true 1:200
   (H 260.5 mm) and fits a Prusa CORE One.

Shareable URLs look like:

`https://leedsexplore.github.io/starship-custom-name/?ship=parametric&name=Alex&color=c8ced6&text=e10600&font=optimer-bold&size=8&pos=-10&depth=0.5&scale=100&side=right&style=raised&wrap=1`

| Control | Notes |
|--------|--------|
| Base design | `ship=parametric` (default, original CAD) or `ship=legacy` (classic remix) — segmented toggle in the UI |
| Hull side | `side=right` = leeward (SpaceX S## face) · `side=left` = windward |
| Position | Default `pos=-10` (parametric) / `-2` (legacy) — S## mid-barrel band |
| Font style | Classic (Optimer/Helvetiker/Gentilis/Droid) + popular (Roboto, Open Sans, Montserrat, Inter, …) + display (Oswald, Bebas Neue) |
| Model scale | Baked into STL/3MF; **CORE One 1:200** preset (100% parametric / ~215% legacy) → H 260.5 mm |
| Color presets | Prusament-oriented names on hover (approx where noted) |
| Engraved | Preview is inset; export runs CSG boolean |
| Wrap | Web-only cylindrical bend |

### Run locally

```bash
cd starship-custom-name
python3 -m http.server 8080
# open http://127.0.0.1:8080/
```

> Serve over HTTP so the browser can load the STL, fonts, and vendored modules (`vendor/`).

## Parametric CAD build

The whole ship is one OpenSCAD file: [`openscad/starship_parametric.scad`](openscad/starship_parametric.scad)
(52.1 m × Ø9 m, blunted-ogive nose, 3 SL + 3 vacuum Raptors).

**One-shot rebuild** (OpenSCAD exports + MMU + hex + envelope + Printables sync + validate):

```bash
python3 scripts/rebuild_release.py
```

Or step-by-step:

```bash
# One-piece 1:200 print STL + 3MF + refreshed envelope
python3 scripts/build_starship_cad.py --export --skip-render

# Two-color bodies + MMU 3MF
openscad -o assets/starship_print_1_200_steel.stl --export-format binstl openscad/export_print_steel.scad
openscad -o assets/starship_print_1_200_tiles.stl --export-format binstl openscad/export_print_tiles.scad
python3 scripts/build_mmu_3mf.py

# Printable hex-tile relief (real grooves on the black body)
python3 scripts/emboss_hex_tiles.py

# Sample STL with default raised name (parametric base)
node scripts/build_sample_stl.mjs
```

| Asset | Role |
|-------|------|
| `assets/starship_ship_print_1_200.stl` | **One-piece print file** — H 260.5 mm, engines flush |
| `assets/starship_print_1_200_mmu.3mf` | Two-color MMU 3MF (steel + smooth heat shield/Raptors) |
| `assets/starship_print_1_200_tiles_hex.stl` | Black body with ~11k discrete hex tile plates (scale-true 0.29 m tiles → 1.45 mm FTF, matched to a reference tile scan) |
| `assets/starship_ship_print_1_200_hex.stl` | One-piece merge with hex heat shield |
| `assets/starship_print_1_200_mmu_hex.3mf` | Two-color MMU with hex heat shield |
| `assets/starship_cad_preview.html` | Interactive three.js viewer (steel/tiles/bay/engines layers) |
| `assets/StarShipV2_original.stl` | Legacy customizer mesh (remix, CC BY-NC) — same as v1.1.x |

## Print scale (Prusa CORE One / 1:200)

Measured via `python3 scripts/measure_ship_mesh.py` → `assets/print_envelope.json`:

| | Value |
|--|--|
| Real ship (V3 / Block 2 public) | **52.1 m** tall × **Ø9.0 m** |
| Parametric `starship_ship_print_1_200.stl` at 100% | **H 260.5 mm**, Ø **45.0 mm**, flaps ≈**79.7 mm**, engines protrude **0 mm** |
| Legacy mesh at 100% | **121.0 mm** tall (≈1:431); CORE One preset scales it **215.2893%** |
| Printer envelope | CORE One **250 × 220 × 270 mm**, nose-up; **Z margin 9.5 mm** |

## Printables

The listing package for the original parametric model lives in
[`printables/starship-parametric/`](printables/starship-parametric/) — hex one-piece
STL, hex MMU 3MF, `.scad` source, gallery images, and the listing copy.
See [`printables/README.md`](printables/README.md) for the publish commands.

Hex print files are also published on
[GitHub Releases](https://github.com/leedsexplore/starship-custom-name/releases)
(`starship_1_200_hex_tiles_one_piece.stl` + `starship_1_200_hex_tiles_mmu.3mf`).

## Version

Bump `APP_VERSION` in [`version.js`](version.js) when shipping user-facing changes.
Also update matching `?v=` cache-bust params in `index.html` (CSS + `app.js`), and
keep `export3mf.js?v=` / asset URLs in `app.js` on the same version (fonts get
`?v=` automatically from `APP_VERSION`).
