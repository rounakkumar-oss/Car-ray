import * as THREE from 'three';
import { carPackAssets, getVehicleSpecById } from './CarCatalog.js';

/**
 * Classic White & Light-Grey Industrial 3D Car Showroom Garage
 * Recreates the exact reference garage environment:
 *  - Clean white and light-grey industrial garage interior walls
 *  - Two large metallic rolling garage doors in the background
 *  - Horizontal metallic wall panels & structural steel columns
 *  - White ceiling studio light fixtures
 *  - Clean polished light-grey concrete floor with subtle joint grid
 *  - Circular dark-grey showroom car platform with illuminated rim
 *  - Soft natural contact shadows and studio automotive reflections
 *  - Front three-quarter camera angle that frames 100% of the car without cropping
 */
export class CarShowroomPreview {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.isActive = false;
    this.rafId = null;
    this.currentCarId = null;
    this.currentPaintHex = null;
    this.currentRimHex = null;
    this.currentGlowHex = '#38bdf8';
    this.suspensionLevel = 1; // 1..5
    this.carMeshGroup = null;
    this.wheelGroups = [];
    this.spinWheelsPreview = true;
    this.clock = new THREE.Clock();

    // Graphics & Performance Configuration (Defaults to LOW for 60 FPS mobile responsiveness)
    this.graphicsQuality = 'low'; // 'low' | 'medium' | 'high' | 'ultra'
    this.fpsLimit = 60; // 30 | 60 | 90
    this.reflectionQuality = 'low';
    this.lastFrameTimeMs = 0;

