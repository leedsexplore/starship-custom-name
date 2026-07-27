#!/usr/bin/env python3
"""Local validator for printables/starship-parametric (mirrors `printables validate`).

Does not talk to Printables — checks package structure, licenses, file presence,
byte-identity with assets/, and that the hex one-piece STL has many discrete
tile shells (expected for embossed hex plates, not a single solid).
"""

from __future__ import annotations

import struct
import sys
import tomllib
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PKG = ROOT / "printables" / "starship-parametric"
HEX_STL_ASSET = ROOT / "assets" / "starship_ship_print_1_200_hex.stl"
HEX_3MF_ASSET = ROOT / "assets" / "starship_print_1_200_mmu_hex.3mf"
LIVE_MODEL_ID = "1792868"


def fail(msg: str) -> None:
    print(f"FAIL  {msg}")
    raise SystemExit(1)


def ok(msg: str) -> None:
    print(f"ok    {msg}")


def connected_shells(stl: Path) -> list[int]:
    data = stl.read_bytes()
    n = struct.unpack_from("<I", data, 80)[0]
    parent: dict[tuple, tuple] = {}

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    for i in range(n):
        vs = []
        for k in (12, 24, 36):
            v = struct.unpack_from("<fff", data, 84 + i * 50 + k)
            key = (round(v[0], 3), round(v[1], 3), round(v[2], 3))
            if key not in parent:
                parent[key] = key
            vs.append(key)
        union(vs[0], vs[1])
        union(vs[1], vs[2])
    roots: dict[tuple, int] = defaultdict(int)
    for k in parent:
        roots[find(k)] += 1
    return sorted(roots.values(), reverse=True)


def stl_bbox_size(stl: Path) -> tuple[float, float, float]:
    data = stl.read_bytes()
    n = struct.unpack_from("<I", data, 80)[0]
    mn = [1e99, 1e99, 1e99]
    mx = [-1e99, -1e99, -1e99]
    off = 84
    for _ in range(n):
        for k in (12, 24, 36):
            x, y, z = struct.unpack_from("<fff", data, off + k)
            for j, val in enumerate((x, y, z)):
                if val < mn[j]:
                    mn[j] = val
                if val > mx[j]:
                    mx[j] = val
        off += 50
    return mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]


