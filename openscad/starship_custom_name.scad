// Starship with customizable side name — remix of Josh1297's SpaceX Starship
// https://www.printables.com/model/225040-spacex-starship
// License: CC BY-NC (same as parent). Attribution: Josh1297.
//
// How to customize:
//   1. Open this file in OpenSCAD
//   2. Customizer → set Name (and placement if you want)
//   3. Leave Part = "text_only", Render (F6), Export as STL
//   4. In your slicer, load StarShipV2_original.stl + your text STL together
//      (or run ../scripts/merge_stls.py to bake one file)
//
// Prefer the web customizer at the repo root (index.html) for most users.

/* [Text] */
// Name / text on the side of the ship
Name = "Custom Name";
// Letter height (mm)
Text_Size = 5; // [3:0.5:14]
// Letter extrusion depth (mm). Most of this sinks into the hull; a bit stays proud.
Text_Depth = 0.65; // [0.3:0.1:2.5]
// Font (must be installed on your system)
Font = "Liberation Sans:style=Bold";
// Raised emboss, or engraved (cut) — engraved needs Part=preview boolean locally
Style = "raised"; // [raised, engraved]

/* [Placement] */
// Position along the ship length (Y). Nose is +Y, engines/base are -Y.
// Mid-body on the main cylinder (between forward and aft flaps).
Text_Y = -2; // [-50:1:50]
// Which side of the hull
Side = "right"; // [right, left]
// Nudge text along the cross-section (X), mm
Text_X_Offset = 0; // [-8:0.5:8]
// Offset from hull surface (mm). Negative embeds letters; ~0.2mm proud for a light emboss.
Surface_Offset = -0.35; // [-1.5:0.05:2]

/* [Export] */
// text_only = name badge for merging/slicing with the ship
// preview_with_ship = ship + text (preview only; may not export cleanly)
Part = "text_only"; // [text_only, preview_with_ship]

/* [Hidden] */
body_center_x = -22.3;
hull_radius_z = 10.55;
stl_file = "../assets/StarShipV2_original.stl";

module ship() {
    import(stl_file, convexity=10);
}

module name_plate() {
    z_sign = Side == "right" ? 1 : -1;
    z0 = Style == "raised"
        ? z_sign * (hull_radius_z + Surface_Offset)
        : z_sign * hull_radius_z;

    translate([body_center_x + Text_X_Offset, Text_Y, z0])
        rotate([Side == "right" ? 0 : 180, 0, 90])
            mirror([0, 0, Style == "engraved" ? 1 : 0])
                linear_extrude(height = Text_Depth, convexity = 8)
                    text(
                        Name,
                        size = Text_Size,
                        font = Font,
                        halign = "center",
                        valign = "center",
                        $fn = 32
                    );
}

if (Part == "preview_with_ship") {
    if (Style == "engraved") {
        difference() {
            ship();
            name_plate();
        }
    } else {
        ship();
        name_plate();
    }
} else {
    name_plate();
}
