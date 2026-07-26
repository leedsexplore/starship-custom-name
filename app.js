import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { STLExporter } from "three/addons/exporters/STLExporter.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { Brush, Evaluator, SUBTRACTION, HOLLOW_SUBTRACTION } from "three-bvh-csg";
import { build3mf } from "./export3mf.js";
import {
  APP_NAME,
  APP_VERSION,
  AUTHOR,
  creditLine,
  versionLabel,
} from "./version.js";

/** Placement tuned to Josh1297 Starship mesh (same as openscad/). */
const BODY_CENTER_X = -22.3;
/** Mid-body cylinder radius from STL (was 10.55 — too small → letters buried). */
const HULL_RADIUS_Z = 10.7;
const EMBED_MM = 0.35;
/** Approx safe text span along hull before flaps (mm). */
const SAFE_TEXT_SPAN_MM = 48;
/** Beyond this, downloads ask for confirmation. */
const HARD_TEXT_SPAN_MM = 60;
/** |pos| + half-span past this often nears flap roots. */
const FLAP_ZONE_Y_MM = 28;
const SHIP_URL = "./assets/StarShipV2_original.stl";

/**
 * Extruded fonts (Three.js typeface JSON).
 * Popular Google fonts via @compai typefaces (OFL); classic MgOpen/Droid from three.js.
 */
const FONT_OPTIONS = {
  "optimer-bold": {
    label: "Optimer Bold",
    group: "Classic",
    url: "./fonts/optimer_bold.typeface.json",
    openscad: "Liberation Sans:style=Bold",
  },
  "optimer-regular": {
    label: "Optimer Regular",
    group: "Classic",
    url: "./fonts/optimer_regular.typeface.json",
    openscad: "Liberation Sans:style=Regular",
  },
  "helvetiker-bold": {
    label: "Helvetiker Bold",
    group: "Classic",
    url: "./fonts/helvetiker_bold.typeface.json",
    openscad: "Liberation Sans:style=Bold",
  },
  "helvetiker-regular": {
    label: "Helvetiker Regular",
    group: "Classic",
    url: "./fonts/helvetiker_regular.typeface.json",
    openscad: "Liberation Sans:style=Regular",
  },
  "gentilis-bold": {
    label: "Gentilis Bold (accents)",
    group: "Classic",
    url: "./fonts/gentilis_bold.typeface.json",
    openscad: "Gentium Book Basic:style=Bold",
  },
  "gentilis-regular": {
    label: "Gentilis Regular",
    group: "Classic",
    url: "./fonts/gentilis_regular.typeface.json",
    openscad: "Gentium Book Basic:style=Regular",
  },
  "droid-sans-bold": {
    label: "Droid Sans Bold",
    group: "Classic",
    url: "./fonts/droid_sans_bold.typeface.json",
    openscad: "Droid Sans:style=Bold",
  },
  "droid-sans-regular": {
    label: "Droid Sans",
    group: "Classic",
    url: "./fonts/droid_sans_regular.typeface.json",
    openscad: "Droid Sans",
  },
  "droid-sans-mono": {
    label: "Droid Sans Mono",
    group: "Classic",
    url: "./fonts/droid_sans_mono_regular.typeface.json",
    openscad: "Droid Sans Mono",
  },
  "droid-serif-bold": {
    label: "Droid Serif Bold",
    group: "Classic",
    url: "./fonts/droid_serif_bold.typeface.json",
    openscad: "Droid Serif:style=Bold",
  },
  "droid-serif-regular": {
    label: "Droid Serif",
    group: "Classic",
    url: "./fonts/droid_serif_regular.typeface.json",
    openscad: "Droid Serif",
  },
  "roboto-bold": {
    label: "Roboto Bold",
    group: "Popular",
    url: "./fonts/roboto_bold.typeface.json",
    openscad: "Roboto:style=Bold",
  },
  "roboto-regular": {
    label: "Roboto",
    group: "Popular",
    url: "./fonts/roboto_regular.typeface.json",
    openscad: "Roboto",
  },
  "open-sans-bold": {
    label: "Open Sans Bold",
    group: "Popular",
    url: "./fonts/open_sans_bold.typeface.json",
    openscad: "Open Sans:style=Bold",
  },
  "open-sans-regular": {
    label: "Open Sans",
    group: "Popular",
    url: "./fonts/open_sans_regular.typeface.json",
    openscad: "Open Sans",
  },
  "montserrat-bold": {
    label: "Montserrat Bold",
    group: "Popular",
    url: "./fonts/montserrat_bold.typeface.json",
    openscad: "Montserrat:style=Bold",
  },
  "montserrat-regular": {
    label: "Montserrat",
    group: "Popular",
    url: "./fonts/montserrat_regular.typeface.json",
    openscad: "Montserrat",
  },
  "lato-bold": {
    label: "Lato Bold",
    group: "Popular",
    url: "./fonts/lato_bold.typeface.json",
    openscad: "Lato:style=Bold",
  },
  "lato-regular": {
    label: "Lato",
    group: "Popular",
    url: "./fonts/lato_regular.typeface.json",
    openscad: "Lato",
  },
  "poppins-bold": {
    label: "Poppins Bold",
    group: "Popular",
    url: "./fonts/poppins_bold.typeface.json",
    openscad: "Poppins:style=Bold",
  },
  "poppins-regular": {
    label: "Poppins",
    group: "Popular",
    url: "./fonts/poppins_regular.typeface.json",
    openscad: "Poppins",
  },
  "inter-bold": {
    label: "Inter Bold",
    group: "Popular",
    url: "./fonts/inter_bold.typeface.json",
    openscad: "Inter:style=Bold",
  },
  "inter-regular": {
    label: "Inter",
    group: "Popular",
    url: "./fonts/inter_regular.typeface.json",
    openscad: "Inter",
  },
  "nunito-bold": {
    label: "Nunito Bold",
    group: "Popular",
    url: "./fonts/nunito_bold.typeface.json",
    openscad: "Nunito:style=Bold",
  },
  "ubuntu-bold": {
    label: "Ubuntu Bold",
    group: "Popular",
    url: "./fonts/ubuntu_bold.typeface.json",
    openscad: "Ubuntu:style=Bold",
  },
  "source-sans-bold": {
    label: "Source Sans Bold",
    group: "Popular",
    url: "./fonts/source_sans_bold.typeface.json",
    openscad: "Source Sans Pro:style=Bold",
  },
  "raleway-bold": {
    label: "Raleway Bold",
    group: "Popular",
    url: "./fonts/raleway_bold.typeface.json",
    openscad: "Raleway:style=Bold",
  },
  "rubik-bold": {
    label: "Rubik Bold",
    group: "Popular",
    url: "./fonts/rubik_bold.typeface.json",
    openscad: "Rubik:style=Bold",
  },
  "oswald-bold": {
    label: "Oswald Bold",
    group: "Display",
    url: "./fonts/oswald_bold.typeface.json",
    openscad: "Oswald:style=Bold",
  },
  "oswald-regular": {
    label: "Oswald",
    group: "Display",
    url: "./fonts/oswald_regular.typeface.json",
    openscad: "Oswald",
  },
  "bebas-neue": {
    label: "Bebas Neue",
    group: "Display",
    url: "./fonts/bebas_neue.typeface.json",
    openscad: "Bebas Neue",
  },
};

