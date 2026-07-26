# Starship Custom Name

**v1.1.5** · by [David Leeds](https://github.com/leedsexplore) ([@leedsexplore](https://github.com/leedsexplore))

Simple customizer for a Printables remix of [Josh1297’s SpaceX Starship](https://www.printables.com/model/225040-spacex-starship).

Base mesh ships with **6 Raptors** (3 sea-level + 3 vacuum).  
**Type a name → preview colors → download STL, multi-material 3MF, or a PNG cover.**  
License is **CC BY-NC** — credit Josh1297. Tooling by David Leeds.

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
| Model scale | 50–200% (baked into STL/3MF) |
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

## OpenSCAD (optional / advanced)

Most people should use the **web tool**. An offline flat-emboss path lives in `openscad/` (no hull wrap). Prefer the web exporter for wrap, boolean engraved STL/3MF, and PNG covers.

## Version

Bump `APP_VERSION` in [`version.js`](version.js) when shipping user-facing changes (also update cache-bust query params in `index.html` to match).

## Attribution

- Remix / web tool: **David Leeds** ([@leedsexplore](https://github.com/leedsexplore))
- Parent model: [SpaceX Starship](https://www.printables.com/model/225040-spacex-starship) by **Josh1297** (@Josh1297_194747)
- License: [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/)
- See [ATTRIBUTION.md](ATTRIBUTION.md)

## Printables

The Printables listing ships sample + original STLs and links here for customization. Use **PNG cover** for gallery images; replace with a real print photo when you have one.
