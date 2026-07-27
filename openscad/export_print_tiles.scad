// Print-scale export of the BLACK body only (heat-shield tile shell + windward
// flap halves + Raptor bells), scaled meters → mm at 1:200. Pairs with
// export_print_steel.scad; scripts/build_mmu_3mf.py zips both into a
// two-color 3MF for MMU3 / color-change printing.
//
// The tile shell is 0.45 mm proud at this scale — one clean perimeter with a
// 0.4 mm nozzle.
//
//   openscad -o tiles.stl openscad/export_print_tiles.scad

use <starship_parametric.scad>

print_height_mm = 260.5;
ship_h_m = 52.1;

$fa = 5;
$fs = 0.35;

scale(print_height_mm / ship_h_m)
    union() {
        heat_shield();
        flaps_tiles();
        engine_bells();
    }
