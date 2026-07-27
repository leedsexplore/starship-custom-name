import { zipSync, strToU8 } from "fflate";

/** Convert #RRGGBB → 3MF displaycolor #AARRGGBB */
function hexToDisplayColor(hex, alpha = "FF") {
  const h = hex.replace("#", "").toUpperCase();
  return `#${alpha}${h}`;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Expand a BufferGeometry into vertex/triangle lists for 3MF.
 * @param {import('three').BufferGeometry} geometry
 */
function geometryToMeshData(geometry) {
  const geo = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = geo.attributes.position;
  if (!pos) throw new Error("Geometry has no positions");

  const vertices = new Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    vertices[i] = {
      x: pos.getX(i),
      y: pos.getY(i),
      z: pos.getZ(i),
    };
  }

  const triangles = [];
  for (let i = 0; i < pos.count; i += 3) {
    triangles.push({ v1: i, v2: i + 1, v3: i + 2 });
  }
  return { vertices, triangles };
}

function meshXml(vertices, triangles, indent = "        ") {
  const lines = [`${indent}<mesh>`, `${indent}  <vertices>`];
  for (const v of vertices) {
    lines.push(
      `${indent}    <vertex x="${v.x.toFixed(5)}" y="${v.y.toFixed(5)}" z="${v.z.toFixed(5)}" />`
    );
  }
  lines.push(`${indent}  </vertices>`, `${indent}  <triangles>`);
  for (const t of triangles) {
    lines.push(
      `${indent}    <triangle v1="${t.v1}" v2="${t.v2}" v3="${t.v3}" />`
    );
  }
  lines.push(`${indent}  </triangles>`, `${indent}</mesh>`);
  return lines.join("\n");
}

/**
 * Build a multi-object 3MF (ZIP) for MMU / multi-material assignment.
 * @param {{ name: string, geometry: import('three').BufferGeometry, color: string }[]} parts
 * @param {{ application?: string, author?: string, version?: string }} [meta]
 */
export function build3mf(parts, meta = {}) {
  if (!parts.length) throw new Error("No parts for 3MF");
  const application = meta.application || "Starship Custom Name";
  const author = meta.author || "";
  const version = meta.version || "";

  const baseLines = parts.map(
    (p, i) =>
      `      <base name="${escapeXml(p.name)}" displaycolor="${hexToDisplayColor(p.color)}" />`
  );

  const objectBlocks = [];
  const componentLines = [];
  let nextId = 2;

  for (let i = 0; i < parts.length; i++) {
    const id = nextId++;
    const { vertices, triangles } = geometryToMeshData(parts[i].geometry);
    objectBlocks.push(
      `    <object id="${id}" name="${escapeXml(parts[i].name)}" type="model" pid="1" pindex="${i}">\n${meshXml(vertices, triangles)}\n    </object>`
    );
    componentLines.push(`      <component objectid="${id}" />`);
  }

  const assemblyId = nextId;
  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US"
  xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"
  xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06">
  <metadata name="Application">${escapeXml(application)}${version ? ` ${escapeXml(version)}` : ""}</metadata>
${author ? `  <metadata name="Author">${escapeXml(author)}</metadata>\n` : ""}  <resources>
    <basematerials id="1">
${baseLines.join("\n")}
    </basematerials>
${objectBlocks.join("\n")}
    <object id="${assemblyId}" name="Starship" type="model">
      <components>
${componentLines.join("\n")}
      </components>
    </object>
  </resources>
  <build>
    <item objectid="${assemblyId}" />
  </build>
</model>
`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml" />
</Types>
`;

  const rels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" />
</Relationships>
`;

  const zipped = zipSync(
    {
      "[Content_Types].xml": strToU8(contentTypes),
      "_rels/.rels": strToU8(rels),
      "3D/3dmodel.model": strToU8(modelXml),
    },
    { level: 6 }
  );

  return zipped;
}
