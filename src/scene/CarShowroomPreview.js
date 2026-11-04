import * as THREE from 'three';
import { carPackAssets, getVehicleSpecById } from './CarCatalog.js';
import { buildMicroKart } from './MicroKartBuilder.js';

/**
 * Interactive 3D Showroom Turntable Renderer for the Car Selection Screen.
 * Supports smooth continuous 360° car rotation, pointer drag-to-orbit,
 * studio softbox lighting, reflective showroom pedestal, and live paint preview.
 */
export class CarShowroomPreview {
  constructor(canvas, sharedEnvMap = null) {
    this.canvas = canvas;
    this.sharedEnvMap = sharedEnvMap;
    this.isActive = false;
    this.rafId = null;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070a11);
    if (sharedEnvMap) {
      this.scene.environment = sharedEnvMap;
      this.scene.environmentIntensity = 1.65;
    }

    this.camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.2, 60);
    this.camera.position.set(4.15, 1.85, 4.55);
    this.camera.lookAt(0, 0.35, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Turntable root that rotates smoothly
    this.turntableGroup = new THREE.Group();
    this.scene.add(this.turntableGroup);

    this.vehicleHolder = new THREE.Group();
    this.turntableGroup.add(this.vehicleHolder);

    this.currentCarId = null;
    this.currentColorHex = null;
    this.activeWheels = [];
    this.turntableAngle = 0.55;
    this.autoRotate = true;
    this.spinWheelsPreview = true;
    this.isDragging = false;
    this.lastPointerX = 0;
    this.cachedBmwFbxTemplate = null;
    this.cachedBmwLiveryTex = null;

    this._setupStudioEnvironment();
    this._setupPointerControls();
  }

  setBmwTemplate(fbxTemplate, liveryTex) {
    this.cachedBmwFbxTemplate = fbxTemplate;
    this.cachedBmwLiveryTex = liveryTex;
    if (this.currentCarId === 'bmw_csl' && this.isActive) {
      this.previewCar('bmw_csl', this.currentColorHex);
    }
  }

  _setupStudioEnvironment() {
    // 3-Point Automotive Studio Lighting
    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x0f172a, 1.45);
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.8);
    keyLight.position.set(5.5, 7.5, 5.0);
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.1);
    rimLight.position.set(-6.0, 4.2, -5.5);
    this.scene.add(rimLight);

    const fillLight = new THREE.PointLight(0xf43f5e, 1.4, 14);
    fillLight.position.set(-4.2, 2.0, 3.8);
    this.scene.add(fillLight);

    // Showroom Turntable Platform & Neon Rim Ring
    const pedestalGeo = new THREE.CylinderGeometry(3.15, 3.35, 0.16, 64);
    const pedestalMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f1420,
      metalness: 0.65,
      roughness: 0.18,
      clearcoat: 0.9,
      clearcoatRoughness: 0.12
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.y = -0.38;
    this.turntableGroup.add(pedestal);

    const ringGeo = new THREE.RingGeometry(3.02, 3.12, 64);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.y = -0.295;
    this.turntableGroup.add(ringMesh);
    this.pedestalRingMat = ringMat;

    // Studio overhead softbox light strips (reflected in clearcoat)
    const softboxGeo = new THREE.PlaneGeometry(5.8, 0.55);
    const softboxMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide
    });
    [-1.1, 1.1].forEach((sx) => {
      const sb = new THREE.Mesh(softboxGeo, softboxMat);
      sb.position.set(sx, 3.6, 0);
      sb.rotation.x = Math.PI / 2;
      this.scene.add(sb);
    });
  }

  _setupPointerControls() {
    if (!this.canvas) return;
    this.canvas.addEventListener('pointerdown', (e) => {
      this.isDragging = true;
      this.lastPointerX = e.clientX;
      this.canvas.setPointerCapture?.(e.pointerId);
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastPointerX;
      this.lastPointerX = e.clientX;
      this.turntableAngle += dx * 0.011;
    });
    const stopDrag = () => {
      this.isDragging = false;
    };
    this.canvas.addEventListener('pointerup', stopDrag);
    this.canvas.addEventListener('pointercancel', stopDrag);
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(rect.width || 480, 240);
    const h = Math.max(rect.height || 260, 160);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  async previewCar(carId, customColorHex = null) {
    this.currentCarId = carId;
    this.currentColorHex = customColorHex;
    const requestToken = `${carId}_${customColorHex || 'default'}_${Date.now()}`;
    this._latestToken = requestToken;

    // Clear current preview meshes
    while (this.vehicleHolder.children.length > 0) {
      this.vehicleHolder.remove(this.vehicleHolder.children[0]);
    }
    this.activeWheels = [];

    const spec = getVehicleSpecById(carId);
    if (this.pedestalRingMat) {
      this.pedestalRingMat.color.set(customColorHex || spec.defaultColor || '#38bdf8');
    }

    try {
      if (carId === 'classic_kart') {
        const tempKart = buildMicroKart({
          carbonTex: null,
          tireRubberTex: null,
          brushedMetalTex: null
        });
        tempKart.kartRoot.scale.setScalar(210);
        tempKart.kartRoot.position.set(0, -0.30, 0);
        if (customColorHex) {
          tempKart.setChassisColor(customColorHex);
        }
        this.vehicleHolder.add(tempKart.kartRoot);
        this.activeWheels = tempKart.wheelMeshes || [];
        return;
      }

      if (carId === 'bmw_csl') {
        const tempKart = buildMicroKart({
          carbonTex: null,
          tireRubberTex: null,
          brushedMetalTex: null
        });
        tempKart.kartRoot.scale.setScalar(210);
        tempKart.kartRoot.position.set(0, -0.30, 0);
        if (this.cachedBmwFbxTemplate) {
          tempKart.attachBmwFbxKart(this.cachedBmwFbxTemplate.clone(true), this.cachedBmwLiveryTex);
          if (customColorHex) {
            tempKart.setChassisColor(customColorHex);
          }
        }
        this.vehicleHolder.add(tempKart.kartRoot);
        this.activeWheels = tempKart.wheelMeshes || [];
        return;
      }

      // Build one of the 6 brand-new 3D vehicles from CarCatalog
      const instance = await carPackAssets.buildCarInstance(carId, customColorHex);
      if (this._latestToken !== requestToken) return;
      this.vehicleHolder.add(instance.rootGroup);
      this.activeWheels = instance.wheelVisuals || [];
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

    const tick = (now) => {
      if (!this.isActive) return;
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      if (this.autoRotate && !this.isDragging) {
        this.turntableAngle += dt * 0.52;
      }
      this.turntableGroup.rotation.y = this.turntableAngle;

      if (this.spinWheelsPreview && this.activeWheels.length > 0) {
        for (let i = 0; i < this.activeWheels.length; i++) {
          const w = this.activeWheels[i];
          if (w) w.rotation.x += dt * 5.2;
        }
      }

      this.renderer.render(this.scene, this.camera);
      this.rafId = requestAnimationFrame(tick);
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