/** Prusa filament + Starship / space-theme preview defaults. */
const COLOR_PRESETS = [
  {
    id: "signal-red",
    name: "Signal Red",
    hex: "#e10600",
    filament: "Prusament PLA",
    sku: "Lipstick Red (approx)",
  },
  {
    id: "prusa-orange",
    name: "Prusa Orange",
    hex: "#fa6831",
    filament: "Prusament PLA",
    sku: "Prusa Orange",
  },
  {
    id: "starship-steel",
    name: "Starship Steel",
    hex: "#c8ced6",
    filament: "Prusament PLA",
    sku: "Galaxy Silver (approx)",
  },
  {
    id: "pearl-white",
    name: "Pearl White",
    hex: "#f2f0e6",
    filament: "Prusament PLA",
    sku: "Pearl White",
  },
  {
    id: "jet-black",
    name: "Jet Black",
    hex: "#1c1c1c",
    filament: "Prusament PLA",
    sku: "Jet Black",
  },
  {
    id: "heatshield",
    name: "Heatshield",
    hex: "#3a3734",
    filament: "Custom",
    sku: "non-Prusament preview",
  },
  {
    id: "prusa-azure",
    name: "Prusa Azure",
    hex: "#0077c8",
    filament: "Prusament PLA",
    sku: "Azure Blue",
  },
];

/** Fold unsupported accented letters to ASCII lookalikes when needed. */
const ACCENT_FOLD = {
  Á: "A", À: "A", Â: "A", Ä: "A", Ã: "A", Å: "A", Æ: "AE",
  É: "E", È: "E", Ê: "E", Ë: "E",
  Í: "I", Ì: "I", Î: "I", Ï: "I",
  Ó: "O", Ò: "O", Ô: "O", Ö: "O", Õ: "O", Ø: "O",
  Ú: "U", Ù: "U", Û: "U", Ü: "U",
  Ý: "Y", Ñ: "N", Ç: "C",
  á: "a", à: "a", â: "a", ä: "a", ã: "a", å: "a", æ: "ae",
  é: "e", è: "e", ê: "e", ë: "e",
  í: "i", ì: "i", î: "i", ï: "i",
  ó: "o", ò: "o", ô: "o", ö: "o", õ: "o", ø: "o",
  ú: "u", ù: "u", û: "u", ü: "u",
  ý: "y", ÿ: "y", ñ: "n", ç: "c", ß: "ss",
};

