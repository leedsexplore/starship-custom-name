import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { STLExporter } from "three/addons/exporters/STLExporter.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { Brush, Evaluator, SUBTRACTION, HOLLOW_SUBTRACTION } from "three-bvh-csg";
import { build3mf } from "./export3mf.js?v=2.4.37";
import {
  APP_NAME,
  APP_VERSION,
  AUTHOR,
  creditLine,
  versionLabel,
} from "./version.js?v=2.4.37";

const CACHE_BUST = APP_VERSION;

/**
 * Base ship meshes. Placement values are mesh-space mm; the app convention is
 * hull length along Y, text faces ±Z, flaps along ±X (set by the legacy mesh —
 * other meshes are reoriented on load via orient()).
 */
const SHIPS = {
  parametric: {
    id: "parametric",
    label: "Original CAD 1:200",
    url: `./assets/starship_ship_print_1_200.stl?v=${CACHE_BUST}`,
    /** Key into print_envelope.json meshes[] for measured dimensions. */
    envelopeFile: "assets/starship_ship_print_1_200.stl",
    /**
     * Preview layers (steel + tiled heat shield). The combined one-piece STL is
     * loaded only on first named export/CSG so Ready stays ~19 MB of layers,
     * not +10 MB solid prefetch. Hex Printables files are Release-hosted on
     * the slim Pages deploy (not fetched at boot).
     */
    layers: [
      {
        id: "steel",
        role: "steel",
        url: `./assets/starship_print_1_200_steel.stl?v=${CACHE_BUST}`,
      },
      {
        id: "tiles",
        role: "tiles",
        url: `./assets/starship_print_1_200_tiles_shell.stl?v=${CACHE_BUST}`,
      },
      {
        id: "engines",
        role: "engines",
        url: `./assets/starship_print_1_200_engines.stl?v=${CACHE_BUST}`,
      },
    ],
    bodyCenterX: 0,
    /** Measured mid-barrel Ø 45.0 mm after weld-ring removal (AABB / envelope). */
    hullRadiusZ: 22.5,
    embedMm: 0.35,
    safeSpanMm: 100,
    hardSpanMm: 120,
    /**
     * Warn when lettering climbs past the forward-flap band into the nose.
     * Forward flap occupies ~Y 63.75–75.55 (mesh-centered 1:200).
     */
    flapZoneYMm: 95,
    defaultSizeMm: 3.5,
    /**
     * Leeward stainless, toward the nose; letters run nose→engines (first char at top).
     * Default side "both" = port + starboard stainless flanks (real ship).
     * Default pos centers so the bottom glyph sits on the forward-flap bottom.
     */
    defaultPosMm: 68,
    defaultSide: "both",
    /**
     * Bottom of forward flaps in mesh-centered app Y (CAD fwd_z0=38.8 m → 194 mm
     * above the base at 1:200; half-height 130.25 → Y 63.75).
     */
    forwardFlapBottomYMm: 63.75,
    /** Circumferential offset (mm along hull) toward the opposite TPS seam (−X). */
    markingAcrossMm: -16,
    /** Exported nose-up along +Z with flaps on ±Y — swing into app convention. */
    orient(geometry) {
      geometry.rotateX(-Math.PI / 2); // nose +Z → +Y
      geometry.rotateY(Math.PI / 2); // flaps ±Z → ±X
      // Center on the full print height — NOT this mesh's AABB. Engines / partial
      // layers only span a slice; AABB-centering buried them inside the hull.
      const halfH = (this.meshDefaults?.meshHeightMm ?? 260.5) / 2;
      geometry.translate(0, -halfH, 0);
    },
    meshDefaults: {
      meshHeightMm: 260.5,
      meshDiameterMm: 45.0,
      meshFootprintMaxMm: 79.7,
    },
  },
  legacy: {
    id: "legacy",
    label: "Classic remix (v1.x)",
    /** Pre-v2 customizer mesh — Josh1297 Starship (same as v1.1.5). */
    url: `./assets/StarShipV2_original.stl?v=${CACHE_BUST}`,
    envelopeFile: "assets/StarShipV2_original.stl",
    bodyCenterX: -22.3,
    /** Mid-body cylinder radius tuned for this mesh (v1.1.x placement). */
    hullRadiusZ: 10.7,
    embedMm: 0.35,
    safeSpanMm: 48,
    hardSpanMm: 60,
    flapZoneYMm: 28,
    defaultSizeMm: 5,
    /** Same S##-style band, scaled to the shorter remix mesh. */
    defaultPosMm: -2,
    defaultSide: "both",
    /** No seam bias — "both" places opposite ±Z faces on this mesh. */
    markingAcrossMm: 0,
    orient() {},
    meshDefaults: {
      meshHeightMm: 121,
      meshDiameterMm: 27.7807,
      meshFootprintMaxMm: 42.6,
    },
  },
  /**
   * Oliver Heisel SpaceX Starship Keychain (6 cm, with SpaceX logo) — CC BY-NC-SA.
   * Source: https://www.printables.com/model/1082625-spacex-starship-keychain
   */
  keychain: {
    id: "keychain",
    label: "Keychain 6 cm",
    url: `./assets/starship_keychain_6cm.stl?v=${CACHE_BUST}`,
    envelopeFile: "assets/starship_keychain_6cm.stl",
    bodyCenterX: 0,
    /** Half of body depth after orient (text faces ±Z). */
    hullRadiusZ: 5.6,
    /** Cutter starts well outside so CSG cleanly breaks the hull skin. */
    embedMm: 1.0,
    safeSpanMm: 24,
    hardSpanMm: 30,
    flapZoneYMm: 18,
    /** Smaller than desk models — slider min drops to 2 mm for this base. */
    defaultSizeMm: 2.5,
    defaultPosMm: 2,
    /**
     * Logo sits on the +Z (Leeward / "right") flank after orient — put the
     * name on the opposite −Z face (Windward / "left").
     */
    defaultSide: "left",
    /** Placeholder name for keychain share links / first paint. */
    defaultName: "Custom Name",
    /** Fun default hull color for the keychain remix. */
    defaultColor: "#ff6eb4",
    /** Recessed like the molded SpaceX logo on the opposite flank. */
    defaultStyle: "engraved",
    markingAcrossMm: 0,
    orient(geometry) {
      geometry.rotateX(-Math.PI / 2); // nose +Z → +Y
      geometry.rotateY(Math.PI / 2); // flaps → ±X
      geometry.computeBoundingBox();
      const b = geometry.boundingBox;
      geometry.translate(
        -(b.min.x + b.max.x) / 2,
        -(b.min.y + b.max.y) / 2,
        -(b.min.z + b.max.z) / 2
      );
    },
    meshDefaults: {
      meshHeightMm: 57.94,
      meshDiameterMm: 11.21,
      meshFootprintMaxMm: 20.0,
    },
  },
};

const DEFAULT_SHIP_ID = "parametric";
let ship = SHIPS[DEFAULT_SHIP_ID];

const ENVELOPE_URL = "./assets/print_envelope.json";

/** Published ship + CORE One 1:200 targets (overridden by print_envelope.json). */
const PRINT_DEFAULTS = {
  realHeightM: 52.1,
  realDiameterM: 9.0,
  targetScale: 200,
  targetHeightMm: 260.5,
  coreOne: { x_mm: 250, y_mm: 220, z_mm: 270 },
  /** Fallback mesh envelope (parametric 1:200) if ship.meshDefaults / JSON missing. */
  meshHeightMm: 260.5,
  meshDiameterMm: 45.0,
  meshFootprintMaxMm: 79.7,
};

let envelopeData = null;
let printEnvelope = { ...PRINT_DEFAULTS, ...ship.meshDefaults };

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

for (const opt of Object.values(FONT_OPTIONS)) {
  if (!/[?&]v=/.test(opt.url)) {
    opt.url += `${opt.url.includes("?") ? "&" : "?"}v=${CACHE_BUST}`;
  }
}

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
  {
    id: "bubblegum-pink",
    name: "Bubblegum Pink",
    hex: "#ff6eb4",
    filament: "Custom",
    sku: "keychain remix default",
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
  italic: document.getElementById("italic"),
  bareStainless: document.getElementById("bare-stainless"),
  bareStainlessField: document.getElementById("bare-stainless-field"),
  bareStainlessNote: document.getElementById("bare-stainless-note"),
  sizeLabel: document.getElementById("size-label"),
  posLabel: document.getElementById("pos-label"),
  depthLabel: document.getElementById("depth-label"),
  scaleLabel: document.getElementById("scale-label"),
  coreOnePreset: document.getElementById("core-one-preset"),
  mini250Preset: document.getElementById("mini-250-preset"),
  mini300Preset: document.getElementById("mini-300-preset"),
  download: document.getElementById("download"),
  download3mf: document.getElementById("download-3mf"),
  downloadPng: document.getElementById("download-png"),
  downloadScad: document.getElementById("download-scad"),
  exportPathNote: document.getElementById("export-path-note"),
  postDownloadCta: document.getElementById("post-download-cta"),
  namePresets: document.getElementById("name-presets"),
  copyLinkAgain: document.getElementById("copy-link-again"),
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

scene.add(new THREE.AmbientLight(0xffffff, 0.28));
const key = new THREE.DirectionalLight(0xffffff, 0.95);
key.position.set(-40, 80, 90);
scene.add(key);
const fill = new THREE.DirectionalLight(0x9eb6ff, 0.32);
fill.position.set(-60, -20, -50);
scene.add(fill);
const rim = new THREE.DirectionalLight(0xffe0c0, 0.4);
rim.position.set(-20, 40, 100);
scene.add(rim);
/** Windward fill + high rake so hex tile relief reads on the black side. */
const tileLight = new THREE.DirectionalLight(0xfff4e0, 0.75);
tileLight.position.set(90, 30, -35);
scene.add(tileLight);
const rake = new THREE.DirectionalLight(0xffffff, 0.4);
rake.position.set(40, 160, 10);
scene.add(rake);

/** Soft studio environment so stainless steel has something to reflect. */
{
  const ec = document.createElement("canvas");
  ec.width = 1024;
  ec.height = 512;
  const eg = ec.getContext("2d");
  const sky = eg.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0.0, "#9fb0c4");
  sky.addColorStop(0.42, "#6d7f99");
  sky.addColorStop(0.5, "#b8a98e");
  sky.addColorStop(0.55, "#2e333c");
  sky.addColorStop(1.0, "#101218");
  eg.fillStyle = sky;
  eg.fillRect(0, 0, 1024, 512);
  eg.fillStyle = "rgba(255,250,240,0.9)";
  eg.fillRect(120, 60, 180, 120);
  eg.fillRect(620, 40, 220, 140);
  const envTex = new THREE.CanvasTexture(ec);
  envTex.mapping = THREE.EquirectangularReflectionMapping;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromEquirectangular(envTex).texture;
  envTex.dispose();
  pmrem.dispose();
}

