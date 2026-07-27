# Cleaned Starship flaps

Solid, print-friendly flap plates derived from anventia’s Block 2 structural fins — notches filled, sharp aft tip, no panel lines.

| File | Notes |
|------|--------|
| `aft_flap_clean.stl` | Aft flap solid (source planform) |
| `fwd_flap_clean.stl` | Forward flap solid (source planform) |
| `preview.html` | Local Three.js orbit preview of both parts |

These standalone parts are scaled and posed onto the Josh hull by:

```bash
python3 scripts/build_ship_with_cleaned_flaps.py
```

→ writes `assets/StarShipV2_cleaned_flaps.stl` for the **Starship Custom Name** web tool.

Placement (tuned to real Starship proportions on this hull):

| Flap | Y range (approx) | Notes |
|------|------------------|--------|
| Aft | −58 → −31 mm | Bottom flush with hull base rim; hinge on ±X wall |
| Fwd | +31 → +45 mm | Shoulder; horizontal bottom edge; local radius snap |

### Rebuild flap solids

Downloads Printables sources into `source/` (gitignored), then regenerates `*_clean.stl`:

```bash
python3 scripts/build_cleaned_flaps.py
```

### Preview

From the repo root:

```bash
python3 -m http.server 8080
# open http://127.0.0.1:8080/assets/flaps_cleaned/preview.html
```

### Source / license

[SpaceX Starship Block 2 (1:144)](https://www.printables.com/model/1314176-spacex-starship-block-2-1144-scale) by **anventia** — CC BY-NC.  
Hull placement follows Josh1297’s [SpaceX Starship](https://www.printables.com/model/225040-spacex-starship) (also CC BY-NC).
