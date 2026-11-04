import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

/**
 * Complete Catalog of Playable Vehicles.
 * Preserves ALL existing vehicles ('bmw_csl' and 'classic_kart') and adds
 * 6 brand-new, hyper-realistic 3D sports, supercar, rally, and offroad vehicles.
 */
export const VEHICLE_CATALOG = [
  {
    id: 'bmw_csl',
    name: '2015 BMW 3.0 CSL Hommage R',
    category: 'original',
    badge: 'ORIGINAL',
    classLabel: 'GT CONCEPT',
    drivetrain: 'RWD • 3.0L TwinPower Turbo I6',
    horsepower: '580 HP',
    topSpeedMph: 212,
    stats: { speed: 94, accel: 91, handling: 95, braking: 93 },
    physicsMultiplier: { maxSpeed: 1.04, accel: 1.03, grip: 1.05 },
    defaultColor: '#ffffff',
    factoryLivery: true,
    description: 'Original flagship 2015 BMW 3.0 CSL Hommage R motorsport concept with M-stripe racing livery, carbon aero splitter, and GT rear wing.'
  },
  {
    id: 'sport_gt',
    name: 'Apex GT-R V10 Coupe',
    category: 'new',
    badge: 'NEW 3D',
    classLabel: 'SUPERCAR',
    drivetrain: 'AWD • 5.2L Naturally Aspirated V10',
    horsepower: '640 HP',
    topSpeedMph: 224,
    stats: { speed: 97, accel: 96, handling: 94, braking: 95 },
    physicsMultiplier: { maxSpeed: 1.08, accel: 1.07, grip: 1.06 },
    defaultColor: '#e11d48',
    factoryLivery: true,
    fbxBodyName: 'Sport_body',
    textures: {
      albedo: '/assets/models/car_pack/textures/SportRed.png',
      metallic: '/assets/models/car_pack/textures/Sport_Metallic.png',
      glossiness: '/assets/models/car_pack/textures/Sport_Glossiness.png',
      wheelAlbedo: '/assets/models/car_pack/textures/wheel_H_Diffuse.png',
      wheelMetallic: '/assets/models/car_pack/textures/wheel_H_Metallic.png',
      wheelGloss: '/assets/models/car_pack/textures/wheel_H_Glossiness.png'
    },
    addGtWing: true,
    description: 'Widebody mid-engine V10 supercar with high-gloss crimson metallic clearcoat, carbon-fiber swan-neck GT wing, and staggered performance wheels.'
  },
  {
    id: 'hyper_valhalla',
    name: 'Aethelgard V12 Hypercar',
    category: 'new',
    badge: 'NEW 3D',
    classLabel: 'HYPERCAR',
    drivetrain: 'AWD Hybrid • 6.5L V12 + Twin E-Motors',
    horsepower: '1,050 HP',
    topSpeedMph: 245,
    stats: { speed: 100, accel: 99, handling: 98, braking: 99 },
    physicsMultiplier: { maxSpeed: 1.14, accel: 1.12, grip: 1.10 },
    defaultColor: '#0ea5e9',
    factoryLivery: false,
    isCustomSculptedHypercar: true,
    description: 'Track-focused aerodynamic teardrop hypercar featuring Venturi ground-effect tunnels, full glass fighter canopy with detailed twin-seat cockpit, and active aero.'
  },
  {
    id: 'coupe_v8',
    name: 'Monza V8 Gran Turismo',
    category: 'new',
    badge: 'NEW 3D',
    classLabel: 'GRAND TOURER',
    drivetrain: 'RWD • 4.0L Twin-Turbo V8',
    horsepower: '612 HP',
    topSpeedMph: 216,
    stats: { speed: 95, accel: 92, handling: 93, braking: 92 },
    physicsMultiplier: { maxSpeed: 1.06, accel: 1.04, grip: 1.04 },
    defaultColor: '#2563eb',
    factoryLivery: true,
    fbxBodyName: 'Coupe_Body',
    textures: {
      albedo: '/assets/models/car_pack/textures/CoupeBlue.png',
      metallic: '/assets/models/car_pack/textures/Coupe_Metallic.png',
      glossiness: '/assets/models/car_pack/textures/Coupe_Glossiness.png',
      wheelAlbedo: '/assets/models/car_pack/textures/wheel_E_Diffuse.png',
      wheelMetallic: '/assets/models/car_pack/textures/wheel_E_Metallic.png',
      wheelGloss: '/assets/models/car_pack/textures/wheel_E_Glossiness.png'
    },
    addGtWing: false,
    description: 'Sleek European fastback Gran Turismo coupe finished in deep sapphire metallic with long sculpted hood, projector optics, and multi-spoke forged rims.'
  },
  {
    id: 'sedan_rs',
    name: 'Autobahn RS Turbo Saloon',
    category: 'new',
    badge: 'NEW 3D',
    classLabel: 'SPORTS SALOON',
    drivetrain: 'AWD • 4.0L Bi-Turbo V8',
    horsepower: '591 HP',
    topSpeedMph: 205,
    stats: { speed: 91, accel: 90, handling: 89, braking: 91 },
    physicsMultiplier: { maxSpeed: 1.02, accel: 1.02, grip: 1.02 },
    defaultColor: '#eab308',
    factoryLivery: true,
    fbxBodyName: 'Sedan_Body',
    textures: {
      albedo: '/assets/models/car_pack/textures/SedanYellow.png',
      metallic: '/assets/models/car_pack/textures/Sedan_Metallic.png',
      glossiness: '/assets/models/car_pack/textures/Sedan_Glossiness.png',
      wheelAlbedo: '/assets/models/car_pack/textures/Wheel_A_Diffuse.png',
      wheelMetallic: '/assets/models/car_pack/textures/Wheel_A_Metallic.png',
      wheelGloss: '/assets/models/car_pack/textures/Wheel_A_Glossiness.png'
    },
    addGtWing: false,
    description: 'High-velocity executive performance saloon engineered for high-speed highway stability, precision AWD cornering, and solar-gold metallic paintwork.'
  },
  {
    id: 'hatch_evo',
    name: 'Rallye GR Hot Hatch AWD',
    category: 'new',
    badge: 'NEW 3D',
    classLabel: 'RALLY SPEC',
    drivetrain: 'AWD • 2.0L Turbo Rally I4',
    horsepower: '420 HP',
    topSpeedMph: 188,
    stats: { speed: 86, accel: 94, handling: 97, braking: 95 },
    physicsMultiplier: { maxSpeed: 0.98, accel: 1.08, grip: 1.12 },
    defaultColor: '#f59e0b',
    factoryLivery: true,
    fbxBodyName: 'Hatchback_Body',
    textures: {
      albedo: '/assets/models/car_pack/textures/HatchbackYellow.png',
      metallic: '/assets/models/car_pack/textures/Hatchback_Metallic.png',
      glossiness: '/assets/models/car_pack/textures/Hatchback_Glossiness.png',
      wheelAlbedo: '/assets/models/car_pack/textures/wheel_B_Diffuse.png',
      wheelMetallic: '/assets/models/car_pack/textures/wheel_B_Metallic.png',
      wheelGloss: '/assets/models/car_pack/textures/wheel_B_Glossiness.png'
    },
    addGtWing: true,
    description: 'Short-wheelbase AWD tarmac rally weapon with instant turbo torque, roof-mounted downforce wing, and ultra-responsive turn-in agility.'
  },
  {
    id: 'offroad_raptor',
    name: 'Titan 4x4 Trail Hunter',
    category: 'new',
    badge: 'NEW 3D',
    classLabel: 'OFFROAD 4X4',
    drivetrain: '4WD • 3.5L Twin-Turbo EcoV6',
    horsepower: '510 HP',
    topSpeedMph: 182,
    stats: { speed: 84, accel: 88, handling: 90, braking: 88 },
    physicsMultiplier: { maxSpeed: 0.96, accel: 1.04, grip: 1.08 },
    defaultColor: '#16a34a',
    factoryLivery: true,
    fbxBodyName: 'Offroad_Body',
    textures: {
      albedo: '/assets/models/car_pack/textures/OffroadGreen.png',
      metallic: '/assets/models/car_pack/textures/Offroad_Metallic.png',
      glossiness: '/assets/models/car_pack/textures/Offroad_Glossiness.png',
      wheelAlbedo: '/assets/models/car_pack/textures/wheel_G_Diffuse.png',
      wheelMetallic: '/assets/models/car_pack/textures/wheel_G_Metallic.png',
      wheelGloss: '/assets/models/car_pack/textures/wheel_G_Glossiness.png'
    },
    addGtWing: false,
    description: 'Rugged wide-track 4x4 performance SUV with high-travel suspension, Beadlock off-road wheels, forest metallic armor finish, and all-terrain grip.'
  },
  {
    id: 'classic_kart',
    name: '1:87 Pro Shifter Kart (Original)',
    category: 'original',
    badge: 'ORIGINAL',
    classLabel: 'SHIFTER KART',
    drivetrain: 'RWD • 125cc 2-Stroke 6-Speed',
    horsepower: '54 HP (1:87 Scale)',
    topSpeedMph: 195,
    stats: { speed: 88, accel: 95, handling: 99, braking: 96 },
    physicsMultiplier: { maxSpeed: 1.0, accel: 1.0, grip: 1.0 },
    defaultColor: '#ff2800',
    factoryLivery: false,
    description: 'The classic original 1:87 scale tubular-frame shifter micro-kart with exposed rear engine cylinder head, sidepods, and driver.'
  }
];

