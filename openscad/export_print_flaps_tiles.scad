// Windward flap halves only (print scale) — solid body for the hex MMU black
// assembly without open submesh extracts.
use <starship_parametric.scad>

print_height_mm = 260.5;
ship_h_m = 52.1;

$fa = 0.5;
$fs = 0.03;

scale(print_height_mm / ship_h_m)
    flaps_tiles();
