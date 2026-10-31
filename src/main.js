import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { buildProceduralDeskDiorama } from './scene/DeskDioramaBuilder.js';
import { buildCoasterTrack } from './scene/CoasterTrackBuilder.js';
import { buildMicroKart } from './scene/MicroKartBuilder.js';
import { buildGoldenHourAtmosphere } from './scene/GoldenHourAtmosphere.js';
import { buildRoomEnvironment } from './scene/RoomEnvironmentBuilder.js';
import { buildGiantHouseWorld } from './scene/GiantHouseBuilder.js';
import { createProceduralPMREMEnvironment } from './scene/ProceduralTextures.js';
import { createKartPhysicsController } from './physics/KartPhysicsController.js';
import { createWebAudioSynth } from './audio/WebAudioSynth.js';

async function initApp() {
  const widescreenStage = document.getElementById('widescreen-stage');
  const container = document.getElementById('canvas-container');

  function getStageDimensions() {
    if (widescreenStage) {
      const rect = widescreenStage.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return { width: Math.round(rect.width), height: Math.round(rect.height) };
      }
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.min(vw, Math.round((vh * 16) / 9));
    const h = Math.min(vh, Math.round((vw * 9) / 16));
    return { width: Math.max(320, w), height: Math.max(180, h) };
  }

  // -------------------------------------------------------------------------
  // 1. THREE.JS SCENE & MOBILE-OPTIMIZED HIGH-PERFORMANCE 16:9 RENDERER
  // -------------------------------------------------------------------------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x181312);
  scene.fog = new THREE.FogExp2(0x181312, 0.14);

  const initDims = getStageDimensions();
  const camera = new THREE.PerspectiveCamera(
    54,
    16 / 9,
    0.002, // 2mm near plane for 1:87 HO micro-scale closeups!
    4.2    // Shortened far plane with matching fog so distant objects are culled on mobile GPUs
  );

  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
  renderer.setSize(initDims.width, initDims.height);
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  const urlParams = new URLSearchParams(window.location.search);
  const isScreenshotUrl = urlParams.get('screenshot') === '1';
  const isScreenshotMode = isScreenshotUrl;

  // Immediately initialize Welcome Button warmup state & grab keyboard focus into the iframe
  // so pressing Enter never triggers a parent-frame toolbar Reload button or flashes prematurely
  const earlyBtnWelcomeStart = document.getElementById('btn-welcome-start');
  const earlyWelcomeStartText = document.getElementById('welcome-start-text');
  const earlyWelcomeEnterKbd = document.getElementById('welcome-enter-kbd');
  const earlyWelcomeProgressFill = document.getElementById('welcome-btn-progress-fill');
  if (!isScreenshotMode && earlyBtnWelcomeStart) {
    earlyBtnWelcomeStart.classList.add('is-warming-up');
    if (earlyWelcomeProgressFill) earlyWelcomeProgressFill.style.width = '8%';
    if (earlyWelcomeStartText) earlyWelcomeStartText.textContent = 'PREPARING CIRCUIT...';
    if (earlyWelcomeEnterKbd) earlyWelcomeEnterKbd.textContent = '8%';
    try {
      window.focus();
      earlyBtnWelcomeStart.focus({ preventScroll: true });
    } catch (_e) {
      // Ignore cross-origin focus restrictions
    }
  }

  renderer.shadowMap.enabled = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.68 + 0.08 * 1.15;
  container.appendChild(renderer.domElement);

  // Procedural PMREMGenerator environment map so PBR metals, glass, marble, and screens
  // have realistic specular reflections at zero per-frame cost
  scene.environment = createProceduralPMREMEnvironment(renderer);
  scene.environmentIntensity = 0.72;

  const bloomPass = null;
  const bokehPass = { enabled: false, uniforms: null };

  const orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.06;
  orbitControls.minDistance = 0.015;
  orbitControls.maxDistance = 2.2;
  orbitControls.target.set(0.0, 0.075, -0.03);
  orbitControls.enabled = false;

  // -------------------------------------------------------------------------
  // 2. FETCH MANIFEST & 720-SAMPLE C2 PERIODIC TRACK SPLINE JSON
  // -------------------------------------------------------------------------
  const [manifestRes, splineRes] = await Promise.all([
    fetch('/assets/data/desk_manifest.json'),
    fetch('/assets/data/track_spline.json'),
  ]);
  const manifest = await manifestRes.json();
  const splineData = await splineRes.json();

  // Sector lookup map
  const sectorNames = {};
  for (const sec of splineData.sectors || []) {
    sectorNames[sec.id] = sec.name;
  }

  // -------------------------------------------------------------------------
  // 3. BUILD WARM NIGHT-TIME ATMOSPHERE, DESK MONUMENTS, COASTER TRACK, 1:87 KART & GIANT HOUSE
  // -------------------------------------------------------------------------
  const settings = {
    sunIntensity: 0.0,
    sunbeamIntensity: 0.0,
    lampIntensity: 1.15,
    trackGlowIntensity: 1.00,
    micGlowIntensity: 0.85,
    bloomStrength: 0.06,
    dofStrength: 0.35,
    toneMappingExposure: 0.68 + 0.08 * 1.15,
    showDustMotes: false,
    droneKartScale: false,
    panoKart100: true,
  };
  scene.environmentIntensity = 0.68 + 0.55 * settings.sunIntensity;

  const atmosphere = buildGoldenHourAtmosphere(scene);
  const diorama = buildProceduralDeskDiorama(manifest);
  scene.add(diorama.root);
  if (diorama.nightGlowGroup) {
    scene.add(diorama.nightGlowGroup);
  }

  const roomEnv = buildRoomEnvironment(scene, settings);
  scene.add(roomEnv.roomRoot);

  const coaster = buildCoasterTrack(splineData);
  scene.add(coaster.trackGroup);
  if (coaster.underTrackLedGroup) {
    scene.add(coaster.underTrackLedGroup);
  }
  scene.add(coaster.debugGroup);

  // Build Mode 2: Giant House Open World (14 Connected Rooms & Stunt Ramps)
  const giantHouse = buildGiantHouseWorld();
  giantHouse.houseGroup.visible = false;
  scene.add(giantHouse.houseGroup);

  const microKart = buildMicroKart();
  microKart.kartRoot.scale.setScalar(0.38);
  scene.add(microKart.kartRoot);
  if (microKart.sparkPoints) {
    scene.add(microKart.sparkPoints);
  }

  let activeGameMode = 'track'; // 'track' (Neon Track Racing) | 'house' (Giant House Open World)
  let activeCameraMode = 1; // 1: Close Chase, 2: Far Chase, 3: Hood/Cockpit, 4: Top-Down Heli

  function syncKartScaleForCamera(mode) {
    if (activeGameMode === 'house') {
      // RC Car scale inside the 14-Room Giant House Open World
      microKart.kartRoot.scale.setScalar(3.6);
      return;
    }
    const isClose = mode === 1 || mode === 3;
    const isFarChase = mode === 2;
    const targetScale = isClose
      ? 0.38
      : isFarChase
        ? 0.46
        : settings.panoKart100
          ? 1.00
          : settings.droneKartScale
            ? 0.78
            : 0.58;
    microKart.kartRoot.scale.setScalar(targetScale);
  }

  // Helper to free GPU geometry and material buffers of hidden procedural fallback groups once a GLB replaces them
  function disposeGroupGeometries(group) {
    if (!group) return;
    group.traverse((child) => {
      if (child.isMesh && child.geometry) {
        child.geometry.dispose();
      }
    });
  }

  // Enforces shadow-free rendering and frustum culling across the hierarchy while preserving
  // rich THREE.MeshStandardMaterial & THREE.MeshPhysicalMaterial PBR reflections and bump/roughness maps.
  function optimizeSceneHierarchyForMobile(rootObj) {
    if (!rootObj) return;
    rootObj.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = false;
      child.receiveShadow = false;
      if (
        !child.isInstancedMesh &&
        child.name !== 'KartDriftSparks' &&
        child.name !== 'GoldenHourDustMotes'
      ) {
        child.frustumCulled = true;
      }
      if (child.geometry && !child.geometry.boundingSphere) {
        child.geometry.computeBoundingSphere();
      }
    });
  }

  optimizeSceneHierarchyForMobile(scene);

  // Optional GLB Loader (Hybrid Architecture: seamlessly loads GLBs if/when present)
  const gltfLoader = new GLTFLoader();
  const loadedGlbStatus = {
    desk: false,
    track: false,
    kart: false,
    room: false,
  };
  const loadingGlbInProgress = {
    desk: false,
    track: false,
    kart: false,
    room: false,
  };
  const glbContainerGroup = new THREE.Group();
  glbContainerGroup.name = 'LoadedGLBAssetsGroup';
  scene.add(glbContainerGroup);

  const highPolyRoomFurnitureNodes = [];

  function sync1PRoomAndCurtainVisibility(mode) {
    const is1P = mode === 1 || mode === 2 || mode === 3;
    for (const node of highPolyRoomFurnitureNodes) {
      node.visible = activeGameMode === 'track';
    }
    if (roomEnv.roomContactAoGroup) {
      roomEnv.roomContactAoGroup.visible = activeGameMode === 'track';
    }
    if (atmosphere.godRayCurtainGroup) {
      atmosphere.godRayCurtainGroup.visible = activeGameMode === 'track' && !is1P;
    }
  }

  function updateGlbBadge() {
    const badge = document.getElementById('glb-status-badge');
    if (!badge) return;
    const count =
      (loadedGlbStatus.desk ? 1 : 0) +
      (loadedGlbStatus.track ? 1 : 0) +
      (loadedGlbStatus.kart ? 1 : 0) +
      (loadedGlbStatus.room ? 1 : 0);
    if (count === 4) {
      badge.textContent = '4/4 GLB + HYBRID SHADERS ACTIVE';
    } else if (count > 0) {
      badge.textContent = `${count}/4 GLB + PROCEDURAL HYBRID`;
    } else {
      badge.textContent = 'HYBRID PROCEDURAL + GLB READY';
    }
  }

  let glbPollInterval = null;
  const settledGlbStatus = {
    desk: false,
    track: false,
    kart: false,
    room: false,
  };
  const glbDownloadProgress = {
    desk: 0.0,
    track: 0.0,
    kart: 0.0,
    room: 0.0,
  };
  const expectedGlbBytes = {
    desk: 4185040,
    track: 5303580,
    kart: 197544,
    room: 4537988,
  };
  let audioPreloadProgress = 0.0;
  let isCircuitReady = isScreenshotMode;
  let pendingRaceStartAfterWarmup = false;
  let onCircuitWarmupProgressCallback = null;
  let onCircuitReadyCallback = null;

  const texPropNames = [
    'map',
    'normalMap',
    'roughnessMap',
    'metalnessMap',
    'emissiveMap',
    'aoMap',
    'alphaMap',
    'lightMap',
    'bumpMap',
    'envMap',
  ];
  const initializedTextures = new Set();

  function tryInitTex(tex) {
    if (tex && tex.isTexture && !initializedTextures.has(tex)) {
      initializedTextures.add(tex);
      try {
        renderer.initTexture(tex);
      } catch (_e) {
        // Ignore fallback texture init warnings
      }
    }
  }

  function initObjectTextures(rootObj) {
    if (isScreenshotMode || !rootObj) return;
    rootObj.traverse((obj) => {
      if (!obj.material) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of mats) {
        if (!mat) continue;
        for (const prop of texPropNames) {
          if (mat[prop]) tryInitTex(mat[prop]);
        }
        if (mat.uniforms) {
          for (const uKey of Object.keys(mat.uniforms)) {
            const uVal = mat.uniforms[uKey] && mat.uniforms[uKey].value;
            if (uVal && uVal.isTexture) tryInitTex(uVal);
          }
        }
      }
    });
  }

  initObjectTextures(giantHouse.houseGroup);

  /**
   * Forces WebGL to upload all textures, vertex/index buffers (VBOs/IBOs), and compile + link
   * all active shader variants across all 360° sectors of the desk & room using a single
   * lightweight 64x64 off-screen render pass with frustum culling temporarily disabled.
   * Restores 100.0% of scene/camera state so Lap 1 has zero stutters and zero GPU spike.
   */
  function warmUpSceneOnGpu() {
    if (isScreenshotMode) return;
    let warmupTarget = null;
    try {
      if (scene.environment) {
        tryInitTex(scene.environment);
      }

      const prevSparkVis = microKart.sparkPoints ? microKart.sparkPoints.visible : true;
      if (microKart.sparkPoints) {
        microKart.sparkPoints.visible = true;
      }

      const tempShownObjects = [];
      if (microKart.chassisGroup) {
        microKart.chassisGroup.traverse((c) => {
          if (c.userData && c.userData.jetMat && !c.visible) {
            tempShownObjects.push(c);
            c.visible = true;
          }
        });
      }
      if (atmosphere.godRayCurtainGroup && !atmosphere.godRayCurtainGroup.visible) {
        tempShownObjects.push(atmosphere.godRayCurtainGroup);
        atmosphere.godRayCurtainGroup.visible = true;
      }
      if (giantHouse.houseGroup && !giantHouse.houseGroup.visible) {
        tempShownObjects.push(giantHouse.houseGroup);
        giantHouse.houseGroup.visible = true;
      }
      const isCountdownCurrentlyActive =
        typeof f1CountdownState !== 'undefined' && f1CountdownState && f1CountdownState.active;
      if (coaster.setF1StartLights && !isCountdownCurrentlyActive) {
        coaster.setF1StartLights(5);
      }

      const savedFrustumCulled = new Map();
      const prepareActiveTree = (rootObj) => {
        if (!rootObj || !rootObj.visible) return;
        savedFrustumCulled.set(rootObj, rootObj.frustumCulled);
        rootObj.frustumCulled = false;

        if (rootObj.material) {
          const mats = Array.isArray(rootObj.material) ? rootObj.material : [rootObj.material];
          for (const mat of mats) {
            if (!mat) continue;
            for (const prop of texPropNames) {
              if (mat[prop]) tryInitTex(mat[prop]);
            }
            if (mat.uniforms) {
              for (const uKey of Object.keys(mat.uniforms)) {
                const uVal = mat.uniforms[uKey] && mat.uniforms[uKey].value;
                if (uVal && uVal.isTexture) tryInitTex(uVal);
              }
            }
          }
        }

        if (rootObj.children) {
          for (let i = 0; i < rootObj.children.length; i++) {
            prepareActiveTree(rootObj.children[i]);
          }
        }
      };

      prepareActiveTree(scene);

      const prevTarget = renderer.getRenderTarget();
      const prevAutoClear = renderer.autoClear;

      warmupTarget = new THREE.WebGLRenderTarget(64, 64);
      renderer.setRenderTarget(warmupTarget);
      renderer.autoClear = true;
      renderer.render(scene, camera);

      for (const [obj, wasCulled] of savedFrustumCulled.entries()) {
        obj.frustumCulled = wasCulled;
      }
      for (const obj of tempShownObjects) {
        obj.visible = false;
      }
      if (microKart.sparkPoints) {
        microKart.sparkPoints.visible = prevSparkVis;
      }
      if (coaster.setF1StartLights && !isCountdownCurrentlyActive) {
        coaster.setF1StartLights(0);
      }
      sync1PRoomAndCurtainVisibility(activeCameraMode);

      renderer.autoClear = prevAutoClear;
      renderer.setRenderTarget(prevTarget);
    } catch (err) {
      console.warn('GPU warmup warning:', err);
    } finally {
      if (warmupTarget) {
        warmupTarget.dispose();
      }
    }
  }

  function notifyWarmupProgress() {
    if (onCircuitWarmupProgressCallback) {
      onCircuitWarmupProgressCallback();
    }
  }

  function checkCircuitReady() {
    if (isCircuitReady) return;
    if (
      settledGlbStatus.desk &&
      settledGlbStatus.track &&
      settledGlbStatus.kart &&
      settledGlbStatus.room
    ) {
      warmUpSceneOnGpu();
      isCircuitReady = true;
      if (onCircuitReadyCallback) {
        onCircuitReadyCallback();
      }
    }
  }

  const REMOTE_GLB_BASE_URL = 'https://www.gstatic.com/aistudio/starter-apps/desk-racer/models';
  const PROXY_GLB_BASE_URL = '/api/gstatic-models';
  const ASSETS_GLB_BASE_URL = '/assets/models';

  function tryLoadGlbAsset(fileName, key, onLoaded) {
    if (loadedGlbStatus[key] || loadingGlbInProgress[key]) return;
    loadingGlbInProgress[key] = true;

    const candidateUrls = [
      `${ASSETS_GLB_BASE_URL}/${fileName}`,
      `${PROXY_GLB_BASE_URL}/${fileName}`,
      `${REMOTE_GLB_BASE_URL}/${fileName}`,
    ];

    const handleLoaded = (gltf) => {
      loadingGlbInProgress[key] = false;
      if (loadedGlbStatus[key]) return;
      loadedGlbStatus[key] = true;
      settledGlbStatus[key] = true;
      glbDownloadProgress[key] = 1.0;
      gltf.scene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = false;
          child.receiveShadow = false;
        }
      });
      try {
        onLoaded(gltf.scene);
        optimizeSceneHierarchyForMobile(gltf.scene);
        initObjectTextures(gltf.scene);
      } catch (err) {
        console.error(`GLB onLoaded warning for ${key}:`, err);
      }
      if (atmosphere.requestShadowMapUpdate) {
        atmosphere.requestShadowMapUpdate();
      }
      updateGlbBadge();
      notifyWarmupProgress();
      if (
        loadedGlbStatus.desk &&
        loadedGlbStatus.track &&
        loadedGlbStatus.kart &&
        loadedGlbStatus.room
      ) {
        if (glbPollInterval) {
          clearInterval(glbPollInterval);
          glbPollInterval = null;
        }
      }
      if (isCircuitReady) {
        warmUpSceneOnGpu();
      } else {
        checkCircuitReady();
      }
    };

    const handleProgress = (xhr) => {
      if (xhr && xhr.loaded > 0) {
        const totalBytes = xhr.total > 0 ? xhr.total : (expectedGlbBytes[key] || 4000000);
        glbDownloadProgress[key] = Math.min(0.95, xhr.loaded / totalBytes);
        notifyWarmupProgress();
      }
    };

    const loadFromCandidateIndex = (idx) => {
      if (idx >= candidateUrls.length) {
        console.warn(`GLB load fallback for ${key}`);
        loadingGlbInProgress[key] = false;
        settledGlbStatus[key] = true;
        glbDownloadProgress[key] = 1.0;
        notifyWarmupProgress();
        checkCircuitReady();
        return;
      }
      gltfLoader.load(
        candidateUrls[idx],
        handleLoaded,
        handleProgress,
        () => loadFromCandidateIndex(idx + 1)
      );
    };

    loadFromCandidateIndex(0);
  }

  function checkAndLoadGlbModels() {
    tryLoadGlbAsset('desk_props.glb', 'desk', (glbScene) => {
      if (diorama.calibrateDeskPropsGlb) {
        diorama.calibrateDeskPropsGlb(glbScene);
      }
      if (diorama.updateLightingMaterials) {
        diorama.updateLightingMaterials(settings.sunIntensity ?? 0.0, settings.lampIntensity ?? 1.15);
      }
      diorama.root.visible = false;
      disposeGroupGeometries(diorama.root);
      glbContainerGroup.add(glbScene);
    });
    tryLoadGlbAsset('track_coaster.glb', 'track', (glbScene) => {
      if (coaster.calibrateTrackCoasterGlb) {
        coaster.calibrateTrackCoasterGlb(glbScene);
      }
      coaster.trackGroup.visible = false;
      disposeGroupGeometries(coaster.trackGroup);
      glbContainerGroup.add(glbScene);
    });
    tryLoadGlbAsset('kart_1to87.glb', 'kart', (glbScene) => {
      microKart.attachGlbKart(glbScene);
      syncKartScaleForCamera(activeCameraMode);
    });
    tryLoadGlbAsset('room_environment.glb', 'room', (glbScene) => {
      if (roomEnv.calibrateRoomEnvironmentGlb) {
        roomEnv.calibrateRoomEnvironmentGlb(glbScene);
      }
      if (roomEnv.updateRoomLighting) {
        roomEnv.updateRoomLighting(settings.sunIntensity ?? 0.0, settings.lampIntensity ?? 1.15);
      }
      highPolyRoomFurnitureNodes.length = 0;
      glbScene.traverse((child) => {
        if (child.isMesh) {
          child.frustumCulled = true;
          if (child.geometry) {
            child.geometry.computeBoundingSphere();
          }
        }
        const n = (child.name || '').toLowerCase();
        if (
          n.includes('upholsteredbed') ||
          n.includes('boucledeskchair') ||
          n.includes('walnutdresser') ||
          n.includes('bedroomdoor')
        ) {
          highPolyRoomFurnitureNodes.push(child);
        }
      });
      roomEnv.proceduralRoomGroup.visible = false;
      disposeGroupGeometries(roomEnv.proceduralRoomGroup);
      glbContainerGroup.add(glbScene);
      sync1PRoomAndCurtainVisibility(activeCameraMode);
    });
  }

  const audioSynth = createWebAudioSynth();
  if (audioSynth.preload) {
    audioSynth.preload().finally(() => {
      audioPreloadProgress = 1.0;
      notifyWarmupProgress();
    });
  }

  checkAndLoadGlbModels();
  glbPollInterval = setInterval(checkAndLoadGlbModels, 10000);

  setTimeout(() => {
    if (!isCircuitReady) {
      settledGlbStatus.desk = true;
      settledGlbStatus.track = true;
      settledGlbStatus.kart = true;
      settledGlbStatus.room = true;
      checkCircuitReady();
    }
  }, 15000);

  // -------------------------------------------------------------------------
  // 4. INITIALIZE RAPIER3D WORLD & 60FPS BANKED COASTER + GIANT HOUSE CONTROLLER
  // -------------------------------------------------------------------------
  const physics = await createKartPhysicsController(
    splineData,
    manifest,
    coaster.roadGeo
  );
  physics.setGiantHouseWorld(giantHouse);

  let camShakeTimer = 0.0;
  let camShakeIntensity = 0.0;

  if (physics.onRailImpact) {
    physics.onRailImpact((severity = 0.7) => {
      if (audioSynth.playRailImpact) {
        audioSynth.playRailImpact(severity);
      }
      camShakeTimer = 0.18;
      camShakeIntensity = THREE.MathUtils.clamp(severity, 0.35, 1.0);
    });
  }

  // -------------------------------------------------------------------------
  // 5. CAMERA MODES (1-4 IN-GAME SWITCHER) & GAME MODE SWITCHER (TRACK vs GIANT HOUSE)
  // -------------------------------------------------------------------------
  const initSt = physics.state;
  const camCurrentPos = initSt.position
    .clone()
    .addScaledVector(initSt.tangent, -0.0154)
    .addScaledVector(initSt.normal, 0.0074);
  const camCurrentLookAt = initSt.position
    .clone()
    .addScaledVector(initSt.tangent, 0.024)
    .addScaledVector(initSt.normal, 0.0030);
  const camCurrentUp = new THREE.Vector3(0, 1, 0);
  const camForward = initSt.tangent.clone();
  const _camTargetForward = new THREE.Vector3();
  const _camDesiredPos = new THREE.Vector3();
  const _camDesiredLook = new THREE.Vector3();
  const _camBlendedUp = new THREE.Vector3();

  const visorOverlay = document.getElementById('helmet-visor-overlay');
  const hudCornerVignette = document.getElementById('hud-corner-vignette');
  const hudBrandLogo = document.getElementById('hud-brand-logo');
  const chkHideLogoEl = document.getElementById('chk-hide-logo');
  const hudBottomBar = document.querySelector('.hud-bottom-bar');
  const hudMinimapWidget = document.querySelector('.hud-minimap-widget');
  const hudSpeedoGauge = document.querySelector('.hud-speedo-gauge');
  const hudLapWidget = document.getElementById('hud-lap-widget');
  const hudHouseRoomBanner = document.getElementById('hud-house-room-banner');
  const hudHouseRoomName = document.getElementById('hud-house-room-name');
  const btnSwitchCamera = document.getElementById('btn-switch-camera');
  const hudCameraLabel = document.getElementById('hud-camera-label');
  const btnSwitchGameMode = document.getElementById('btn-switch-game-mode');
  const hudModeSwitchLabel = document.getElementById('hud-mode-switch-label');
  const btnModeTrack = document.getElementById('btn-mode-track');
  const btnModeHouse = document.getElementById('btn-mode-house');
  const camButtons = document.querySelectorAll('.cam-pill');

  const CAMERA_MODE_LABELS = {
    1: '1: CLOSE CHASE',
    2: '2: FAR CHASE',
    3: '3: HOOD / COCKPIT',
    4: '4: TOP-DOWN HELI',
  };

  sync1PRoomAndCurtainVisibility(activeCameraMode);

  function setCameraMode(rawMode) {
    const mode = rawMode === 6 ? 4 : rawMode;
    activeCameraMode = mode;
    sync1PRoomAndCurtainVisibility(mode);
    syncKartScaleForCamera(mode);
    if (microKart.setCockpitRoadOnly) {
      // Camera 3 is Hood / Cockpit First-Person Cam
      microKart.setCockpitRoadOnly(mode === 3);
    }
    if (diorama.setMonitorHighScoresVisible) {
      diorama.setMonitorHighScoresVisible(mode === 8);
    }
    if (hudBrandLogo) {
      const userHidLogo =
        (chkHideLogoEl && chkHideLogoEl.checked) || urlParams.get('hidelogo') === '1';
      hudBrandLogo.classList.toggle('hidden', userHidLogo || mode === 8);
    }

    const isHouse = activeGameMode === 'house';
    const targetNear = isHouse
      ? 0.006
      : mode === 5 || mode === 7 || mode === 8
        ? 0.0008
        : mode === 1 || mode === 2 || mode === 3
          ? 0.0018
          : 0.004;
    const targetFar = isHouse ? 13.5 : 4.2;
    const targetFov =
      mode === 1 ? 42.5 : mode === 2 ? 48.0 : mode === 3 ? 44.0 : mode === 4 ? 50.0 : 46.0;

    if (
      Math.abs(camera.near - targetNear) > 1e-6 ||
      Math.abs(camera.far - targetFar) > 1e-3 ||
      Math.abs(camera.fov - targetFov) > 1e-3
    ) {
      camera.near = targetNear;
      camera.far = targetFar;
      camera.fov = targetFov;
      camera.updateProjectionMatrix();
    }

    camButtons.forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.cam) === mode);
    });

    if (hudCameraLabel) {
      hudCameraLabel.textContent = CAMERA_MODE_LABELS[mode] || `CAM ${mode}`;
    }

    if (visorOverlay) {
      visorOverlay.classList.add('hidden');
    }

    // Keep racing HUD visible across all 4 gameplay camera angles (1..4)
    const hideRacingHud = mode > 4;
    if (hudCornerVignette) hudCornerVignette.classList.toggle('hidden', hideRacingHud);
    if (hudBottomBar) hudBottomBar.classList.toggle('hidden', hideRacingHud);
    if (hudMinimapWidget) hudMinimapWidget.classList.toggle('hidden', hideRacingHud);
    if (hudSpeedoGauge) hudSpeedoGauge.classList.toggle('hidden', hideRacingHud);
    if (hudLapWidget) {
      hudLapWidget.classList.toggle('hidden', hideRacingHud || activeGameMode === 'house');
    }
    if (hudHouseRoomBanner) {
      hudHouseRoomBanner.classList.toggle('hidden', hideRacingHud || activeGameMode !== 'house');
    }

    if (mode === 5) {
      orbitControls.enabled = true;
      orbitControls.maxDistance = 3.8;
      camera.up.set(0, 1, 0);
      camera.position.set(0.52, 0.22, 1.28);
      orbitControls.target.set(-0.52, -0.22, 0.34);
      orbitControls.update();
      camCurrentPos.copy(camera.position);
      camCurrentLookAt.copy(orbitControls.target);
    } else if (mode === 7) {
      orbitControls.enabled = true;
      orbitControls.maxDistance = 3.8;
      camera.up.set(0, 1, 0);
      camera.position.set(-1.86, 0.72, -0.18);
      orbitControls.target.set(0.18, -0.08, 1.28);
      orbitControls.update();
      camCurrentPos.copy(camera.position);
      camCurrentLookAt.copy(orbitControls.target);
    } else if (mode === 8) {
      orbitControls.enabled = true;
      orbitControls.minDistance = 0.003;
      orbitControls.maxDistance = 3.2;
      camera.up.set(0, 1, 0);
      camera.position.set(0.010, 0.265, 0.185);
      orbitControls.target.set(0.010, 0.258, -0.233);
      orbitControls.update();
      camCurrentPos.copy(camera.position);
      camCurrentLookAt.copy(orbitControls.target);
    } else {
      orbitControls.enabled = false;
      // Snap camera interpolation near target when switching between angles 1..4
      const st = physics.state;
      const scaleMult = activeGameMode === 'house' ? 7.2 : 1.0;
      if (mode === 1) {
        camCurrentPos
          .copy(st.position)
          .addScaledVector(st.tangent, -0.0154 * scaleMult)
          .addScaledVector(st.normal, 0.0074 * scaleMult);
        camCurrentLookAt
          .copy(st.position)
          .addScaledVector(st.tangent, 0.024 * scaleMult)
          .addScaledVector(st.normal, 0.003 * scaleMult);
      } else if (mode === 2) {
        camCurrentPos
          .copy(st.position)
          .addScaledVector(st.tangent, -0.032 * scaleMult)
          .addScaledVector(st.normal, 0.0165 * scaleMult);
        camCurrentLookAt
          .copy(st.position)
          .addScaledVector(st.tangent, 0.028 * scaleMult)
          .addScaledVector(st.normal, 0.004 * scaleMult);
      } else if (mode === 3) {
        camCurrentPos
          .copy(st.position)
          .addScaledVector(st.tangent, 0.0022 * scaleMult)
          .addScaledVector(st.normal, 0.0034 * scaleMult);
        camCurrentLookAt
          .copy(st.position)
          .addScaledVector(st.tangent, 0.032 * scaleMult)
          .addScaledVector(st.normal, 0.0026 * scaleMult);
      } else if (mode === 4) {
        camCurrentPos
          .copy(st.position)
          .addScaledVector(st.tangent, -0.055 * scaleMult)
          .addScaledVector(st.normal, 0.088 * scaleMult);
        camCurrentLookAt
          .copy(st.position)
          .addScaledVector(st.tangent, 0.018 * scaleMult);
      }
      camCurrentUp.set(0, 1, 0);
      camera.up.set(0, 1, 0);
      camera.position.copy(camCurrentPos);
      camera.lookAt(camCurrentLookAt);
    }
  }

  function cycleCameraMode() {
    const nextMode = activeCameraMode >= 4 ? 1 : activeCameraMode + 1;
    setCameraMode(nextMode);
  }

  if (btnSwitchCamera) {
    btnSwitchCamera.addEventListener('click', (e) => {
      e.stopPropagation();
      cycleCameraMode();
      btnSwitchCamera.blur();
    });
  }

  camButtons.forEach((btn) => {
    btn.addEventListener('click', () => setCameraMode(Number(btn.dataset.cam)));
  });

  function setActiveGameMode(nextMode) {
    const mode = nextMode === 'house' ? 'house' : 'track';
    activeGameMode = mode;
    const isHouse = mode === 'house';

    // Toggle 3D world groups between Mode 1 (Neon Track) and Mode 2 (Giant House Open World)
    giantHouse.houseGroup.visible = isHouse;
    diorama.root.visible = !isHouse && !loadedGlbStatus.desk;
    if (diorama.nightGlowGroup) diorama.nightGlowGroup.visible = !isHouse;
    roomEnv.roomRoot.visible = !isHouse;
    coaster.trackGroup.visible = !isHouse && !loadedGlbStatus.track;
    if (coaster.underTrackLedGroup) coaster.underTrackLedGroup.visible = !isHouse;
    coaster.debugGroup.visible = false;
    glbContainerGroup.visible = !isHouse;

    // Adjust scene background and fog for the spacious 14-Room Giant House vs cozy Neon Track
    if (isHouse) {
      scene.background.setHex(0x161c28);
      scene.fog.color.setHex(0x161c28);
      scene.fog.density = 0.042;
    } else {
      scene.background.setHex(0x181312);
      scene.fog.color.setHex(0x181312);
      scene.fog.density = 0.14;
    }

    cancelF1StartCountdown();
    hideFinishOverlay();
    hideLapSplit();
    physics.setGameMode(mode);

    // Sync HUD & Start Dialog Mode Selector UI
    if (hudModeSwitchLabel) {
      hudModeSwitchLabel.textContent = isHouse
        ? 'MODE: GIANT HOUSE (14 ROOMS)'
        : 'MODE: NEON TRACK';
    }
    if (btnSwitchGameMode) {
      btnSwitchGameMode.classList.toggle('is-house-mode', isHouse);
    }
    if (btnModeTrack) {
      btnModeTrack.classList.toggle('active', !isHouse);
      btnModeTrack.setAttribute('aria-pressed', !isHouse ? 'true' : 'false');
    }
    if (btnModeHouse) {
      btnModeHouse.classList.toggle('active', isHouse);
      btnModeHouse.setAttribute('aria-pressed', isHouse ? 'true' : 'false');
    }
    if (hudLapWidget) {
      hudLapWidget.classList.toggle('hidden', isHouse || activeCameraMode > 4);
    }
    if (hudHouseRoomBanner) {
      hudHouseRoomBanner.classList.toggle('hidden', !isHouse || activeCameraMode > 4);
    }
    if (hudHouseRoomName && physics.state.currentRoomName) {
      hudHouseRoomName.textContent = physics.state.currentRoomName;
    }

    syncKartScaleForCamera(activeCameraMode);
    setCameraMode(activeCameraMode);
    updateWelcomeWarmupUI();
    lastMinimapKx = -9999;
    lastMinimapKy = -9999;
    drawMinimapRadar(physics.state);
  }

  if (btnModeTrack) {
    btnModeTrack.addEventListener('click', (e) => {
      e.stopPropagation();
      setActiveGameMode('track');
    });
  }
  if (btnModeHouse) {
    btnModeHouse.addEventListener('click', (e) => {
      e.stopPropagation();
      setActiveGameMode('house');
    });
  }
  if (btnSwitchGameMode) {
    btnSwitchGameMode.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetMode = activeGameMode === 'track' ? 'house' : 'track';
      setActiveGameMode(targetMode);
      if (targetMode === 'house') {
        hideWelcomeDialog();
      }
      btnSwitchGameMode.blur();
    });
  }

  const heldNonDigitKeys = new Set();
  let lastNonDigitKeyTime = 0;

  window.addEventListener('keyup', (e) => {
    heldNonDigitKeys.delete(e.code);
  });

  window.addEventListener('blur', () => {
    heldNonDigitKeys.clear();
  });

  window.addEventListener('keydown', (e) => {
    if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName) && !e.target.readOnly) return;

    const isDigitKey = /^(Digit|Numpad)[1-9]$/.test(e.code);
    if (!isDigitKey) {
      heldNonDigitKeys.add(e.code);
      lastNonDigitKeyTime = performance.now();
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (e.code === 'KeyM') {
        const on = audioSynth.toggle();
        updateAudioButtonUI(on);
      } else if (e.code === 'KeyC' && !e.repeat) {
        cycleCameraMode();
      } else if (e.code === 'KeyG' && !e.repeat) {
        setActiveGameMode(activeGameMode === 'track' ? 'house' : 'track');
      }
      return;
    }

    if (!e.metaKey) {
      heldNonDigitKeys.delete('MetaLeft');
      heldNonDigitKeys.delete('MetaRight');
    }
    if (!e.shiftKey) {
      heldNonDigitKeys.delete('ShiftLeft');
      heldNonDigitKeys.delete('ShiftRight');
    }
    if (!e.ctrlKey) {
      heldNonDigitKeys.delete('ControlLeft');
      heldNonDigitKeys.delete('ControlRight');
    }
    if (!e.altKey) {
      heldNonDigitKeys.delete('AltLeft');
      heldNonDigitKeys.delete('AltRight');
    }

    if (
      e.metaKey ||
      e.ctrlKey ||
      e.altKey ||
      e.shiftKey ||
      e.repeat ||
      (e.getModifierState &&
        (e.getModifierState('Meta') ||
          e.getModifierState('Shift') ||
          e.getModifierState('Control') ||
          e.getModifierState('Alt') ||
          e.getModifierState('OS'))) ||
      heldNonDigitKeys.size > 0 ||
      performance.now() - lastNonDigitKeyTime < 300 ||
      !/^[12346]$/.test(e.key)
    ) {
      return;
    }

    const keyNum = Number(e.key);
    setCameraMode(keyNum === 6 ? 4 : keyNum);
  });

  function updateCamera(dt, elapsedTime, st) {
    if (
      activeCameraMode === 5 ||
      activeCameraMode === 7 ||
      activeCameraMode === 8
    ) {
      orbitControls.maxDistance = 3.8;
      camera.up.set(0, 1, 0);
      orbitControls.update();
      camera.position.x = THREE.MathUtils.clamp(camera.position.x, -2.02, 1.28);
      camera.position.y = THREE.MathUtils.clamp(camera.position.y, -0.64, 1.65);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, -0.30, 2.48);
      if (camera.position.x > 0.68 && camera.position.z < 1.46) {
        camera.position.x = 0.68;
      }
      camCurrentPos.copy(camera.position);
      camCurrentLookAt.copy(orbitControls.target);
      return;
    }

    // Compute kart-anchored forward unit vector
    if (activeGameMode === 'house') {
      _camTargetForward.copy(st.tangent).normalize();
    } else {
      _camTargetForward
        .copy(st.tangent)
        .applyAxisAngle(st.normal, (st.headingYaw || 0.0) * 0.40)
        .normalize();
    }
    camForward.copy(_camTargetForward);

    const carViewMode = urlParams.get('carview');
    if (carViewMode) {
      const stRight = _camDesiredPos.crossVectors(camForward, st.normal).normalize();
      if (carViewMode === 'front') {
        _camDesiredPos
          .copy(st.position)
          .addScaledVector(camForward, 0.0155)
          .addScaledVector(stRight, 0.0055)
          .addScaledVector(st.normal, 0.0082);
        _camDesiredLook
          .copy(st.position)
          .addScaledVector(camForward, 0.0005)
          .addScaledVector(st.normal, 0.0028);
      } else if (carViewMode === 'rear') {
        _camDesiredPos
          .copy(st.position)
          .addScaledVector(camForward, -0.0145)
          .addScaledVector(stRight, 0.0045)
          .addScaledVector(st.normal, 0.0072);
        _camDesiredLook
          .copy(st.position)
          .addScaledVector(camForward, -0.0012)
          .addScaledVector(st.normal, 0.0030);
      } else {
        _camDesiredPos
          .copy(st.position)
          .addScaledVector(camForward, 0.0110)
          .addScaledVector(stRight, -0.0115)
          .addScaledVector(st.normal, 0.0068);
        _camDesiredLook
          .copy(st.position)
          .addScaledVector(st.normal, 0.0028);
      }
      camera.up.copy(st.normal);
      camera.position.copy(_camDesiredPos);
      camera.lookAt(_camDesiredLook);
      return;
    }

    const scaleMult = activeGameMode === 'house' ? 7.2 : 1.0;

    // Subtle guardrail/wall impact camera shake
    let shakeRight = 0.0;
    let shakeUp = 0.0;
    if (camShakeTimer > 0.0 && !isScreenshotMode) {
      camShakeTimer = Math.max(0.0, camShakeTimer - dt);
      const shakeDecay = (camShakeTimer / 0.18) * camShakeIntensity;
      shakeRight = Math.sin(elapsedTime * 95.0) * 0.0008 * scaleMult * shakeDecay;
      shakeUp = Math.cos(elapsedTime * 125.0) * 0.0008 * scaleMult * shakeDecay;
    }

    if (activeCameraMode === 1) {
      // Angle 1: Default Close Chase Cam (Close behind the driver's helmet)
      _camDesiredPos
        .copy(st.position)
        .addScaledVector(camForward, -0.0154 * scaleMult)
        .addScaledVector(st.normal, 0.0074 * scaleMult + st.hopHeight * 0.38);
      if (shakeRight !== 0.0 || shakeUp !== 0.0) {
        _camDesiredPos
          .addScaledVector(st.right, shakeRight)
          .addScaledVector(st.normal, shakeUp);
      }

      _camDesiredLook
        .copy(st.position)
        .addScaledVector(camForward, 0.024 * scaleMult)
        .addScaledVector(st.normal, 0.0030 * scaleMult + st.hopHeight * 0.22);

      const smoothUp = isScreenshotMode ? 1.0 : 1.0 - Math.exp(-dt * 16.0);
      _camBlendedUp
        .set(0, 0.58, 0)
        .addScaledVector(st.normal, 0.42)
        .normalize();
      camCurrentUp.lerp(_camBlendedUp, smoothUp).normalize();

      if (activeGameMode === 'house') {
        const smoothFollow = isScreenshotMode ? 1.0 : 1.0 - Math.exp(-dt * 18.0);
        camCurrentPos.lerp(_camDesiredPos, smoothFollow);
        camCurrentLookAt.lerp(_camDesiredLook, smoothFollow);
      } else {
        camCurrentPos.copy(_camDesiredPos);
        camCurrentLookAt.copy(_camDesiredLook);
      }

      camera.up.copy(camCurrentUp);
      camera.position.copy(camCurrentPos);
      camera.lookAt(camCurrentLookAt);
    } else if (activeCameraMode === 2) {
      // Angle 2: Far Chase Cam (Higher and further back for a wider view of the car and environment)
      _camDesiredPos
        .copy(st.position)
        .addScaledVector(camForward, -0.032 * scaleMult)
        .addScaledVector(st.normal, 0.0165 * scaleMult + st.hopHeight * 0.45);
      if (shakeRight !== 0.0 || shakeUp !== 0.0) {
        _camDesiredPos
          .addScaledVector(st.right, shakeRight)
          .addScaledVector(st.normal, shakeUp);
      }

      _camDesiredLook
        .copy(st.position)
        .addScaledVector(camForward, 0.028 * scaleMult)
        .addScaledVector(st.normal, 0.0038 * scaleMult + st.hopHeight * 0.25);

      const smoothPos = isScreenshotMode ? 1.0 : 1.0 - Math.exp(-dt * 14.0);
      const smoothUp = isScreenshotMode ? 1.0 : 1.0 - Math.exp(-dt * 14.0);
      _camBlendedUp
        .set(0, 0.72, 0)
        .addScaledVector(st.normal, 0.28)
        .normalize();
      camCurrentUp.lerp(_camBlendedUp, smoothUp).normalize();
      camCurrentPos.lerp(_camDesiredPos, smoothPos);
      camCurrentLookAt.lerp(_camDesiredLook, smoothPos);

      camera.up.copy(camCurrentUp);
      camera.position.copy(camCurrentPos);
      camera.lookAt(camCurrentLookAt);
    } else if (activeCameraMode === 3) {
      // Angle 3: Hood / Cockpit First-Person Cam (View directly from the front of the car / driver's eye level)
      _camDesiredPos
        .copy(st.position)
        .addScaledVector(camForward, 0.0022 * scaleMult)
        .addScaledVector(st.normal, 0.0034 * scaleMult + st.hopHeight * 0.38);
      if (shakeRight !== 0.0 || shakeUp !== 0.0) {
        _camDesiredPos
          .addScaledVector(st.right, shakeRight)
          .addScaledVector(st.normal, shakeUp);
      }
      _camDesiredLook
        .copy(st.position)
        .addScaledVector(camForward, 0.032 * scaleMult)
        .addScaledVector(st.normal, 0.0026 * scaleMult);

      const smoothVisor = isScreenshotMode ? 1.0 : 1.0 - Math.exp(-dt * 24.0);
      camCurrentUp.lerp(st.normal, smoothVisor).normalize();

      camCurrentPos.copy(_camDesiredPos);
      camCurrentLookAt.copy(_camDesiredLook);

      camera.up.copy(camCurrentUp);
      camera.position.copy(_camDesiredPos);
      camera.lookAt(_camDesiredLook);
    } else if (activeCameraMode === 4 || activeCameraMode === 6) {
      // Angle 4: Top-Down / Helicopter Angled Cam (High overhead angled view following the car)
      if (activeGameMode === 'house') {
        _camDesiredPos
          .copy(st.position)
          .addScaledVector(camForward, -0.34)
          .add(new THREE.Vector3(0, 0.56, 0));
        _camDesiredLook
          .copy(st.position)
          .addScaledVector(camForward, 0.14);
      } else {
        const heliAngle = elapsedTime * 0.34;
        const desiredX = THREE.MathUtils.clamp(
          -0.04 + st.position.x * 0.38 + Math.cos(heliAngle) * 0.13,
          -0.26,
          0.24
        );
        const desiredY =
          0.252 +
          Math.sin(heliAngle * 2.0) * 0.011 +
          Math.max(0.0, st.position.y - 0.065) * 0.35;
        const desiredZ = THREE.MathUtils.clamp(
          Math.max(0.268, st.position.z + 0.135) + Math.sin(heliAngle) * 0.038,
          0.268,
          0.360
        );
        _camDesiredPos.set(desiredX, desiredY, desiredZ);
        _camDesiredLook.set(
          THREE.MathUtils.lerp(-0.015, st.position.x, 0.78),
          THREE.MathUtils.lerp(0.072, st.position.y + 0.01, 0.78),
          THREE.MathUtils.lerp(-0.045, st.position.z, 0.78)
        );
      }

      const smoothPos = isScreenshotMode ? 1.0 : 1.0 - Math.exp(-dt * 7.5);
      const smoothLook = isScreenshotMode ? 1.0 : 1.0 - Math.exp(-dt * 10.5);
      camCurrentPos.lerp(_camDesiredPos, smoothPos);
      camCurrentLookAt.lerp(_camDesiredLook, smoothLook);
      camera.up.set(0, 1, 0);
      camera.position.copy(camCurrentPos);
      camera.lookAt(camCurrentLookAt);
    } else if (activeCameraMode === 9) {
      const heliAngle = elapsedTime * 0.36;
      const kbCenterX = -0.12;
      const kbCenterZ = 0.255;
      const radiusX = 0.175;
      const radiusZ = 0.075;
      _camDesiredPos.set(
        kbCenterX + Math.cos(heliAngle) * radiusX,
        0.235 + Math.sin(heliAngle * 2.0) * 0.012,
        kbCenterZ + Math.sin(heliAngle) * radiusZ
      );
      _camDesiredLook.set(
        THREE.MathUtils.lerp(-0.02, st.position.x, 0.34),
        THREE.MathUtils.lerp(0.075, st.position.y + 0.012, 0.34),
        THREE.MathUtils.lerp(-0.055, st.position.z, 0.34)
      );
      const smoothPos = isScreenshotMode ? 1.0 : 1.0 - Math.exp(-dt * 6.0);
      const smoothLook = isScreenshotMode ? 1.0 : 1.0 - Math.exp(-dt * 7.5);
      camCurrentPos.lerp(_camDesiredPos, smoothPos);
      camCurrentLookAt.lerp(_camDesiredLook, smoothLook);
      camera.up.set(0, 1, 0);
      camera.position.copy(camCurrentPos);
      camera.lookAt(camCurrentLookAt);
    }
  }

  // -------------------------------------------------------------------------
  // 6. HUD TELEMETRY BINDINGS, TWEAKER CONTROLS & 2D SPLINE / 14-ROOM HOUSE RADAR
  // -------------------------------------------------------------------------
  const btnAutopilot = document.getElementById('btn-toggle-autopilot');
  const txtAutopilot = document.getElementById('autopilot-btn-text');
  const elDriveMode = document.getElementById('hud-drive-mode');

  function syncAutopilotUI(isAuto) {
    if (btnAutopilot) btnAutopilot.classList.toggle('autopilot-active', isAuto);
    if (txtAutopilot) {
      txtAutopilot.textContent = isAuto ? 'AI Coaster Cruise: ON' : 'Manual WASD Racing';
    }
    if (elDriveMode) {
      elDriveMode.textContent = isAuto
        ? 'COASTER AUTOPILOT'
        : 'MANUAL DRIVE — PRESS W / UP TO ACCELERATE';
      elDriveMode.classList.toggle('manual', !isAuto);
    }
  }

  physics.onModeChange(syncAutopilotUI);
  syncAutopilotUI(physics.state.autopilot);
  if (btnAutopilot) {
    btnAutopilot.addEventListener('click', () => {
      if (activeGameMode === 'house') return;
      physics.setAutopilot(!physics.state.autopilot);
    });
  }

  const btnAudio = document.getElementById('btn-toggle-audio');
  const txtAudio = document.getElementById('audio-btn-text');
  const chkEngineAudio = document.getElementById('chk-engine-audio');
  const btnMuteSound = document.getElementById('btn-mute-sound');
  const iconSoundOn = document.getElementById('icon-sound-on');
  const iconSoundOff = document.getElementById('icon-sound-off');
  function updateAudioButtonUI(on) {
    const enabled = Boolean(on);
    if (btnAudio) btnAudio.classList.toggle('autopilot-active', enabled);
    if (txtAudio)
      txtAudio.textContent = enabled ? 'Engine Audio: ON' : 'Engine Audio: OFF';
    if (chkEngineAudio) chkEngineAudio.checked = enabled;
    if (btnMuteSound) {
      btnMuteSound.classList.toggle('is-muted', !enabled);
      btnMuteSound.setAttribute('aria-pressed', enabled ? 'false' : 'true');
      btnMuteSound.title = enabled ? 'Mute Sound' : 'Unmute Sound';
    }
    if (iconSoundOn) iconSoundOn.classList.toggle('hidden', !enabled);
    if (iconSoundOff) iconSoundOff.classList.toggle('hidden', enabled);
  }
  if (btnAudio) {
    btnAudio.addEventListener('click', () => {
      const on = audioSynth.toggle();
      updateAudioButtonUI(on);
    });
  }
  if (btnMuteSound) {
    btnMuteSound.addEventListener('click', (e) => {
      e.stopPropagation();
      const on = audioSynth.toggle();
      updateAudioButtonUI(on);
      btnMuteSound.blur();
    });
  }
  if (chkEngineAudio) {
    chkEngineAudio.addEventListener('change', (e) => {
      const on = audioSynth.setEnabled(e.target.checked);
      updateAudioButtonUI(on);
    });
  }

  // Sector Teleport Buttons (①-⑥)
  document.querySelectorAll('.tp-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sec = Number(btn.dataset.sector);
      if (activeGameMode !== 'track') {
        setActiveGameMode('track');
      }
      physics.teleportToSector(sec);
    });
  });

  // Collapsible Top-Right Settings Popover (Toggled with Escape key)
  const btnSettingsCog = document.getElementById('btn-settings-cog');
  const settingsPopover = document.getElementById('settings-popover');
  if (settingsPopover) {
    if (btnSettingsCog) {
      btnSettingsCog.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = settingsPopover.classList.toggle('hidden');
        btnSettingsCog.classList.toggle('active', !isHidden);
      });
    }

    window.addEventListener('pointerdown', (e) => {
      if (
        !settingsPopover.classList.contains('hidden') &&
        !settingsPopover.contains(e.target) &&
        (!btnSettingsCog || !btnSettingsCog.contains(e.target))
      ) {
        settingsPopover.classList.add('hidden');
        if (btnSettingsCog) btnSettingsCog.classList.remove('active');
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        const isHidden = settingsPopover.classList.toggle('hidden');
        if (btnSettingsCog) btnSettingsCog.classList.toggle('active', !isHidden);
      }
    });
  }

  // Tweaker Sliders
  const sliderSun = document.getElementById('slider-sunbeams');
  const valSun = document.getElementById('val-sunbeams');
  if (sliderSun) {
    sliderSun.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      settings.sunIntensity = v;
      settings.sunbeamIntensity = v;
      scene.environmentIntensity = 0.08 + 0.55 * v;
      settings.toneMappingExposure = 0.68 + 0.08 * settings.lampIntensity + 0.14 * v;
      renderer.toneMappingExposure = settings.toneMappingExposure;
      if (valSun) valSun.textContent = `${v.toFixed(2)}x`;
      if (diorama.updateLightingMaterials) {
        diorama.updateLightingMaterials(v, settings.lampIntensity);
      }
      if (roomEnv.updateRoomLighting) {
        roomEnv.updateRoomLighting(v, settings.lampIntensity);
      }
    });
  }

  const sliderLamp = document.getElementById('slider-lamplight');
  const valLamp = document.getElementById('val-lamplight');
  if (sliderLamp) {
    sliderLamp.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      settings.lampIntensity = v;
      settings.toneMappingExposure = 0.68 + 0.08 * v + 0.14 * settings.sunIntensity;
      renderer.toneMappingExposure = settings.toneMappingExposure;
      if (valLamp) valLamp.textContent = `${v.toFixed(2)}x`;
      if (diorama.updateLightingMaterials) {
        diorama.updateLightingMaterials(settings.sunIntensity, v);
      }
      if (roomEnv.updateRoomLighting) {
        roomEnv.updateRoomLighting(settings.sunIntensity, v);
      }
    });
  }

  const sliderTrackGlow = document.getElementById('slider-trackglow');
  const valTrackGlow = document.getElementById('val-trackglow');
  if (sliderTrackGlow) {
    sliderTrackGlow.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      settings.trackGlowIntensity = v;
      if (valTrackGlow) valTrackGlow.textContent = `${v.toFixed(2)}x`;
      if (coaster.updateUnderTrackLed) {
        coaster.updateUnderTrackLed(clock.getElapsedTime(), v);
      }
    });
  }

  const sliderMic = document.getElementById('slider-micglow');
  const valMic = document.getElementById('val-micglow');
  if (sliderMic) {
    sliderMic.addEventListener('input', (e) => {
      settings.micGlowIntensity = parseFloat(e.target.value);
      if (valMic) valMic.textContent = `${settings.micGlowIntensity.toFixed(2)}x`;
      if (diorama.glbMicLedMaterials) {
        for (const m of diorama.glbMicLedMaterials) {
          m.emissiveIntensity = 1.15 * settings.micGlowIntensity;
        }
      } else if (diorama.micBlueLedRing) {
        diorama.micBlueLedRing.material.emissiveIntensity = 1.15 * settings.micGlowIntensity;
      }
    });
  }

  const sliderBloom = document.getElementById('slider-bloom');
  const valBloom = document.getElementById('val-bloom');
  if (sliderBloom) {
    sliderBloom.addEventListener('input', (e) => {
      settings.bloomStrength = parseFloat(e.target.value);
      if (bloomPass) bloomPass.strength = settings.bloomStrength;
      if (valBloom) valBloom.textContent = settings.bloomStrength.toFixed(2);
    });
  }

  const sliderFireLight = document.getElementById('slider-firelight');
  const valFireLight = document.getElementById('val-firelight');
  if (sliderFireLight) {
    sliderFireLight.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      if (microKart && typeof microKart.setFireLightMultiplier === 'function') {
        microKart.setFireLightMultiplier(v, true);
      }
      if (valFireLight) valFireLight.textContent = `${v.toFixed(2)}x`;
    });
  }

  const sliderDof = document.getElementById('slider-dof');
  const valDof = document.getElementById('val-dof');
  if (sliderDof) {
    sliderDof.addEventListener('input', (e) => {
      settings.dofStrength = parseFloat(e.target.value);
      if (valDof) valDof.textContent = `${settings.dofStrength.toFixed(2)}x`;
      if (bokehPass) bokehPass.enabled = false;
    });
  }

  const sliderSpeed = document.getElementById('slider-topspeed');
  const valSpeed = document.getElementById('val-topspeed');
  if (sliderSpeed) {
    sliderSpeed.addEventListener('input', (e) => {
      physics.state.topSpeedMultiplier = parseFloat(e.target.value);
      if (valSpeed) valSpeed.textContent = `${physics.state.topSpeedMultiplier.toFixed(2)}x`;
    });
  }

  const chkDebug = document.getElementById('chk-spline-debug');
  if (chkDebug) {
    chkDebug.addEventListener('change', (e) => {
      coaster.debugGroup.visible = e.target.checked && activeGameMode === 'track';
    });
  }

  const chkDust = document.getElementById('chk-dust-motes');
  if (chkDust) {
    chkDust.addEventListener('change', (e) => {
      settings.showDustMotes = e.target.checked;
    });
  }

  const chkDroneKartScale = document.getElementById('chk-drone-kart-scale');
  const chkPanoKart100 = document.getElementById('chk-pano-kart-100');
  if (chkDroneKartScale) {
    chkDroneKartScale.addEventListener('change', (e) => {
      settings.droneKartScale = e.target.checked;
      if (settings.droneKartScale) {
        settings.panoKart100 = false;
        if (chkPanoKart100) chkPanoKart100.checked = false;
      }
      syncKartScaleForCamera(activeCameraMode);
    });
  }
  if (chkPanoKart100) {
    chkPanoKart100.addEventListener('change', (e) => {
      settings.panoKart100 = e.target.checked;
      if (settings.panoKart100) {
        settings.droneKartScale = false;
        if (chkDroneKartScale) chkDroneKartScale.checked = false;
      }
      syncKartScaleForCamera(activeCameraMode);
    });
  }

  const chkHideLogo = document.getElementById('chk-hide-logo');
  const elBrandLogo = document.getElementById('hud-brand-logo');
  if (chkHideLogo && elBrandLogo) {
    if (urlParams.get('hidelogo') === '1') {
      chkHideLogo.checked = true;
      elBrandLogo.classList.add('hidden');
    }
    chkHideLogo.addEventListener('change', (e) => {
      elBrandLogo.classList.toggle('hidden', e.target.checked);
    });
  }

  const chkDofNearest = document.getElementById('chk-dof-nearest');
  settings.dofFocusNearest = urlParams.get('doffocus') === 'nearest';
  if (chkDofNearest) {
    chkDofNearest.checked = settings.dofFocusNearest;
    chkDofNearest.addEventListener('change', (e) => {
      settings.dofFocusNearest = e.target.checked;
    });
  }

  const btnReloadGlb = document.getElementById('btn-reload-glb');
  if (btnReloadGlb) {
    btnReloadGlb.addEventListener('click', () => {
      loadedGlbStatus.desk = false;
      loadedGlbStatus.track = false;
      loadedGlbStatus.kart = false;
      loadedGlbStatus.room = false;
      checkAndLoadGlbModels();
    });
  }

  // Initialize Sleek Angled 18-Segment Speedometer Bar
  const ticksGroup = document.getElementById('speedo-ticks-group');
  const speedoCasing = document.getElementById('speedo-bar-casing');
  const speedoSegEls = [];
  const SPEEDO_SEG_COLORS = [
    '#ffffff',
    '#ffffff',
    '#ffffff',
    '#ffffff',
    '#ffffff',
    '#f6feff',
    '#e8fcff',
    '#d4f9ff',
    '#bcf5ff',
    '#a0f1ff',
    '#82ecff',
    '#62e7ff',
    '#44e3ff',
    '#28dfff',
    '#12dcff',
    '#00d9ff',
    '#00e4ff',
    '#00f0ff',
  ];

  if (ticksGroup) {
    const kx = 66.0;
    const ky = 36.0;
    const ux = 7.2;
    const uy = -10.8;
    const vx = 16.4;
    const vy = -2.25;
    const wx = 10.5;
    const wy = 11.2;

    if (speedoCasing) {
      const c0x = kx - 6.28 * ux - 2.4;
      const c0y = ky - 6.28 * uy + 2.2;
      const c1x = kx - 1.6;
      const c1y = ky - 2.8;
      const c2x = kx + 12.22 * vx + 2.8;
      const c2y = ky + 12.22 * vy - 2.6;
      const c3x = kx + 12.22 * vx + wx + 3.2;
      const c3y = ky + 12.22 * vy + wy + 2.2;
      const c4x = kx + wx + 2.0;
      const c4y = ky + wy + 2.4;
      const c5x = kx - 6.28 * ux + wx + 0.4;
      const c5y = ky - 6.28 * uy + wy + 2.8;
      speedoCasing.setAttribute(
        'points',
        `${c0x.toFixed(1)},${c0y.toFixed(1)} ${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${c3x.toFixed(1)},${c3y.toFixed(1)} ${c4x.toFixed(1)},${c4y.toFixed(1)} ${c5x.toFixed(1)},${c5y.toFixed(1)}`
      );
    }

    let svgMarkup = '';
    const pad = 0.13;
    for (let s = 0; s < 6; s++) {
      const s0 = s + pad;
      const s1 = s + 1.0 - pad;
      const p0x = kx - (6.0 - s0) * ux;
      const p0y = ky - (6.0 - s0) * uy;
      const p1x = kx - (6.0 - s1) * ux;
      const p1y = ky - (6.0 - s1) * uy;
      const q1x = p1x + wx;
      const q1y = p1y + wy;
      const q0x = p0x + wx;
      const q0y = p0y + wy;
      svgMarkup += `<polygon id="speedo-seg-${s}" class="speedo-seg" points="${p0x.toFixed(2)},${p0y.toFixed(2)} ${p1x.toFixed(2)},${p1y.toFixed(2)} ${q1x.toFixed(2)},${q1y.toFixed(2)} ${q0x.toFixed(2)},${q0y.toFixed(2)}" />`;
    }
    for (let t = 0; t < 12; t++) {
      const idx = 6 + t;
      const t0 = t + pad;
      const t1 = t + 1.0 - pad;
      const p0x = kx + t0 * vx;
      const p0y = ky + t0 * vy;
      const p1x = kx + t1 * vx;
      const p1y = ky + t1 * vy;
      const q1x = p1x + wx;
      const q1y = p1y + wy;
      const q0x = p0x + wx;
      const q0y = p0y + wy;
      svgMarkup += `<polygon id="speedo-seg-${idx}" class="speedo-seg" points="${p0x.toFixed(2)},${p0y.toFixed(2)} ${p1x.toFixed(2)},${p1y.toFixed(2)} ${q1x.toFixed(2)},${q1y.toFixed(2)} ${q0x.toFixed(2)},${q0y.toFixed(2)}" />`;
    }
    ticksGroup.innerHTML = svgMarkup;
    for (let i = 0; i < 18; i++) {
      speedoSegEls.push(document.getElementById(`speedo-seg-${i}`));
    }
  }

  // 2x Retina Minimap Renderer (Supports Mode 1 Track Ribbon & Mode 2 14-Room Giant House Floorplan)
  const radarCanvas = document.getElementById('minimap-canvas');
  const radarCtx = radarCanvas ? radarCanvas.getContext('2d') : null;
  let radarBgCanvas = null;
  let houseRadarBgCanvas = null;

  const projMinimapRawX = (x, y, z) => x - y * 0.36 + z * 0.08;
  const projMinimapRawY = (_x, y, z) => z * 1.08 - y * 1.48;
  let mapMinimapX = (x, _y, _z) => x;
  let mapMinimapY = (_x, _y, z) => z;
  let mapHouseMinimapX = (x) => x;
  let mapHouseMinimapY = (z) => z;

  if (radarCanvas) {
    radarBgCanvas = document.createElement('canvas');
    radarBgCanvas.width = radarCanvas.width;
    radarBgCanvas.height = radarCanvas.height;
    const bgCtx = radarBgCanvas.getContext('2d');
    const w = radarBgCanvas.width;
    const h = radarBgCanvas.height;

    const pts = splineData.samples;
    const nPts = pts.length;
    let minPX = Infinity;
    let maxPX = -Infinity;
    let minPY = Infinity;
    let maxPY = -Infinity;
    for (let i = 0; i < nPts; i++) {
      const pos = pts[i].position;
      const px = projMinimapRawX(pos[0], pos[1], pos[2]);
      const py = projMinimapRawY(pos[0], pos[1], pos[2]);
      if (px < minPX) minPX = px;
      if (px > maxPX) maxPX = px;
      if (py < minPY) minPY = py;
      if (py > maxPY) maxPY = py;
    }
    const padX = 44;
    const padY = 38;
    const spanX = Math.max(1e-4, maxPX - minPX);
    const spanY = Math.max(1e-4, maxPY - minPY);
    const scale = Math.min((w - padX * 2) / spanX, (h - padY * 2) / spanY);
    const offsetX = (w - spanX * scale) * 0.5 - minPX * scale;
    const offsetY = (h - spanY * scale) * 0.5 - minPY * scale;

    mapMinimapX = (x, y, z) => projMinimapRawX(x, y, z) * scale + offsetX;
    mapMinimapY = (x, y, z) => projMinimapRawY(x, y, z) * scale + offsetY;

    const p2d = new Array(nPts);
    for (let i = 0; i < nPts; i++) {
      const pos = pts[i].position;
      p2d[i] = {
        x: mapMinimapX(pos[0], pos[1], pos[2]),
        y: mapMinimapY(pos[0], pos[1], pos[2]),
        elev: pos[1],
      };
    }

    const traceSmoothClosedPath = (ctx, arr, yOffsetPx = 0.0) => {
      ctx.beginPath();
      const mid0x = (arr[nPts - 1].x + arr[0].x) * 0.5;
      const mid0y = (arr[nPts - 1].y + arr[0].y) * 0.5 + yOffsetPx;
      ctx.moveTo(mid0x, mid0y);
      for (let i = 0; i < nPts; i++) {
        const curr = arr[i];
        const next = arr[(i + 1) % nPts];
        const midX = (curr.x + next.x) * 0.5;
        const midY = (curr.y + next.y) * 0.5 + yOffsetPx;
        ctx.quadraticCurveTo(curr.x, curr.y + yOffsetPx, midX, midY);
      }
      ctx.closePath();
    };

    bgCtx.lineJoin = 'round';
    bgCtx.lineCap = 'round';

    bgCtx.save();
    bgCtx.shadowColor = 'rgba(0, 0, 0, 0.90)';
    bgCtx.shadowBlur = 20;
    bgCtx.shadowOffsetX = 0;
    bgCtx.shadowOffsetY = 9;
    bgCtx.strokeStyle = 'rgba(0, 0, 0, 0.68)';
    bgCtx.lineWidth = 17.5;
    traceSmoothClosedPath(bgCtx, p2d, 2.5);
    bgCtx.stroke();
    bgCtx.restore();

    const elevTiers = [
      { min: -1.0, max: 0.042, shade: '#cdd8e8', side: '#52637a' },
      { min: 0.036, max: 0.068, shade: '#d8e2f0', side: '#5c6e87' },
      { min: 0.062, max: 0.096, shade: '#e3ebf6', side: '#667a94' },
      { min: 0.090, max: 0.128, shade: '#edf3fa', side: '#7186a1' },
      { min: 0.122, max: 0.160, shade: '#f6f9fd', side: '#7d92ae' },
      { min: 0.154, max: 1.0, shade: '#ffffff', side: '#8aa0bd' },
    ];

    const strokeElevationTier = (minE, maxE, strokeStyle, lineWidth, yOffsetPx = 0.0) => {
      bgCtx.strokeStyle = strokeStyle;
      bgCtx.lineWidth = lineWidth;
      bgCtx.beginPath();
      let active = false;
      for (let step = 0; step <= nPts + 2; step++) {
        const i = step % nPts;
        const prev = p2d[(i - 1 + nPts) % nPts];
        const curr = p2d[i];
        const next = p2d[(i + 1) % nPts];
        if (curr.elev >= minE && curr.elev <= maxE) {
          const startMidX = (prev.x + curr.x) * 0.5;
          const startMidY = (prev.y + curr.y) * 0.5 + yOffsetPx;
          const endMidX = (curr.x + next.x) * 0.5;
          const endMidY = (curr.y + next.y) * 0.5 + yOffsetPx;
          if (!active) {
            bgCtx.moveTo(startMidX, startMidY);
            active = true;
          }
          bgCtx.quadraticCurveTo(curr.x, curr.y + yOffsetPx, endMidX, endMidY);
        } else {
          active = false;
        }
      }
      bgCtx.stroke();
    };

    bgCtx.strokeStyle = 'rgba(0, 0, 0, 0.82)';
    bgCtx.lineWidth = 19.0;
    traceSmoothClosedPath(bgCtx, p2d, 2.2);
    bgCtx.stroke();

    bgCtx.strokeStyle = '#52637a';
    bgCtx.lineWidth = 12.2;
    traceSmoothClosedPath(bgCtx, p2d, 4.0);
    bgCtx.stroke();

    bgCtx.strokeStyle = '#cdd8e8';
    bgCtx.lineWidth = 12.0;
    traceSmoothClosedPath(bgCtx, p2d, 0.0);
    bgCtx.stroke();

    for (let t = 1; t < elevTiers.length; t++) {
      const tier = elevTiers[t];
      strokeElevationTier(tier.min, tier.max, 'rgba(0, 0, 0, 0.86)', 19.4, 2.2);
      strokeElevationTier(tier.min, tier.max, tier.side, 12.2, 4.0);
      strokeElevationTier(tier.min, tier.max, tier.shade, 12.0, 0.0);
    }

    // Build Pre-Rendered 14-Room Giant House Floorplan Minimap Canvas
    houseRadarBgCanvas = document.createElement('canvas');
    houseRadarBgCanvas.width = w;
    houseRadarBgCanvas.height = h;
    const hCtx = houseRadarBgCanvas.getContext('2d');
    const hMinX = -3.6;
    const hMaxX = 6.0;
    const hMinZ = -3.6;
    const hMaxZ = 6.0;
    const hScale = Math.min((w - 56) / (hMaxX - hMinX), (h - 32) / (hMaxZ - hMinZ));
    const hOffX = (w - (hMaxX - hMinX) * hScale) * 0.5 - hMinX * hScale;
    const hOffY = (h - (hMaxZ - hMinZ) * hScale) * 0.5 - hMinZ * hScale;
    mapHouseMinimapX = (x) => x * hScale + hOffX;
    mapHouseMinimapY = (z) => z * hScale + hOffY;

    for (const r of giantHouse.rooms) {
      const rx = mapHouseMinimapX(r.cx - 1.16);
      const ry = mapHouseMinimapY(r.cz - 1.16);
      const rw = 2.32 * hScale;
      const rh = 2.32 * hScale;
      hCtx.fillStyle = 'rgba(12, 22, 36, 0.78)';
      hCtx.fillRect(rx, ry, rw, rh);
      hCtx.strokeStyle = 'rgba(130, 215, 255, 0.55)';
      hCtx.lineWidth = 2.2;
      hCtx.strokeRect(rx, ry, rw, rh);

      hCtx.fillStyle = '#d8f3ff';
      hCtx.font = '700 13px "Orbitron", sans-serif';
      hCtx.textAlign = 'center';
      hCtx.textBaseline = 'middle';
      const shortTag = r.shortName.split(' ')[0];
      hCtx.fillText(shortTag, rx + rw * 0.5, ry + rh * 0.5);
    }
  }

  let lastMinimapKx = -9999;
  let lastMinimapKy = -9999;

  function drawMinimapRadar(st) {
    if (!radarCtx || !radarCanvas) return;
    const isHouse = activeGameMode === 'house';
    const kx = isHouse
      ? mapHouseMinimapX(st.position.x)
      : mapMinimapX(st.position.x, st.position.y, st.position.z);
    const ky = isHouse
      ? mapHouseMinimapY(st.position.z)
      : mapMinimapY(st.position.x, st.position.y, st.position.z);
    if (
      Math.abs(kx - lastMinimapKx) < 0.15 &&
      Math.abs(ky - lastMinimapKy) < 0.15
    ) {
      return;
    }
    lastMinimapKx = kx;
    lastMinimapKy = ky;

    const w = radarCanvas.width;
    const h = radarCanvas.height;
    radarCtx.clearRect(0, 0, w, h);
    const bgSource = isHouse ? houseRadarBgCanvas : radarBgCanvas;
    if (bgSource) {
      radarCtx.drawImage(bgSource, 0, 0);
    }

    radarCtx.save();
    const haloGrad = radarCtx.createRadialGradient(kx, ky, 3.0, kx, ky, 26.0);
    haloGrad.addColorStop(0.0, 'rgba(0, 240, 255, 0.90)');
    haloGrad.addColorStop(0.45, 'rgba(0, 224, 255, 0.44)');
    haloGrad.addColorStop(1.0, 'rgba(0, 210, 255, 0.0)');
    radarCtx.fillStyle = haloGrad;
    radarCtx.beginPath();
    radarCtx.arc(kx, ky, 26.0, 0, Math.PI * 2);
    radarCtx.fill();

    radarCtx.fillStyle = 'rgba(0, 12, 22, 0.55)';
    radarCtx.beginPath();
    radarCtx.arc(kx, ky, 12.2, 0, Math.PI * 2);
    radarCtx.fill();

    radarCtx.fillStyle = '#00e8ff';
    radarCtx.beginPath();
    radarCtx.arc(kx, ky, 10.2, 0, Math.PI * 2);
    radarCtx.fill();

    radarCtx.fillStyle = '#dcfdff';
    radarCtx.beginPath();
    radarCtx.arc(kx, ky, 4.8, 0, Math.PI * 2);
    radarCtx.fill();
    radarCtx.restore();
  }

  // Cache HUD DOM elements
  const elScaleSpeed = document.getElementById('hud-scale-speed');
  const elLapCurr = document.getElementById('hud-lap-curr');
  const elLapTimer = document.getElementById('hud-lap-timer');
  const elLapSplit = document.getElementById('hud-lap-split');
  const lapDigitEls = [
    document.getElementById('lap-d0'),
    document.getElementById('lap-d1'),
    document.getElementById('lap-d2'),
    document.getElementById('lap-d3'),
    document.getElementById('lap-d4'),
    document.getElementById('lap-d5'),
  ];
  const elF1Countdown = document.getElementById('hud-f1-countdown');
  const elFinishOverlay = document.getElementById('hud-finish-overlay');
  const elFinishTime = document.getElementById('hud-finish-time');
  const elFinishSub = document.getElementById('hud-finish-sub');
  const elVisorInline = document.getElementById('visor-telem-inline');

  function formatLapTimerMMSSCC(seconds) {
    const totalCentis = Math.max(0, Math.floor((seconds || 0) * 100));
    const mins = Math.floor(totalCentis / 6000);
    const secs = Math.floor((totalCentis % 6000) / 100);
    const centis = totalCentis % 100;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
  }

  let lapSplitTimeout = null;
  let finishOverlayShown = false;

  function hideLapSplit() {
    if (lapSplitTimeout) {
      clearTimeout(lapSplitTimeout);
      lapSplitTimeout = null;
    }
    if (elLapSplit) {
      elLapSplit.classList.add('hidden');
    }
  }

  function showLapSplit(completedLapNum, lapTime) {
    if (!elLapSplit) return;
    if (lapSplitTimeout) {
      clearTimeout(lapSplitTimeout);
    }
    elLapSplit.textContent = `LAP ${completedLapNum}  ${formatLapTimerMMSSCC(lapTime)}`;
    elLapSplit.classList.remove('hidden');
    lapSplitTimeout = setTimeout(() => {
      elLapSplit.classList.add('hidden');
      lapSplitTimeout = null;
    }, 2400);
  }

  function hideFinishOverlay() {
    finishOverlayShown = false;
    if (elFinishOverlay) {
      elFinishOverlay.classList.add('hidden');
    }
    if (typeof syncMobileTouchControlsVisibility === 'function') {
      syncMobileTouchControlsVisibility();
    }
  }

  function showFinishOverlay(totalTime, bestLap, playAudio = true) {
    hideLapSplit();
    if (elFinishTime) {
      elFinishTime.textContent = formatLapTimerMMSSCC(totalTime);
    }
    if (elFinishSub) {
      const bestVal = bestLap != null ? bestLap : (totalTime || 0) / 3;
      elFinishSub.textContent = `BEST LAP ${formatLapTimerMMSSCC(bestVal)}`;
    }
    if (elFinishOverlay) {
      elFinishOverlay.classList.remove('hidden');
    }
    if (typeof syncMobileTouchControlsVisibility === 'function') {
      syncMobileTouchControlsVisibility();
    }
    if (playAudio && !finishOverlayShown) {
      if (audioSynth.playRaceFinishFanfare) {
        audioSynth.playRaceFinishFanfare();
      } else {
        audioSynth.playLapChime();
      }
    }
    finishOverlayShown = true;
  }

  physics.onLapComplete((lapTime, bestLap, completedLapNum, totalTime, isFinish) => {
    if (activeGameMode !== 'track') return;
    if (isFinish) {
      const finalTotal =
        totalTime ?? physics.state.finishTotalTime ?? physics.state.totalRaceTime ?? lapTime;
      showFinishOverlay(finalTotal, bestLap ?? lapTime, true);
    } else {
      audioSynth.playLapChime();
      const lapNum = completedLapNum || Math.max(1, (physics.state.lapCount || 2) - 1);
      showLapSplit(lapNum, lapTime);
    }
  });

  if (physics.onRaceFinish) {
    physics.onRaceFinish((totalTime, _lapTimes, bestLap) => {
      if (activeGameMode !== 'track') return;
      showFinishOverlay(totalTime, bestLap, true);
    });
  }

  physics.onModeChange((isAuto) => {
    syncAutopilotUI(isAuto);
    if (isAuto) {
      hideFinishOverlay();
      hideLapSplit();
      cancelF1StartCountdown();
    }
  });

  // Formula 1 5-Light Start Sequence State
  const f1CountdownState = {
    active: false,
    elapsed: 0.0,
    stepDuration: 0.85,
    lastStepIndex: -1,
  };

  function cancelF1StartCountdown() {
    f1CountdownState.active = false;
    f1CountdownState.elapsed = 0.0;
    f1CountdownState.lastStepIndex = -1;
    physics.state.countdownLocked = false;
    if (coaster.setF1StartLights) {
      coaster.setF1StartLights(0);
    }
    if (elF1Countdown) {
      elF1Countdown.classList.add('hidden');
    }
  }

  function startF1StartCountdown() {
    hideFinishOverlay();
    hideLapSplit();
    if (activeGameMode === 'house') {
      // Giant House Open World starts free-roam driving immediately with zero countdown lock
      cancelF1StartCountdown();
      physics.setAutopilot(false);
      physics.resetToStart();
      physics.state.countdownLocked = false;
      physics.state.raceClockActive = true;
      return;
    }

    physics.setAutopilot(false);
    const btnAutoText = document.getElementById('autopilot-btn-text');
    if (btnAutoText) btnAutoText.textContent = 'Manual WASD Racing';
    physics.resetToStart();
    physics.state.countdownLocked = true;
    physics.state.raceClockActive = false;

    f1CountdownState.active = true;
    f1CountdownState.elapsed = 0.0;
    f1CountdownState.lastStepIndex = 1;

    if (coaster.setF1StartLights) {
      coaster.setF1StartLights(1);
    }
    if (audioSynth.playF1CountdownBeep) {
      audioSynth.playF1CountdownBeep(false);
    }
    if (elF1Countdown) {
      elF1Countdown.textContent = '5';
      elF1Countdown.classList.remove('hidden');
    }
  }

  function stepF1StartCountdown(dt) {
    if (!f1CountdownState.active) return;
    f1CountdownState.elapsed += dt;
    const stepIdx = Math.floor(f1CountdownState.elapsed / f1CountdownState.stepDuration) + 1;

    if (stepIdx <= 5) {
      if (stepIdx !== f1CountdownState.lastStepIndex) {
        f1CountdownState.lastStepIndex = stepIdx;
        if (coaster.setF1StartLights) {
          coaster.setF1StartLights(stepIdx);
        }
        if (audioSynth.playF1CountdownBeep) {
          audioSynth.playF1CountdownBeep(false);
        }
        if (elF1Countdown) {
          elF1Countdown.textContent = String(6 - stepIdx);
          elF1Countdown.classList.remove('hidden');
        }
      }
    } else {
      f1CountdownState.active = false;
      f1CountdownState.lastStepIndex = -1;
      if (coaster.setF1StartLights) {
        coaster.setF1StartLights(0);
      }
      if (audioSynth.playF1CountdownBeep) {
        audioSynth.playF1CountdownBeep(true);
      }
      if (elF1Countdown) {
        elF1Countdown.classList.add('hidden');
      }
      physics.state.countdownLocked = false;
      physics.state.raceClockActive = true;
      if (physics.notifyLightsOut) {
        physics.notifyLightsOut();
      }
    }
  }

  // -------------------------------------------------------------------------
  // WELCOME DIALOG & START RACE BUTTON (SHOWN ON LAUNCH)
  // -------------------------------------------------------------------------
  const elWelcomeOverlay = document.getElementById('welcome-dialog-overlay');
  const btnWelcomeStart = document.getElementById('btn-welcome-start');
  const elWelcomeStartText = document.getElementById('welcome-start-text');
  const elWelcomeEnterKbd = document.getElementById('welcome-enter-kbd');
  const elWelcomeProgressFill = document.getElementById('welcome-btn-progress-fill');
  const btnFinishRaceAgain = document.getElementById('btn-finish-race-again');
  const btnFinishAutopilot = document.getElementById('btn-finish-autopilot');

  function focusWelcomeStartButton() {
    if (isScreenshotMode) return;
    if (elWelcomeOverlay && !elWelcomeOverlay.classList.contains('hidden') && btnWelcomeStart) {
      try {
        window.focus();
        btnWelcomeStart.focus({ preventScroll: true });
      } catch (_e) {
        // Ignore cross-origin focus restrictions
      }
    }
  }

  function updateWelcomeWarmupUI() {
    if (isScreenshotMode || !btnWelcomeStart) return;
    const readyLabel =
      activeGameMode === 'house' ? 'START FREE ROAM' : 'START TIME TRIAL';
    if (isCircuitReady || activeGameMode === 'house') {
      btnWelcomeStart.classList.remove('is-warming-up', 'is-queued');
      if (elWelcomeProgressFill) elWelcomeProgressFill.style.width = '100%';
      if (elWelcomeStartText) elWelcomeStartText.textContent = readyLabel;
      if (elWelcomeEnterKbd) elWelcomeEnterKbd.textContent = 'ENTER ↵';
      focusWelcomeStartButton();
      return;
    }

    const weightedFraction =
      glbDownloadProgress.desk * 0.26 +
      glbDownloadProgress.track * 0.32 +
      glbDownloadProgress.room * 0.28 +
      glbDownloadProgress.kart * 0.06 +
      audioPreloadProgress * 0.08;
    const pct = Math.max(8, Math.min(99, Math.round(weightedFraction * 100)));

    btnWelcomeStart.classList.add('is-warming-up');
    btnWelcomeStart.classList.toggle('is-queued', pendingRaceStartAfterWarmup);
    if (elWelcomeProgressFill) {
      elWelcomeProgressFill.style.width = `${pct}%`;
    }
    if (elWelcomeStartText) {
      elWelcomeStartText.textContent = pendingRaceStartAfterWarmup
        ? 'STARTING TIME TRIAL...'
        : 'PREPARING CIRCUIT...';
    }
    if (elWelcomeEnterKbd) {
      elWelcomeEnterKbd.textContent = `${pct}%`;
    }
  }

  onCircuitWarmupProgressCallback = updateWelcomeWarmupUI;
  onCircuitReadyCallback = () => {
    updateWelcomeWarmupUI();
    if (pendingRaceStartAfterWarmup) {
      pendingRaceStartAfterWarmup = false;
      dismissWelcomeAndStartRace();
    }
  };
  updateWelcomeWarmupUI();
  focusWelcomeStartButton();

  window.addEventListener(
    'pointermove',
    () => {
      if (
        elWelcomeOverlay &&
        !elWelcomeOverlay.classList.contains('hidden') &&
        document.activeElement !== btnWelcomeStart
      ) {
        focusWelcomeStartButton();
      }
    },
    { passive: true }
  );

  if (
    elWelcomeOverlay &&
    urlParams.get('screenshot') === '1' &&
    urlParams.get('welcome') !== '1'
  ) {
    elWelcomeOverlay.classList.add('hidden');
  }
  if (urlParams.get('finish') === '1') {
    if (elWelcomeOverlay) elWelcomeOverlay.classList.add('hidden');
    showFinishOverlay(51.42, 16.84, false);
  }

  // -------------------------------------------------------------------------
  // MOBILE MULTI-TOUCH DRIVING CONTROLS (CONTINUOUS HOLD + ZERO INPUT LAG)
  // -------------------------------------------------------------------------
  const elMobileTouchControls = document.getElementById('mobile-touch-controls');
  const mobileControlButtons = elMobileTouchControls
    ? Array.from(elMobileTouchControls.querySelectorAll('.mobile-ctrl-btn'))
    : [];
  const ALL_TOUCH_DIRS = ['left', 'right', 'forward', 'backward'];
  const activeTouchDirs = new Set();
  const activePointerDirs = new Map();

  const preventDefaultIfCancelable = (e) => {
    if (e.cancelable) {
      e.preventDefault();
    }
  };
  document.addEventListener('gesturestart', preventDefaultIfCancelable, { passive: false });
  document.addEventListener('gesturechange', preventDefaultIfCancelable, { passive: false });
  document.addEventListener('gestureend', preventDefaultIfCancelable, { passive: false });
  document.addEventListener('selectstart', preventDefaultIfCancelable, { passive: false });
  document.addEventListener('dragstart', preventDefaultIfCancelable, { passive: false });
  window.addEventListener(
    'contextmenu',
    (e) => {
      e.preventDefault();
    },
    { passive: false }
  );
  document.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches && e.touches.length > 1 && e.cancelable) {
        e.preventDefault();
      }
    },
    { passive: false }
  );

  function resolveButtonDirectionAtPoint(clientX, clientY) {
    const hitEl = document.elementFromPoint(clientX, clientY);
    const hitBtn = hitEl && hitEl.closest ? hitEl.closest('.mobile-ctrl-btn') : null;
    if (hitBtn && hitBtn.dataset.control) {
      return hitBtn.dataset.control;
    }
    const pad = 18;
    let bestDir = null;
    let bestDistSq = Infinity;
    for (let i = 0; i < mobileControlButtons.length; i++) {
      const btn = mobileControlButtons[i];
      const dir = btn.dataset.control;
      if (!dir) continue;
      const rect = btn.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      if (
        clientX >= rect.left - pad &&
        clientX <= rect.right + pad &&
        clientY >= rect.top - pad &&
        clientY <= rect.bottom + pad
      ) {
        const cx = (rect.left + rect.right) * 0.5;
        const cy = (rect.top + rect.bottom) * 0.5;
        const dSq = (clientX - cx) * (clientX - cx) + (clientY - cy) * (clientY - cy);
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestDir = dir;
        }
      }
    }
    return bestDir;
  }

  function applyMobileTouchState() {
    let anyActive = false;
    for (let i = 0; i < ALL_TOUCH_DIRS.length; i++) {
      const dir = ALL_TOUCH_DIRS[i];
      let isPressed = activeTouchDirs.has(dir);
      if (!isPressed) {
        for (const pDir of activePointerDirs.values()) {
          if (pDir === dir) {
            isPressed = true;
            break;
          }
        }
      }
      if (isPressed) {
        anyActive = true;
      }
      if (physics.setTouchKey) {
        physics.setTouchKey(dir, isPressed);
      }
    }
    if (anyActive && audioSynth.setEnabled && !audioSynth.isEnabled?.()) {
      const on = audioSynth.setEnabled(true);
      updateAudioButtonUI(on);
    }
    for (let i = 0; i < mobileControlButtons.length; i++) {
      const btn = mobileControlButtons[i];
      const dir = btn.dataset.control;
      const isPressed = Boolean(dir && physics.keys[dir]);
      if (btn.classList.contains('is-pressed') !== isPressed) {
        btn.classList.toggle('is-pressed', isPressed);
        btn.setAttribute('aria-pressed', isPressed ? 'true' : 'false');
      }
    }
  }

  function releaseAllMobileTouchControls() {
    activeTouchDirs.clear();
    activePointerDirs.clear();
    if (physics.clearTouchKeys) {
      physics.clearTouchKeys();
    }
    for (let i = 0; i < mobileControlButtons.length; i++) {
      const btn = mobileControlButtons[i];
      btn.classList.remove('is-pressed');
      btn.setAttribute('aria-pressed', 'false');
    }
  }

  function syncMobileTouchControlsVisibility() {
    if (!elMobileTouchControls) return;
    const isWelcomeOpen =
      elWelcomeOverlay && !elWelcomeOverlay.classList.contains('hidden');
    const isFinishOpen =
      elFinishOverlay && !elFinishOverlay.classList.contains('hidden');
    const shouldHide = Boolean(isWelcomeOpen || isFinishOpen);
    elMobileTouchControls.classList.toggle('hidden', shouldHide);
    if (shouldHide) {
      releaseAllMobileTouchControls();
    }
  }

  if (elMobileTouchControls && mobileControlButtons.length > 0) {
    const updateFromTouches = (e) => {
      if (e.cancelable) {
        e.preventDefault();
      }
      activeTouchDirs.clear();
      const touches = e.touches || [];
      for (let i = 0; i < touches.length; i++) {
        const t = touches[i];
        const dir = resolveButtonDirectionAtPoint(t.clientX, t.clientY);
        if (dir) {
          activeTouchDirs.add(dir);
        }
      }
      applyMobileTouchState();
    };

    elMobileTouchControls.addEventListener('touchstart', updateFromTouches, {
      passive: false,
    });
    elMobileTouchControls.addEventListener('touchmove', updateFromTouches, {
      passive: false,
    });
    elMobileTouchControls.addEventListener('touchend', updateFromTouches, {
      passive: false,
    });
    elMobileTouchControls.addEventListener('touchcancel', updateFromTouches, {
      passive: false,
    });
    elMobileTouchControls.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    for (let i = 0; i < mobileControlButtons.length; i++) {
      const btn = mobileControlButtons[i];
      const dir = btn.dataset.control;
      if (!dir) continue;

      btn.addEventListener('pointerdown', (e) => {
        if (e.cancelable) {
          e.preventDefault();
        }
        e.stopPropagation();
        try {
          btn.setPointerCapture(e.pointerId);
        } catch (_err) {
          // Ignore pointer capture restrictions
        }
        activePointerDirs.set(e.pointerId, dir);
        applyMobileTouchState();
      });

      btn.addEventListener('pointermove', (e) => {
        if (!activePointerDirs.has(e.pointerId)) return;
        if (e.cancelable) {
          e.preventDefault();
        }
        const resolvedDir = resolveButtonDirectionAtPoint(e.clientX, e.clientY) || dir;
        if (activePointerDirs.get(e.pointerId) !== resolvedDir) {
          activePointerDirs.set(e.pointerId, resolvedDir);
          applyMobileTouchState();
        }
      });

      const releasePointer = (e) => {
        if (activePointerDirs.has(e.pointerId)) {
          activePointerDirs.delete(e.pointerId);
          applyMobileTouchState();
        }
      };

      btn.addEventListener('pointerup', releasePointer);
      btn.addEventListener('pointercancel', releasePointer);
      btn.addEventListener('lostpointercapture', releasePointer);
    }

    window.addEventListener('blur', releaseAllMobileTouchControls);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        releaseAllMobileTouchControls();
      }
    });
  }

  syncMobileTouchControlsVisibility();

  function showWelcomeDialog() {
    if (elWelcomeOverlay) {
      elWelcomeOverlay.classList.remove('hidden');
      focusWelcomeStartButton();
    }
    syncMobileTouchControlsVisibility();
  }

  function hideWelcomeDialog() {
    if (elWelcomeOverlay && !elWelcomeOverlay.classList.contains('hidden')) {
      elWelcomeOverlay.classList.add('hidden');
    }
    syncMobileTouchControlsVisibility();
  }

  if (elBrandLogo) {
    elBrandLogo.addEventListener('click', (e) => {
      e.stopPropagation();
      showWelcomeDialog();
    });
    elBrandLogo.addEventListener('keydown', (e) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        showWelcomeDialog();
      }
    });
  }

  function dismissWelcomeAndStartRace() {
    if (audioSynth.setEnabled && !audioSynth.isEnabled?.()) {
      const on = audioSynth.setEnabled(true);
      updateAudioButtonUI(on);
    }
    if (!isCircuitReady) {
      warmUpSceneOnGpu();
      isCircuitReady = true;
      updateWelcomeWarmupUI();
    }
    pendingRaceStartAfterWarmup = false;
    hideWelcomeDialog();
    hideFinishOverlay();
    hideLapSplit();
    startF1StartCountdown();
  }

  if (btnWelcomeStart) {
    btnWelcomeStart.addEventListener('click', (e) => {
      e.stopPropagation();
      dismissWelcomeAndStartRace();
      btnWelcomeStart.blur();
    });
    btnWelcomeStart.addEventListener('keydown', (e) => {
      if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.key === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        dismissWelcomeAndStartRace();
        btnWelcomeStart.blur();
      }
    });
  }

  if (btnFinishRaceAgain) {
    btnFinishRaceAgain.addEventListener('click', (e) => {
      e.stopPropagation();
      dismissWelcomeAndStartRace();
      btnFinishRaceAgain.blur();
    });
  }

  if (btnFinishAutopilot) {
    btnFinishAutopilot.addEventListener('click', (e) => {
      e.stopPropagation();
      hideWelcomeDialog();
      hideFinishOverlay();
      hideLapSplit();
      cancelF1StartCountdown();
      physics.setAutopilot(true);
      btnFinishAutopilot.blur();
    });
  }

  camButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      hideWelcomeDialog();
    });
  });

  window.addEventListener('keydown', (e) => {
    if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName) && !e.target.readOnly) return;
    if (e.repeat) return;
    if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.key === 'Enter') {
      e.preventDefault();
      dismissWelcomeAndStartRace();
    } else if (
      e.code === 'KeyW' ||
      e.code === 'ArrowUp' ||
      e.code === 'KeyA' ||
      e.code === 'KeyD' ||
      e.code === 'ArrowLeft' ||
      e.code === 'ArrowRight'
    ) {
      hideWelcomeDialog();
    } else if (e.code === 'KeyR') {
      hideWelcomeDialog();
      hideFinishOverlay();
      hideLapSplit();
      cancelF1StartCountdown();
    } else if (e.code === 'KeyP') {
      hideWelcomeDialog();
      hideFinishOverlay();
      hideLapSplit();
      cancelF1StartCountdown();
    }
  });

  let lastScaleKmh = -1;
  let lastActiveSegs = -1;
  let lastLapCurr = -1;
  let lastLapTimerStr = '';
  let lastVisorStr = '';
  let lastRoomNameStr = '';

  function updateHUD(st) {
    if (activeCameraMode > 4) return;
    const absSpeed = Math.abs(st.speed);
    const scaleKmh =
      activeGameMode === 'house'
        ? Math.round(absSpeed * 12.2 * 3.6)
        : Math.round(absSpeed * 102.35 * 3.6);

    if (elScaleSpeed && scaleKmh !== lastScaleKmh) {
      lastScaleKmh = scaleKmh;
      elScaleSpeed.textContent = String(scaleKmh);
    }

    const activeSegs =
      scaleKmh <= 0 ? 0 : Math.min(18, Math.max(1, Math.round((scaleKmh / 104.0) * 18)));
    if (activeSegs !== lastActiveSegs && speedoSegEls.length === 18) {
      lastActiveSegs = activeSegs;
      for (let i = 0; i < 18; i++) {
        const segEl = speedoSegEls[i];
        if (!segEl) continue;
        if (i < activeSegs) {
          segEl.style.fill = SPEEDO_SEG_COLORS[i];
          if (i >= 10) {
            segEl.setAttribute('filter', 'url(#speedoCyanGlow)');
          } else {
            segEl.removeAttribute('filter');
          }
        } else {
          segEl.style.fill = 'rgba(255, 255, 255, 0.12)';
          segEl.removeAttribute('filter');
        }
      }
    }

    if (activeGameMode === 'house') {
      if (hudHouseRoomName && st.currentRoomName && st.currentRoomName !== lastRoomNameStr) {
        lastRoomNameStr = st.currentRoomName;
        hudHouseRoomName.textContent = st.currentRoomName;
      }
    } else {
      const isPAutoMode = Boolean(st.autopilot && !st.victoryCruise);
      const lapDisplay = isPAutoMode ? 1 : Math.min(3, Math.max(1, st.lapCount || 1));
      if (elLapCurr && lapDisplay !== lastLapCurr) {
        lastLapCurr = lapDisplay;
        elLapCurr.textContent = String(lapDisplay);
      }
      if (elLapTimer) {
        const displayTime = isPAutoMode
          ? 0.0
          : st.raceFinished && st.finishTotalTime != null
            ? st.finishTotalTime
            : st.totalRaceTime !== undefined
              ? st.totalRaceTime
              : st.currentLapTime;
        const timerStr = formatLapTimerMMSSCC(displayTime);
        if (timerStr !== lastLapTimerStr) {
          lastLapTimerStr = timerStr;
          const digitIndices = [0, 1, 3, 4, 6, 7];
          for (let d = 0; d < 6; d++) {
            const spanEl = lapDigitEls[d];
            const ch = timerStr[digitIndices[d]];
            if (spanEl && spanEl.textContent !== ch) {
              spanEl.textContent = ch;
            }
          }
          elLapTimer.setAttribute('aria-label', timerStr);
        }
      }
    }

    if (elVisorInline && activeCameraMode === 3) {
      const visorStr = `${scaleKmh} KM/H | BANK ${st.bankDeg.toFixed(1)}° | ${st.downforceG.toFixed(2)}G`;
      if (visorStr !== lastVisorStr) {
        lastVisorStr = visorStr;
        elVisorInline.textContent = visorStr;
      }
    }

    drawMinimapRadar(st);
  }

  // -------------------------------------------------------------------------
  // URL QUERY PARAMETERS (?mode=house|track, ?cam=1..4/6, ?sector=1..6, ?s=..., ?finish=1)
  // -------------------------------------------------------------------------
  if (urlParams.get('mode') === 'house') {
    setActiveGameMode('house');
  }
  if (urlParams.has('sector')) {
    const requestedSector = parseInt(urlParams.get('sector'), 10);
    if (requestedSector >= 1 && requestedSector <= 6) {
      physics.teleportToSector(requestedSector);
    }
  }
  if (urlParams.has('s')) {
    const requestedS = parseFloat(urlParams.get('s'));
    if (!Number.isNaN(requestedS)) {
      physics.state.s = requestedS;
    }
  }
  if (urlParams.has('speed')) {
    const requestedSpeed = parseFloat(urlParams.get('speed'));
    if (!Number.isNaN(requestedSpeed)) {
      physics.state.speed = requestedSpeed;
    }
  }
  if (urlParams.get('boost') === '1') {
    physics.state.boostActive = 1.5;
  }
  if (urlParams.has('laptime')) {
    const requestedLapTime = parseFloat(urlParams.get('laptime'));
    if (!Number.isNaN(requestedLapTime)) {
      physics.state.currentLapTime = requestedLapTime;
      physics.state.totalRaceTime = requestedLapTime;
    }
  }
  if (urlParams.get('finish') === '1') {
    physics.state.raceFinished = true;
    physics.state.finishTotalTime = 64.28;
    physics.state.totalRaceTime = 64.28;
    physics.state.bestLapTime = 20.84;
    physics.state.lapCount = 3;
    showFinishOverlay(64.28, 20.84, false);
  }
  if (urlParams.has('f1step')) {
    const f1Step = parseInt(urlParams.get('f1step'), 10);
    if (f1Step >= 1 && f1Step <= 5) {
      startF1StartCountdown();
      f1CountdownState.elapsed = (f1Step - 1) * f1CountdownState.stepDuration;
      f1CountdownState.lastStepIndex = -1;
      stepF1StartCountdown(0.0);
    }
  }
  if (urlParams.has('cam')) {
    const requestedCam = parseInt(urlParams.get('cam'), 10);
    if (requestedCam >= 1 && requestedCam <= 9) {
      setCameraMode(requestedCam === 6 ? 4 : requestedCam);
    }
  } else {
    setCameraMode(activeCameraMode);
  }
  if (urlParams.get('sparks') === '1') {
    physics.setAutopilot(true);
    physics.state.speed = 0.215;
    physics.state.isDrifting = true;
    physics.state.boostActive = 1.2;
    for (let step = 0; step < 26; step++) {
      const preSt = physics.stepPhysics(1 / 60);
      microKart.kartRoot.position.copy(preSt.position);
      microKart.kartRoot.quaternion.copy(preSt.quaternion);
      microKart.updateWheels(1 / 60, preSt.speed, preSt.steerAngle);
      microKart.updateKartVisuals(1 / 60, preSt);
    }
  }
  if (urlParams.has('dof')) {
    const requestedDof = parseFloat(urlParams.get('dof'));
    if (!Number.isNaN(requestedDof)) {
      settings.dofStrength = requestedDof;
      if (sliderDof) sliderDof.value = String(requestedDof);
      if (valDof) valDof.textContent = `${requestedDof.toFixed(2)}x`;
    }
  }
  if (urlParams.has('campose')) {
    const parts = urlParams.get('campose').split(',').map((v) => parseFloat(v));
    if (parts.length >= 6 && parts.every((n) => !Number.isNaN(n))) {
      camera.position.set(parts[0], parts[1], parts[2]);
      orbitControls.target.set(parts[3], parts[4], parts[5]);
      orbitControls.update();
      camCurrentPos.copy(camera.position);
      camCurrentLookAt.copy(orbitControls.target);
    }
  }
  const requestedTimeOffset = urlParams.has('t') ? parseFloat(urlParams.get('t')) || 0.0 : 0.0;
  const appInitTimestamp = performance.now();
  let screenshotFrameCounter = 0;

  // -------------------------------------------------------------------------
  // 7. 16:9 WIDESCREEN RESIZE & 60FPS DELTA-TIME ANIMATION LOOP (MOBILE OPTIMIZED)
  // -------------------------------------------------------------------------
  function handleStageResize() {
    const dims = getStageDimensions();
    camera.aspect = 16 / 9;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    renderer.setSize(dims.width, dims.height);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
  }

  window.addEventListener('resize', handleStageResize);
  handleStageResize();

  const clock = new THREE.Clock();
  let lastHudUpdateMs = 0;

  function animate() {
    const rawDt = clock.getDelta();
    const dt = isScreenshotMode ? 1 / 60 : Math.min(Math.max(rawDt, 0.001), 0.1);
    const elapsedTime =
      (isScreenshotMode ? screenshotFrameCounter / 60 : clock.getElapsedTime()) +
      requestedTimeOffset;

    // 0. Step Formula 1 5-Light Start Countdown if active
    stepF1StartCountdown(isScreenshotMode ? 0.0 : dt);

    // 1. Step Sub-Stepped Physics (Mode 1 Neon Track OR Mode 2 Giant House Open World)
    const st = physics.stepPhysics(dt);

    // 2. Sync Micro-Kart Transform, Wheels, Helmeted Driver & Drift Sparks
    microKart.kartRoot.position.copy(st.position);
    microKart.kartRoot.quaternion.copy(st.quaternion);
    microKart.updateWheels(dt, st.speed, st.steerAngle);
    microKart.updateKartVisuals(dt, st);

    // 3. Update Atmosphere & Under-Track LEDs
    atmosphere.updateAtmosphere(elapsedTime, settings, renderer, bloomPass, scene, diorama);
    if (activeGameMode === 'track' && coaster.updateUnderTrackLed) {
      coaster.updateUnderTrackLed(elapsedTime, settings.trackGlowIntensity ?? 1.00);
    }

    // 4. Update Camera (1: Close Chase, 2: Far Chase, 3: Hood/Cockpit, 4: Top-Down Heli)
    updateCamera(dt, elapsedTime, st);

    // 5. Update WebAudio Synth (throttled internally to 100ms) & HUD (throttled to 5 Hz / 200ms via direct DOM refs)
    audioSynth.update(st);
    const nowMs = performance.now();
    if (isScreenshotMode || nowMs - lastHudUpdateMs >= 200) {
      lastHudUpdateMs = nowMs;
      updateHUD(st);
    }

    if (isScreenshotMode) {
      if (window.__deskRacerFontsReady === undefined) {
        window.__deskRacerFontsReady = false;
        if (document.fonts && document.fonts.ready) {
          Promise.all([
            document.fonts.load('italic 900 48px "Orbitron"'),
            document.fonts.load('italic 900 84px "Orbitron"'),
            document.fonts.load('44px "Press Start 2P"'),
            document.fonts.load('38px "Press Start 2P"'),
            document.fonts.ready,
          ])
            .then(() => {
              window.__deskRacerFontsReady = true;
            })
            .catch(() => {
              window.__deskRacerFontsReady = true;
            });
        } else {
          window.__deskRacerFontsReady = true;
        }
      }
      const allFourGlbsLoaded =
        loadedGlbStatus.desk &&
        loadedGlbStatus.track &&
        loadedGlbStatus.kart &&
        loadedGlbStatus.room;
      const elapsedMs = performance.now() - appInitTimestamp;

      if (
        (!allFourGlbsLoaded && elapsedMs < 15000) ||
        (!window.__deskRacerFontsReady && elapsedMs < 3500)
      ) {
        requestAnimationFrame(animate);
        return;
      }

      renderer.render(scene, camera);
      screenshotFrameCounter++;
      if (screenshotFrameCounter >= 2 || elapsedMs >= 20000) {
        document.body.id = 'screenshot-ready';
        return;
      }
      requestAnimationFrame(animate);
      return;
    }

    // 6. Direct single-pass WebGL render for locked 60 FPS on mobile GPUs
    renderer.render(scene, camera);

    requestAnimationFrame(animate);
  }

  animate();
}

initApp().catch((err) => {
  console.error('Failed to initialize Desk Kart Racer:', err);
});
