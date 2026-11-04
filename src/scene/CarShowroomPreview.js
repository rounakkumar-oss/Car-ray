import * as THREE from 'three';
import { carPackAssets, getVehicleSpecById } from './CarCatalog.js';
import { buildMicroKart } from './MicroKartBuilder.js';

/**
 * Full-Screen AAA 3D Garage Showroom Renderer.
 * Features a futuristic luxury automotive showroom with:
 * - Panoramic glass windows overlooking an illuminated 3D night city skyline & distant mountain peaks
 * - Overhead studio LED light canopy & linear softbox light bars
 * - Reflective polished floor & multi-tier circular rotating car platform
 * - Electric blue, purple/violet, and solar gold accent lighting
 * - Hero 3/4 automotive camera angle where the 3D sports car occupies 45–50% of the center stage
 * - Smooth 360° turntable rotation, pointer drag orbit, suspension ride-height preview,
 *   wheel rim tinting, neon underglow, and nitro exhaust preview burst.
 */
export class CarShowroomPreview {
  constructor(canvas, sharedEnvMap = null) {
    this.canvas = canvas;
    this.sharedEnvMap = sharedEnvMap;
    this.isActive = false;
    this.rafId = null;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050814);
    this.scene.fog = new THREE.FogExp2(0x060918, 0.024);

    if (sharedEnvMap) {
      this.scene.environment = sharedEnvMap;
      this.scene.environmentIntensity = 1.95;
    }

    // Hero 3/4 front-side automotive camera framing (car fills ~45-50% of center showroom)
    this.camera = new THREE.PerspectiveCamera(29, 16 / 9, 0.25, 60);
    this.cameraTarget = new THREE.Vector3(0, 0.22, 0);
    this.targetCamDist = 4.28;
    this.currentCamDist = 4.28;
    this.targetCamHeight = 1.06;
    this.currentCamHeight = 1.06;
    this.isInspectMode = false;

    this.camera.position.set(
      this.currentCamDist * 0.68,
      this.currentCamHeight,
      this.currentCamDist * 0.74
    );
    this.camera.lookAt(this.cameraTarget);

