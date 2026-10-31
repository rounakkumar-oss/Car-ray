import * as THREE from 'three';
import {
  createAsphaltRoadTexture,
  createCheckeredGantryTexture,
} from './ProceduralTextures.js';

let cachedSplineSamples = null;
let cachedV4TrackTextures = null;

/**
 * Safely loads an image URL into an existing CanvasTexture if the PNG exists on disk
 * (ignoring Vite SPA text/html fallbacks).
 */
function upgradeTextureIfPresent(targetTex, urls, isSRGB = false) {
  const urlList = Array.isArray(urls) ? urls : [urls];
  (async () => {
    for (const url of urlList) {
      try {
        const head = await fetch(url, { method: 'HEAD' });
        if (!head.ok) continue;
        const ct = head.headers.get('content-type') || '';
        if (ct.includes('text/html')) continue;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = url;
        });
        targetTex.dispose();
        targetTex.image = img;
        if (isSRGB) {
          targetTex.colorSpace = THREE.SRGBColorSpace;
        }
        targetTex.needsUpdate = true;
        return;
      } catch {
        // Fallback to procedural canvas texture already bound
      }
    }
  })();
}

/**
 * Generates (and upgrades with /assets/textures/track_asphalt_v4_*_2k.png if present)
 * the V5.3 100% isotropic crushed-basalt pebble asphalt Albedo, Tangent-Space Normal,
 * and Roughness maps (zero Math.sin waves, zero directional stripes).
 */
export function getTrackAsphaltV4Textures() {
  if (cachedV4TrackTextures) {
    return cachedV4TrackTextures;
  }

  const w = 256;
  const h = 256;

  // 1. 100% Isotropic Crushed-Basalt Pebble Albedo (256x256 for fast mobile GPU sampling)
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = w;
  albedoCanvas.height = h;
  const aCtx = albedoCanvas.getContext('2d');
  const aImg = aCtx.createImageData(w, h);
  const aData = aImg.data;

  function hash2i(ix, iy) {
    let n = (ix * 374761393 + iy * 668265263) ^ 0x5bf03635;
    n = (n ^ (n >>> 13)) * 1274126177;
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295.0;
  }

  function valueNoise2D(px, py, scale) {
    const sx = px / scale;
    const sy = py / scale;
    const ix = Math.floor(sx);
    const iy = Math.floor(sy);
    const fx = sx - ix;
    const fy = sy - iy;
    const ux = fx * fx * (3.0 - 2.0 * fx);
    const uy = fy * fy * (3.0 - 2.0 * fy);
    const x0 = ix & 255;
    const x1 = (ix + 1) & 255;
    const y0 = iy & 255;
    const y1 = (iy + 1) & 255;
    const c00 = hash2i(x0, y0);
    const c10 = hash2i(x1, y0);
    const c01 = hash2i(x0, y1);
    const c11 = hash2i(x1, y1);
    return (c00 * (1 - ux) + c10 * ux) * (1 - uy) + (c01 * (1 - ux) + c11 * ux) * uy;
  }

  function pebbleHeight(px, py) {
    const n1 = valueNoise2D(px, py, 2.4);
    const n2 = valueNoise2D(px + 113, py + 257, 1.3);
    const n3 = hash2i(px & 255, py & 255);
    const pebble = Math.pow(Math.max(0, (n1 - 0.34) * 1.52), 1.28);
    const grit = Math.pow(Math.max(0, (n2 - 0.44) * 1.82), 1.38);
    return THREE.MathUtils.clamp(0.16 + 0.50 * pebble + 0.26 * grit + 0.08 * n3, 0.0, 1.0);
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const h0 = pebbleHeight(x, y);
      const baseVal = 15 + h0 * 66;

      aData[idx + 0] = Math.round(THREE.MathUtils.clamp(baseVal, 10, 96));
      aData[idx + 1] = Math.round(THREE.MathUtils.clamp(baseVal + 2, 11, 99));
      aData[idx + 2] = Math.round(THREE.MathUtils.clamp(baseVal + 4, 13, 106));
      aData[idx + 3] = 255;
    }
  }
  aCtx.putImageData(aImg, 0, 0);

  const trackAsphaltAlbedoTex = new THREE.CanvasTexture(albedoCanvas);
  trackAsphaltAlbedoTex.colorSpace = THREE.SRGBColorSpace;
  trackAsphaltAlbedoTex.wrapS = THREE.RepeatWrapping;
  trackAsphaltAlbedoTex.wrapT = THREE.RepeatWrapping;
  trackAsphaltAlbedoTex.anisotropy = 2;

  cachedV4TrackTextures = {
    trackAsphaltAlbedoTex,
    trackAsphaltNormalTex: null,
    trackAsphaltRoughnessTex: null,
  };

  return cachedV4TrackTextures;
}

/**
 * Ensures a track roadway or curb BufferGeometry has continuous 1:1 isotropic square spline UVs
 * (`v = arc_len / 0.028`).
 */
function ensureContinuousRoadwayUVs(geometry, forceRecompute = false) {
  if (!geometry || !geometry.attributes || !geometry.attributes.position) return;
  const posAttr = geometry.attributes.position;
  const count = posAttr.count;

  const existingUv = geometry.attributes.uv;
  if (!forceRecompute && existingUv && existingUv.count === count) {
    let hasNonZero = false;
    for (let i = 0; i < Math.min(count, 64); i++) {
      if (Math.abs(existingUv.getX(i)) > 1e-4 || Math.abs(existingUv.getY(i)) > 1e-4) {
        hasNonZero = true;
        break;
      }
    }
    if (hasNonZero) return;
  }

  const uvs = new Float32Array(count * 2);
  const samples = cachedSplineSamples;
  const n = samples ? samples.length : 0;

  if (n > 0) {
    const arcLen = new Float32Array(n + 1);
    for (let i = 0; i < n; i++) {
      const p0 = samples[i].position;
      const p1 = samples[(i + 1) % n].position;
      arcLen[i + 1] = arcLen[i] + Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
    }

    let lastBestIdx = 0;
    for (let i = 0; i < count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const vz = posAttr.getZ(i);

      let bestIdx = lastBestIdx;
      let bestDistSq = Infinity;
      for (let off = -18; off <= 18; off++) {
        const idx = (lastBestIdx + off + n) % n;
        const sp = samples[idx].position;
        const dSq = (vx - sp[0]) ** 2 + (vy - sp[1]) ** 2 + (vz - sp[2]) ** 2;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestIdx = idx;
        }
      }
      if (bestDistSq > 0.025 * 0.025) {
        for (let idx = 0; idx < n; idx += 2) {
          const sp = samples[idx].position;
          const dSq = (vx - sp[0]) ** 2 + (vy - sp[1]) ** 2 + (vz - sp[2]) ** 2;
          if (dSq < bestDistSq) {
            bestDistSq = dSq;
            bestIdx = idx;
          }
        }
      }
      lastBestIdx = bestIdx;
      const s = samples[bestIdx];
      const dx = vx - s.position[0];
      const dy = vy - s.position[1];
      const dz = vz - s.position[2];
      const uRight = dx * s.right[0] + dy * s.right[1] + dz * s.right[2];
      const uTan = dx * s.tangent[0] + dy * s.tangent[1] + dz * s.tangent[2];
      const exactArc = arcLen[bestIdx] + uTan;

      uvs[i * 2 + 0] = 0.5 + uRight / 0.0058;
      uvs[i * 2 + 1] = exactArc / 0.0058;
    }
  } else {
    for (let i = 0; i < count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      uvs[i * 2 + 0] = vx * 172.0;
      uvs[i * 2 + 1] = vz * 172.0;
    }
  }

  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.attributes.uv.needsUpdate = true;
}