def main() -> None:
    if not PKG.is_dir():
        fail(f"missing package dir {PKG}")

    toml_path = PKG / "printables.toml"
    desc_path = PKG / "DESCRIPTION.md"
    if not toml_path.exists():
        fail("missing printables.toml")
    if not desc_path.exists():
        fail("missing DESCRIPTION.md")

    toml_text = toml_path.read_text()
    if LIVE_MODEL_ID not in toml_text:
        fail(f"printables.toml should reference live model id {LIVE_MODEL_ID}")
    ok(f"printables.toml references model {LIVE_MODEL_ID}")

    meta = tomllib.loads(toml_text)
    # CLI schema uses [listing]; accept legacy [model] as a fallback.
    listing = meta.get("listing") or meta.get("model") or {}
    for key in ("title", "license", "tags"):
        if key not in listing:
            fail(f"printables.toml missing listing.{key}")
    if listing.get("license") not in ("CC BY", "CC BY 4.0", "CC-BY"):
        fail(f"expected CC BY 4.0 for parametric listing, got {listing.get('license')!r}")
    if "remix_of" in listing or "remix_of" in meta:
        fail("original listing must not set remix_of")
    tags = set(listing["tags"])
    for required in ("starship", "mmu3", "singlepiece", "noassembly", "parametric", "scalemodel"):
        if required not in tags:
            fail(f"missing tag {required!r}")
    ok(f"title: {listing['title'][:72]}…")
    ok(f"license={listing['license']}  tags={len(tags)}")

    desc = desc_path.read_text()
    for needle in (
        "one print job",
        "MMU3",
        "leedsexplore.github.io/starship-custom-name",
        "CC BY 4.0",
        "260.5",
        "byte-for-byte",
        "GitHub Releases",
        "Unofficial fan model",
        "Block 2",
        "your name",
        "desk model",
        "no glue",
        "26-part",
        "1:300",
        "Post a Make",
        "mis-labels",
    ):
        if needle.lower() not in desc.lower():
            fail(f"DESCRIPTION.md missing required phrase: {needle!r}")
    ok(f"DESCRIPTION.md ({len(desc)} chars)")

    if str(listing.get("category_id") or "") != "91" and listing.get("category") != "Physics & Astronomy":
        fail("expected category Physics & Astronomy (id 91) for Starship discoverability")
    ok(f"category={listing.get('category')} id={listing.get('category_id')}")

    files_dir = PKG / "files"
    required_files = [
        "starship_1_200_hex_tiles_one_piece.stl",
        "starship_1_200_hex_tiles_mmu.3mf",
        "starship_1_300_hex_tiles_one_piece.stl",
    ]
    for name in required_files:
        p = files_dir / name
        if not p.exists():
            fail(f"missing files/{name}")
        if name.endswith((".stl", ".3mf")) and p.stat().st_size < 1000:
            fail(f"missing/empty files/{name}")
        ok(f"files/{name}  {p.stat().st_size / 1e6:.2f} MB")

    extras = sorted(
        p.name
        for p in files_dir.iterdir()
        if p.is_file() and p.name not in required_files and not p.name.startswith(".")
    )
    if extras:
        fail(f"unexpected files/ entries (keep listing to 3 print files): {extras}")
    ok("files/ has exactly the 3 Printables downloads")

    profiles = PKG / "PRINT_PROFILES.md"
    if not profiles.exists() or profiles.stat().st_size < 100:
        fail("missing PRINT_PROFILES.md at package root")
    ok("PRINT_PROFILES.md present")

    mirrors = PKG.parent / "mirrors" / "README.md"
    if not mirrors.exists():
        fail("missing printables/mirrors/README.md")
    ok("cross-post mirrors README present")

    pkg_stl = files_dir / "starship_1_200_hex_tiles_one_piece.stl"
    pkg_3mf = files_dir / "starship_1_200_hex_tiles_mmu.3mf"
    if not HEX_STL_ASSET.exists() or not HEX_3MF_ASSET.exists():
        fail("missing hex assets under assets/ (rebuild before validate)")
    if pkg_stl.read_bytes() != HEX_STL_ASSET.read_bytes():
        fail("package hex STL is not byte-identical to assets/starship_ship_print_1_200_hex.stl")
    if pkg_3mf.read_bytes() != HEX_3MF_ASSET.read_bytes():
        fail("package hex 3MF is not byte-identical to assets/starship_print_1_200_mmu_hex.3mf")
    ok("package hex STL/3MF match assets/ digests")

    images = sorted((PKG / "images").glob("*.png"))
    if len(images) < 4:
        fail(f"need ≥4 gallery images, found {len(images)}")
    cover = PKG / "images" / "01-cover.png"
    if not cover.exists():
        fail("missing cover image 01-cover.png")
    for banned in images:
        name = banned.name.lower()
        if "blueprint" in name or "2d" in name:
            fail(f"do not publish blueprint/2D drawing image: {banned.name}")
        if banned.stat().st_size < 5000:
            fail(f"gallery image too small (placeholder?): {banned.name}")
    closeup = PKG / "images" / "05-hex-tiles-closeup.png"
    if closeup.exists() and closeup.stat().st_size < 5000:
        fail("gallery closeup too small")
    ok(f"{len(images)} gallery images (cover={cover.name})")

    shells = connected_shells(pkg_stl)
    n_shells = len(shells)
    # Discrete hex plates → thousands of shells; a single-shell STL would be wrong.
    if n_shells < 1000:
        fail(f"hex one-piece STL expected ≥1000 discrete shells, got {n_shells}")
    ok(f"hex one-piece STL has {n_shells} shells ({shells[0]} verts in largest)")

    # 3MF is a zip with the expected model path
    import zipfile

    with zipfile.ZipFile(pkg_3mf) as z:
        names = z.namelist()
        if "3D/3dmodel.model" not in names:
            fail("hex MMU 3MF missing 3D/3dmodel.model")
        model_xml = z.read("3D/3dmodel.model").decode("utf-8", "replace")
        for part in ("Stainless hull", "Heat shield + Raptors"):
            if part not in model_xml:
                fail(f"hex MMU 3MF missing part name {part!r}")
        if "CC BY-NC" in model_xml:
            fail("hex MMU 3MF metadata still says CC BY-NC (expected CC BY 4.0)")
        if 'name="License">CC BY 4.0</metadata>' not in model_xml:
            fail("hex MMU 3MF metadata missing License CC BY 4.0")
    ok("hex-tile MMU 3MF has stainless + heat-shield parts + CC BY 4.0")

    hero_h = 260.5
    for denom, path_name in (
        (200, "starship_1_200_hex_tiles_one_piece.stl"),
        (300, "starship_1_300_hex_tiles_one_piece.stl"),
    ):
        _, _, z = stl_bbox_size(files_dir / path_name)
        expect = hero_h * (200.0 / denom)
        if abs(z - expect) > 0.5:
            fail(f"{path_name} height {z:.2f} mm, expected ~{expect:.2f} mm (1:{denom})")
        ok(f"{path_name} height {z:.2f} mm (1:{denom})")

    stage_py = ROOT / "scripts" / "stage_mirror_uploads.py"
    stage_src = stage_py.read_text()
    if "License: CC BY-NC" in stage_src:
        fail("stage_mirror_uploads.py footer still says CC BY-NC")
    if "License: CC BY 4.0" not in stage_src:
        fail("stage_mirror_uploads.py footer must say CC BY 4.0")
    ok("mirror staging footer is CC BY 4.0")

    if "hex" not in desc.lower() or "groove" not in desc.lower():
        fail("DESCRIPTION.md should mention the hex-tile groove variant")
    if "customizer" not in desc.lower() and "leedsexplore.github.io" not in desc.lower():
        fail("DESCRIPTION.md should point named STLs to the web customizer")
    if "one file" not in desc.lower():
        fail("DESCRIPTION.md should keep the one-file / one-print advantage")
    ok("DESCRIPTION mentions hex tiles + customizer + one-file")

    print("\nVALIDATE OK — package is ready to publish.")
    print("Live publish still needs the printables-integration CLI + session cookie")
    print("(see printables/README.md).")


if __name__ == "__main__":
    main()