    // Performance & Graphics settings (defaults to LOW for instant 60 FPS startup)
    this.graphicsQuality = 'low';
    this.fpsLimit = 60;
    this.reflectionQuality = 'low';

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });
    this.renderer.setPixelRatio(0.9);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.24;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Turntable root that rotates smoothly 360 degrees
    this.turntableGroup = new THREE.Group();
    this.scene.add(this.turntableGroup);

    this.vehicleHolder = new THREE.Group();
    this.turntableGroup.add(this.vehicleHolder);

    this.currentCarId = null;
    this.currentColorHex = null;
    this.currentRimColorHex = null;
    this.currentUnderglowHex = '#00e5ff';
    this.currentSuspensionLevel = 1;
    this.activeWheels = [];
    // Initial 3/4 front-left showcase angle so front grille, headlights, and side profile shine
    this.turntableAngle = -0.58;
    this.autoRotate = true;
    this.spinWheelsPreview = true;
    this.isDragging = false;
    this.lastPointerX = 0;
    this.lastPointerY = 0;
    this.nitroPreviewTimer = 0;
    this.cachedBmwFbxTemplate = null;
    this.cachedBmwLiveryTex = null;

    this._setupGarageArchitecture();
    this._setupPointerControls();
    this.setGraphicsConfig({ quality: 'low', fpsLimit: 60, reflections: 'low' });
  }

  setGraphicsConfig(cfg = {}) {
    if (cfg.quality) this.graphicsQuality = cfg.quality;
    if (cfg.fpsLimit) this.fpsLimit = Number(cfg.fpsLimit) || 60;
    if (cfg.reflections) this.reflectionQuality = cfg.reflections;

    const dpr = window.devicePixelRatio || 1;
    let targetPr = 0.9;
    if (this.graphicsQuality === 'low') {
      targetPr = Math.min(dpr, 0.9);
    } else if (this.graphicsQuality === 'medium') {
      targetPr = Math.min(dpr, 1.15);
    } else if (this.graphicsQuality === 'high') {
      targetPr = Math.min(dpr, 1.4);
    } else {
      targetPr = Math.min(dpr, 1.7);
    }
    this.renderer.setPixelRatio(targetPr);

    const refl = this.reflectionQuality || this.graphicsQuality;
    if (refl === 'low') {
      this.scene.environmentIntensity = 0.88;
      if (this.purpleFillLight) this.purpleFillLight.visible = true;
      if (this.goldAccentLight) this.goldAccentLight.visible = false;
    } else if (refl === 'medium') {
      this.scene.environmentIntensity = 1.35;
      if (this.purpleFillLight) this.purpleFillLight.visible = true;
      if (this.goldAccentLight) this.goldAccentLight.visible = true;
    } else {
      this.scene.environmentIntensity = 1.85;
      if (this.purpleFillLight) this.purpleFillLight.visible = true;
      if (this.goldAccentLight) this.goldAccentLight.visible = true;
    }

    if (this.isActive) {
      this.resize();
    }
  }

  setInspectMode(enabled) {
    this.isInspectMode = Boolean(enabled);
    if (this.isInspectMode) {
      this.targetCamDist = 3.72;
      this.targetCamHeight = 0.96;
    } else {
      this.targetCamDist = 4.28;
      this.targetCamHeight = 1.06;
    }
  }

  setBmwTemplate(fbxTemplate, liveryTex) {
    this.cachedBmwFbxTemplate = fbxTemplate;
    this.cachedBmwLiveryTex = liveryTex;
    if (this.currentCarId === 'bmw_csl' && this.isActive) {
      this.previewCar('bmw_csl', this.currentColorHex);
    }
  }

  _createSkylineWindowTexture() {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#060a18';
    ctx.fillRect(0, 0, 128, 256);

    const palette = ['#38bdf8', '#00e5ff', '#a855f7', '#fde047', '#60a5fa', '#1e293b'];
    for (let row = 4; row < 248; row += 10) {
      for (let col = 6; col < 120; col += 14) {
        const seed = ((row * 31 + col * 17) % 100);
        if (seed < 62) {
          ctx.fillStyle = palette[seed % palette.length];
          ctx.fillRect(col, row, 9, 5);
        }
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  _setupGarageArchitecture() {
    // 1. Cinematic Automotive Studio Lighting (Electric Blue + Purple/Violet + Warm Key)
    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x090d1e, 1.65);
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 3.1);
    keyLight.position.set(5.2, 7.8, 5.4);
    this.scene.add(keyLight);

    const cyanRimLight = new THREE.DirectionalLight(0x00e5ff, 2.35);
    cyanRimLight.position.set(-6.2, 4.2, -5.2);
    this.scene.add(cyanRimLight);

    this.purpleFillLight = new THREE.PointLight(0xa855f7, 2.2, 18);
    this.purpleFillLight.position.set(-4.6, 2.5, 3.4);
    this.scene.add(this.purpleFillLight);

    this.goldAccentLight = new THREE.PointLight(0xfacc15, 1.6, 16);
    this.goldAccentLight.position.set(4.6, 2.0, -3.5);
    this.scene.add(this.goldAccentLight);

    // Under-car customizable Neon Underglow Light
    this.underglowLight = new THREE.PointLight(0x00e5ff, 2.4, 5.6);
    this.underglowLight.position.set(0, -0.16, 0);
    this.turntableGroup.add(this.underglowLight);

    // 2. Reflective Polished Dark Showroom Floor
    const floorGeo = new THREE.CircleGeometry(24, 48);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x060915,
      metalness: 0.72,
      roughness: 0.22,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = -0.46;
    this.scene.add(floorMesh);

    // Concentric showroom floor neon reflection rings
    const floorRingConfigs = [
      { rIn: 4.18, rOut: 4.26, col: 0x00e5ff, op: 0.55 },
      { rIn: 5.35, rOut: 5.42, col: 0xa855f7, op: 0.38 },
      { rIn: 6.85, rOut: 6.92, col: 0x38bdf8, op: 0.24 },
    ];
    floorRingConfigs.forEach((rc) => {
      const rg = new THREE.RingGeometry(rc.rIn, rc.rOut, 64);
      rg.rotateX(-Math.PI / 2);
      const rm = new THREE.MeshBasicMaterial({
        color: rc.col,
        transparent: true,
        opacity: rc.op,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(rg, rm);
      mesh.position.y = -0.452;
      this.scene.add(mesh);
    });

    // 3. Multi-Tier Circular Rotating Car Platform (Turntable Pedestal)
    const baseTierGeo = new THREE.CylinderGeometry(3.45, 3.72, 0.12, 64);
    const baseTierMat = new THREE.MeshStandardMaterial({
      color: 0x0a0f22,
      metalness: 0.78,
      roughness: 0.2,
    });
    const baseTier = new THREE.Mesh(baseTierGeo, baseTierMat);
    baseTier.position.y = -0.41;
    this.turntableGroup.add(baseTier);

    const topStageGeo = new THREE.CylinderGeometry(3.08, 3.24, 0.1, 64);
    const topStageMat = new THREE.MeshStandardMaterial({
      color: 0x101732,
      metalness: 0.72,
      roughness: 0.16,
    });
    const topStage = new THREE.Mesh(topStageGeo, topStageMat);
    topStage.position.y = -0.34;
    this.turntableGroup.add(topStage);

    // Glowing Inner Electric Cyan Ring on Platform
    const innerRingGeo = new THREE.RingGeometry(2.94, 3.06, 64);
    innerRingGeo.rotateX(-Math.PI / 2);
    this.pedestalRingMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      side: THREE.DoubleSide,
    });
    const innerRingMesh = new THREE.Mesh(innerRingGeo, this.pedestalRingMat);
    innerRingMesh.position.y = -0.286;
    this.turntableGroup.add(innerRingMesh);

    // Glowing Outer Purple/Violet Trim Ring on Platform
    const outerRingGeo = new THREE.RingGeometry(3.34, 3.44, 64);
    outerRingGeo.rotateX(-Math.PI / 2);
    this.outerPedestalRingMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      side: THREE.DoubleSide,
    });
    const outerRingMesh = new THREE.Mesh(outerRingGeo, this.outerPedestalRingMat);
    outerRingMesh.position.y = -0.346;
    this.turntableGroup.add(outerRingMesh);

    // 12 Radial Gold & Cyan Turntable Accent Struts
    const strutGeo = new THREE.BoxGeometry(0.06, 0.016, 0.36);
    const strutGoldMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const strutCyanMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      const strut = new THREE.Mesh(strutGeo, i % 2 === 0 ? strutGoldMat : strutCyanMat);
      strut.position.set(Math.sin(ang) * 3.2, -0.29, Math.cos(ang) * 3.2);
      strut.rotation.y = ang;
      this.turntableGroup.add(strut);
    }

    // Underglow Aura Disc + Soft Contact Shadow Disc directly beneath car
    const underglowGeo = new THREE.CircleGeometry(2.25, 36);
    underglowGeo.rotateX(-Math.PI / 2);
    this.underglowDiscMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.26,
      depthWrite: false,
    });
    const underglowDisc = new THREE.Mesh(underglowGeo, this.underglowDiscMat);
    underglowDisc.position.y = -0.283;
    this.turntableGroup.add(underglowDisc);

    const shadowDiscGeo = new THREE.PlaneGeometry(3.1, 5.2);
    shadowDiscGeo.rotateX(-Math.PI / 2);
    const shadowDiscMat = new THREE.MeshBasicMaterial({
      color: 0x02040a,
      transparent: true,
      opacity: 0.68,
      depthWrite: false,
    });
    const shadowDisc = new THREE.Mesh(shadowDiscGeo, shadowDiscMat);
    shadowDisc.position.y = -0.281;
    this.turntableGroup.add(shadowDisc);

    // 4. Illuminated Showroom Ceiling & Studio Softbox Light Canopy
    const haloRingGeo = new THREE.RingGeometry(2.75, 3.12, 64);
    haloRingGeo.rotateX(Math.PI / 2);
    const haloRingMat = new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
      side: THREE.DoubleSide,
    });
    const haloRing = new THREE.Mesh(haloRingGeo, haloRingMat);
    haloRing.position.y = 3.35;
    this.scene.add(haloRing);

    const outerHaloGeo = new THREE.RingGeometry(3.65, 3.82, 64);
    outerHaloGeo.rotateX(Math.PI / 2);
    const outerHaloMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      side: THREE.DoubleSide,
    });
    const outerHalo = new THREE.Mesh(outerHaloGeo, outerHaloMat);
    outerHalo.position.y = 3.42;
    this.scene.add(outerHalo);

    // Twin overhead linear LED softbox strips for long specular body reflections
    const softboxGeo = new THREE.PlaneGeometry(0.32, 5.8);
    softboxGeo.rotateX(Math.PI / 2);
    const softboxMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      side: THREE.DoubleSide,
    });
    [-1.45, 1.45].forEach((sx) => {
      const sb = new THREE.Mesh(softboxGeo, softboxMat);
      sb.position.set(sx, 3.28, 0);
      this.scene.add(sb);
    });

    // 5. Panoramic Glass Showroom Window, Outer Wing Arches, Distant Mountains & Night City Skyline
    // (Positioned cleanly in the background so no vertical bars block the center car or top HUD)
    const horizonGlowGeo = new THREE.PlaneGeometry(38, 9.5);
    const horizonGlowMat = new THREE.MeshBasicMaterial({
      color: 0x111a3a,
      transparent: true,
      opacity: 0.72,
    });
    const horizonBackdrop = new THREE.Mesh(horizonGlowGeo, horizonGlowMat);
    horizonBackdrop.position.set(0, 2.8, -19.5);
    this.scene.add(horizonBackdrop);

    // Distant twilight mountain peaks behind the city skyline
    const mountainMat = new THREE.MeshLambertMaterial({
      color: 0x0f172a,
      emissive: 0x1e1b4b,
      emissiveIntensity: 0.45,
    });
    const mountainPeaks = [
      { x: -11.5, z: -17.5, r: 4.5, h: 4.8 },
      { x: -5.8, z: -18.2, r: 5.2, h: 5.6 },
      { x: 0.6, z: -18.8, r: 5.6, h: 5.2 },
      { x: 6.4, z: -18.0, r: 4.8, h: 5.4 },
      { x: 11.8, z: -17.2, r: 4.4, h: 4.6 },
    ];
    mountainPeaks.forEach((mp) => {
      const mCone = new THREE.Mesh(new THREE.ConeGeometry(mp.r, mp.h, 6), mountainMat);
      mCone.position.set(mp.x, mp.h * 0.5 - 0.5, mp.z);
      this.scene.add(mCone);
    });

    // Illuminated 3D Night City Skyline visible through the showroom glass window
    const skylineTex = this._createSkylineWindowTexture();
    const towerMat = new THREE.MeshBasicMaterial({
      map: skylineTex,
    });
    const towerCapMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const skylineTowers = [
      { x: -10.2, z: -13.5, w: 1.5, h: 4.6, d: 1.2 },
      { x: -7.8, z: -14.2, w: 1.7, h: 5.8, d: 1.4 },
      { x: -5.2, z: -13.8, w: 1.4, h: 4.2, d: 1.2 },
      { x: -2.9, z: -14.6, w: 1.6, h: 5.1, d: 1.3 },
      { x: 2.8, z: -14.5, w: 1.6, h: 5.3, d: 1.3 },
      { x: 5.3, z: -13.8, w: 1.4, h: 4.4, d: 1.2 },
      { x: 7.9, z: -14.2, w: 1.8, h: 6.0, d: 1.4 },
      { x: 10.4, z: -13.4, w: 1.5, h: 4.5, d: 1.2 },
    ];
    skylineTowers.forEach((t) => {
      const bMesh = new THREE.Mesh(new THREE.BoxGeometry(t.w, t.h, t.d), towerMat);
      bMesh.position.set(t.x, t.h * 0.5 - 0.46, t.z);
      this.scene.add(bMesh);

      const roofBeacon = new THREE.Mesh(
        new THREE.BoxGeometry(t.w * 0.88, 0.06, 0.08),
        towerCapMat
      );
      roofBeacon.position.set(t.x, t.h - 0.44, t.z + t.d * 0.5);
      this.scene.add(roofBeacon);
    });

    // Panoramic Showroom Glass Wall Horizontal Mullion Beams (Clean, wide architectural horizon lines)
    const mullionMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.85,
      roughness: 0.2,
    });
    const neonBeamMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const purpleBeamMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });

    const lowWall = new THREE.Mesh(new THREE.BoxGeometry(26, 0.28, 0.24), mullionMat);
    lowWall.position.set(0, -0.32, -8.6);
    this.scene.add(lowWall);

    const lowNeonStrip = new THREE.Mesh(new THREE.BoxGeometry(26, 0.045, 0.26), neonBeamMat);
    lowNeonStrip.position.set(0, -0.17, -8.58);
    this.scene.add(lowNeonStrip);

    const highMullion = new THREE.Mesh(new THREE.BoxGeometry(26, 0.22, 0.24), mullionMat);
    highMullion.position.set(0, 3.55, -8.6);
    this.scene.add(highMullion);

    const highPurpleStrip = new THREE.Mesh(
      new THREE.BoxGeometry(26, 0.045, 0.26),
      purpleBeamMat
    );
    highPurpleStrip.position.set(0, 3.42, -8.58);
    this.scene.add(highPurpleStrip);

    // Twin Nitro Exhaust Preview Flame Cones (activated when testing/upgrading NITRO)
    const flameGeo = new THREE.ConeGeometry(0.15, 0.92, 12);
    flameGeo.rotateX(-Math.PI / 2);
    this.nitroFlameMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
    });
    this.nitroFlames = [-0.44, 0.44].map((fx) => {
      const f = new THREE.Mesh(flameGeo, this.nitroFlameMat);
      f.position.set(fx, 0.04, -2.55);
      this.turntableGroup.add(f);
      return f;
    });
  }

  _setupPointerControls() {
    if (!this.canvas) return;
    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.target !== this.canvas) return;
      this.isDragging = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.canvas.setPointerCapture?.(e.pointerId);
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastPointerX;
      const dy = e.clientY - this.lastPointerY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.turntableAngle += dx * 0.011;
      this.targetCamHeight = THREE.MathUtils.clamp(
        this.targetCamHeight + dy * 0.005,
        0.68,
        2.25
      );
    });
    const stopDrag = (e) => {
      this.isDragging = false;
      if (e && e.pointerId !== undefined) {
        try {
          this.canvas.releasePointerCapture?.(e.pointerId);
        } catch (_err) {}
      }
    };
    this.canvas.addEventListener('pointerup', stopDrag);
    this.canvas.addEventListener('pointercancel', stopDrag);
  }

  resetCameraView() {
    this.turntableAngle = -0.58;
    this.targetCamDist = this.isInspectMode ? 3.72 : 4.28;
    this.targetCamHeight = this.isInspectMode ? 0.96 : 1.06;
    this.cameraTarget.set(0, 0.22, 0);
    this.renderOnce();
  }

  renderOnce() {
    if (!this.renderer || !this.scene || !this.camera) return;
    this.turntableGroup.rotation.y = this.turntableAngle;
    this.camera.position.set(
      this.currentCamDist * 0.68,
      this.currentCamHeight,
      this.currentCamDist * 0.74
    );
    this.camera.lookAt(this.cameraTarget);
    this.renderer.render(this.scene, this.camera);
  }

  focusUpgradeSection(section) {
    if (this.isInspectMode) return;
    if (section === 'engine') {
      this.targetCamDist = 3.92;
      this.targetCamHeight = 1.18;
    } else if (section === 'handling') {
      this.targetCamDist = 4.02;
      this.targetCamHeight = 0.96;
    } else if (section === 'suspension') {
      this.targetCamDist = 3.85;
      this.targetCamHeight = 0.82;
    } else if (section === 'nitro') {
      this.targetCamDist = 4.05;
      this.targetCamHeight = 1.02;
      this.triggerNitroPreviewBurst();
    } else if (section === 'customize') {
      this.targetCamDist = 4.12;
      this.targetCamHeight = 1.05;
    } else {
      this.targetCamDist = 4.28;
      this.targetCamHeight = 1.06;
    }
  }

  triggerNitroPreviewBurst() {
    this.nitroPreviewTimer = 1.45;
  }

  setUnderglowColor(hexStr) {
    this.currentUnderglowHex = hexStr || '#00e5ff';
    const col = new THREE.Color(this.currentUnderglowHex);
    if (this.underglowLight) this.underglowLight.color.copy(col);
    if (this.underglowDiscMat) this.underglowDiscMat.color.copy(col);
    if (this.pedestalRingMat) this.pedestalRingMat.color.copy(col);
  }

  setSuspensionLevel(level) {
    this.currentSuspensionLevel = Math.max(1, Math.min(5, Number(level) || 1));
    const stanceDrop = (this.currentSuspensionLevel - 1) * 0.022;
    this.vehicleHolder.position.y = -stanceDrop;
  }

  setRimColor(hexStr) {
    this.currentRimColorHex = hexStr || null;
    if (!this.currentRimColorHex) return;
    const rimCol = new THREE.Color(this.currentRimColorHex);
    this.vehicleHolder.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      const mName = (child.material.name || child.name || '').toLowerCase();
      if (mName.includes('wheel') || mName.includes('rim')) {
        if (child.material.color) {
          child.material = child.material.clone();
          child.material.color.copy(rimCol);
        }
      }
    });
  }

  _clearVehicleHolder() {
    while (this.vehicleHolder.children.length > 0) {
      const root = this.vehicleHolder.children[0];
      this.vehicleHolder.remove(root);
      root.traverse((node) => {
        if (node.isMesh && node.material) {
          const mats = Array.isArray(node.material) ? node.material : [node.material];
          mats.forEach((m) => {
            if (m && typeof m.dispose === 'function') m.dispose();
          });
        }
      });
    }
    this.activeWheels = [];
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(rect.width || window.innerWidth || 800, 320);
    const h = Math.max(rect.height || window.innerHeight || 450, 200);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  async previewCar(carId, customColorHex = null) {
    const cleanPaint = customColorHex || null;
    if (
      this.currentCarId === carId &&
      this.currentColorHex === cleanPaint &&
      this.vehicleHolder.children.length > 0 &&
      !(carId === 'bmw_csl' && this.cachedBmwFbxTemplate && !this._bmwFbxApplied)
    ) {
      this.renderOnce();
      return;
    }

    this.currentCarId = carId;
    this.currentColorHex = cleanPaint;
    const requestToken = `${carId}_${cleanPaint || 'default'}_${Date.now()}`;
    this._latestToken = requestToken;

    this._clearVehicleHolder();

    const spec = getVehicleSpecById(carId);
    const accentHex = cleanPaint || spec.defaultColor || '#00e5ff';
    if (this.pedestalRingMat && !this.currentUnderglowHex) {
      this.pedestalRingMat.color.set(accentHex);
    }

    try {
      if (carId === 'classic_kart') {
        const tempKart = buildMicroKart({
          carbonTex: null,
          tireRubberTex: null,
          brushedMetalTex: null,
        });
        tempKart.kartRoot.scale.setScalar(235);
        tempKart.kartRoot.position.set(0, -0.28, 0);
        if (cleanPaint) {
          tempKart.setChassisColor(cleanPaint);
        }
        this.vehicleHolder.add(tempKart.kartRoot);
        this.activeWheels = tempKart.wheelMeshes || [];
        if (this.currentRimColorHex) this.setRimColor(this.currentRimColorHex);
        this.renderOnce();
        return;
      }

      if (carId === 'bmw_csl') {
        let attachedFbxSuccessfully = false;
        if (this.cachedBmwFbxTemplate) {
          try {
            const tempKart = buildMicroKart({
              carbonTex: null,
              tireRubberTex: null,
              brushedMetalTex: null,
            });
            tempKart.kartRoot.scale.setScalar(238);
            tempKart.kartRoot.position.set(0, -0.28, 0);
            tempKart.attachBmwFbxKart(
              this.cachedBmwFbxTemplate,
              this.cachedBmwLiveryTex
            );
            if (cleanPaint) {
              tempKart.setChassisColor(cleanPaint);
            }
            tempKart.kartRoot.updateMatrixWorld(true);
            const checkBox = new THREE.Box3().setFromObject(tempKart.kartRoot);
            const checkSize = new THREE.Vector3();
            checkBox.getSize(checkSize);
            if (checkSize.x > 0.5 && checkSize.z > 0.5) {
              this._bmwFbxApplied = true;
              attachedFbxSuccessfully = true;
              this.vehicleHolder.add(tempKart.kartRoot);
              this.activeWheels = tempKart.wheelMeshes || [];
              if (this.currentRimColorHex) this.setRimColor(this.currentRimColorHex);
              this.renderOnce();
              return;
            }
          } catch (fbxErr) {
            console.warn('BMW FBX showroom attach fallback:', fbxErr);
          }
        }

        if (!attachedFbxSuccessfully) {
          // Immediately render the custom-sculpted 3D 2015 BMW 3.0 CSL Hommage R with M-stripes
          this._bmwFbxApplied = false;
          const instantBmw = carPackAssets.buildBmwHommageStandin(cleanPaint);
          instantBmw.rootGroup.scale.setScalar(1.18);
          this.vehicleHolder.add(instantBmw.rootGroup);
          this.activeWheels = instantBmw.wheelVisuals || [];
          if (this.currentRimColorHex) this.setRimColor(this.currentRimColorHex);
          this.renderOnce();
          return;
        }
      }

      // Immediately show a sculpted 3D stand-in if fab.fbx is still streaming over the network
      if (!carPackAssets.fbxRoot && !spec.isCustomSculptedHypercar) {
        const quickStandin = carPackAssets.buildSculptedHypercar(
          spec,
          cleanPaint || spec.defaultColor
        );
        quickStandin.rootGroup.scale.setScalar(1.18);
        this.vehicleHolder.add(quickStandin.rootGroup);
        this.activeWheels = quickStandin.wheelVisuals || [];
        this.renderOnce();
      }

      const instance = await carPackAssets.buildCarInstance(
        carId,
        cleanPaint || (spec.factoryLivery ? null : spec.defaultColor)
      );
      if (this._latestToken !== requestToken) return;
      this._clearVehicleHolder();
      instance.rootGroup.scale.setScalar(1.18);
      this.vehicleHolder.add(instance.rootGroup);
      this.activeWheels = instance.wheelVisuals || [];
      if (this.currentRimColorHex) this.setRimColor(this.currentRimColorHex);
      this.renderOnce();
    } catch (err) {
      console.warn('Showroom preview fallback:', err);
      const fallbackCar = carPackAssets.buildBmwHommageStandin(cleanPaint);
      fallbackCar.rootGroup.scale.setScalar(1.18);
      this.vehicleHolder.add(fallbackCar.rootGroup);
      this.activeWheels = fallbackCar.wheelVisuals || [];
      this.renderOnce();
    }
  }

  start() {
    if (this.isActive) {
      this.resize();
      return;
    }
    this.isActive = true;
    this.resize();
    let lastTime = performance.now();
    let lastRenderTime = 0;

    const tick = (now) => {
      if (!this.isActive) return;
      this.rafId = requestAnimationFrame(tick);

      // Respect FPS limit (30 / 60 / 90)
      const minFrameInterval =
        this.fpsLimit === 30 ? 31.5 : this.fpsLimit === 90 ? 10.2 : 15.2;
      if (now - lastRenderTime < minFrameInterval) return;
      lastRenderTime = now;

      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      if (this.autoRotate && !this.isDragging) {
        this.turntableAngle += dt * 0.38;
      }
      this.turntableGroup.rotation.y = this.turntableAngle;

      // Smoothly interpolate camera distance and height
      this.currentCamDist +=
        (this.targetCamDist - this.currentCamDist) * Math.min(1, dt * 6);
      this.currentCamHeight +=
        (this.targetCamHeight - this.currentCamHeight) * Math.min(1, dt * 6);
      this.camera.position.set(
        this.currentCamDist * 0.68,
        this.currentCamHeight,
        this.currentCamDist * 0.74
      );
      this.camera.lookAt(this.cameraTarget);

      if (
        this.spinWheelsPreview &&
        this.activeWheels.length > 0 &&
        (this.graphicsQuality !== 'low' || this.nitroPreviewTimer > 0)
      ) {
        const wheelSpeed = this.nitroPreviewTimer > 0 ? 18.0 : 3.6;
        for (let i = 0; i < this.activeWheels.length; i++) {
          const w = this.activeWheels[i];
          if (w) w.rotation.x += dt * wheelSpeed;
        }
      }

      if (this.nitroPreviewTimer > 0) {
        this.nitroPreviewTimer = Math.max(0, this.nitroPreviewTimer - dt);
        const pulse =
          Math.min(1, this.nitroPreviewTimer * 2.5) *
          (0.75 + 0.25 * Math.sin(now * 0.045));
        this.nitroFlameMat.opacity = pulse;
        const s = 0.85 + 0.35 * Math.sin(now * 0.06);
        this.nitroFlames.forEach((f) => f.scale.set(1, 1, s));
      } else if (this.nitroFlameMat.opacity > 0) {
        this.nitroFlameMat.opacity = 0;
      }

      this.renderer.render(this.scene, this.camera);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  stop() {
    this.isActive = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
