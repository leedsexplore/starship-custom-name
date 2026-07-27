// Starship Custom Name — OpenSCAD path (v2.4.17)
// Tool: David Leeds — https://github.com/leedsexplore/starship-custom-name
// Remix of Josh1297's SpaceX Starship
// https://www.printables.com/model/225040-spacex-starship
// License: CC BY-NC (same as parent). Attribution: Josh1297 (+ credit this remix if you share).
//
// Prefer the web customizer (repo root) for wrap-to-hull, boolean engraved STL/3MF,
// PNG covers, and share links. This OpenSCAD file is the advanced flat path for the
// classic remix mesh — Original CAD naming is web-only.
//
// How to customize:
//   1. Open this file in OpenSCAD
//   2. Customizer → set Name / Font / Style / placement
//   3. Part = "text_only" → F6 → Export STL, then merge with the ship in your slicer
//      OR Part = "preview_with_ship" for a local boolean preview (engraved = difference)
//
// Web font → OpenSCAD mapping (install the font on your system):
//   optimer-bold / helvetiker-bold  → Liberation Sans:style=Bold
//   optimer-regular / helvetiker-regular → Liberation Sans:style=Regular
//   gentilis-bold → Gentium Book Basic:style=Bold (if available)
//
// Depth note: web "depth" is proud height; total extrude ≈ 0.35 embed + proud.
// Here Text_Depth is the full extrude; Surface_Offset ≈ -0.35 embeds into the hull.
// Wrap-to-hull and model scale % are web/export-only.

/* [Text] */
// Name / text on the side of the ship
Name = "";
// Letter height (mm) — matches web customizer range (max 14 mm)
Text_Size = 5; // [3:0.5:14]
// Full letter extrusion (mm). Default matches web: 0.35 embed + 0.5 proud.
Text_Depth = 0.85; // [0.5:0.05:1.5]
// Font (must be installed on your system)
Font = "Liberation Sans:style=Bold"; // [Liberation Sans:style=Bold, Liberation Sans:style=Regular, Gentium Book Basic:style=Bold, Roboto:style=Bold, Open Sans:style=Bold, Montserrat:style=Bold, Oswald:style=Bold, Bebas Neue, Inter:style=Bold]
// Raised emboss, or engraved (cut) — engraved needs Part=preview_with_ship for boolean
Style = "raised"; // [raised, engraved]

/* [Placement] */
// Position along the ship length (Y). Nose is +Y, engines/base are -Y.
// Default matches SpaceX S## markings on the leeward mid-barrel (slightly aft of mid-gap).
Text_Y = -2; // [-60:1:60]
// Which side of the hull
Side = "right"; // [right, left]
// Nudge text along the cross-section (X), mm
Text_X_Offset = 0; // [-8:0.5:8]
// Offset from hull surface (mm). Negative embeds letters; ~0.2mm proud for a light emboss.
Surface_Offset = -0.35; // [-1.5:0.05:2]

/* [Export] */
// text_only = name badge for merging/slicing with the ship
// preview_with_ship = ship + text (engraved uses difference(); may be heavy)
Part = "text_only"; // [text_only, preview_with_ship]

/* [Hidden] */
body_center_x = -22.3;
hull_radius_z = 10.7;
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
