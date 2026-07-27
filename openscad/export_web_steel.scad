// Steel parts only (hull + leeward flap halves) for the web CAD preview.
// Engine bells, the dark bay interior, and the tile parts are exported
// separately so the viewer can give each its own material.
use <starship_parametric.scad>

hull_body();
flaps_steel();