export function getVehicleSpecById(carId) {
  return VEHICLE_CATALOG.find((v) => v.id === carId) || VEHICLE_CATALOG[0];
}

/**
 * Shared loader and cache for the multi-car FBX pack (`/assets/models/car_pack/source/fab.fbx`)
 * and PBR textures so switching cars or opening the 3D showroom is instant and hitch-free.
 */
class CarPackAssetManager {
  constructor() {
    this.fbxPromise = null;
    this.fbxRoot = null;
    this.textureLoader = new THREE.TextureLoader();
    this.textureCache = new Map();
    this.extractedTemplates = new Map();
  }

  loadTextureCached(url, isSRGB = true) {
    if (!url) return null;
    const key = `${url}_${isSRGB ? 'srgb' : 'lin'}`;
    if (this.textureCache.has(key)) return this.textureCache.get(key);
    const tex = this.textureLoader.load(url);
    tex.colorSpace = isSRGB ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 2;
    this.textureCache.set(key, tex);
    return tex;
  }

  async ensureCarPackFbxLoaded() {
    if (this.fbxRoot) return this.fbxRoot;
    if (this.fbxPromise) return this.fbxPromise;

    this.fbxPromise = new Promise((resolve, reject) => {
      const loader = new FBXLoader();
      loader.load(
        '/assets/models/car_pack/source/fab.fbx',
        (group) => {
          group.updateMatrixWorld(true);
          this.fbxRoot = group;
          resolve(group);
        },
        undefined,
        (err) => {
          this.fbxPromise = null;
          reject(err);
        }
      );
    });
    return this.fbxPromise;
  }

