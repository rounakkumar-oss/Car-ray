import * as THREE from 'three';
import { carPackAssets, getVehicleSpecById } from './CarCatalog.js';
import { buildMicroKart } from './MicroKartBuilder.js';

/**
 * Full-Screen AAA 3D Garage Showroom Renderer.
 * Features a modern architectural racing garage bay, multi-ring illuminated rotating
 * turntable platform, overhead studio softbox trusses, glowing neon columns,
 * real-time suspension ride-height preview, neon underglow, wheel rim tinting,
 * nitro exhaust preview burst, and smooth 360° interactive pointer orbit.
 */
export class CarShowroomPreview {
  constructor(canvas, sharedEnvMap = null) {
    this.canvas = canvas;
    this.sharedEnvMap = sharedEnvMap;
    this.isActive = false;
    this.rafId = null;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060814);
    this.scene.fog = new THREE.FogExp2(0x060814, 0.042);

    if (sharedEnvMap) {
      this.scene.environment = sharedEnvMap;
      this.scene.environmentIntensity = 1.85;
    }

    this.camera = new THREE.PerspectiveCamera(32, 16 / 9, 0.25, 48);
    this.camera.position.set(3.85, 1.48, 4.35);
    this.cameraTarget = new THREE.Vector3(0, 0.18, 0);
    this.camera.lookAt(this.cameraTarget);

    // Smooth camera focus presets when clicking ENGINE / HANDLING / SUSPENSION / NITRO / CUSTOMIZE / INSPECT
    this.targetCamDist = 5.55;
    this.currentCamDist = 5.55;
    this.targetCamHeight = 1.48;
    this.currentCamHeight = 1.48;
    this.isInspectMode = false;

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
    this.renderer.setPixelRatio(0.85);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Turntable root that rotates smoothly
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
    this.turntableAngle = 0.62;
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
    let targetPr = 0.85;
    if (this.graphicsQuality === 'low') {
      targetPr = Math.min(dpr, 0.85);
    } else if (this.graphicsQuality === 'medium') {
      targetPr = Math.min(dpr, 1.05);
    } else if (this.graphicsQuality === 'high') {
      targetPr = Math.min(dpr, 1.35);
    } else {
      targetPr = Math.min(dpr, 1.65);
    }
    this.renderer.setPixelRatio(targetPr);