const el = {
  form: document.getElementById("controls"),
  name: document.getElementById("name"),
  color: document.getElementById("color"),
  textColor: document.getElementById("text-color"),
  size: document.getElementById("size"),
  pos: document.getElementById("pos"),
  depth: document.getElementById("depth"),
  scale: document.getElementById("scale"),
  wrap: document.getElementById("wrap"),
  sizeLabel: document.getElementById("size-label"),
  posLabel: document.getElementById("pos-label"),
  depthLabel: document.getElementById("depth-label"),
  scaleLabel: document.getElementById("scale-label"),
  download: document.getElementById("download"),
  download3mf: document.getElementById("download-3mf"),
  downloadPng: document.getElementById("download-png"),
  downloadScad: document.getElementById("download-scad"),
  copyLink: document.getElementById("copy-link"),
  resetView: document.getElementById("reset-view"),
  fitSize: document.getElementById("fit-size"),
  status: document.getElementById("status"),
  glyphWarn: document.getElementById("glyph-warn"),
  lengthWarn: document.getElementById("length-warn"),
  hullPresets: document.getElementById("hull-presets"),
  textPresets: document.getElementById("text-presets"),
  fontStyle: document.getElementById("font-style"),
  viewport: document.getElementById("viewport"),
  hud: document.getElementById("hud"),
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a101c);

const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
el.viewport.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.AmbientLight(0xffffff, 0.45));
const key = new THREE.DirectionalLight(0xffffff, 1.25);
key.position.set(40, 70, 90);
scene.add(key);
const fill = new THREE.DirectionalLight(0x9eb6ff, 0.35);
fill.position.set(-60, -30, -40);
scene.add(fill);
const rim = new THREE.DirectionalLight(0xffe0c0, 0.35);
rim.position.set(-20, 40, 100);
scene.add(rim);

/** Root for ship + text so scale % applies to both. */
const modelGroup = new THREE.Group();
scene.add(modelGroup);

const shipMaterial = new THREE.MeshStandardMaterial({
  color: new THREE.Color(el.color.value),
  metalness: 0.42,
  roughness: 0.4,
});
const textMaterial = new THREE.MeshStandardMaterial({
  color: new THREE.Color(el.textColor.value),
  metalness: 0.15,
  roughness: 0.45,
  side: THREE.DoubleSide,
  // Win depth fights against dense hull facets in the live preview.
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -2,
});

let font = null;
let fontGlyphs = new Set();
let currentFontId = "optimer-bold";
const fontCache = new Map();
let shipGeometry = null;
let shipMesh = null;
let textMesh = null;
let ready = false;
let rebuildTimer = 0;
let lastSpanMm = 0;
const csgEvaluator = new Evaluator();
// STL ship has position/normal/color — no uvs. Default evaluator attrs include uv and crash.
csgEvaluator.attributes = ["position", "normal"];
csgEvaluator.useGroups = false;

async function loadFontById(fontId) {
  const id = FONT_OPTIONS[fontId] ? fontId : "optimer-bold";
  if (fontCache.has(id)) {
    return { id, font: fontCache.get(id) };
  }
  const loader = new FontLoader();
  const loaded = await loader.loadAsync(FONT_OPTIONS[id].url);
  fontCache.set(id, loaded);
  return { id, font: loaded };
}

async function applyFontSelection(fontId, { rebuild = true } = {}) {
  setStatus("Loading font…");
  const { id, font: loaded } = await loadFontById(fontId);
  font = loaded;
  currentFontId = id;
  fontGlyphs = new Set(Object.keys(font.data?.glyphs || {}));
  if (el.fontStyle.value !== id) el.fontStyle.value = id;
  if (rebuild && ready) {
    await flushRebuild();
    writeUrl();
    setStatus(`Font: ${FONT_OPTIONS[id].label}`);
  }
}

function setStatus(msg, isError = false) {
  el.status.textContent = msg;
  el.status.classList.toggle("error", isError);
}

function selectedSide() {
  return document.querySelector('input[name="side"]:checked')?.value === "left"
    ? "left"
    : "right";
}

function selectedStyle() {
  return document.querySelector('input[name="style"]:checked')?.value ===
    "engraved"
    ? "engraved"
    : "raised";
}

function modelScale() {
  return Number(el.scale.value) / 100;
}

function applyModelScale() {
  const s = modelScale();
  modelGroup.scale.setScalar(s);
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
  el.scaleLabel.textContent = `${el.scale.value}%`;
}

function mountFontOptions(selectedId = "optimer-bold") {
  const select = el.fontStyle;
  select.replaceChildren();
  const groups = new Map();
  for (const [id, opt] of Object.entries(FONT_OPTIONS)) {
    const g = opt.group || "Other";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push([id, opt]);
  }
  for (const [groupName, items] of groups) {
    const og = document.createElement("optgroup");
    og.label = groupName;
    for (const [id, opt] of items) {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = opt.label;
      if (id === selectedId) option.selected = true;
      og.appendChild(option);
    }
    select.appendChild(og);
  }
  if (!FONT_OPTIONS[select.value]) select.value = "optimer-bold";
}

function mountPresets(container, input) {
  container.replaceChildren();
  for (const preset of COLOR_PRESETS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "swatch";
    btn.style.background = preset.hex;
    btn.dataset.color = preset.hex;
    const tip = `${preset.name} · ${preset.filament} · ${preset.sku}`;
    btn.title = tip;
    btn.setAttribute("aria-label", tip);
    btn.innerHTML = `<span class="swatch-name">${tip}</span>`;
    btn.addEventListener("click", () => {
      input.value = preset.hex;
      applyColor();
      writeUrl();
    });
    container.appendChild(btn);
  }
}