    // Interactive 360-degree drag / touch rotation state (Front three-quarter default angle)
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.defaultYaw = -0.56;
    this.defaultPitch = 0.21;
    this.orbitYaw = this.defaultYaw;
    this.targetYaw = this.defaultYaw;
    this.orbitPitch = this.defaultPitch;
    this.targetPitch = this.defaultPitch;
    this.cameraRadius = 5.45;
    this.targetRadius = 5.45;
    this.baseAspectRadius = 5.45;
    this.lookAtY = 0.44;
    this.targetLookAtY = 0.44;
    this.autoRotate = true;
    this.isInspectMode = false;
    this.nitroBurstTimer = 0;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xdce3ec);
    this.scene.fog = new THREE.Fog(0xdce3ec, 15.0, 34.0);

    this.camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 60);
    this.updateCameraOrbit(0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.0));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.turntableGroup = new THREE.Group();
    this.scene.add(this.turntableGroup);

    // Cache of already-created 3D car models so switching back is instant with 0 GC stall
    this.carModelCache = new Map();
    this.sharedMaterials = [];

    this.buildClassicIndustrialGarage();
    this.bindPointerEvents();
  }

  setGraphicsConfig({ quality, fpsLimit, reflections } = {}) {
    if (quality) this.graphicsQuality = quality;
    if (fpsLimit) this.fpsLimit = Number(fpsLimit) || 60;
    if (reflections) this.reflectionQuality = reflections;

    const dpr = window.devicePixelRatio || 1;
    let targetRatio = Math.min(dpr, 0.95);
    if (this.graphicsQuality === 'medium') {
      targetRatio = Math.min(dpr, 1.15);
    } else if (this.graphicsQuality === 'high' || this.graphicsQuality === 'ultra') {
      targetRatio = Math.min(dpr, 1.45);
    }
    this.renderer.setPixelRatio(targetRatio);
    this.resize();
  }

  createBrushedMetalPanelTexture() {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#e5eaf0';
    ctx.fillRect(0, 0, 256, 256);

    // Horizontal metallic wall panel seams
    const rows = 8;
    const rowH = 256 / rows;
    for (let i = 0; i < rows; i++) {
      const y = i * rowH;
      const grad = ctx.createLinearGradient(0, y, 0, y + rowH);
      grad.addColorStop(0, '#f1f5f9');
      grad.addColorStop(0.5, '#e2e8f0');
      grad.addColorStop(0.92, '#cbd5e1');
      grad.addColorStop(1, '#94a3b8');
      ctx.fillStyle = grad;
      ctx.fillRect(0, y, 256, rowH);

      // Subtle vertical panel joint line
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(128, y);
      ctx.lineTo(128, y + rowH);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 2);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  createRollingDoorShuttersTexture() {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');

    const slats = 18;
    const slatH = 256 / slats;
    for (let i = 0; i < slats; i++) {
      const y = i * slatH;
      const grad = ctx.createLinearGradient(0, y, 0, y + slatH);
      grad.addColorStop(0, '#d8e0ea');
      grad.addColorStop(0.35, '#bcc6d4');
      grad.addColorStop(0.75, '#9aa6b8');
      grad.addColorStop(1.0, '#64748b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, y, 256, slatH);
    }

    // Subtle vertical rib grooves on rolling door
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.25)';
    ctx.lineWidth = 2;
    for (let x = 32; x < 256; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  createPolishedConcreteFloorTexture() {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d');

    const radGrad = ctx.createRadialGradient(256, 256, 30, 256, 256, 260);
    radGrad.addColorStop(0, '#e2e8f0');
    radGrad.addColorStop(0.65, '#cfd8e3');
    radGrad.addColorStop(1, '#b8c4d4');
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, 512, 512);

    // Subtle concrete tile expansion joints
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.24)';
    ctx.lineWidth = 2;
    const step = 64;
    for (let i = 0; i <= 512; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  buildClassicIndustrialGarage() {
    // 1. Bright, Clean Automotive Studio Lighting (White / Daylight balanced)
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xcbd5e1, 1.85);
    hemiLight.position.set(0, 8, 0);
    this.scene.add(hemiLight);

    // Main overhead front-key studio light
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.35);
    keyLight.position.set(3.8, 6.5, 4.8);
    this.scene.add(keyLight);

    // Left soft fill light for front bumper & wheel detail
    const fillLightLeft = new THREE.DirectionalLight(0xf1f5f9, 1.45);
    fillLightLeft.position.set(-4.8, 4.0, 3.6);
    this.scene.add(fillLightLeft);

    // Rear rim highlight light to separate roofline and spoiler from background wall
    const rimLightBack = new THREE.DirectionalLight(0xffffff, 1.35);
    rimLightBack.position.set(0.0, 5.2, -5.5);
    this.scene.add(rimLightBack);

    // 2. Clean Polished Light-Grey Concrete Garage Floor
    const floorTex = this.createPolishedConcreteFloorTexture();
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      color: 0xe2e8f0,
      roughness: 0.28,
      metalness: 0.08,
    });
    const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(34, 28), floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -0.02;
    this.scene.add(floorMesh);

    // 3. Circular Dark-Grey Showroom Platform under the Car
    const podiumGroup = new THREE.Group();

    // Outer bevelled dark-grey base ring
    const outerPodiumMat = new THREE.MeshStandardMaterial({
      color: 0x262d3d,
      roughness: 0.32,
      metalness: 0.45,
    });
    const outerPodium = new THREE.Mesh(
      new THREE.CylinderGeometry(2.52, 2.66, 0.09, 64),
      outerPodiumMat
    );
    outerPodium.position.y = 0.025;
    podiumGroup.add(outerPodium);

    // Inner dark-charcoal circular car deck
    const innerDeckMat = new THREE.MeshStandardMaterial({
      color: 0x323b4c,
      roughness: 0.24,
      metalness: 0.35,
    });
    const innerDeck = new THREE.Mesh(
      new THREE.CylinderGeometry(2.36, 2.38, 0.11, 64),
      innerDeckMat
    );
    innerDeck.position.y = 0.035;
    podiumGroup.add(innerDeck);

    // Crisp illuminated white/silver perimeter rim around the circular platform
    this.outerNeonMat = new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
    });
    const rimRing = new THREE.Mesh(
      new THREE.RingGeometry(2.35, 2.43, 64),
      this.outerNeonMat
    );
    rimRing.rotation.x = -Math.PI / 2;
    rimRing.position.y = 0.092;
    podiumGroup.add(rimRing);

    // Subtle secondary accent ring (customizable or warm yellow/blue accent)
    this.underglowRingMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.85,
    });
    const innerAccentRing = new THREE.Mesh(
      new THREE.RingGeometry(2.02, 2.06, 64),
      this.underglowRingMat
    );
    innerAccentRing.rotation.x = -Math.PI / 2;
    innerAccentRing.position.y = 0.093;
    podiumGroup.add(innerAccentRing);

    // Soft natural contact shadow beneath the car on the platform
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sctx = shadowCanvas.getContext('2d');
    const sgrad = sctx.createRadialGradient(64, 64, 12, 64, 64, 60);
    sgrad.addColorStop(0, 'rgba(9, 13, 22, 0.72)');
    sgrad.addColorStop(0.65, 'rgba(9, 13, 22, 0.32)');
    sgrad.addColorStop(1, 'rgba(9, 13, 22, 0.0)');
    sctx.fillStyle = sgrad;
    sctx.fillRect(0, 0, 128, 128);
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);

    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 1.85),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
      })
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.095;
    this.turntableGroup.add(contactShadow);

    this.turntableGroup.add(podiumGroup);

    // 4. White & Light-Grey Industrial Garage Walls + Two Large Metallic Rolling Garage Doors
    const wallGroup = new THREE.Group();
    const metalPanelTex = this.createBrushedMetalPanelTexture();
    const shutterTex = this.createRollingDoorShuttersTexture();

    const wallPanelMat = new THREE.MeshStandardMaterial({
      map: metalPanelTex,
      color: 0xeef2f6,
      roughness: 0.42,
      metalness: 0.22,
    });

    // Back industrial wall
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(24, 8.5), wallPanelMat);
    backWall.position.set(0, 4.2, -5.8);
    wallGroup.add(backWall);

    // Left & Right angled side industrial walls with horizontal metallic panels
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(18, 8.5), wallPanelMat);
    leftWall.position.set(-9.5, 4.2, 0.5);
    leftWall.rotation.y = Math.PI / 2.3;
    wallGroup.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(18, 8.5), wallPanelMat);
    rightWall.position.set(9.5, 4.2, 0.5);
    rightWall.rotation.y = -Math.PI / 2.3;
    wallGroup.add(rightWall);

    // Concrete lower baseboard trim along back and side walls
    const baseboardMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.55,
      metalness: 0.2,
    });
    const backBaseboard = new THREE.Mesh(new THREE.BoxGeometry(24, 0.45, 0.16), baseboardMat);
    backBaseboard.position.set(0, 0.2, -5.72);
    wallGroup.add(backBaseboard);

    // Two Large Metallic Rolling Garage Doors on the Back Wall
    const rollingDoorMat = new THREE.MeshStandardMaterial({
      map: shutterTex,
      color: 0xd8e0ea,
      roughness: 0.36,
      metalness: 0.58,
    });
    const doorFrameMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.4,
      metalness: 0.5,
    });

    [-3.1, 3.1].forEach((doorX) => {
      const doorUnit = new THREE.Group();
      doorUnit.position.set(doorX, 2.25, -5.68);

      // Outer steel door frame surround
      const frameBack = new THREE.Mesh(new THREE.BoxGeometry(4.65, 4.5, 0.14), doorFrameMat);
      doorUnit.add(frameBack);

      // Recessed corrugated metallic rolling shutter door
      const shutterPanel = new THREE.Mesh(new THREE.PlaneGeometry(4.32, 4.22), rollingDoorMat);
      shutterPanel.position.set(0, -0.05, 0.08);
      doorUnit.add(shutterPanel);

      // Top cylindrical roller housing box
      const rollerHood = new THREE.Mesh(new THREE.BoxGeometry(4.68, 0.36, 0.28), doorFrameMat);
      rollerHood.position.set(0, 2.18, 0.08);
      doorUnit.add(rollerHood);

      // Horizontal transom window strip near top of rolling door
      const windowStripMat = new THREE.MeshBasicMaterial({
        color: 0xf8fafc,
      });
      for (let wx = -1.5; wx <= 1.5; wx += 1.0) {
        const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.28), windowStripMat);
        glassPane.position.set(wx, 1.35, 0.09);
        doorUnit.add(glassPane);
      }

      wallGroup.add(doorUnit);
    });

    // Structural vertical steel H-columns framing the garage bays
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.42,
      metalness: 0.48,
    });
    [-6.2, 0.0, 6.2].forEach((px) => {
      const column = new THREE.Mesh(new THREE.BoxGeometry(0.42, 8.4, 0.36), pillarMat);
      column.position.set(px, 4.15, -5.62);
      wallGroup.add(column);
    });

    // Horizontal steel header beam across the back wall
    const headerBeam = new THREE.Mesh(new THREE.BoxGeometry(22, 0.38, 0.38), pillarMat);
    headerBeam.position.set(0, 4.65, -5.58);
    wallGroup.add(headerBeam);

    // 5. White Industrial Ceiling & Bright White LED Ceiling Light Fixtures
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.6,
      metalness: 0.15,
    });
    const ceilingPlane = new THREE.Mesh(new THREE.PlaneGeometry(26, 22), ceilingMat);
    ceilingPlane.rotation.x = Math.PI / 2;
    ceilingPlane.position.set(0, 6.2, -1.0);
    wallGroup.add(ceilingPlane);

    const lightFixtureFrameMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.4,
      metalness: 0.5,
    });
    const lightPanelEmissiveMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });

    // Overhead studio ceiling light banks
    const lightCoords = [
      [-3.2, 5.95, -2.2],
      [0.0, 5.95, -2.2],
      [3.2, 5.95, -2.2],
      [-2.8, 5.95, 1.2],
      [0.0, 5.95, 1.2],
      [2.8, 5.95, 1.2],
    ];
    lightCoords.forEach(([lx, ly, lz]) => {
      const fixture = new THREE.Group();
      fixture.position.set(lx, ly, lz);

      const housing = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.08, 0.75),
        lightFixtureFrameMat
      );
      fixture.add(housing);

      const diffuser = new THREE.Mesh(
        new THREE.PlaneGeometry(1.96, 0.62),
        lightPanelEmissiveMat
      );
      diffuser.rotation.x = Math.PI / 2;
      diffuser.position.y = -0.045;
      fixture.add(diffuser);

      wallGroup.add(fixture);
    });

    this.scene.add(wallGroup);
  }

  bindPointerEvents() {
    if (!this.canvas) return;

    const onDown = (clientX, clientY) => {
      this.isDragging = true;
      this.dragStartX = clientX;
      this.dragStartY = clientY;
    };

    const onMove = (clientX, clientY) => {
      if (!this.isDragging) return;
      const dx = clientX - this.dragStartX;
      const dy = clientY - this.dragStartY;
      this.dragStartX = clientX;
      this.dragStartY = clientY;
      this.targetYaw += dx * 0.011;
      this.targetPitch = Math.max(0.10, Math.min(0.48, this.targetPitch + dy * 0.005));
    };

    const onUp = () => {
      this.isDragging = false;
    };

    this.canvas.addEventListener('pointerdown', (e) => {
      onDown(e.clientX, e.clientY);
    });
    window.addEventListener('pointermove', (e) => {
      onMove(e.clientX, e.clientY);
    });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    // Mouse wheel zoom support (clamped so car is never cropped)
    this.canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const minR = this.isInspectMode ? 3.8 : 4.6;
        const maxR = 6.8;
        this.targetRadius = Math.max(minR, Math.min(maxR, this.targetRadius + e.deltaY * 0.0022));
      },
      { passive: false }
    );
  }

  resetCameraView() {
    this.targetYaw = this.defaultYaw;
    this.targetPitch = this.defaultPitch;
    this.targetRadius = this.isInspectMode ? this.baseAspectRadius * 0.86 : this.baseAspectRadius;
    this.targetLookAtY = 0.44;
  }

  setInspectMode(enabled) {
    this.isInspectMode = Boolean(enabled);
    if (this.isInspectMode) {
      this.targetRadius = this.baseAspectRadius * 0.85;
      this.targetPitch = 0.19;
      this.targetLookAtY = 0.42;
    } else {
      this.targetRadius = this.baseAspectRadius;
      this.targetPitch = this.defaultPitch;
      this.targetLookAtY = 0.44;
    }
  }

  focusUpgradeSection(category) {
    const baseR = this.baseAspectRadius;
    if (category === 'engine') {
      this.targetYaw = -0.45;
      this.targetPitch = 0.22;
      this.targetRadius = baseR * 0.94;
    } else if (category === 'handling') {
      this.targetYaw = -0.82;
      this.targetPitch = 0.20;
      this.targetRadius = baseR * 0.95;
    } else if (category === 'suspension') {
      this.targetYaw = -1.12;
      this.targetPitch = 0.16;
      this.targetRadius = baseR * 0.95;
    } else if (category === 'nitro') {
      this.targetYaw = -2.25;
      this.targetPitch = 0.21;
      this.targetRadius = baseR * 0.96;
      this.triggerNitroPreviewBurst();
    } else {
      this.targetYaw = this.defaultYaw;
      this.targetPitch = this.defaultPitch;
      this.targetRadius = baseR;
    }
  }

  setSuspensionLevel(level = 1) {
    this.suspensionLevel = Math.max(1, Math.min(5, Number(level) || 1));
    if (this.carMeshGroup) {
      const baseScale = this.carMeshGroup.userData.baseShowroomScale || 1.18;
      const dropOffset = (this.suspensionLevel - 1) * 0.011;
      this.carMeshGroup.position.y = 0.095 - dropOffset;
      this.carMeshGroup.scale.setScalar(baseScale);
    }
  }

  setUnderglowColor(hexColor) {
    this.currentGlowHex = hexColor || '#facc15';
    if (this.underglowRingMat) {
      this.underglowRingMat.color.set(this.currentGlowHex);
    }
  }

  setRimColor(hexColor) {
    this.currentRimHex = hexColor || null;
    if (!this.carMeshGroup || !this.currentRimHex) return;
    const targetCol = new THREE.Color(this.currentRimHex);
    this.carMeshGroup.traverse((child) => {
      if (child.isMesh && child.material) {
        const m = child.material;
        if (m.metalness >= 0.78 && m.roughness <= 0.3 && child.position.y < 0.38) {
          child.material = m.clone();
          child.material.color.copy(targetCol);
        }
      }
    });
  }

  triggerNitroPreviewBurst() {
    this.nitroBurstTimer = 1.25;
  }

  updateCameraOrbit(dt) {
    if (this.autoRotate && !this.isDragging) {
      this.targetYaw += dt * 0.22;
    }
    const lerpFactor = Math.min(1, dt * 8.5 || 1);
    this.orbitYaw += (this.targetYaw - this.orbitYaw) * lerpFactor;
    this.orbitPitch += (this.targetPitch - this.orbitPitch) * lerpFactor;
    this.cameraRadius += (this.targetRadius - this.cameraRadius) * lerpFactor;
    this.lookAtY += (this.targetLookAtY - this.lookAtY) * lerpFactor;

    const r = this.cameraRadius;
    const cosP = Math.cos(this.orbitPitch);
    const sinP = Math.sin(this.orbitPitch);
    const camX = Math.sin(this.orbitYaw) * r * cosP;
    const camZ = Math.cos(this.orbitYaw) * r * cosP;
    const camY = Math.max(0.32, sinP * r + 0.25);

    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(0, this.lookAtY, 0);
  }

  async previewCar(carId, customPaintHex = null) {
    this.currentCarId = carId;
    this.currentPaintHex = customPaintHex;

    // Detach previous car from turntable (kept in cache for 0-lag switching)
    if (this.carMeshGroup) {
      this.turntableGroup.remove(this.carMeshGroup);
      this.carMeshGroup = null;
      this.wheelGroups = [];
    }

    const cacheKey = `${carId}_${customPaintHex || 'default'}`;
    let built = this.carModelCache.get(cacheKey);
    if (!built) {
      const spec = getVehicleSpecById(carId);
      let rawBuilt = null;
      if (carId === 'bmw_csl') {
        rawBuilt = carPackAssets.buildBmwHommageStandin(customPaintHex || null);
      } else if (carId === 'classic_kart') {
        rawBuilt = carPackAssets.buildSculptedHypercar(spec, customPaintHex || '#ef4444');
      } else {
        try {
          rawBuilt = await carPackAssets.buildCarInstance(carId, customPaintHex || null);
        } catch (_e) {
          rawBuilt = carPackAssets.buildSculptedHypercar(spec, customPaintHex || spec.defaultColor);
        }
      }

      const wrapper = new THREE.Group();
      const rootNode = rawBuilt.rootGroup || rawBuilt.root;
      wrapper.add(rootNode);
      wrapper.updateMatrixWorld(true);

      // Normalize vehicle bounding box so every car sits flush on the circular platform
      // and occupies ~55% of the central showroom area without ever cropping
      const box = new THREE.Box3().setFromObject(rootNode);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      const maxDim = Math.max(size.x, size.y, size.z, 0.001);
      const normScale = 3.55 / maxDim;
      rootNode.scale.multiplyScalar(normScale);
      rootNode.updateMatrixWorld(true);

      const box2 = new THREE.Box3().setFromObject(rootNode);
      const center2 = new THREE.Vector3();
      box2.getCenter(center2);
      rootNode.position.x -= center2.x;
      rootNode.position.z -= center2.z;
      rootNode.position.y -= box2.min.y;

      built = {
        root: wrapper,
        wheels: rawBuilt.wheelVisuals || rawBuilt.wheels || [],
      };

      if (this.carModelCache.size >= 6) {
        const oldestKey = this.carModelCache.keys().next().value;
        this.carModelCache.delete(oldestKey);
      }
      this.carModelCache.set(cacheKey, built);
    }

    if (this.currentCarId !== carId) return;

    this.carMeshGroup = built.root;
    this.wheelGroups = built.wheels || [];

    const showroomScale = 1.0;
    this.carMeshGroup.userData.baseShowroomScale = showroomScale;
    this.carMeshGroup.scale.setScalar(showroomScale);

    const dropOffset = (this.suspensionLevel - 1) * 0.011;
    this.carMeshGroup.position.set(0, 0.092 - dropOffset, 0);

    if (this.currentRimHex) {
      this.setRimColor(this.currentRimHex);
    }

    // Set front three-quarter showcase angle on selection
    this.targetYaw = this.defaultYaw;
    this.turntableGroup.add(this.carMeshGroup);
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(300, Math.floor(rect.width || window.innerWidth));
    const h = Math.max(200, Math.floor(rect.height || window.innerHeight));
    const aspect = w / h;

    this.camera.aspect = aspect;
    // Dynamically adapt FOV and distance for ultra-wide 20:9 / 21:9 vs 16:9 mobile screens
    // so the car occupies 50-60% of the central showroom area and never clips
    if (aspect < 1.55) {
      this.baseAspectRadius = 6.0;
    } else if (aspect > 2.05) {
      this.baseAspectRadius = 5.35;
    } else {
      this.baseAspectRadius = 5.55;
    }
    if (!this.isInspectMode) {
      this.targetRadius = this.baseAspectRadius;
    }
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  start() {
    if (this.isActive) {
      this.resize();
      return;
    }
    this.isActive = true;
    this.resize();
    this.clock.getDelta();

    const loop = (nowMs = performance.now()) => {
      if (!this.isActive) return;
      this.rafId = requestAnimationFrame(loop);

      if (this.fpsLimit === 30) {
        if (nowMs - this.lastFrameTimeMs < 31.5) return;
        this.lastFrameTimeMs = nowMs;
      }

      const dt = Math.min(this.clock.getDelta(), 0.1);
      this.updateCameraOrbit(dt);

      const spinSpeed = this.nitroBurstTimer > 0 ? 11.0 : this.spinWheelsPreview ? 2.0 : 0.0;
      if (this.nitroBurstTimer > 0) {
        this.nitroBurstTimer = Math.max(0, this.nitroBurstTimer - dt);
      }

      if (spinSpeed > 0) {
        for (let i = 0; i < this.wheelGroups.length; i++) {
          const w = this.wheelGroups[i];
          if (w) w.rotation.x += dt * spinSpeed;
        }
      }

      this.renderer.render(this.scene, this.camera);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    this.isActive = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
