# Attribution

## Original work

**Starship Custom Name** — parametric Starship CAD, web customizer, and tooling  
by **David Leeds** ([@leedsexplore](https://github.com/leedsexplore))  
https://github.com/leedsexplore/starship-custom-name  
https://leedsexplore.github.io/starship-custom-name/

The **parametric CAD model** (`openscad/starship_parametric.scad` and every mesh
exported from it — the one-piece 1:200 print STL, the split steel/tile bodies,
hex variants, and the MMU 3MF) is original work modeled from published vehicle
dimensions. It is an **unofficial fan model** (not affiliated with SpaceX);
SpaceX and Starship are trademarks of their respective owners. Licensed
**CC BY 4.0** (https://creativecommons.org/licenses/by/4.0/): remix and share
(including commercial) with credit. Credit David Leeds (leedsexplore) with a link.

Live print files: https://www.printables.com/model/1792868

Web customizer / tooling code remains copyright David Leeds (reuse with
attribution) and is not the same as the CC BY grant on the parametric meshes.

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
under the parent licenses. The original parametric model above is **CC BY 4.0**
(credit David Leeds / leedsexplore).

## Keychain remix mesh

The keychain customizer base (`assets/starship_keychain_6cm.stl` — parent
**6 cm with SpaceX logo**) is a **remix** of:

**SpaceX Starship Keychain** by Oliver Heisel  
https://www.printables.com/model/1082625-spacex-starship-keychain  

License: Creative Commons Attribution–NonCommercial–ShareAlike (CC BY-NC-SA)  
https://creativecommons.org/licenses/by-nc-sa/4.0/

Credit **Oliver Heisel** when sharing remixed keychain files or prints. Remixes
must stay under CC BY-NC-SA (share alike). Commercial use is not allowed.

## Libraries (web customizer)

- [three.js](https://threejs.org/) and addons — MIT
- [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh) / [three-bvh-csg](https://github.com/gkjohnson/three-bvh-csg) — MIT
- [Manifold](https://github.com/elalish/manifold) (`vendor/manifold-3d`, Apache-2.0) — watertight mesh booleans for named STL export
- [fflate](https://github.com/101arrowz/fflate) — MIT

## Fonts

See [fonts/README.md](fonts/README.md). Bundled typefaces are MgOpen/Droid (via three.js) and Google Fonts OFL conversions (via @compai typefaces) for letter extrusion only.
