// Parametric SpaceX Starship (ship only), in meters.
//
// Geometry is original CAD from published vehicle dimensions (52.1 m × Ø9 m).
// Vertical feature proportions use DRAW_K so the model lands at true spec height.
//
// Build previews and meshes with: python3 scripts/build_starship_cad.py

// Circumference smoothness: fragment count is min(360/$fa, π·D/$fs).
// Hull Ø9 m needs a small $fs or $fs caps segments far below $fa's intent
// (e.g. $fs=0.1 → only ~283 facets → obvious vertical flats in preview).
$fa = 0.5;
$fs = 0.03;

// ---- master dimensions ----
ship_h  = 52.1;   // published ship height
hull_d  = 9.0;    // published hull diameter
hull_r  = hull_d / 2;

DRAWN_H = 48.90;  // historical proportion lock (model lands at ship_h via DRAW_K)
DRAW_K  = ship_h / DRAWN_H;

// ---- hull ----
// Spherically-blunted tangent ogive: a stretched ogive capped by a sphere so
// the tip is rounded like the real vehicle, not a sharp spike. The blunted
// apex lands at ~12.58 m, keeping the ship at its published overall height.
nose_len   = 12.97;          // ogive length before blunting
nose_tip_r = 0.60;           // radius of the spherical nose cap

ogive_R = (hull_r * hull_r + nose_len * nose_len) / (2 * hull_r);
function ogive_x(z) = sqrt(ogive_R * ogive_R - z * z) - (ogive_R - hull_r);

nose_zc = sqrt(pow(ogive_R - nose_tip_r, 2) - pow(ogive_R - hull_r, 2));
nose_yt = nose_tip_r * (ogive_R - hull_r) / (ogive_R - nose_tip_r);
nose_zt = nose_zc + sqrt(nose_tip_r * nose_tip_r - nose_yt * nose_yt);
nose_h  = nose_zc + nose_tip_r;   // blunted apex height (~12.58 m)
cyl_h   = ship_h - nose_h;        // shoulder height above base

// Nose radius at height z above the shoulder: ogive up to the tangency point,
// spherical cap above it.
function nose_x(z) =
    z <= nose_zt
        ? ogive_x(z)
        : sqrt(max(nose_tip_r * nose_tip_r - pow(z - nose_zc, 2), 0));

// (Weld-ring seams removed — they read as harsh horizontal lines at 1:200.)

// ---- flaps ----
// Planform is a right trapezoid: horizontal bottom edge, vertical outer edge up
// to the knee, then a diagonal leading edge sweeping back to the hull.
// Values re-measured from published Starship elevations / dimensions that
// scale to exactly 52.1 m at a 9 m hull, so they are true meters — no DRAW_K here.
fwd_z0    = 38.8;                        // just below the shoulder
fwd_z1    = 44.7;                        // tip fades into the nose at 85.8%
fwd_span  = fwd_z1 - fwd_z0;
fwd_tip_r = 7.34;                        // 1.63x hull radius
fwd_root  = 2.40;                        // inboard of the nose wall at fwd_z1
fwd_knee  = 0.40;
fwd_thick = 0.60;   // at the hinge; tip floored for 0.4 mm nozzle printability

aft_z0    = 0.0;                         // bottom edge level with the base
aft_z1    = 11.5;                        // root tip at ~22% of ship height
aft_span  = aft_z1 - aft_z0;
aft_tip_r = 7.97;                        // 1.77x hull radius
aft_root  = 4.45;   // embedded in the thin skirt wall — must stay outside
                    // the engine bay recess or it shows from below
aft_knee  = 0.565;
aft_thick = 0.80;   // at the hinge; tip floored for 0.4 mm nozzle printability

// Tip half-thickness in meters. Keep the blade taper, but never go below
// ~1.8 mm total at 1:200 (0.36 m) — thinner tips slice as bridge artifacts.
function flap_tip_half(thick) = max(thick * 0.15, 0.18);

// ---- engine bay ----
// 3 sea-level Raptors clustered on the axis, 3 vacuum Raptors on an outer ring.
// Published Raptor exit diameters: sea-level 1.3 m, vacuum 2.4 m.
// Bell exit planes sit flush with the base (z=0) — nothing pokes below the
// skirt. The interior plate stays silver so the black bells read against it,
// and the skirt wall is thin so the bells fill the opening from below.
skirt_t    = 0.08;                 // radial wall thickness at the base
bay_wall_r = hull_r - skirt_t;     // 4.42 m
bay_recess = 3.00;                 // deep chamber — interior plate sits high
sl_r  = 0.65;  sl_ring  = 0.85;
vac_r = 1.20;  vac_ring = 3.15;    // outer tip at 4.35, 7 cm inside bay wall

// ---- heat shield ----
// Windward tile field as a single raised shell rather than per-tile geometry,
// which keeps the model light enough to render and slice.
tile_t     = 0.09;
tile_wrap  = 190;  // degrees of circumference covered
show_tiles = true;

steel      = [0.78, 0.78, 0.80];
steel_dark = [0.70, 0.70, 0.72];
tile_black = [0.13, 0.13, 0.14];
bay_gray   = [0.62, 0.62, 0.66];   // silver interior plate — contrast for bells
bell_black = [0.07, 0.07, 0.08];

// Outer hull surface, optionally grown by `extra` (used to build the tile shell).
module hull_solid(extra = 0) {
    r = hull_r + extra;
    union() {
        // Plain cylinder — no weld-ring bands. Circumference smoothness comes
        // from global $fa/$fs (print exports use ~0.5° → ~720 segments).
        cylinder(h = cyl_h, r = r);
        translate([0, 0, cyl_h])
            rotate_extrude()
                polygon(concat(
                    [[0, 0]],
                    // sine-spaced heights cluster samples at the apex so the small
                    // spherical cap stays round instead of ending in a flat facet
                    [for (i = [0 : 128]) let (z = nose_h * sin(90 * i / 128))
                        [max(nose_x(z) + extra, 0.001), z]],
                    [[0, nose_h]]
                ));
    }
}

