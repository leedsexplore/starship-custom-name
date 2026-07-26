# Starship Custom Name

Simple customizer for a Printables remix of [Josh1297’s SpaceX Starship](https://www.printables.com/model/225040-spacex-starship).

**Type a name → preview a color → download an STL.**  
Color is preview-only (pick filament in your slicer). License is **CC BY-NC** — credit Josh1297.

## Use the web tool

1. Open the GitHub Pages site for this repo (or run locally — see below).
2. Enter your hull text and optional preview color.
3. Click **Download STL**.
4. Slice and print (vertical + supports, same as the original).

### Run locally

```bash
cd starship-custom-name
python3 -m http.server 8080
# open http://127.0.0.1:8080/
```

> The page must be served over HTTP so the browser can load the STL and font.

## OpenSCAD (advanced)

```bash
open openscad/starship_custom_name.scad
```

Use the Customizer for name/placement, export `text_only`, then:

```bash
python3 scripts/merge_stls.py \
  openscad/StarShipV2_original.stl \
  your_text.stl \
  my_starship.stl
```

## Attribution

- Parent model: [SpaceX Starship](https://www.printables.com/model/225040-spacex-starship) by **Josh1297** (@Josh1297_194747)
- License: [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/)
- See [ATTRIBUTION.md](ATTRIBUTION.md)

## Printables

After you publish the remix on Printables, link this tool from the model description so downloaders can customize without installing OpenSCAD.
