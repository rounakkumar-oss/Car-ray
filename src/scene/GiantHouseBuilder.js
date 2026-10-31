import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  getHousePBRTextures,
  createMonitorScreenTexture,
} from './ProceduralTextures.js';
import { createNightWindowTexture } from './DeskDioramaBuilder.js';

/**
 * Builds the ultra-detailed, photorealistic "Giant House Open World" 3D map
 * with 14 interconnected rooms & areas, multi-part sculpted furniture (RoundedBoxGeometry,
 * LatheGeometry, TubeGeometry, CylinderGeometry, SphereGeometry, TorusGeometry),
 * high-resolution procedural PBR textures (wood grain planks, velvet fabric weave,
 * Calacatta marble, ceramic tile, brushed stainless steel), THREE.InstancedMesh micro-details
 * (individual glowing RGB keyboard keys, library book rows, cabinet handles, chair legs,
 * dumbbells), warm dome lamps, RGB LED underglow strips, pleated window curtains,
 * and a fast AABB wall/obstacle collision + ramp height solver.
 */
export function buildGiantHouseWorld() {
  const houseGroup = new THREE.Group();
  houseGroup.name = 'GiantHouseOpenWorldGroup';
  houseGroup.visible = false;

  const tex = getHousePBRTextures();
  const monitorScreenTex = createMonitorScreenTexture();
  const nightWindowTex = createNightWindowTexture();

  // -------------------------------------------------------------------------
  // 1. 14 ROOM DEFINITIONS (4x4 Interconnected Grid, 1 unit = 1 meter)
  //    X spans [-3.6, +6.0] (9.6m wide), Z spans [-3.6, +6.0] (9.6m deep)
  // -------------------------------------------------------------------------
  const ROOM_LIST = [
    {
      id: 1,
      code: '01',
      name: 'GIANT LIVING ROOM',
      shortName: 'LIVING ROOM',
      xMin: -3.6,
      xMax: -1.2,
      zMin: -3.6,
      zMax: -1.2,
      cx: -2.4,
      cz: -2.4,
      floorType: 'hardwood',
      floorTint: 0xd8b898,
      accentColor: '#ff9e44',
      ledHex: 0xff9438,
    },
    {
      id: 2,
      code: '02',
      name: 'HUGE MODERN KITCHEN',
      shortName: 'KITCHEN',
      xMin: -1.2,
      xMax: 1.2,
      zMin: -3.6,
      zMax: -1.2,
      cx: 0.0,
      cz: -2.4,
      floorType: 'tile',
      floorTint: 0xeef2f6,
      accentColor: '#00e5ff',
      ledHex: 0x00e5ff,
    },
    {
      id: 3,
      code: '03',
      name: 'MASTER BEDROOM',
      shortName: 'BEDROOM',
      xMin: -3.6,
      xMax: -1.2,
      zMin: -1.2,
      zMax: 1.2,
      cx: -2.4,
      cz: 0.0,
      floorType: 'hardwood',
      floorTint: 0xe2c8aa,
      accentColor: '#b388ff',
      ledHex: 0xffb266,
    },
    {
      id: 4,
      code: '04',
      name: 'GAMING / ARCADE ROOM',
      shortName: 'ARCADE',
      xMin: -3.6,
      xMax: -1.2,
      zMin: 1.2,
      zMax: 3.6,
      cx: -2.4,
      cz: 2.4,
      floorType: 'velvetDark',
      floorTint: 0x26293e,
      accentColor: '#ff2a85',
      ledHex: 0xff2a85,
    },
    {
      id: 5,
      code: '05',
      name: 'DINING HALL',
      shortName: 'DINING HALL',
      xMin: 1.2,
      xMax: 3.6,
      zMin: -3.6,
      zMax: -1.2,
      cx: 2.4,
      cz: -2.4,
      floorType: 'walnut',
      floorTint: 0xc8a484,
      accentColor: '#ffd27d',
      ledHex: 0xffbe64,
    },
    {
      id: 6,
      code: '06',
      name: 'KIDS / TOY ROOM',
      shortName: 'TOY ROOM',
      xMin: -1.2,
      xMax: 1.2,
      zMin: 1.2,
      zMax: 3.6,
      cx: 0.0,
      cz: 2.4,
      floorType: 'hardwood',
      floorTint: 0xf0d8b8,
      accentColor: '#ff5252',
      ledHex: 0xffca28,
    },
    {
      id: 7,
      code: '07',
      name: 'HOME THEATER ROOM',
      shortName: 'THEATER',
      xMin: 1.2,
      xMax: 3.6,
      zMin: 1.2,
      zMax: 3.6,
      cx: 2.4,
      cz: 2.4,
      floorType: 'carpetCrimson',
      floorTint: 0x581c28,
      accentColor: '#ff4081',
      ledHex: 0xff3d7f,
    },
    {
      id: 8,
      code: '08',
      name: 'INDOOR GYM / FITNESS',
      shortName: 'GYM',
      xMin: -1.2,
      xMax: 1.2,
      zMin: 3.6,
      zMax: 6.0,
      cx: 0.0,
      cz: 4.8,
      floorType: 'gymRubber',
      floorTint: 0x343b48,
      accentColor: '#69f0ae',
      ledHex: 0x00e676,
    },
    {
      id: 9,
      code: '09',
      name: 'LIBRARY / STUDY ROOM',
      shortName: 'LIBRARY',
      xMin: -3.6,
      xMax: -1.2,
      zMin: 3.6,
      zMax: 6.0,
      cx: -2.4,
      cz: 4.8,
      floorType: 'walnut',
      floorTint: 0xb68a62,
      accentColor: '#ffab40',
      ledHex: 0xffaa44,
    },
    {
      id: 10,
      code: '10',
      name: 'LUXURY BATHROOM',
      shortName: 'BATHROOM',
      xMin: 3.6,
      xMax: 6.0,
      zMin: 1.2,
      zMax: 3.6,
      cx: 4.8,
      cz: 2.4,
      floorType: 'marble',
      floorTint: 0xf4f8fc,
      accentColor: '#40c4ff',
      ledHex: 0x40c4ff,
    },
    {
      id: 11,
      code: '11',
      name: 'GARAGE / WORKSHOP',
      shortName: 'GARAGE',
      xMin: 1.2,
      xMax: 6.0,
      zMin: 3.6,
      zMax: 6.0,
      cx: 3.6,
      cz: 4.8,
      floorType: 'tile',
      floorTint: 0x76808e,
      accentColor: '#ff6e40',
      ledHex: 0xff6e40,
    },
    {
      id: 12,
      code: '12',
      name: 'GRAND CENTRAL HALLWAY',
      shortName: 'CENTRAL HALL',
      xMin: -1.2,
      xMax: 3.6,
      zMin: -1.2,
      zMax: 1.2,
      cx: 1.2,
      cz: 0.0,
      floorType: 'marble',
      floorTint: 0xf8f4ec,
      accentColor: '#ffca28',
      ledHex: 0xffbe55,
    },
    {
      id: 13,
      code: '13',
      name: 'INDOOR POOL / SUNROOM',
      shortName: 'SUNROOM POOL',
      xMin: 3.6,
      xMax: 6.0,
      zMin: -3.6,
      zMax: -1.2,
      cx: 4.8,
      cz: -2.4,
      floorType: 'tile',
      floorTint: 0xdcebf2,
      accentColor: '#24e5ff',
      ledHex: 0x00e5ff,
    },
    {
      id: 14,
      code: '14',
      name: 'BACKYARD PATIO / DECK',
      shortName: 'PATIO DECK',
      xMin: 3.6,
      xMax: 6.0,
      zMin: -1.2,
      zMax: 1.2,
      cx: 4.8,
      cz: 0.0,
      floorType: 'hardwood',
      floorTint: 0x9c6e44,
      accentColor: '#4cd964',
      ledHex: 0xffb84d,
    },
  ];

  // Physics collision & ramp structures + 2D Mini-Map architectural metadata
  const colliders = [];
  const ramps = [];
  const doorways = [];

  function registerCollider(x, z, w, d, yMax) {
    colliders.push({
      xMin: x - w * 0.5,
      xMax: x + w * 0.5,
      zMin: z - d * 0.5,
      zMax: z + d * 0.5,
      yMax,
    });
  }

  // -------------------------------------------------------------------------
  // 2. SHARED REALISTIC PBR MATERIALS (MeshStandardMaterial & MeshPhysicalMaterial)
  // -------------------------------------------------------------------------
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xeae1d3,
    bumpMap: tex.fabricWeaveBumpTex,
    bumpScale: 0.0015,
    roughness: 0.78,
    metalness: 0.02,
    envMapIntensity: 0.45,
  });

  const wainscoatMat = new THREE.MeshStandardMaterial({
    color: 0xf7f3ec,
    roughness: 0.52,
    metalness: 0.05,
    envMapIntensity: 0.6,
  });

  const oakWoodPBRMat = new THREE.MeshStandardMaterial({
    color: 0xd8a878,
    map: tex.hardwoodColorTex,
    bumpMap: tex.hardwoodBumpTex,
    bumpScale: 0.004,
    roughness: 0.42,
    metalness: 0.06,
    envMapIntensity: 0.85,
  });

  const darkWalnutPBRMat = new THREE.MeshStandardMaterial({
    color: 0x72482c,
    map: tex.walnutColorTex,
    bumpMap: tex.walnutBumpTex,
    bumpScale: 0.004,
    roughness: 0.36,
    metalness: 0.08,
    envMapIntensity: 0.9,
  });

  const calacattaMarblePBRMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: tex.marbleColorTex,
    bumpMap: tex.ceramicTileBumpTex,
    bumpScale: 0.0015,
    roughness: 0.16,
    metalness: 0.04,
    clearcoat: 0.65,
    clearcoatRoughness: 0.14,
    envMapIntensity: 1.15,
  });

  const brushedSteelPBRMat = new THREE.MeshStandardMaterial({
    color: 0xdce4ee,
    map: tex.brushedMetalTex,
    bumpMap: tex.brushedMetalTex,
    bumpScale: 0.002,
    roughness: 0.24,
    metalness: 0.88,
    envMapIntensity: 1.35,
  });

  const chromePBRMat = new THREE.MeshStandardMaterial({
    color: 0xf4f8ff,
    roughness: 0.12,
    metalness: 0.96,
    envMapIntensity: 1.5,
  });

  const brushedBrassPBRMat = new THREE.MeshStandardMaterial({
    color: 0xe5b869,
    map: tex.brushedMetalTex,
    roughness: 0.22,
    metalness: 0.86,
    envMapIntensity: 1.35,
  });

  const matteBlackMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1c2028,
    roughness: 0.38,
    metalness: 0.72,
    envMapIntensity: 0.9,
  });

  const velvetNavyMat = new THREE.MeshStandardMaterial({
    color: 0x234c7e,
    bumpMap: tex.fabricWeaveBumpTex,
    bumpScale: 0.005,
    roughness: 0.82,
    metalness: 0.04,
  });

  const velvetCreamMat = new THREE.MeshStandardMaterial({
    color: 0xf0e7d8,
    bumpMap: tex.fabricWeaveBumpTex,
    bumpScale: 0.005,
    roughness: 0.84,
    metalness: 0.02,
  });

  const velvetCrimsonMat = new THREE.MeshStandardMaterial({
    color: 0xa81c2e,
    bumpMap: tex.fabricWeaveBumpTex,
    bumpScale: 0.005,
    roughness: 0.80,
    metalness: 0.04,
  });

  const velvetSageMat = new THREE.MeshStandardMaterial({
    color: 0x3b6e5c,
    bumpMap: tex.fabricWeaveBumpTex,
    bumpScale: 0.005,
    roughness: 0.82,
    metalness: 0.03,
  });

  const velvetBlushMat = new THREE.MeshStandardMaterial({
    color: 0xd98a6c,
    bumpMap: tex.fabricWeaveBumpTex,
    bumpScale: 0.005,
    roughness: 0.82,
    metalness: 0.03,
  });

  const curtainFabricMat = new THREE.MeshStandardMaterial({
    color: 0xdcd2c2,
    bumpMap: tex.fabricWeaveBumpTex,
    bumpScale: 0.004,
    roughness: 0.86,
    metalness: 0.02,
  });

  const temperedGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0xd8f0ff,
    roughness: 0.08,
    metalness: 0.1,
    transparent: true,
    opacity: 0.42,
    clearcoat: 1.0,
    envMapIntensity: 1.6,
  });

  const plantLeafMat = new THREE.MeshStandardMaterial({
    color: 0x2d7a3e,
    roughness: 0.42,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });

  const warmLampBulbMat = new THREE.MeshStandardMaterial({
    color: 0xfff0cc,
    emissive: new THREE.Color(0xffaa38),
    emissiveIntensity: 2.2,
    roughness: 0.2,
  });

  const neonCyanMat = new THREE.MeshStandardMaterial({
    color: 0x80f8ff,
    emissive: new THREE.Color(0x00e5ff),
    emissiveIntensity: 1.85,
    roughness: 0.2,
  });

  const neonPinkMat = new THREE.MeshStandardMaterial({
    color: 0xff80b8,
    emissive: new THREE.Color(0xff2a85),
    emissiveIntensity: 1.85,
    roughness: 0.2,
  });

  const neonGoldMat = new THREE.MeshStandardMaterial({
    color: 0xffe082,
    emissive: new THREE.Color(0xffab28),
    emissiveIntensity: 1.75,
    roughness: 0.2,
  });

  const neonGreenMat = new THREE.MeshStandardMaterial({
    color: 0x9cffc4,
    emissive: new THREE.Color(0x00e676),
    emissiveIntensity: 1.75,
    roughness: 0.2,
  });

  const pcScreenMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: monitorScreenTex,
    emissive: new THREE.Color(0xffffff),
    emissiveMap: monitorScreenTex,
    emissiveIntensity: 0.95,
    roughness: 0.15,
    metalness: 0.1,
  });

  const tvScreenMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.tvCinemaTex,
    emissive: new THREE.Color(0xffffff),
    emissiveMap: tex.tvCinemaTex,
    emissiveIntensity: 1.05,
    roughness: 0.12,
    metalness: 0.12,
  });

  const windowGlassMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: nightWindowTex,
    emissive: new THREE.Color(0xffcfa0),
    emissiveMap: nightWindowTex,
    emissiveIntensity: 0.85,
    roughness: 0.12,
    metalness: 0.2,
  });

  // -------------------------------------------------------------------------
  // 3. SHARED SCULPTED GEOMETRY CACHES & INSTANCED MESH REGISTRIES
  // -------------------------------------------------------------------------
  const roundedGeoCache = new Map();
  function getRoundedBoxGeo(w, h, d, r = 0.018, segs = 3) {
    const safeR = Math.min(r, w * 0.45, h * 0.45, d * 0.45);
    const key = `${w.toFixed(3)}_${h.toFixed(3)}_${d.toFixed(3)}_${safeR.toFixed(3)}_${segs}`;
    if (roundedGeoCache.has(key)) return roundedGeoCache.get(key);
    const geo = new RoundedBoxGeometry(w, h, d, segs, safeR);
    roundedGeoCache.set(key, geo);
    return geo;
  }

  function addRoundedPart(parent, w, h, d, r, x, y, z, mat, collider = false) {
    const mesh = new THREE.Mesh(getRoundedBoxGeo(w, h, d, r, 3), mat);
    mesh.position.set(x, y, z);
    mesh.frustumCulled = true;
    parent.add(mesh);
    if (collider) {
      registerCollider(x, z, w, d, y + h * 0.5);
    }
    return mesh;
  }

  // Soft baked floor/wall/desk lightmap glow planes (zero extra shader lights, ultra-atmospheric bounce!)
  function addGlowPool(x, y, z, w, d, hexColor, opacity = 0.38, rotX = -Math.PI / 2, rotY = 0) {
    const mat = new THREE.MeshBasicMaterial({
      color: hexColor,
      map: tex.softGlowMapTex,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    m.position.set(x, y, z);
    m.rotation.set(rotX, rotY, 0);
    m.frustumCulled = true;
    houseGroup.add(m);
    return m;
  }

  // Instanced registries for high-detail micro-elements (single draw call per category!)
  const legInstances = [];      // { x, y, z, sx, sy, sz, colorHex }
  const handleInstances = [];   // { x, y, z, sx, sy, sz, rotY, colorHex }
  const keycapInstances = [];   // { x, y, z, colorHex }
  const bookInstances = [];     // { x, y, z, sx, sy, sz, rotY, colorHex }
  const dumbbellInstances = []; // { x, y, z, rotY, colorHex }

  function pushLegInstance(x, y, z, radius, height, colorHex = 0xe5b869, addCol = true) {
    legInstances.push({ x, y, z, sx: radius, sy: height, sz: radius, colorHex });
    if (addCol) {
      registerCollider(x, z, radius * 2.1, radius * 2.1, y + height * 0.5);
    }
  }

  function pushHandleInstance(x, y, z, sx, sy, sz, rotY = 0, colorHex = 0xe5b869) {
    handleInstances.push({ x, y, z, sx, sy, sz, rotY, colorHex });
  }

  // -------------------------------------------------------------------------
  // 4. REUSABLE COMPOSITE 3D PROP BUILDERS (NO PLAIN BOXES!)
  // -------------------------------------------------------------------------

  /**
   * Builds a sculpted Warm Spherical / Dome Desk or Bedside Lamp (matching original bedroom lamp):
   * - Weighted beveled marble/brass base (`CylinderGeometry`)
   * - Curved tubular gooseneck stem (`TubeGeometry`)
   * - Hemispherical spun-metal dome shade (`SphereGeometry`) + glowing warm tungsten bulb core
   * - Warm golden light pool on the surface beneath
   */
  function addWarmDomeLamp(x, baseY, z, scale = 1.0, rotY = 0) {
    const g = new THREE.Group();
    g.position.set(x, baseY, z);
    g.rotation.y = rotY;
    g.scale.setScalar(scale);

    // Tiered base
    const base1 = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.012, 16), calacattaMarblePBRMat);
    base1.position.y = 0.006;
    g.add(base1);
    const base2 = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.036, 0.008, 16), brushedBrassPBRMat);
    base2.position.y = 0.014;
    g.add(base2);

    // Curved gooseneck arm
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.016, 0),
      new THREE.Vector3(-0.012, 0.085, 0),
      new THREE.Vector3(0.008, 0.145, 0),
      new THREE.Vector3(0.032, 0.135, 0),
    ]);
    const stem = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.0045, 8, false), brushedBrassPBRMat);
    g.add(stem);

    // Spun-metal dome shade
    const domeGeo = new THREE.SphereGeometry(0.048, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.62);
    const dome = new THREE.Mesh(domeGeo, velvetCreamMat);
    dome.position.set(0.036, 0.118, 0);
    dome.rotation.z = -0.22;
    g.add(dome);

    // Glowing warm bulb inside dome
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 10), warmLampBulbMat);
    bulb.position.set(0.034, 0.112, 0);
    g.add(bulb);

    houseGroup.add(g);
    addGlowPool(x, baseY + 0.002, z, 0.42 * scale, 0.42 * scale, 0xffaa38, 0.48);
  }

  /**
   * Builds a complete Gaming / Study PC Desk Setup matching the original Bedroom scene:
   * - Beveled oak/walnut desktop slab with glowing under-desk RGB LED strip
   * - Ultrawide thin-bezel monitor on sculpted V-stand + top webcam with green activity LED
   * - Tempered-glass PC tower with 3 glowing internal RGB cooling fans & GPU lightbar
   * - Mechanical keyboard with individual raised glowing RGB keycaps (via InstancedMesh)
   * - Neon-bordered RGB mousepad + contoured ergonomic mouse with scroll wheel
   * - Articulated boom-arm podcasting microphone with glowing blue LED ring
   * - Glowing warm dome desk lamp + curved velvet swivel chair with 5-star chrome base
   */
  function addCompleteGamingStudyDesk(cx, cz, rotY = 0, isRgbGaming = true) {
    const deskGroup = new THREE.Group();
    deskGroup.position.set(cx, 0, cz);
    deskGroup.rotation.y = rotY;

    const toWorld = (lx, ly, lz) => {
      const v = new THREE.Vector3(lx, ly, lz).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
      return { x: cx + v.x, y: v.y, z: cz + v.z };
    };

    const deskW = 1.12;
    const deskD = 0.54;
    const deskY = 0.24;

    // 1. Beveled Wood Desktop Slab (drive-under clearance Y = 0.22m!)
    const topMat = isRgbGaming ? matteBlackMetalMat : oakWoodPBRMat;
    const slab = new THREE.Mesh(getRoundedBoxGeo(deskW, 0.026, deskD, 0.008, 3), topMat);
    slab.position.set(0, deskY, 0);
    deskGroup.add(slab);

    // Glowing RGB LED strip along back edge of desk
    const ledStrip = new THREE.Mesh(
      getRoundedBoxGeo(deskW - 0.06, 0.012, 0.014, 0.004, 2),
      isRgbGaming ? neonPinkMat : neonGoldMat
    );
    ledStrip.position.set(0, deskY - 0.008, -deskD * 0.48);
    deskGroup.add(ledStrip);

    // 4 Tapered Metallic Desk Legs (registered with collision + instanced mesh)
    for (const [lx, lz] of [
      [-deskW * 0.44, -deskD * 0.40],
      [deskW * 0.44, -deskD * 0.40],
      [-deskW * 0.44, deskD * 0.40],
      [deskW * 0.44, deskD * 0.40],
    ]) {
      const wp = toWorld(lx, 0.115, lz);
      pushLegInstance(wp.x, wp.y, wp.z, 0.022, 0.23, 0x22262e, true);
    }

    const surfaceY = deskY + 0.013;

    // 2. Ultrawide Thin-Bezel Monitor + V-Stand + Top Webcam
    const monW = 0.48;
    const monH = 0.23;
    const monFrame = new THREE.Mesh(
      getRoundedBoxGeo(monW, monH, 0.016, 0.006, 3),
      matteBlackMetalMat
    );
    monFrame.position.set(0, surfaceY + 0.165, -0.14);
    deskGroup.add(monFrame);

    const screenPlane = new THREE.Mesh(new THREE.PlaneGeometry(monW - 0.016, monH - 0.016), pcScreenMat);
    screenPlane.position.set(0, surfaceY + 0.165, -0.131);
    deskGroup.add(screenPlane);

    // Monitor neck & V-stand arms
    const monNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.11, 12), brushedSteelPBRMat);
    monNeck.position.set(0, surfaceY + 0.055, -0.165);
    deskGroup.add(monNeck);
    for (const side of [-1, 1]) {
      const vArm = new THREE.Mesh(getRoundedBoxGeo(0.13, 0.008, 0.018, 0.003, 2), brushedSteelPBRMat);
      vArm.position.set(side * 0.052, surfaceY + 0.004, -0.145);
      vArm.rotation.y = side * 0.45;
      deskGroup.add(vArm);
    }

    // Webcam perched on top of monitor bezel with lens & green LED
    const webcamBody = new THREE.Mesh(getRoundedBoxGeo(0.058, 0.018, 0.022, 0.006, 2), matteBlackMetalMat);
    webcamBody.position.set(0, surfaceY + 0.288, -0.136);
    deskGroup.add(webcamBody);
    const webcamLens = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.008, 12), chromePBRMat);
    webcamLens.rotation.x = Math.PI / 2;
    webcamLens.position.set(0, surfaceY + 0.288, -0.123);
    deskGroup.add(webcamLens);
    const webcamLed = new THREE.Mesh(new THREE.SphereGeometry(0.0025, 8, 8), neonGreenMat);
    webcamLed.position.set(0.016, surfaceY + 0.288, -0.124);
    deskGroup.add(webcamLed);

    // 3. Neon-Bordered RGB Mousepad + Mechanical Keyboard + Individual Glowing Keycaps + Sculpted Mouse
    const padW = 0.46;
    const padD = 0.20;
    const padGlowRim = new THREE.Mesh(
      getRoundedBoxGeo(padW + 0.01, 0.004, padD + 0.01, 0.002, 2),
      isRgbGaming ? neonCyanMat : neonGoldMat
    );
    padGlowRim.position.set(0.02, surfaceY + 0.002, 0.06);
    deskGroup.add(padGlowRim);

    const padSurface = new THREE.Mesh(
      getRoundedBoxGeo(padW, 0.005, padD, 0.002, 2),
      matteBlackMetalMat
    );
    padSurface.position.set(0.02, surfaceY + 0.0035, 0.06);
    deskGroup.add(padSurface);

    // Mechanical Keyboard Chassis
    const kbW = 0.24;
    const kbD = 0.092;
    const kbBase = new THREE.Mesh(
      getRoundedBoxGeo(kbW, 0.012, kbD, 0.004, 2),
      brushedSteelPBRMat
    );
    kbBase.position.set(-0.04, surfaceY + 0.01, 0.055);
    deskGroup.add(kbBase);

    // Register 48 individual raised RGB keycaps in InstancedMesh!
    const keyColors = [0x00f0ff, 0x38b6ff, 0x9c6bff, 0xff2a85, 0xffaa38, 0x00e676];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 12; c++) {
        const kx = -0.04 - kbW * 0.43 + c * 0.0185;
        const kz = 0.055 - kbD * 0.34 + r * 0.021;
        const wp = toWorld(kx, surfaceY + 0.018, kz);
        const colHex = keyColors[(c + r * 2) % keyColors.length];
        keycapInstances.push({ x: wp.x, y: wp.y, z: wp.z, rotY, colorHex: colHex });
      }
    }

    // Contoured Ergonomic Mouse (sculpted rounded hull + scroll wheel + RGB tail stripe)
    const mouseGroup = new THREE.Group();
    mouseGroup.position.set(0.155, surfaceY + 0.012, 0.065);
    const mouseHull = new THREE.Mesh(new THREE.SphereGeometry(0.022, 14, 10), matteBlackMetalMat);
    mouseHull.scale.set(0.75, 0.52, 1.28);
    mouseGroup.add(mouseHull);
    const scrollWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.004, 10), neonCyanMat);
    scrollWheel.rotation.z = Math.PI / 2;
    scrollWheel.position.set(0, 0.009, -0.012);
    mouseGroup.add(scrollWheel);
    deskGroup.add(mouseGroup);

    // 4. Tempered-Glass Gaming PC Tower with 3 Internal Glowing RGB Fans & GPU Bar
    const pcX = 0.39;
    const pcZ = -0.05;
    const pcChassis = new THREE.Mesh(
      getRoundedBoxGeo(0.14, 0.28, 0.29, 0.008, 3),
      matteBlackMetalMat
    );
    pcChassis.position.set(pcX, surfaceY + 0.14, pcZ);
    deskGroup.add(pcChassis);

    const pcGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.24), temperedGlassMat);
    pcGlass.rotation.y = -Math.PI / 2;
    pcGlass.position.set(pcX - 0.071, surfaceY + 0.14, pcZ);
    deskGroup.add(pcGlass);

    // 3 glowing front/side RGB ring fans inside PC tower
    const fanMats = [neonCyanMat, neonPinkMat, neonGoldMat];
    for (let f = 0; f < 3; f++) {
      const fanRing = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.005, 8, 16), fanMats[f]);
      fanRing.position.set(pcX - 0.035, surfaceY + 0.06 + f * 0.08, pcZ + 0.12);
      deskGroup.add(fanRing);
    }

    // 5. Boom-Arm Podcasting Microphone with Glowing #1E6BFF LED Ring
    const micBase = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.03, 0.012, 12), matteBlackMetalMat);
    micBase.position.set(-0.34, surfaceY + 0.006, -0.08);
    deskGroup.add(micBase);
    const boomCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.34, surfaceY + 0.012, -0.08),
      new THREE.Vector3(-0.36, surfaceY + 0.16, -0.06),
      new THREE.Vector3(-0.24, surfaceY + 0.18, 0.02),
    ]);
    const boomTube = new THREE.Mesh(new THREE.TubeGeometry(boomCurve, 10, 0.005, 8, false), matteBlackMetalMat);
    deskGroup.add(boomTube);
    const micCapsule = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.052, 14), matteBlackMetalMat);
    micCapsule.position.set(-0.24, surfaceY + 0.155, 0.02);
    deskGroup.add(micCapsule);
    const micLedRing = new THREE.Mesh(new THREE.TorusGeometry(0.0165, 0.003, 8, 16), neonCyanMat);
    micLedRing.rotation.x = Math.PI / 2;
    micLedRing.position.set(-0.24, surfaceY + 0.155, 0.02);
    deskGroup.add(micLedRing);

    houseGroup.add(deskGroup);

    // 6. Warm Dome Desk Lamp on left corner of desk
    const lampPos = toWorld(-0.43, surfaceY, -0.14);
    addWarmDomeLamp(lampPos.x, lampPos.y, lampPos.z, 1.0, rotY + 0.4);

    // 7. Curved Velvet Swivel Chair with 5-Star Chrome Base in front of desk
    const chairPos = toWorld(0.0, 0.0, 0.36);
    addCurvedVelvetSwivelChair(
      chairPos.x,
      chairPos.z,
      rotY + Math.PI,
      isRgbGaming ? velvetNavyMat : velvetCreamMat
    );

    // Floor & Wall atmospheric light pools
    const glowPos = toWorld(0, 0.003, 0);
    addGlowPool(glowPos.x, 0.003, glowPos.z, 1.35, 0.95, isRgbGaming ? 0xff2a85 : 0xffaa38, 0.34);
  }

  /**
   * Builds a sculpted Curved Velvet / Bouclé Swivel Chair with 5-Star Chrome Base & Casters
   */
  function addCurvedVelvetSwivelChair(x, z, rotY = 0, fabricMat = velvetCreamMat) {
    const cg = new THREE.Group();
    cg.position.set(x, 0, z);
    cg.rotation.y = rotY;

    // 5-Star Chrome Base + Casters + Gas Lift Cylinder
    const lift = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.13, 12), chromePBRMat);
    lift.position.y = 0.075;
    cg.add(lift);

    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      const legBar = new THREE.Mesh(getRoundedBoxGeo(0.13, 0.012, 0.018, 0.004, 2), chromePBRMat);
      legBar.position.set(Math.cos(ang) * 0.06, 0.022, Math.sin(ang) * 0.06);
      legBar.rotation.y = -ang;
      cg.add(legBar);
      const caster = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 8), matteBlackMetalMat);
      caster.rotation.z = Math.PI / 2;
      caster.position.set(Math.cos(ang) * 0.115, 0.012, Math.sin(ang) * 0.115);
      cg.add(caster);
    }

    // Plush Rounded Seat Cushion
    const seat = new THREE.Mesh(getRoundedBoxGeo(0.24, 0.042, 0.23, 0.018, 3), fabricMat);
    seat.position.y = 0.145;
    cg.add(seat);

    // Curved Wrap-Around Velvet Backrest & Armrests (Cylinder arc + rounded top bolster)
    const backArcGeo = new THREE.CylinderGeometry(0.125, 0.12, 0.18, 16, 1, true, -Math.PI * 0.62, Math.PI * 1.24);
    const backArc = new THREE.Mesh(backArcGeo, fabricMat);
    backArc.position.set(0, 0.24, 0);
    cg.add(backArc);

    const headrest = new THREE.Mesh(getRoundedBoxGeo(0.16, 0.065, 0.045, 0.02, 3), fabricMat);
    headrest.position.set(0, 0.34, -0.105);
    cg.add(headrest);

    houseGroup.add(cg);
    registerCollider(x, z, 0.24, 0.24, 0.36);
  }

  /**
   * Builds a Backlit Window with Pleated Floor-to-Ceiling Drapes & Curtain Rod
   */
  function addWindowWithPleatedCurtains(x, y, z, rotY = 0, width = 1.05, height = 0.56) {
    const wg = new THREE.Group();
    wg.position.set(x, y, z);
    wg.rotation.y = rotY;

    // Outer Casement Frame
    const frame = new THREE.Mesh(
      getRoundedBoxGeo(width + 0.06, height + 0.06, 0.035, 0.008, 2),
      matteBlackMetalMat
    );
    wg.add(frame);

    // Backlit Night / Golden-Hour Window Glass Pane
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(width, height), windowGlassMat);
    glass.position.z = 0.02;
    wg.add(glass);

    // Center Mullion Bars
    const vMullion = new THREE.Mesh(getRoundedBoxGeo(0.018, height, 0.04, 0.004, 2), matteBlackMetalMat);
    wg.add(vMullion);
    const hMullion = new THREE.Mesh(getRoundedBoxGeo(width, 0.018, 0.04, 0.004, 2), matteBlackMetalMat);
    wg.add(hMullion);

    // Brushed Brass Curtain Rod with Spherical Finials
    const rodW = width + 0.32;
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, rodW, 12), brushedBrassPBRMat);
    rod.rotation.z = Math.PI / 2;
    rod.position.set(0, height * 0.5 + 0.055, 0.045);
    wg.add(rod);
    for (const side of [-1, 1]) {
      const finial = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 10), brushedBrassPBRMat);
      finial.position.set(side * (rodW * 0.5 + 0.01), height * 0.5 + 0.055, 0.045);
      wg.add(finial);
    }

    // Left & Right Pleated Curtain Panels (7 sculpted vertical cylindrical folds per side)
    const curtainH = height + 0.24;
    for (const side of [-1, 1]) {
      const baseX = side * (width * 0.5 + 0.02);
      for (let p = 0; p < 6; p++) {
        const foldX = baseX + side * (p * 0.022 - 0.03);
        const foldZ = 0.042 + (p % 2 === 0 ? 0.008 : -0.006);
        const fold = new THREE.Mesh(
          new THREE.CylinderGeometry(0.015, 0.018, curtainH, 10),
          curtainFabricMat
        );
        fold.position.set(foldX, -0.06, foldZ);
        wg.add(fold);
      }
    }

    houseGroup.add(wg);
  }

  /**
   * Builds a Sculpted Ceramic Pot with Layered Monstera / Palm Leaves
   */
  function addSculptedPottedPlant(x, z, scale = 1.0) {
    const pg = new THREE.Group();
    pg.position.set(x, 0, z);
    pg.scale.setScalar(scale);

    // Lathe-profiled ceramic planter pot
    const potPts = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.075, 0.0),
      new THREE.Vector2(0.105, 0.14),
      new THREE.Vector2(0.098, 0.22),
      new THREE.Vector2(0.088, 0.22),
      new THREE.Vector2(0.082, 0.19),
    ];
    const potGeo = new THREE.LatheGeometry(potPts, 16);
    const pot = new THREE.Mesh(potGeo, wainscoatMat);
    pg.add(pot);

    // Dark soil disc
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.086, 0.086, 0.02, 14), darkWalnutPBRMat);
    soil.position.y = 0.19;
    pg.add(soil);

    // 9 Layered Curved Tropical Leaves fanning outward
    for (let i = 0; i < 9; i++) {
      const ang = (i / 9) * Math.PI * 2 + (i % 2) * 0.2;
      const tier = i % 3;
      const stemCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.19, 0),
        new THREE.Vector3(Math.cos(ang) * 0.06, 0.28 + tier * 0.05, Math.sin(ang) * 0.06),
        new THREE.Vector3(Math.cos(ang) * (0.15 + tier * 0.03), 0.25 + tier * 0.06, Math.sin(ang) * (0.15 + tier * 0.03)),
      ]);
      const stem = new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 8, 0.005, 6, false), plantLeafMat);
      pg.add(stem);

      const leafBlade = new THREE.Mesh(
        getRoundedBoxGeo(0.085, 0.006, 0.13, 0.003, 2),
        plantLeafMat
      );
      leafBlade.position.set(
        Math.cos(ang) * (0.13 + tier * 0.025),
        0.265 + tier * 0.055,
        Math.sin(ang) * (0.13 + tier * 0.025)
      );
      leafBlade.rotation.y = -ang + Math.PI * 0.5;
      leafBlade.rotation.x = 0.38;
      pg.add(leafBlade);
    }

    houseGroup.add(pg);
    registerCollider(x, z, 0.21 * scale, 0.21 * scale, 0.42 * scale);
  }

  /**
   * Builds a sloped driving ramp or flat elevated bridge with realistic PBR textures,
   * side safety rails, and glowing neon edge strips, and registers it with the height solver.
   */
  function addDrivingRamp(
    parent,
    {
      xMin,
      xMax,
      zMin,
      zMax,
      yStart,
      yEnd,
      dir,
      color = 0xff8c24,
      emissive = 0x220c00,
      style = 'wood', // 'wood' | 'carpet' | 'ruler' | 'steel' | 'book'
    }
  ) {
    const w = xMax - xMin;
    const d = zMax - zMin;
    const cx = (xMin + xMax) * 0.5;
    const cz = (zMin + zMax) * 0.5;

    const baseMap =
      style === 'carpet'
        ? tex.wovenRugLivingTex
        : style === 'steel'
          ? tex.brushedMetalTex
          : tex.hardwoodColorTex;
    const bumpMap =
      style === 'carpet'
        ? tex.fabricWeaveBumpTex
        : style === 'steel'
          ? tex.brushedMetalTex
          : tex.hardwoodBumpTex;

    const mat = new THREE.MeshStandardMaterial({
      color,
      map: baseMap,
      bumpMap,
      bumpScale: 0.004,
      emissive: new THREE.Color(emissive),
      emissiveIntensity: 0.35,
      roughness: style === 'steel' ? 0.28 : 0.52,
      metalness: style === 'steel' ? 0.78 : 0.12,
    });

    if (dir === 'flat' || Math.abs(yEnd - yStart) < 1e-4) {
      const thickness = 0.022;
      const mesh = new THREE.Mesh(getRoundedBoxGeo(w, thickness, d, 0.006, 2), mat);
      mesh.position.set(cx, yStart - thickness * 0.5, cz);
      mesh.frustumCulled = true;
      parent.add(mesh);

      // Glowing side edge rails on elevated bridges
      if (yStart > 0.05) {
        const railMat = style === 'steel' ? neonGoldMat : neonCyanMat;
        const r1 = new THREE.Mesh(getRoundedBoxGeo(w, 0.012, 0.014, 0.004, 2), railMat);
        r1.position.set(cx, yStart + 0.004, zMin + 0.008);
        parent.add(r1);
        const r2 = new THREE.Mesh(getRoundedBoxGeo(w, 0.012, 0.014, 0.004, 2), railMat);
        r2.position.set(cx, yStart + 0.004, zMax - 0.008);
        parent.add(r2);
      }
    } else {
      const geo = new THREE.BufferGeometry();
      let y00 = yStart;
      let y10 = yStart;
      let y01 = yStart;
      let y11 = yStart;
      if (dir === '+x') {
        y00 = yStart; y01 = yStart;
        y10 = yEnd;   y11 = yEnd;
      } else if (dir === '-x') {
        y00 = yEnd;   y01 = yEnd;
        y10 = yStart; y11 = yStart;
      } else if (dir === '+z') {
        y00 = yStart; y10 = yStart;
        y01 = yEnd;   y11 = yEnd;
      } else if (dir === '-z') {
        y00 = yEnd;   y10 = yEnd;
        y01 = yStart; y11 = yStart;
      }
      const x0 = xMin, x1 = xMax, z0 = zMin, z1 = zMax;
      const positions = new Float32Array([
        // Top sloped face
        x0, y00, z0,  x0, y01, z1,  x1, y11, z1,
        x0, y00, z0,  x1, y11, z1,  x1, y10, z0,
        // Left face
        x0, 0, z0,    x0, 0, z1,    x0, y01, z1,
        x0, 0, z0,    x0, y01, z1,  x0, y00, z0,
        // Right face
        x1, 0, z1,    x1, 0, z0,    x1, y10, z0,
        x1, 0, z1,    x1, y10, z0,  x1, y11, z1,
        // Front/Back faces
        x0, 0, z0,    x1, y10, z0,  x1, 0, z0,
        x0, 0, z0,    x0, y00, z0,  x1, y10, z0,
        x0, 0, z1,    x1, 0, z1,    x1, y11, z1,
        x0, 0, z1,    x1, y11, z1,  x0, y01, z1,
      ]);
      const uvs = new Float32Array([
        0, 0,  0, 1,  1, 1,   0, 0,  1, 1,  1, 0,
        0, 0,  1, 0,  1, 1,   0, 0,  1, 1,  0, 1,
        0, 0,  1, 0,  1, 1,   0, 0,  1, 1,  0, 1,
        0, 0,  1, 1,  1, 0,   0, 0,  0, 1,  1, 1,
        0, 0,  1, 0,  1, 1,   0, 0,  1, 1,  0, 1,
      ]);
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = true;
      parent.add(mesh);

      // Raised sloped side-rail curbs along the two non-entry edges of every sloped ramp
      const railMat = style === 'steel' ? neonGoldMat : neonCyanMat;
      const midY = (yStart + yEnd) * 0.5 + 0.011;
      if (dir === '+x' || dir === '-x') {
        const slopeAngle = Math.atan2(yEnd - yStart, Math.max(1e-4, w)) * (dir === '+x' ? 1 : -1);
        const railLen = Math.hypot(w, yEnd - yStart);
        for (const zEdge of [zMin + 0.009, zMax - 0.009]) {
          const sRail = new THREE.Mesh(getRoundedBoxGeo(railLen, 0.020, 0.016, 0.004, 2), railMat);
          sRail.position.set(cx, midY, zEdge);
          sRail.rotation.z = slopeAngle;
          parent.add(sRail);
        }
      } else if (dir === '+z' || dir === '-z') {
        const slopeAngle = Math.atan2(yEnd - yStart, Math.max(1e-4, d)) * (dir === '+z' ? -1 : 1);
        const railLen = Math.hypot(d, yEnd - yStart);
        for (const xEdge of [xMin + 0.009, xMax - 0.009]) {
          const sRail = new THREE.Mesh(getRoundedBoxGeo(0.016, 0.020, railLen, 0.004, 2), railMat);
          sRail.position.set(xEdge, midY, cz);
          sRail.rotation.x = slopeAngle;
          parent.add(sRail);
        }
      }
    }

    ramps.push({ xMin, xMax, zMin, zMax, yStart, yEnd, dir, color, style });
  }

  // -------------------------------------------------------------------------
  // 5. RICH TEXTURED FLOORS & ARCHITECTURAL BASEBOARDS FOR ALL 14 ROOMS
  // -------------------------------------------------------------------------
  for (const r of ROOM_LIST) {
    const rw = r.xMax - r.xMin;
    const rd = r.zMax - r.zMin;
    const cx = (r.xMin + r.xMax) * 0.5;
    const cz = (r.zMin + r.zMax) * 0.5;

    let fMap = tex.hardwoodColorTex;
    let fBump = tex.hardwoodBumpTex;
    let fRough = 0.42;
    let fMetal = 0.05;

    if (r.floorType === 'tile') {
      fMap = tex.ceramicTileColorTex;
      fBump = tex.ceramicTileBumpTex;
      fRough = 0.22;
      fMetal = 0.08;
    } else if (r.floorType === 'marble') {
      fMap = tex.marbleColorTex;
      fBump = tex.ceramicTileBumpTex;
      fRough = 0.16;
      fMetal = 0.08;
    } else if (r.floorType === 'walnut') {
      fMap = tex.walnutColorTex;
      fBump = tex.walnutBumpTex;
      fRough = 0.36;
    } else if (r.floorType === 'velvetDark' || r.floorType === 'carpetCrimson' || r.floorType === 'gymRubber') {
      fMap = null;
      fBump = tex.fabricWeaveBumpTex;
      fRough = 0.82;
    }

    const fMat = new THREE.MeshStandardMaterial({
      color: r.floorTint,
      map: fMap,
      bumpMap: fBump,
      bumpScale: 0.0035,
      roughness: fRough,
      metalness: fMetal,
      envMapIntensity: 0.75,
    });
    const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(rw, rd), fMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(cx, 0.0, cz);
    floorMesh.frustumCulled = true;
    houseGroup.add(floorMesh);

    // Subtle warm/accent ambient light pool in the center of each room
    addGlowPool(cx, 0.0015, cz, rw * 0.78, rd * 0.78, r.ledHex, 0.18);
  }

  // -------------------------------------------------------------------------
  // 6. PERIMETER WALLS, WAINSCOTING MOLDING, WINDOWS & ARCHED DOORWAYS
  // -------------------------------------------------------------------------
  const wallH = 0.88;
  const wallT = 0.08;
  const doorW = 0.92;

  function addArchitecturalWallSegment(w, h, d, x, y, z, addCol = true) {
    // Upper textured wall body
    const m = new THREE.Mesh(getRoundedBoxGeo(w, h, d, 0.008, 2), wallMat);
    m.position.set(x, y, z);
    m.frustumCulled = true;
    houseGroup.add(m);

    // Sculpted lower baseboard & crown molding trim
    const baseH = 0.065;
    const base = new THREE.Mesh(
      getRoundedBoxGeo(w + 0.012, baseH, d + 0.012, 0.005, 2),
      wainscoatMat
    );
    base.position.set(x, baseH * 0.5, z);
    base.frustumCulled = true;
    houseGroup.add(base);

    const crown = new THREE.Mesh(
      getRoundedBoxGeo(w + 0.014, 0.038, d + 0.014, 0.005, 2),
      wainscoatMat
    );
    crown.position.set(x, h - 0.019, z);
    crown.frustumCulled = true;
    houseGroup.add(crown);

    if (addCol) {
      registerCollider(x, z, w, d, y + h * 0.5);
    }
  }

  // Outer perimeter boundary walls: X in [-3.6, 6.0], Z in [-3.6, 6.0]
  addArchitecturalWallSegment(9.6 + wallT, wallH, wallT, 1.2, wallH * 0.5, -3.6, true); // North
  addArchitecturalWallSegment(9.6 + wallT, wallH, wallT, 1.2, wallH * 0.5, 6.0, true);  // South
  addArchitecturalWallSegment(wallT, wallH, 9.6 + wallT, -3.6, wallH * 0.5, 1.2, true); // West
  addArchitecturalWallSegment(wallT, wallH, 9.6 + wallT, 6.0, wallH * 0.5, 1.2, true);  // East

  // Add Backlit Windows with Pleated Curtains along the Perimeter Walls!
  addWindowWithPleatedCurtains(-2.4, 0.48, -3.54, 0, 1.05, 0.48);             // Living Room North Window
  addWindowWithPleatedCurtains(2.4, 0.48, -3.54, 0, 1.05, 0.48);              // Dining Hall North Window
  addWindowWithPleatedCurtains(4.8, 0.48, -3.54, 0, 1.15, 0.50);              // Sunroom Pool North Window
  addWindowWithPleatedCurtains(-3.54, 0.48, 0.0, Math.PI / 2, 1.05, 0.48);    // Master Bedroom West Window
  addWindowWithPleatedCurtains(-3.54, 0.48, 4.8, Math.PI / 2, 1.05, 0.48);    // Library Study West Window

  const signTexCache = new Map();
  function createDoorwaySignTexture(text, accentColor = '#00e5ff') {
    const key = `${text}_${accentColor}`;
    if (signTexCache.has(key)) return signTexCache.get(key);
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0c111d';
    ctx.fillRect(0, 0, 256, 64);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(3, 3, 250, 58);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Orbitron", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 34);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    signTexCache.set(key, t);
    return t;
  }

  function addPartitionWithDoor(axis, fixedCoord, startCoord, endCoord, labelA, labelB, accent = '#00e5ff') {
    const totalLen = endCoord - startCoord;
    const mid = (startCoord + endCoord) * 0.5;
    const segLen = (totalLen - doorW) * 0.5;
    const c1 = startCoord + segLen * 0.5;
    const c2 = endCoord - segLen * 0.5;
    const lintelH = 0.22;
    const lintelY = wallH - lintelH * 0.5;

    doorways.push({
      axis,
      fixedCoord,
      startCoord,
      endCoord,
      doorMin: mid - doorW * 0.5,
      doorMax: mid + doorW * 0.5,
      accent,
    });

    if (axis === 'x') {
      if (segLen > 0.04) {
        addArchitecturalWallSegment(segLen, wallH, wallT, c1, wallH * 0.5, fixedCoord, true);
        addArchitecturalWallSegment(segLen, wallH, wallT, c2, wallH * 0.5, fixedCoord, true);
      }
      // Sculpted Doorway Archway Casing + Overhead Lintel
      addRoundedPart(houseGroup, doorW + 0.06, lintelH, wallT + 0.016, 0.01, mid, lintelY, fixedCoord, wainscoatMat, false);

      if (labelA) {
        const sMatA = new THREE.MeshBasicMaterial({ map: createDoorwaySignTexture(labelA, accent) });
        const sMeshA = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.16), sMatA);
        sMeshA.position.set(mid, lintelY, fixedCoord + wallT * 0.5 + 0.012);
        sMeshA.frustumCulled = true;
        houseGroup.add(sMeshA);
      }
      if (labelB) {
        const sMatB = new THREE.MeshBasicMaterial({ map: createDoorwaySignTexture(labelB, accent) });
        const sMeshB = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.16), sMatB);
        sMeshB.rotation.y = Math.PI;
        sMeshB.position.set(mid, lintelY, fixedCoord - wallT * 0.5 - 0.012);
        sMeshB.frustumCulled = true;
        houseGroup.add(sMeshB);
      }
    } else {
      if (segLen > 0.04) {
        addArchitecturalWallSegment(wallT, wallH, segLen, fixedCoord, wallH * 0.5, c1, true);
        addArchitecturalWallSegment(wallT, wallH, segLen, fixedCoord, wallH * 0.5, c2, true);
      }
      addRoundedPart(houseGroup, wallT + 0.016, lintelH, doorW + 0.06, 0.01, fixedCoord, lintelY, mid, wainscoatMat, false);

      if (labelA) {
        const sMatA = new THREE.MeshBasicMaterial({ map: createDoorwaySignTexture(labelA, accent) });
        const sMeshA = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.16), sMatA);
        sMeshA.rotation.y = Math.PI / 2;
        sMeshA.position.set(fixedCoord + wallT * 0.5 + 0.012, lintelY, mid);
        sMeshA.frustumCulled = true;
        houseGroup.add(sMeshA);
      }
      if (labelB) {
        const sMatB = new THREE.MeshBasicMaterial({ map: createDoorwaySignTexture(labelB, accent) });
        const sMeshB = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.16), sMatB);
        sMeshB.rotation.y = -Math.PI / 2;
        sMeshB.position.set(fixedCoord - wallT * 0.5 - 0.012, lintelY, mid);
        sMeshB.frustumCulled = true;
        houseGroup.add(sMeshB);
      }
    }
  }

  // Horizontal East-West Partition Walls
  addPartitionWithDoor('x', -1.2, -3.6, -1.2, '03 BEDROOM', '01 LIVING ROOM', '#ff9e44');
  addPartitionWithDoor('x', -1.2, -1.2, 1.2, '12 CENTRAL HALL', '02 KITCHEN', '#00e5ff');
  addPartitionWithDoor('x', -1.2, 1.2, 3.6, '12 CENTRAL HALL', '05 DINING HALL', '#ffd27d');
  addPartitionWithDoor('x', -1.2, 3.6, 6.0, '14 PATIO DECK', '13 INDOOR POOL', '#24e5ff');

  addPartitionWithDoor('x', 1.2, -3.6, -1.2, '04 ARCADE ROOM', '03 BEDROOM', '#ff2a85');
  addPartitionWithDoor('x', 1.2, -1.2, 1.2, '06 TOY ROOM', '12 CENTRAL HALL', '#ff5252');
  addPartitionWithDoor('x', 1.2, 1.2, 3.6, '07 HOME THEATER', '12 CENTRAL HALL', '#ff4081');
  addPartitionWithDoor('x', 1.2, 3.6, 6.0, '10 BATHROOM', '14 PATIO DECK', '#40c4ff');

  addPartitionWithDoor('x', 3.6, -3.6, -1.2, '09 LIBRARY', '04 ARCADE ROOM', '#ffab40');
  addPartitionWithDoor('x', 3.6, -1.2, 1.2, '08 INDOOR GYM', '06 TOY ROOM', '#69f0ae');
  addPartitionWithDoor('x', 3.6, 1.2, 3.6, '11 GARAGE', '07 HOME THEATER', '#ff6e40');
  addPartitionWithDoor('x', 3.6, 3.6, 6.0, '11 GARAGE', '10 BATHROOM', '#ff6e40');

  // Vertical North-South Partition Walls
  addPartitionWithDoor('z', -1.2, -3.6, -1.2, '02 KITCHEN', '01 LIVING ROOM', '#00e5ff');
  addPartitionWithDoor('z', -1.2, -1.2, 1.2, '12 CENTRAL HALL', '03 BEDROOM', '#b388ff');
  addPartitionWithDoor('z', -1.2, 1.2, 3.6, '06 TOY ROOM', '04 ARCADE ROOM', '#ff2a85');
  addPartitionWithDoor('z', -1.2, 3.6, 6.0, '08 INDOOR GYM', '09 LIBRARY', '#69f0ae');

  addPartitionWithDoor('z', 1.2, -3.6, -1.2, '05 DINING HALL', '02 KITCHEN', '#ffd27d');
  addPartitionWithDoor('z', 1.2, 1.2, 3.6, '07 HOME THEATER', '06 TOY ROOM', '#ff4081');
  addPartitionWithDoor('z', 1.2, 3.6, 6.0, '11 GARAGE', '08 INDOOR GYM', '#ff6e40');

  addPartitionWithDoor('z', 3.6, -3.6, -1.2, '13 INDOOR POOL', '05 DINING HALL', '#24e5ff');
  addPartitionWithDoor('z', 3.6, -1.2, 1.2, '14 PATIO DECK', '12 CENTRAL HALL', '#4cd964');
  addPartitionWithDoor('z', 3.6, 1.2, 3.6, '10 BATHROOM', '07 HOME THEATER', '#40c4ff');

  // -------------------------------------------------------------------------
  // 7. POPULATE ALL 14 ROOMS WITH MULTI-PART SCULPTED 3D FURNITURE & RAMPS
  // -------------------------------------------------------------------------

  // =========================================================================
  // ROOM 1: GIANT LIVING ROOM (x: [-3.6, -1.2], z: [-3.6, -1.2])
  // =========================================================================
  {
    // Woven Designer Area Rug under Coffee Table & Sofa
    const rugMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.wovenRugLivingTex,
      bumpMap: tex.fabricWeaveBumpTex,
      bumpScale: 0.004,
      roughness: 0.85,
    });
    const rug = new THREE.Mesh(getRoundedBoxGeo(1.72, 0.008, 1.42, 0.003, 2), rugMat);
    rug.position.set(-2.4, 0.004, -2.55);
    houseGroup.add(rug);

    // Tufted Plush Velvet Sofa with 3 Separate Rounded Seat Cushions, 3 Back Bolsters,
    // Rolled Armrests, Throw Pillows, Under-Sofa Warm LED Strip, and Drive-Under Brass Legs!
    const sofaX = -2.4;
    const sofaZ = -3.15;
    addRoundedPart(houseGroup, 1.32, 0.055, 0.52, 0.022, sofaX, 0.165, sofaZ, velvetNavyMat, false);
    // Under-sofa warm ambient LED strip
    addRoundedPart(houseGroup, 1.24, 0.012, 0.016, 0.004, sofaX, 0.135, sofaZ + 0.22, neonGoldMat, false);

    // 3 Individual Plush Seat Cushions + 3 Tufted Back Cushions
    for (let i = -1; i <= 1; i++) {
      const cx = sofaX + i * 0.39;
      addRoundedPart(houseGroup, 0.37, 0.068, 0.44, 0.025, cx, 0.215, sofaZ + 0.02, velvetNavyMat, false);
      addRoundedPart(houseGroup, 0.37, 0.18, 0.12, 0.032, cx, 0.31, sofaZ - 0.16, velvetNavyMat, false);
    }
    // Sculpted Rolled Armrests (Left & Right)
    for (const side of [-1, 1]) {
      addRoundedPart(houseGroup, 0.11, 0.16, 0.52, 0.038, sofaX + side * 0.62, 0.24, sofaZ, velvetNavyMat, false);
      // Angled Velvet Throw Pillow
      const pillow = new THREE.Mesh(getRoundedBoxGeo(0.14, 0.14, 0.055, 0.024, 3), side === -1 ? velvetCreamMat : velvetBlushMat);
      pillow.position.set(sofaX + side * 0.48, 0.28, sofaZ - 0.06);
      pillow.rotation.set(0.22, side * -0.35, side * 0.18);
      houseGroup.add(pillow);
    }
    // 4 Tapered Brass Sofa Legs (Y = 0.0..0.14m so the RC car drives cleanly underneath!)
    for (const [lx, lz] of [[-2.96, -3.34], [-1.84, -3.34], [-2.96, -2.96], [-1.84, -2.96]]) {
      pushLegInstance(lx, 0.07, lz, 0.028, 0.14, 0xe5b869, true);
    }

    // Glass & Walnut Coffee Table with Magazines, Remote Control & Woven Carpet Ramps
    addRoundedPart(houseGroup, 0.66, 0.022, 0.44, 0.008, -2.4, 0.138, -2.35, darkWalnutPBRMat, false);
    const glassTop = new THREE.Mesh(getRoundedBoxGeo(0.60, 0.012, 0.38, 0.004, 2), temperedGlassMat);
    glassTop.position.set(-2.4, 0.152, -2.35);
    houseGroup.add(glassTop);

    // Decorative Coffee Table Books & TV Remote on top
    addRoundedPart(houseGroup, 0.14, 0.018, 0.10, 0.004, -2.52, 0.162, -2.24, velvetCrimsonMat, false);
    addRoundedPart(houseGroup, 0.09, 0.010, 0.028, 0.003, -2.26, 0.160, -2.44, matteBlackMetalMat, false);

    for (const [lx, lz] of [[-2.68, -2.52], [-2.12, -2.52], [-2.68, -2.18], [-2.12, -2.18]]) {
      pushLegInstance(lx, 0.068, lz, 0.022, 0.136, 0x442817, true);
    }
    addDrivingRamp(houseGroup, { xMin: -2.72, xMax: -2.08, zMin: -2.56, zMax: -2.14, yStart: 0.15, yEnd: 0.15, dir: 'flat', color: 0xa67446, style: 'wood' });
    addDrivingRamp(houseGroup, { xMin: -3.18, xMax: -2.72, zMin: -2.52, zMax: -2.18, yStart: 0.0, yEnd: 0.15, dir: '+x', color: 0xc84b38, style: 'carpet' });
    addDrivingRamp(houseGroup, { xMin: -2.08, xMax: -1.62, zMin: -2.52, zMax: -2.18, yStart: 0.0, yEnd: 0.15, dir: '-x', color: 0xc84b38, style: 'carpet' });

    // Fluted Walnut Media Console, Dolby Soundbar & 65" OLED Flat-Screen TV against West Wall
    addRoundedPart(houseGroup, 0.24, 0.18, 1.02, 0.016, -3.40, 0.095, -2.35, darkWalnutPBRMat, true);
    // Soundbar + Subwoofer
    addRoundedPart(houseGroup, 0.06, 0.036, 0.56, 0.012, -3.34, 0.205, -2.35, matteBlackMetalMat, false);
    // Thin-Bezel 65" OLED TV + Ambient Backlight Glow
    addRoundedPart(houseGroup, 0.028, 0.44, 0.92, 0.008, -3.46, 0.44, -2.35, matteBlackMetalMat, false);
    const oledScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.89, 0.41), tvScreenMat);
    oledScreen.rotation.y = Math.PI / 2;
    oledScreen.position.set(-3.444, 0.44, -2.35);
    houseGroup.add(oledScreen);
    addGlowPool(-3.15, 0.004, -2.35, 0.85, 1.15, 0x00e5ff, 0.32);

    // Living Room Floor Lamp & Potted Monstera
    addWarmDomeLamp(-3.32, 0.0, -3.28, 2.1, 0.6);
    addSculptedPottedPlant(-1.52, -3.28, 1.05);
  }

  // =========================================================================
  // ROOM 2: HUGE MODERN KITCHEN (x: [-1.2, 1.2], z: [-3.6, -1.2])
  // =========================================================================
  {
    // North Wall Lower Shaker Cabinets + Polished Calacatta Marble Countertop
    addRoundedPart(houseGroup, 1.48, 0.26, 0.44, 0.012, -0.35, 0.13, -3.32, velvetNavyMat, true);
    addRoundedPart(houseGroup, 1.52, 0.032, 0.47, 0.008, -0.35, 0.275, -3.31, calacattaMarblePBRMat, false);

    // Upper Cabinets with Recessed Under-Cabinet Warm LED Lighting + Digital Microwave
    addRoundedPart(houseGroup, 1.46, 0.24, 0.28, 0.012, -0.35, 0.64, -3.38, wainscoatMat, false);
    addRoundedPart(houseGroup, 1.40, 0.012, 0.02, 0.004, -0.35, 0.515, -3.28, neonGoldMat, false);

    // Cabinet Handles (InstancedMesh)
    for (const hx of [-0.92, -0.62, -0.32, -0.02, 0.26]) {
      pushHandleInstance(hx, 0.20, -3.09, 0.045, 0.01, 0.014, 0, 0xe5b869);
      pushHandleInstance(hx, 0.56, -3.23, 0.01, 0.055, 0.014, 0, 0xe5b869);
    }

    // 5-Burner Gas Stove with Cast-Iron Grates, Glowing Blue Flame Rings & Front Metallic Knobs
    const stoveX = -0.68;
    const stoveZ = -3.30;
    addRoundedPart(houseGroup, 0.46, 0.016, 0.34, 0.005, stoveX, 0.295, stoveZ, brushedSteelPBRMat, false);
    for (const [bx, bz] of [
      [-0.13, -0.08], [0.13, -0.08], [0.0, 0.0], [-0.13, 0.08], [0.13, 0.08]
    ]) {
      const burnerRing = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.005, 8, 16), neonCyanMat);
      burnerRing.rotation.x = Math.PI / 2;
      burnerRing.position.set(stoveX + bx, 0.306, stoveZ + bz);
      houseGroup.add(burnerRing);
      const grate = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.012, 8), matteBlackMetalMat);
      grate.position.set(stoveX + bx, 0.31, stoveZ + bz);
      houseGroup.add(grate);
    }
    // 5 Front Stove Control Knobs
    for (let k = -2; k <= 2; k++) {
      const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.016, 10), chromePBRMat);
      knob.rotation.x = Math.PI / 2;
      knob.position.set(stoveX + k * 0.075, 0.245, -3.09);
      houseGroup.add(knob);
    }

    // Undermount Sink Basin + Curved Chrome Gooseneck Faucet (TubeGeometry)
    const sinkX = 0.05;
    const sinkZ = -3.30;
    addRoundedPart(houseGroup, 0.36, 0.014, 0.26, 0.006, sinkX, 0.292, sinkZ, chromePBRMat, false);
    const faucetCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sinkX, 0.29, sinkZ - 0.12),
      new THREE.Vector3(sinkX, 0.41, sinkZ - 0.12),
      new THREE.Vector3(sinkX, 0.44, sinkZ - 0.04),
      new THREE.Vector3(sinkX, 0.39, sinkZ - 0.02),
    ]);
    const faucet = new THREE.Mesh(new THREE.TubeGeometry(faucetCurve, 14, 0.009, 10, false), chromePBRMat);
    houseGroup.add(faucet);

    // Double-Door Brushed Stainless Steel Refrigerator with Ice/Water Dispenser & Long Tubular Handles
    const fridgeX = 0.78;
    const fridgeZ = -3.30;
    addRoundedPart(houseGroup, 0.50, 0.62, 0.48, 0.018, fridgeX, 0.31, fridgeZ, brushedSteelPBRMat, true);
    // Left & Right French Doors
    addRoundedPart(houseGroup, 0.235, 0.38, 0.024, 0.008, fridgeX - 0.122, 0.41, fridgeZ + 0.24, brushedSteelPBRMat, false);
    addRoundedPart(houseGroup, 0.235, 0.38, 0.024, 0.008, fridgeX + 0.122, 0.41, fridgeZ + 0.24, brushedSteelPBRMat, false);
    // Lower Freezer Drawer
    addRoundedPart(houseGroup, 0.48, 0.19, 0.024, 0.008, fridgeX, 0.11, fridgeZ + 0.24, brushedSteelPBRMat, false);
    // Recessed Glowing Ice & Water Dispenser
    addRoundedPart(houseGroup, 0.085, 0.11, 0.018, 0.004, fridgeX - 0.125, 0.40, fridgeZ + 0.25, matteBlackMetalMat, false);
    addRoundedPart(houseGroup, 0.065, 0.025, 0.02, 0.003, fridgeX - 0.125, 0.435, fridgeZ + 0.252, neonCyanMat, false);
    // Tubular Stainless Door Handles
    pushHandleInstance(fridgeX - 0.022, 0.41, fridgeZ + 0.265, 0.012, 0.26, 0.018, 0, 0xf4f8ff);
    pushHandleInstance(fridgeX + 0.022, 0.41, fridgeZ + 0.265, 0.012, 0.26, 0.018, 0, 0xf4f8ff);
    pushHandleInstance(fridgeX, 0.18, fridgeZ + 0.265, 0.36, 0.012, 0.018, 0, 0xf4f8ff);

    // Central Waterfall Calacatta Marble Kitchen Island with Drive-Under Arch, Barstools & Ramp
    addRoundedPart(houseGroup, 0.96, 0.036, 0.54, 0.012, 0.0, 0.182, -2.35, calacattaMarblePBRMat, false);
    addRoundedPart(houseGroup, 0.16, 0.165, 0.50, 0.012, -0.39, 0.082, -2.35, velvetNavyMat, true);
    addRoundedPart(houseGroup, 0.16, 0.165, 0.50, 0.012, 0.39, 0.082, -2.35, velvetNavyMat, true);
    // Glowing cyan under-island LED strip
    addRoundedPart(houseGroup, 0.88, 0.012, 0.016, 0.004, 0.0, 0.162, -2.10, neonCyanMat, false);

    // 2 Sculpted Swivel Barstools in front of the Kitchen Island
    for (const sx of [-0.18, 0.18]) {
      const stoolPed = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.055, 0.13, 14), chromePBRMat);
      stoolPed.position.set(sx, 0.065, -1.96);
      houseGroup.add(stoolPed);
      const footRing = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.005, 8, 16), chromePBRMat);
      footRing.rotation.x = Math.PI / 2;
      footRing.position.set(sx, 0.055, -1.96);
      houseGroup.add(footRing);
      const stoolSeat = new THREE.Mesh(getRoundedBoxGeo(0.13, 0.035, 0.13, 0.016, 3), velvetCreamMat);
      stoolSeat.position.set(sx, 0.14, -1.96);
      houseGroup.add(stoolSeat);
      registerCollider(sx, -1.96, 0.13, 0.13, 0.16);
    }

    addDrivingRamp(houseGroup, { xMin: -0.48, xMax: 0.48, zMin: -2.61, zMax: -2.09, yStart: 0.20, yEnd: 0.20, dir: 'flat', color: 0xf2f4f8, style: 'wood' });
    addDrivingRamp(houseGroup, { xMin: -0.92, xMax: -0.48, zMin: -2.52, zMax: -2.18, yStart: 0.0, yEnd: 0.20, dir: '+x', color: 0x00c8ff, style: 'steel' });
  }

  // =========================================================================
  // ROOM 5: DINING HALL (x: [1.2, 3.6], z: [-3.6, -1.2])
  // =========================================================================
  {
    // Sculpted Walnut Banquet Dining Table with Beveled Edge (drive-under clearance Y = 0.22m)
    addRoundedPart(houseGroup, 1.38, 0.038, 0.74, 0.014, 2.4, 0.22, -2.4, darkWalnutPBRMat, false);
    for (const [lx, lz] of [[1.78, -2.70], [3.02, -2.70], [1.78, -2.10], [3.02, -2.10]]) {
      pushLegInstance(lx, 0.11, lz, 0.032, 0.22, 0x442817, true);
    }

    // Sculpted Ceramic Centerpiece Bowl + Golden Candlesticks on Dining Table
    const bowlPts = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.05, 0.0),
      new THREE.Vector2(0.11, 0.045),
      new THREE.Vector2(0.095, 0.055),
    ];
    const centerpiece = new THREE.Mesh(new THREE.LatheGeometry(bowlPts, 16), brushedBrassPBRMat);
    centerpiece.position.set(2.4, 0.239, -2.4);
    houseGroup.add(centerpiece);

    // 6 Sculpted Curved Velvet Dining Chairs with Tapered Brass Legs
    for (const cx of [2.0, 2.4, 2.8]) {
      for (const [cz, dirZ] of [[-2.92, 1], [-1.88, -1]]) {
        // Seat cushion
        addRoundedPart(houseGroup, 0.19, 0.032, 0.19, 0.012, cx, 0.125, cz, velvetCreamMat, true);
        // Curved backrest
        addRoundedPart(houseGroup, 0.19, 0.14, 0.032, 0.012, cx, 0.20, cz - dirZ * 0.08, velvetCreamMat, false);
        // 4 instanced brass chair legs
        for (const [ox, oz] of [[-0.07, -0.07], [0.07, -0.07], [-0.07, 0.07], [0.07, 0.07]]) {
          pushLegInstance(cx + ox, 0.055, cz + oz, 0.012, 0.11, 0xe5b869, false);
        }
      }
    }

    // Overhead Multi-Ring Glowing Golden Chandelier
    const chandRing1 = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.012, 10, 24), neonGoldMat);
    chandRing1.rotation.x = Math.PI / 2;
    chandRing1.position.set(2.4, 0.72, -2.4);
    houseGroup.add(chandRing1);
    const chandRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.010, 10, 20), warmLampBulbMat);
    chandRing2.rotation.x = Math.PI / 2;
    chandRing2.position.set(2.4, 0.65, -2.4);
    houseGroup.add(chandRing2);
  }

  // =========================================================================
  // ROOM 13: INDOOR POOL / SUNROOM AREA (x: [3.6, 6.0], z: [-3.6, -1.2])
  // =========================================================================
  {
    // Recessed Marble-Coping Pool Border & Glowing Caustics Water Surface
    addRoundedPart(houseGroup, 1.56, 0.024, 1.44, 0.008, 4.8, 0.012, -2.4, calacattaMarblePBRMat, false);
    const poolWaterMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.poolCausticsTex,
      emissive: new THREE.Color(0x00c8ff),
      emissiveMap: tex.poolCausticsTex,
      emissiveIntensity: 0.75,
      roughness: 0.08,
      metalness: 0.15,
      transparent: true,
      opacity: 0.88,
    });
    const poolWater = new THREE.Mesh(new THREE.PlaneGeometry(1.42, 1.30), poolWaterMat);
    poolWater.rotation.x = -Math.PI / 2;
    poolWater.position.set(4.8, 0.025, -2.4);
    houseGroup.add(poolWater);

    // Chrome Pool Handrail Ladder (TubeGeometry)
    for (const sideZ of [-2.82, -2.68]) {
      const railCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(4.12, 0.02, sideZ),
        new THREE.Vector3(4.12, 0.16, sideZ),
        new THREE.Vector3(4.02, 0.18, sideZ),
        new THREE.Vector3(4.02, 0.02, sideZ),
      ]);
      const rail = new THREE.Mesh(new THREE.TubeGeometry(railCurve, 10, 0.008, 8, false), chromePBRMat);
      houseGroup.add(rail);
    }

    // Slatted Teak & Brass Ruler Bridge spanning West-to-East across the pool
    addDrivingRamp(houseGroup, { xMin: 3.95, xMax: 4.35, zMin: -2.62, zMax: -2.18, yStart: 0.0, yEnd: 0.12, dir: '+x', color: 0xf0be3c, style: 'wood' });
    addDrivingRamp(houseGroup, { xMin: 4.35, xMax: 5.25, zMin: -2.62, zMax: -2.18, yStart: 0.12, yEnd: 0.12, dir: 'flat', color: 0xf0be3c, style: 'wood' });
    addDrivingRamp(houseGroup, { xMin: 5.25, xMax: 5.65, zMin: -2.62, zMax: -2.18, yStart: 0.0, yEnd: 0.12, dir: '-x', color: 0xf0be3c, style: 'wood' });

    // Sculpted Curved Poolside Chaise Lounger with Reclining Backrest & Head Pillow
    addRoundedPart(houseGroup, 0.42, 0.045, 0.24, 0.015, 4.72, 0.05, -3.28, velvetCreamMat, true);
    const loungerBack = new THREE.Mesh(getRoundedBoxGeo(0.22, 0.042, 0.24, 0.014, 3), velvetCreamMat);
    loungerBack.position.set(4.98, 0.105, -3.28);
    loungerBack.rotation.z = -0.48;
    houseGroup.add(loungerBack);
    addSculptedPottedPlant(5.68, -3.26, 1.15);
  }

  // =========================================================================
  // ROOM 3: MASTER BEDROOM (x: [-3.6, -1.2], z: [-1.2, 1.2])
  // =========================================================================
  {
    // King Bed with Tufted Upholstered Headboard, Layered Folded Duvet, Plump Pillows,
    // Under-Bed Warm LED Glow, and Sloped Blanket Ramp!
    addRoundedPart(houseGroup, 1.18, 0.075, 1.00, 0.02, -2.65, 0.045, 0.0, darkWalnutPBRMat, false);
    // Plush Mattress + Folded Quilt Duvet
    addRoundedPart(houseGroup, 1.12, 0.085, 0.94, 0.032, -2.64, 0.118, 0.0, velvetCreamMat, false);
    addRoundedPart(houseGroup, 0.76, 0.035, 0.96, 0.018, -2.44, 0.15, 0.0, velvetSageMat, false);
    // Under-bed warm amber LED strip
    addRoundedPart(houseGroup, 1.10, 0.012, 0.92, 0.004, -2.64, 0.012, 0.0, neonGoldMat, false);

    // Tufted Upholstered Headboard (6 vertical velvet panels + walnut frame)
    addRoundedPart(houseGroup, 0.11, 0.48, 1.04, 0.02, -3.22, 0.24, 0.0, darkWalnutPBRMat, true);
    for (let p = 0; p < 4; p++) {
      const pz = -0.34 + p * 0.226;
      addRoundedPart(houseGroup, 0.045, 0.36, 0.20, 0.016, -3.16, 0.26, pz, velvetCreamMat, false);
    }
    // 4 Plump Sculpted Pillows
    for (const pz of [-0.24, 0.24]) {
      const p1 = new THREE.Mesh(getRoundedBoxGeo(0.16, 0.075, 0.34, 0.03, 3), velvetCreamMat);
      p1.position.set(-3.02, 0.19, pz);
      p1.rotation.z = -0.25;
      houseGroup.add(p1);
      const p2 = new THREE.Mesh(getRoundedBoxGeo(0.13, 0.065, 0.26, 0.025, 3), velvetBlushMat);
      p2.position.set(-2.90, 0.185, pz);
      p2.rotation.z = -0.32;
      houseGroup.add(p2);
    }

    // Driveable Mattress Top & Sloped Blanket Ramp
    addDrivingRamp(houseGroup, { xMin: -3.20, xMax: -2.08, zMin: -0.48, zMax: 0.48, yStart: 0.16, yEnd: 0.16, dir: 'flat', color: 0xf4f7fc, style: 'carpet' });
    addDrivingRamp(houseGroup, { xMin: -2.08, xMax: -1.58, zMin: -0.36, zMax: 0.36, yStart: 0.0, yEnd: 0.16, dir: '-x', color: 0xb388ff, style: 'carpet' });

    // 2 Bedside Nightstands with Warm Dome Lamps
    for (const nz of [-0.68, 0.68]) {
      addRoundedPart(houseGroup, 0.26, 0.18, 0.26, 0.014, -3.14, 0.09, nz, darkWalnutPBRMat, true);
      pushHandleInstance(-3.00, 0.11, nz, 0.01, 0.014, 0.06, 0, 0xe5b869);
      addWarmDomeLamp(-3.14, 0.18, nz, 0.92, 0);
    }

    // Fluted Walnut Wardrobe with Brass Handles along North Wall
    addRoundedPart(houseGroup, 0.68, 0.62, 0.30, 0.018, -2.55, 0.31, -0.95, darkWalnutPBRMat, true);
    addRoundedPart(houseGroup, 0.31, 0.56, 0.02, 0.006, -2.71, 0.31, -0.795, oakWoodPBRMat, false);
    addRoundedPart(houseGroup, 0.31, 0.56, 0.02, 0.006, -2.39, 0.31, -0.795, oakWoodPBRMat, false);
    pushHandleInstance(-2.58, 0.31, -0.78, 0.012, 0.18, 0.016, 0, 0xe5b869);
    pushHandleInstance(-2.52, 0.31, -0.78, 0.012, 0.18, 0.016, 0, 0xe5b869);
  }

  // =========================================================================
  // ROOM 12: GRAND CENTRAL HALLWAY (x: [-1.2, 3.6], z: [-1.2, 1.2])
  // =========================================================================
  {
    // Woven Hallway Runner Rug + Dual-Arch Stunt Bridge with Neon Trim
    const runner = new THREE.Mesh(
      getRoundedBoxGeo(3.6, 0.007, 0.86, 0.003, 2),
      new THREE.MeshStandardMaterial({ color: 0xffffff, map: tex.wovenRugLivingTex, roughness: 0.85 })
    );
    runner.position.set(1.2, 0.0035, 0.0);
    houseGroup.add(runner);

    addDrivingRamp(houseGroup, { xMin: 0.35, xMax: 0.85, zMin: -0.26, zMax: 0.26, yStart: 0.0, yEnd: 0.15, dir: '+x', color: 0xffaa22, style: 'wood' });
    addDrivingRamp(houseGroup, { xMin: 0.85, xMax: 1.55, zMin: -0.26, zMax: 0.26, yStart: 0.15, yEnd: 0.15, dir: 'flat', color: 0xffaa22, style: 'wood' });
    addDrivingRamp(houseGroup, { xMin: 1.55, xMax: 2.05, zMin: -0.26, zMax: 0.26, yStart: 0.0, yEnd: 0.15, dir: '-x', color: 0xffaa22, style: 'wood' });

    // 4 Sculpted Classical Marble Columns with Fluted Bases & Capitals
    for (const [px, pz] of [[-0.55, -0.55], [-0.55, 0.55], [2.95, -0.55], [2.95, 0.55]]) {
      const colShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.076, 0.78, 16), calacattaMarblePBRMat);
      colShaft.position.set(px, 0.39, pz);
      houseGroup.add(colShaft);
      addRoundedPart(houseGroup, 0.20, 0.055, 0.20, 0.01, px, 0.028, pz, brushedBrassPBRMat, false);
      addRoundedPart(houseGroup, 0.22, 0.06, 0.22, 0.01, px, 0.81, pz, brushedBrassPBRMat, false);
      registerCollider(px, pz, 0.16, 0.16, 0.82);
    }
    addSculptedPottedPlant(0.45, -0.82, 0.95);
    addSculptedPottedPlant(1.95, 0.82, 0.95);
  }

  // =========================================================================
  // ROOM 14: BACKYARD PATIO / GARDEN DECK (x: [3.6, 6.0], z: [-1.2, 1.2])
  // =========================================================================
  {
    // Twin Slatted Timber Stunt Ramps
    addDrivingRamp(houseGroup, { xMin: 4.35, xMax: 5.25, zMin: -0.65, zMax: -0.25, yStart: 0.0, yEnd: 0.16, dir: '+x', color: 0x32d74b, style: 'wood' });
    addDrivingRamp(houseGroup, { xMin: 4.35, xMax: 5.25, zMin: 0.25, zMax: 0.65, yStart: 0.0, yEnd: 0.16, dir: '-x', color: 0x32d74b, style: 'wood' });

    // Sculpted Round Teak Patio Table + Ribbed Market Umbrella + 4 Curved Patio Chairs
    const pTableX = 5.35;
    const pTableZ = 0.0;
    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.028, 20), oakWoodPBRMat);
    tableTop.position.set(pTableX, 0.19, pTableZ);
    houseGroup.add(tableTop);
    const umbrellaPole = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.64, 12), darkWalnutPBRMat);
    umbrellaPole.position.set(pTableX, 0.32, pTableZ);
    houseGroup.add(umbrellaPole);
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.16, 12), velvetCreamMat);
    canopy.position.set(pTableX, 0.62, pTableZ);
    houseGroup.add(canopy);
    // Warm string light bulb under umbrella
    const uLight = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 10), warmLampBulbMat);
    uLight.position.set(pTableX, 0.52, pTableZ);
    houseGroup.add(uLight);
    registerCollider(pTableX, pTableZ, 0.52, 0.52, 0.22);

    addSculptedPottedPlant(5.65, -0.82, 1.1);
    addSculptedPottedPlant(5.65, 0.82, 1.1);
  }

  // =========================================================================
  // ROOM 4: GAMING / ARCADE ROOM (x: [-3.6, -1.2], z: [1.2, 3.6])
  // =========================================================================
  {
    // Full Ultra-Detailed Gaming PC Setup (Ultrawide Monitor + Webcam + RGB Keyboard + PC Tower + Chair)
    addCompleteGamingStudyDesk(-2.22, 3.12, Math.PI, true);

    // 3 Sculpted Retro Arcade Cabinets with Angled CRT Screens, Glowing Marquees & Joystick Decks
    const arcadeMats = [neonPinkMat, neonCyanMat, neonGoldMat];
    const arcadeZList = [1.82, 2.38, 2.94];
    for (let i = 0; i < 3; i++) {
      const az = arcadeZList[i];
      const ag = new THREE.Group();
      ag.position.set(-3.30, 0, az);

      // Lower cabinet base
      addRoundedPart(ag, 0.28, 0.24, 0.30, 0.014, 0, 0.12, 0, matteBlackMetalMat, false);
      // Upper angled screen housing
      addRoundedPart(ag, 0.24, 0.24, 0.28, 0.014, -0.02, 0.34, 0, matteBlackMetalMat, false);
      // Glowing Top Marquee Header
      addRoundedPart(ag, 0.26, 0.065, 0.28, 0.01, 0.01, 0.48, 0, arcadeMats[i], false);
      // Recessed Glowing CRT Arcade Screen
      const crt = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.17), tvScreenMat);
      crt.rotation.y = Math.PI / 2;
      crt.rotation.z = 0.18;
      crt.position.set(0.105, 0.34, 0);
      ag.add(crt);
      // Control Deck with 2 Ball-Top Joysticks & Arcade Buttons
      addRoundedPart(ag, 0.12, 0.025, 0.28, 0.008, 0.10, 0.245, 0, brushedSteelPBRMat, false);
      for (const jz of [-0.06, 0.06]) {
        const stick = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), arcadeMats[i]);
        stick.position.set(0.12, 0.275, jz);
        ag.add(stick);
      }

      houseGroup.add(ag);
      registerCollider(-3.30, az, 0.30, 0.30, 0.52);
    }

    // Neon Arcade Stunt Ramp
    addDrivingRamp(houseGroup, { xMin: -2.65, xMax: -2.15, zMin: 1.85, zMax: 2.65, yStart: 0.0, yEnd: 0.16, dir: '+z', color: 0xff2a85, emissive: 0x440022, style: 'steel' });
  }

  // =========================================================================
  // ROOM 6: KIDS / TOY ROOM (x: [-1.2, 1.2], z: [1.2, 3.6])
  // =========================================================================
  {
    // Sculpted Rounded Alphabet / Building Blocks with Embossed Faces
    const blockConfigs = [
      { x: -0.65, z: 1.85, mat: velvetCrimsonMat, accent: velvetCreamMat },
      { x: 0.65, z: 1.85, mat: velvetNavyMat, accent: neonGoldMat },
    ];
    for (const bc of blockConfigs) {
      addRoundedPart(houseGroup, 0.28, 0.28, 0.28, 0.032, bc.x, 0.14, bc.z, bc.mat, true);
      addRoundedPart(houseGroup, 0.30, 0.18, 0.18, 0.016, bc.x, 0.14, bc.z, bc.accent, false);
      addRoundedPart(houseGroup, 0.18, 0.18, 0.30, 0.016, bc.x, 0.14, bc.z, bc.accent, false);
    }

    // Toy Train Multi-Arch Stunt Bridge
    addDrivingRamp(houseGroup, { xMin: -0.24, xMax: 0.24, zMin: 1.80, zMax: 2.25, yStart: 0.0, yEnd: 0.15, dir: '+z', color: 0xffca28, style: 'wood' });
    addDrivingRamp(houseGroup, { xMin: -0.24, xMax: 0.24, zMin: 2.25, zMax: 2.65, yStart: 0.15, yEnd: 0.15, dir: 'flat', color: 0xffca28, style: 'wood' });
    addDrivingRamp(houseGroup, { xMin: -0.24, xMax: 0.24, zMin: 2.65, zMax: 3.10, yStart: 0.0, yEnd: 0.15, dir: '-z', color: 0xffca28, style: 'wood' });
  }

  // =========================================================================
  // ROOM 7: HOME THEATER ROOM (x: [1.2, 3.6], z: [1.2, 3.6])
  // =========================================================================
  {
    // Giant Glowing Widescreen Cinema Projection Screen + Left/Right Tower Speakers
    addRoundedPart(houseGroup, 1.44, 0.52, 0.05, 0.012, 2.4, 0.32, 3.42, matteBlackMetalMat, false);
    const cinemaScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 0.45), tvScreenMat);
    cinemaScreen.rotation.y = Math.PI;
    cinemaScreen.position.set(2.4, 0.32, 3.392);
    houseGroup.add(cinemaScreen);

    for (const sx of [1.56, 3.24]) {
      addRoundedPart(houseGroup, 0.14, 0.46, 0.16, 0.016, sx, 0.23, 3.38, matteBlackMetalMat, true);
      for (const wy of [0.14, 0.26, 0.38]) {
        const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.025, 0.018, 12), brushedBrassPBRMat);
        cone.rotation.x = Math.PI / 2;
        cone.position.set(sx, wy, 3.295);
        houseGroup.add(cone);
      }
    }

    // 3 Plush Velvet Cinema Recliner Seats with Armrests, Headrests & Cupholders
    addRoundedPart(houseGroup, 0.98, 0.06, 0.38, 0.015, 2.4, 0.03, 2.15, darkWalnutPBRMat, true);
    for (let s = -1; s <= 1; s++) {
      const rx = 2.4 + s * 0.31;
      addRoundedPart(houseGroup, 0.27, 0.075, 0.32, 0.022, rx, 0.095, 2.15, velvetCrimsonMat, false);
      const back = new THREE.Mesh(getRoundedBoxGeo(0.26, 0.18, 0.08, 0.022, 3), velvetCrimsonMat);
      back.position.set(rx, 0.19, 2.02);
      back.rotation.x = -0.22;
      houseGroup.add(back);
    }

    // Velvet Cinema Drive-Up Stunt Ramp
    addDrivingRamp(houseGroup, { xMin: 1.45, xMax: 1.85, zMin: 1.95, zMax: 2.75, yStart: 0.0, yEnd: 0.16, dir: '+z', color: 0xb82028, style: 'carpet' });
  }

  // =========================================================================
  // ROOM 10: LUXURY BATHROOM (x: [3.6, 6.0], z: [1.2, 3.6])
  // =========================================================================
  {
    // Sculpted Freestanding Oval Soaking Bathtub + Chrome Floor Gooseneck Faucet
    const tubGroup = new THREE.Group();
    tubGroup.position.set(5.25, 0, 2.4);
    const tubOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.20, 0.25, 24), calacattaMarblePBRMat);
    tubOuter.scale.set(1.78, 1.0, 0.96);
    tubOuter.position.y = 0.125;
    tubGroup.add(tubOuter);
    const tubWater = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.02, 20), neonCyanMat);
    tubWater.scale.set(1.68, 1.0, 0.86);
    tubWater.position.y = 0.242;
    tubGroup.add(tubWater);
    houseGroup.add(tubGroup);
    registerCollider(5.25, 2.4, 0.85, 0.46, 0.25);

    // Chrome Floor-Standing Bathtub Filler Faucet (TubeGeometry)
    const tubFaucetCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(5.25, 0.0, 2.12),
      new THREE.Vector3(5.25, 0.34, 2.12),
      new THREE.Vector3(5.25, 0.37, 2.22),
      new THREE.Vector3(5.25, 0.31, 2.24),
    ]);
    const tubFaucet = new THREE.Mesh(new THREE.TubeGeometry(tubFaucetCurve, 12, 0.01, 8, false), chromePBRMat);
    houseGroup.add(tubFaucet);

    // Double Marble Vanity Sink Counter + 2 Oval Ceramic Basins + Backlit LED Mirror
    addRoundedPart(houseGroup, 0.36, 0.26, 0.96, 0.016, 5.72, 0.13, 2.4, darkWalnutPBRMat, true);
    addRoundedPart(houseGroup, 0.38, 0.03, 0.98, 0.01, 5.72, 0.27, 2.4, calacattaMarblePBRMat, false);
    for (const sz of [2.16, 2.64]) {
      const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.075, 0.055, 16), wainscoatMat);
      basin.position.set(5.70, 0.305, sz);
      houseGroup.add(basin);
      pushHandleInstance(5.53, 0.18, sz, 0.012, 0.014, 0.12, 0, 0xe5b869);
    }
    // Backlit Oval LED Vanity Mirror on East Wall
    const mirrorGlow = new THREE.Mesh(getRoundedBoxGeo(0.02, 0.36, 0.82, 0.008, 2), neonCyanMat);
    mirrorGlow.position.set(5.93, 0.54, 2.4);
    houseGroup.add(mirrorGlow);
    const mirrorGlass = new THREE.Mesh(getRoundedBoxGeo(0.025, 0.32, 0.78, 0.008, 2), chromePBRMat);
    mirrorGlass.position.set(5.92, 0.54, 2.4);
    houseGroup.add(mirrorGlass);

    // Wooden Bath-Board Stunt Ramp
    addDrivingRamp(houseGroup, { xMin: 4.25, xMax: 4.65, zMin: 2.0, zMax: 2.8, yStart: 0.0, yEnd: 0.15, dir: '+z', color: 0x40c4ff, style: 'wood' });
  }

  // =========================================================================
  // ROOM 9: LIBRARY / STUDY ROOM (x: [-3.6, -1.2], z: [3.6, 6.0])
  // =========================================================================
  {
    // Carved Walnut Floor-to-Ceiling Bookshelves + Instanced Colorful Hardcover Books!
    // West Wall Bookshelf
    addRoundedPart(houseGroup, 0.26, 0.72, 1.48, 0.016, -3.38, 0.36, 4.8, darkWalnutPBRMat, true);
    // South Wall Bookshelf
    addRoundedPart(houseGroup, 1.38, 0.72, 0.26, 0.016, -2.4, 0.36, 5.78, darkWalnutPBRMat, true);

    const bookColors = [0xa81c2e, 0x1e4d8c, 0x286b48, 0xd4882a, 0x5e3582, 0xc29138, 0x2c3e50];
    for (let shelf = 0; shelf < 4; shelf++) {
      const sy = 0.10 + shelf * 0.165;
      // Shelf plank dividers
      addRoundedPart(houseGroup, 0.24, 0.02, 1.42, 0.005, -3.36, sy, 4.8, oakWoodPBRMat, false);
      addRoundedPart(houseGroup, 1.32, 0.02, 0.24, 0.005, -2.4, sy, 5.76, oakWoodPBRMat, false);

      // Populate rows of individual books via InstancedMesh
      for (let b = 0; b < 18; b++) {
        const bz = 4.14 + b * 0.074;
        const bh = 0.10 + ((b + shelf) % 4) * 0.012;
        bookInstances.push({
          x: -3.31,
          y: sy + 0.01 + bh * 0.5,
          z: bz,
          sx: 0.14,
          sy: bh,
          sz: 0.052,
          rotY: 0,
          colorHex: bookColors[(b * 3 + shelf) % bookColors.length],
        });
      }
      for (let b = 0; b < 16; b++) {
        const bx = -3.00 + b * 0.076;
        const bh = 0.10 + ((b + shelf * 2) % 4) * 0.012;
        bookInstances.push({
          x: bx,
          y: sy + 0.01 + bh * 0.5,
          z: 5.71,
          sx: 0.052,
          sy: bh,
          sz: 0.14,
          rotY: 0,
          colorHex: bookColors[(b * 5 + shelf) % bookColors.length],
        });
      }
    }

    // Complete Sculpted Study Desk Setup (Ultrawide Monitor, Webcam, Mechanical Keyboard, Warm Dome Lamp & Velvet Chair)
    addCompleteGamingStudyDesk(-1.95, 4.02, 0, false);

    // Warm Study Floor Lamp beside Bookshelf + Sloped Leather-Bound Book Stunt Ramp
    addWarmDomeLamp(-3.18, 0.0, 3.92, 1.85, 0.3);
    addDrivingRamp(houseGroup, { xMin: -2.85, xMax: -1.95, zMin: 4.55, zMax: 5.05, yStart: 0.0, yEnd: 0.18, dir: '+x', color: 0xffab40, style: 'wood' });
  }

  // =========================================================================
  // ROOM 8: INDOOR GYM / FITNESS ROOM (x: [-1.2, 1.2], z: [3.6, 6.0])
  // =========================================================================
  {
    // 2 Sculpted Motorized Treadmill Stunt Ramps with Tubular Handrails & Glowing Console Screens
    for (const tx of [-0.47, 0.47]) {
      addDrivingRamp(houseGroup, {
        xMin: tx - 0.21,
        xMax: tx + 0.21,
        zMin: 4.55,
        zMax: 5.35,
        yStart: 0.0,
        yEnd: 0.15,
        dir: '+z',
        color: 0x28303d,
        emissive: 0x003318,
        style: 'steel',
      });
      // Treadmill Upright Frame & Glowing Console Screen at front (Z = 5.36)
      for (const side of [-0.19, 0.19]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.28, 10), matteBlackMetalMat);
        post.position.set(tx + side, 0.24, 5.34);
        houseGroup.add(post);
      }
      const consoleBox = new THREE.Mesh(getRoundedBoxGeo(0.42, 0.11, 0.08, 0.012, 2), matteBlackMetalMat);
      consoleBox.position.set(tx, 0.38, 5.34);
      consoleBox.rotation.x = -0.35;
      houseGroup.add(consoleBox);
      const consoleLed = new THREE.Mesh(getRoundedBoxGeo(0.34, 0.065, 0.02, 0.005, 2), neonGreenMat);
      consoleLed.position.set(tx, 0.385, 5.31);
      consoleLed.rotation.x = -0.35;
      houseGroup.add(consoleLed);
    }

    // Multi-Tier Steel Dumbbell Rack + Instanced Hex Dumbbells
    addRoundedPart(houseGroup, 0.96, 0.24, 0.24, 0.014, 0.0, 0.12, 5.72, matteBlackMetalMat, true);
    const dbColors = [0x00e676, 0x00e5ff, 0xffab28, 0xff2a85];
    for (let tier = 0; tier < 2; tier++) {
      for (let d = 0; d < 6; d++) {
        dumbbellInstances.push({
          x: -0.38 + d * 0.152,
          y: 0.14 + tier * 0.11,
          z: 5.72,
          rotY: 0,
          colorHex: dbColors[(d + tier) % dbColors.length],
        });
      }
    }
  }

  // =========================================================================
  // ROOM 11: GARAGE / WORKSHOP (x: [1.2, 6.0], z: [3.6, 6.0])
  // =========================================================================
  {
    // Multi-Drawer Red Mechanic Rolling Tool Chest with Chrome Drawer Pulls & Butcher-Block Top
    addRoundedPart(houseGroup, 0.88, 0.34, 0.34, 0.016, 2.2, 0.17, 5.72, velvetCrimsonMat, true);
    addRoundedPart(houseGroup, 0.90, 0.028, 0.36, 0.008, 2.2, 0.35, 5.72, oakWoodPBRMat, false);
    for (let r = 0; r < 4; r++) {
      for (const cx of [1.98, 2.42]) {
        pushHandleInstance(cx, 0.07 + r * 0.07, 5.54, 0.34, 0.012, 0.016, 0, 0xf4f8ff);
      }
    }

    // 2 Stacks of Sculpted Treaded Rubber Spare Tires with Chrome Alloy Rims (TorusGeometry)
    for (const tx of [4.85, 5.35]) {
      for (let t = 0; t < 3; t++) {
        const ty = 0.055 + t * 0.095;
        const tire = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.052, 12, 20), matteBlackMetalMat);
        tire.rotation.x = Math.PI / 2;
        tire.position.set(tx, ty, 5.45);
        houseGroup.add(tire);
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.06, 12), chromePBRMat);
        rim.position.set(tx, ty, 5.45);
        houseGroup.add(rim);
      }
      registerCollider(tx, 5.45, 0.36, 0.36, 0.32);
    }

    // 4-Post Hydraulic Car Lift Bridge with Brushed Steel Catwalk & Entry/Exit Ramps
    addDrivingRamp(houseGroup, { xMin: 2.35, xMax: 3.05, zMin: 4.45, zMax: 5.05, yStart: 0.0, yEnd: 0.20, dir: '+x', color: 0xff6e40, style: 'steel' });
    addDrivingRamp(houseGroup, { xMin: 3.05, xMax: 4.15, zMin: 4.45, zMax: 5.05, yStart: 0.20, yEnd: 0.20, dir: 'flat', color: 0xff6e40, style: 'steel' });
    addDrivingRamp(houseGroup, { xMin: 4.15, xMax: 4.85, zMin: 4.45, zMax: 5.05, yStart: 0.0, yEnd: 0.20, dir: '-x', color: 0xff6e40, style: 'steel' });

    // 4 Hydraulic Lift Corner Steel Columns (outside the ramp track so the car drives cleanly through!)
    for (const [lx, lz] of [[3.08, 4.38], [4.12, 4.38], [3.08, 5.12], [4.12, 5.12]]) {
      addRoundedPart(houseGroup, 0.06, 0.42, 0.06, 0.008, lx, 0.21, lz, matteBlackMetalMat, true);
    }
  }

  // -------------------------------------------------------------------------
  // 8. BUILD BATCHED THREE.INSTANCEDMESH OBJECTS (1 DRAW CALL PER CATEGORY)
  // -------------------------------------------------------------------------
  const dummy = new THREE.Object3D();
  const tmpColor = new THREE.Color();

  // 8A. Tapered Furniture / Chair / Desk Legs InstancedMesh
  if (legInstances.length > 0) {
    const legGeo = new THREE.CylinderGeometry(1.0, 0.72, 1.0, 12);
    const legMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.28,
      metalness: 0.72,
      envMapIntensity: 1.2,
    });
    const legMesh = new THREE.InstancedMesh(legGeo, legMat, legInstances.length);
    legMesh.frustumCulled = false;
    for (let i = 0; i < legInstances.length; i++) {
      const it = legInstances[i];
      dummy.position.set(it.x, it.y, it.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(it.sx, it.sy, it.sz);
      dummy.updateMatrix();
      legMesh.setMatrixAt(i, dummy.matrix);
      legMesh.setColorAt(i, tmpColor.setHex(it.colorHex));
    }
    legMesh.instanceMatrix.needsUpdate = true;
    if (legMesh.instanceColor) legMesh.instanceColor.needsUpdate = true;
    houseGroup.add(legMesh);
  }

  // 8B. Brushed Metal & Brass Cabinet/Appliance Handles InstancedMesh
  if (handleInstances.length > 0) {
    const handleGeo = getRoundedBoxGeo(1.0, 1.0, 1.0, 0.2, 2);
    const handleMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.18,
      metalness: 0.92,
      envMapIntensity: 1.4,
    });
    const handleMesh = new THREE.InstancedMesh(handleGeo, handleMat, handleInstances.length);
    handleMesh.frustumCulled = false;
    for (let i = 0; i < handleInstances.length; i++) {
      const it = handleInstances[i];
      dummy.position.set(it.x, it.y, it.z);
      dummy.rotation.set(0, it.rotY || 0, 0);
      dummy.scale.set(it.sx, it.sy, it.sz);
      dummy.updateMatrix();
      handleMesh.setMatrixAt(i, dummy.matrix);
      handleMesh.setColorAt(i, tmpColor.setHex(it.colorHex));
    }
    handleMesh.instanceMatrix.needsUpdate = true;
    if (handleMesh.instanceColor) handleMesh.instanceColor.needsUpdate = true;
    houseGroup.add(handleMesh);
  }

  // 8C. Glowing Raised RGB Mechanical Keyboard Keycaps InstancedMesh
  if (keycapInstances.length > 0) {
    const keyGeo = getRoundedBoxGeo(0.014, 0.008, 0.014, 0.002, 2);
    const keyMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: new THREE.Color(0x283850),
      emissiveIntensity: 0.75,
      roughness: 0.25,
    });
    const keyMesh = new THREE.InstancedMesh(keyGeo, keyMat, keycapInstances.length);
    keyMesh.frustumCulled = false;
    for (let i = 0; i < keycapInstances.length; i++) {
      const it = keycapInstances[i];
      dummy.position.set(it.x, it.y, it.z);
      dummy.rotation.set(0, it.rotY || 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      keyMesh.setMatrixAt(i, dummy.matrix);
      keyMesh.setColorAt(i, tmpColor.setHex(it.colorHex));
    }
    keyMesh.instanceMatrix.needsUpdate = true;
    if (keyMesh.instanceColor) keyMesh.instanceColor.needsUpdate = true;
    houseGroup.add(keyMesh);
  }

  // 8D. Library Bookshelf Hardcover Books InstancedMesh
  if (bookInstances.length > 0) {
    const bookGeo = getRoundedBoxGeo(1.0, 1.0, 1.0, 0.08, 2);
    const bookMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      bumpMap: tex.fabricWeaveBumpTex,
      bumpScale: 0.002,
      roughness: 0.58,
      metalness: 0.08,
    });
    const bookMesh = new THREE.InstancedMesh(bookGeo, bookMat, bookInstances.length);
    bookMesh.frustumCulled = false;
    for (let i = 0; i < bookInstances.length; i++) {
      const it = bookInstances[i];
      dummy.position.set(it.x, it.y, it.z);
      dummy.rotation.set(0, it.rotY || 0, 0);
      dummy.scale.set(it.sx, it.sy, it.sz);
      dummy.updateMatrix();
      bookMesh.setMatrixAt(i, dummy.matrix);
      bookMesh.setColorAt(i, tmpColor.setHex(it.colorHex));
    }
    bookMesh.instanceMatrix.needsUpdate = true;
    if (bookMesh.instanceColor) bookMesh.instanceColor.needsUpdate = true;
    houseGroup.add(bookMesh);
  }

  // 8E. Gym Dumbbells InstancedMesh
  if (dumbbellInstances.length > 0) {
    const dbGeo = new THREE.CylinderGeometry(0.036, 0.036, 0.11, 8);
    const dbMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.32,
      metalness: 0.65,
    });
    const dbMesh = new THREE.InstancedMesh(dbGeo, dbMat, dumbbellInstances.length);
    dbMesh.frustumCulled = false;
    for (let i = 0; i < dumbbellInstances.length; i++) {
      const it = dumbbellInstances[i];
      dummy.position.set(it.x, it.y, it.z);
      dummy.rotation.set(Math.PI / 2, it.rotY || 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      dbMesh.setMatrixAt(i, dummy.matrix);
      dbMesh.setColorAt(i, tmpColor.setHex(it.colorHex));
    }
    dbMesh.instanceMatrix.needsUpdate = true;
    if (dbMesh.instanceColor) dbMesh.instanceColor.needsUpdate = true;
    houseGroup.add(dbMesh);
  }

  // -------------------------------------------------------------------------
  // 9. FAST ROOM LOOKUP, RAMP HEIGHT SOLVER & WALL/FURNITURE COLLISION
  // -------------------------------------------------------------------------
  function getRoomAt(x, z) {
    for (let i = 0; i < ROOM_LIST.length; i++) {
      const r = ROOM_LIST[i];
      if (x >= r.xMin && x <= r.xMax && z >= r.zMin && z <= r.zMax) {
        return r;
      }
    }
    return ROOM_LIST[11];
  }

  function evalRampSurfaceAt(r, x, z) {
    let ry = r.yStart;
    let rnx = 0.0;
    let rny = 1.0;
    let rnz = 0.0;
    if (r.dir === '+x') {
      const t = THREE.MathUtils.clamp((x - r.xMin) / Math.max(1e-4, r.xMax - r.xMin), 0, 1);
      ry = r.yStart + t * (r.yEnd - r.yStart);
      rnx = -(r.yEnd - r.yStart) / Math.max(1e-4, r.xMax - r.xMin);
    } else if (r.dir === '-x') {
      const t = THREE.MathUtils.clamp((r.xMax - x) / Math.max(1e-4, r.xMax - r.xMin), 0, 1);
      ry = r.yStart + t * (r.yEnd - r.yStart);
      rnx = (r.yEnd - r.yStart) / Math.max(1e-4, r.xMax - r.xMin);
    } else if (r.dir === '+z') {
      const t = THREE.MathUtils.clamp((z - r.zMin) / Math.max(1e-4, r.zMax - r.zMin), 0, 1);
      ry = r.yStart + t * (r.yEnd - r.yStart);
      rnz = -(r.yEnd - r.yStart) / Math.max(1e-4, r.zMax - r.zMin);
    } else if (r.dir === '-z') {
      const t = THREE.MathUtils.clamp((r.zMax - z) / Math.max(1e-4, r.zMax - r.zMin), 0, 1);
      ry = r.yStart + t * (r.yEnd - r.yStart);
      rnz = (r.yEnd - r.yStart) / Math.max(1e-4, r.zMax - r.zMin);
    }
    return { ry, rnx, rny, rnz };
  }

  function sampleFloorAndRamp(x, z, currentYOrNormal = 999, maybeOutNormal = null) {
    let currentY = 999;
    let outNormal = maybeOutNormal;
    if (typeof currentYOrNormal === 'object' && currentYOrNormal !== null) {
      outNormal = currentYOrNormal;
    } else if (typeof currentYOrNormal === 'number') {
      currentY = currentYOrNormal;
    }

    let bestY = 0.0;
    let nx = 0.0;
    let ny = 1.0;
    let nz = 0.0;

    for (let i = 0; i < ramps.length; i++) {
      const r = ramps[i];
      if (x >= r.xMin && x <= r.xMax && z >= r.zMin && z <= r.zMax) {
        const { ry, rnx, rny, rnz } = evalRampSurfaceAt(r, x, z);
        // Only mount or stay on a ramp surface if the car's height is within mounting tolerance
        // of the ramp surface at (x, z), preventing side-clipping or popping from floor level!
        if (currentY + 0.052 >= ry && ry >= bestY) {
          bestY = ry;
          const len = Math.hypot(rnx, rny, rnz) || 1.0;
          nx = rnx / len;
          ny = rny / len;
          nz = rnz / len;
        }
      }
    }

    if (outNormal) {
      outNormal.set(nx, ny, nz);
    }
    return bestY;
  }

  function resolveSingleBox(cx, cz, prevX, prevZ, xMin, xMax, zMin, zMax, radius) {
    const closestX = THREE.MathUtils.clamp(cx, xMin, xMax);
    const closestZ = THREE.MathUtils.clamp(cz, zMin, zMax);
    const dx = cx - closestX;
    const dz = cz - closestZ;
    const distSq = dx * dx + dz * dz;

    if (distSq >= radius * radius) {
      return null;
    }

    if (distSq > 1e-6) {
      const dist = Math.sqrt(distSq);
      const pen = radius - dist;
      const nx = dx / dist;
      const nz = dz / dist;
      return {
        x: cx + nx * pen,
        z: cz + nz * pen,
        nx,
        nz,
      };
    }

    // Center entered the AABB: determine normal from the previous position (prevX, prevZ)
    // so the car is ALWAYS pushed back toward the side it approached from (zero teleportation!)
    const pClosestX = THREE.MathUtils.clamp(prevX, xMin, xMax);
    const pClosestZ = THREE.MathUtils.clamp(prevZ, zMin, zMax);
    const pdx = prevX - pClosestX;
    const pdz = prevZ - pClosestZ;
    const pDist = Math.hypot(pdx, pdz);
    if (pDist > 1e-6) {
      const nx = pdx / pDist;
      const nz = pdz / pDist;
      return {
        x: pClosestX + nx * radius,
        z: pClosestZ + nz * radius,
        nx,
        nz,
      };
    }

    // Fallback: smallest penetration axis capped to safe push-out
    const dLeft = Math.abs(cx - xMin);
    const dRight = Math.abs(xMax - cx);
    const dTop = Math.abs(cz - zMin);
    const dBot = Math.abs(zMax - cz);
    const minD = Math.min(dLeft, dRight, dTop, dBot);
    if (minD === dLeft) return { x: xMin - radius, z: cz, nx: -1, nz: 0 };
    if (minD === dRight) return { x: xMax + radius, z: cz, nx: 1, nz: 0 };
    if (minD === dTop) return { x: cx, z: zMin - radius, nx: 0, nz: -1 };
    return { x: cx, z: zMax + radius, nx: 0, nz: 1 };
  }

  function resolveCollisions(prevX, prevZ, nextX, nextZ, currentY = 0, radius = 0.052) {
    // Support legacy 4-arg call signature (x, z, y, radius) just in case
    if (arguments.length <= 4) {
      const legacyX = prevX;
      const legacyZ = prevZ;
      const legacyY = nextX || 0;
      const legacyR = nextZ || 0.052;
      return resolveCollisions(legacyX, legacyZ, legacyX, legacyZ, legacyY, legacyR);
    }

    let cx = THREE.MathUtils.clamp(nextX, -3.50, 5.90);
    let cz = THREE.MathUtils.clamp(nextZ, -3.50, 5.90);
    let hit = false;
    let hitNx = 0.0;
    let hitNz = 0.0;

    // 1. Solid 3D Wedge / Prism Ramp Side & Back Collision Checks:
    // Prevent the car from ever driving through the middle, sides, or tall back edge of any ramp
    // when the car's current height is below the ramp surface!
    const mountClearance = 0.042;
    for (let i = 0; i < ramps.length; i++) {
      const r = ramps[i];
      if (r.dir === 'flat') continue; // Flat elevated bridges allow driving underneath between support pillars

      const yMaxRamp = Math.max(r.yStart, r.yEnd);
      if (currentY + mountClearance >= yMaxRamp) continue;

      let rxMin = r.xMin;
      let rxMax = r.xMax;
      let rzMin = r.zMin;
      let rzMax = r.zMax;
      const spanY = Math.max(1e-4, r.yEnd - r.yStart);
      const frac = THREE.MathUtils.clamp((currentY + mountClearance - r.yStart) / spanY, 0.0, 1.0);

      if (r.dir === '+x') {
        rxMin = r.xMin + frac * (r.xMax - r.xMin);
      } else if (r.dir === '-x') {
        rxMax = r.xMax - frac * (r.xMax - r.xMin);
      } else if (r.dir === '+z') {
        rzMin = r.zMin + frac * (r.zMax - r.zMin);
      } else if (r.dir === '-z') {
        rzMax = r.zMax - frac * (r.zMax - r.zMin);
      }

      if (rxMax - rxMin > 0.02 && rzMax - rzMin > 0.02) {
        const res = resolveSingleBox(cx, cz, prevX, prevZ, rxMin, rxMax, rzMin, rzMax, radius);
        if (res) {
          cx = res.x;
          cz = res.z;
          hit = true;
          hitNx = res.nx;
          hitNz = res.nz;
        }
      }
    }

    // 2. Wall & Furniture AABB Colliders
    for (let i = 0; i < colliders.length; i++) {
      const box = colliders[i];
      if (currentY > box.yMax - 0.01) continue;

      const res = resolveSingleBox(cx, cz, prevX, prevZ, box.xMin, box.xMax, box.zMin, box.zMax, radius);
      if (res) {
        cx = res.x;
        cz = res.z;
        hit = true;
        hitNx = res.nx;
        hitNz = res.nz;
      }
    }

    cx = THREE.MathUtils.clamp(cx, -3.50, 5.90);
    cz = THREE.MathUtils.clamp(cz, -3.50, 5.90);

    return { x: cx, z: cz, hit, nx: hitNx, nz: hitNz };
  }

  // Architectural 2D Floorplan Furniture Outlines for the Top-Left Mini-Map
  const furnitureOutlines = [
    // Room 01: Living Room
    { x: -2.4, z: -3.15, w: 1.32, d: 0.52, label: 'SOFA', color: '#3b6cb7' },
    { x: -2.4, z: -2.35, w: 0.66, d: 0.44, label: 'TABLE', color: '#8c5832' },
    { x: -3.40, z: -2.35, w: 0.24, d: 1.02, label: 'TV', color: '#00e5ff' },
    // Room 02: Kitchen
    { x: -0.35, z: -3.32, w: 1.48, d: 0.44, label: 'COUNTER', color: '#3a5f8f' },
    { x: 0.78, z: -3.30, w: 0.50, d: 0.48, label: 'FRIDGE', color: '#a8b8c8' },
    { x: 0.0, z: -2.35, w: 0.96, d: 0.54, label: 'ISLAND', color: '#dce8f4' },
    // Room 05: Dining Hall
    { x: 2.4, z: -2.4, w: 1.38, d: 0.74, label: 'DINING', color: '#7a4b2a' },
    // Room 13: Indoor Pool
    { x: 4.8, z: -2.4, w: 1.44, d: 1.32, label: 'POOL', color: '#00c8ff', isPool: true },
    // Room 03: Master Bedroom
    { x: -2.65, z: 0.0, w: 1.18, d: 1.00, label: 'KING BED', color: '#9c78db' },
    { x: -2.55, z: -0.95, w: 0.68, d: 0.30, label: 'CLOSET', color: '#6c4328' },
    // Room 04: Gaming / Arcade
    { x: -2.4, z: 3.22, w: 1.12, d: 0.54, label: 'PC DESK', color: '#ff2a85' },
    { x: -3.35, z: 2.30, w: 0.30, d: 0.85, label: 'ARCADES', color: '#b388ff' },
    // Room 06: Toy Room
    { x: 0.0, z: 2.4, w: 1.25, d: 0.95, label: 'TOY TRACK', color: '#ffca28' },
    // Room 07: Home Theater
    { x: 2.4, z: 2.45, w: 1.15, d: 0.48, label: 'RECLINERS', color: '#c62828' },
    { x: 2.4, z: 3.44, w: 1.48, d: 0.12, label: 'SCREEN', color: '#ff4081' },
    // Room 08: Indoor Gym
    { x: -0.62, z: 4.85, w: 0.55, d: 0.68, label: 'TREADMILL', color: '#00e676' },
    { x: 0.68, z: 5.42, w: 0.68, d: 0.28, label: 'WEIGHTS', color: '#78909c' },
    // Room 09: Library / Study
    { x: -3.38, z: 4.8, w: 0.28, d: 1.48, label: 'SHELVES', color: '#8d5b38' },
    { x: -1.85, z: 4.8, w: 0.54, d: 1.12, label: 'STUDY', color: '#d49b62' },
    // Room 10: Bathroom
    { x: 5.25, z: 1.65, w: 0.82, d: 0.44, label: 'TUB', color: '#e0f7fa' },
    { x: 5.52, z: 3.12, w: 0.66, d: 0.66, label: 'SHOWER', color: '#40c4ff' },
    // Room 11: Garage / Workshop
    { x: 3.6, z: 4.75, w: 1.10, d: 0.60, label: 'CAR LIFT', color: '#ff6e40' },
    { x: 1.85, z: 5.65, w: 0.95, d: 0.36, label: 'BENCH', color: '#d32f2f' },
    // Room 14: Backyard Patio
    { x: 5.35, z: 0.0, w: 0.62, d: 0.62, label: 'PATIO', color: '#4cd964' },
  ];

  return {
    houseGroup,
    rooms: ROOM_LIST,
    ramps,
    colliders,
    doorways,
    furnitureOutlines,
    getRoomAt,
    sampleFloorAndRamp,
    resolveCollisions,
  };
}
