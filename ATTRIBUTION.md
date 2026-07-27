# Attribution

## Original work

**Starship Custom Name** — parametric Starship CAD, web customizer, and tooling  
by **David Leeds** ([@leedsexplore](https://github.com/leedsexplore))  
https://github.com/leedsexplore/starship-custom-name  
https://leedsexplore.github.io/starship-custom-name/

The **parametric CAD model** (`openscad/starship_parametric.scad` and every mesh
exported from it — the one-piece 1:200 print STL, the split steel/tile bodies,
and the MMU 3MF) is original work modeled from published vehicle dimensions.
It is licensed **CC BY-NC 4.0**
(https://creativecommons.org/licenses/by-nc/4.0/): remix and share with credit —
non-commercial only. Credit David Leeds (leedsexplore) with a link.

## Legacy remix mesh (v1.x customizer option)

The classic customizer base mesh (`assets/StarShipV2_original.stl`,
`assets/StarShipV2_no_flaps.stl`, `assets/StarShipV2_cleaned_flaps.stl`,
`assets/flaps_cleaned/`) is a **remix** of:

**SpaceX Starship** by Josh1297  
https://www.printables.com/model/225040-spacex-starship  

Hull, engines, and overall print scale of the legacy mesh come from Josh1297's model.

**SpaceX Starship Block 2 (1:144)** by anventia  
https://www.printables.com/model/1314176-spacex-starship-block-2-1144-scale  

Forward/aft flap planforms are cleaned from anventia's structural flap STLs, then
scaled and posed onto the Josh hull (`scripts/build_cleaned_flaps.py`,
`scripts/build_ship_with_cleaned_flaps.py`).

License for the legacy mesh and any STL that includes it:
Creative Commons Attribution–NonCommercial (CC BY-NC)  
https://creativecommons.org/licenses/by-nc/4.0/

You must credit **Josh1297** and **anventia** when you share remixed files or
prints derived from the legacy mesh. Commercial use of that mesh is not allowed
under the parent licenses. The original parametric model above is also
**CC BY-NC** (credit David Leeds / leedsexplore; non-commercial).

## Fonts

See [fonts/README.md](fonts/README.md). Bundled typefaces are MgOpen/Droid (via three.js) and Google Fonts OFL conversions (via @compai typefaces) for letter extrusion only.
