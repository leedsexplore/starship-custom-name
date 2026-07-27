#!/usr/bin/env python3
"""Assemble the two-color print 3MF from the split print-scale STLs.

Reads the steel and black body STLs (exported by openscad/export_print_steel.scad
and export_print_tiles.scad), and writes a single 3MF whose two objects carry
displaycolors, grouped under one assembly component so slicers treat the ship
as ONE print job — the bodies exist purely for MMU3 / color-change assignment.

  python3 scripts/build_mmu_3mf.py
"""

import struct
import sys
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"

PARTS = [
    ("Stainless hull", ASSETS / "starship_print_1_200_steel.stl", "#FFC8CED6"),
    ("Heat shield + Raptors", ASSETS / "starship_print_1_200_tiles.stl", "#FF17191D"),
]

OUT = ASSETS / "starship_print_1_200_mmu.3mf"


def read_binary_stl(path: Path):
    data = path.read_bytes()
    n = struct.unpack_from("<I", data, 80)[0]
    verts = []
    index = {}
    tris = []
    off = 84
    for _ in range(n):
        tri = []
        for k in range(3):
            v = struct.unpack_from("<fff", data, off + 12 + k * 12)
            key = (round(v[0], 4), round(v[1], 4), round(v[2], 4))
            idx = index.get(key)
            if idx is None:
                idx = len(verts)
                index[key] = idx
                verts.append(key)
            tri.append(idx)
        tris.append(tri)
        off += 50
    return verts, tris


def mesh_xml(verts, tris) -> str:
    lines = ["        <mesh>", "          <vertices>"]
    for x, y, z in verts:
        lines.append(f'            <vertex x="{x}" y="{y}" z="{z}" />')
    lines.append("          </vertices>")
    lines.append("          <triangles>")
    for a, b, c in tris:
        lines.append(f'            <triangle v1="{a}" v2="{b}" v3="{c}" />')
    lines.append("          </triangles>")
    lines.append("        </mesh>")
    return "\n".join(lines)


def main() -> None:
    bases, objects, components = [], [], []
    next_id = 2
    for i, (name, path, color) in enumerate(PARTS):
        if not path.exists():
            sys.exit(f"missing {path} — run the print exports first")
        verts, tris = read_binary_stl(path)
        print(f"{path.name}: {len(verts)} verts, {len(tris)} tris")
        bases.append(f'      <base name="{escape(name)}" displaycolor="{color}" />')
        objects.append(
            f'    <object id="{next_id}" name="{escape(name)}" type="model" '
            f'pid="1" pindex="{i}">\n{mesh_xml(verts, tris)}\n    </object>'
        )
        components.append(f'      <component objectid="{next_id}" />')
        next_id += 1

    model = f"""<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US"
  xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"
  xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06">
  <metadata name="Application">Starship Custom Name</metadata>
  <metadata name="Author">David Leeds</metadata>
  <resources>
    <basematerials id="1">
{chr(10).join(bases)}
    </basematerials>
{chr(10).join(objects)}
    <object id="{next_id}" name="Starship 1:200" type="model">
      <components>
{chr(10).join(components)}
      </components>
    </object>
  </resources>
  <build>
    <item objectid="{next_id}" />
  </build>
</model>
"""

    content_types = """<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml" />
</Types>
"""

    rels = """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" />
</Relationships>
"""

    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", content_types)
        z.writestr("_rels/.rels", rels)
        z.writestr("3D/3dmodel.model", model)
    print(f"wrote {OUT.relative_to(ROOT)}  {OUT.stat().st_size / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
