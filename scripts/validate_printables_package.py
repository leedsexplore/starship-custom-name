#!/usr/bin/env python3
"""Local validator for printables/starship-parametric (mirrors `printables validate`).

Does not talk to Printables — checks package structure, licenses, file presence,
and that the one-piece STL is a single connected shell.
"""

from __future__ import annotations

import struct
import sys
import tomllib
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PKG = ROOT / "printables" / "starship-parametric"


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


def main() -> None:
    if not PKG.is_dir():
        fail(f"missing package dir {PKG}")

    toml_path = PKG / "printables.toml"
    desc_path = PKG / "DESCRIPTION.md"
    if not toml_path.exists():
        fail("missing printables.toml")
    if not desc_path.exists():
        fail("missing DESCRIPTION.md")

    meta = tomllib.loads(toml_path.read_text())
    # CLI schema uses [listing]; accept legacy [model] as a fallback.
    listing = meta.get("listing") or meta.get("model") or {}
    for key in ("title", "license", "tags"):
        if key not in listing:
            fail(f"printables.toml missing listing.{key}")
    if listing.get("license") != "CC BY 4.0":
        fail(f"expected CC BY 4.0, got {listing.get('license')!r}")
    if "remix_of" in listing or "remix_of" in meta:
        fail("original listing must not set remix_of")
    tags = set(listing["tags"])
    for required in ("starship", "mmu3", "singlepiece", "noassembly", "parametric"):
        if required not in tags:
            fail(f"missing tag {required!r}")
    ok(f"title: {listing['title'][:72]}…")
    ok(f"license={listing['license']}  tags={len(tags)}")

    desc = desc_path.read_text()
    for needle in (
        "one single print file",
        "MMU3",
        "leedsexplore.github.io/starship-custom-name",
        "CC BY 4.0",
        "260.5",
    ):
        if needle.lower() not in desc.lower() and needle not in desc:
            # case-insensitive for prose hooks
            if needle.lower() not in desc.lower():
                fail(f"DESCRIPTION.md missing required phrase: {needle!r}")
    ok(f"DESCRIPTION.md ({len(desc)} chars)")

    files_dir = PKG / "files"
    required_files = [
        "starship_1_200_hex_tiles_one_piece.stl",
        "starship_1_200_hex_tiles_mmu.3mf",
        "starship_parametric.scad",
    ]
    for name in required_files:
        p = files_dir / name
        if not p.exists() or p.stat().st_size < 1000:
            fail(f"missing/empty files/{name}")
        ok(f"files/{name}  {p.stat().st_size / 1e6:.2f} MB")

    images = sorted((PKG / "images").glob("*.png"))
    if len(images) < 4:
        fail(f"need ≥4 gallery images, found {len(images)}")
    cover = PKG / "images" / "01-cover.png"
    if not cover.exists():
        fail("missing cover image 01-cover.png")
    for banned in images:
        if "blueprint" in banned.name.lower() or "2d" in banned.name.lower():
            fail(f"do not publish blueprint/2D drawing image: {banned.name}")
    ok(f"{len(images)} gallery images (cover={cover.name})")

    shells = connected_shells(files_dir / "starship_1_200_hex_tiles_one_piece.stl")
    if len(shells) < 1:
        fail(f"hex one-piece STL has no shells")
    ok(f"hex one-piece STL has {len(shells)} shell(s) ({shells[0]} verts in largest)")

    # 3MF is a zip with the expected model path
    import zipfile

    with zipfile.ZipFile(files_dir / "starship_1_200_hex_tiles_mmu.3mf") as z:
        names = z.namelist()
        if "3D/3dmodel.model" not in names:
            fail("hex MMU 3MF missing 3D/3dmodel.model")
        model_xml = z.read("3D/3dmodel.model").decode("utf-8", "replace")
        for part in ("Stainless hull", "Heat shield + Raptors"):
            if part not in model_xml:
                fail(f"hex MMU 3MF missing part name {part!r}")
    ok("hex-tile MMU 3MF has stainless + heat-shield parts")

    if "hex" not in desc.lower() or "groove" not in desc.lower():
        fail("DESCRIPTION.md should mention the hex-tile groove variant")
    if "customizer" not in desc.lower() and "leedsexplore.github.io" not in desc.lower():
        fail("DESCRIPTION.md should point named STLs to the web customizer")
    ok("DESCRIPTION mentions hex tiles + customizer")

    print("\nVALIDATE OK — package is ready to publish.")
    print("Live publish still needs the printables-integration CLI + session cookie")
    print("(see printables/README.md).")


if __name__ == "__main__":
    main()
