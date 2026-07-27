// Print-scale export wrapper: the parametric ship is modeled in meters, this
// scales it to millimeters at a chosen overall height and drops the heat-shield
// shell (it is a separate surface body, not printable as part of the hull).
//
// Default height 260.5 mm = Starship V3 ship (52.1 m) at 1:200 — fits a
// Prusa CORE One (250×220×270) standing nose-up with Z margin.
//
//   openscad -o out.stl -D print_height_mm=260.5 openscad/export_print.scad

use <starship_parametric.scad>

print_height_mm = 260.5;
ship_h_m = 52.1;

// Fragment count = min(360/$fa, π·D/$fs). Keep $fs small so the Ø9 m
// hull isn't capped at a few hundred facets (vertical flats).
// ~0.03 m → ~940 segments → ~0.15 mm chords at 1:200.
$fa = 0.5;
$fs = 0.03;

scale(print_height_mm / ship_h_m)
    starship(tiles = false);