/**
 * Lowers the vertical profile height (along the local banked spline normal) of the red/white
 * FIA curb bumpers (`CoasterCurbsRed`, `CoasterCurbsWhite`) and side safety guardrails
 * (`CoasterSideRailsAndSpine`) for all vertices above the roadbed surface (`vNorm > 0`),
 * while leaving the underside slab and spine girder (`vNorm <= 0`) 100% untouched.
 */
function lowerTrackBumperAndRailHeight(geometry, heightScale = 0.50, recomputeNormals = false) {
  if (!geometry || !geometry.attributes || !geometry.attributes.position) return;
  if (geometry.userData && geometry.userData._bumperHeightScaled) return;
  geometry.userData = geometry.userData || {};
  geometry.userData._bumperHeightScaled = true;

  const samples = cachedSplineSamples;
  const n = samples ? samples.length : 0;
  if (n === 0) return;

  const posAttr = geometry.attributes.position;
  const count = posAttr.count;
  let lastBestIdx = 0;

  for (let i = 0; i < count; i++) {
    const vx = posAttr.getX(i);
    const vy = posAttr.getY(i);
    const vz = posAttr.getZ(i);

    let bestIdx = lastBestIdx;
    let bestDistSq = Infinity;
    for (let off = -18; off <= 18; off++) {
      const idx = (lastBestIdx + off + n) % n;
      const sp = samples[idx].position;
      const dSq = (vx - sp[0]) ** 2 + (vy - sp[1]) ** 2 + (vz - sp[2]) ** 2;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestIdx = idx;
      }
    }
    if (bestDistSq > 0.025 * 0.025) {
      for (let idx = 0; idx < n; idx++) {
        const sp = samples[idx].position;
        const dSq = (vx - sp[0]) ** 2 + (vy - sp[1]) ** 2 + (vz - sp[2]) ** 2;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestIdx = idx;
        }
      }
    }
    lastBestIdx = bestIdx;

    // Interpolate along the better of the two adjacent spline segments for sub-micron normal accuracy
    let bestPx = samples[bestIdx].position[0];
    let bestPy = samples[bestIdx].position[1];
    let bestPz = samples[bestIdx].position[2];
    let bestNx = samples[bestIdx].normal[0];
    let bestNy = samples[bestIdx].normal[1];
    let bestNz = samples[bestIdx].normal[2];
    let minSegDistSq = Infinity;

    for (const segStart of [(bestIdx - 1 + n) % n, bestIdx]) {
      const segEnd = (segStart + 1) % n;
      const p0 = samples[segStart].position;
      const p1 = samples[segEnd].position;
      const sx = p1[0] - p0[0];
      const sy = p1[1] - p0[1];
      const sz = p1[2] - p0[2];
      const segLenSq = sx * sx + sy * sy + sz * sz;
      const t =
        segLenSq > 1e-12
          ? Math.max(0.0, Math.min(1.0, ((vx - p0[0]) * sx + (vy - p0[1]) * sy + (vz - p0[2]) * sz) / segLenSq))
          : 0.0;
      const px = p0[0] + sx * t;
      const py = p0[1] + sy * t;
      const pz = p0[2] + sz * t;
      const dSq = (vx - px) ** 2 + (vy - py) ** 2 + (vz - pz) ** 2;
      if (dSq < minSegDistSq) {
        minSegDistSq = dSq;
        bestPx = px;
        bestPy = py;
        bestPz = pz;
        const n0 = samples[segStart].normal;
        const n1 = samples[segEnd].normal;
        const nx = n0[0] + (n1[0] - n0[0]) * t;
        const ny = n0[1] + (n1[1] - n0[1]) * t;
        const nz = n0[2] + (n1[2] - n0[2]) * t;
        const nLen = Math.hypot(nx, ny, nz) || 1.0;
        bestNx = nx / nLen;
        bestNy = ny / nLen;
        bestNz = nz / nLen;
      }
    }

    const vNorm = (vx - bestPx) * bestNx + (vy - bestPy) * bestNy + (vz - bestPz) * bestNz;
    if (vNorm > 0.00002) {
      const deltaH = (heightScale - 1.0) * vNorm;
      posAttr.setXYZ(i, vx + bestNx * deltaH, vy + bestNy * deltaH, vz + bestNz * deltaH);
    }
  }

  posAttr.needsUpdate = true;
  if (recomputeNormals) {
    geometry.computeVertexNormals();
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
}

/**
 * Losslessly partitions a desk-spanning track BufferGeometry into 6 spatial sector chunks
 * (3 columns along X: [-0.55..-0.14], [-0.14..+0.14], [+0.14..+0.55] x 2 rows along Z: [<0.01, >=0.01])
 * so Three.js frustum culling can cull ~75-85% of off-screen coaster trusses, spine rails, curbs,
 * and roadbed triangles in 1P POV (Views 1 & 2) with 0.0% visual change.
 */
function splitTrackMeshIntoSpatialChunks(mesh) {
  if (!mesh || !mesh.isMesh || !mesh.geometry || mesh.userData._spatialChunked) return;
  const geo = mesh.geometry;
  const posAttr = geo.attributes.position;
  if (!posAttr) return;

  const indexAttr = geo.index;
  const triCount = indexAttr ? Math.floor(indexAttr.count / 3) : Math.floor(posAttr.count / 3);
  if (triCount < 2000) return; // Only chunk heavy meshes (trusses, rails, roadbed, curbs)

  mesh.userData._spatialChunked = true;
  const buckets = [[], [], [], [], [], []];

  for (let t = 0; t < triCount; t++) {
    const i0 = indexAttr ? indexAttr.getX(t * 3 + 0) : t * 3 + 0;
    const i1 = indexAttr ? indexAttr.getX(t * 3 + 1) : t * 3 + 1;
    const i2 = indexAttr ? indexAttr.getX(t * 3 + 2) : t * 3 + 2;

    const cx = (posAttr.getX(i0) + posAttr.getX(i1) + posAttr.getX(i2)) / 3.0;
    const cz = (posAttr.getZ(i0) + posAttr.getZ(i1) + posAttr.getZ(i2)) / 3.0;

    const col = cx < -0.14 ? 0 : cx < 0.14 ? 1 : 2;
    const row = cz < 0.01 ? 0 : 1;
    buckets[row * 3 + col].push(i0, i1, i2);
  }

  const nonEmptyBuckets = buckets.filter((b) => b.length > 0);
  if (nonEmptyBuckets.length <= 1) return;

  const attrNames = Object.keys(geo.attributes);
  const chunkGeos = [];

  for (const triIndices of nonEmptyBuckets) {
    const remap = new Int32Array(posAttr.count).fill(-1);
    const uniqueOrigVerts = [];
    const newIndices = new Uint32Array(triIndices.length);

    for (let k = 0; k < triIndices.length; k++) {
      const origV = triIndices[k];
      let mappedV = remap[origV];
      if (mappedV === -1) {
        mappedV = uniqueOrigVerts.length;
        remap[origV] = mappedV;
        uniqueOrigVerts.push(origV);
      }
      newIndices[k] = mappedV;
    }

    const vCount = uniqueOrigVerts.length;
    const subGeo = new THREE.BufferGeometry();

    for (const name of attrNames) {
      const srcAttr = geo.attributes[name];
      const itemSize = srcAttr.itemSize;
      const ArrayType = srcAttr.array.constructor;
      const dstArr = new ArrayType(vCount * itemSize);
      const srcArr = srcAttr.array;

      for (let v = 0; v < vCount; v++) {
        const srcBase = uniqueOrigVerts[v] * itemSize;
        const dstBase = v * itemSize;
        for (let c = 0; c < itemSize; c++) {
          dstArr[dstBase + c] = srcArr[srcBase + c];
        }
      }
      subGeo.setAttribute(name, new THREE.BufferAttribute(dstArr, itemSize, srcAttr.normalized));
    }

    subGeo.setIndex(
      vCount < 65535
        ? new THREE.Uint16BufferAttribute(new Uint16Array(newIndices), 1)
        : new THREE.Uint32BufferAttribute(newIndices, 1)
    );
    subGeo.computeBoundingBox();
    subGeo.computeBoundingSphere();
    chunkGeos.push(subGeo);
  }

  // Assign first chunk to the existing mesh and add remaining chunks as sibling meshes
  const oldGeo = mesh.geometry;
  mesh.geometry = chunkGeos[0];
  mesh.frustumCulled = true;

  const parent = mesh.parent;
  if (parent) {
    for (let idx = 1; idx < chunkGeos.length; idx++) {
      const sibling = new THREE.Mesh(chunkGeos[idx], mesh.material);
      sibling.name = `${mesh.name}_Chunk${idx}`;
      sibling.position.copy(mesh.position);
      sibling.quaternion.copy(mesh.quaternion);
      sibling.scale.copy(mesh.scale);
      sibling.castShadow = mesh.castShadow;
      sibling.receiveShadow = mesh.receiveShadow;
      sibling.frustumCulled = true;
      sibling.userData._spatialChunked = true;
      parent.add(sibling);
    }
  }
  oldGeo.dispose();
}

