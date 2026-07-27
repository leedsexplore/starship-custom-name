#!/usr/bin/env python3
"""Cleaned solid Starship flaps — notches filled, sharp aft tip, no panel lines."""
from __future__ import annotations
import json, struct, sys
from pathlib import Path
import numpy as np
import trimesh
from PIL import Image, ImageDraw
from shapely.geometry import MultiPolygon, Polygon
from shapely.ops import unary_union
from stl_util import download_printables_stl, is_valid_binary_stl

ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "assets" / "flaps_cleaned" / "source"
OUT_DIR = ROOT / "assets" / "flaps_cleaned"
MODEL_ID = "1314176"
PART_IDS = {"aft_flap.stl": "5521235", "fwd_flap.stl": "5521252"}

def write_binary_stl(path, mesh, header):
    faces, verts, normals = mesh.faces, mesh.vertices, mesh.face_normals
    out = bytearray(header[:80].ljust(80, b"\0"))
    out += struct.pack("<I", len(faces))
    for i in range(len(faces)):
        n = normals[i]; a,b,c = verts[faces[i]]
        out += struct.pack("<12fH", float(n[0]),float(n[1]),float(n[2]), float(a[0]),float(a[1]),float(a[2]), float(b[0]),float(b[1]),float(b[2]), float(c[0]),float(c[1]),float(c[2]), 0)
    path.write_bytes(out)

def largest_body(mesh):
    return max(mesh.split(only_watertight=False), key=lambda m: len(m.faces))

def frame_for_flap(mesh, *, prefer_world_thin):
    v = mesh.vertices; c = v.mean(0); extents = mesh.extents
    if prefer_world_thin:
        thin = int(np.argmin(extents)); axes = [0,1,2]; axes.remove(thin)
        t = np.zeros(3); t[thin] = 1.0
        u = np.zeros(3); u[axes[1] if extents[axes[1]] > extents[axes[0]] else axes[0]] = 1.0
        R = np.vstack([u, np.cross(t, u), t]); c = (mesh.bounds[0]+mesh.bounds[1])/2
        return c, R
    _,_,vt = np.linalg.svd(v-c, full_matrices=False)
    R = vt.copy()
    if np.linalg.det(R) < 0: R[1] *= -1
    return c, R

def fill_notches(poly, radius=2.0, simplify=0.12):
    closed = poly.buffer(radius, join_style=2).buffer(-radius, join_style=2)
    if isinstance(closed, MultiPolygon): closed = max(closed.geoms, key=lambda g: g.area)
    if not closed.is_valid: closed = closed.buffer(0)
    closed = closed.simplify(simplify, preserve_topology=True)
    if isinstance(closed, MultiPolygon): closed = max(closed.geoms, key=lambda g: g.area)
    return closed

def orient_canonical(closed):
    """
    Orient the true planform into the posing frame used by
    build_ship_with_cleaned_flaps.py: X = chord (hinge/root at x=0, flap extends
    +x), Y = span (bottom at y=0).

    The hinge is the longest edge of the outline (it carries the mount notches
    in the source parts). Both Block 2 flaps taper toward the top when mounted
    (fwd fades into the nose, aft ends in the sharp root-side tip), so the
    wide, full-chord end goes at the bottom.
    """
    arr = np.asarray(closed.exterior.coords[:-1], float)
    n = len(arr)
    best = max(range(n), key=lambda i: float(np.linalg.norm(arr[(i + 1) % n] - arr[i])))
    a, b = arr[best], arr[(best + 1) % n]
    tang = (b - a) / np.linalg.norm(b - a)
    ang = float(np.arctan2(tang[1], tang[0]) - np.pi / 2)  # hinge -> vertical
    ca, sa = np.cos(-ang), np.sin(-ang)
    R = np.array([[ca, -sa], [sa, ca]], float)
    rot = (arr - a) @ R.T
    # Flap extends away from the hinge in +x
    if float(rot[:, 0].mean()) < 0:
        rot[:, 0] *= -1
    # Full-chord end down: compare planform area in the bottom vs top third
    from shapely.geometry import box

    poly = Polygon(rot)
    if not poly.is_valid:
        poly = poly.buffer(0)
    ymin, ymax = float(rot[:, 1].min()), float(rot[:, 1].max())
    third = (ymax - ymin) / 3.0
    xlo, xhi = float(rot[:, 0].min()) - 1.0, float(rot[:, 0].max()) + 1.0
    bottom_area = poly.intersection(box(xlo, ymin, xhi, ymin + third)).area
    top_area = poly.intersection(box(xlo, ymax - third, xhi, ymax)).area
    if top_area > bottom_area:
        rot[:, 1] *= -1
    rot[:, 0] -= rot[:, 0].min()
    rot[:, 1] -= rot[:, 1].min()
    solid = Polygon(rot)
    if not solid.is_valid:
        solid = solid.buffer(0)
    if isinstance(solid, MultiPolygon):
        solid = max(solid.geoms, key=lambda g: g.area)
    return solid


