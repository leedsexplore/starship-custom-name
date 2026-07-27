// Print-scale heat-shield shell + windward flap halves ONLY (no Raptor bells).
// Used by the web customizer so hex/bump preview stays off the engines.
// MMU black body remains export_print_tiles.scad (includes bells).
//
//   openscad -o assets/starship_print_1_200_tiles_shell.stl --export-format binstl \
//     openscad/export_print_tiles_shell.scad

use <starship_parametric.scad>

print_height_mm = 260.5;
ship_h_m = 52.1;

$fa = 0.5;
$fs = 0.03;

scale(print_height_mm / ship_h_m)
    union() {
        heat_shield();
        flaps_tiles();
    }
