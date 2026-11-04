import * as THREE from 'three';
import { buildMicroKart } from '../scene/MicroKartBuilder.js';

const AI_DIFFICULTY_PRESETS = {
  normal: {
    id: 'normal',
    label: 'NORMAL',
    tagColor: '#00e676',
    bodyHex: 0x00e676,
    emissiveHex: 0x04381a,
    topSpeed: 0.162,
    boostSpeed: 0.215,
    accelRate: 0.175,
    cornerSlowdownMult: 1.22,
    apexPrecision: 0.45,
    boostChanceOnStraight: 0.25,
    startReactionDelay: 0.38,
  },
  medium: {
    id: 'medium',
    label: 'MEDIUM',
    tagColor: '#ffca28',
    bodyHex: 0xffae00,
    emissiveHex: 0x3d2200,
    topSpeed: 0.184,
    boostSpeed: 0.252,
    accelRate: 0.205,
    cornerSlowdownMult: 0.96,
    apexPrecision: 0.78,
    boostChanceOnStraight: 0.65,
    startReactionDelay: 0.18,
  },
  hard: {
    id: 'hard',
    label: 'HARD',
    tagColor: '#ff2a85',
    bodyHex: 0xff1e6e,
    emissiveHex: 0x42031c,
    topSpeed: 0.206,
    boostSpeed: 0.286,
    accelRate: 0.245,
    cornerSlowdownMult: 0.72,
    apexPrecision: 1.0,
    boostChanceOnStraight: 1.0,
    startReactionDelay: 0.04,
  },
};

function createAiRacerNametagSprite(difficultyKey = 'normal') {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 72;
  const ctx = canvas.getContext('2d');

  const drawBadge = (diffKey, extraText = '') => {
    const preset = AI_DIFFICULTY_PRESETS[diffKey] || AI_DIFFICULTY_PRESETS.normal;
    ctx.clearRect(0, 0, 320, 72);

    ctx.fillStyle = 'rgba(6, 12, 24, 0.86)';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(8, 8, 304, 56, 16);
    } else {
      ctx.rect(8, 8, 304, 56);
    }
    ctx.fill();

    ctx.strokeStyle = preset.tagColor;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    ctx.fillStyle = preset.tagColor;
    ctx.font = '900 13px "Orbitron", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`🤖 AI RIVAL · ${preset.label}`, 160, 26);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 14px "Orbitron", sans-serif';
    ctx.fillText(extraText || 'RACING TO FINISH', 160, 47);
  };

  drawBadge(difficultyKey, 'READY ON GRID');

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.032, 0.0072, 1.0);
  sprite.position.set(0, 0.0155, 0);
  sprite.userData.updateBadge = (diffKey, extraText) => {
    drawBadge(diffKey, extraText);
    tex.needsUpdate = true;
  };
  return sprite;
}

/**
 * Manages the 3D AI Rival Racer on the Neon Coaster Track (with Normal, Medium, Hard
 * difficulty levels, full track checkpoint progress tracking, side-by-side grid start,
 * and head-to-head Finish Line victory/defeat detection) plus AI Roaming Racers in
 * the 14-Room Giant House Free Roam mode.
 */
