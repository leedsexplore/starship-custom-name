// Tile parts for the two-tone web CAD preview: the windward hull shell plus
// the windward (x>0) halves of all four flaps, which carry tiles on the real
// ship. `use` imports modules without executing the top-level starship() call.
use <starship_parametric.scad>

heat_shield();
flaps_tiles();