def solidify(poly, prefer_world_thin):
    """Keep the true source planform: fill hinge notches, then orient for posing."""
    del prefer_world_thin  # planform no longer idealized per-flap
    closed = fill_notches(poly, 2.0, 0.12)
    return orient_canonical(closed)


def bake_canonical_frame(mesh: trimesh.Trimesh) -> trimesh.Trimesh:
    """
    World frame for posing: X=chord (root at 0), Y=span (bottom at 0), Z=thickness centered.
    Bottom edge is leveled horizontal in XY.
    """
    from shapely.geometry import MultiPoint

    v = mesh.vertices
    c = v.mean(0)
    _, _, vt = np.linalg.svd(v - c, full_matrices=False)
    R = vt.copy()
    if np.linalg.det(R) < 0:
        R[1] *= -1
    local = (v - c) @ R.T
    sizes = local.max(0) - local.min(0)
    thin = int(np.argmin(sizes))
    axes = [i for i in range(3) if i != thin]
    a0, a1 = axes
    span_ax, chord_ax = (a0, a1) if sizes[a0] >= sizes[a1] else (a1, a0)
    pts = np.column_stack([local[:, chord_ax], local[:, span_ax], local[:, thin]])

    def side_root_len(x_lo, x_hi):
        # longest near-vertical edge in band (same idea as orient)
        best = 0.0
        # approximate from point y-span of near-vertical face edges
        band = pts[(pts[:, 0] >= x_lo) & (pts[:, 0] <= x_hi)]
        if len(band) < 2:
            return 0.0
        return float(band[:, 1].max() - band[:, 1].min())

    cmin, cmax = float(pts[:, 0].min()), float(pts[:, 0].max())
    cspan = max(cmax - cmin, 1e-6)
    # Prefer side with longer vertical extent as root — for aft tip spike, also
    # prefer the side whose bottom is higher (root bottom > tip bottom).
    left = pts[pts[:, 0] <= cmin + 0.15 * cspan]
    right = pts[pts[:, 0] >= cmax - 0.15 * cspan]
    left_h = float(left[:, 1].max() - left[:, 1].min()) if len(left) else 0.0
    right_h = float(right[:, 1].max() - right[:, 1].min()) if len(right) else 0.0
    left_bot = float(left[:, 1].min()) if len(left) else 0.0
    right_bot = float(right[:, 1].min()) if len(right) else 0.0
    # Tip hangs lower; root bottom is higher. Flip if right looks like root.
    if (right_h > left_h * 0.92 and right_bot > left_bot + 1.0) or (
        right_h > left_h and abs(right_bot - left_bot) < 1.0
    ):
        pts[:, 0] *= -1
    pts[:, 0] -= pts[:, 0].min()
    pts[:, 1] -= pts[:, 1].min()
    pts[:, 2] -= 0.5 * (pts[:, 2].min() + pts[:, 2].max())

    uv = pts[:, :2]
    hull = MultiPoint([tuple(map(float, p)) for p in uv]).convex_hull
    coords = np.asarray(hull.exterior.coords)
    cent = np.asarray(hull.centroid.coords[0], float)
    best = None
    for i in range(len(coords) - 1):
        a, b = coords[i], coords[i + 1]
        edge = b - a
        leng = float(np.linalg.norm(edge))
        if leng < 3.0:
            continue
        tang = edge / leng
        normal = np.array([tang[1], -tang[0]], float)
        mid = 0.5 * (a + b)
        if float(np.dot(cent - mid, normal)) > 0:
            normal = -normal
        if normal[1] > -0.2:
            continue
        score = (-float(normal[1]) * leng, -float(mid[1]))
        if best is None or score > best[0]:
            best = (score, a, tang)
    if best is not None:
        _, a, tang = best
        ang = float(np.arctan2(tang[1], tang[0]))
        ca, sa = np.cos(-ang), np.sin(-ang)
        R2 = np.array([[ca, -sa], [sa, ca]], float)
        uv2 = (uv - a) @ R2.T
        if float(uv2[:, 1].mean()) < 0:
            uv2[:, 1] *= -1
        umin, umax = float(uv2[:, 0].min()), float(uv2[:, 0].max())
        left = uv2[uv2[:, 0] <= umin + 0.12 * (umax - umin)]
        right = uv2[uv2[:, 0] >= umax - 0.12 * (umax - umin)]
        lh = float(left[:, 1].max() - left[:, 1].min()) if len(left) else 0.0
        rh = float(right[:, 1].max() - right[:, 1].min()) if len(right) else 0.0
        if rh > lh:
            uv2[:, 0] *= -1
        uv2[:, 0] -= uv2[:, 0].min()
        uv2[:, 1] -= uv2[:, 1].min()
        pts = np.column_stack([uv2[:, 0], uv2[:, 1], pts[:, 2]])

    out = mesh.copy()
    out.vertices = pts
    trimesh.repair.fix_normals(out)
    return out

