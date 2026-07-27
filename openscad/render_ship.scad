// Render scene for the base ship mesh (no custom text).
// Used by CLI renders: 2D orthographic side view + 3D perspective view.
//
//   openscad -o out.png --projection=o --autocenter --viewall \
//     --camera=0,0,0,90,0,0,500 openscad/render_ship.scad
//
// The STL's long axis is Y (nose +Y, base -Y); rotate it upright so the
// nose points +Z and the ship stands on the XY plane.

rotate([90, 0, 0])
    import("../assets/StarShipV2_original.stl", convexity = 10);
