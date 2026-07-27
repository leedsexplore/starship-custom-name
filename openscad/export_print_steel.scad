// Print-scale export of the STEEL body only (hull + weld rings + bay plate +
// leeward flap halves), scaled meters → mm at 1:200. Pairs with
// export_print_tiles.scad; scripts/build_mmu_3mf.py zips both into a
// two-color 3MF for MMU3 / color-change printing. Same geometry as the
// single-body print STL — the split exists only for color assignment.
//
//   openscad -o steel.stl openscad/export_print_steel.scad

use <starship_parametric.scad>

print_height_mm = 260.5;
ship_h_m = 52.1;

$fa = 5;
$fs = 0.35;

scale(print_height_mm / ship_h_m)
    union() {
        hull_body();
        bay_bulkhead();
        flaps_steel();
    }