def raster_polygon(xy, faces, res=0.035, simplify=0.12):
    from skimage import measure
    xmin, ymin = xy.min(0)-0.5; xmax, ymax = xy.max(0)+0.5
    scale = 1/res
    w = int(np.ceil((xmax-xmin)*scale))+1; h = int(np.ceil((ymax-ymin)*scale))+1
    img = Image.new("L", (w,h), 0); draw = ImageDraw.Draw(img)
    for f in faces:
        draw.polygon([((xy[i,0]-xmin)*scale, (xy[i,1]-ymin)*scale) for i in f], fill=255)
    polys = []
    for cont in measure.find_contours(np.asarray(img) > 127, 0.5):
        coords = [(float(x)*res+xmin, float(y)*res+ymin) for y,x in cont]
        if len(coords) < 4: continue
        p = Polygon(coords)
        if not p.is_valid: p = p.buffer(0)
        if isinstance(p, MultiPolygon): p = max(p.geoms, key=lambda g: g.area)
        if p.area > 2: polys.append(p)
    if not polys: raise RuntimeError("no silhouette")
    union = unary_union(polys)
    if isinstance(union, MultiPolygon): union = max(union.geoms, key=lambda g: g.area)
    cleaned = union.buffer(-res*0.8).buffer(res*0.8)
    if isinstance(cleaned, MultiPolygon): cleaned = max(cleaned.geoms, key=lambda g: g.area)
    cleaned = cleaned.simplify(simplify, preserve_topology=True)
    if not cleaned.is_valid: cleaned = cleaned.buffer(0)
    return cleaned

def make_plain(mesh, *, prefer_world_thin):
    main = largest_body(mesh)
    c, R = frame_for_flap(main, prefer_world_thin=prefer_world_thin)
    local = (main.vertices - c) @ R.T
    nloc = main.face_normals @ R.T
    flat = np.abs(nloc[:,2]) > 0.8
    if flat.sum() < 20: flat = np.abs(nloc[:,2]) > 0.55
    fv = main.vertices[main.faces[flat]].reshape(-1,3)
    fl = (fv - c) @ R.T
    zc = float(np.median(fl[:,2]))
    thick = float(main.extents[int(np.argmin(main.extents))]) if prefer_world_thin else float(np.percentile(fl[:,2],98)-np.percentile(fl[:,2],2))
    use = main.faces[flat] if flat.sum() > 40 else main.faces
    poly = raster_polygon(local[:,:2], use)
    solid = solidify(poly, prefer_world_thin)
    # Extrude the already-oriented solid (root left / bottom down). Stay in that
    # frame — reapplying R then re-baking PCA often swaps chord/span.
    out = trimesh.creation.extrude_polygon(solid, height=thick)
    out.vertices[:, 2] -= thick / 2
    out.vertices[:, 0] -= float(out.vertices[:, 0].min())
    out.vertices[:, 1] -= float(out.vertices[:, 1].min())
    trimesh.repair.fix_normals(out)
    out = out.process(validate=True)
    c_out = out.vertices.mean(0)
    R_out = np.eye(3)
    return out, c_out, R_out

def render_preview(mesh, c, R, path):
    v = mesh.vertices
    u = (v-c)@R[0]; vv = (v-c)@R[1]
    span = max(float(u.max()-u.min()), float(vv.max()-vv.min())) or 1
    cx, cy = float(u.min()+u.max())/2, float(vv.min()+vv.max())/2
    half = span*0.55; size=512
    img = Image.new("RGB", (size,size), (20,22,28)); draw = ImageDraw.Draw(img)
    cents = mesh.vertices[mesh.faces].mean(1); depth = (cents-c)@R[2]
    for fi in np.argsort(depth):
        pts = []
        for vi in mesh.faces[fi]:
            pts.append((int(((u[vi]-cx)/half)*size/2+size/2), int(-((vv[vi]-cy)/half)*size/2+size/2)))
        n = abs(float(mesh.face_normals[fi]@R[2])); s = int(70+160*n)
        draw.polygon(pts, fill=(int(s*0.45), int(s*0.68), s))
    path.write_bytes(b"")  # ensure parent
    img.save(path)

def main():
    SRC_DIR.mkdir(parents=True, exist_ok=True); OUT_DIR.mkdir(parents=True, exist_ok=True)
    paths = {}
    for name, fid in PART_IDS.items():
        dest = SRC_DIR / name
        download_printables_stl(file_id=fid, model_id=MODEL_ID, dest=dest, min_faces=100)
        paths[name] = dest
    # aft: world-thin (plate is world-axis aligned). fwd: PCA thin (source hinge mass fools world extents).
    for src_name, out_name, world_thin in [("aft_flap.stl","aft_flap_clean.stl",True),("fwd_flap.stl","fwd_flap_clean.stl",False)]:
        src = trimesh.load_mesh(paths[src_name], force="mesh")
        plain, c, R = make_plain(src, prefer_world_thin=world_thin)
        dest = OUT_DIR / out_name
        write_binary_stl(dest, plain, f"cleaned {out_name}".encode())
        assert is_valid_binary_stl(dest)
        render_preview(plain, c, R, OUT_DIR / out_name.replace(".stl","_preview.png"))
        print(f"{out_name}: {len(plain.faces)} faces extents={plain.extents}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