module hull_body() {
    color(steel)
        difference() {
            hull_solid();
            // Open the engine bay cavity — the dark bay_bulkhead plate covers
            // the ceiling so no shiny steel shows behind the bells.
            translate([0, 0, -0.01]) cylinder(h = bay_recess + 0.10, r = bay_wall_r);
        }
}

module heat_shield() {
    color(tile_black)
        intersection() {
            difference() {
                hull_solid(tile_t);
                hull_solid();
            }
            // wedge covering the windward side
            rotate([0, 0, -tile_wrap / 2])
                linear_extrude(height = ship_h + 1)
                    polygon(concat([[0, 0]],
                        [for (a = [0 : 5 : tile_wrap])
                            [(hull_r + 1) * cos(a), (hull_r + 1) * sin(a)]]));
        }
}

module bay_bulkhead() {
    // Silver interior plate closing the bay ceiling. Exported as its own mesh
    // so the viewer can light it separately from the outer hull. Slightly
    // oversized (radius into the skirt wall, top past the cavity cut) so the
    // one-piece union has real overlaps — exact tangency left sealed void
    // shells in the print mesh.
    color(bay_gray)
        translate([0, 0, bay_recess - 0.15])
            cylinder(h = 0.30, r = bay_wall_r + 0.04);
}

module engine_bells() {
    // Truncated cones, large exit facing -Z, exit planes flush with the base
    // (z=0) — the bells never protrude below the skirt.
    // Clocking matches the on-orbit aft reference: one RVac toward +X and the
    // SL cluster rotated 60 deg so it nests between the vacuum bells.
    // All six bells reach the thrust plate as solid cones — short SL bells with
    // thin mount stems read as a "support beam" in one-piece monochrome prints.
    vac_h = bay_recess - 0.15;
    color(bell_black) {
        for (a = [60, 180, 300])
            translate([sl_ring * cos(a), sl_ring * sin(a), 0])
                cylinder(h = vac_h + 0.05, r1 = sl_r, r2 = sl_r * 0.45);
        for (a = [0, 120, 240])
            translate([vac_ring * cos(a), vac_ring * sin(a), 0])
                // +0.05 overlap into the plate — exact tangency is fragile in
                // boolean union and slicing.
                cylinder(h = vac_h + 0.05, r1 = vac_r, r2 = vac_r * 0.40);
    }
}

module engine_bay() {
    bay_bulkhead();
    engine_bells();
}

// Flat plate in the x-z plane, extruded through y. The root edge sits inside
// the hull so the union is watertight, and the swept leading edge terminates at
// top_x, which the caller puts just under the hull surface at the flap's top --
// otherwise the tip buries itself in the hull and the flap ends up shorter than
// specified.
module flap(span, root_x, tip_x, top_x, knee, thick) {
    intersection() {
        rotate([90, 0, 0])
            translate([0, 0, -thick])
                linear_extrude(height = 2 * thick)
                    polygon([
                        [root_x, 0],
                        [tip_x, 0],
                        [tip_x, span * knee],
                        [top_x, span],
                        [root_x, span]
                    ]);
        // blade taper: full thickness at the hinge, floored tip for printability
        translate([0, 0, -0.1])
            linear_extrude(height = span + 0.2)
                polygon([
                    [root_x - 0.1, -thick / 2],
                    [tip_x + 0.1, -flap_tip_half(thick)],
                    [tip_x + 0.1,  flap_tip_half(thick)],
                    [root_x - 0.1,  thick / 2]
                ]);
    }
}

// Flaps straddle the windward/leeward boundary at +-90 deg from the tile field
// centerline, which is why both show edge-on in the reference elevation.
// Hull radius at any height, so a flap's leading edge can be made to die into
// the surface instead of vanishing inside it.
function hull_radius_at(z) = z <= cyl_h ? hull_r : nose_x(z - cyl_h);

bite = 0.05;  // how far the leading edge tucks under the skin

module flaps_all() {
    for (s = [90, 270]) rotate([0, 0, s]) {
        translate([0, 0, aft_z0])
            flap(aft_span, aft_root, aft_tip_r,
                 hull_radius_at(aft_z1) - bite, aft_knee, aft_thick);
        translate([0, 0, fwd_z0])
            flap(fwd_span, fwd_root, fwd_tip_r,
                 hull_radius_at(fwd_z1) - bite, fwd_knee, fwd_thick);
    }
}

module flaps() {
    color(steel) flaps_all();
}

// The tile field is centered on +X, and the flaps straddle the boundary at
// +-90 deg, so each flap's windward half is exactly its x>0 half. Split the
// flaps there so the windward halves can carry the tile color/texture.
FLAP_CUT = 200;
module flaps_steel() {
    color(steel)
        difference() {
            flaps_all();
            translate([0, -FLAP_CUT / 2, -FLAP_CUT / 4])
                cube([FLAP_CUT, FLAP_CUT, FLAP_CUT]);
        }
}

module flaps_tiles() {
    color(tile_black)
        intersection() {
            flaps_all();
            translate([0, -FLAP_CUT / 2, -FLAP_CUT / 4])
                cube([FLAP_CUT, FLAP_CUT, FLAP_CUT]);
        }
}

module starship(tiles = show_tiles) {
    // Single solid for STL/3MF print export (OpenSCAD otherwise emits N volumes).
    union() {
        hull_body();
        engine_bay();
        flaps();
        if (tiles) heat_shield();
    }
}

starship();
