# Starship Custom Name

**v2.4.47** · by [David Leeds](https://github.com/leedsexplore) ([@leedsexplore](https://github.com/leedsexplore))

**North star:** the Starship with *your* name on it — a one-piece 1:200 desk print,
real embossed hex heat tiles, and a free web customizer. Not a rivet-count replica kit.
Mini one-piece files at **1:250** / **1:300** fit shorter printers.

**Unofficial fan model** — not affiliated with or endorsed by SpaceX. Outer envelope
matches the **Block 2 / Block 3 ship** (52.1 m × Ø9 m), not the full V3 stack
(~124.4 m). SpaceX and Starship are trademarks of their respective owners.

- **Your name on the hull** — type → preview → STL / Hull+Letters 3MF / PNG cover · share presets (`?name=S40`).
- **One print job** — hull, flaps, bay, six Raptors; zero assembly.
- **Real hex tiles** — embossed plates on the windward shield (Printables hex files;
  empty-name Original CAD @ 1:200 downloads them byte-for-byte).

## Licenses (read this)

| What | License |
|------|---------|
| Parametric CAD / hex print meshes (`openscad/starship_parametric.scad`, `assets/starship_*_hex.*`, Printables package files for this listing) | **[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)** — credit David Leeds; commercial remix OK with attribution |
| Legacy customizer mesh (`assets/StarShipV2_*.stl`, remix of Josh1297 + anventia flaps) | **[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/)** — credit Josh1297 and anventia, non-commercial only |
| Tooling code (HTML/CSS/JS/Python/OpenSCAD wrappers) | Copyright David Leeds — reuse with attribution |

See [ATTRIBUTION.md](ATTRIBUTION.md) for details.

## Use the web tool

**Live:** [https://leedsexplore.github.io/starship-custom-name/](https://leedsexplore.github.io/starship-custom-name/)  
**Source:** [github.com/leedsexplore/starship-custom-name](https://github.com/leedsexplore/starship-custom-name)

1. Open the site above (or run locally — see below).
2. Pick a base model: **Original CAD** (default, CC BY) or the classic
   v1.x remix mesh (CC BY-NC).
3. Enter hull text, fonts, colors, and placement.
4. Download:
   - **Empty name + Original CAD at 100%** — exact Printables hex one-piece STL /
     hex MMU 3MF (byte-identical to the listing files).
   - **With a name — STL** — engraved uses a true boolean subtract when watertight (keychain often falls back to raised overlay). Raised overlays
     letters on the smooth hull (prefer **3MF** for clean multi-material).
   - **With a name — 3MF (Hull + Letters)** — raised: separate objects for lettering
     MMU. Engraved: booleaned solid (or Hull + cutter fallback if CSG fails).
   - **PNG cover** — square full-ship snapshot for Printables gallery images.
   - **OpenSCAD params** *(optional)* — settings snippet for the advanced flat path in `openscad/` (GitHub only; not needed for most users).
5. Slice and print nose-up. The parametric ship at 100% is already true 1:200
   (H 260.5 mm) and fits a Prusa CORE One.

Shareable URLs look like:

`https://leedsexplore.github.io/starship-custom-name/?ship=parametric&name=Alex&color=c8ced6&text=1c1c1c&font=oswald-bold&size=3.5&pos=68&depth=0.5&scale=100&side=both&style=raised&wrap=1`

| Control | Notes |
|--------|--------|
| Base design | `ship=parametric` (default, Original CAD), `ship=legacy` (classic remix), or `ship=keychain` (Oliver Heisel 6 cm with SpaceX logo) — segmented toggle in the UI |
| Hull side | Default `side=both` = port + starboard stainless flanks (real ship) · `side=right` = leeward only · `side=left` = windward (tiles) |
| Position | Parametric default keeps the bottom glyph on the forward-flap line (~`pos=68` for short IDs); slider ±90 mm (nose +). Legacy default `pos=-2` |
| Font style | Classic (Optimer/Helvetiker/Gentilis/Droid) + popular (Roboto, Open Sans, Montserrat, Inter, …) + display (Oswald, Bebas Neue) |
| Model scale | Baked into STL/3MF; **CORE One 1:200** preset (100% parametric / ~215% legacy) → H 260.5 mm |
| Color presets | Prusament-oriented names on hover (approx where noted) |
| Engraved | Live CSG same-color recess when watertight; keychain often falls back to raised overlay (deep cuts shatter the thin mesh) |
| Reverse / mirror | `reverse=1` engines→nose · `mirror=1` flips letters left↔right from the side |
| Wrap | Web-only cylindrical bend (raised lettering; engraved uses a flat cutter) |
| Bare stainless | `bare=1` — Original CAD preview paints the whole ship stainless (no heat-tile look); empty-name downloads use the smooth mesh |

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

# Sample STL with raised name (optional local artifact; gitignored)
node scripts/build_sample_stl.mjs
```

| Asset | Role |
|-------|------|
| `assets/starship_ship_print_1_200.stl` | **One-piece smooth print** — H 260.5 mm, engines flush (named exports / CSG) |
| `assets/starship_print_1_200_mmu.3mf` | Smooth two-color MMU (rebuild intermediate; listing ships **hex**) |
| `assets/starship_print_1_200_tiles_hex.stl` | Black body with ~11k discrete hex tile plates (1.45 mm FTF) |
| `assets/starship_ship_print_1_200_hex.stl` | One-piece merge with hex heat shield (**Printables / Releases**) |
| `assets/starship_print_1_200_mmu_hex.3mf` | Two-color MMU with hex heat shield (**Printables / Releases**) |
| `assets/starship_cad_preview.html` | Layered three.js viewer (uses the same 1:200 print STLs) |
| `assets/StarShipV2_original.stl` | Legacy customizer mesh (remix, CC BY-NC) — same as v1.1.x |

## Print scale (Prusa CORE One / 1:200)

Measured via `python3 scripts/measure_ship_mesh.py` → `assets/print_envelope.json`:

| | Value |
|--|--|
| Real ship (Block 2/3 ship, public) | **52.1 m** tall × **Ø9.0 m** (full V3 *stack* ≈124.4 m) |
| Parametric `starship_ship_print_1_200.stl` at 100% | **H 260.5 mm**, Ø **45.0 mm**, flaps ≈**79.7 mm**, engines protrude **0 mm** |
| Legacy mesh at 100% | **121.0 mm** tall (≈1:431); CORE One preset scales it **215.2893%** |
| Printer envelope | CORE One **250 × 220 × 270 mm**, nose-up; **Z margin 9.5 mm** |

## Printables

**Desk / Original CAD:** [printables.com/model/1792868](https://www.printables.com/model/1792868)
— one-piece hex tiles + put-your-name customizer.

**Keychain remix:** [printables.com/model/1802829](https://www.printables.com/model/1802829)
— Oliver Heisel 6 cm logo mesh + custom name (CC BY-NC-SA).

Package: [`printables/starship-parametric/`](printables/starship-parametric/)  
Print settings: [`PRINT_PROFILES.md`](printables/starship-parametric/PRINT_PROFILES.md).  
Cross-post staging: [`printables/mirrors/README.md`](printables/mirrors/README.md) (`python3 scripts/stage_mirror_uploads.py`).  
Publish: [`printables/README.md`](printables/README.md).

Hex print files also on
[GitHub Releases](https://github.com/leedsexplore/starship-custom-name/releases).

## Version

Bump `APP_VERSION` in [`version.js`](version.js) when shipping user-facing changes.
Also update matching `?v=` cache-bust params in `index.html` (CSS + `app.js`),
`package.json` `"version"`, and keep `export3mf.js?v=` / `version.js?v=` in `app.js`
on the same version (fonts get `?v=` automatically from `APP_VERSION`).

```bash
python3 scripts/check_version_sync.py
python3 scripts/validate_printables_package.py
```

## GitHub Pages

The site deploys via [`.github/workflows/pages.yml`](.github/workflows/pages.yml):
a slim customizer payload (no `printables/`, `scripts/`, `openscad/`, or rebuild-only
meshes). In the repo **Settings → Pages**, set Source to **GitHub Actions** so that
workflow is what publishes [the live site](https://leedsexplore.github.io/starship-custom-name/).
