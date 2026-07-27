// Print-scale Raptor bells only (smooth black — no heat-shield bump in the
// web customizer). The MMU black body still comes from export_print_tiles.scad
// (shell + windward flaps + bells as one color).
//
//   openscad -o assets/starship_print_1_200_engines.stl --export-format binstl \
//     openscad/export_print_engines.scad

use <starship_parametric.scad>

print_height_mm = 260.5;
ship_h_m = 52.1;

$fa = 0.5;
$fs = 0.03;

scale(print_height_mm / ship_h_m)
    engine_bells();
