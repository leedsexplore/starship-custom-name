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
/** Approx safe text span along hull before flaps (mm). */
const SAFE_TEXT_SPAN_MM = 48;
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
  copyLink: document.getElementById("copy-link"),
  resetView: document.getElementById("reset-view"),
  status: document.getElementById("status"),
  glyphWarn: document.getElementById("glyph-warn"),
  lengthWarn: document.getElementById("length-warn"),
  presets: document.getElementById("presets"),
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
let fontGlyphs = new Set();
let shipGeometry = null;
let shipMesh = null;
let textMesh = null;
let ready = false;
let rebuildTimer = 0;
let rebuildPromise = Promise.resolve();

function setStatus(msg, isError = false) {
  el.status.textContent = msg;
  el.status.classList.toggle("error", isError);
}

function selectedSide() {
  const checked = document.querySelector('input[name="side"]:checked');
  return checked?.value === "left" ? "left" : "right";
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
  for (const btn of el.presets.querySelectorAll(".swatch")) {
    btn.classList.toggle(
      "active",
      btn.dataset.color.toLowerCase() === el.color.value.toLowerCase()
    );
  }
}

function sanitizeName(raw) {
  const text = (raw || "").slice(0, 24);
  if (!fontGlyphs.size) {
    return { display: text || " ", missing: [], used: text || " " };
  }
  const missing = [];
  let used = "";
  for (const ch of text) {
    if (ch === " " || fontGlyphs.has(ch)) {
      used += ch;
    } else if (!missing.includes(ch)) {
      missing.push(ch);
    }
  }
  used = used.replace(/\s+/g, " ").trim();
  return { display: text, missing, used: used || " " };
}

function updateGlyphWarn(missing) {
  if (!missing.length) {
    el.glyphWarn.hidden = true;
    el.glyphWarn.textContent = "";
    return;
  }
  const shown = missing.map((c) => JSON.stringify(c)).join(", ");
  el.glyphWarn.hidden = false;
  el.glyphWarn.textContent = `Font can’t draw: ${shown}. Those characters are skipped in the STL.`;
}

function updateLengthWarn(spanMm) {
  if (spanMm <= SAFE_TEXT_SPAN_MM) {
    el.lengthWarn.hidden = true;
    el.lengthWarn.textContent = "";
    return;
  }
  el.lengthWarn.hidden = false;
  el.lengthWarn.textContent = `Text is ~${spanMm.toFixed(0)} mm long (safe band ~${SAFE_TEXT_SPAN_MM} mm). Shrink letter size or shorten the name for a cleaner fit.`;
}

