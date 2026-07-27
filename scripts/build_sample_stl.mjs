/**
 * Headless sample STL: parametric CAD ship + raised wrapped "S40"
 * (optional local artifact — output path is gitignored).
 */
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import * as THREE from "../vendor/three/three.module.js";
import { STLLoader } from "../vendor/three/examples/jsm/loaders/STLLoader.js";
import { STLExporter } from "../vendor/three/examples/jsm/exporters/STLExporter.js";
import { FontLoader } from "../vendor/three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "../vendor/three/examples/jsm/geometries/TextGeometry.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Parametric CAD 1:200 placement (see SHIPS.parametric in app.js).
const BODY_CENTER_X = 0;
const HULL_RADIUS_Z = 22.575;
const EMBED_MM = 0.35;
const LETTER_MM = 8;
/** SpaceX-style S## band on the leeward mid-barrel (see SHIPS.parametric.defaultPosMm). */
const TEXT_Y = -10;

function loadBinarySTL(filePath) {
  const buf = fs.readFileSync(filePath);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return new STLLoader().parse(ab);
}

/** Exported nose-up along +Z with flaps on ±Y — swing into app convention. */
function orientParametric(geometry) {
  geometry.rotateX(-Math.PI / 2); // nose +Z → +Y
  geometry.rotateY(Math.PI / 2); // flaps ±Z → ±X
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox;
  geometry.translate(0, -(bb.min.y + bb.max.y) / 2, 0);
  return geometry;
}

function loadFont(filePath) {
  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return new FontLoader().parse(json);
}

function buildFlatTextGeometry(font, text, size, extrudeMm) {
  const geometry = new TextGeometry(text, {
    font,
    size,
    height: extrudeMm,
    curveSegments: 8,
    bevelEnabled: false,
  });
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox;
  geometry.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, 0);
  geometry.rotateZ(Math.PI / 2);
  return geometry;
}

function wrapGeometryToHull(geometry, side, textY, style) {
  const sign = side === "right" ? 1 : -1;
  const R = HULL_RADIUS_Z;
  const pos = geometry.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const across = side === "left" ? -v.x : v.x;
    const along = v.y;
    const radial = style === "raised" ? R - EMBED_MM + v.z : R - v.z;
    const theta = across / R;
    const x = BODY_CENTER_X + radial * Math.sin(theta);
    const z = sign * radial * Math.cos(theta);
    const y = textY + along;
    pos.setXYZ(i, x, y, z);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

const shipGeo = orientParametric(
  loadBinarySTL(path.join(ROOT, "assets/starship_ship_print_1_200.stl"))
);
const font = loadFont(path.join(ROOT, "fonts/optimer_bold.typeface.json"));
const textGeo = buildFlatTextGeometry(font, "S40", LETTER_MM, EMBED_MM + 0.5);
wrapGeometryToHull(textGeo, "right", TEXT_Y, "raised");

const group = new THREE.Group();
group.add(new THREE.Mesh(shipGeo));
group.add(new THREE.Mesh(textGeo));

const exporter = new STLExporter();
const buffer = exporter.parse(group, { binary: true });
let bytes;
if (buffer instanceof DataView) {
  bytes = Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
} else if (buffer instanceof ArrayBuffer) {
  bytes = Buffer.from(buffer);
} else if (ArrayBuffer.isView(buffer)) {
  bytes = Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
} else {
  throw new Error("Unexpected STLExporter output");
}
const header = Buffer.alloc(80, 0);
header.write("Starship sample v2.1.11 parametric CAD 1:200");
bytes.set(header, 0);

const outPath = path.join(ROOT, "assets/starship_custom_name_sample.stl");
fs.writeFileSync(outPath, bytes);
console.log("wrote", outPath, "bytes", bytes.length, "faces", bytes.readUInt32LE(80));