/**
 * Calibrates loaded track_coaster.glb meshes (`CoasterRoadwayMesh`, `CoasterCurbsRed`,
 * `CoasterCurbsWhite`, `CoasterSideRailsAndSpine`, `CoasterLatticeTrussColumns`):
 * - Disables directional shadow casting on coaster track ribbon & disables self-shadowing on truss columns
 * - Binds the crisp 512x512 procedural crushed-basalt pebble asphalt PBR maps onto Mat_MicroAsphalt
 *   with 5.8mm isotropic spline UVs and normalScale (0.52, 0.52) so the micro-asphalt texture looks realistic
 * - Lowers the red/white FIA curb bumpers & side safety guardrails (`0.50x` height above roadbed) to match the smaller kart scale
 * - Splits full-desk track meshes into 6 spatial chunks for hardware frustum culling in Views 1 & 2
 */
export function calibrateTrackCoasterGlb(glbScene) {
  if (!glbScene) return;

  const meshesToChunk = [];
  const convertedMaterials = new Map();

  function toLightweightLambert(mat) {
    if (!mat) return mat;
    if (mat.isMeshLambertMaterial || mat.isMeshBasicMaterial || mat.isShaderMaterial) {
      return mat;
    }
    if (convertedMaterials.has(mat)) {
      return convertedMaterials.get(mat);
    }
    const lambert = new THREE.MeshLambertMaterial({
      name: mat.name || '',
      color: mat.color ? mat.color.clone() : new THREE.Color(0xffffff),
      map: mat.map || null,
      emissive: mat.emissive ? mat.emissive.clone() : new THREE.Color(0x000000),
      emissiveMap: mat.emissiveMap || null,
      emissiveIntensity: mat.emissiveIntensity ?? 1.0,
      vertexColors: Boolean(mat.vertexColors),
      transparent: Boolean(mat.transparent),
      opacity: mat.opacity ?? 1.0,
      alphaMap: mat.alphaMap || null,
      alphaTest: mat.alphaTest ?? 0.0,
      side: mat.side ?? THREE.FrontSide,
      depthWrite: mat.depthWrite ?? true,
      depthTest: mat.depthTest ?? true,
      polygonOffset: Boolean(mat.polygonOffset),
      polygonOffsetFactor: mat.polygonOffsetFactor ?? 0,
      polygonOffsetUnits: mat.polygonOffsetUnits ?? 0,
      fog: mat.fog ?? true,
      toneMapped: mat.toneMapped ?? true,
    });
    convertedMaterials.set(mat, lambert);
    try {
      mat.dispose();
    } catch (_e) {
      // Ignore disposal warnings
    }
    return lambert;
  }

  glbScene.traverse((child) => {
    if (!child.isMesh) return;
    child.frustumCulled = true;
    child.castShadow = false;
    child.receiveShadow = false;

    const meshName = child.name || '';
    if (
      meshName.includes('CoasterCurbsRed') ||
      meshName.includes('CoasterCurbsWhite')
    ) {
      lowerTrackBumperAndRailHeight(child.geometry, 0.48, true);
      ensureContinuousRoadwayUVs(child.geometry);
    } else if (meshName.includes('CoasterSideRailsAndSpine')) {
      lowerTrackBumperAndRailHeight(child.geometry, 0.52, false);
    }

    if (
      !child.userData._spatialChunked &&
      (meshName.includes('CoasterLatticeTrussColumns') ||
        meshName.includes('CoasterSideRailsAndSpine') ||
        meshName.includes('CoasterRoadwayMesh') ||
        meshName.includes('CoasterCurbsRed') ||
        meshName.includes('CoasterCurbsWhite'))
    ) {
      meshesToChunk.push(child);
    }

    const isArrayMat = Array.isArray(child.material);
    const rawMats = isArrayMat ? child.material : [child.material];
    const newMats = rawMats.map((rawMat) => {
      if (!rawMat) return rawMat;
      const mat = toLightweightLambert(rawMat);
      const matName = mat.name || '';

      if (
        matName === 'Mat_MicroAsphalt' ||
        (meshName.includes('CoasterRoadwayMesh') && matName !== 'Mat_LaneStripeWhite')
      ) {
        ensureContinuousRoadwayUVs(child.geometry, true);
        const { trackAsphaltAlbedoTex } = getTrackAsphaltV4Textures();
        mat.map = trackAsphaltAlbedoTex;
        if (mat.color) mat.color.setHex(0xffffff);
        mat.needsUpdate = true;
      } else if (
        matName === 'Mat_LaneStripeWhite' ||
        matName === 'Mat_FIACurbRed' ||
        matName === 'Mat_FIACurbWhite' ||
        meshName.includes('CoasterCurbsRed') ||
        meshName.includes('CoasterCurbsWhite')
      ) {
        mat.needsUpdate = true;
      } else if (
        matName.includes('StartLight') ||
        matName === 'Mat_LightGreen' ||
        matName === 'Mat_LightAmber' ||
        matName === 'Mat_LightRed'
      ) {
        if (mat.color) mat.color.setHex(0x12151c);
        if (mat.emissive) mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0.0;
        mat.needsUpdate = true;
      } else if (
        matName === 'Mat_BrushedSilverAluminum' ||
        matName === 'Mat_TrussSilver' ||
        meshName.includes('CoasterSideRailsAndSpine') ||
        meshName.includes('CoasterLatticeTrussColumns')
      ) {
        if (mat.color) mat.color.setHex(0x8892a4);
        if (mat.emissive) mat.emissive.setHex(0x180a2c);
        mat.emissiveIntensity = 0.22;
        mat.needsUpdate = true;
      }
      return mat;
    });

    child.material = isArrayMat ? newMats : newMats[0];
  });

  for (const m of meshesToChunk) {
    splitTrackMeshIntoSpatialChunks(m);
  }
}

