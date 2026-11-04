import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { buildMicroKart } from '../scene/MicroKartBuilder.js';

/**
 * Creates a procedural red forward spotlight / vision-cone texture with soft beam falloff
 * and a bright outer laser rim so the player clearly sees every Police car's detection zone.
 */
function createVisionConeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 256, 256);

  const grad = ctx.createRadialGradient(128, 252, 4, 128, 252, 248);
  grad.addColorStop(0.0, 'rgba(255, 45, 45, 0.82)');
  grad.addColorStop(0.35, 'rgba(255, 25, 35, 0.52)');
  grad.addColorStop(0.78, 'rgba(255, 10, 25, 0.28)');
  grad.addColorStop(0.95, 'rgba(255, 40, 50, 0.65)');
  grad.addColorStop(1.0, 'rgba(255, 0, 0, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = 'rgba(255, 160, 160, 0.22)';
  ctx.lineWidth = 2;
  for (let r = 45; r <= 225; r += 36) {
    ctx.beginPath();
    ctx.arc(128, 252, r, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Creates a red/blue dual-halo floor bounce texture for the Police roof siren.
 */
function createSirenFloorGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  g.addColorStop(0.0, 'rgba(255, 255, 255, 0.9)');
  g.addColorStop(0.35, 'rgba(255, 60, 80, 0.55)');
  g.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Builds a floating 3D nametag sprite for AI Police or AI Hider ("Chor") bots in Hide & Seek.
 */
function createHideSeekBotTagSprite(botName, accentHex = '#00e676', statusStr = 'EVADING') {
  const canvas = document.createElement('canvas');
  canvas.width = 280;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  const drawTag = (name, col, status) => {
    ctx.clearRect(0, 0, 280, 64);
    ctx.fillStyle = 'rgba(6, 12, 24, 0.84)';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(6, 6, 268, 52, 14);
    } else {
      ctx.rect(6, 6, 268, 52);
    }
    ctx.fill();

    ctx.strokeStyle = col;
    ctx.lineWidth = 3.0;
    ctx.stroke();

    ctx.fillStyle = col;
    ctx.font = '900 12px "Orbitron", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 140, 23);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 11.5px "Orbitron", sans-serif';
    ctx.fillText(status, 140, 42);
  };

  drawTag(botName, accentHex, statusStr);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.082, 0.019, 1.0);
  sprite.position.set(0, 0.0155, 0);
  sprite.userData.updateTag = (name, col, status) => {
    drawTag(name, col, status);
    tex.needsUpdate = true;
  };
  return sprite;
}

/**
 * Builds the 3D fan sector geometry for a Police car's forward red spotlight cone on the floor.
 */
function createVisionConeFloorGeometry(lengthLocal, halfAngleRad, segments = 24) {
  const geo = new THREE.BufferGeometry();
  const vertices = [];
  const uvs = [];
  const indices = [];

  vertices.push(0, 0.0012, 0.009);
  uvs.push(0.5, 0.0);

  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const ang = -halfAngleRad + u * (halfAngleRad * 2);
    const x = Math.sin(ang) * lengthLocal;
    const z = 0.009 + Math.cos(ang) * lengthLocal;
    vertices.push(x, 0.0012, z);
    uvs.push(u, 1.0);
  }

  for (let i = 1; i <= segments; i++) {
    indices.push(0, i, i + 1);
  }

  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function shortestAngleDiff(fromRad, toRad) {
  let d = ((toRad - fromRad + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Interconnected Patrol Waypoint Graph spanning the 14 rooms & doorways of the Giant House.
 */
const PATROL_WAYPOINTS = [
  { id: 0, x: 1.2, z: 0.0, neighbors: [1, 2, 3, 6, 7, 13] },       // 12 Central Hall East
  { id: 1, x: -0.2, z: 0.0, neighbors: [0, 2, 4, 5] },             // 12 Central Hall West
  { id: 2, x: 0.0, z: -1.75, neighbors: [1, 3, 8] },               // 02 Kitchen South
  { id: 3, x: 2.4, z: -1.85, neighbors: [0, 2, 9] },               // 05 Dining Hall
  { id: 4, x: -2.2, z: 0.0, neighbors: [1, 8, 10] },               // 03 Master Bedroom
  { id: 5, x: 0.0, z: 1.85, neighbors: [1, 6, 10, 11] },           // 06 Toy Room
  { id: 6, x: 2.4, z: 1.65, neighbors: [0, 5, 12, 14] },           // 07 Home Theater
  { id: 7, x: 4.3, z: 0.0, neighbors: [0, 9, 14] },                // 14 Patio Deck
  { id: 8, x: -2.1, z: -1.85, neighbors: [2, 4] },                 // 01 Living Room
  { id: 9, x: 4.5, z: -1.65, neighbors: [3, 7] },                  // 13 Sunroom Pool
  { id: 10, x: -2.1, z: 2.2, neighbors: [4, 5, 15] },              // 04 Gaming / Arcade
  { id: 11, x: 0.0, z: 4.15, neighbors: [5, 12, 15] },             // 08 Indoor Gym
  { id: 12, x: 2.4, z: 4.15, neighbors: [6, 11, 14] },             // 11 Garage West
  { id: 13, x: 2.2, z: 0.0, neighbors: [0, 3, 6, 7] },             // 12 Central Hall Mid-East
  { id: 14, x: 4.6, z: 2.2, neighbors: [6, 7, 12] },               // 10 Luxury Bathroom
  { id: 15, x: -2.4, z: 4.4, neighbors: [10, 11] },                // 09 Library / Study
];

const POLICE_DIFFICULTY_SETTINGS = {
  normal: {
    id: 'normal',
    label: 'NORMAL',
    patrolSpeed: 0.108,
    chaseSpeed: 0.148,
    coneScale: 0.86,
    spotDist: 2.1,
    turnRatePatrol: 2.4,
    turnRateChase: 3.1,
    hiderSpeed: 0.132,
  },
  medium: {
    id: 'medium',
    label: 'MEDIUM',
    patrolSpeed: 0.128,
    chaseSpeed: 0.172,
    coneScale: 1.0,
    spotDist: 2.45,
    turnRatePatrol: 2.8,
    turnRateChase: 3.6,
    hiderSpeed: 0.152,
  },
  hard: {
    id: 'hard',
    label: 'HARD',
    patrolSpeed: 0.148,
    chaseSpeed: 0.198,
    coneScale: 1.15,
    spotDist: 2.85,
    turnRatePatrol: 3.3,
    turnRateChase: 4.2,
    hiderSpeed: 0.175,
  },
};

/**
 * Manages AI Police Interceptor Cars, AI Hider Bots ("AI Chor"), Flashing Red/Blue Roof Sirens,
 * Forward Red Spotlight Vision Cones, Furniture Stealth Detection, and BUSTED Game-Over State.
 */
export function createPoliceChaseManager({
  scene,
  giantHouse,
  onBusted,
  onStatusChange,
}) {
  const policeGroup = new THREE.Group();
  policeGroup.name = 'PoliceInterceptorsGroup';
  policeGroup.visible = false;
  scene.add(policeGroup);

  const visionConeTex = createVisionConeTexture();
  const sirenGlowTex = createSirenFloorGlowTexture();

  const BASE_VISION_CONE_LENGTH = 1.48;
  const VISION_CONE_HALF_ANGLE = THREE.MathUtils.degToRad(27);
  const KART_HOUSE_SCALE = 3.6;
  const sharedConeGeo = createVisionConeFloorGeometry(
    BASE_VISION_CONE_LENGTH / KART_HOUSE_SCALE,
    VISION_CONE_HALF_ANGLE,
    24
  );

  const policeBlackMat = new THREE.MeshStandardMaterial({
    color: 0x10141d,
    roughness: 0.25,
    metalness: 0.65,
  });
  const policeWhiteDoorMat = new THREE.MeshStandardMaterial({
    color: 0xf4f8ff,
    roughness: 0.22,
    metalness: 0.25,
  });
  const bullbarChromeMat = new THREE.MeshStandardMaterial({
    color: 0xdce6f2,
    roughness: 0.18,
    metalness: 0.92,
  });

  const POLICE_SPAWNS = [
    { unitName: 'AI POLICE 01', startWp: 0, targetWp: 3 },
    { unitName: 'AI POLICE 02', startWp: 5, targetWp: 10 },
    { unitName: 'AI POLICE 03', startWp: 2, targetWp: 8 },
    { unitName: 'AI POLICE 04', startWp: 12, targetWp: 6 },
  ];

  const units = [];

  for (let i = 0; i < POLICE_SPAWNS.length; i++) {
    const cfg = POLICE_SPAWNS[i];
    const kart = buildMicroKart();
    kart.kartRoot.scale.setScalar(KART_HOUSE_SCALE);

    kart.kartRoot.traverse((child) => {
      if (child.isMesh && child.material && child.material.color) {
        const c = child.material.color;
        if (c.r > 0.65 && c.g < 0.35) {
          child.material = policeBlackMat;
        }
      }
    });

    const doorStripe = new THREE.Mesh(
      new RoundedBoxGeometry(0.0132, 0.0032, 0.0085, 2, 0.0008),
      policeWhiteDoorMat
    );
    doorStripe.position.set(0, 0.0034, 0.0);
    kart.kartRoot.add(doorStripe);

    const bullbar = new THREE.Mesh(
      new RoundedBoxGeometry(0.0115, 0.0032, 0.0022, 2, 0.0006),
      bullbarChromeMat
    );
    bullbar.position.set(0, 0.0032, 0.0098);
    kart.kartRoot.add(bullbar);

    const sirenBarGroup = new THREE.Group();
    sirenBarGroup.position.set(0, 0.0108, -0.0012);

    const barCenter = new THREE.Mesh(
      new RoundedBoxGeometry(0.0096, 0.0014, 0.0028, 2, 0.0004),
      bullbarChromeMat
    );
    sirenBarGroup.add(barCenter);

    const redSirenMat = new THREE.MeshStandardMaterial({
      color: 0xff1e27,
      emissive: new THREE.Color(0xff1722),
      emissiveIntensity: 3.2,
      roughness: 0.15,
    });
    const blueSirenMat = new THREE.MeshStandardMaterial({
      color: 0x0088ff,
      emissive: new THREE.Color(0x0066ff),
      emissiveIntensity: 0.4,
      roughness: 0.15,
    });

    const redPod = new THREE.Mesh(
      new RoundedBoxGeometry(0.0042, 0.0018, 0.0030, 2, 0.0005),
      redSirenMat
    );
    redPod.position.set(-0.0026, 0.0004, 0);
    sirenBarGroup.add(redPod);

    const bluePod = new THREE.Mesh(
      new RoundedBoxGeometry(0.0042, 0.0018, 0.0030, 2, 0.0005),
      blueSirenMat
    );
    bluePod.position.set(0.0026, 0.0004, 0);
    sirenBarGroup.add(bluePod);

    kart.kartRoot.add(sirenBarGroup);

    const sirenGlowMat = new THREE.MeshBasicMaterial({
      map: sirenGlowTex,
      color: 0xff1e27,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sirenGlowPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.18), sirenGlowMat);
    sirenGlowPlane.rotation.x = -Math.PI / 2;
    sirenGlowPlane.position.set(0, 0.0008, 0);
    kart.kartRoot.add(sirenGlowPlane);

    const coneMat = new THREE.MeshBasicMaterial({
      map: visionConeTex,
      color: 0xff2228,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const coneMesh = new THREE.Mesh(sharedConeGeo, coneMat);
    kart.kartRoot.add(coneMesh);

    const policeTag = createHideSeekBotTagSprite(cfg.unitName, '#ff3b30', 'PATROLLING');
    kart.kartRoot.add(policeTag);

    policeGroup.add(kart.kartRoot);

    const wp0 = PATROL_WAYPOINTS[cfg.startWp];
    const wp1 = PATROL_WAYPOINTS[cfg.targetWp];
    const initYaw = Math.atan2(wp1.z - wp0.z, wp1.x - wp0.x);

    units.push({
      id: `police_${i + 1}`,
      unitName: cfg.unitName,
      kart,
      redSirenMat,
      blueSirenMat,
      sirenGlowMat,
      coneMat,
      coneMesh,
      tagSprite: policeTag,
      x: wp0.x,
      y: 0.001,
      z: wp0.z,
      yaw: initYaw,
      speed: 0.128,
      currentWp: cfg.startWp,
      targetWp: cfg.targetWp,
      isChasing: false,
      sirenPhase: i * 1.4,
      stuckTimer: 0.0,
      lastTagState: 'PATROLLING',
    });
  }

  // -------------------------------------------------------------------------
  // AI HIDER BOTS ("AI CHOR 01..03") FOR HIDE & SEEK MODE
  // -------------------------------------------------------------------------
  const AI_HIDER_SPAWNS = [
    { name: 'AI CHOR 01', colorHex: '#00e676', colorNum: 0x00e676, startWp: 4, targetWp: 8 },
    { name: 'AI CHOR 02', colorHex: '#ffca28', colorNum: 0xffca28, startWp: 6, targetWp: 14 },
    { name: 'AI CHOR 03', colorHex: '#b388ff', colorNum: 0xb388ff, startWp: 11, targetWp: 15 },
  ];

  const aiHiders = [];
  for (let i = 0; i < AI_HIDER_SPAWNS.length; i++) {
    const cfg = AI_HIDER_SPAWNS[i];
    const hKart = buildMicroKart();
    hKart.kartRoot.scale.setScalar(KART_HOUSE_SCALE);

    hKart.kartRoot.traverse((child) => {
      if (child.isMesh && child.material && child.material.color) {
        const c = child.material.color;
        if (c.r > 0.65 && c.g < 0.35) {
          child.material = child.material.clone();
          child.material.color.setHex(cfg.colorNum);
        }
      }
    });

    const hTag = createHideSeekBotTagSprite(cfg.name, cfg.colorHex, '🕵️ FINDING COVER');
    hKart.kartRoot.add(hTag);
    policeGroup.add(hKart.kartRoot);

    const wp0 = PATROL_WAYPOINTS[cfg.startWp];
    const wp1 = PATROL_WAYPOINTS[cfg.targetWp];
    aiHiders.push({
      id: `ai_hider_${i + 1}`,
      name: cfg.name,
      colorHex: cfg.colorHex,
      kart: hKart,
      tagSprite: hTag,
      x: wp0.x,
      y: 0.001,
      z: wp0.z,
      yaw: Math.atan2(wp1.z - wp0.z, wp1.x - wp0.x),
      speed: 0.135,
      currentWp: cfg.startWp,
      targetWp: cfg.targetWp,
      targetZone: null,
      hidePauseTimer: 0.0,
      hiddenUnderFurniture: false,
      stuckTimer: 0.0,
      lastTagState: '',
    });
  }

  let active = false;
  let difficulty = 'normal'; // 'normal' | 'medium' | 'hard'
  let isBusted = false;
  let survivalTime = 0.0;
  let graceTimer = 3.0;
  let closeCalls = 0;
  let closeCallCooldown = 0.0;
  let playerHidden = false;
  let currentHiddenZoneLabel = '';
  let nearestPoliceDist = 99.0;
  let anyPoliceChasing = false;
  let chasingCopsCount = 0;

  const state = {
    active: false,
    difficulty: 'normal',
    isBusted: false,
    survivalTime: 0.0,
    graceTimer: 3.0,
    closeCalls: 0,
    escapedCount: 0,
    score: 0,
    playerHidden: false,
    hiddenLabel: '',
    currentHiddenZoneLabel: '',
    nearestPoliceDist: 99.0,
    anyPoliceChasing: false,
    chasingCopsCount: 0,
    activeAiHiders: AI_HIDER_SPAWNS.length,
  };

  const _yAxis = new THREE.Vector3(0, 1, 0);

  function syncStateObject() {
    state.active = active;
    state.difficulty = difficulty;
    state.isBusted = isBusted;
    state.survivalTime = survivalTime;
    state.graceTimer = graceTimer;
    state.closeCalls = closeCalls;
    state.escapedCount = closeCalls;
    state.score = Math.round(survivalTime * 100 + closeCalls * 250);
    state.playerHidden = playerHidden;
    state.hiddenLabel = currentHiddenZoneLabel;
    state.currentHiddenZoneLabel = currentHiddenZoneLabel;
    state.nearestPoliceDist = nearestPoliceDist;
    state.anyPoliceChasing = anyPoliceChasing;
    state.chasingCopsCount = chasingCopsCount;
    state.activeAiHiders = aiHiders.length;
    return state;
  }

  function setDifficulty(diffKey) {
    const clean = String(diffKey || 'normal').toLowerCase();
    difficulty = POLICE_DIFFICULTY_SETTINGS[clean] ? clean : 'normal';
    const dCfg = POLICE_DIFFICULTY_SETTINGS[difficulty];
    for (let i = 0; i < units.length; i++) {
      const u = units[i];
      if (u.coneMesh) {
        u.coneMesh.scale.set(dCfg.coneScale, 1.0, dCfg.coneScale);
      }
    }
    syncStateObject();
    return difficulty;
  }

  function resetRound() {
    isBusted = false;
    survivalTime = 0.0;
    graceTimer = 3.2;
    closeCalls = 0;
    closeCallCooldown = 0.0;
    playerHidden = false;
    currentHiddenZoneLabel = '';
    nearestPoliceDist = 99.0;
    anyPoliceChasing = false;
    chasingCopsCount = 0;

    const dCfg = POLICE_DIFFICULTY_SETTINGS[difficulty] || POLICE_DIFFICULTY_SETTINGS.normal;

    for (let i = 0; i < units.length; i++) {
      const u = units[i];
      const cfg = POLICE_SPAWNS[i];
      const wp0 = PATROL_WAYPOINTS[cfg.startWp];
      const wp1 = PATROL_WAYPOINTS[cfg.targetWp];
      u.x = wp0.x;
      u.y = 0.001;
      u.z = wp0.z;
      u.yaw = Math.atan2(wp1.z - wp0.z, wp1.x - wp0.x);
      u.speed = dCfg.patrolSpeed;
      u.currentWp = cfg.startWp;
      u.targetWp = cfg.targetWp;
      u.isChasing = false;
      u.stuckTimer = 0.0;
      u.kart.kartRoot.position.set(u.x, u.y, u.z);
      u.kart.kartRoot.quaternion.setFromAxisAngle(_yAxis, -u.yaw + Math.PI * 0.5);
      if (u.coneMesh) {
        u.coneMesh.scale.set(dCfg.coneScale, 1.0, dCfg.coneScale);
      }
    }

    for (let i = 0; i < aiHiders.length; i++) {
      const h = aiHiders[i];
      const cfg = AI_HIDER_SPAWNS[i];
      const wp0 = PATROL_WAYPOINTS[cfg.startWp];
      const wp1 = PATROL_WAYPOINTS[cfg.targetWp];
      h.x = wp0.x;
      h.y = 0.001;
      h.z = wp0.z;
      h.yaw = Math.atan2(wp1.z - wp0.z, wp1.x - wp0.x);
      h.speed = dCfg.hiderSpeed;
      h.currentWp = cfg.startWp;
      h.targetWp = cfg.targetWp;
      h.targetZone = null;
      h.hidePauseTimer = 0.0;
      h.hiddenUnderFurniture = false;
      h.stuckTimer = 0.0;
      h.kart.kartRoot.position.set(h.x, h.y, h.z);
      h.kart.kartRoot.quaternion.setFromAxisAngle(_yAxis, -h.yaw + Math.PI * 0.5);
    }

    syncStateObject();
    if (onStatusChange) {
      onStatusChange(state);
    }
  }

  function setEnabled(flag) {
    active = Boolean(flag);
    policeGroup.visible = active;
    if (active) {
      resetRound();
    } else {
      syncStateObject();
    }
  }

  function pickNextPatrolWaypoint(unit) {
    const currNode = PATROL_WAYPOINTS[unit.targetWp] || PATROL_WAYPOINTS[0];
    const neighbors = currNode.neighbors || [0];
    const candidates = neighbors.filter((nid) => nid !== unit.currentWp);
    const pool = candidates.length > 0 ? candidates : neighbors;
    const nextId = pool[Math.floor(Math.random() * pool.length)];
    unit.currentWp = unit.targetWp;
    unit.targetWp = nextId;
  }

  function stepAiHiders(dt, dCfg) {
    const zones = (giantHouse && giantHouse.hidingZones) || [];
    for (let i = 0; i < aiHiders.length; i++) {
      const h = aiHiders[i];

      // Check if AI Hider is currently under furniture
      if (giantHouse && giantHouse.isPointHiddenUnderFurniture) {
        const res = giantHouse.isPointHiddenUnderFurniture(h.x, h.z, h.y);
        h.hiddenUnderFurniture = res.hidden;
      } else {
        h.hiddenUnderFurniture = false;
      }

      // Check distance to nearest Police Interceptor
      let minCopDist = 99.0;
      for (let c = 0; c < units.length; c++) {
        const d = Math.hypot(units[c].x - h.x, units[c].z - h.z);
        if (d < minCopDist) minCopDist = d;
      }

      // If hidden under furniture and a cop is nearby, stay hidden quietly!
      if (h.hiddenUnderFurniture && (minCopDist < 2.2 || h.hidePauseTimer > 0.0)) {
        h.hidePauseTimer = Math.max(0.0, h.hidePauseTimer - dt);
        h.speed = THREE.MathUtils.lerp(h.speed, 0.0, 1.0 - Math.exp(-10.0 * dt));
        const tagStr = '🕵️ HIDDEN SAFE';
        if (h.lastTagState !== tagStr) {
          h.lastTagState = tagStr;
          h.tagSprite.userData.updateTag(h.name, '#4eff9f', tagStr);
        }
        continue;
      }

      // If a hiding zone is in the same room and cop is approaching, steer toward the hiding zone
      let tx = 0;
      let tz = 0;
      if (minCopDist < 2.8 && zones.length > 0) {
        let bestZone = null;
        let bestZDist = Infinity;
        for (let zIdx = 0; zIdx < zones.length; zIdx++) {
          const hz = zones[zIdx];
          const zcx = (hz.xMin + hz.xMax) * 0.5;
          const zcz = (hz.zMin + hz.zMax) * 0.5;
          const zd = Math.hypot(zcx - h.x, zcz - h.z);
          if (zd < bestZDist && zd < 2.2) {
            bestZDist = zd;
            bestZone = { x: zcx, z: zcz };
          }
        }
        if (bestZone) {
          tx = bestZone.x;
          tz = bestZone.z;
          if (bestZDist < 0.22) {
            h.hidePauseTimer = 3.5;
          }
        }
      }

      if (tx === 0 && tz === 0) {
        const wp = PATROL_WAYPOINTS[h.targetWp] || PATROL_WAYPOINTS[0];
        tx = wp.x;
        tz = wp.z;
        if (Math.hypot(tx - h.x, tz - h.z) < 0.28) {
          pickNextPatrolWaypoint(h);
          const nextWp = PATROL_WAYPOINTS[h.targetWp] || PATROL_WAYPOINTS[0];
          tx = nextWp.x;
          tz = nextWp.z;
        }
      }

      const desiredYaw = Math.atan2(tz - h.z, tx - h.x);
      const dYaw = shortestAngleDiff(h.yaw, desiredYaw);
      h.yaw += THREE.MathUtils.clamp(dYaw, -3.4 * dt, 3.4 * dt);
      const targetSpd = minCopDist < 2.2 ? dCfg.hiderSpeed * 1.15 : dCfg.hiderSpeed;
      h.speed = THREE.MathUtils.lerp(h.speed, targetSpd, 1.0 - Math.exp(-8.0 * dt));

      const prevX = h.x;
      const prevZ = h.z;
      let nextX = prevX + Math.cos(h.yaw) * h.speed * 4.2 * dt;
      let nextZ = prevZ + Math.sin(h.yaw) * h.speed * 4.2 * dt;

      if (giantHouse && giantHouse.resolveCollisions) {
        const col = giantHouse.resolveCollisions(prevX, prevZ, nextX, nextZ, h.y, 0.050);
        nextX = col.x;
        nextZ = col.z;
        if (col.hit) {
          const slideYaw = Math.atan2(col.nz, col.nx);
          h.yaw += shortestAngleDiff(h.yaw, slideYaw) * Math.min(1.0, 9.0 * dt);
          h.stuckTimer += dt;
          if (h.stuckTimer > 0.6) {
            h.stuckTimer = 0.0;
            pickNextPatrolWaypoint(h);
            h.yaw += Math.PI * 0.55;
          }
        } else {
          h.stuckTimer = Math.max(0.0, h.stuckTimer - dt);
        }
      }

      h.x = nextX;
      h.z = nextZ;
      h.kart.kartRoot.position.set(h.x, h.y, h.z);
      h.kart.kartRoot.quaternion.setFromAxisAngle(_yAxis, -h.yaw + Math.PI * 0.5);
      if (h.kart.updateWheels) {
        h.kart.updateWheels(dt, h.speed, dYaw * 0.8);
      }

      const tagStr = minCopDist < 2.2 ? '🏃 EVADING POLICE!' : '🕵️ SEEKING COVER';
      if (h.lastTagState !== tagStr) {
        h.lastTagState = tagStr;
        h.tagSprite.userData.updateTag(h.name, h.colorHex, tagStr);
      }
    }
  }

  function update(dt, playerState) {
    if (!active) return;

    const dCfg = POLICE_DIFFICULTY_SETTINGS[difficulty] || POLICE_DIFFICULTY_SETTINGS.normal;
    const effectiveConeLength = BASE_VISION_CONE_LENGTH * dCfg.coneScale;

    const px = playerState.position.x;
    const py = playerState.position.y;
    const pz = playerState.position.z;

    if (giantHouse && giantHouse.isPointHiddenUnderFurniture) {
      const hideRes = giantHouse.isPointHiddenUnderFurniture(px, pz, py);
      playerHidden = hideRes.hidden;
      currentHiddenZoneLabel = hideRes.zone ? hideRes.zone.label : '';
    } else {
      playerHidden = false;
      currentHiddenZoneLabel = '';
    }

    if (!isBusted) {
      survivalTime += dt;
      if (graceTimer > 0.0) {
        graceTimer = Math.max(0.0, graceTimer - dt);
      }
      if (closeCallCooldown > 0.0) {
        closeCallCooldown = Math.max(0.0, closeCallCooldown - dt);
      }
      stepAiHiders(dt, dCfg);
    }

    let minPDist = 99.0;
    let chasingNow = false;
    let chasingCount = 0;

    for (let i = 0; i < units.length; i++) {
      const u = units[i];

      const sirenRate = u.isChasing ? 16.0 : 9.5;
      u.sirenPhase += dt * sirenRate;
      const isRedFlash = Math.sin(u.sirenPhase) >= 0;
      u.redSirenMat.emissiveIntensity = isRedFlash ? 3.8 : 0.25;
      u.blueSirenMat.emissiveIntensity = isRedFlash ? 0.25 : 3.8;
      u.sirenGlowMat.color.setHex(isRedFlash ? 0xff1e27 : 0x0077ff);
      u.sirenGlowMat.opacity = u.isChasing ? 0.72 : 0.48;
      u.coneMat.opacity = u.isChasing
        ? 0.78 + 0.16 * Math.sin(u.sirenPhase * 1.5)
        : 0.62;

      if (isBusted) {
        continue;
      }

      const dxToPlayer = px - u.x;
      const dzToPlayer = pz - u.z;
      const distToPlayer = Math.hypot(dxToPlayer, dzToPlayer);
      if (distToPlayer < minPDist) {
        minPDist = distToPlayer;
      }

      const hasLOS =
        giantHouse && giantHouse.hasWallLineOfSight
          ? giantHouse.hasWallLineOfSight(u.x, u.z, px, pz)
          : true;

      const angleToPlayer = Math.atan2(dzToPlayer, dxToPlayer);
      const angleDiff = Math.abs(shortestAngleDiff(u.yaw, angleToPlayer));

      const canSpotPlayer =
        !playerHidden &&
        hasLOS &&
        ((distToPlayer < dCfg.spotDist && angleDiff < Math.PI * 0.48) || distToPlayer < 1.10);

      u.isChasing = canSpotPlayer;
      if (u.isChasing) {
        chasingNow = true;
        chasingCount += 1;
      }

      const nextTagState = u.isChasing ? `🚨 PURSUING (${dCfg.label})` : `🚓 PATROL (${dCfg.label})`;
      if (u.lastTagState !== nextTagState) {
        u.lastTagState = nextTagState;
        u.tagSprite.userData.updateTag(u.unitName, u.isChasing ? '#ff3b30' : '#40c4ff', nextTagState);
      }

      let targetX = px;
      let targetZ = pz;
      if (!u.isChasing) {
        const wp = PATROL_WAYPOINTS[u.targetWp] || PATROL_WAYPOINTS[0];
        targetX = wp.x;
        targetZ = wp.z;
        const distWp = Math.hypot(targetX - u.x, targetZ - u.z);
        if (distWp < 0.28) {
          pickNextPatrolWaypoint(u);
          const nextWp = PATROL_WAYPOINTS[u.targetWp] || PATROL_WAYPOINTS[0];
          targetX = nextWp.x;
          targetZ = nextWp.z;
        }
      }

      const desiredYaw = Math.atan2(targetZ - u.z, targetX - u.x);
      const dYaw = shortestAngleDiff(u.yaw, desiredYaw);
      const turnSpeed = u.isChasing ? dCfg.turnRateChase : dCfg.turnRatePatrol;
      u.yaw += THREE.MathUtils.clamp(dYaw, -turnSpeed * dt, turnSpeed * dt);

      const targetSpd = u.isChasing ? dCfg.chaseSpeed : dCfg.patrolSpeed;
      u.speed = THREE.MathUtils.lerp(u.speed, targetSpd, 1.0 - Math.exp(-8.0 * dt));

      const prevX = u.x;
      const prevZ = u.z;
      const stepDist = u.speed * 4.2 * dt;
      let nextX = prevX + Math.cos(u.yaw) * stepDist;
      let nextZ = prevZ + Math.sin(u.yaw) * stepDist;

      if (giantHouse && giantHouse.resolveCollisions) {
        const col = giantHouse.resolveCollisions(prevX, prevZ, nextX, nextZ, u.y, 0.052);
        nextX = col.x;
        nextZ = col.z;
        if (col.hit) {
          const slideYaw = Math.atan2(col.nz, col.nx);
          u.yaw += shortestAngleDiff(u.yaw, slideYaw) * Math.min(1.0, 9.0 * dt);
          u.stuckTimer += dt;
          if (u.stuckTimer > 0.65) {
            u.stuckTimer = 0.0;
            pickNextPatrolWaypoint(u);
            u.yaw += Math.PI * 0.55;
          }
        } else {
          u.stuckTimer = Math.max(0.0, u.stuckTimer - dt);
        }
      }

      u.x = nextX;
      u.z = nextZ;
      u.y = 0.001;

      u.kart.kartRoot.position.set(u.x, u.y, u.z);
      u.kart.kartRoot.quaternion.setFromAxisAngle(_yAxis, -u.yaw + Math.PI * 0.5);
      if (u.kart.updateWheels) {
        u.kart.updateWheels(dt, u.speed, dYaw * 0.8);
      }

      if (
        !playerHidden &&
        distToPlayer < 0.65 &&
        distToPlayer > 0.22 &&
        closeCallCooldown <= 0.0
      ) {
        closeCalls += 1;
        closeCallCooldown = 3.5;
      }

      if (graceTimer <= 0.0 && !playerHidden && hasLOS) {
        const inDirectCollision = distToPlayer < 0.145;
        const inVisionCone =
          distToPlayer <= effectiveConeLength * 0.94 &&
          angleDiff <= VISION_CONE_HALF_ANGLE * 0.95;

        if (inDirectCollision || inVisionCone) {
          isBusted = true;
          const roomObj =
            giantHouse && giantHouse.getRoomAt ? giantHouse.getRoomAt(px, pz) : null;
          const roomLabel = roomObj ? roomObj.shortName : 'CENTRAL HALL';
          const finalScore = Math.round(survivalTime * 100 + closeCalls * 250);
          syncStateObject();
          if (onBusted) {
            onBusted({
              survivalTime,
              score: finalScore,
              closeCalls,
              escapedCount: closeCalls,
              caughtByUnit: u.unitName,
              reason: inDirectCollision
                ? 'RAMMED BY INTERCEPTOR!'
                : 'SPOTTED IN POLICE VISION CONE',
              roomName: roomLabel,
            });
          }
          break;
        }
      }
    }

    nearestPoliceDist = minPDist;
    anyPoliceChasing = chasingNow;
    chasingCopsCount = chasingCount;
    syncStateObject();

    if (onStatusChange) {
      onStatusChange(state);
    }
  }

  function getPoliceRadarMarkers() {
    if (!active) return [];
    const dCfg = POLICE_DIFFICULTY_SETTINGS[difficulty] || POLICE_DIFFICULTY_SETTINGS.normal;
    const coneLen = BASE_VISION_CONE_LENGTH * dCfg.coneScale;
    return units.map((u) => ({
      id: u.id,
      unitName: u.unitName,
      x: u.x,
      z: u.z,
      yaw: u.yaw,
      coneLength: coneLen,
      visionRange: coneLen,
      coneHalfAngle: VISION_CONE_HALF_ANGLE,
      visionHalfAngle: VISION_CONE_HALF_ANGLE,
      isChasing: u.isChasing,
      chasing: u.isChasing,
      isRedFlash: Math.sin(u.sirenPhase) >= 0,
    }));
  }

  function getHiderRadarMarkers() {
    if (!active) return [];
    return aiHiders.map((h) => ({
      id: h.id,
      name: h.name,
      x: h.x,
      z: h.z,
      yaw: h.yaw,
      color: h.hiddenUnderFurniture ? '#4eff9f' : h.colorHex,
      hidden: h.hiddenUnderFurniture,
    }));
  }

  function getState() {
    return syncStateObject();
  }

  return {
    policeGroup,
    state,
    setEnabled,
    setDifficulty,
    getDifficulty: () => difficulty,
    resetRound,
    update,
    getPoliceRadarMarkers,
    getHiderRadarMarkers,
    getState,
    isActive: () => active,
    isBusted: () => isBusted,
  };
}