function syncPresetActive(container, hex) {
  const wanted = hex.toLowerCase();
  for (const btn of container.querySelectorAll(".swatch")) {
    btn.classList.toggle("active", btn.dataset.color.toLowerCase() === wanted);
  }
}

function applyColor() {
  shipMaterial.color.set(el.color.value);
  textMaterial.color.set(el.textColor.value);
  // Slight lift on dark letter colors so they stay readable on Signal Red.
  const hsl = { h: 0, s: 0, l: 0 };
  textMaterial.color.getHSL(hsl);
  textMaterial.emissive.setHex(hsl.l < 0.28 ? 0x222222 : 0x000000);
  syncPresetActive(el.hullPresets, el.color.value);
  syncPresetActive(el.textPresets, el.textColor.value);
}

function sanitizeName(raw) {
  const text = (raw || "").slice(0, 24);
  if (!fontGlyphs.size) {
    return { display: text || " ", missing: [], folded: [], used: text || " " };
  }

  const missing = [];
  const folded = [];
  let used = "";

  for (const ch of text) {
    if (ch === " " || fontGlyphs.has(ch)) {
      used += ch;
      continue;
    }
    const replacement = ACCENT_FOLD[ch];
    if (replacement && [...replacement].every((c) => fontGlyphs.has(c))) {
      used += replacement;
      folded.push(`${ch}→${replacement}`);
      continue;
    }
    if (!missing.includes(ch)) missing.push(ch);
  }

  used = used.replace(/\s+/g, " ").trim();
  return { display: text, missing, folded, used: used || " " };
}

function updateGlyphWarn(missing, folded) {
  const parts = [];
  if (folded.length) {
    parts.push(`Simplified: ${folded.join(", ")}`);
  }
  if (missing.length) {
    parts.push(
      `Skipped (not in font): ${missing.map((c) => JSON.stringify(c)).join(", ")}`
    );
  }
  if (!parts.length) {
    el.glyphWarn.hidden = true;
    el.glyphWarn.textContent = "";
    return;
  }
  el.glyphWarn.hidden = false;
  el.glyphWarn.textContent = parts.join(" · ");
}

function updateLengthWarn(spanMm) {
  lastSpanMm = spanMm;
  const textY = Number(el.pos.value);
  const extent = Math.abs(textY) + spanMm / 2;
  const parts = [];

  if (spanMm > HARD_TEXT_SPAN_MM) {
    parts.push(
      `Very long — span ~${spanMm.toFixed(0)} mm (safe ≤${SAFE_TEXT_SPAN_MM} mm). Likely hits flaps.`
    );
    el.lengthWarn.classList.add("warn-hard");
  } else if (spanMm > SAFE_TEXT_SPAN_MM) {
    parts.push(
      `Span ~${spanMm.toFixed(0)} mm (safe ≤${SAFE_TEXT_SPAN_MM} mm). Use “Fit text to hull” or shorten.`
    );
    el.lengthWarn.classList.remove("warn-hard");
  } else {
    el.lengthWarn.classList.remove("warn-hard");
  }

  if (extent > FLAP_ZONE_Y_MM) {
    parts.push(
      `Position + length nears flap zone (~±${FLAP_ZONE_Y_MM} mm). Nudge position toward mid-body.`
    );
    if (spanMm <= SAFE_TEXT_SPAN_MM) el.lengthWarn.classList.remove("warn-hard");
  }

  if (!parts.length) {
    el.lengthWarn.hidden = true;
    el.lengthWarn.textContent = "";
    return;
  }
  el.lengthWarn.hidden = false;
  el.lengthWarn.textContent = parts.join(" ");
}

function buildFlatTextGeometry(text, size, extrudeMm) {
  // TextGeometry (three r160) maps parameters.height → extrude depth.
  // Passing only `depth` is ignored and defaults to 50mm — do not do that.
  const geometry = new TextGeometry(text, {
    font,
    size,
    height: extrudeMm,
    curveSegments: 8,
    bevelEnabled: false,
  });
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox;
  geometry.translate(
    -(bb.min.x + bb.max.x) / 2,
    -(bb.min.y + bb.max.y) / 2,
    0
  );
  // Letters run along +Y (ship length); letter height along ±X; extrude +Z.
  geometry.rotateZ(Math.PI / 2);
  return geometry;
}

/**
 * Bend flat text onto the cylindrical hull (axis // Y through body center).
 * Writes world-space coordinates into the geometry.
 */
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

function placeFlatOnHull(geometry, side, textY, style) {
  const sign = side === "right" ? 1 : -1;
  const mesh = new THREE.Mesh(geometry, textMaterial);
  if (style === "raised") {
    mesh.position.set(BODY_CENTER_X, textY, sign * (HULL_RADIUS_Z - EMBED_MM));
    if (side === "left") mesh.rotation.y = Math.PI;
  } else {
    mesh.position.set(BODY_CENTER_X, textY, sign * HULL_RADIUS_Z);
    mesh.rotation.y = side === "left" ? 0 : Math.PI;
  }
  return mesh;
}