export function createTrackAiRacerManager({
  scene,
  splineData,
  physics,
  giantHouse,
  onAiFinish,
  onAiLapComplete,
}) {
  const aiRootGroup = new THREE.Group();
  aiRootGroup.name = 'AiRacerRootGroup';
  scene.add(aiRootGroup);

  const samples = splineData.samples || [];
  const N = samples.length;
  const totalLength = splineData.total_length_m || 3.8371;

  // Locate exact Start/Finish line arc length (sample 646)
  let startFinishIdx = Math.min(646, Math.max(0, N - 1));
  let minFinishDist = Infinity;
  for (let i = 0; i < N; i++) {
    const s = samples[i];
    if (s.sector === 6) {
      const dx = s.position[0] - 0.0183;
      const dz = s.position[2] - 0.255;
      const d2 = dx * dx + dz * dz;
      if (d2 < minFinishDist) {
        minFinishDist = d2;
        startFinishIdx = i;
      }
    }
  }
  const startFinishArc = samples[startFinishIdx] ? samples[startFinishIdx].arc_length_m : 3.44;
  const startGridArc = (startFinishArc - 0.025 + totalLength) % totalLength;

  // Build 3D AI Rival Kart for the Coaster Track
  const aiKart = buildMicroKart();
  aiKart.kartRoot.name = 'TrackAiRacerKart';
  aiKart.kartRoot.scale.setScalar(0.38);
  aiRootGroup.add(aiKart.kartRoot);
  if (aiKart.sparkPoints) {
    aiRootGroup.add(aiKart.sparkPoints);
  }

  const tagSprite = createAiRacerNametagSprite('normal');
  aiKart.kartRoot.add(tagSprite);

  // Build 2 AI Free-Roam Racers for Giant House Free Roam Mode
  const houseRoamersGroup = new THREE.Group();
  houseRoamersGroup.name = 'HouseFreeRoamAiGroup';
  houseRoamersGroup.visible = false;
  scene.add(houseRoamersGroup);

  const HOUSE_WAYPOINTS = [
    { x: 1.2, z: 0.0, neighbors: [1, 2, 3, 6, 7] },
    { x: -0.2, z: 0.0, neighbors: [0, 2, 4, 5] },
    { x: 0.0, z: -1.75, neighbors: [1, 3, 8] },
    { x: 2.4, z: -1.85, neighbors: [0, 2, 9] },
    { x: -2.2, z: 0.0, neighbors: [1, 8, 10] },
    { x: 0.0, z: 1.85, neighbors: [1, 6, 10, 11] },
    { x: 2.4, z: 1.65, neighbors: [0, 5, 12] },
    { x: 4.3, z: 0.0, neighbors: [0, 9] },
    { x: -2.1, z: -1.85, neighbors: [2, 4] },
    { x: 4.5, z: -1.65, neighbors: [3, 7] },
    { x: -2.1, z: 2.2, neighbors: [4, 5] },
    { x: 0.0, z: 4.15, neighbors: [5, 12] },
    { x: 2.4, z: 4.15, neighbors: [6, 11] },
  ];

  // Waypoints along the 4-lane City & Mountain Highway Ring & Central Plaza Boulevards
  const CITY_WAYPOINTS = [
    { x: 1.2, z: -2.4, neighbors: [1, 4] },
    { x: 4.8, z: -2.4, neighbors: [2, 0] },
    { x: 4.8, z: 1.2, neighbors: [3, 4, 1] },
    { x: 4.8, z: 4.8, neighbors: [5, 2] },
    { x: 1.2, z: 1.2, neighbors: [0, 2, 5, 7] },
    { x: 1.2, z: 4.8, neighbors: [6, 4, 3] },
    { x: -2.4, z: 4.8, neighbors: [7, 5] },
    { x: -2.4, z: 1.2, neighbors: [8, 4, 6] },
    { x: -2.4, z: -2.4, neighbors: [0, 7] },
  ];

  let activeOpenWorldRef = giantHouse;
  let activePlayMode = 'track';

  const houseAiBots = [];
  const botConfigs = [
    { name: 'AI GT-R 01', carId: 'sport_gt', colorHex: '#00e676', colorNum: 0x00e676, startWp: 0, targetWp: 1 },
    { name: 'AI V12 02', carId: 'hyper_valhalla', colorHex: '#ff2a85', colorNum: 0xff2a85, startWp: 3, targetWp: 2 },
    { name: 'AI MONZA 03', carId: 'coupe_v8', colorHex: '#38bdf8', colorNum: 0x38bdf8, startWp: 5, targetWp: 6 },
  ];

  for (let i = 0; i < botConfigs.length; i++) {
    const cfg = botConfigs[i];
    const bKart = buildMicroKart();
    bKart.kartRoot.scale.setScalar(3.6);
    if (bKart.switchToCatalogVehicle) {
      bKart.switchToCatalogVehicle(cfg.carId);
    }
    const bSprite = createAiRacerNametagSprite('normal');
    bSprite.scale.set(0.085, 0.019, 1.0);
    bSprite.position.set(0, 0.015, 0);
    bSprite.userData.updateBadge('normal', cfg.name);
    bKart.kartRoot.add(bSprite);
    houseRoamersGroup.add(bKart.kartRoot);

    const wp0 = HOUSE_WAYPOINTS[cfg.startWp] || HOUSE_WAYPOINTS[0];
    const wp1 = HOUSE_WAYPOINTS[cfg.targetWp] || HOUSE_WAYPOINTS[1];
    houseAiBots.push({
      id: `house_ai_${i + 1}`,
      name: cfg.name,
      colorHex: cfg.colorHex,
      kart: bKart,
      sprite: bSprite,
      x: wp0.x,
      y: 0.001,
      z: wp0.z,
      yaw: Math.atan2(wp1.z - wp0.z, wp1.x - wp0.x),
      speed: 0.165,
      currentWp: cfg.startWp,
      targetWp: cfg.targetWp,
      stuckTimer: 0.0,
    });
  }

  // Upgrade Track AI Rival to a realistic 3D sports car as well
  if (aiKart.switchToCatalogVehicle) {
    aiKart.switchToCatalogVehicle('sport_gt');
  }

  let currentDifficulty = 'normal'; // 'normal' | 'medium' | 'hard'
  let enabledInTrack = true;
  let enabledInHouseRoam = true;
  let lastBadgeUpdateSec = -1;

  const aiState = {
    difficulty: 'normal',
    s: startGridArc,
    lateralOffset: 0.0038, // Right-side starting grid slot (Player is on left -0.0038)
    speed: 0.0,
    headingYaw: 0.0,
    steerAngle: 0.0,
    isDrifting: false,
    driftDir: 0,
    driftAngle: 0.0,
    boostActive: 0.0,
    boostCharge: 0.8,
    hopHeight: 0.0,
    curbRumble: 0.0,
    lapCount: 1,
    targetLaps: 1,
    currentLapTime: 0.0,
    totalRaceTime: 0.0,
    bestLapTime: null,
    lastLapTime: null,
    finished: false,
    finishTime: null,
    trackProgress: 0.0, // 0.0 -> 1.0 on current lap
    totalProgress: 0.0, // continuous progress across laps
    lapCheckpointsMask: 0, // bit 1 (20%), bit 2 (50%), bit 4 (80%)
    reactionTimer: 0.0,
    sector: 6,
    bankDeg: 0.0,
    downforceG: 1.0,
    position: new THREE.Vector3(),
    tangent: new THREE.Vector3(-1, 0, 0),
    right: new THREE.Vector3(0, 0, -1),
    normal: new THREE.Vector3(0, 1, 0),
    quaternion: new THREE.Quaternion(),
  };

  const _left = new THREE.Vector3();
  const _rotMat = new THREE.Matrix4();
  const _baseQuat = new THREE.Quaternion();
  const _yawQuat = new THREE.Quaternion();
  const _yAxis = new THREE.Vector3(0, 1, 0);
  const _aiSample = {
    index: 0,
    sector: 6,
    position: new THREE.Vector3(),
    tangent: new THREE.Vector3(),
    right: new THREE.Vector3(),
    normal: new THREE.Vector3(),
    bankDeg: 0,
    signedCurvature: 0,
    slope: 0,
  };

  function applyKartLiveryForDifficulty(diffKey) {
    const preset = AI_DIFFICULTY_PRESETS[diffKey] || AI_DIFFICULTY_PRESETS.normal;
    aiKart.kartRoot.traverse((child) => {
      if (child.isMesh && child.material && child.material.color) {
        const mName = (child.material.name || '').toLowerCase();
        const c = child.material.color;
        if (mName.includes('body') || mName.includes('fairing') || (c.r > 0.6 && c.b < 0.4)) {
          if (!child.userData._aiClonedMat) {
            child.material = child.material.clone();
            child.userData._aiClonedMat = true;
          }
          child.material.color.setHex(preset.bodyHex);
          if (child.material.emissive) {
            child.material.emissive.setHex(preset.emissiveHex);
          }
        }
      }
    });
    if (tagSprite && tagSprite.userData.updateBadge) {
      tagSprite.userData.updateBadge(diffKey, `LAP ${aiState.lapCount}/${aiState.targetLaps}`);
    }
  }

  function computeNormalizedTrackProgress(sVal) {
    const raw = ((sVal - startFinishArc) % totalLength + totalLength) % totalLength;
    return raw / totalLength;
  }

  function syncAiTransformFromSpline() {
    if (!physics || !physics.sampleTrackAtArcLength) return;
    const frame = physics.sampleTrackAtArcLength(aiState.s, _aiSample);
    aiState.sector = frame.sector;
    aiState.bankDeg = frame.bankDeg;
    aiState.tangent.copy(frame.tangent);
    aiState.right.copy(frame.right);
    aiState.normal.copy(frame.normal);

    aiState.position
      .copy(frame.position)
      .addScaledVector(frame.right, aiState.lateralOffset)
      .addScaledVector(frame.normal, 0.00032);

    _left.crossVectors(frame.normal, frame.tangent).normalize();
    _rotMat.makeBasis(_left, frame.normal, frame.tangent);
    _baseQuat.setFromRotationMatrix(_rotMat);
    _yawQuat.setFromAxisAngle(frame.normal, aiState.headingYaw);
    aiState.quaternion.copy(_yawQuat.multiply(_baseQuat));

    aiKart.kartRoot.position.copy(aiState.position);
    aiKart.kartRoot.quaternion.copy(aiState.quaternion);
  }

  function resetAiRacer() {
    const preset = AI_DIFFICULTY_PRESETS[currentDifficulty] || AI_DIFFICULTY_PRESETS.normal;
    aiState.s = startGridArc;
    aiState.lateralOffset = 0.0038; // Right lane on starting grid
    aiState.speed = 0.0;
    aiState.headingYaw = 0.0;
    aiState.steerAngle = 0.0;
    aiState.isDrifting = false;
    aiState.driftDir = 0;
    aiState.driftAngle = 0.0;
    aiState.boostActive = 0.0;
    aiState.boostCharge = 0.85;
    aiState.lapCount = 1;
    aiState.targetLaps = physics?.state?.targetLaps || 1;
    aiState.currentLapTime = 0.0;
    aiState.totalRaceTime = 0.0;
    aiState.bestLapTime = null;
    aiState.lastLapTime = null;
    aiState.finished = false;
    aiState.finishTime = null;
    aiState.trackProgress = 0.0;
    aiState.totalProgress = 0.0;
    aiState.lapCheckpointsMask = 0;
    aiState.reactionTimer = preset.startReactionDelay;
    lastBadgeUpdateSec = -1;

    syncAiTransformFromSpline();
    if (tagSprite && tagSprite.userData.updateBadge) {
      tagSprite.userData.updateBadge(currentDifficulty, 'GRID READY');
    }
  }

  function setDifficulty(diffKey) {
    const clean = String(diffKey || 'normal').toLowerCase();
    currentDifficulty = AI_DIFFICULTY_PRESETS[clean] ? clean : 'normal';
    aiState.difficulty = currentDifficulty;
    applyKartLiveryForDifficulty(currentDifficulty);
    return currentDifficulty;
  }

  function syncScaleForCamera(camMode, activeGameMode) {
    if (activeGameMode === 'house') {
      aiRootGroup.visible = false;
      return;
    }
    aiRootGroup.visible = enabledInTrack;
    const isClose = camMode === 1 || camMode === 3;
    const isFarChase = camMode === 2;
    const s = isClose ? 0.38 : isFarChase ? 0.46 : 0.78;
    aiKart.kartRoot.scale.setScalar(s);
  }

  function setModeVisibility(playMode, openWorldRef = null) {
    activePlayMode = playMode || 'track';
    if (openWorldRef) activeOpenWorldRef = openWorldRef;
    const isTrack = activePlayMode === 'track';
    const isOpenWorldRoam = activePlayMode === 'freeroam' || activePlayMode === 'city';
    aiRootGroup.visible = isTrack && enabledInTrack;
    houseRoamersGroup.visible = isOpenWorldRoam && enabledInHouseRoam;

    if (isOpenWorldRoam) {
      const wpList = activePlayMode === 'city' ? CITY_WAYPOINTS : HOUSE_WAYPOINTS;
      houseAiBots.forEach((b, idx) => {
        const sIdx = (idx * 2) % wpList.length;
        const nIdx = wpList[sIdx].neighbors[0] || 0;
        b.currentWp = sIdx;
        b.targetWp = nIdx;
        b.x = wpList[sIdx].x;
        b.z = wpList[sIdx].z;
        b.yaw = Math.atan2(wpList[nIdx].z - b.z, wpList[nIdx].x - b.x);
        b.kart.kartRoot.position.set(b.x, b.y, b.z);
      });
    }
  }

  function updateTrackAi(dt, playerState) {
    if (!enabledInTrack || !aiRootGroup.visible) return;

    const preset = AI_DIFFICULTY_PRESETS[currentDifficulty] || AI_DIFFICULTY_PRESETS.normal;
    aiState.targetLaps = playerState.targetLaps || 1;

    // Hold at starting grid while F1 5-light countdown is active or before player/race starts
    if (playerState.countdownLocked) {
      aiState.speed = 0.0;
      aiState.reactionTimer = preset.startReactionDelay;
      syncAiTransformFromSpline();
      return;
    }

    // Wait until either the race clock is active (after F1 countdown) OR player starts moving
    const raceActive =
      Boolean(playerState.raceClockActive) ||
      Boolean(playerState.autopilot) ||
      Math.abs(playerState.speed) > 0.005;

    if (!raceActive && aiState.totalRaceTime === 0.0) {
      aiState.speed = 0.0;
      syncAiTransformFromSpline();
      return;
    }

    if (aiState.reactionTimer > 0.0 && !playerState.autopilot) {
      aiState.reactionTimer = Math.max(0.0, aiState.reactionTimer - dt);
      syncAiTransformFromSpline();
      return;
    }

    const frame = physics.sampleTrackAtArcLength(aiState.s, _aiSample);
    const sWrapped = ((aiState.s % totalLength) + totalLength) % totalLength;

    if (aiState.finished) {
      // Celebratory cooldown cruise after crossing the finish line
      aiState.speed = THREE.MathUtils.lerp(aiState.speed, preset.topSpeed * 0.45, 1.0 - Math.exp(-4.0 * dt));
      aiState.boostActive = 0.0;
      aiState.isDrifting = false;
      aiState.s = ((aiState.s + aiState.speed * dt) % totalLength + totalLength) % totalLength;
      syncAiTransformFromSpline();
      aiKart.updateWheels(dt, aiState.speed, aiState.steerAngle);
      aiKart.updateKartVisuals(dt, aiState);
      return;
    }

    aiState.currentLapTime += dt;
    aiState.totalRaceTime += dt;

    // Evaluate cornering speed profile based on difficulty preset
    const curvatureAbs = Math.abs(frame.signedCurvature);
    const curvatureNorm = THREE.MathUtils.clamp(curvatureAbs / 1.35, 0.0, 1.0);

    const inCatHelix =
      THREE.MathUtils.smoothstep(sWrapped, 0.40, 0.56) *
      (1.0 - THREE.MathUtils.smoothstep(sWrapped, 1.20, 1.38));
    const inLampCorkscrew =
      THREE.MathUtils.smoothstep(sWrapped, 1.46, 1.64) *
      (1.0 - THREE.MathUtils.smoothstep(sWrapped, 2.34, 2.52));

    const helixSlowdown =
      Math.max(inCatHelix * 0.28, inLampCorkscrew * 0.30, curvatureNorm * 0.24) *
      preset.cornerSlowdownMult;

    const slopeAdjust = THREE.MathUtils.clamp(-frame.slope * 0.38, -0.16, 0.14);
    const speedFactor = THREE.MathUtils.clamp(1.0 - helixSlowdown + slopeAdjust, 0.54, 1.08);

    // Straightaway turbo boost on Sector 6 & Sector 3
    if (aiState.boostActive > 0) {
      aiState.boostActive = Math.max(0.0, aiState.boostActive - dt);
    } else if (
      (frame.sector === 6 || frame.sector === 3) &&
      curvatureAbs < 0.25 &&
      aiState.boostCharge >= 0.55
    ) {
      if (preset.boostChanceOnStraight >= 0.6) {
        aiState.boostActive = 0.55 * preset.boostChanceOnStraight;
        aiState.boostCharge = Math.max(0.1, aiState.boostCharge - 0.45);
      }
    } else {
      aiState.boostCharge = Math.min(1.0, aiState.boostCharge + dt * 0.12);
    }

    const topSpd =
      (aiState.boostActive > 0 ? preset.boostSpeed : preset.topSpeed) *
      (playerState.topSpeedMultiplier || 1.0);
    const targetSpeed = topSpd * speedFactor;

    if (aiState.speed < targetSpeed) {
      aiState.speed = Math.min(targetSpeed, aiState.speed + preset.accelRate * dt);
    } else {
      aiState.speed = THREE.MathUtils.lerp(aiState.speed, targetSpeed, 1.0 - Math.exp(-6.5 * dt));
    }

    // Ideal racing line lateral offset (carves toward inside apex on Medium/Hard, stays slightly right on start straight)
    let targetLat = THREE.MathUtils.clamp(
      -frame.signedCurvature * 0.0042 * preset.apexPrecision,
      -0.0056,
      0.0056
    );
    if (aiState.currentLapTime < 2.2 && aiState.lapCount === 1) {
      // Hold right lane right after launch so AI doesn't immediately cut across player's nose
      targetLat = 0.0036;
    }

    // Gentle side-by-side avoidance if right next to player on the track
    const dsToPlayer = Math.abs(
      ((aiState.s - playerState.s + totalLength * 1.5) % totalLength) - totalLength * 0.5
    );
    if (dsToPlayer < 0.018) {
      const latDiff = aiState.lateralOffset - playerState.lateralOffset;
      if (Math.abs(latDiff) < 0.0052) {
        const pushDir = latDiff >= 0 ? 1 : -1;
        targetLat = THREE.MathUtils.clamp(
          playerState.lateralOffset + pushDir * 0.0055,
          -0.0072,
          0.0072
        );
      }
    }

    const latErr = targetLat - aiState.lateralOffset;
    const steerCmd = THREE.MathUtils.clamp(latErr * 28.0, -0.42, 0.42);
    aiState.lateralOffset = THREE.MathUtils.lerp(
      aiState.lateralOffset,
      targetLat,
      1.0 - Math.exp(-5.5 * dt)
    );
    aiState.headingYaw = THREE.MathUtils.lerp(
      aiState.headingYaw,
      THREE.MathUtils.clamp(-steerCmd * 0.32, -0.18, 0.18),
      1.0 - Math.exp(-10.0 * dt)
    );
    aiState.steerAngle = -steerCmd * 0.45;

    // Drift visual sparks in tight corners on Medium & Hard
    if (curvatureAbs > 0.55 && aiState.speed > 0.12 && currentDifficulty !== 'normal') {
      aiState.isDrifting = true;
      aiState.driftDir = Math.sign(frame.signedCurvature) || 1;
      aiState.driftAngle = THREE.MathUtils.lerp(
        aiState.driftAngle,
        -aiState.driftDir * 0.18,
        1.0 - Math.exp(-8.0 * dt)
      );
    } else {
      aiState.isDrifting = false;
      aiState.driftDir = 0;
      aiState.driftAngle = THREE.MathUtils.lerp(aiState.driftAngle, 0.0, 1.0 - Math.exp(-9.0 * dt));
    }

    // Advance along spline
    const prevProgress = aiState.trackProgress;
    const ds = aiState.speed * dt;
    aiState.s = ((aiState.s + ds) % totalLength + totalLength) % totalLength;

    const currProgress = computeNormalizedTrackProgress(aiState.s);
    aiState.trackProgress = currProgress;

    // Update 3-sector checkpoints so finish-line detection is 100% reliable
    if (currProgress >= 0.15 && currProgress <= 0.42) {
      aiState.lapCheckpointsMask |= 1;
    } else if (currProgress > 0.42 && currProgress <= 0.70) {
      aiState.lapCheckpointsMask |= 2;
    } else if (currProgress > 0.70 && currProgress <= 0.96) {
      aiState.lapCheckpointsMask |= 4;
    }

    // Check Finish Line crossing (wrapped from > 0.75 to < 0.30 with all 3 checkpoints passed)
    if (
      aiState.lapCheckpointsMask === 7 &&
      prevProgress > 0.72 &&
      currProgress < 0.35 &&
      aiState.currentLapTime > 3.0
    ) {
      aiState.lastLapTime = aiState.currentLapTime;
      if (aiState.bestLapTime === null || aiState.lastLapTime < aiState.bestLapTime) {
        aiState.bestLapTime = aiState.lastLapTime;
      }
      aiState.currentLapTime = 0.0;
      aiState.lapCheckpointsMask = 0;

      if (aiState.lapCount < aiState.targetLaps) {
        const doneLap = aiState.lapCount;
        aiState.lapCount += 1;
        if (onAiLapComplete) {
          onAiLapComplete(doneLap, aiState.lastLapTime, currentDifficulty);
        }
      } else {
        aiState.finished = true;
        aiState.finishTime = aiState.totalRaceTime;
        aiState.trackProgress = 1.0;
        if (tagSprite && tagSprite.userData.updateBadge) {
          tagSprite.userData.updateBadge(currentDifficulty, '🏁 FINISHED!');
        }
        if (onAiFinish) {
          onAiFinish(aiState.finishTime, aiState.bestLapTime, currentDifficulty);
        }
      }
    }

    aiState.totalProgress = aiState.finished
      ? aiState.targetLaps
      : (aiState.lapCount - 1) + (aiState.lapCheckpointsMask === 0 && currProgress > 0.85 ? 0.0 : currProgress);

    // Update floating nametag progress every 0.5s
    const secNow = Math.floor(aiState.totalRaceTime * 2);
    if (secNow !== lastBadgeUpdateSec && !aiState.finished) {
      lastBadgeUpdateSec = secNow;
      const pct = Math.min(99, Math.max(0, Math.round((aiState.totalProgress / Math.max(1, aiState.targetLaps)) * 100)));
      if (tagSprite && tagSprite.userData.updateBadge) {
        tagSprite.userData.updateBadge(currentDifficulty, `${pct}% · LAP ${aiState.lapCount}/${aiState.targetLaps}`);
      }
    }

    syncAiTransformFromSpline();
    aiKart.updateWheels(dt, aiState.speed, aiState.steerAngle);
    aiKart.updateKartVisuals(dt, aiState);
  }

  function shortestAngle(fromRad, toRad) {
    let d = ((toRad - fromRad + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  function updateHouseFreeRoamAi(dt) {
    if (!houseRoamersGroup.visible) return;
    const preset = AI_DIFFICULTY_PRESETS[currentDifficulty] || AI_DIFFICULTY_PRESETS.normal;
    const isCity = activePlayMode === 'city';
    const wpList = isCity ? CITY_WAYPOINTS : HOUSE_WAYPOINTS;
    const targetBotSpeed = (isCity ? 0.195 : 0.11) + (preset.topSpeed - 0.14) * 0.85;
    const worldColliderRef = activeOpenWorldRef || giantHouse;

    for (let i = 0; i < houseAiBots.length; i++) {
      const b = houseAiBots[i];
      const wp = wpList[b.targetWp] || wpList[0];
      const dx = wp.x - b.x;
      const dz = wp.z - b.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 0.32) {
        const neighbors = wp.neighbors || [0];
        const pool = neighbors.filter((nId) => nId !== b.currentWp);
        const choices = pool.length > 0 ? pool : neighbors;
        b.currentWp = b.targetWp;
        b.targetWp = choices[Math.floor(Math.random() * choices.length)];
      }

      const desiredYaw = Math.atan2(dz, dx);
      const dYaw = shortestAngle(b.yaw, desiredYaw);
      b.yaw += THREE.MathUtils.clamp(dYaw, -3.5 * dt, 3.5 * dt);
      b.speed = THREE.MathUtils.lerp(b.speed, targetBotSpeed, 1.0 - Math.exp(-6.0 * dt));

      const prevX = b.x;
      const prevZ = b.z;
      let nextX = prevX + Math.cos(b.yaw) * b.speed * 4.2 * dt;
      let nextZ = prevZ + Math.sin(b.yaw) * b.speed * 4.2 * dt;

      if (worldColliderRef && worldColliderRef.resolveCollisions) {
        const col = worldColliderRef.resolveCollisions(prevX, prevZ, nextX, nextZ, b.y, 0.052);
        nextX = col.x;
        nextZ = col.z;
        if (col.hit) {
          const slideYaw = Math.atan2(col.nz, col.nx);
          b.yaw += shortestAngle(b.yaw, slideYaw) * Math.min(1.0, 9.0 * dt);
          b.stuckTimer += dt;
          if (b.stuckTimer > 0.6) {
            b.stuckTimer = 0.0;
            b.yaw += Math.PI * 0.5;
          }
        } else {
          b.stuckTimer = Math.max(0.0, b.stuckTimer - dt);
        }
      }

      b.x = nextX;
      b.z = nextZ;
      b.kart.kartRoot.position.set(b.x, b.y, b.z);
      b.kart.kartRoot.quaternion.setFromAxisAngle(_yAxis, -b.yaw + Math.PI * 0.5);
      if (b.kart.updateWheels) {
        b.kart.updateWheels(dt, b.speed, dYaw * 0.8);
      }
    }
  }

  function update(dt, playerState, playMode = 'track') {
    if (playMode === 'track') {
      updateTrackAi(dt, playerState);
    } else if (playMode === 'freeroam' || playMode === 'city') {
      updateHouseFreeRoamAi(dt);
    }
  }

  function getMinimapMarkers(playMode = 'track') {
    if (playMode === 'track' && enabledInTrack) {
      const preset = AI_DIFFICULTY_PRESETS[currentDifficulty] || AI_DIFFICULTY_PRESETS.normal;
      return [
        {
          id: 'ai_track_rival',
          name: `AI (${preset.label})`,
          x: aiState.position.x,
          y: aiState.position.y,
          z: aiState.position.z,
          yaw: Math.atan2(aiState.tangent.z, aiState.tangent.x),
          color: preset.tagColor,
        },
      ];
    }
    if ((playMode === 'freeroam' || playMode === 'city') && enabledInHouseRoam) {
      return houseAiBots.map((b) => ({
        id: b.id,
        name: b.name,
        x: b.x,
        y: b.y,
        z: b.z,
        yaw: b.yaw,
        color: b.colorHex,
      }));
    }
    return [];
  }

  // Initialize default difficulty livery and grid position
  setDifficulty('normal');
  resetAiRacer();

  return {
    aiState,
    aiKart,
    aiRootGroup,
    houseRoamersGroup,
    setDifficulty,
    getDifficulty: () => currentDifficulty,
    resetAiRacer,
    syncScaleForCamera,
    setModeVisibility,
    update,
    getMinimapMarkers,
    getStartFinishInfo: () => ({
      startFinishIdx,
      startFinishArc,
      position: samples[startFinishIdx] ? samples[startFinishIdx].position : [0.0183, 0.035, 0.255],
      tangent: samples[startFinishIdx] ? samples[startFinishIdx].tangent : [-1, 0, 0],
      right: samples[startFinishIdx] ? samples[startFinishIdx].right : [0, 0, -1],
    }),
  };
}