export const sharedUnderTrackUniforms = {
  uTime: { value: 0.0 },
  uIntensity: { value: 1.0 },
  uGlowFieldTex: { value: null },
};

/**
 * Builds the C2-continuous 1:87 HO Micro-Coaster Track Ribbon,
 * Alternating Red/White FIA Curbs, Side Guardrails, Twin Tubular Spine Rails,
 * Instanced Silver Lattice Truss Support Columns, Start/Finish Gantry, and
 * Persistent Full-Track Orange / Purple / Blue Under-Track LED Strips + Desk Glow.
 * Optimized with 50-70% reduced segment counts and MeshLambertMaterial for 60 FPS on mobile.
 */
export function buildCoasterTrack(splineData) {
  const trackGroup = new THREE.Group();
  trackGroup.name = 'CoasterTrackGroup';

  const samples = splineData.samples;
  cachedSplineSamples = samples;
  const N = samples.length; // 720 periodic samples
  const TRACK_STEP = 2; // 50% segment reduction (360 segments instead of 720) for mobile GPU speed
  const numSteps = Math.floor(N / TRACK_STEP);
  const halfWidth = (splineData.track_width_m || 0.022) * 0.5; // 0.011m (11mm half-width)
  const curbWidth = splineData.curb_width_m || 0.0017; // 1.7mm FIA curbs (1:150 scale)
  const railHeight = (splineData.rail_height_m || 0.0018) * 0.52; // Lower-profile 0.94mm side guardrails
  const deckThickness = 0.0018;

  const gantryTex = createCheckeredGantryTexture();
  const { trackAsphaltAlbedoTex } = getTrackAsphaltV4Textures();

  const arcLen = new Float32Array(N + 1);
  for (let i = 0; i < N; i++) {
    const p0 = samples[i].position;
    const p1 = samples[(i + 1) % N].position;
    arcLen[i + 1] = arcLen[i] + Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
  }
  const totalTrackArcLen = Math.max(1e-4, arcLen[N]);

  // -------------------------------------------------------------------------
  // 1. CONTINUOUS BANKED MICRO-ASPHALT ROADBED RIBBON + UNDER-DECK SLAB (360 segments)
  // -------------------------------------------------------------------------
  const roadPositions = [];
  const roadNormals = [];
  const roadUvs = [];
  const roadIndices = [];

  for (let step = 0; step <= numSteps; step++) {
    const sampleIdx = Math.min(N, step * TRACK_STEP);
    const s = samples[sampleIdx % N];
    const pos = new THREE.Vector3(...s.position);
    const right = new THREE.Vector3(...s.right);
    const normal = new THREE.Vector3(...s.normal);

    const vCoord = arcLen[sampleIdx] / 0.012;

    const pLeftTop = pos.clone().addScaledVector(right, -halfWidth);
    const pRightTop = pos.clone().addScaledVector(right, halfWidth);
    const pLeftBot = pLeftTop.clone().addScaledVector(normal, -deckThickness);
    const pRightBot = pRightTop.clone().addScaledVector(normal, -deckThickness);

    roadPositions.push(
      pLeftTop.x, pLeftTop.y, pLeftTop.z,
      pRightTop.x, pRightTop.y, pRightTop.z,
      pRightBot.x, pRightBot.y, pRightBot.z,
      pLeftBot.x, pLeftBot.y, pLeftBot.z
    );

    roadNormals.push(
      normal.x, normal.y, normal.z,
      normal.x, normal.y, normal.z,
      -normal.x, -normal.y, -normal.z,
      -normal.x, -normal.y, -normal.z
    );

    roadUvs.push(
      0, vCoord,
      1, vCoord,
      1, vCoord,
      0, vCoord
    );

    if (step < numSteps) {
      const base = step * 4;
      const next = (step + 1) * 4;
      roadIndices.push(base + 0, base + 1, next + 1);
      roadIndices.push(base + 0, next + 1, next + 0);
      roadIndices.push(base + 2, base + 3, next + 3);
      roadIndices.push(base + 2, next + 3, next + 2);
    }
  }

  const roadGeo = new THREE.BufferGeometry();
  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadPositions, 3));
  roadGeo.setAttribute('normal', new THREE.Float32BufferAttribute(roadNormals, 3));
  roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUvs, 2));
  roadGeo.setIndex(roadIndices);

  const roadMat = new THREE.MeshLambertMaterial({
    map: trackAsphaltAlbedoTex,
  });

  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.castShadow = false;
  roadMesh.receiveShadow = false;
  roadMesh.frustumCulled = true;
  roadMesh.name = 'CoasterAsphaltRoadbed';
  trackGroup.add(roadMesh);

  // -------------------------------------------------------------------------
  // 2. ALTERNATING RED & WHITE FIA CURBS + LOW-PROFILE SIDE GUARDRAILS (360 segments)
  // -------------------------------------------------------------------------
  const curbPositions = [];
  const curbNormals = [];
  const curbColors = [];
  const curbIndices = [];

  const redColor = new THREE.Color(0xe8251a);
  const whiteColor = new THREE.Color(0xf5f7fa);
  const silverRailColor = new THREE.Color(0xb8c4d4);

  let cVertOffset = 0;
  for (let step = 0; step < numSteps; step++) {
    const i0 = (step * TRACK_STEP) % N;
    const i1 = ((step + 1) * TRACK_STEP) % N;
    const s0 = samples[i0];
    const s1 = samples[i1];

    const p0 = new THREE.Vector3(...s0.position);
    const r0 = new THREE.Vector3(...s0.right);
    const n0 = new THREE.Vector3(...s0.normal);

    const p1 = new THREE.Vector3(...s1.position);
    const r1 = new THREE.Vector3(...s1.right);
    const n1 = new THREE.Vector3(...s1.normal);

    const isRed = step % 2 === 0;
    const col = isRed ? redColor : whiteColor;

    for (const side of [-1, 1]) {
      const innerDist = side * (halfWidth - 0.0012);
      const outerDist = side * (halfWidth + 0.0005);

      const v0Inner = p0.clone().addScaledVector(r0, innerDist).addScaledVector(n0, 0.00012);
      const v0Outer = p0.clone().addScaledVector(r0, outerDist).addScaledVector(n0, 0.00022);
      const v1Inner = p1.clone().addScaledVector(r1, innerDist).addScaledVector(n1, 0.00012);
      const v1Outer = p1.clone().addScaledVector(r1, outerDist).addScaledVector(n1, 0.00022);

      const v0RailTop = v0Outer.clone().addScaledVector(n0, railHeight);
      const v1RailTop = v1Outer.clone().addScaledVector(n1, railHeight);

      curbPositions.push(
        v0Inner.x, v0Inner.y, v0Inner.z,
        v0Outer.x, v0Outer.y, v0Outer.z,
        v1Outer.x, v1Outer.y, v1Outer.z,
        v1Inner.x, v1Inner.y, v1Inner.z,
        v0RailTop.x, v0RailTop.y, v0RailTop.z,
        v1RailTop.x, v1RailTop.y, v1RailTop.z
      );

      for (let k = 0; k < 4; k++) {
        curbNormals.push(n0.x, n0.y, n0.z);
        curbColors.push(col.r, col.g, col.b);
      }
      for (let k = 0; k < 2; k++) {
        curbNormals.push(-side * r0.x, -side * r0.y, -side * r0.z);
        curbColors.push(silverRailColor.r, silverRailColor.g, silverRailColor.b);
      }

      if (side === 1) {
        curbIndices.push(cVertOffset + 0, cVertOffset + 1, cVertOffset + 2);
        curbIndices.push(cVertOffset + 0, cVertOffset + 2, cVertOffset + 3);
        curbIndices.push(cVertOffset + 1, cVertOffset + 4, cVertOffset + 5);
        curbIndices.push(cVertOffset + 1, cVertOffset + 5, cVertOffset + 2);
      } else {
        curbIndices.push(cVertOffset + 1, cVertOffset + 0, cVertOffset + 3);
        curbIndices.push(cVertOffset + 1, cVertOffset + 3, cVertOffset + 2);
        curbIndices.push(cVertOffset + 4, cVertOffset + 1, cVertOffset + 2);
        curbIndices.push(cVertOffset + 4, cVertOffset + 2, cVertOffset + 5);
      }
      cVertOffset += 6;
    }
  }

  const curbGeo = new THREE.BufferGeometry();
  curbGeo.setAttribute('position', new THREE.Float32BufferAttribute(curbPositions, 3));
  curbGeo.setAttribute('normal', new THREE.Float32BufferAttribute(curbNormals, 3));
  curbGeo.setAttribute('color', new THREE.Float32BufferAttribute(curbColors, 3));
  curbGeo.setIndex(curbIndices);

  const curbMat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
  });

  const curbMesh = new THREE.Mesh(curbGeo, curbMat);
  curbMesh.castShadow = false;
  curbMesh.receiveShadow = false;
  curbMesh.frustumCulled = true;
  trackGroup.add(curbMesh);

  // -------------------------------------------------------------------------
  // 3. TWIN STEEL COASTER SPINE TUBES UNDERNEATH THE DECK (Reduced 120x4 segments)
  // -------------------------------------------------------------------------
  const spinePtsLeft = [];
  const spinePtsRight = [];
  for (let i = 0; i < N; i += 4) {
    const s = samples[i];
    const p = new THREE.Vector3(...s.position);
    const r = new THREE.Vector3(...s.right);
    const n = new THREE.Vector3(...s.normal);
    spinePtsLeft.push(p.clone().addScaledVector(r, -0.0065).addScaledVector(n, -0.0032));
    spinePtsRight.push(p.clone().addScaledVector(r, 0.0065).addScaledVector(n, -0.0032));
  }
  const curveLeft = new THREE.CatmullRomCurve3(spinePtsLeft, true);
  const curveRight = new THREE.CatmullRomCurve3(spinePtsRight, true);

  const silverSteelMat = new THREE.MeshLambertMaterial({
    color: 0x8892a4,
    emissive: new THREE.Color(0x180a2c),
    emissiveIntensity: 0.22,
  });

  const tubeLeft = new THREE.Mesh(
    new THREE.TubeGeometry(curveLeft, 120, 0.0011, 4, true),
    silverSteelMat
  );
  const tubeRight = new THREE.Mesh(
    new THREE.TubeGeometry(curveRight, 120, 0.0011, 4, true),
    silverSteelMat
  );
  tubeLeft.castShadow = false;
  tubeRight.castShadow = false;
  tubeLeft.frustumCulled = true;
  tubeRight.frustumCulled = true;
  trackGroup.add(tubeLeft, tubeRight);

  // -------------------------------------------------------------------------
  // 4. INSTANCED SILVER ANODIZED ALUMINUM LATTICE TRUSS SUPPORT COLUMNS
  // -------------------------------------------------------------------------
  const columnStep = 12;
  const numColumns = Math.floor(N / columnStep); // 60 columns

  function getUnderlyingSupportElevation(x, z, trackY) {
    if (x < -0.23 && x > -0.49 && z < 0.04 && z > -0.18 && trackY > 0.145) {
      return 0.156;
    }
    if (x > 0.155 && x < 0.495 && z > 0.002 && z < 0.268) {
      return 0.003;
    }
    return 0.0;
  }

  const maxChords = numColumns * 4;
  const chordGeo = new THREE.CylinderGeometry(0.00085, 0.00085, 1.0, 5);
  const chordInstanced = new THREE.InstancedMesh(chordGeo, silverSteelMat, maxChords);
  chordInstanced.castShadow = false;
  chordInstanced.receiveShadow = false;

  const footpadGeo = new THREE.CylinderGeometry(0.0048, 0.0055, 0.0022, 8);
  const footpadMat = new THREE.MeshLambertMaterial({
    color: 0x222630,
  });
  const footpadInstanced = new THREE.InstancedMesh(footpadGeo, footpadMat, numColumns);
  footpadInstanced.receiveShadow = false;

  const saddleGeo = new THREE.BoxGeometry(0.024, 0.0022, 0.0055);
  const saddleInstanced = new THREE.InstancedMesh(saddleGeo, silverSteelMat, numColumns);
  saddleInstanced.castShadow = false;

  const ringGeo = new THREE.BoxGeometry(0.0072, 0.001, 0.0072);
  const ringInstanced = new THREE.InstancedMesh(ringGeo, silverSteelMat, numColumns * 3);

  const dummy = new THREE.Object3D();
  let chordIdx = 0;
  let footIdx = 0;
  let saddleIdx = 0;
  let ringIdx = 0;

  const trussHalfSpan = 0.0031;
  const chordOffsets = [
    [-trussHalfSpan, -trussHalfSpan],
    [trussHalfSpan, -trussHalfSpan],
    [trussHalfSpan, trussHalfSpan],
    [-trussHalfSpan, trussHalfSpan],
  ];

  for (let c = 0; c < numColumns; c++) {
    const s = samples[c * columnStep];
    const topPos = new THREE.Vector3(...s.position);
    const tangent = new THREE.Vector3(...s.tangent);

    const attachY = topPos.y - 0.0032;
    const baseY = getUnderlyingSupportElevation(topPos.x, topPos.z, topPos.y);
    const colHeight = Math.max(0.006, attachY - baseY);
    const midY = baseY + colHeight * 0.5;

    dummy.position.set(topPos.x, attachY, topPos.z);
    const yaw = Math.atan2(tangent.x, tangent.z);
    dummy.rotation.set(0, yaw, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    saddleInstanced.setMatrixAt(saddleIdx++, dummy.matrix);

    dummy.position.set(topPos.x, baseY + 0.0011, topPos.z);
    dummy.rotation.set(0, yaw, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    footpadInstanced.setMatrixAt(footIdx++, dummy.matrix);

    for (const [ox, oz] of chordOffsets) {
      dummy.position.set(topPos.x + ox, midY, topPos.z + oz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, colHeight, 1);
      dummy.updateMatrix();
      chordInstanced.setMatrixAt(chordIdx++, dummy.matrix);
    }

    const numRings = Math.min(3, Math.max(1, Math.floor(colHeight / 0.036)));
    for (let r = 0; r < numRings; r++) {
      const ry = baseY + ((r + 0.5) / numRings) * colHeight;
      dummy.position.set(topPos.x, ry, topPos.z);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      ringInstanced.setMatrixAt(ringIdx++, dummy.matrix);
    }
  }

  chordInstanced.count = chordIdx;
  footpadInstanced.count = footIdx;
  saddleInstanced.count = saddleIdx;
  ringInstanced.count = ringIdx;
  chordInstanced.instanceMatrix.needsUpdate = true;
  footpadInstanced.instanceMatrix.needsUpdate = true;
  saddleInstanced.instanceMatrix.needsUpdate = true;
  ringInstanced.instanceMatrix.needsUpdate = true;

  trackGroup.add(chordInstanced, footpadInstanced, saddleInstanced, ringInstanced);

  // -------------------------------------------------------------------------
  // 5. START / FINISH GRAND PRIX PORTAL GANTRY IN SECTOR 6 ([0.000, 0.035, 0.255])
  // -------------------------------------------------------------------------
  const gantryGroup = new THREE.Group();
  gantryGroup.name = 'StartFinishGantry';
  gantryGroup.position.set(0.0183, 0.035, 0.255);

  for (const gz of [-0.018, 0.018]) {
    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(0.0040, 0.028, 0.0040),
      silverSteelMat
    );
    tower.position.set(0, 0.014, gz);
    tower.castShadow = false;
    gantryGroup.add(tower);
  }

  const signBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.0048, 0.0082, 0.040),
    new THREE.MeshLambertMaterial({ color: 0x161922 })
  );
  signBox.position.set(0, 0.024, 0);
  signBox.castShadow = false;
  gantryGroup.add(signBox);

  const signFaceMat = new THREE.MeshLambertMaterial({
    map: gantryTex,
    emissiveMap: gantryTex,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.75,
  });
  for (const [sx, rotY] of [
    [0.0026, Math.PI / 2],
    [-0.0026, -Math.PI / 2],
  ]) {
    const signFace = new THREE.Mesh(new THREE.PlaneGeometry(0.036, 0.0072), signFaceMat);
    signFace.position.set(sx, 0.024, 0);
    signFace.rotation.y = rotY;
    gantryGroup.add(signFace);
  }

  for (let l = -2; l <= 2; l++) {
    const ledPod = new THREE.Mesh(
      new THREE.SphereGeometry(0.00085, 6, 6),
      new THREE.MeshBasicMaterial({ color: l === 0 ? 0x32d74b : 0xffaa44 })
    );
    ledPod.position.set(0.0026, 0.0188, l * 0.0038);
    gantryGroup.add(ledPod);
  }

  const startStripe = new THREE.Mesh(
    new THREE.PlaneGeometry(0.0035, 0.021),
    new THREE.MeshBasicMaterial({ map: gantryTex })
  );
  startStripe.rotation.x = -Math.PI / 2;
  startStripe.position.set(0, 0.0006, 0);
  gantryGroup.add(startStripe);

  trackGroup.add(gantryGroup);

  // -------------------------------------------------------------------------
  // 6. PERSISTENT FULL-TRACK ORANGE / PURPLE / BLUE UNDER-TRACK LED STRIPS
  //    & 2D GAUSSIAN DESK LIGHT-FIELD QUADS (`underTrackLedGroup`, Zero Dynamic Lights!)
  // -------------------------------------------------------------------------
  const underTrackLedGroup = new THREE.Group();
  underTrackLedGroup.name = 'UnderTrackLedAndGlowGroup';

  // 6A. Continuous Under-Track LED Light Strips (360 segments — 50% vertex reduction)
  const ledStripPositions = [];
  const ledStripUvs = [];
  const ledStripIndices = [];
  const outerEdgeDist = halfWidth + curbWidth * 1.02;
  const innerBellyDist = halfWidth * 0.58;

  for (let step = 0; step <= numSteps; step++) {
    const sampleIdx = Math.min(N, step * TRACK_STEP);
    const s = samples[sampleIdx % N];
    const p = new THREE.Vector3(...s.position);
    const r = new THREE.Vector3(...s.right);
    const n = new THREE.Vector3(...s.normal);
    const vNorm = arcLen[sampleIdx] / totalTrackArcLen;

    const vL0 = p.clone().addScaledVector(r, -outerEdgeDist).addScaledVector(n, 0.0003);
    const vL1 = p.clone().addScaledVector(r, -outerEdgeDist * 0.92).addScaledVector(n, -0.0022);
    const vL2 = p.clone().addScaledVector(r, -innerBellyDist).addScaledVector(n, -0.0026);

    const vR0 = p.clone().addScaledVector(r, innerBellyDist).addScaledVector(n, -0.0026);
    const vR1 = p.clone().addScaledVector(r, outerEdgeDist * 0.92).addScaledVector(n, -0.0022);
    const vR2 = p.clone().addScaledVector(r, outerEdgeDist).addScaledVector(n, 0.0003);

    ledStripPositions.push(
      vL0.x, vL0.y, vL0.z,
      vL1.x, vL1.y, vL1.z,
      vL2.x, vL2.y, vL2.z,
      vR0.x, vR0.y, vR0.z,
      vR1.x, vR1.y, vR1.z,
      vR2.x, vR2.y, vR2.z
    );

    ledStripUvs.push(
      0.0, vNorm,
      0.5, vNorm,
      1.0, vNorm,
      1.0, vNorm,
      0.5, vNorm,
      0.0, vNorm
    );

    if (step < numSteps) {
      const b = step * 6;
      const nx = (step + 1) * 6;
      ledStripIndices.push(b + 0, b + 1, nx + 1, b + 0, nx + 1, nx + 0);
      ledStripIndices.push(b + 1, b + 2, nx + 2, b + 1, nx + 2, nx + 1);
      ledStripIndices.push(b + 3, b + 4, nx + 4, b + 3, nx + 4, nx + 3);
      ledStripIndices.push(b + 4, b + 5, nx + 5, b + 4, nx + 5, nx + 4);
    }
  }

  const ledStripGeo = new THREE.BufferGeometry();
  ledStripGeo.setAttribute('position', new THREE.Float32BufferAttribute(ledStripPositions, 3));
  ledStripGeo.setAttribute('uv', new THREE.Float32BufferAttribute(ledStripUvs, 2));
  ledStripGeo.setIndex(ledStripIndices);
  ledStripGeo.computeBoundingBox();
  ledStripGeo.computeBoundingSphere();

  const ledStripMat = new THREE.ShaderMaterial({
    uniforms: sharedUnderTrackUniforms,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    blending: THREE.NormalBlending,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uIntensity;
      varying vec2 vUv;

      vec3 evalTrackLedPalette(float phaseNorm, float timeSec) {
        float p = fract(phaseNorm - timeSec * 0.055 + 0.08);
        float seg = p * 4.0;
        int idx = int(floor(seg));
        float f = smoothstep(0.0, 1.0, fract(seg));
        vec3 cPink   = vec3(1.00, 0.05, 0.55);
        vec3 cPurple = vec3(0.54, 0.03, 1.00);
        vec3 cBlue   = vec3(0.00, 0.54, 1.00);
        vec3 cViolet = vec3(0.66, 0.05, 1.00);
        if (idx == 0) return mix(cPink, cPurple, f);
        if (idx == 1) return mix(cPurple, cBlue, f);
        if (idx == 2) return mix(cBlue, cViolet, f);
        return mix(cViolet, cPink, f);
      }

      void main() {
        if (uIntensity <= 0.001) discard;
        vec3 baseCol = evalTrackLedPalette(vUv.y * 2.0, uTime);
        float core = exp(-pow((vUv.x - 0.5) * 2.2, 2.0));
        vec3 col = mix(baseCol, vec3(1.0, 0.90, 0.98), core * 0.34) * (1.10 + 0.45 * core);
        float alpha = clamp((0.82 + 0.18 * core) * min(1.4, uIntensity), 0.0, 0.98);
        gl_FragColor = vec4(col * min(1.48, 0.80 + 0.52 * uIntensity), alpha);
      }
    `,
  });

  const ledStripMesh = new THREE.Mesh(ledStripGeo, ledStripMat);
  ledStripMesh.name = 'UnderTrackLedRibbonMesh';
  ledStripMesh.castShadow = false;
  ledStripMesh.receiveShadow = false;
  ledStripMesh.frustumCulled = true;
  underTrackLedGroup.add(ledStripMesh);
  splitTrackMeshIntoSpatialChunks(ledStripMesh);

  // 6B. 1-Time Baked 2D Gaussian Light-Field DataTexture (`256 x 128`) + 2 Flat Surface Quads (`4 triangles total!`)
  const fieldW = 256;
  const fieldH = 128;
  const xMin = -0.58;
  const xSpan = 1.16;
  const zMin = -0.34;
  const zSpan = 0.68;

  const sumWArr = new Float32Array(fieldW * fieldH);
  const sumSinArr = new Float32Array(fieldW * fieldH);
  const sumCosArr = new Float32Array(fieldW * fieldH);

  for (let i = 0; i < N; i += 2) {
    const smp = samples[i];
    const sx = smp.position[0];
    const sy = smp.position[1];
    const sz = smp.position[2];
    const phase = (arcLen[i] / totalTrackArcLen) * Math.PI * 2.0 * 2.0;
    const sinP = Math.sin(phase);
    const cosP = Math.cos(phase);

    const h = Math.max(0.0, sy);
    const sigma = h < 0.048 ? 0.032 : 0.046;
    const invTwoSigmaSq = 1.0 / (2.0 * sigma * sigma);
    const invTwoPhaseSigmaSq = 1.0 / (2.0 * 0.019 * 0.019);
    const heightWeight = 2.0 / (1.0 + h * 2.8);
    const radius = sigma * 3.0;

    const ix0 = Math.max(0, Math.floor(((sx - radius - xMin) / xSpan) * fieldW));
    const ix1 = Math.min(fieldW - 1, Math.ceil(((sx + radius - xMin) / xSpan) * fieldW));
    const iz0 = Math.max(0, Math.floor(((sz - radius - zMin) / zSpan) * fieldH));
    const iz1 = Math.min(fieldH - 1, Math.ceil(((sz + radius - zMin) / zSpan) * fieldH));

    for (let iz = iz0; iz <= iz1; iz++) {
      const wz = zMin + ((iz + 0.5) / fieldH) * zSpan;
      const dz = wz - sz;
      const dz2 = dz * dz;
      const rowOffset = iz * fieldW;
      for (let ix = ix0; ix <= ix1; ix++) {
        const wx = xMin + ((ix + 0.5) / fieldW) * xSpan;
        const dx = wx - sx;
        const d2 = dx * dx + dz2;
        if (d2 > radius * radius) continue;
        const w = Math.exp(-d2 * invTwoSigmaSq) * heightWeight;
        const wPhase = Math.exp(-d2 * invTwoPhaseSigmaSq) * heightWeight;
        const idx = rowOffset + ix;
        sumWArr[idx] += w;
        sumSinArr[idx] += wPhase * sinP;
        sumCosArr[idx] += wPhase * cosP;
      }
    }
  }

  const fieldBytes = new Uint8Array(fieldW * fieldH * 4);
  for (let idx = 0; idx < fieldW * fieldH; idx++) {
    const wTotal = sumWArr[idx];
    const normW = 1.0 - Math.exp(-wTotal * 0.088);
    let sNorm = 0.0;
    let cNorm = 1.0;
    if (wTotal > 1e-5) {
      const mag = Math.hypot(sumSinArr[idx], sumCosArr[idx]) || 1.0;
      sNorm = sumSinArr[idx] / mag;
      cNorm = sumCosArr[idx] / mag;
    }
    const bIdx = idx * 4;
    fieldBytes[bIdx + 0] = Math.min(255, Math.max(0, Math.round(normW * 255)));
    fieldBytes[bIdx + 1] = Math.min(255, Math.max(0, Math.round((sNorm * 0.5 + 0.5) * 255)));
    fieldBytes[bIdx + 2] = Math.min(255, Math.max(0, Math.round((cNorm * 0.5 + 0.5) * 255)));
    fieldBytes[bIdx + 3] = 255;
  }

  const glowFieldTex = new THREE.DataTexture(fieldBytes, fieldW, fieldH, THREE.RGBAFormat);
  glowFieldTex.magFilter = THREE.LinearFilter;
  glowFieldTex.minFilter = THREE.LinearFilter;
  glowFieldTex.wrapS = THREE.ClampToEdgeWrapping;
  glowFieldTex.wrapT = THREE.ClampToEdgeWrapping;
  glowFieldTex.flipY = false;
  glowFieldTex.needsUpdate = true;
  sharedUnderTrackUniforms.uGlowFieldTex.value = glowFieldTex;

  const quadVerts = new Float32Array([
    -0.58, 0.0005, -0.34,
     0.54, 0.0005, -0.34,
     0.54, 0.0005,  0.30,
    -0.58, 0.0005,  0.30,
     0.156, 0.0034, 0.003,
     0.494, 0.0034, 0.003,
     0.494, 0.0034, 0.267,
     0.156, 0.0034, 0.267,
  ]);
  const quadSurfaceIds = new Float32Array([
    0, 0, 0, 0,
    1, 1, 1, 1,
  ]);
  const quadIndices = [
    0, 2, 1, 0, 3, 2,
    4, 6, 5, 4, 7, 6,
  ];

  const deskGlowGeo = new THREE.BufferGeometry();
  deskGlowGeo.setAttribute('position', new THREE.BufferAttribute(quadVerts, 3));
  deskGlowGeo.setAttribute('aSurfaceId', new THREE.BufferAttribute(quadSurfaceIds, 1));
  deskGlowGeo.setIndex(quadIndices);
  deskGlowGeo.computeBoundingBox();
  deskGlowGeo.computeBoundingSphere();

  const deskGlowMat = new THREE.ShaderMaterial({
    uniforms: sharedUnderTrackUniforms,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    vertexShader: /* glsl */ `
      attribute float aSurfaceId;
      varying vec3 vWorldPos;
      varying float vSurfaceId;
      void main() {
        vSurfaceId = aSurfaceId;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uIntensity;
      uniform sampler2D uGlowFieldTex;
      varying vec3 vWorldPos;
      varying float vSurfaceId;

      vec3 evalTrackLedPalette(float phaseNorm, float timeSec) {
        float p = fract(phaseNorm - timeSec * 0.055 + 0.08);
        float seg = p * 4.0;
        int idx = int(floor(seg));
        float f = smoothstep(0.0, 1.0, fract(seg));
        vec3 cPink   = vec3(1.00, 0.05, 0.55);
        vec3 cPurple = vec3(0.54, 0.03, 1.00);
        vec3 cBlue   = vec3(0.00, 0.54, 1.00);
        vec3 cViolet = vec3(0.66, 0.05, 1.00);
        if (idx == 0) return mix(cPink, cPurple, f);
        if (idx == 1) return mix(cPurple, cBlue, f);
        if (idx == 2) return mix(cBlue, cViolet, f);
        return mix(cViolet, cPink, f);
      }

      void main() {
        if (uIntensity <= 0.001) discard;

        if (vSurfaceId < 0.5) {
          if (vWorldPos.x > 0.155 && vWorldPos.x < 0.495 && vWorldPos.z > 0.0025 && vWorldPos.z < 0.2675) {
            discard;
          }
        }

        vec2 fieldUv = vec2(
          (vWorldPos.x - (-0.58)) / 1.16,
          (vWorldPos.z - (-0.34)) / 0.68
        );
        if (fieldUv.x < 0.0 || fieldUv.x > 1.0 || fieldUv.y < 0.0 || fieldUv.y > 1.0) discard;

        vec4 field = texture2D(uGlowFieldTex, fieldUv);
        float weight = field.r;
        if (weight < 0.01) discard;

        float sinP = field.g * 2.0 - 1.0;
        float cosP = field.b * 2.0 - 1.0;
        float sNorm = atan(sinP, cosP) / 6.2831853 + 0.5;

        float edgeMaskX = smoothstep(-0.57, -0.51, vWorldPos.x) * (1.0 - smoothstep(0.49, 0.535, vWorldPos.x));
        float edgeMaskZ = smoothstep(-0.33, -0.28, vWorldPos.z) * (1.0 - smoothstep(0.26, 0.298, vWorldPos.z));

        vec3 col = evalTrackLedPalette(sNorm, uTime);
        float glowStrength = pow(weight, 1.12) * edgeMaskX * edgeMaskZ * 0.50 * uIntensity;
        if (glowStrength < 0.003) discard;
        gl_FragColor = vec4(col * glowStrength, 1.0);
      }
    `,
  });

  const deskGlowMesh = new THREE.Mesh(deskGlowGeo, deskGlowMat);
  deskGlowMesh.name = 'UnderTrackDeskGlowMesh';
  deskGlowMesh.castShadow = false;
  deskGlowMesh.receiveShadow = false;
  deskGlowMesh.frustumCulled = true;
  underTrackLedGroup.add(deskGlowMesh);

  // 6D. Formula 1 5-Light Start Gantry Red LED Pods at Sample 646 (Right-to-Left: +0.0064 -> -0.0064)
  // All 5 start lights begin OFF (dark smoked lenses in track_coaster.glb). When Enter is pressed,
  // setF1StartLights(1..5) illuminates them one by one from right to left, then setF1StartLights(0) extinguishes all 5!
  const f1GlowCanvas = document.createElement('canvas');
  f1GlowCanvas.width = 64;
  f1GlowCanvas.height = 64;
  const f1GlowCtx = f1GlowCanvas.getContext('2d');
  const f1RadGrad = f1GlowCtx.createRadialGradient(32, 32, 2, 32, 32, 30);
  f1RadGrad.addColorStop(0.0, 'rgba(255, 60, 70, 0.95)');
  f1RadGrad.addColorStop(0.35, 'rgba(255, 16, 32, 0.65)');
  f1RadGrad.addColorStop(0.72, 'rgba(220, 0, 18, 0.22)');
  f1RadGrad.addColorStop(1.0, 'rgba(180, 0, 10, 0.0)');
  f1GlowCtx.fillStyle = f1RadGrad;
  f1GlowCtx.fillRect(0, 0, 64, 64);
  const f1GlowTex = new THREE.CanvasTexture(f1GlowCanvas);

  const f1RedLensGeo = new THREE.BoxGeometry(0.00164, 0.00162, 0.00092);
  const f1RedLensMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(1.45, 0.06, 0.10),
    toneMapped: false,
  });
  const f1HaloSpriteMat = new THREE.SpriteMaterial({
    map: f1GlowTex,
    color: 0xff1a2b,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });

  const f1StartLightPods = [];
  const gSample = samples[646] || samples[0];
  const gCenter = new THREE.Vector3(...gSample.position);
  const gRightHoriz = new THREE.Vector3(gSample.right[0], 0, gSample.right[2]).normalize();
  const gUpVec = new THREE.Vector3(0, 1, 0);

  // Ordered strictly from RIGHT (+0.0064) to LEFT (-0.0064) as seen by the driver at the start line
  const f1PodOffsetsRightToLeft = [0.0064, 0.0032, 0.0, -0.0032, -0.0064];
  for (let idx = 0; idx < 5; idx++) {
    const uPod = f1PodOffsetsRightToLeft[idx];
    const podGroup = new THREE.Group();
    podGroup.position
      .copy(gCenter)
      .addScaledVector(gRightHoriz, uPod)
      .addScaledVector(gUpVec, 0.012775);

    const lensMesh = new THREE.Mesh(f1RedLensGeo, f1RedLensMat);
    lensMesh.castShadow = false;
    lensMesh.receiveShadow = false;
    podGroup.add(lensMesh);

    const haloSprite = new THREE.Sprite(f1HaloSpriteMat);
    haloSprite.scale.set(0.0054, 0.0054, 1.0);
    haloSprite.position.set(0.00086, 0, 0);
    podGroup.add(haloSprite);

    podGroup.visible = false; // Starts OFF!
    underTrackLedGroup.add(podGroup);
    f1StartLightPods.push(podGroup);
  }

  function setF1StartLights(litCount = 0) {
    const count = Math.max(0, Math.min(5, Math.floor(litCount)));
    for (let i = 0; i < f1StartLightPods.length; i++) {
      f1StartLightPods[i].visible = i < count;
    }
  }

  function updateUnderTrackLed(elapsedTime = 0.0, intensity = 1.0) {
    sharedUnderTrackUniforms.uTime.value = elapsedTime;
    sharedUnderTrackUniforms.uIntensity.value = intensity;
    underTrackLedGroup.visible = intensity > 0.005;
  }

  // -------------------------------------------------------------------------
  // 7. 3D FRENET-SERRET & SPLINE DEBUG OVERLAY GROUP (Toggled via HUD Tweaker)
  // -------------------------------------------------------------------------
  const debugGroup = new THREE.Group();
  debugGroup.name = 'SplineDebugOverlay';
  debugGroup.visible = false;

  const centerLinePoints = samples.map((s) => new THREE.Vector3(...s.position).add(new THREE.Vector3(0, 0.002, 0)));
  centerLinePoints.push(centerLinePoints[0].clone());
  const centerLineGeo = new THREE.BufferGeometry().setFromPoints(centerLinePoints);
  const centerLineMesh = new THREE.Line(
    centerLineGeo,
    new THREE.LineBasicMaterial({ color: 0x4cc2ff })
  );
  debugGroup.add(centerLineMesh);

  // Tangent (Red), Normal (Green), Right (Blue) axes every 12 samples
  for (let i = 0; i < N; i += 12) {
    const s = samples[i];
    const origin = new THREE.Vector3(...s.position).add(new THREE.Vector3(0, 0.0015, 0));
    const tVec = new THREE.Vector3(...s.tangent).multiplyScalar(0.014);
    const nVec = new THREE.Vector3(...s.normal).multiplyScalar(0.012);
    const rVec = new THREE.Vector3(...s.right).multiplyScalar(0.011);

    debugGroup.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([origin, origin.clone().add(tVec)]),
        new THREE.LineBasicMaterial({ color: 0xff3b30 })
      ),
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([origin, origin.clone().add(nVec)]),
        new THREE.LineBasicMaterial({ color: 0x32d74b })
      ),
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([origin, origin.clone().add(rVec)]),
        new THREE.LineBasicMaterial({ color: 0x1e6bff })
      )
    );
  }
  trackGroup.add(debugGroup);

  return {
    trackGroup,
    underTrackLedGroup,
    updateUnderTrackLed,
    setF1StartLights,
    roadGeo,
    debugGroup,
    calibrateTrackCoasterGlb,
  };
}