/** Root for ship + text so scale % applies to both. */
const modelGroup = new THREE.Group();
scene.add(modelGroup);

const shipMaterial = new THREE.MeshStandardMaterial({
  color: new THREE.Color(el.color.value),
  metalness: 0.42,
  roughness: 0.4,
});
/** Parametric preview: polished stainless (hull color picker drives this). */
const steelMaterial = new THREE.MeshStandardMaterial({
  color: new THREE.Color("#c8ced6"),
  metalness: 0.95,
  roughness: 0.2,
  envMapIntensity: 0.7,
});
/**
 * Seamless hexagonal heat-tile bump map, calibrated to the print tiles:
 * pointy-top hexes, 6 columns per repeat with applyTileUVs scale 8.7 mm →
 * 1.45 mm flat-to-flat with thin ~0.2 mm grooves — same HEX_FTF / GROOVE_W as
 * emboss_hex_tiles.py (scale-true 0.29 m tiles measured off tiles_combined.stl).
 */
function makeHexTileTexture() {
  const S = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d");
  // Groove floor between plates (recessed in the bump map).
  g.fillStyle = "#242424";
  g.fillRect(0, 0, S, S);
  const px = S / 6; // hex pitch = 1.45 mm (plate FTF + groove)
  const py = S / 7; // circumferential row pitch ≈ 0.866 · px
  // Scale-true groove: 0.2 mm of the 1.45 mm pitch, like the print plates.
  const groove = px * (0.2 / 1.45);
  // Pointy-top plate: across-flats (horizontal) = √3 · R.
  const R = (px - groove) / Math.sqrt(3);
  for (let j = -1; j <= 8; j++) {
    for (let i = -1; i <= 7; i++) {
      const cx = i * px + (j % 2 ? px / 2 : 0);
      const cy = j * py;
      // Flat plate face — uniform height with only a slim anti-alias rim,
      // so tiles read as a honeycomb of plates, not domed buttons.
      const grad = g.createRadialGradient(cx, cy, R * 0.85, cx, cy, R);
      grad.addColorStop(0, "#c8c8c8");
      grad.addColorStop(0.75, "#c4c4c4");
      grad.addColorStop(1, "#9a9a9a");
      g.fillStyle = grad;
      g.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = Math.PI / 6 + k * (Math.PI / 3);
        const x = cx + R * Math.cos(a);
        const y = cy + R * Math.sin(a);
        if (k) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      g.closePath();
      g.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  // Fine 1.45 mm tiles smear at glancing angles without anisotropy.
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

/** Preview sugar for the smooth tile shell. */
const tilesBumpMap = makeHexTileTexture();
/** Parametric preview: black heat-shield tiles with hex bump (shell only). */
const tilesMaterial = new THREE.MeshStandardMaterial({
  color: new THREE.Color(0x1e2126),
  metalness: 0.2,
  roughness: 0.62,
  envMapIntensity: 0.35,
  bumpMap: tilesBumpMap,
  // Denser tiles need less per-texel relief; visual target ≈0.2 mm grooves.
  bumpScale: 0.85,
});
/** Raptor bells — smooth black, no heat-tile bump. */
const enginesMaterial = new THREE.MeshStandardMaterial({
  color: new THREE.Color(0x121417),
  metalness: 0.35,
  roughness: 0.55,
  envMapIntensity: 0.25,
});

const TILES_DEFAULT = {
  color: 0x1e2126,
  metalness: 0.2,
  roughness: 0.62,
  envMapIntensity: 0.35,
  bumpScale: 0.85,
};
const ENGINES_DEFAULT = {
  color: 0x121417,
  metalness: 0.35,
  roughness: 0.55,
  envMapIntensity: 0.25,
};

function bareStainlessOn() {
  return Boolean(el.bareStainless?.checked) && Boolean(ship.layers?.length);
}

function syncBareStainlessControl() {
  const available = Boolean(ship.layers?.length);
  if (el.bareStainless) {
    el.bareStainless.disabled = !available;
    if (!available) el.bareStainless.checked = false;
  }
  if (el.bareStainlessField) {
    el.bareStainlessField.hidden = !available;
  }
  if (el.bareStainlessNote) {
    el.bareStainlessNote.hidden = !available;
  }
}

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

/**
 * Preview-only engraved letters. MeshBasicMaterial + no depth test = solid
 * glyphs that cannot z-fight the hull. STL/3MF still boolean-cut.
 */
const inlayMaterial = new THREE.MeshBasicMaterial({
  color: new THREE.Color(el.textColor.value),
  side: THREE.DoubleSide,
  depthTest: false,
  depthWrite: false,
  toneMapped: false,
});

let font = null;
let fontGlyphs = new Set();
let currentFontId = "oswald-bold";
const fontCache = new Map();
let fontLoadToken = 0;
let shipGeometry = null;
/** Display object: Mesh (legacy) or Group of layered meshes (parametric). */
let shipMesh = null;
/** Thick letter solid — used for CSG export / live cut (may be hidden). */
let textMesh = null;
/** Thin text-color plate drawn in the engraved cavity for a clean preview. */
let inlayMesh = null;
/** True when shipMesh.geometry is a boolean-cut preview (not shipGeometry). */
let engravedCutActive = false;
let ready = false;
let rebuildTimer = 0;
let lastSpanMm = 0;
/**
 * When false, parametric lettering keeps its bottom glyph on the forward-flap
 * line as name/size change. Manual position slider / share-URL pos pins it.
 */
let posPinnedByUser = false;
const csgEvaluator = new Evaluator();
// STL ship has position/normal/color — no uvs. Default evaluator attrs include uv and crash.
csgEvaluator.attributes = ["position", "normal"];
csgEvaluator.useGroups = false;

/**
 * Cylindrical UV unwrap for the tile shell (print-scale, Z-up, before orient()).
 * Flap faces keep a planar map so the hex pattern doesn't smear.
 * scaleMm 8.7 = one texture repeat per 8.7 mm → 1.45 mm hex pitch (6 columns).
 */
function applyTileUVs(geom, hullRadiusZ, scaleMm = 8.7) {
  const HULL_R = hullRadiusZ;
  const p = geom.attributes.position;
  const n = p.count;
  const uv = new Float32Array(n * 2);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  for (let i = 0; i < n; i += 3) {
    a.fromBufferAttribute(p, i);
    b.fromBufferAttribute(p, i + 1);
    c.fromBufferAttribute(p, i + 2);
    nrm.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a)).normalize();
    const mx = (a.x + b.x + c.x) / 3;
    const my = (a.y + b.y + c.y) / 3;
    const mr = Math.hypot(mx, my) || 1;
    const radial = Math.abs((nrm.x * mx + nrm.y * my) / mr) > 0.5;
    for (let k = 0; k < 3; k++) {
      const v = [a, b, c][k];
      const o = (i + k) * 2;
      if (radial) {
        uv[o] = (Math.atan2(v.y, v.x) * HULL_R) / scaleMm;
        uv[o + 1] = v.z / scaleMm;
      } else {
        uv[o] = v.y / scaleMm;
        uv[o + 1] = v.z / scaleMm;
      }
    }
  }
  geom.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

async function loadFontById(fontId) {
  const id = FONT_OPTIONS[fontId] ? fontId : "oswald-bold";
  if (fontCache.has(id)) {
    return { id, font: fontCache.get(id) };
  }
  const loader = new FontLoader();
  const loaded = await loader.loadAsync(FONT_OPTIONS[id].url);
  fontCache.set(id, loaded);
  return { id, font: loaded };
}

async function applyFontSelection(fontId, { rebuild = true } = {}) {
  const wanted = FONT_OPTIONS[fontId] ? fontId : "oswald-bold";
  const token = ++fontLoadToken;
  setStatus("Loading font…");
  try {
    const { id, font: loaded } = await loadFontById(wanted);
    if (token !== fontLoadToken) return;
    font = loaded;
    currentFontId = id;
    fontGlyphs = new Set(Object.keys(font.data?.glyphs || {}));
    if (el.fontStyle.value !== id) el.fontStyle.value = id;
    if (rebuild && ready) {
      await flushRebuild();
      if (token !== fontLoadToken) return;
      writeUrl();
      setStatus(`Font: ${FONT_OPTIONS[id].label}`);
    }
  } catch (err) {
    if (token !== fontLoadToken) return;
    throw err;
  }
}

function setStatus(msg, isError = false) {
  el.status.textContent = msg;
  el.status.classList.toggle("error", isError);
}

function showPostDownloadCta(show = true) {
  if (!el.postDownloadCta) return;
  el.postDownloadCta.hidden = !show;
}

async function applyNamePreset(name) {
  el.name.value = name;
  // Presets re-lock the bottom glyph to the forward-flap line.
  posPinnedByUser = false;
  onControlChange();
  await flushRebuild();
  writeUrl();
  setStatus(`Preset “${name}” — Copy link or PNG cover to share.`);
}

function selectedSide() {
  const value = document.querySelector('input[name="side"]:checked')?.value;
  if (value === "left" || value === "both") return value;
  return "right";
}

/** Camera / single-face view direction for the selected side control. */
function viewSide() {
  return selectedSide() === "left" ? "left" : "right";
}

function selectedShipId() {
  const value = document.querySelector('input[name="ship"]:checked')?.value;
  return SHIPS[value] ? value : DEFAULT_SHIP_ID;
}

function setShipRadio(shipId) {
  const id = SHIPS[shipId] ? shipId : DEFAULT_SHIP_ID;
  const radio = document.querySelector(`input[name="ship"][value="${id}"]`);
  if (radio) radio.checked = true;
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

/** Scale % that makes the customizer mesh H match true 1:200 (260.5 mm). */
function coreOneScalePercent() {
  const h = printEnvelope.meshHeightMm || PRINT_DEFAULTS.meshHeightMm;
  const target = printEnvelope.targetHeightMm || PRINT_DEFAULTS.targetHeightMm;
  return (target / h) * 100;
}

function scaledPrintSize(scalePct = Number(el.scale.value)) {
  const s = scalePct / 100;
  return {
    heightMm: (printEnvelope.meshHeightMm || PRINT_DEFAULTS.meshHeightMm) * s,
    diameterMm:
      (printEnvelope.meshDiameterMm || PRINT_DEFAULTS.meshDiameterMm) * s,
    footprintMaxMm:
      (printEnvelope.meshFootprintMaxMm || PRINT_DEFAULTS.meshFootprintMaxMm) *
      s,
  };
}

function applyCoreOnePreset() {
  if (ship.id === "keychain") {
    el.scale.value = "100";
    updateLabels();
    applyModelScale();
    updateDownloadLabels();
    writeUrl();
    setStatus(
      "Keychain prints at native size (H ≈58 mm). CORE One 1:200 is for the desk models."
    );
    return;
  }
  const pct = coreOneScalePercent();
  const max = Number(el.scale.max);
  const min = Number(el.scale.min);
  el.scale.value = String(Math.min(max, Math.max(min, pct)));
  // Keep exact value even if it falls between range steps.
  if (Math.abs(Number(el.scale.value) - pct) > 0.001) {
    el.scale.value = String(pct);
  }
  updateLabels();
  applyModelScale();
  updateDownloadLabels();
  writeUrl();
  const sz = scaledPrintSize(pct);
  const z = printEnvelope.coreOne?.z_mm ?? PRINT_DEFAULTS.coreOne.z_mm;
  setStatus(
    `CORE One 1:200 — H ${sz.heightMm.toFixed(1)} mm × Ø ${sz.diameterMm.toFixed(1)} mm (Z room ${ (z - sz.heightMm).toFixed(1) } mm).`
  );
}

/** Keychain needs a lower letter-size floor than the desk models. */
function syncSizeSliderForShip() {
  if (!el.size) return;
  const keychain = ship.id === "keychain";
  el.size.min = keychain ? "2" : "3";
  el.size.step = keychain ? "0.1" : "0.5";
  const v = Number(el.size.value);
  const min = Number(el.size.min);
  const max = Number(el.size.max);
  if (v < min || v > max) el.size.value = String(Math.min(max, Math.max(min, v)));
}

/** Scale % for a true 1:denom print relative to the parametric 1:200 mesh. */
function miniScalePercent(denom) {
  return coreOneScalePercent() * (200 / denom);
}

function applyMiniScalePreset(denom) {
  if (ship.id !== "parametric") {
    setStatus(
      "Mini 1:250 / 1:300 are for Original CAD (Printables hex files). Switch base model first.",
      true
    );
    return;
  }
  const pct = miniScalePercent(denom);
  const max = Number(el.scale.max);
  const min = Number(el.scale.min);
  el.scale.value = String(Math.min(max, Math.max(min, pct)));
  if (Math.abs(Number(el.scale.value) - pct) > 0.001) {
    el.scale.value = String(pct);
  }
  updateLabels();
  applyModelScale();
  updateDownloadLabels();
  writeUrl();
  const sz = scaledPrintSize(pct);
  setStatus(
    `1:${denom} mini — H ${sz.heightMm.toFixed(1)} mm × Ø ${sz.diameterMm.toFixed(1)} mm. Empty name downloads the Printables hex one-piece.`
  );
}

async function loadPrintEnvelope() {
  try {
    const res = await fetch(ENVELOPE_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    envelopeData = await res.json();
  } catch (err) {
    console.warn("print_envelope.json unavailable; using built-in defaults", err);
    envelopeData = null;
  }
  applyEnvelopeForShip();
}

/** Refresh envelope numbers for the active ship (measured entry when present). */
function applyEnvelopeForShip() {
  const data = envelopeData || {};
  const target = data.target_print || {};
  const real = data.real_ship || {};
  const mesh =
    (data.meshes || []).find((m) => m.file === ship.envelopeFile) || {};
  printEnvelope = {
    realHeightM: real.height_m ?? PRINT_DEFAULTS.realHeightM,
    realDiameterM: real.diameter_m ?? PRINT_DEFAULTS.realDiameterM,
    targetScale: Number(String(target.scale || "1:200").split(":").pop()) || 200,
    targetHeightMm: target.height_mm ?? PRINT_DEFAULTS.targetHeightMm,
    coreOne: target.build_volume_mm || PRINT_DEFAULTS.coreOne,
    meshHeightMm: mesh.height_mm ?? ship.meshDefaults.meshHeightMm,
    meshDiameterMm:
      mesh.mid_barrel_diameter_mm ?? ship.meshDefaults.meshDiameterMm,
    meshFootprintMaxMm:
      mesh.footprint_max_mm ?? ship.meshDefaults.meshFootprintMaxMm,
  };
  // Slider must reach the measured CORE One % (100% parametric, ≈215% legacy).
  const need = Math.ceil(coreOneScalePercent() + 0.5);
  if (Number(el.scale.max) < need) el.scale.max = String(need);
}

const shipGeometryCache = new Map();
const shipLayerCache = new Map();

async function loadShipGeometry(shipDef) {
  const key = shipDef.id;
  if (shipGeometryCache.has(key)) {
    return shipGeometryCache.get(key);
  }
  const geometry = await new STLLoader().loadAsync(shipDef.url);
  shipDef.orient(geometry);
  geometry.computeVertexNormals();
  shipGeometryCache.set(key, geometry);
  return geometry;
}

async function loadShipLayers(shipDef) {
  const layerDefs = shipDef.layers;
  if (!layerDefs?.length) return null;
  const key = shipDef.id;
  if (shipLayerCache.has(key)) {
    return shipLayerCache.get(key);
  }
  const loader = new STLLoader();
  const parts = await Promise.all(
    layerDefs.map(async (layer) => {
      const geometry = await loader.loadAsync(layer.url);
      if (layer.role === "tiles") applyTileUVs(geometry, shipDef.hullRadiusZ);
      geometry.computeVertexNormals();
      shipDef.orient(geometry);
      const material =
        layer.role === "tiles"
          ? tilesMaterial
          : layer.role === "engines"
            ? enginesMaterial
            : steelMaterial;
      return new THREE.Mesh(geometry, material);
    })
  );
  const group = new THREE.Group();
  for (const mesh of parts) group.add(mesh);
  shipLayerCache.set(key, group);
  return group;
}

function buildShipDisplay(geometry, layers) {
  if (layers) return layers;
  return new THREE.Mesh(geometry, shipMaterial);
}

/**
 * Combined solid used for STL/3MF/CSG. Layered parametric preview skips this on
 * first paint; call before any export that needs a single hull volume.
 */
async function ensureShipGeometry(shipDef = ship) {
  const key = shipDef.id;
  if (shipGeometryCache.has(key)) {
    const geo = shipGeometryCache.get(key);
    if (shipDef.id === ship.id) shipGeometry = geo;
    return geo;
  }
  const geo = await loadShipGeometry(shipDef);
  if (shipDef.id === ship.id) shipGeometry = geo;
  return geo;
}

/** Disable downloads and (optionally) the whole control form during load/export. */
function setUiBusy(busy, { lockForm = false } = {}) {
  if (busy) {
    el.download.disabled = true;
    el.download3mf.disabled = true;
    el.downloadPng.disabled = true;
    el.downloadScad.disabled = true;
  } else {
    el.download.disabled = false;
    el.downloadPng.disabled = false;
    el.downloadScad.disabled = false;
    updateDownloadLabels();
  }
  if (!lockForm && !busy) {
    el.form.classList.remove("is-busy");
    return;
  }
  if (!lockForm) return;
  el.form.classList.toggle("is-busy", busy);
  for (const node of el.form.querySelectorAll(
    "input, select, button:not(#copy-link):not(#reset-view)"
  )) {
    if (
      node.id === "download" ||
      node.id === "download-3mf" ||
      node.id === "download-png" ||
      node.id === "download-scad"
    ) {
      continue;
    }
    node.disabled = busy;
  }
}

function setExportBusy(busy) {
  // Keep form locked in sync with export busy so controls re-enable after download.
  setUiBusy(busy, { lockForm: true });
}

/** Swap the base mesh, retune scale/placement to its 1:200 preset, and rebuild text. */
let shipLoadToken = 0;
async function applyShipSelection(shipId, { retune = true } = {}) {
  const id = SHIPS[shipId] ? shipId : DEFAULT_SHIP_ID;
  const next = SHIPS[id];
  const previousId = ship.id;
  const token = ++shipLoadToken;

  // Radio only — do not commit placement constants until geometry is ready.
  setShipRadio(id);
  setStatus(`Loading ${next.label}…`);
  setUiBusy(true, { lockForm: true });

  try {
    let geometry = null;
    let layers = null;
    if (next.layers?.length) {
      // Preview uses steel+tiles only; defer the ~10 MB combined solid.
      layers = await loadShipLayers(next);
    } else {
      geometry = await loadShipGeometry(next);
    }
    if (token !== shipLoadToken) return;

    ship = next;
    applyEnvelopeForShip();
    syncBareStainlessControl();

    if (shipMesh) {
      restoreShipDisplayGeometry();
      modelGroup.remove(shipMesh);
    }
    shipGeometry = geometry;
    engravedCutActive = false;
    shipMesh = buildShipDisplay(geometry, layers);
    modelGroup.add(shipMesh);

    // Combined solid (~10 MB) loads only on first named export / CSG via
    // ensureShipGeometry() — do not prefetch during Ready (steals bandwidth).

    if (retune) {
      // Keychain prints at native mesh size; CAD bases retune toward 1:200.
      el.scale.value = String(
        ship.id === "keychain" ? 100 : coreOneScalePercent()
      );
      syncSizeSliderForShip();
      el.size.value = String(ship.defaultSizeMm);
      el.pos.value = String(ship.defaultPosMm);
      posPinnedByUser = false;
      const side =
        ship.defaultSide === "left" ||
        ship.defaultSide === "both" ||
        ship.defaultSide === "right"
          ? ship.defaultSide
          : "right";
      const sideRadio = document.querySelector(
        `input[name="side"][value="${side}"]`
      );
      if (sideRadio) sideRadio.checked = true;
      if (ship.defaultColor) {
        el.color.value = ship.defaultColor;
      } else if (ship.layers?.length) {
        el.color.value = "#c8ced6";
      }
      if (ship.defaultStyle === "raised" || ship.defaultStyle === "engraved") {
        const styleRadio = document.querySelector(
          `input[name="style"][value="${ship.defaultStyle}"]`
        );
        if (styleRadio) styleRadio.checked = true;
      } else if (ship.id !== "keychain") {
        const raised = document.querySelector(
          'input[name="style"][value="raised"]'
        );
        if (raised) raised.checked = true;
      }
      if (ship.defaultName) {
        el.name.value = ship.defaultName;
      } else if (
        el.name.value.trim() === "Custom Name" ||
        el.name.value.trim() === "Starship"
      ) {
        // Clear keychain placeholders when switching back to desk models.
        el.name.value = "";
      }
    } else {
      syncSizeSliderForShip();
    }
    updateLabels();
    applyModelScale();
    applyColor();
    if (ready) {
      await flushRebuild();
      if (token !== shipLoadToken) return;
      frameCamera();
      writeUrl();
      setStatus(`Base model: ${ship.label}.`);
    }
  } catch (err) {
    if (token !== shipLoadToken) return;
    setShipRadio(previousId);
    ship = SHIPS[previousId] || ship;
    applyEnvelopeForShip();
    console.error(err);
    setStatus(
      `Failed to load ${next.label}${err?.message ? `: ${err.message}` : ""}.`,
      true
    );
    throw err;
  } finally {
    if (token === shipLoadToken) {
      setUiBusy(false, { lockForm: true });
      // Keep downloads disabled until boot marks ready.
      if (!ready) setExportBusy(true);
    }
  }
}

function resize() {
  const { clientWidth: w, clientHeight: h } = el.viewport;
  camera.aspect = w / Math.max(h, 1);
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}

function updateLabels() {
  el.sizeLabel.textContent = `${Number(el.size.value).toFixed(1)} mm`;
  el.posLabel.textContent = `${el.pos.value} mm`;
  el.depthLabel.textContent = `${Number(el.depth.value).toFixed(2)} mm`;
  const pct = Number(el.scale.value);
  const sz = scaledPrintSize(pct);
  const corePct = coreOneScalePercent();
  const isCore = Math.abs(pct - corePct) < 0.05;
  const miniDenom = [250, 300].find(
    (d) => Math.abs(pct - miniScalePercent(d)) < 0.05
  );
  if (isCore) {
    el.scaleLabel.textContent = `${pct.toFixed(1)}% · H ${sz.heightMm.toFixed(1)} × Ø ${sz.diameterMm.toFixed(1)} mm (CORE One 1:200)`;
  } else if (miniDenom) {
    el.scaleLabel.textContent = `${pct.toFixed(1)}% · H ${sz.heightMm.toFixed(1)} × Ø ${sz.diameterMm.toFixed(1)} mm (1:${miniDenom} mini)`;
  } else {
    el.scaleLabel.textContent = `${pct.toFixed(1)}% · H ${sz.heightMm.toFixed(1)} × Ø ${sz.diameterMm.toFixed(1)} mm`;
  }
  updateDownloadLabels();
}

function mountFontOptions(selectedId = "oswald-bold") {
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
  if (!FONT_OPTIONS[select.value]) select.value = "oswald-bold";
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
    const nameSpan = document.createElement("span");
    nameSpan.className = "swatch-name";
    nameSpan.textContent = tip;
    btn.appendChild(nameSpan);
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
  const hull = el.color.value;
  shipMaterial.color.set(hull);
  steelMaterial.color.set(hull);
  textMaterial.color.set(el.textColor.value);
  inlayMaterial.color.set(el.textColor.value);
  // Slight lift on dark letter colors so they stay readable on Signal Red.
  const hsl = { h: 0, s: 0, l: 0 };
  textMaterial.color.getHSL(hsl);
  textMaterial.emissive.setHex(hsl.l < 0.28 ? 0x222222 : 0x000000);
  textMaterial.depthWrite = true;
  textMaterial.polygonOffset = true;
  textMaterial.polygonOffsetFactor = -1;
  textMaterial.polygonOffsetUnits = -2;
  textMaterial.needsUpdate = true;
  inlayMaterial.needsUpdate = true;

  if (bareStainlessOn()) {
    // Whole ship reads as hull stainless — hide heat-tile look (bump + black).
    tilesMaterial.color.set(hull);
    tilesMaterial.metalness = steelMaterial.metalness;
    tilesMaterial.roughness = steelMaterial.roughness;
    tilesMaterial.envMapIntensity = steelMaterial.envMapIntensity;
    tilesMaterial.bumpMap = null;
    tilesMaterial.bumpScale = 0;
    enginesMaterial.color.set(hull);
    enginesMaterial.metalness = steelMaterial.metalness;
    enginesMaterial.roughness = steelMaterial.roughness;
    enginesMaterial.envMapIntensity = steelMaterial.envMapIntensity;
  } else {
    tilesMaterial.color.setHex(TILES_DEFAULT.color);
    tilesMaterial.metalness = TILES_DEFAULT.metalness;
    tilesMaterial.roughness = TILES_DEFAULT.roughness;
    tilesMaterial.envMapIntensity = TILES_DEFAULT.envMapIntensity;
    tilesMaterial.bumpMap = tilesBumpMap;
    tilesMaterial.bumpScale = TILES_DEFAULT.bumpScale;
    enginesMaterial.color.setHex(ENGINES_DEFAULT.color);
    enginesMaterial.metalness = ENGINES_DEFAULT.metalness;
    enginesMaterial.roughness = ENGINES_DEFAULT.roughness;
    enginesMaterial.envMapIntensity = ENGINES_DEFAULT.envMapIntensity;
  }
  tilesMaterial.needsUpdate = true;
  enginesMaterial.needsUpdate = true;
  if (tileLight) tileLight.visible = !bareStainlessOn();

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

  if (spanMm > ship.hardSpanMm) {
    parts.push(
      `Very long — span ~${spanMm.toFixed(0)} mm (safe ≤${ship.safeSpanMm} mm). Likely hits flaps.`
    );
    el.lengthWarn.classList.add("warn-hard");
  } else if (spanMm > ship.safeSpanMm) {
    parts.push(
      `Span ~${spanMm.toFixed(0)} mm (safe ≤${ship.safeSpanMm} mm). Use “Fit text to hull” or shorten.`
    );
    el.lengthWarn.classList.remove("warn-hard");
  } else {
    el.lengthWarn.classList.remove("warn-hard");
  }

  if (extent > ship.flapZoneYMm) {
    parts.push(
      `Position + length nears flap zone (~±${ship.flapZoneYMm} mm). Nudge position toward mid-body.`
    );
    if (spanMm <= ship.safeSpanMm) el.lengthWarn.classList.remove("warn-hard");
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
  // Letters run along the hull: first glyph toward the nose (+Y), last toward
  // the engines (−Y). Letter height along +X; extrude +Z.
  geometry.rotateZ(-Math.PI / 2);
  // Flight-style italic: slant tops toward the nose (+Y), matching S40 FS-13.
  if (el.italic?.checked) {
    applyFlightItalicShear(geometry);
  }
  return geometry;
}

/** ~12° shear — bold stencil look without needing an italic typeface file. */
const FLIGHT_ITALIC_SHEAR = 0.22;

function applyFlightItalicShear(geometry) {
  const pos = geometry.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    pos.setXYZ(i, v.x, v.y + FLIGHT_ITALIC_SHEAR * v.x, v.z);
  }
  pos.needsUpdate = true;
}

/**
 * Bend flat text onto the cylindrical hull (axis // Y through body center).
 * Writes model-space coordinates into the geometry.
 */
function wrapGeometryToHull(geometry, side, textY, style, acrossBias) {
  const sign = side === "right" ? 1 : -1;
  const R = ship.hullRadiusZ;
  const bias =
    acrossBias == null ? Number(ship.markingAcrossMm) || 0 : Number(acrossBias);
  const pos = geometry.attributes.position;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const across = (side === "left" ? -v.x : v.x) + bias;
    const along = v.y;
    // Raised: base digs in, front proud of the hull.
    // Engraved: cutter starts slightly outside so the opening breaks the
    // surface, then runs inward (floor at R − proud) — avoids z-fight flush.
    const radial =
      style === "raised"
        ? R - ship.embedMm + v.z
        : R + ship.embedMm - v.z;
    const theta = across / R;
    const x = ship.bodyCenterX + radial * Math.sin(theta);
    const z = sign * radial * Math.cos(theta);
    const y = textY + along;
    pos.setXYZ(i, x, y, z);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function placeFlatOnHull(geometry, side, textY, style, acrossBias) {
  const sign = side === "right" ? 1 : -1;
  const R = ship.hullRadiusZ;
  const bias =
    acrossBias == null ? Number(ship.markingAcrossMm) || 0 : Number(acrossBias);
  const theta = bias / R;
  const radial =
    style === "raised" ? R - ship.embedMm : R + ship.embedMm;
  const mesh = new THREE.Mesh(geometry, textMaterial);
  mesh.position.set(
    ship.bodyCenterX + radial * Math.sin(theta),
    textY,
    sign * radial * Math.cos(theta)
  );
  if (style === "raised") {
    mesh.rotation.y = (side === "left" ? Math.PI : 0) - sign * theta;
  } else {
    mesh.rotation.y = (side === "left" ? 0 : Math.PI) - sign * theta;
  }
  return mesh;
}

/** Bake flat/wrap placement into a standalone model-space geometry. */
function buildPlacedTextGeometry(flat, side, textY, style, wrap, acrossBias) {
  const geo = flat.clone();
  if (wrap) {
    wrapGeometryToHull(geo, side, textY, style, acrossBias);
    return geo;
  }
  const mesh = placeFlatOnHull(geo, side, textY, style, acrossBias);
  mesh.updateMatrix();
  geo.applyMatrix4(mesh.matrix);
  return geo;
}

/**
 * Map one stainless flank marking onto the opposite flank.
 * Flip X through the ship centerline and Y through the text center — a 180°
 * hull-plane turn so letter handedness stays correct (not mirror-backed) and
 * the first glyph sits toward the engines on that flank (S at the bottom when
 * nose-up), reading left-to-right when the column is read vertically.
 */
function mirrorGeometryAcrossShipYZ(geometry, textY) {
  const pos = geometry.attributes.position;
  const cx = ship.bodyCenterX;
  const cy = Number(textY) || 0;
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(i, 2 * cx - pos.getX(i), 2 * cy - pos.getY(i), pos.getZ(i));
  }
  pos.needsUpdate = true;
  // Two axis flips preserve winding — do not swap triangle indices.
  if (geometry.attributes.normal) geometry.deleteAttribute("normal");
  geometry.computeVertexNormals();
  return geometry;
}

function mergeLetterGeometries(geometries) {
  if (geometries.length === 1) return geometries[0];
  const nonIndexed = geometries.map((g) =>
    g.index ? g.toNonIndexed() : g
  );
  let vertCount = 0;
  for (const g of nonIndexed) vertCount += g.attributes.position.count;
  const positions = new Float32Array(vertCount * 3);
  let offset = 0;
  for (const g of nonIndexed) {
    positions.set(g.attributes.position.array, offset);
    offset += g.attributes.position.array.length;
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  merged.computeVertexNormals();
  for (const g of nonIndexed) {
    if (!geometries.includes(g)) g.dispose();
  }
  for (const g of geometries) g.dispose();
  return merged;
}

function disposeTextMesh() {
  if (!textMesh) return;
  modelGroup.remove(textMesh);
  textMesh.traverse((obj) => {
    if (obj.isMesh && obj.geometry) obj.geometry.dispose();
  });
  textMesh = null;
}

function disposeInlayMesh() {
  if (!inlayMesh) return;
  modelGroup.remove(inlayMesh);
  inlayMesh.traverse((obj) => {
    if (obj.isMesh && obj.geometry) obj.geometry.dispose();
  });
  inlayMesh = null;
}

function restoreShipDisplayGeometry() {
  if (!shipMesh?.isMesh || !shipGeometry) {
    engravedCutActive = false;
    return;
  }
  if (
    engravedCutActive &&
    shipMesh.geometry &&
    shipMesh.geometry !== shipGeometry
  ) {
    shipMesh.geometry.dispose();
  }
  shipMesh.geometry = shipGeometry;
  engravedCutActive = false;
}

function applyEngravedCutPreview(cutGeo) {
  if (!shipMesh?.isMesh || !cutGeo) return false;
  if (
    engravedCutActive &&
    shipMesh.geometry &&
    shipMesh.geometry !== shipGeometry
  ) {
    shipMesh.geometry.dispose();
  }
  if (cutGeo.attributes.normal) cutGeo.deleteAttribute("normal");
  cutGeo.computeVertexNormals();
  shipMesh.geometry = cutGeo;
  engravedCutActive = true;
  return true;
}

/**
 * Pull a flat engraved cutter (model-space) into the pocket along ±Z so the
 * preview fill is the exact boolean operand, just seated inside the hull.
 */
function pullEngravedCutterIntoPocket(geometry, side, pullMm) {
  const signZ = side === "right" ? -1 : 1;
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setZ(i, pos.getZ(i) + signZ * pullMm);
  }
  pos.needsUpdate = true;
  if (geometry.attributes.normal) geometry.deleteAttribute("normal");
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Placement recipes for the side control.
 * "both" on Original CAD → dual stainless flanks near the tile seams;
 * "both" with no seam bias → opposite hull faces (±Z).
 */
function letterPlacements(side) {
  const bias = Number(ship.markingAcrossMm) || 0;
  const across = Math.abs(bias);
  if (side === "both") {
    if (across > 0.5) {
      return [{ side: "right", across: -across }];
    }
    return [
      { side: "right", across: 0 },
      { side: "left", across: 0 },
    ];
  }
  return [{ side, across: bias }];
}

/** Center Y so the engines-end glyph sits on the forward-flap bottom. */
function flapAlignedCenterY(spanMm) {
  const bottom = Number(ship.forwardFlapBottomYMm);
  if (!Number.isFinite(bottom)) return Number(ship.defaultPosMm) || 0;
  return bottom + Math.max(spanMm, 0) / 2;
}

function clampPosToSlider(raw) {
  const max = Number(el.pos.max);
  const min = Number(el.pos.min);
  const lo = Number.isFinite(min) ? min : raw;
  const hi = Number.isFinite(max) ? max : raw;
  return Math.min(hi, Math.max(lo, raw));
}

/** Keep bottom glyph on the forward-flap line unless the user pinned pos. */
function syncFlapAlignedPos(spanMm) {
  if (posPinnedByUser || !Number.isFinite(Number(ship.forwardFlapBottomYMm))) {
    return Number(el.pos.value);
  }
  const aligned = Math.round(flapAlignedCenterY(spanMm));
  const clamped = clampPosToSlider(aligned);
  if (Number(el.pos.value) !== clamped) {
    el.pos.value = String(clamped);
    updateLabels();
  }
  return clamped;
}

function measureSpan(geometry) {
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox;
  return Math.max(bb.max.y - bb.min.y, bb.max.x - bb.min.x, 0);
}

async function rebuildText() {
  if (!font || !ready) return;

  const proud = Number(el.depth.value);
  const totalDepth = ship.embedMm + proud;
  const side = selectedSide();
  const style = selectedStyle();
  const wrap = el.wrap.checked;
  // Wrapped thick cutters self-intersect on small radii and break CSG.
  // Engrave with a flat cutter + matching flat inlay (same pose).
  const wrapCutter = wrap && style !== "engraved";
  const { missing, folded, used } = sanitizeName(el.name.value);
  updateGlyphWarn(missing, folded);

  disposeTextMesh();
  disposeInlayMesh();

  // Empty name → ship-only preview (no placeholder lettering).
  if (!used.trim()) {
    restoreShipDisplayGeometry();
    lastSpanMm = 0;
    updateLengthWarn(0);
    applyModelScale();
    return;
  }

  const flat = buildFlatTextGeometry(
    used,
    Number(el.size.value),
    totalDepth
  );
  const spanMm = measureSpan(flat);
  const textY = syncFlapAlignedPos(spanMm);
  updateLengthWarn(spanMm);

  const placements = letterPlacements(side);
  const geos = [];
  for (const place of placements) {
    geos.push(
      buildPlacedTextGeometry(
        flat,
        place.side,
        textY,
        style,
        wrapCutter,
        place.across
      )
    );
  }
  flat.dispose();

  // Dual stainless flanks: 180° hull-plane copy onto the opposite seam.
  if (side === "both" && placements.length === 1) {
    geos.push(mirrorGeometryAcrossShipYZ(geos[0].clone(), textY));
  }

  if (geos.length === 1) {
    textMesh = new THREE.Mesh(geos[0], textMaterial);
  } else {
    textMesh = new THREE.Group();
    for (const geo of geos) {
      textMesh.add(new THREE.Mesh(geo, textMaterial));
    }
  }

  modelGroup.add(textMesh);

  // Engraved: boolean-cut the hull, then reuse the exact cutter mesh as the
  // black fill (pulled into the pocket) so fill and recess cannot drift apart.
  if (style === "engraved") {
    textMesh.visible = false;
    let cutterGeo = null;
    if (shipGeometry && shipMesh?.isMesh && !ship.layers?.length) {
      try {
        await yieldToUi(0);
        const { ship: shipClone, text } = cloneModelSpaceParts();
        const cut = booleanEngrave(shipClone, text);
        shipClone.dispose();
        applyEngravedCutPreview(cut);
        cutterGeo = text;
      } catch (err) {
        console.warn("Engraved cut preview failed", err);
        restoreShipDisplayGeometry();
      }
    } else {
      restoreShipDisplayGeometry();
    }

    if (cutterGeo) {
      // Only cancel the cutter's outside overhang so the fill mouth sits in
      // the surface opening (extra pull causes parallax “pink rim” gaps).
      const pull = ship.embedMm;
      if (side === "both") {
        // Dual flanks: split by Z sign and pull each half toward the axis.
        const pos = cutterGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const z = pos.getZ(i);
          pos.setZ(i, z + (z >= 0 ? -pull : pull));
        }
        pos.needsUpdate = true;
        if (cutterGeo.attributes.normal) cutterGeo.deleteAttribute("normal");
        cutterGeo.computeVertexNormals();
      } else {
        pullEngravedCutterIntoPocket(
          cutterGeo,
          side === "right" ? "right" : "left",
          pull
        );
      }
      inlayMesh = new THREE.Mesh(cutterGeo, inlayMaterial);
      inlayMesh.renderOrder = 10;
      modelGroup.add(inlayMesh);
    }
    applyColor();
  } else {
    restoreShipDisplayGeometry();
    textMesh.visible = true;
    applyColor();
  }

  applyModelScale();
}

/** Debug hook for engraved preview state (automation / local checks). */
window.__starshipEngraveDebug = () => ({
  style: selectedStyle(),
  textVisible: textMesh ? textMesh.visible : null,
  inlayVisible: inlayMesh ? inlayMesh.visible : null,
});

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
  const zDir = viewSide() === "right" ? 1 : -1;
  camera.position.set(
    center.x + maxDim * 0.35,
    center.y + maxDim * 0.05,
    center.z + zDir * maxDim * 1.55
  );
  controls.update();
}

/**
 * Full-ship framing for a square Printables cover.
 * Fits the entire model (nose → fins) in frame, viewed from the lettered side.
 * Skips OrbitControls.update() so spherical recomputation cannot skew framing.
 * Assumes camera.aspect is already 1 (set by captureCoverDataUrl).
 */
function frameCoverCamera() {
  if (!shipMesh) {
    frameCamera();
    return;
  }
  modelGroup.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(modelGroup);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  // Prefer hull axis X so the cylinder sits dead-center horizontally.
  center.x = ship.bodyCenterX * modelGroup.scale.x;

  // Extra margin so nose + flaps read clearly in the square (not edge-clipped).
  const fit = Math.max(size.x, size.y, size.z) * 1.35;
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const dist = fit / 2 / Math.tan(fov / 2);
  const zDir = viewSide() === "right" ? 1 : -1;

  // Slight X bias for a 3/4 read without losing horizontal centering much.
  camera.position.set(center.x + fit * 0.12, center.y, center.z + zDir * dist);
  camera.up.set(0, 1, 0);
  camera.lookAt(center);
  camera.updateMatrixWorld();
  controls.target.copy(center);
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

/** Byte-identical to the Printables listing files (hex one-piece + hex MMU). */
const PRINTABLES_HEX_STL_NAME = "starship_1_200_hex_tiles_one_piece.stl";
const PRINTABLES_HEX_3MF_NAME = "starship_1_200_hex_tiles_mmu.3mf";
/** Last GitHub Release that ships the hex print files (Pages slim omits them).
 *  Do not bump this when bumping APP_VERSION — only when a new Release uploads
 *  the Printables hex STL/3MF assets. */
const PRINTABLES_HEX_RELEASE = "v2.4.2";
const PRINTABLES_HEX_STL_LOCAL = `./assets/starship_ship_print_1_200_hex.stl?v=${CACHE_BUST}`;
const PRINTABLES_HEX_3MF_LOCAL = `./assets/starship_print_1_200_mmu_hex.3mf?v=${CACHE_BUST}`;
const PRINTABLES_HEX_STL_REMOTE = `https://github.com/leedsexplore/starship-custom-name/releases/download/${PRINTABLES_HEX_RELEASE}/${PRINTABLES_HEX_STL_NAME}`;
const PRINTABLES_HEX_3MF_REMOTE = `https://github.com/leedsexplore/starship-custom-name/releases/download/${PRINTABLES_HEX_RELEASE}/${PRINTABLES_HEX_3MF_NAME}`;

/**
 * Prefer local assets (full checkout). On the slim Pages deploy those files are
 * omitted, so fall back to the GitHub Release that carries the Printables hex.
 */
async function fetchPrintablesHex(kind) {
  const local =
    kind === "stl" ? PRINTABLES_HEX_STL_LOCAL : PRINTABLES_HEX_3MF_LOCAL;
  const remote =
    kind === "stl" ? PRINTABLES_HEX_STL_REMOTE : PRINTABLES_HEX_3MF_REMOTE;
  const filename =
    kind === "stl" ? PRINTABLES_HEX_STL_NAME : PRINTABLES_HEX_3MF_NAME;
  let res = await fetch(local);
  if (!res.ok) {
    setStatus(`Fetching ${filename} from GitHub Releases…`);
    res = await fetch(remote);
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${filename}`);
  }
  return res.arrayBuffer();
}

function hasHullName() {
  return Boolean(el.name.value.trim());
}

/**
 * Empty-name Original CAD at CORE One 1:200 downloads the exact Printables
 * hex files. At 1:250 / 1:300, downloads the same hex mesh uniformly scaled
 * (matches scripts/build_mini_scale.py).
 */
function wantsPrintablesDefault() {
  return (
    ship.id === "parametric" &&
    !hasHullName() &&
    !bareStainlessOn() &&
    Math.abs(Number(el.scale.value) - coreOneScalePercent()) < 0.05
  );
}

/** @returns {250|300|null} */
function printablesMiniDenom() {
  if (ship.id !== "parametric" || hasHullName() || bareStainlessOn()) return null;
  const pct = Number(el.scale.value);
  for (const denom of [250, 300]) {
    if (Math.abs(pct - miniScalePercent(denom)) < 0.05) return denom;
  }
  return null;
}

/**
 * Uniform-scale a binary STL the same way scripts/build_mini_scale.py does
 * (vertex coords only; normals unchanged under uniform scale).
 */
function scaleBinaryStlBuffer(arrayBuffer, scale) {
  const data = new Uint8Array(arrayBuffer.slice(0));
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const n = view.getUint32(80, true);
  let off = 84;
  for (let i = 0; i < n; i++) {
    for (const k of [12, 24, 36]) {
      view.setFloat32(off + k, view.getFloat32(off + k, true) * scale, true);
      view.setFloat32(
        off + k + 4,
        view.getFloat32(off + k + 4, true) * scale,
        true
      );
      view.setFloat32(
        off + k + 8,
        view.getFloat32(off + k + 8, true) * scale,
        true
      );
    }
    off += 50;
  }
  const label = `starship hex scale=${scale.toFixed(6)} from 1:200`;
  for (let i = 0; i < 80; i++) {
    data[i] = i < label.length ? label.charCodeAt(i) & 0xff : 0;
  }
  return data.buffer;
}

function updateDownloadLabels() {
  const printables = wantsPrintablesDefault();
  const miniDenom = printablesMiniDenom();
  if (printables) {
    el.download.textContent = "Download STL (Printables hex)";
    el.download3mf.textContent = "Download 3MF (Printables MMU)";
    el.download3mf.disabled = false;
  } else if (miniDenom) {
    el.download.textContent = `Download STL (1:${miniDenom} mini hex)`;
    el.download3mf.textContent = "MMU is 1:200 only";
    el.download3mf.disabled = true;
  } else if (
    ship.id === "parametric" &&
    !hasHullName() &&
    bareStainlessOn()
  ) {
    el.download.textContent = "Download STL (smooth stainless)";
    el.download3mf.textContent = "Download 3MF (smooth stainless)";
    el.download3mf.disabled = false;
  } else {
    el.download.textContent = "Download STL";
    el.download3mf.textContent = "Download 3MF (Hull + Letters)";
    el.download3mf.disabled = false;
  }
  if (el.exportPathNote) {
    // Show when Original CAD has a name (or non-matching Printables scale).
    el.exportPathNote.hidden = !(
      ship.id === "parametric" && !printables && !miniDenom
    );
  }
}

function readState() {
  return {
    ship: ship.id,
    name: el.name.value.trim(),
    color: el.color.value.replace("#", ""),
    text: el.textColor.value.replace("#", ""),
    font: currentFontId || el.fontStyle.value || "oswald-bold",
    size: el.size.value,
    pos: el.pos.value,
    depth: el.depth.value,
    scale: el.scale.value,
    side: selectedSide(),
    style: selectedStyle(),
    wrap: el.wrap.checked ? "1" : "0",
    italic: el.italic?.checked ? "1" : "0",
    bare: el.bareStainless?.checked ? "1" : "0",
  };
}

function clampRangeInput(input, raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return;
  const max = Number(input.max);
  const min = Number(input.min);
  const lo = Number.isFinite(min) ? min : n;
  const hi = Number.isFinite(max) ? max : n;
  input.value = String(Math.min(hi, Math.max(lo, n)));
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
  if (state.size != null) clampRangeInput(el.size, state.size);
  if (state.pos != null) {
    clampRangeInput(el.pos, state.pos);
    posPinnedByUser = true;
  }
  if (state.depth != null) clampRangeInput(el.depth, state.depth);
  if (state.scale != null) clampRangeInput(el.scale, state.scale);
  if (
    state.side === "left" ||
    state.side === "right" ||
    state.side === "both"
  ) {
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
  if (el.italic) {
    // Default OFF. Only enable when the share URL explicitly asks for italic=1
    // (old bookmarks from when italic was the default must not stick).
    el.italic.checked =
      state.italic === "1" || state.italic === "true";
  }
  if (el.bareStainless) {
    el.bareStainless.checked =
      state.bare === "1" || state.bare === "true";
  }
  syncBareStainlessControl();
  updateLabels();
  applyModelScale();
  applyColor();
}

function stateFromUrl() {
  const q = new URLSearchParams(window.location.search);
  const state = {};
  for (const key of [
    "ship",
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
    "italic",
    "bare",
  ]) {
    if (q.has(key)) state[key] = q.get(key);
  }
  return state;
}

function writeUrl(replace = true) {
  const s = readState();
  const q = new URLSearchParams();
  q.set("ship", s.ship);
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
  if (s.italic === "1") q.set("italic", "1");
  if (s.bare === "1") q.set("bare", "1");
  const url = `${window.location.pathname}?${q.toString()}`;
  if (replace) history.replaceState(null, "", url);
  return `${window.location.origin}${url}`;
}

function confirmLongTextIfNeeded() {
  if (lastSpanMm <= ship.hardSpanMm) return true;
  return window.confirm(
    `Text span is ~${lastSpanMm.toFixed(0)} mm and may hit the flaps. Download anyway?`
  );
}

function yieldToUi(ms = 30) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Ship + text geometries in model space (pre-scale), with text world-baked.
 * Text may be null when the hull name field is empty.
 * Callers must await ensureShipGeometry() first when the solid may still be lazy.
 */
function cloneModelSpaceParts() {
  if (!shipGeometry || !shipMesh) {
    throw new Error("Model not ready — solid mesh still loading");
  }
  shipMesh.updateMatrixWorld(true);

  const shipClone = shipGeometry.clone();
  // Bake ship mesh local transform (identity today) into geometry.
  shipClone.applyMatrix4(shipMesh.matrix);

  if (!textMesh) {
    return { ship: shipClone, text: null };
  }

  textMesh.updateMatrixWorld(true);
  const parts = [];
  if (textMesh.isMesh) {
    const text = textMesh.geometry.clone();
    text.applyMatrix4(textMesh.matrix);
    parts.push(text);
  } else {
    textMesh.traverse((obj) => {
      if (!obj.isMesh || !obj.geometry) return;
      const geo = obj.geometry.clone();
      geo.applyMatrix4(obj.matrix);
      parts.push(geo);
    });
  }

  return {
    ship: shipClone,
    text: parts.length ? mergeLetterGeometries(parts) : null,
  };
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

  if (!text) {
    applyScaleToGeometry(ship, scale);
    ship.computeVertexNormals();
    return {
      mode: "merged",
      geometry: ship,
      note: "Ship only — enter a hull name to add lettering.",
    };
  }

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
      : "Raised letters overlaid on hull (not boolean-unioned). Prefer 3MF for MMU.";

  return { mode: "merged", group, ship, text, note };
}

function triggerDownload(blob, filename) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  a.click();
  // Delay revoke — Safari/Firefox can drop the download if revoked immediately.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
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

    if (wantsPrintablesDefault()) {
      setStatus(`Fetching ${PRINTABLES_HEX_STL_NAME}…`);
      const buf = await fetchPrintablesHex("stl");
      triggerDownload(
        new Blob([buf], { type: "model/stl" }),
        PRINTABLES_HEX_STL_NAME
      );
      writeUrl();
      setStatus(
        "STL downloaded — exact Printables hex one-piece (starship_1_200_hex_tiles_one_piece.stl)."
      );
      showPostDownloadCta(true);
      return;
    }

    const miniDenom = printablesMiniDenom();
    if (miniDenom) {
      setStatus(`Fetching 1:200 hex and scaling to 1:${miniDenom}…`);
      const scaled = scaleBinaryStlBuffer(
        await fetchPrintablesHex("stl"),
        200 / miniDenom
      );
      const filename = `starship_1_${miniDenom}_hex_tiles_one_piece.stl`;
      triggerDownload(new Blob([scaled], { type: "model/stl" }), filename);
      writeUrl();
      setStatus(
        `STL downloaded — 1:${miniDenom} hex one-piece (same mesh as Printables mini).`
      );
      showPostDownloadCta(true);
      return;
    }

    setStatus("Loading solid mesh for export…");
    await ensureShipGeometry();
    await yieldToUi(50);

    const preferBoolean = selectedStyle() === "engraved";
    if (preferBoolean) {
      setStatus("Boolean engraving… this can take a few seconds on large meshes.");
      await yieldToUi(80);
    }

    const payload = buildExportMeshes({ preferBoolean });
    const exporter = new STLExporter();
    let buffer;
    if (payload.mode === "boolean" || payload.geometry) {
      buffer = exporter.parse(new THREE.Mesh(payload.geometry), { binary: true });
      payload.geometry.dispose();
    } else {
      buffer = exporter.parse(payload.group, { binary: true });
      payload.ship?.dispose();
      payload.text?.dispose();
    }

    triggerDownload(
      new Blob([buffer], { type: "model/stl" }),
      `starship_${nameSlug()}.stl`
    );
    writeUrl();
    setStatus(
      `STL downloaded — ${payload.note} Color is preview-only; set filament in your slicer.`
    );
    showPostDownloadCta(true);
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

    if (wantsPrintablesDefault()) {
      setStatus(`Fetching ${PRINTABLES_HEX_3MF_NAME}…`);
      const buf = await fetchPrintablesHex("3mf");
      triggerDownload(
        new Blob([buf], { type: "model/3mf" }),
        PRINTABLES_HEX_3MF_NAME
      );
      writeUrl();
      setStatus(
        "3MF downloaded — exact Printables hex MMU (starship_1_200_hex_tiles_mmu.3mf)."
      );
      showPostDownloadCta(true);
      return;
    }

    const miniDenom = printablesMiniDenom();
    if (miniDenom) {
      setStatus(
        `1:${miniDenom} is one-piece STL only — use Download STL (no MMU mini).`,
        true
      );
      return;
    }

    setStatus("Loading solid mesh for export…");
    await ensureShipGeometry();
    await yieldToUi(50);

    const style = selectedStyle();
    const hullColor = el.color.value;
    const letterColor = el.textColor.value;
    const scale = modelScale();

    let parts;
    let engravedSolid = false;
    let hasLetters = false;

    if (style === "engraved") {
      setStatus("Boolean engraving for 3MF… this can take a few seconds.");
      await yieldToUi(80);
      const payload = buildExportMeshes({ preferBoolean: true });
      if (payload.mode === "boolean") {
        engravedSolid = true;
        hasLetters = true;
        parts = [
          {
            name: "Hull (engraved)",
            geometry: payload.geometry,
            color: hullColor,
          },
        ];
      } else if (payload.text) {
        // Fallback: two objects so slicer can still assign materials / boolean.
        hasLetters = true;
        parts = [
          { name: "Hull", geometry: payload.ship, color: hullColor },
          { name: "Letters (cutter)", geometry: payload.text, color: letterColor },
        ];
      } else {
        // No name entered — merged payload only carries the hull geometry.
        parts = [{ name: "Hull", geometry: payload.geometry, color: hullColor }];
      }
      setStatus(
        !hasLetters
          ? "Packing ship-only 3MF…"
          : engravedSolid
            ? "Packing engraved 3MF…"
            : "Packing 3MF (inset fallback)…"
      );
    } else {
      const { ship: shipGeo, text } = cloneModelSpaceParts();
      applyScaleToGeometry(shipGeo, scale);
      if (text) applyScaleToGeometry(text, scale);
      parts = text
        ? [
            { name: "Hull", geometry: shipGeo, color: hullColor },
            { name: "Letters", geometry: text, color: letterColor },
          ]
        : [{ name: "Hull", geometry: shipGeo, color: hullColor }];
      hasLetters = Boolean(text);
      setStatus(
        text ? "Packing multi-material 3MF…" : "Packing ship-only 3MF…"
      );
    }

    await yieldToUi(50);
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
      !hasLetters
        ? "3MF downloaded — ship only (enter a name for lettering)."
        : style === "raised"
          ? "3MF downloaded — assign Hull / Letters to extruders in your slicer (MMU). Preview steel/tiles coloring is separate from this file."
          : engravedSolid
            ? "3MF downloaded — engraved hull is a single solid (recess cut)."
            : "3MF downloaded — boolean failed; Hull + Letters (cutter) for slicer boolean."
    );
    showPostDownloadCta(true);
  } catch (err) {
    console.error(err);
    setStatus(err.message || "3MF export failed", true);
  } finally {
    setExportBusy(false);
  }
}

const COVER_PX = 1024;

async function captureCoverDataUrl() {
  await flushRebuild();
  const prevHud = el.hud.hidden;
  const prevSize = new THREE.Vector2();
  renderer.getSize(prevSize);
  const prevAspect = camera.aspect;
  const prevCamPos = camera.position.clone();
  const prevTarget = controls.target.clone();
  const prevBg = scene.background.clone();
  const prevKey = key.intensity;
  const prevAmb = scene.children.find((c) => c.isAmbientLight)?.intensity;

  el.hud.hidden = true;
  // Solid black for Printables / PNG cover exports.
  scene.background = new THREE.Color(0x000000);
  key.intensity = 1.45;
  const amb = scene.children.find((c) => c.isAmbientLight);
  if (amb) amb.intensity = 0.62;
  // Square buffer — Printables gallery thumbs are square; wide viewport left the ship off-center.
  renderer.setSize(COVER_PX, COVER_PX, false);
  camera.aspect = 1;
  camera.updateProjectionMatrix();
  frameCoverCamera();
  renderer.render(scene, camera);
  const dataUrl = renderer.domElement.toDataURL("image/png");

  scene.background.copy(prevBg);
  key.intensity = prevKey;
  if (amb && prevAmb != null) amb.intensity = prevAmb;
  el.hud.hidden = prevHud;
  camera.position.copy(prevCamPos);
  controls.target.copy(prevTarget);
  controls.update();
  renderer.setSize(prevSize.x, prevSize.y, false);
  camera.aspect = prevAspect;
  camera.updateProjectionMatrix();
  resize();
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
    showPostDownloadCta(true);
  } catch (err) {
    console.error(err);
    setStatus(err.message || "PNG capture failed", true);
  } finally {
    setExportBusy(false);
  }
}

// Dev/automation hooks for headless cover / STL export.
window.__starshipCaptureCover = captureCoverDataUrl;
window.__starshipExportStl = async function exportStlBuffer() {
  await flushRebuild();
  await ensureShipGeometry();
  const preferBoolean = selectedStyle() === "engraved";
  const payload = buildExportMeshes({ preferBoolean });
  const exporter = new STLExporter();
  let buffer;
  if (payload.mode === "boolean" || payload.geometry) {
    buffer = exporter.parse(new THREE.Mesh(payload.geometry), { binary: true });
    payload.geometry.dispose();
  } else {
    buffer = exporter.parse(payload.group, { binary: true });
    payload.ship?.dispose();
    payload.text?.dispose();
  }
  return buffer;
};

function downloadOpenscadSnippet() {
  const s = readState();
  const fontKey = FONT_OPTIONS[s.font] ? s.font : "oswald-bold";
  const openscadFont = FONT_OPTIONS[fontKey].openscad;
  // Web proud depth + embed ≈ OpenSCAD Text_Depth with Surface_Offset = -EMBED
  const textDepth = (ship.embedMm + Number(s.depth)).toFixed(2);
  const nameEscaped = (s.name || "S40").replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  const scad = `// Generated by ${creditLine()}
// ${AUTHOR.repo}
// Wrap-to-hull is web-only — OpenSCAD uses flat emboss/engrave.
// Open with openscad/starship_custom_name.scad or paste into Customizer.
// NOTE: that flat path is tuned to the classic remix mesh${
    ship.id === "parametric"
      ? " — your current base is the parametric CAD, so placement will differ. Prefer web STL/3MF export for Original CAD"
      : ""
  }.

/* [Text] */
Name = "${nameEscaped}";
Text_Size = ${Number(s.size).toFixed(1)}; // [3:0.5:14] (web max 14 mm)
Text_Depth = ${textDepth}; // [0.5:0.05:1.5]
Font = "${openscadFont}"; // web font: ${fontKey}
Style = "${s.style}"; // [raised, engraved]

/* [Placement] */
Text_Y = ${Number(s.pos)}; // [-90:1:90]
Side = "${s.side === "both" ? "both" : s.side}"; // [both, right, left]
Text_X_Offset = ${Number(ship.markingAcrossMm) || 0}; // web circumferential bias (approx on classic mesh)
Surface_Offset = -${ship.embedMm};

/* [Export] */
Part = "preview_with_ship"; // [text_only, preview_with_ship]

// Model scale ${s.scale}% is web/export-only — scale in the slicer if needed.
`;

  triggerDownload(
    new Blob([scad], { type: "text/plain" }),
    `starship_${nameSlug()}_params.scad`
  );
  setStatus(
    ship.id === "parametric"
      ? "OpenSCAD params downloaded — flat classic-mesh path only; prefer web export for Original CAD."
      : "OpenSCAD params downloaded — open with the included .scad (no hull wrap)."
  );
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
  if (!el.name.value.trim()) {
    setStatus("Enter a name on the hull first.");
    return;
  }
  let size = Number(el.size.value);
  while (size > 3) {
    const { used } = sanitizeName(el.name.value);
    const geo = buildFlatTextGeometry(
      used,
      size,
      ship.embedMm + Number(el.depth.value)
    );
    const span = measureSpan(geo);
    geo.dispose();
    if (span <= ship.safeSpanMm) break;
    size -= 0.5;
  }
  el.size.value = String(size);
  updateLabels();
  await flushRebuild();
  writeUrl();
  setStatus(
    lastSpanMm <= ship.safeSpanMm
      ? `Fitted to ${size.toFixed(1)} mm letter height (span ~${lastSpanMm.toFixed(0)} mm).`
      : `Still long at minimum size (~${lastSpanMm.toFixed(0)} mm). Shorten the name.`
  );
}

function onControlChange() {
  applyColor();
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
  setExportBusy(true);
  await loadPrintEnvelope();
  const urlState = stateFromUrl();
  // Resolve the base ship first — envelope numbers, slider limits, and the
  // default letter size all depend on it.
  const bootShipId =
    urlState.ship && SHIPS[urlState.ship] ? urlState.ship : DEFAULT_SHIP_ID;
  // Drop legacy "Custom Name" share URLs on desk models only — keychain uses it.
  if (urlState.name === "Custom Name" && bootShipId !== "keychain") {
    delete urlState.name;
  }
  ship = SHIPS[bootShipId];
  setShipRadio(ship.id);
  applyEnvelopeForShip();
  if (urlState.size == null) el.size.value = String(ship.defaultSizeMm);
  if (urlState.pos == null) {
    el.pos.value = String(ship.defaultPosMm);
    posPinnedByUser = false;
  } else {
    posPinnedByUser = true;
  }
  if (urlState.side == null) {
    const side =
      ship.defaultSide === "left" || ship.defaultSide === "both"
        ? ship.defaultSide
        : "right";
    const sideRadio = document.querySelector(
      `input[name="side"][value="${side}"]`
    );
    if (sideRadio) sideRadio.checked = true;
  }
  if (
    urlState.style == null &&
    (ship.defaultStyle === "raised" || ship.defaultStyle === "engraved")
  ) {
    const styleRadio = document.querySelector(
      `input[name="style"][value="${ship.defaultStyle}"]`
    );
    if (styleRadio) styleRadio.checked = true;
  }
  // Classic remix must start at CORE One % (~215), not the HTML default 100.
  // Keychain stays native (100%).
  if (urlState.scale == null) {
    el.scale.value = String(
      ship.id === "keychain" ? 100 : coreOneScalePercent()
    );
  }
  mountFontOptions(
    urlState.font && FONT_OPTIONS[urlState.font] ? urlState.font : "oswald-bold"
  );
  mountPresets(el.hullPresets, el.color);
  mountPresets(el.textPresets, el.textColor);
  applyState(urlState);
  // Desk models stay blank until typed; keychain defaults to "Custom Name".
  if (!urlState.name || !String(urlState.name).trim()) {
    el.name.value = ship.defaultName || "";
  }
  if (!urlState.color && ship.defaultColor) {
    el.color.value = ship.defaultColor;
  }
  // Italic is opt-in only (default off). Explicit italic=1 in the URL still works.
  if (el.italic) {
    el.italic.checked =
      urlState.italic === "1" || urlState.italic === "true";
  }
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
  el.pos.addEventListener("input", () => {
    posPinnedByUser = true;
    onControlChange();
  });
  el.depth.addEventListener("input", onControlChange);
  el.scale.addEventListener("input", () => {
    updateLabels();
    applyModelScale();
    updateDownloadLabels();
    writeUrl();
  });
  el.coreOnePreset?.addEventListener("click", () => applyCoreOnePreset());
  el.mini250Preset?.addEventListener("click", () => applyMiniScalePreset(250));
  el.mini300Preset?.addEventListener("click", () => applyMiniScalePreset(300));
  for (const radio of document.querySelectorAll('input[name="ship"]')) {
    radio.addEventListener("change", () => {
      applyShipSelection(selectedShipId()).catch((err) => {
        // applyShipSelection already sets status + rolls back on failure.
        console.error(err);
      });
    });
  }
  el.wrap.addEventListener("change", onControlChange);
  el.italic?.addEventListener("change", onControlChange);
  el.bareStainless?.addEventListener("change", () => {
    applyColor();
    updateDownloadLabels();
    writeUrl();
  });
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
  el.namePresets?.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button[data-name]");
    if (!btn) return;
    applyNamePreset(btn.dataset.name).catch((err) => {
      console.error(err);
      setStatus(err.message || "Preset failed", true);
    });
  });
  el.copyLinkAgain?.addEventListener("click", () => {
    copyShareLink();
  });

  try {
    const initialFontId = FONT_OPTIONS[el.fontStyle.value]
      ? el.fontStyle.value
      : "oswald-bold";

    await Promise.all([
      applyFontSelection(initialFontId, { rebuild: false }),
      applyShipSelection(bootShipId, { retune: false }),
    ]);

    ready = true;
    setExportBusy(false);
    applyColor();
    await rebuildText();
    frameCamera();
    writeUrl();
    setStatus("Ready — type a name for your ship, then download STL / 3MF / PNG.");
  } catch (err) {
    console.error(err);
    setStatus(
      err?.message
        ? `Failed to load ship or font: ${err.message}`
        : "Failed to load ship or font.",
      true
    );
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