function measureSpan(geometry) {
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox;
  return Math.max(bb.max.y - bb.min.y, bb.max.x - bb.min.x, 0);
}

function rebuildText() {
  if (!font || !ready) return Promise.resolve();

  const proud = Number(el.depth.value);
  const totalDepth = EMBED_MM + proud;
  const side = selectedSide();
  const style = selectedStyle();
  const textY = Number(el.pos.value);
  const wrap = el.wrap.checked;
  const { missing, folded, used } = sanitizeName(el.name.value);
  updateGlyphWarn(missing, folded);

  const flat = buildFlatTextGeometry(
    used,
    Number(el.size.value),
    totalDepth
  );
  const spanMm = measureSpan(flat);
  updateLengthWarn(spanMm);

  if (textMesh) {
    modelGroup.remove(textMesh);
    textMesh.geometry.dispose();
    textMesh = null;
  }

  if (wrap) {
    wrapGeometryToHull(flat, side, textY, style);
    textMesh = new THREE.Mesh(flat, textMaterial);
  } else {
    textMesh = placeFlatOnHull(flat, side, textY, style);
  }

  modelGroup.add(textMesh);
  applyModelScale();
  return Promise.resolve();
}

function scheduleRebuild() {
  updateLabels();
  window.clearTimeout(rebuildTimer);
  return new Promise((resolve) => {
    rebuildTimer = window.setTimeout(() => {
      rebuildText().then(resolve);
    }, 120);
  });
}

function flushRebuild() {
  window.clearTimeout(rebuildTimer);
  return rebuildText();
}

function frameCamera() {
  if (!shipMesh) return;
  const box = new THREE.Box3().setFromObject(modelGroup);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  controls.target.copy(center);
  const maxDim = Math.max(size.x, size.y, size.z);
  const zDir = selectedSide() === "right" ? 1 : -1;
  camera.position.set(
    center.x + maxDim * 0.35,
    center.y + maxDim * 0.05,
    center.z + zDir * maxDim * 1.55
  );
  controls.update();
}

/** Tight crop on the lettering — better for Printables gallery covers. */
function frameCoverCamera() {
  if (!textMesh) {
    frameCamera();
    return;
  }
  textMesh.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(textMesh);
  // Pad so a bit of hull shows around the letters.
  box.expandByScalar(6);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  controls.target.copy(center);
  const maxDim = Math.max(size.x, size.y, size.z, 12);
  const zDir = selectedSide() === "right" ? 1 : -1;
  camera.position.set(
    center.x + maxDim * 0.55,
    center.y + maxDim * 0.08,
    center.z + zDir * maxDim * 1.85
  );
  controls.update();
}

function normalizeHex(value) {
  if (!value) return null;
  const hex = value.startsWith("#") ? value : `#${value}`;
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toLowerCase() : null;
}

function nameSlug() {
  return (
    (el.name.value.trim() || "starship")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 40) || "starship"
  );
}

function readState() {
  return {
    name: el.name.value.trim(),
    color: el.color.value.replace("#", ""),
    text: el.textColor.value.replace("#", ""),
    font: currentFontId || el.fontStyle.value || "optimer-bold",
    size: el.size.value,
    pos: el.pos.value,
    depth: el.depth.value,
    scale: el.scale.value,
    side: selectedSide(),
    style: selectedStyle(),
    wrap: el.wrap.checked ? "1" : "0",
  };
}

function applyState(state) {
  if (state.name != null) el.name.value = String(state.name).slice(0, 24);
  const hull = normalizeHex(state.color);
  if (hull) el.color.value = hull;
  const letter = normalizeHex(state.text) || hull;
  if (letter) el.textColor.value = letter;
  if (state.font && FONT_OPTIONS[state.font]) {
    el.fontStyle.value = state.font;
    currentFontId = state.font;
  }
  if (state.size != null) el.size.value = state.size;
  if (state.pos != null) el.pos.value = state.pos;
  if (state.depth != null) el.depth.value = state.depth;
  if (state.scale != null) {
    const n = Number(state.scale);
    if (Number.isFinite(n)) el.scale.value = String(Math.min(200, Math.max(50, n)));
  }
  if (state.side === "left" || state.side === "right") {
    const radio = document.querySelector(
      `input[name="side"][value="${state.side}"]`
    );
    if (radio) radio.checked = true;
  }
  if (state.style === "raised" || state.style === "engraved") {
    const radio = document.querySelector(
      `input[name="style"][value="${state.style}"]`
    );
    if (radio) radio.checked = true;
  }
  if (state.wrap === "0" || state.wrap === "false") el.wrap.checked = false;
  if (state.wrap === "1" || state.wrap === "true") el.wrap.checked = true;
  updateLabels();
  applyModelScale();
  applyColor();
}

