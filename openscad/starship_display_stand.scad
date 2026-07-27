// Desk stand + blank nameplate for the 1:200 nose-up Starship print.
// Ship skirt ≈ Ø45.0 mm; engines flush with Z=0.
//
// Part = "stand" | "nameplate" | "both"
// Export wrappers: openscad/export_display_stand.scad, export_nameplate.scad

Part = "both"; // [stand, nameplate, both]

$fa = 1;
$fs = 0.4;

// ---- stand (ring cradle) ----
ship_od     = 45.0;   // measured mid-barrel / skirt OD at 1:200
clearance   = 0.6;    // radial slip fit
inner_d     = ship_od + clearance * 2; // ~46.2
outer_d     = 66;
stand_h     = 10;
recess_d    = 2.2;    // how deep the skirt sits into the ring
wall_t      = (outer_d - inner_d) / 2;
rib_n       = 4;
rib_w       = 2.4;
rib_in      = 1.2;    // ribs poke inward from the ring ID

module stand_ring() {
  difference() {
    // Outer body
    cylinder(h = stand_h, d = outer_d, center = false);
    // Main bore — ship drops in from above
    translate([0, 0, recess_d])
      cylinder(h = stand_h + 1, d = inner_d, center = false);
    // Through-hole so engines / skirt can be seen from below (slightly smaller)
    translate([0, 0, -0.1])
      cylinder(h = recess_d + 0.2, d = inner_d - 3.0, center = false);
    // Nameplate dovetail pocket on +Y face
    translate([0, outer_d / 2 - 1.2, stand_h / 2])
      rotate([90, 0, 0])
        cube([42, 3.2, 4], center = true);
  }
  // Anti-spin ribs on the floor of the recess
  for (i = [0:rib_n - 1]) {
    rotate([0, 0, i * 360 / rib_n + 20])
      translate([inner_d / 2 - rib_in / 2 - 0.2, 0, recess_d / 2])
        cube([rib_in + 0.8, rib_w, recess_d], center = true);
  }
}

// ---- blank nameplate (slot into stand front) ----
plate_w = 56;
plate_h = 16;
plate_t = 2.0;
tab_w   = 40;
tab_t   = 2.6;
tab_d   = 3.5;

module nameplate() {
  union() {
    // Face
    translate([0, 0, plate_t / 2])
      cube([plate_w, plate_h, plate_t], center = true);
    // Tab that slides into the stand pocket
    translate([0, plate_h / 2 + tab_d / 2 - 0.2, plate_t / 2])
      cube([tab_w, tab_d, tab_t], center = true);
  }
}

if (Part == "stand") stand_ring();
else if (Part == "nameplate") nameplate();
else {
  stand_ring();
  translate([0, outer_d / 2 + 18, 0]) nameplate();
}