  /**
   * Builds a detailed interior cockpit (twin sport bucket seats, dashboard console,
   * steering wheel, and rearview mirror) to place inside car cabins so looking
   * through the glass reveals a realistic 3D interior.
   */
  buildDetailedInteriorGroup(width = 1.35, length = 1.55, yBase = 0.35) {
    const interior = new THREE.Group();
    interior.name = 'DetailedCarInterior';

    const leatherMat = new THREE.MeshStandardMaterial({
      color: 0x161920,
      roughness: 0.55,
      metalness: 0.1
    });
    const accentStitchMat = new THREE.MeshStandardMaterial({
      color: 0xd92638,
      roughness: 0.45,
      metalness: 0.15
    });
    const dashMat = new THREE.MeshStandardMaterial({
      color: 0x0e1015,
      roughness: 0.4,
      metalness: 0.25
    });
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: 0x0284c7,
      emissiveIntensity: 1.4,
      roughness: 0.2
    });

    // Two sculpted sport bucket seats
    const seatSpacing = width * 0.27;
    [-seatSpacing, seatSpacing].forEach((sx) => {
      const seatGroup = new THREE.Group();
      seatGroup.position.set(sx, yBase, -length * 0.08);

      const cushion = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.32, 0.12, length * 0.32),
        leatherMat
      );
      cushion.position.set(0, 0.06, 0.06);
      seatGroup.add(cushion);

      const backrest = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.30, 0.52, 0.11),
        leatherMat
      );
      backrest.position.set(0, 0.32, -length * 0.08);
      backrest.rotation.x = -0.22;
      seatGroup.add(backrest);

      const headrest = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.18, 0.18, 0.09),
        accentStitchMat
      );
      headrest.position.set(0, 0.62, -length * 0.13);
      headrest.rotation.x = -0.18;
      seatGroup.add(headrest);

      interior.add(seatGroup);
    });

    // Center transmission tunnel + dashboard + infotainment screen
    const consoleMesh = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.16, 0.22, length * 0.65),
      dashMat
    );
    consoleMesh.position.set(0, yBase + 0.11, length * 0.08);
    interior.add(consoleMesh);

    const dashMesh = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.88, 0.26, length * 0.26),
      dashMat
    );
    dashMesh.position.set(0, yBase + 0.36, length * 0.34);
    interior.add(dashMesh);

    const navScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(width * 0.18, 0.11),
      screenMat
    );
    navScreen.position.set(0, yBase + 0.43, length * 0.205);
    navScreen.rotation.y = Math.PI;
    interior.add(navScreen);

    // Driver sport steering wheel
    const swGroup = new THREE.Group();
    swGroup.position.set(-seatSpacing, yBase + 0.42, length * 0.18);
    swGroup.rotation.x = 0.35;
    const swRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.13, 0.018, 10, 24),
      leatherMat
    );
    swGroup.add(swRim);
    const swHub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.08, 12),
      dashMat
    );
    swHub.rotation.x = Math.PI / 2;
    swHub.position.z = 0.03;
    swGroup.add(swHub);
    interior.add(swGroup);

    return interior;
  }

  /**
   * Builds a carbon-fiber GT rear wing with anodized aluminum swan-neck pylons
   * and aerodynamic endplates for track/sport models.
   */
  buildCarbonGtWing(wingSpan = 1.65, yHeight = 0.96, zBack = -1.92) {
    const wingGroup = new THREE.Group();
    wingGroup.name = 'CarbonGtWing';

    const carbonNormal = this.loadTextureCached(
      '/assets/models/bmw_csl/textures/common_carbon05_norm.png',
      false
    );
    if (carbonNormal) {
      carbonNormal.wrapS = THREE.RepeatWrapping;
      carbonNormal.wrapT = THREE.RepeatWrapping;
      carbonNormal.repeat.set(8, 2);
    }

    const carbonMat = new THREE.MeshPhysicalMaterial({
      color: 0x15181e,
      roughness: 0.24,
      metalness: 0.35,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      normalMap: carbonNormal || null
    });

    const bladeGeo = new THREE.BoxGeometry(wingSpan, 0.045, 0.28);
    const blade = new THREE.Mesh(bladeGeo, carbonMat);
    blade.position.set(0, yHeight, zBack);
    blade.rotation.x = 0.14;
    blade.castShadow = true;
    wingGroup.add(blade);

    // Endplates
    const epGeo = new THREE.BoxGeometry(0.03, 0.22, 0.36);
    [-wingSpan * 0.5, wingSpan * 0.5].forEach((ex) => {
      const ep = new THREE.Mesh(epGeo, carbonMat);
      ep.position.set(ex, yHeight - 0.02, zBack);
      ep.castShadow = true;
      wingGroup.add(ep);
    });

    // Swan-neck pylons
    const pylonGeo = new THREE.BoxGeometry(0.035, 0.24, 0.14);
    [-wingSpan * 0.24, wingSpan * 0.24].forEach((px) => {
      const pylon = new THREE.Mesh(pylonGeo, carbonMat);
      pylon.position.set(px, yHeight - 0.12, zBack + 0.04);
      pylon.rotation.x = -0.25;
      wingGroup.add(pylon);
    });

    return wingGroup;
  }

  /**
   * Builds a brand-new, hyper-realistic multi-part 3D car instance for a catalog entry
   * from `fab.fbx` OR our custom sculpted `Aethelgard V12 Hypercar`.
   * Returns `{ rootGroup, wheelVisuals, frontPivots, bodyMaterials, targetLength }`
   */
  async buildCarInstance(carId, customColorHex = null) {
    const spec = getVehicleSpecById(carId);
    if (spec.isCustomSculptedHypercar) {
      return this.buildSculptedHypercar(spec, customColorHex);
    }

    const fbxGroup = await this.ensureCarPackFbxLoaded();
    const bodyNode = fbxGroup.children.find(
      (c) => c.name.toLowerCase() === (spec.fbxBodyName || '').toLowerCase()
    );
    if (!bodyNode) {
      return this.buildSculptedHypercar(spec, customColorHex);
    }

    // Locate the 4 wheels belonging to this body in the showroom circle
    const bBox = new THREE.Box3().setFromObject(bodyNode);
    const bCtr = new THREE.Vector3();
    bBox.getCenter(bCtr);

    const nearWheels = fbxGroup.children
      .filter((c) => /wheel/i.test(c.name))
      .map((w) => {
        const wBox = new THREE.Box3().setFromObject(w);
        const wCtr = new THREE.Vector3();
        wBox.getCenter(wCtr);
        return { w, wCtr, dist: bCtr.distanceTo(wCtr) };
      })
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 4);

    const yaw = nearWheels.length > 0 ? nearWheels[0].w.rotation.z : bodyNode.rotation.z;
    const invYawQuat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      -yaw
    );

    // Load authentic PBR textures for this vehicle
    const albedoTex = this.loadTextureCached(spec.textures?.albedo, true);
    const metallicTex = this.loadTextureCached(spec.textures?.metallic, false);
    const glossTex = this.loadTextureCached(spec.textures?.glossiness, false);
    const lightsTex = this.loadTextureCached('/assets/models/car_pack/textures/lights.jpg', true);
    const wheelAlbedo = this.loadTextureCached(spec.textures?.wheelAlbedo, true);
    const wheelMetallic = this.loadTextureCached(spec.textures?.wheelMetallic, false);

    const useCustomPaint = Boolean(customColorHex && !spec.factoryLivery);
    const paintColor = new THREE.Color(customColorHex || spec.defaultColor || '#e11d48');

    const bodyPaintMat = new THREE.MeshPhysicalMaterial({
      name: 'CarBodyPaint',
      color: customColorHex ? paintColor : new THREE.Color(0xffffff),
      map: customColorHex ? null : albedoTex,
      metalnessMap: metallicTex || null,
      roughnessMap: glossTex || null,
      metalness: customColorHex ? 0.72 : 0.55,
      roughness: customColorHex ? 0.18 : 0.24,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      envMapIntensity: 1.85
    });

    const opticsMat = new THREE.MeshPhysicalMaterial({
      name: 'CarOptics',
      color: 0xffffff,
      map: lightsTex || null,
      emissive: new THREE.Color(0xfff4d6),
      emissiveMap: lightsTex || null,
      emissiveIntensity: 0.85,
      roughness: 0.12,
      metalness: 0.2,
      clearcoat: 1.0
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      name: 'CarGlass',
      color: 0x0b1320,
      roughness: 0.05,
      metalness: 0.15,
      transmission: 0.58,
      transparent: true,
      opacity: 0.78,
      clearcoat: 1.0,
      envMapIntensity: 2.2
    });

    const wheelMat = new THREE.MeshStandardMaterial({
      name: 'CarWheel',
      color: 0xffffff,
      map: wheelAlbedo || null,
      metalnessMap: wheelMetallic || null,
      metalness: 0.65,
      roughness: 0.32,
      envMapIntensity: 1.4
    });

    const assignMultiMaterial = (srcMat) => {
      const mName = (srcMat?.name || '').toLowerCase();
      if (mName.includes('glass') || mName.includes('window')) return glassMat;
      if (mName.includes('optic') || mName.includes('light')) return opticsMat;
      if (mName.includes('wheel') || mName.includes('wheek') || mName.includes('tire')) return wheelMat;
      return bodyPaintMat;
    };

    const carAssembler = new THREE.Group();
    carAssembler.name = `CarPack_${spec.id}`;

    // Clone body mesh and transform into local centered +Z space
    const bodyClone = bodyNode.clone();
    bodyClone.position.sub(bodyNode.position).applyQuaternion(invYawQuat);
    bodyClone.quaternion.premultiply(invYawQuat);
    bodyClone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (Array.isArray(child.material)) {
          child.material = child.material.map(assignMultiMaterial);
        } else {
          child.material = assignMultiMaterial(child.material);
        }
      }
    });
    carAssembler.add(bodyClone);

    // Clone and axle-center each of the 4 wheels so they rotate and steer cleanly
    const wheelEntries = [];
    nearWheels.forEach((nw) => {
      const wClone = nw.w.clone();
      wClone.position.sub(bodyNode.position).applyQuaternion(invYawQuat);
      wClone.quaternion.premultiply(invYawQuat);
      wClone.updateMatrixWorld(true);

      const wBox = new THREE.Box3().setFromObject(wClone);
      const wCenter = new THREE.Vector3();
      wBox.getCenter(wCenter);

      // Create axle pivot at the exact geometric center of the wheel
      const axlePivot = new THREE.Group();
      axlePivot.position.copy(wCenter);

      const spinGroup = new THREE.Group();
      wClone.position.sub(wCenter);
      wClone.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (Array.isArray(child.material)) {
            child.material = child.material.map(assignMultiMaterial);
          } else {
            child.material = wheelMat;
          }
        }
      });
      spinGroup.add(wClone);

      // Add a realistic cross-drilled brake rotor & caliper inside each wheel
      const wSize = new THREE.Vector3();
      wBox.getSize(wSize);
      const rotorRadius = Math.max(wSize.y, wSize.z) * 0.31;
      const isLeft = wCenter.x < 0;
      const rotorTex = this.loadTextureCached(
        '/assets/models/bmw_csl/textures/car_rotor_00.etc.png',
        true
      );
      const rotorMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(rotorRadius, rotorRadius, Math.max(wSize.x * 0.14, 18), 24),
        new THREE.MeshStandardMaterial({
          color: 0xb8c0cc,
          map: rotorTex || null,
          metalness: 0.85,
          roughness: 0.25
        })
      );
      rotorMesh.rotation.z = Math.PI / 2;
      rotorMesh.position.x = isLeft ? wSize.x * 0.12 : -wSize.x * 0.12;
      spinGroup.add(rotorMesh);

      axlePivot.add(spinGroup);
      carAssembler.add(axlePivot);

      wheelEntries.push({
        axlePivot,
        spinGroup,
        x: wCenter.x,
        y: wCenter.y,
        z: wCenter.z
      });
    });

    // Normalize scale to match the game's 4.65-unit vehicle length standard
    carAssembler.updateMatrixWorld(true);
    const fullBox = new THREE.Box3().setFromObject(carAssembler);
    const fullSize = new THREE.Vector3();
    fullBox.getSize(fullSize);
    const fullCenter = new THREE.Vector3();
    fullBox.getCenter(fullCenter);

    const targetLength = 4.68;
    const maxHoriz = Math.max(fullSize.x, fullSize.z, 0.001);
    const normScale = targetLength / maxHoriz;

    const rootGroup = new THREE.Group();
    rootGroup.name = `VehicleRoot_${spec.id}`;

    carAssembler.scale.setScalar(normScale);
    carAssembler.position.set(
      -fullCenter.x * normScale,
      -fullBox.min.y * normScale - 0.30,
      -fullCenter.z * normScale
    );
    rootGroup.add(carAssembler);

    // Add detailed 3D interior cabin so windows show seats, dash, and steering wheel
    const interior = this.buildDetailedInteriorGroup(1.38, 1.55, 0.06);
    interior.position.set(0, 0.02, -0.05);
    rootGroup.add(interior);

    // Add carbon GT wing if configured
    if (spec.addGtWing) {
      const wing = this.buildCarbonGtWing(
        1.64,
        fullSize.y * normScale - 0.26,
        -targetLength * 0.44
      );
      rootGroup.add(wing);
    }

    // Add glowing LED Headlights and Taillight strips at the exact front/rear bounds
    const halfW = (fullSize.x * normScale) * 0.36;
    const frontZ = (fullSize.z * normScale) * 0.475;
    const rearZ = -(fullSize.z * normScale) * 0.475;
    const lampY = (fullSize.y * normScale) * 0.38 - 0.26;

    const headMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xe0f2fe,
      emissiveIntensity: 3.2,
      roughness: 0.1
    });
    const tailMat = new THREE.MeshStandardMaterial({
      color: 0xff1a1a,
      emissive: 0xff0022,
      emissiveIntensity: 3.0,
      roughness: 0.15
    });

    [-halfW, halfW].forEach((lx) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.065, 0.06), headMat);
      hl.position.set(lx, lampY, frontZ);
      rootGroup.add(hl);

      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.07, 0.06), tailMat);
      tl.position.set(lx, lampY + 0.04, rearZ);
      rootGroup.add(tl);
    });

    // Sort wheels into [Front-Left, Front-Right, Rear-Left, Rear-Right]
    // Front wheels have Z > 0
    const frontWheels = wheelEntries.filter((w) => w.z >= 0).sort((a, b) => a.x - b.x);
    const rearWheels = wheelEntries.filter((w) => w.z < 0).sort((a, b) => a.x - b.x);

    const orderedSpinGroups = [
      ...frontWheels.map((w) => w.spinGroup),
      ...rearWheels.map((w) => w.spinGroup)
    ];
    const orderedFrontPivots = frontWheels.map((w) => w.axlePivot);

    return {
      rootGroup,
      wheelVisuals: orderedSpinGroups,
      frontPivots: orderedFrontPivots,
      bodyMaterials: [bodyPaintMat],
      spec
    };
  }

  /**
   * Builds the custom multi-surface sculpted Aethelgard V12 Hypercar with
   * aerodynamic Venturi bodywork, glass fighter canopy, visible cockpit interior,
   * active carbon wing, LED blade optics, and 5-twin-spoke wheels with brake calipers.
   */
  buildSculptedHypercar(spec, customColorHex = null) {
    const rootGroup = new THREE.Group();
    rootGroup.name = `VehicleRoot_${spec.id}`;

    const paintColor = new THREE.Color(customColorHex || spec.defaultColor || '#0ea5e9');
    const bodyPaintMat = new THREE.MeshPhysicalMaterial({
      name: 'HypercarBodyPaint',
      color: paintColor,
      metalness: 0.78,
      roughness: 0.14,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      sheen: 0.35,
      sheenColor: new THREE.Color(0xffffff),
      envMapIntensity: 2.1
    });

    const carbonNormal = this.loadTextureCached(
      '/assets/models/bmw_csl/textures/common_carbon05_norm.png',
      false
    );
    if (carbonNormal) {
      carbonNormal.wrapS = THREE.RepeatWrapping;
      carbonNormal.wrapT = THREE.RepeatWrapping;
      carbonNormal.repeat.set(10, 10);
    }

    const carbonMat = new THREE.MeshPhysicalMaterial({
      color: 0x12151c,
      metalness: 0.4,
      roughness: 0.24,
      clearcoat: 0.9,
      normalMap: carbonNormal || null
    });

    const glassCanopyMat = new THREE.MeshPhysicalMaterial({
      color: 0x091322,
      metalness: 0.15,
      roughness: 0.04,
      transmission: 0.68,
      transparent: true,
      opacity: 0.76,
      clearcoat: 1.0,
      envMapIntensity: 2.4
    });

    // 1. Sculpted Aerodynamic Side Profile Extrusion (Central Monocoque Body)
    const sideProfile = new THREE.Shape();
    sideProfile.moveTo(-2.28, -0.14); // Rear diffuser tip
    sideProfile.lineTo(2.30, -0.16);  // Front splitter lip
    sideProfile.quadraticCurveTo(2.38, 0.06, 2.02, 0.22); // Nose cone curve
    sideProfile.quadraticCurveTo(1.32, 0.36, 0.85, 0.42); // Front hood line
    sideProfile.quadraticCurveTo(0.25, 0.76, -0.45, 0.72); // Roofline
    sideProfile.quadraticCurveTo(-1.45, 0.62, -2.22, 0.36); // Fastback engine deck
    sideProfile.lineTo(-2.32, 0.12);
    sideProfile.closePath();

    const bodyGeo = new THREE.ExtrudeGeometry(sideProfile, {
      depth: 1.36,
      bevelEnabled: true,
      bevelSegments: 5,
      steps: 2,
      bevelSize: 0.14,
      bevelThickness: 0.16
    });
    bodyGeo.rotateY(Math.PI / 2);
    bodyGeo.center();

    const monocoqueMesh = new THREE.Mesh(bodyGeo, bodyPaintMat);
    monocoqueMesh.position.set(0, 0.24, 0);
    monocoqueMesh.castShadow = true;
    monocoqueMesh.receiveShadow = true;
    rootGroup.add(monocoqueMesh);

    // 2. Sculpted Muscular Front & Rear Fender Arches (4 flared wheel arches)
    const archPositions = [
      { x: -0.76, y: 0.12, z: 1.38, len: 1.15, h: 0.48 },
      { x: 0.76, y: 0.12, z: 1.38, len: 1.15, h: 0.48 },
      { x: -0.80, y: 0.16, z: -1.36, len: 1.28, h: 0.54 },
      { x: 0.80, y: 0.16, z: -1.36, len: 1.28, h: 0.54 }
    ];
    archPositions.forEach((ap) => {
      const fenderGeo = new THREE.CylinderGeometry(ap.h, ap.h * 1.05, 0.42, 24, 1, false, 0, Math.PI);
      fenderGeo.rotateZ(Math.PI / 2);
      fenderGeo.scale(1, 0.85, ap.len / (ap.h * 2));
      const fender = new THREE.Mesh(fenderGeo, bodyPaintMat);
      fender.position.set(ap.x, ap.y, ap.z);
      fender.castShadow = true;
      fender.receiveShadow = true;
      rootGroup.add(fender);
    });

    // 3. Carbon-Fiber Ground-Effect Splitter, Side Skirts & Rear Venturi Diffuser
    const undertray = new THREE.Mesh(
      new THREE.BoxGeometry(1.98, 0.06, 4.58),
      carbonMat
    );
    undertray.position.set(0, -0.09, 0.02);
    undertray.castShadow = true;
    rootGroup.add(undertray);

    // Diffuser fins at the rear
    for (let i = -3; i <= 3; i++) {
      if (i === 0) continue;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.18, 0.52), carbonMat);
      fin.position.set(i * 0.22, -0.02, -2.08);
      rootGroup.add(fin);
    }

    // 4. Teardrop Glass Canopy Dome + Visible 3D Interior Cockpit
    const canopyGeo = new THREE.SphereGeometry(0.66, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.55);
    canopyGeo.scale(1.02, 0.66, 1.95);
    const canopyMesh = new THREE.Mesh(canopyGeo, glassCanopyMat);
    canopyMesh.position.set(0, 0.38, 0.08);
    rootGroup.add(canopyMesh);

    const interior = this.buildDetailedInteriorGroup(1.18, 1.42, 0.04);
    interior.position.set(0, 0.0, 0.06);
    rootGroup.add(interior);

    // 5. Active Carbon GT Wing + Roof LMP1 Dorsal Fin
    const dorsalFin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.28, 1.15), carbonMat);
    dorsalFin.position.set(0, 0.64, -1.25);
    rootGroup.add(dorsalFin);

    const gtWing = this.buildCarbonGtWing(1.88, 0.76, -2.06);
    rootGroup.add(gtWing);

    // 6. Laser Blade LED Headlights & Full-Width Cyber Taillight Bar + Dual Exhausts
    const headLedMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xbae6fd,
      emissiveIntensity: 3.8,
      roughness: 0.1
    });
    [-0.64, 0.64].forEach((hx) => {
      const bladeLight = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.045, 0.14), headLedMat);
      bladeLight.position.set(hx, 0.18, 2.22);
      bladeLight.rotation.y = hx < 0 ? 0.22 : -0.22;
      rootGroup.add(bladeLight);
    });

    const tailBarMat = new THREE.MeshStandardMaterial({
      color: 0xff1133,
      emissive: 0xff0033,
      emissiveIntensity: 3.6,
      roughness: 0.12
    });
    const tailBar = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.055, 0.06), tailBarMat);
    tailBar.position.set(0, 0.34, -2.28);
    rootGroup.add(tailBar);

    // 7. 4 Forged 5-Twin-Spoke Alloy Wheels with Tire Treads, Cross-Drilled Rotors & Calipers
    const wheelCoords = [
      { x: -0.84, y: 0.04, z: 1.38, r: 0.34, w: 0.28, isFront: true },
      { x: 0.84, y: 0.04, z: 1.38, r: 0.34, w: 0.28, isFront: true },
      { x: -0.86, y: 0.06, z: -1.36, r: 0.36, w: 0.34, isFront: false },
      { x: 0.86, y: 0.06, z: -1.36, r: 0.36, w: 0.34, isFront: false }
    ];

    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x141619,
      roughness: 0.72,
      metalness: 0.12
    });
    const rimMat = new THREE.MeshPhysicalMaterial({
      color: 0xd4d8e2,
      metalness: 0.92,
      roughness: 0.16,
      clearcoat: 0.8
    });
    const caliperMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.25,
      metalness: 0.5
    });
    const rotorTex = this.loadTextureCached(
      '/assets/models/bmw_csl/textures/car_rotor_00.etc.png',
      true
    );
    const rotorMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      map: rotorTex || null,
      metalness: 0.85,
      roughness: 0.25
    });

    const orderedSpinGroups = [];
    const orderedFrontPivots = [];

    wheelCoords.forEach((wc) => {
      const axlePivot = new THREE.Group();
      axlePivot.position.set(wc.x, wc.y, wc.z);

      const spinGroup = new THREE.Group();

      // Tire barrel
      const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(wc.r, wc.r, wc.w, 28),
        tireMat
      );
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      spinGroup.add(tire);

      // Alloy Rim outer barrel + 5 twin spokes
      const rimOuter = new THREE.Mesh(
        new THREE.CylinderGeometry(wc.r * 0.72, wc.r * 0.72, wc.w * 1.02, 24),
        rimMat
      );
      rimOuter.rotation.z = Math.PI / 2;
      spinGroup.add(rimOuter);

      for (let s = 0; s < 5; s++) {
        const angle = (s / 5) * Math.PI * 2;
        const spoke = new THREE.Mesh(
          new THREE.BoxGeometry(wc.w * 1.05, wc.r * 1.32, 0.036),
          rimMat
        );
        spoke.rotation.x = angle;
        spinGroup.add(spoke);
      }

      // Brake Rotor
      const rotor = new THREE.Mesh(
        new THREE.CylinderGeometry(wc.r * 0.54, wc.r * 0.54, wc.w * 0.35, 20),
        rotorMat
      );
      rotor.rotation.z = Math.PI / 2;
      spinGroup.add(rotor);

      // Fixed Brembo Caliper on the axlePivot (doesn't spin with the wheel!)
      const caliper = new THREE.Mesh(
        new THREE.BoxGeometry(wc.w * 0.45, wc.r * 0.42, 0.14),
        caliperMat
      );
      caliper.position.set(0, wc.r * 0.12, wc.isFront ? -wc.r * 0.38 : wc.r * 0.38);
      axlePivot.add(caliper);

      axlePivot.add(spinGroup);
      rootGroup.add(axlePivot);

      orderedSpinGroups.push(spinGroup);
      if (wc.isFront) orderedFrontPivots.push(axlePivot);
    });

    return {
      rootGroup,
      wheelVisuals: orderedSpinGroups,
      frontPivots: orderedFrontPivots,
      bodyMaterials: [bodyPaintMat],
      spec
    };
  }
}

export const carPackAssets = new CarPackAssetManager();