function buildTextGeometry(text, size, depth) {
  const geometry = new TextGeometry(text, {
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
  geometry.translate(-cx, -cy, 0);
  geometry.rotateZ(Math.PI / 2);
  return geometry;
}

function placeTextMesh(geometry) {
  const side = selectedSide();
  const zSign = side === "right" ? 1 : -1;
  const z0 = zSign * (HULL_RADIUS_Z - EMBED_MM);
  const mesh = new THREE.Mesh(geometry, textMaterial);
  mesh.position.set(BODY_CENTER_X, Number(el.pos.value), z0);
  if (side === "left") {
    // Match openscad rotate([180,0,90]) so extrusion points inward/outward correctly
    // and text stays readable along the hull.
    mesh.rotation.x = Math.PI;
  }
  return mesh;
}

function rebuildText() {
  if (!font || !ready) return Promise.resolve();

  const proud = Number(el.depth.value);
  const totalDepth = EMBED_MM + proud;
  const { missing, used } = sanitizeName(el.name.value);
  updateGlyphWarn(missing);

  const geometry = buildTextGeometry(used, Number(el.size.value), totalDepth);
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox;
  // After rotZ(90), length along ship is roughly X extent of original → Y span now
  const spanMm = Math.max(bb.max.y - bb.min.y, bb.max.x - bb.min.x);
  updateLengthWarn(spanMm);

  if (textMesh) {
    scene.remove(textMesh);
    textMesh.geometry.dispose();
  }
  textMesh = placeTextMesh(geometry);
  scene.add(textMesh);
  return Promise.resolve();
}

function scheduleRebuild() {
  updateLabels();
  window.clearTimeout(rebuildTimer);
  rebuildPromise = new Promise((resolve) => {
    rebuildTimer = window.setTimeout(() => {
      rebuildText().then(resolve);
    }, 120);
  });
  return rebuildPromise;
}

function flushRebuild() {
  window.clearTimeout(rebuildTimer);
  return rebuildText();
}

function frameCamera() {
  if (!shipMesh) return;
  const box = new THREE.Box3().setFromObject(shipMesh);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  controls.target.copy(center);
  const maxDim = Math.max(size.x, size.y, size.z);
  const side = selectedSide();
  const zDir = side === "right" ? 1 : -1;
  camera.position.set(
    center.x + maxDim * 0.35,
    center.y + maxDim * 0.05,
    center.z + zDir * maxDim * 1.55
  );
  controls.update();
}

function readState() {
  return {
    name: el.name.value.trim(),
    color: el.color.value.replace("#", ""),
    size: el.size.value,
    pos: el.pos.value,
    depth: el.depth.value,
    side: selectedSide(),
  };
}

function applyState(state) {
  if (state.name != null) el.name.value = String(state.name).slice(0, 24);
  if (state.color) {
    const hex = state.color.startsWith("#") ? state.color : `#${state.color}`;
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) el.color.value = hex;
  }
  if (state.size != null) el.size.value = state.size;
  if (state.pos != null) el.pos.value = state.pos;
  if (state.depth != null) el.depth.value = state.depth;
  if (state.side === "left" || state.side === "right") {
    const radio = document.querySelector(`input[name="side"][value="${state.side}"]`);
    if (radio) radio.checked = true;
  }
  updateLabels();
  applyColor();
}

function stateFromUrl() {
  const q = new URLSearchParams(window.location.search);
  const state = {};
  if (q.has("name")) state.name = q.get("name");
  if (q.has("color")) state.color = q.get("color");
  if (q.has("size")) state.size = q.get("size");
  if (q.has("pos")) state.pos = q.get("pos");
  if (q.has("depth")) state.depth = q.get("depth");
  if (q.has("side")) state.side = q.get("side");
  return state;
}

function writeUrl(replace = true) {
  const s = readState();
  const q = new URLSearchParams();
  if (s.name) q.set("name", s.name);
  q.set("color", s.color);
  q.set("size", s.size);
  q.set("pos", s.pos);
  q.set("depth", s.depth);
  q.set("side", s.side);
  const url = `${window.location.pathname}?${q.toString()}`;
  if (replace) history.replaceState(null, "", url);
  return `${window.location.origin}${url}`;
}

function mergeForExport() {
  if (!shipGeometry || !textMesh) {
    throw new Error("Model not ready");
  }

  textMesh.updateMatrixWorld(true);

  const ship = shipGeometry.clone();
  const text = textMesh.geometry.clone();
  text.applyMatrix4(textMesh.matrixWorld);

  ship.computeVertexNormals();
  text.computeVertexNormals();

  const exporter = new STLExporter();
  const group = new THREE.Group();
  group.add(new THREE.Mesh(ship));
  group.add(new THREE.Mesh(text));
  return exporter.parse(group, { binary: true });
}

async function downloadStl() {
  try {
    el.download.disabled = true;
    setStatus("Building STL…");
    await flushRebuild();
    if (!textMesh) throw new Error("Model not ready");

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
    writeUrl();
    setStatus(
      "STL downloaded — color is preview only; set filament in your slicer."
    );
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Export failed", true);
  } finally {
    el.download.disabled = false;
  }
}

async function copyShareLink() {
  const url = writeUrl();
  try {
    await navigator.clipboard.writeText(url);
    setStatus("Link copied — shares name, color, and placement.");
  } catch {
    setStatus(`Copy failed — URL is ${url}`, true);
  }
}

function onControlChange() {
  scheduleRebuild().then(() => writeUrl());
}

async function boot() {
  applyState(stateFromUrl());
  updateLabels();
  resize();
  window.addEventListener("resize", resize);

  el.color.addEventListener("input", () => {
    applyColor();
    writeUrl();
  });
  el.name.addEventListener("input", onControlChange);
  el.size.addEventListener("input", onControlChange);
  el.pos.addEventListener("input", onControlChange);
  el.depth.addEventListener("input", onControlChange);
  for (const radio of document.querySelectorAll('input[name="side"]')) {
    radio.addEventListener("change", () => {
      onControlChange();
      frameCamera();
    });
  }
  el.presets.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".swatch");
    if (!btn) return;
    el.color.value = btn.dataset.color;
    applyColor();
    writeUrl();
  });
  el.download.addEventListener("click", downloadStl);
  el.copyLink.addEventListener("click", copyShareLink);
  el.resetView.addEventListener("click", () => {
    frameCamera();
    setStatus("View reset.");
  });

  try {
    const fontLoader = new FontLoader();
    const stlLoader = new STLLoader();

    const [loadedFont, geometry] = await Promise.all([
      fontLoader.loadAsync(FONT_URL),
      stlLoader.loadAsync(SHIP_URL),
    ]);

    font = loadedFont;
    fontGlyphs = new Set(Object.keys(font.data?.glyphs || {}));

    shipGeometry = geometry;
    shipGeometry.computeVertexNormals();

    shipMesh = new THREE.Mesh(shipGeometry, shipMaterial);
    scene.add(shipMesh);

    ready = true;
    applyColor();
    await rebuildText();
    frameCamera();
    writeUrl();
    setStatus("Ready — edit the name, then download your STL.");
  } catch (err) {
    console.error(err);
    setStatus("Failed to load ship or font.", true);
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
