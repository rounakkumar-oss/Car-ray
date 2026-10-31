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

  // Radial gradient from origin (128, 256) fanning upward toward (128, 0)
  const grad = ctx.createRadialGradient(128, 252, 4, 128, 252, 248);
  grad.addColorStop(0.0, 'rgba(255, 45, 45, 0.82)');
  grad.addColorStop(0.35, 'rgba(255, 25, 35, 0.52)');
  grad.addColorStop(0.78, 'rgba(255, 10, 25, 0.28)');
  grad.addColorStop(0.95, 'rgba(255, 40, 50, 0.65)');
  grad.addColorStop(1.0, 'rgba(255, 0, 0, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Subtle scanline sweep bars inside the vision cone
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
 * Builds the 3D fan sector geometry for a Police car's forward red spotlight cone on the floor.
 * Local +Z is forward in kartRoot space (since kartRoot faces +Z in local coordinates).
 */
function createVisionConeFloorGeometry(lengthLocal, halfAngleRad, segments = 24) {
  const geo = new THREE.BufferGeometry();
  const vertices = [];
  const uvs = [];
  const indices = [];

  // Origin at front bumper of police kart
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

/**
 * Manages AI Police Interceptor Cars, Flashing Red/Blue Roof Sirens, Forward Red Spotlight
 * Vision Cones, Furniture Stealth Detection, and BUSTED Game-Over State.
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

  // World vision cone parameters (in meters inside Giant House)
  const VISION_CONE_LENGTH = 1.48;
  const VISION_CONE_HALF_ANGLE = THREE.MathUtils.degToRad(27);
  const KART_HOUSE_SCALE = 3.6;
  const sharedConeGeo = createVisionConeFloorGeometry(
    VISION_CONE_LENGTH / KART_HOUSE_SCALE,
    VISION_CONE_HALF_ANGLE,
    24
  );

  // Materials for Police Interceptor detailing
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
    { unitName: 'INTERCEPTOR 01', startWp: 0, targetWp: 3 },
    { unitName: 'INTERCEPTOR 02', startWp: 5, targetWp: 10 },
    { unitName: 'INTERCEPTOR 03', startWp: 2, targetWp: 8 },
    { unitName: 'INTERCEPTOR 04', startWp: 12, targetWp: 6 },
  ];

  const units = [];

  for (let i = 0; i < POLICE_SPAWNS.length; i++) {
    const cfg = POLICE_SPAWNS[i];
    const kart = buildMicroKart();
    kart.kartRoot.scale.setScalar(KART_HOUSE_SCALE);

    // Restyle kart body to Black & White Police Interceptor Livery
    kart.kartRoot.traverse((child) => {
      if (child.isMesh && child.material && child.material.color) {
        const c = child.material.color;
        if (c.r > 0.65 && c.g < 0.35) {
          child.material = policeBlackMat;
        }
      }
    });

    // White Police Side Pods + Chrome Push Bullbar + Roof Lightbar
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

    // Roof Siren Lightbar Mount above Driver Helmet
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

    // Floor Siren Bounce Halo (Flashes Red & Blue on the floor around the Police Car)
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

    // Forward Red Vision Cone Spotlight Beam on the Floor
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
      x: wp0.x,
      y: 0.001,
      z: wp0.z,
      yaw: initYaw,
      speed: 0.135,
      currentWp: cfg.startWp,
      targetWp: cfg.targetWp,
      isChasing: false,
      sirenPhase: i * 1.4,
      stuckTimer: 0.0,
    });
  }

  let active = false;
  let isBusted = false;
  let survivalTime = 0.0;
  let graceTimer = 3.0;
  let closeCalls = 0;
  let closeCallCooldown = 0.0;
  let playerHidden = false;
  let currentHiddenZoneLabel = '';
  let nearestPoliceDist = 99.0;
  let anyPoliceChasing = false;

  const _yAxis = new THREE.Vector3(0, 1, 0);

  function resetRound() {
    isBusted = false;
    survivalTime = 0.0;
    graceTimer = 3.2; // 3.2s initial head-start grace timer
    closeCalls = 0;
    closeCallCooldown = 0.0;
    playerHidden = false;
    currentHiddenZoneLabel = '';
    nearestPoliceDist = 99.0;
    anyPoliceChasing = false;

    for (let i = 0; i < units.length; i++) {
      const u = units[i];
      const cfg = POLICE_SPAWNS[i];
      const wp0 = PATROL_WAYPOINTS[cfg.startWp];
      const wp1 = PATROL_WAYPOINTS[cfg.targetWp];
      u.x = wp0.x;
      u.y = 0.001;
      u.z = wp0.z;
      u.yaw = Math.atan2(wp1.z - wp0.z, wp1.x - wp0.x);
      u.speed = 0.135;
      u.currentWp = cfg.startWp;
      u.targetWp = cfg.targetWp;
      u.isChasing = false;
      u.stuckTimer = 0.0;
      u.kart.kartRoot.position.set(u.x, u.y, u.z);
      u.kart.kartRoot.quaternion.setFromAxisAngle(_yAxis, -u.yaw + Math.PI * 0.5);
    }

    if (onStatusChange) {
      onStatusChange(getState());
    }
  }

  function setEnabled(flag) {
    active = Boolean(flag);
    policeGroup.visible = active;
    if (active) {
      resetRound();
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

  function update(dt, playerState) {
    if (!active) return;

    const px = playerState.position.x;
    const py = playerState.position.y;
    const pz = playerState.position.z;

    // 1. Check if player is hidden under furniture (Sofa, Bed, Table, Desk, Island, Lift)
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
    }

    let minPDist = 99.0;
    let chasingNow = false;

    for (let i = 0; i < units.length; i++) {
      const u = units[i];

      // Animate Red & Blue Roof Sirens + Floor Bounce
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
        // Keep sirens flashing dramatically around the caught player
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

      // Determine if Police unit detects & chases the player
      const angleToPlayer = Math.atan2(dzToPlayer, dxToPlayer);
      const angleDiff = Math.abs(shortestAngleDiff(u.yaw, angleToPlayer));

      const canSpotPlayer =
        !playerHidden &&
        hasLOS &&
        ((distToPlayer < 2.45 && angleDiff < Math.PI * 0.48) || distToPlayer < 1.15);

      u.isChasing = canSpotPlayer;
      if (u.isChasing) {
        chasingNow = true;
      }

      // Target steering point: Player position when chasing, or next Patrol Waypoint
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
      const turnSpeed = u.isChasing ? 3.6 : 2.8;
      u.yaw += THREE.MathUtils.clamp(dYaw, -turnSpeed * dt, turnSpeed * dt);

      const targetSpd = u.isChasing ? 0.172 : 0.128;
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
          // Smoothly deflect Police car along wall normal so it never gets stuck
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

      // Close-call bonus counter when escaping near a chasing police unit
      if (
        !playerHidden &&
        distToPlayer < 0.65 &&
        distToPlayer > 0.22 &&
        closeCallCooldown <= 0.0
      ) {
        closeCalls += 1;
        closeCallCooldown = 3.5;
      }

      // BUSTED / OUT DETECTION!
      // 1) Direct collision with Police car (when not hidden under low furniture)
      // 2) Entering the Police car's front red vision cone with clear wall line-of-sight
      if (graceTimer <= 0.0 && !playerHidden && hasLOS) {
        const inDirectCollision = distToPlayer < 0.145;
        const inVisionCone =
          distToPlayer <= VISION_CONE_LENGTH * 0.94 &&
          angleDiff <= VISION_CONE_HALF_ANGLE * 0.95;

        if (inDirectCollision || inVisionCone) {
          isBusted = true;
          const roomObj =
            giantHouse && giantHouse.getRoomAt ? giantHouse.getRoomAt(px, pz) : null;
          const roomLabel = roomObj ? roomObj.shortName : 'CENTRAL HALL';
          const finalScore = Math.round(survivalTime * 100 + closeCalls * 250);
          if (onBusted) {
            onBusted({
              survivalTime,
              score: finalScore,
              closeCalls,
              caughtByUnit: u.unitName,
              reason: inDirectCollision
                ? 'INTERCEPTED BY POLICE PATROL'
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

    if (onStatusChange) {
      onStatusChange(getState());
    }
  }

  function getPoliceRadarMarkers() {
    if (!active) return [];
    return units.map((u) => ({
      id: u.id,
      unitName: u.unitName,
      x: u.x,
      z: u.z,
      yaw: u.yaw,
      coneLength: VISION_CONE_LENGTH,
      coneHalfAngle: VISION_CONE_HALF_ANGLE,
      isChasing: u.isChasing,
      isRedFlash: Math.sin(u.sirenPhase) >= 0,
    }));
  }

  function getState() {
    return {
      active,
      isBusted,
      survivalTime,
      graceTimer,
      closeCalls,
      score: Math.round(survivalTime * 100 + closeCalls * 250),
      playerHidden,
      currentHiddenZoneLabel,
      nearestPoliceDist,
      anyPoliceChasing,
    };
  }

  return {
    setEnabled,
    resetRound,
    update,
    getPoliceRadarMarkers,
    getState,
    isActive: () => active,
    isBusted: () => isBusted,
  };
}
