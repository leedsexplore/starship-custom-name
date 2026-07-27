# Starship Custom Name

**v1.3.0** · by [David Leeds](https://github.com/leedsexplore) ([@leedsexplore](https://github.com/leedsexplore))

Simple customizer for a Printables remix of [Josh1297’s SpaceX Starship](https://www.printables.com/model/225040-spacex-starship).

Base mesh: smooth hull + **cleaned Block 2–style flaps** + **6 Raptors** (3 sea-level + 3 vacuum).  
**Type a name → preview colors → download STL, multi-material 3MF, or a PNG cover.**  
License is **CC BY-NC** — credit Josh1297 (hull) and anventia (flap source). Tooling by David Leeds.

## Use the web tool

**Live:** [https://leedsexplore.github.io/starship-custom-name/](https://leedsexplore.github.io/starship-custom-name/)  
**Source:** [github.com/leedsexplore/starship-custom-name](https://github.com/leedsexplore/starship-custom-name)

1. Open the site above (or run locally — see below).
2. Enter hull text, fonts, colors, and placement.
3. Download:
   - **STL** — engraved uses a true boolean subtract. Raised overlays letters on the hull (prefer **3MF** for clean multi-material).
   - **3MF (MMU)** — raised: separate Hull + Letters objects. Engraved: booleaned solid (or Hull + cutter fallback if CSG fails).
   - **PNG cover** — square full-ship snapshot for Printables gallery images.
   - **OpenSCAD params** *(optional)* — settings snippet for the advanced flat path in `openscad/` (GitHub only; not needed for most users).
4. Slice and print (vertical + supports, same as the original).

Shareable URLs look like:

`https://leedsexplore.github.io/starship-custom-name/?name=Alex&color=e10600&text=f2f0e6&font=optimer-bold&size=5&pos=-2&depth=0.5&scale=100&side=right&style=raised&wrap=1`

| Control | Notes |
|--------|--------|
| Font style | Classic (Optimer/Helvetiker/Gentilis/Droid) + popular (Roboto, Open Sans, Montserrat, Inter, …) + display (Oswald, Bebas Neue) |
| Model scale | 50–220% (baked into STL/3MF); **CORE One 1:200** preset → H 260.5 mm |
| Color presets | Prusament-oriented names on hover (approx where noted) |
| Engraved | Preview is inset; export runs CSG boolean |
| Wrap | Web-only cylindrical bend |

Defaults: **Signal Red** hull (`#e10600`) + **Pearl White** letters (`#f2f0e6`), emboss depth 0.5 mm.

### Run locally

```bash
cd starship-custom-name
python3 -m http.server 8080
# open http://127.0.0.1:8080/
```

> Serve over HTTP so the browser can load the STL, fonts, and vendored modules (`vendor/`).

## Mesh build (optional)

Rebuild the customizer hull from sources:

```bash
# 1) Solid cleaned flap parts (downloads Block 2 sources into assets/flaps_cleaned/source/)
python3 scripts/build_cleaned_flaps.py

# 2) Smooth Josh hull (no stock flaps) + mount cleaned flaps
python3 scripts/build_ship_with_cleaned_flaps.py

# 3) Sample STL with default raised name
node scripts/build_sample_stl.mjs
```

| Asset | Role |
|-------|------|
| `assets/StarShipV2_original.stl` | Josh hull + stock flaps + engines (source) |
| `assets/StarShipV2_no_flaps.stl` | Smooth hull intermediate |
| `assets/StarShipV2_cleaned_flaps.stl` | **Customizer mesh** — smooth hull + cleaned flaps |
| `assets/flaps_cleaned/*_clean.stl` | Standalone flap solids (see that folder’s README) |

## Print scale (Prusa CORE One / 1:200)

Measured via `python3 scripts/measure_ship_mesh.py` → `assets/print_envelope.json`:

| | Value |
|--|--|
| Real ship (V3 / Block 2 public) | **52.1 m** tall × **Ø9.0 m** |
| Customizer mesh at 100% | **121.0 mm** tall × **Ø≈21.45 mm** (≈1:431) |
| Web **CORE One 1:200** preset | scale **215.2893%** → **H 260.5 mm**, Ø≈**46.18 mm**, flaps ≈**89.6 mm** |
| Parametric `starship_ship_print_1_200.stl` | **H 260.5 mm**, Ø≈**45.15 mm**, flaps ≈**79.7 mm**, engines protrude **0 mm** |
| Printer envelope | CORE One **250 × 220 × 270 mm**, nose-up; **Z margin 9.5 mm** |

In the web UI, click **CORE One 1:200**. For the proportion-true CAD mesh:

```bash
openscad -o assets/starship_ship_print_1_200.stl --export-format=binstl \
  -D 'print_height_mm=260.5' openscad/export_print.scad
# or: python3 scripts/build_starship_cad.py --export --skip-render
```

Blueprint from measured JSON: `assets/starship-cad-blueprint.svg`

## OpenSCAD (optional / advanced)

Most people should use the **web tool**. An offline flat-emboss path lives in `openscad/` (no hull wrap). Prefer the web exporter for wrap, boolean engraved STL/3MF, and PNG covers. Parametric hull: `openscad/starship_parametric.scad` + `openscad/export_print.scad`.

## Version

Bump `APP_VERSION` in [`version.js`](version.js) when shipping user-facing changes (also update cache-bust query params in `index.html` to match).

## Attribution

- Remix / web tool: **David Leeds** ([@leedsexplore](https://github.com/leedsexplore))
- Parent hull: [SpaceX Starship](https://www.printables.com/model/225040-spacex-starship) by **Josh1297** (@Josh1297_194747)
- Flap planforms: [SpaceX Starship Block 2 (1:144)](https://www.printables.com/model/1314176-spacex-starship-block-2-1144-scale) by **anventia**
- License: [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/)
- See [ATTRIBUTION.md](ATTRIBUTION.md)

## Printables

Still local for now — when publishing, ship sample + original STLs and link here for customization. Use **PNG cover** for gallery images; replace with a real print photo when you have one.