function stateFromUrl() {
  const q = new URLSearchParams(window.location.search);
  const state = {};
  for (const key of [
    "name",
    "color",
    "text",
    "font",
    "size",
    "pos",
    "depth",
    "scale",
    "side",
    "style",
    "wrap",
  ]) {
    if (q.has(key)) state[key] = q.get(key);
  }
  return state;
}

function writeUrl(replace = true) {
  const s = readState();
  const q = new URLSearchParams();
  if (s.name) q.set("name", s.name);
  q.set("color", s.color);
  q.set("text", s.text);
  q.set("font", s.font);
  q.set("size", s.size);
  q.set("pos", s.pos);
  q.set("depth", s.depth);
  q.set("scale", s.scale);
  q.set("side", s.side);
  q.set("style", s.style);
  q.set("wrap", s.wrap);
  const url = `${window.location.pathname}?${q.toString()}`;
  if (replace) history.replaceState(null, "", url);
  return `${window.location.origin}${url}`;
}

function confirmLongTextIfNeeded() {
  if (lastSpanMm <= HARD_TEXT_SPAN_MM) return true;
  return window.confirm(
    `Text span is ~${lastSpanMm.toFixed(0)} mm and may hit the flaps. Download anyway?`
  );
}

function yieldToUi() {
  return new Promise((resolve) => setTimeout(resolve, 30));
}

/**
 * Ship + text geometries in model space (pre-scale), with text world-baked.
 */
function cloneModelSpaceParts() {
  if (!shipGeometry || !textMesh) throw new Error("Model not ready");
  textMesh.updateMatrixWorld(true);
  shipMesh.updateMatrixWorld(true);

  const ship = shipGeometry.clone();
  // Bake ship mesh local transform (identity today) into geometry.
  ship.applyMatrix4(shipMesh.matrix);

  const text = textMesh.geometry.clone();
  text.applyMatrix4(textMesh.matrix);

  return { ship, text };
}

function applyScaleToGeometry(geometry, scale) {
  if (scale === 1) return geometry;
  geometry.scale(scale, scale, scale);
  return geometry;
}

/**
 * True CSG subtract for engraved export. Falls back by throwing.
 */
function prepareForCsg(geometry) {
  const geo = geometry.index ? geometry.clone() : geometry.clone();
  // Drop color/uv so attribute prep matches evaluator.attributes.
  if (geo.attributes.color) geo.deleteAttribute("color");
  if (geo.attributes.uv) geo.deleteAttribute("uv");
  geo.clearGroups();
  if (!geo.attributes.normal) geo.computeVertexNormals();
  return geo;
}

function booleanEngrave(shipGeo, textGeo) {
  const shipBrush = new Brush(prepareForCsg(shipGeo));
  const textBrush = new Brush(prepareForCsg(textGeo));
  shipBrush.updateMatrixWorld(true);
  textBrush.updateMatrixWorld(true);

  try {
    const result = csgEvaluator.evaluate(shipBrush, textBrush, SUBTRACTION);
    return result.geometry;
  } catch (err) {
    console.warn("SUBTRACTION failed, trying HOLLOW_SUBTRACTION", err);
    const result = csgEvaluator.evaluate(
      shipBrush,
      textBrush,
      HOLLOW_SUBTRACTION
    );
    return result.geometry;
  }
}

/**
 * @returns {{ mode: 'boolean'|'merged', geometry?: THREE.BufferGeometry, group?: THREE.Group, note: string }}
 */
function buildExportMeshes({ preferBoolean }) {
  const scale = modelScale();
  const style = selectedStyle();
  const { ship, text } = cloneModelSpaceParts();

  if (style === "engraved" && preferBoolean) {
    try {
      const cut = booleanEngrave(ship, text);
      applyScaleToGeometry(cut, scale);
      cut.computeVertexNormals();
      ship.dispose();
      text.dispose();
      return {
        mode: "boolean",
        geometry: cut,
        note: "Engraved with true boolean subtract.",
      };
    } catch (err) {
      console.warn("CSG engraving failed; falling back to inset merge", err);
    }
  }

  applyScaleToGeometry(ship, scale);
  applyScaleToGeometry(text, scale);
  ship.computeVertexNormals();
  text.computeVertexNormals();

  const group = new THREE.Group();
  group.add(new THREE.Mesh(ship));
  group.add(new THREE.Mesh(text));

  const note =
    style === "engraved"
      ? "Boolean failed — exported inset letter meshes (use slicer mesh-boolean if needed)."
      : "Raised letters merged with hull.";

  return { mode: "merged", group, ship, text, note };
}

