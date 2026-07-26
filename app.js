import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { STLExporter } from "three/addons/exporters/STLExporter.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";

/** Placement tuned to Josh1297 Starship mesh (same as openscad/). */
const BODY_CENTER_X = -22.3;
const HULL_RADIUS_Z = 10.55;
const EMBED_MM = 0.35;
const SHIP_URL = "./assets/StarShipV2_original.stl";
const FONT_URL = "./fonts/helvetiker_bold.typeface.json";

const el = {
  name: document.getElementById("name"),
  color: document.getElementById("color"),
  size: document.getElementById("size"),
  pos: document.getElementById("pos"),
  depth: document.getElementById("depth"),
  sizeLabel: document.getElementById("size-label"),
  posLabel: document.getElementById("pos-label"),
  depthLabel: document.getElementById("depth-label"),
  download: document.getElementById("download"),
  status: document.getElementById("status"),
  viewport: document.getElementById("viewport"),
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a101c);

const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
el.viewport.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const key = new THREE.DirectionalLight(0xffffff, 1.15);
key.position.set(40, 70, 90);
scene.add(key);
const fill = new THREE.DirectionalLight(0x88aaff, 0.4);
fill.position.set(-60, -30, -40);
scene.add(fill);

const shipMaterial = new THREE.MeshStandardMaterial({
  color: new THREE.Color(el.color.value),
  metalness: 0.35,
  roughness: 0.45,
});
const textMaterial = new THREE.MeshStandardMaterial({
  color: new THREE.Color(el.color.value).offsetHSL(0, 0, -0.08),
  metalness: 0.25,
  roughness: 0.5,
});

let font = null;
let shipGeometry = null;
let shipMesh = null;
let textMesh = null;
let ready = false;
let rebuildTimer = 0;

function setStatus(msg, isError = false) {
  el.status.textContent = msg;
  el.status.classList.toggle("error", isError);
}

function resize() {
  const { clientWidth: w, clientHeight: h } = el.viewport;
  camera.aspect = w / Math.max(h, 1);
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}

function updateLabels() {
  el.sizeLabel.textContent = `${Number(el.size.value).toFixed(1)} mm`;
  el.posLabel.textContent = el.pos.value;
  el.depthLabel.textContent = `${Number(el.depth.value).toFixed(2)} mm`;
}

function applyColor() {
  const c = new THREE.Color(el.color.value);
  shipMaterial.color.copy(c);
  textMaterial.color.copy(c).offsetHSL(0, 0, -0.08);
}

function buildTextGeometry(text, size, depth) {
  const safe = (text || " ").slice(0, 24);
  const geometry = new TextGeometry(safe, {
    font,
    size,
    depth,
    curveSegments: 7,
    bevelEnabled: false,
  });
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox;
  const cx = (bb.min.x + bb.max.x) / 2;
  const cy = (bb.min.y + bb.max.y) / 2;
  // Keep extrusion starting at z=0 (OpenSCAD linear_extrude style).
  geometry.translate(-cx, -cy, 0);
  // Match openscad: rotate([0,0,90]) so letters run along ship +Y.
  geometry.rotateZ(Math.PI / 2);
  return geometry;
}

function placeTextMesh(geometry) {
  const proud = Number(el.depth.value);
  const totalDepth = EMBED_MM + proud;
  // Rebuild with correct depth if geometry depth differs — caller passes totalDepth.
  const z0 = HULL_RADIUS_Z - EMBED_MM;
  const mesh = new THREE.Mesh(geometry, textMaterial);
  mesh.position.set(BODY_CENTER_X, Number(el.pos.value), z0);
  return mesh;
}

function rebuildText() {
  if (!font || !ready) return;

  const proud = Number(el.depth.value);
  const totalDepth = EMBED_MM + proud;
  const geometry = buildTextGeometry(
    el.name.value.trim() || " ",
    Number(el.size.value),
    totalDepth
  );

  if (textMesh) {
    scene.remove(textMesh);
    textMesh.geometry.dispose();
  }
  textMesh = placeTextMesh(geometry);
  scene.add(textMesh);
}

function scheduleRebuild() {
  updateLabels();
  window.clearTimeout(rebuildTimer);
  rebuildTimer = window.setTimeout(rebuildText, 120);
}

function frameCamera() {
  if (!shipMesh) return;
  const box = new THREE.Box3().setFromObject(shipMesh);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  controls.target.copy(center);
  const maxDim = Math.max(size.x, size.y, size.z);
  camera.position.set(
    center.x + maxDim * 0.35,
    center.y + maxDim * 0.05,
    center.z + maxDim * 1.55
  );
  controls.update();
}

function mergeForExport() {
  if (!shipGeometry || !textMesh) {
    throw new Error("Model not ready");
  }

  const ship = shipGeometry.clone();
  const text = textMesh.geometry.clone();
  text.applyMatrix4(textMesh.matrixWorld);

  // STLExporter expects non-indexed or handles indexed; ensure normals.
  ship.computeVertexNormals();
  text.computeVertexNormals();

  const exporter = new STLExporter();
  const group = new THREE.Group();
  group.add(new THREE.Mesh(ship));
  group.add(new THREE.Mesh(text));
  // binary STL
  return exporter.parse(group, { binary: true });
}

function downloadStl() {
  try {
    el.download.disabled = true;
    setStatus("Building STL…");
    // Ensure text matrix is current
    textMesh.updateMatrixWorld(true);
    const buffer = mergeForExport();
    const blob = new Blob([buffer], { type: "model/stl" });
    const slug =
      (el.name.value.trim() || "starship")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "")
        .slice(0, 40) || "starship";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `starship_${slug}.stl`;
    a.click();
    URL.revokeObjectURL(a.href);
    setStatus("STL downloaded — color is preview only; set filament in your slicer.");
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Export failed", true);
  } finally {
    el.download.disabled = false;
  }
}

async function boot() {
  updateLabels();
  resize();
  window.addEventListener("resize", resize);

  el.color.addEventListener("input", applyColor);
  el.name.addEventListener("input", scheduleRebuild);
  el.size.addEventListener("input", scheduleRebuild);
  el.pos.addEventListener("input", scheduleRebuild);
  el.depth.addEventListener("input", scheduleRebuild);
  el.download.addEventListener("click", downloadStl);

  try {
    const fontLoader = new FontLoader();
    const stlLoader = new STLLoader();

    const [loadedFont, geometry] = await Promise.all([
      fontLoader.loadAsync(FONT_URL),
      stlLoader.loadAsync(SHIP_URL),
    ]);

    font = loadedFont;
    shipGeometry = geometry;
    shipGeometry.computeVertexNormals();

    shipMesh = new THREE.Mesh(shipGeometry, shipMaterial);
    scene.add(shipMesh);

    ready = true;
    applyColor();
    rebuildText();
    frameCamera();
    setStatus("Ready — edit the name, then download your STL.");
  } catch (err) {
    console.error(err);
    setStatus("Failed to load ship or font. Serve this folder over HTTP.", true);
    el.download.disabled = true;
  }
}

function tick() {
  requestAnimationFrame(tick);
  controls.update();
  renderer.render(scene, camera);
}

boot();
tick();