    const refl = this.reflectionQuality || this.graphicsQuality;
    if (refl === 'low') {
      this.scene.environmentIntensity = 0.65;
      if (this.purpleFillLight) this.purpleFillLight.visible = false;
      if (this.goldAccentLight) this.goldAccentLight.visible = false;
    } else if (refl === 'medium') {
      this.scene.environmentIntensity = 1.15;
      if (this.purpleFillLight) this.purpleFillLight.visible = true;
      if (this.goldAccentLight) this.goldAccentLight.visible = false;
    } else {
      this.scene.environmentIntensity = 1.65;
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
      this.targetCamDist = 4.85;
      this.targetCamHeight = 1.35;
    } else {
      this.targetCamDist = 5.55;
      this.targetCamHeight = 1.48;
    }
  }

  setBmwTemplate(fbxTemplate, liveryTex) {
    this.cachedBmwFbxTemplate = fbxTemplate;
    this.cachedBmwLiveryTex = liveryTex;
    if (this.currentCarId === 'bmw_csl' && this.isActive) {
      this.previewCar('bmw_csl', this.currentColorHex);
    }
  }

  _setupGarageArchitecture() {
    // 1. Optimized Automotive Showroom Lighting
    const hemi = new THREE.HemisphereLight(0xc7d2fe, 0x090d1a, 1.5);
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 2.8);
    keyLight.position.set(5.5, 8.0, 5.2);
    this.scene.add(keyLight);

    const cyanRimLight = new THREE.DirectionalLight(0x38bdf8, 2.0);
    cyanRimLight.position.set(-6.5, 4.0, -5.5);
    this.scene.add(cyanRimLight);

    this.purpleFillLight = new THREE.PointLight(0xa855f7, 1.8, 16);
    this.purpleFillLight.position.set(-4.8, 2.4, 3.6);
    this.scene.add(this.purpleFillLight);

    this.goldAccentLight = new THREE.PointLight(0xfacc15, 1.4, 15);
    this.goldAccentLight.position.set(4.8, 1.9, -3.8);
    this.scene.add(this.goldAccentLight);

    // Under-car customizable Neon Underglow Light
    this.underglowLight = new THREE.PointLight(0x00e5ff, 2.0, 5.2);
    this.underglowLight.position.set(0, -0.18, 0);
    this.turntableGroup.add(this.underglowLight);

    // 2. Lightweight Showroom Floor (MeshStandardMaterial instead of heavy clearcoat Physical)
    const floorGeo = new THREE.CircleGeometry(18, 36);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x070a15,
      metalness: 0.55,
      roughness: 0.32,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = -0.46;
    this.scene.add(floorMesh);

    // Subtle radial ring on showroom floor
    const outerFloorRingGeo = new THREE.RingGeometry(4.42, 4.5, 48);
    outerFloorRingGeo.rotateX(-Math.PI / 2);
    const outerFloorRingMat = new THREE.MeshBasicMaterial({
      color: 0x4f46e5,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
    });
    const outerFloorRing = new THREE.Mesh(outerFloorRingGeo, outerFloorRingMat);
    outerFloorRing.position.y = -0.452;
    this.scene.add(outerFloorRing);

    // 3. Multi-Tier Rotating Display Platform (Pedestal)
    const baseTierGeo = new THREE.CylinderGeometry(3.62, 3.88, 0.12, 48);
    const baseTierMat = new THREE.MeshStandardMaterial({
      color: 0x0b1022,
      metalness: 0.68,
      roughness: 0.24,
    });
    const baseTier = new THREE.Mesh(baseTierGeo, baseTierMat);
    baseTier.position.y = -0.41;
    this.turntableGroup.add(baseTier);

    const topStageGeo = new THREE.CylinderGeometry(3.2, 3.35, 0.1, 48);
    const topStageMat = new THREE.MeshStandardMaterial({
      color: 0x11172e,
      metalness: 0.62,
      roughness: 0.2,
    });
    const topStage = new THREE.Mesh(topStageGeo, topStageMat);
    topStage.position.y = -0.34;
    this.turntableGroup.add(topStage);

    // Glowing Inner Neon Ring on Platform
    const innerRingGeo = new THREE.RingGeometry(3.08, 3.19, 48);
    innerRingGeo.rotateX(-Math.PI / 2);
    this.pedestalRingMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      side: THREE.DoubleSide,
    });
    const innerRingMesh = new THREE.Mesh(innerRingGeo, this.pedestalRingMat);
    innerRingMesh.position.y = -0.286;
    this.turntableGroup.add(innerRingMesh);

    // Glowing Outer Gold/Purple Trim Ring on Platform
    const outerRingGeo = new THREE.RingGeometry(3.5, 3.6, 48);
    outerRingGeo.rotateX(-Math.PI / 2);
    this.outerPedestalRingMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      side: THREE.DoubleSide,
    });
    const outerRingMesh = new THREE.Mesh(outerRingGeo, this.outerPedestalRingMat);
    outerRingMesh.position.y = -0.346;
    this.turntableGroup.add(outerRingMesh);

    // 8 Radial Turntable Accent Struts
    const strutGeo = new THREE.BoxGeometry(0.06, 0.015, 0.4);
    const strutMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const strut = new THREE.Mesh(strutGeo, strutMat);
      strut.position.set(Math.sin(ang) * 3.34, -0.29, Math.cos(ang) * 3.34);
      strut.rotation.y = ang;
      this.turntableGroup.add(strut);
    }

    // Underglow Aura Disc directly beneath car
    const underglowGeo = new THREE.CircleGeometry(2.1, 32);
    underglowGeo.rotateX(-Math.PI / 2);
    this.underglowDiscMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
    });
    const underglowDisc = new THREE.Mesh(underglowGeo, this.underglowDiscMat);
    underglowDisc.position.y = -0.283;
    this.turntableGroup.add(underglowDisc);

    // 4. Showroom Architectural Pillars & Overhead Light Bays
    const pillarGeo = new THREE.BoxGeometry(0.45, 5.5, 0.45);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x0d1326,
      metalness: 0.55,
      roughness: 0.35,
    });
    const neonStripGeo = new THREE.BoxGeometry(0.06, 4.8, 0.06);
    const neonBlueMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const neonPurpleMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });

    const pillarCoords = [
      [-6.5, -5.8],
      [-3.2, -7.2],
      [3.2, -7.2],
      [6.5, -5.8],
    ];
    pillarCoords.forEach(([px, pz], idx) => {
      const p = new THREE.Mesh(pillarGeo, pillarMat);
      p.position.set(px, 2.2, pz);
      p.lookAt(0, 2.2, 0);
      this.scene.add(p);

      const strip = new THREE.Mesh(
        neonStripGeo,
        idx % 2 === 0 ? neonBlueMat : neonPurpleMat
      );
      strip.position.set(px * 0.94, 2.2, pz * 0.94);
      strip.lookAt(0, 2.2, 0);
      this.scene.add(strip);
    });

    // Overhead Halo Light Canopy & Softbox Panels
    const haloRingGeo = new THREE.RingGeometry(2.9, 3.22, 48);
    haloRingGeo.rotateX(Math.PI / 2);
    const haloRingMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
    });
    const haloRing = new THREE.Mesh(haloRingGeo, haloRingMat);
    haloRing.position.y = 3.75;
    this.scene.add(haloRing);

    // Twin Nitro Exhaust Preview Flame Cones (activated when testing/upgrading NITRO)
    const flameGeo = new THREE.ConeGeometry(0.14, 0.85, 12);
    flameGeo.rotateX(-Math.PI / 2);
    this.nitroFlameMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
    });
    this.nitroFlames = [-0.42, 0.42].map((fx) => {
      const f = new THREE.Mesh(flameGeo, this.nitroFlameMat);
      f.position.set(fx, 0.02, -2.35);
      this.turntableGroup.add(f);
      return f;
    });
  }

  _setupPointerControls() {
    if (!this.canvas) return;
    this.canvas.addEventListener('pointerdown', (e) => {
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
        this.targetCamHeight + dy * 0.006,
        0.78,
        2.65
      );
    });
    const stopDrag = () => {
      this.isDragging = false;
    };
    this.canvas.addEventListener('pointerup', stopDrag);
    this.canvas.addEventListener('pointercancel', stopDrag);
  }

  focusUpgradeSection(section) {
    if (this.isInspectMode) return;
    if (section === 'engine') {
      this.targetCamDist = 5.05;
      this.targetCamHeight = 1.62;
    } else if (section === 'handling') {
      this.targetCamDist = 5.15;
      this.targetCamHeight = 1.18;
    } else if (section === 'suspension') {
      this.targetCamDist = 4.95;
      this.targetCamHeight = 0.94;
    } else if (section === 'nitro') {
      this.targetCamDist = 5.1;
      this.targetCamHeight = 1.25;
      this.triggerNitroPreviewBurst();
    } else if (section === 'customize') {
      this.targetCamDist = 5.25;
      this.targetCamHeight = 1.38;
    } else {
      this.targetCamDist = 5.55;
      this.targetCamHeight = 1.48;
    }
  }

  triggerNitroPreviewBurst() {
    this.nitroPreviewTimer = 1.35;
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
        tempKart.kartRoot.scale.setScalar(225);
        tempKart.kartRoot.position.set(0, -0.28, 0);
        if (cleanPaint) {
          tempKart.setChassisColor(cleanPaint);
        }
        this.vehicleHolder.add(tempKart.kartRoot);
        this.activeWheels = tempKart.wheelMeshes || [];
        if (this.currentRimColorHex) this.setRimColor(this.currentRimColorHex);
        return;
      }

      if (carId === 'bmw_csl') {
        const tempKart = buildMicroKart({
          carbonTex: null,
          tireRubberTex: null,
          brushedMetalTex: null,
        });
        tempKart.kartRoot.scale.setScalar(225);
        tempKart.kartRoot.position.set(0, -0.28, 0);
        if (this.cachedBmwFbxTemplate) {
          this._bmwFbxApplied = true;
          tempKart.attachBmwFbxKart(
            this.cachedBmwFbxTemplate.clone(true),
            this.cachedBmwLiveryTex
          );
          if (cleanPaint) {
            tempKart.setChassisColor(cleanPaint);
          }
        } else {
          this._bmwFbxApplied = false;
        }
        this.vehicleHolder.add(tempKart.kartRoot);
        this.activeWheels = tempKart.wheelMeshes || [];
        if (this.currentRimColorHex) this.setRimColor(this.currentRimColorHex);
        return;
      }

      const instance = await carPackAssets.buildCarInstance(carId, cleanPaint);
      if (this._latestToken !== requestToken) return;
      instance.rootGroup.scale.setScalar(1.06);
      this.vehicleHolder.add(instance.rootGroup);
      this.activeWheels = instance.wheelVisuals || [];
      if (this.currentRimColorHex) this.setRimColor(this.currentRimColorHex);
    } catch (err) {
      console.warn('Showroom preview fallback:', err);
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
      const minFrameInterval = this.fpsLimit === 30 ? 31.5 : this.fpsLimit === 90 ? 10.2 : 15.2;
      if (now - lastRenderTime < minFrameInterval) return;
      lastRenderTime = now;

      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      if (this.autoRotate && !this.isDragging) {
        this.turntableAngle += dt * 0.42;
      }
      this.turntableGroup.rotation.y = this.turntableAngle;

      // Smoothly interpolate camera distance and height
      this.currentCamDist += (this.targetCamDist - this.currentCamDist) * Math.min(1, dt * 6);
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
        const wheelSpeed = this.nitroPreviewTimer > 0 ? 18.0 : 3.8;
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