function triggerDownload(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function setExportBusy(busy) {
  el.download.disabled = busy;
  el.download3mf.disabled = busy;
  el.downloadPng.disabled = busy;
  el.downloadScad.disabled = busy;
}

async function downloadStl() {
  try {
    setExportBusy(true);
    setStatus("Building STL…");
    await flushRebuild();
    if (!confirmLongTextIfNeeded()) {
      setStatus("Download cancelled.");
      return;
    }

    const preferBoolean = selectedStyle() === "engraved";
    if (preferBoolean) {
      setStatus("Boolean engraving… this can take a few seconds.");
      await yieldToUi();
    }

    const payload = buildExportMeshes({ preferBoolean });
    const exporter = new STLExporter();
    let buffer;
    if (payload.mode === "boolean") {
      buffer = exporter.parse(new THREE.Mesh(payload.geometry), { binary: true });
      payload.geometry.dispose();
    } else {
      buffer = exporter.parse(payload.group, { binary: true });
      payload.ship.dispose();
      payload.text.dispose();
    }

    triggerDownload(
      new Blob([buffer], { type: "model/stl" }),
      `starship_${nameSlug()}.stl`
    );
    writeUrl();
    setStatus(
      `STL downloaded — ${payload.note} Color is preview-only; set filament in your slicer.`
    );
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Export failed", true);
  } finally {
    setExportBusy(false);
  }
}

async function download3mf() {
  try {
    setExportBusy(true);
    setStatus("Building 3MF…");
    await flushRebuild();
    if (!confirmLongTextIfNeeded()) {
      setStatus("Download cancelled.");
      return;
    }

    const style = selectedStyle();
    const hullColor = el.color.value;
    const letterColor = el.textColor.value;
    const scale = modelScale();

    let parts;

    if (style === "engraved") {
      setStatus("Boolean engraving for 3MF…");
      await yieldToUi();
      const payload = buildExportMeshes({ preferBoolean: true });
      if (payload.mode === "boolean") {
        parts = [
          {
            name: "Hull (engraved)",
            geometry: payload.geometry,
            color: hullColor,
          },
        ];
      } else {
        // Fallback: two objects so slicer can still assign materials / boolean.
        parts = [
          { name: "Hull", geometry: payload.ship, color: hullColor },
          { name: "Letters (cutter)", geometry: payload.text, color: letterColor },
        ];
      }
      setStatus(
        payload.mode === "boolean"
          ? "Packing engraved 3MF…"
          : "Packing 3MF (inset fallback)…"
      );
    } else {
      const { ship, text } = cloneModelSpaceParts();
      applyScaleToGeometry(ship, scale);
      applyScaleToGeometry(text, scale);
      parts = [
        { name: "Hull", geometry: ship, color: hullColor },
        { name: "Letters", geometry: text, color: letterColor },
      ];
      setStatus("Packing multi-material 3MF…");
    }

    await yieldToUi();
    const zipped = build3mf(parts, {
      application: APP_NAME,
      author: `${AUTHOR.name} (${AUTHOR.url})`,
      version: versionLabel(),
    });
    for (const p of parts) p.geometry.dispose();

    triggerDownload(
      new Blob([zipped], { type: "model/3mf" }),
      `starship_${nameSlug()}.3mf`
    );
    writeUrl();
    setStatus(
      style === "raised"
        ? "3MF downloaded — assign Hull / Letters to extruders in your slicer (MMU)."
        : "3MF downloaded — engraved hull is a single solid (recess cut)."
    );
  } catch (err) {
    console.error(err);
    setStatus(err.message || "3MF export failed", true);
  } finally {
    setExportBusy(false);
  }
}

async function captureCoverDataUrl() {
  await flushRebuild();
  frameCoverCamera();
  const prevHud = el.hud.hidden;
  el.hud.hidden = true;
  resize();
  renderer.render(scene, camera);
  const dataUrl = renderer.domElement.toDataURL("image/png");
  el.hud.hidden = prevHud;
  return dataUrl;
}

async function downloadPng() {
  try {
    setExportBusy(true);
    setStatus("Capturing cover…");
    const dataUrl = await captureCoverDataUrl();
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `starship_${nameSlug()}_cover.png`;
    a.click();
    setStatus("PNG cover downloaded — good for Printables gallery images.");
  } catch (err) {
    console.error(err);
    setStatus(err.message || "PNG capture failed", true);
  } finally {
    setExportBusy(false);
  }
}

// Dev/automation hook for headless cover capture.
window.__starshipCaptureCover = captureCoverDataUrl;

function downloadOpenscadSnippet() {
  const s = readState();
  const fontKey = FONT_OPTIONS[s.font] ? s.font : "optimer-bold";
  const openscadFont = FONT_OPTIONS[fontKey].openscad;
  // Web proud depth + embed ≈ OpenSCAD Text_Depth with Surface_Offset = -EMBED
  const textDepth = (EMBED_MM + Number(s.depth)).toFixed(2);
  const nameEscaped = (s.name || "Custom Name").replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  const scad = `// Generated by ${creditLine()}
// ${AUTHOR.repo}
// Wrap-to-hull is web-only — OpenSCAD uses flat emboss/engrave.
// Open with openscad/starship_custom_name.scad or paste into Customizer.

/* [Text] */
Name = "${nameEscaped}";
Text_Size = ${Number(s.size).toFixed(1)}; // [3:0.5:8]
Text_Depth = ${textDepth}; // [0.5:0.05:1.5]
Font = "${openscadFont}"; // web font: ${fontKey}
Style = "${s.style}"; // [raised, engraved]

/* [Placement] */
Text_Y = ${Number(s.pos)}; // [-30:1:30]
Side = "${s.side}"; // [right, left]
Text_X_Offset = 0;
Surface_Offset = -${EMBED_MM};

/* [Export] */
Part = "preview_with_ship"; // [text_only, preview_with_ship]

// Model scale ${s.scale}% is web/export-only — scale in the slicer if needed.
`;

  triggerDownload(
    new Blob([scad], { type: "text/plain" }),
    `starship_${nameSlug()}_params.scad`
  );
  setStatus("OpenSCAD params downloaded — open with the included .scad (no hull wrap).");
  writeUrl();
}

async function copyShareLink() {
  const url = writeUrl();
  try {
    await navigator.clipboard.writeText(url);
    setStatus("Link copied — shares name, colors, font, scale, and placement.");
  } catch {
    setStatus(`Copy failed — URL is ${url}`, true);
  }
}

async function fitTextToHull() {
  if (!font || !ready) return;
  let size = Number(el.size.value);
  while (size > 3) {
    const { used } = sanitizeName(el.name.value);
    const geo = buildFlatTextGeometry(
      used,
      size,
      EMBED_MM + Number(el.depth.value)
    );
    const span = measureSpan(geo);
    geo.dispose();
    if (span <= SAFE_TEXT_SPAN_MM) break;
    size -= 0.5;
  }
  el.size.value = String(size);
  updateLabels();
  await flushRebuild();
  writeUrl();
  setStatus(
    lastSpanMm <= SAFE_TEXT_SPAN_MM
      ? `Fitted to ${size.toFixed(1)} mm letter height (span ~${lastSpanMm.toFixed(0)} mm).`
      : `Still long at minimum size (~${lastSpanMm.toFixed(0)} mm). Shorten the name.`
  );
}

function onControlChange() {
  scheduleRebuild().then(() => writeUrl());
}

async function boot() {
  document.title = `${APP_NAME} ${versionLabel()}`;
  const verNodes = [
    document.getElementById("app-version"),
    document.getElementById("footer-version"),
  ];
  for (const node of verNodes) {
    if (node) node.textContent = versionLabel();
  }

  el.form.addEventListener("submit", (e) => e.preventDefault());
  const urlState = stateFromUrl();
  mountFontOptions(
    urlState.font && FONT_OPTIONS[urlState.font] ? urlState.font : "optimer-bold"
  );
  mountPresets(el.hullPresets, el.color);
  mountPresets(el.textPresets, el.textColor);
  applyState(urlState);
  updateLabels();
  resize();
  window.addEventListener("resize", resize);

  el.color.addEventListener("input", () => {
    applyColor();
    writeUrl();
  });
  el.textColor.addEventListener("input", () => {
    applyColor();
    writeUrl();
  });
  el.name.addEventListener("input", onControlChange);
  el.size.addEventListener("input", onControlChange);
  el.pos.addEventListener("input", onControlChange);
  el.depth.addEventListener("input", onControlChange);
  el.scale.addEventListener("input", () => {
    updateLabels();
    applyModelScale();
    writeUrl();
  });
  el.wrap.addEventListener("change", onControlChange);
  el.fontStyle.addEventListener("change", () => {
    applyFontSelection(el.fontStyle.value).catch((err) => {
      console.error(err);
      setStatus("Failed to load that font.", true);
    });
  });
  for (const radio of document.querySelectorAll(
    'input[name="side"], input[name="style"]'
  )) {
    radio.addEventListener("change", () => {
      onControlChange();
      if (radio.name === "side") frameCamera();
    });
  }
  el.download.addEventListener("click", downloadStl);
  el.download3mf.addEventListener("click", download3mf);
  el.downloadPng.addEventListener("click", downloadPng);
  el.downloadScad.addEventListener("click", downloadOpenscadSnippet);
  el.copyLink.addEventListener("click", copyShareLink);
  el.resetView.addEventListener("click", () => {
    frameCamera();
    setStatus("View reset.");
  });
  el.fitSize.addEventListener("click", fitTextToHull);

  try {
    const stlLoader = new STLLoader();
    const initialFontId = FONT_OPTIONS[el.fontStyle.value]
      ? el.fontStyle.value
      : "optimer-bold";

    const [, geometry] = await Promise.all([
      applyFontSelection(initialFontId, { rebuild: false }),
      stlLoader.loadAsync(SHIP_URL),
    ]);

    shipGeometry = geometry;
    shipGeometry.computeVertexNormals();

    shipMesh = new THREE.Mesh(shipGeometry, shipMaterial);
    modelGroup.add(shipMesh);
    applyModelScale();

    ready = true;
    setExportBusy(false);
    applyColor();
    await rebuildText();
    frameCamera();
    writeUrl();
    setStatus("Ready — edit the name, then download STL / 3MF / PNG.");
  } catch (err) {
    console.error(err);
    setStatus("Failed to load ship or font.", true);
    setExportBusy(true);
  }
}

function tick() {
  requestAnimationFrame(tick);
  controls.update();
  renderer.render(scene, camera);
}

boot();
tick();
