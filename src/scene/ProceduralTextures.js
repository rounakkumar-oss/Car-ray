import * as THREE from 'three';

/**
 * Generates high-definition procedural Canvas PBR textures for the
 * Golden-Hour 1:87 Micro-Coaster Desk Diorama and the 14-Room Giant House Open World,
 * while also supporting optional external textures from /assets/textures/.
 */
export function createOakWoodTextures() {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Rich warm medium honey-walnut/oak base gradient (zero harsh lines or plank seams)
  const baseGrad = ctx.createLinearGradient(0, 0, width, height);
  baseGrad.addColorStop(0.0, '#96633b');
  baseGrad.addColorStop(0.35, '#9d6a40');
  baseGrad.addColorStop(0.7, '#8f5d36');
  baseGrad.addColorStop(1.0, '#855530');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, width, height);

  // Soft organic micro-grain variation without harsh lines
  for (let i = 0; i < 240; i++) {
    const fy = (i * 83) % height;
    const hBand = 16 + (i % 24);
    const alpha = 0.012 + (i % 5) * 0.003;
    ctx.fillStyle = i % 2 === 0 ? `rgba(60, 34, 14, ${alpha})` : `rgba(185, 130, 82, ${alpha})`;
    ctx.fillRect(0, fy, width, hBand);
  }

  // Bump/Roughness companion canvas
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 1024;
  bumpCanvas.height = 512;
  const bCtx = bumpCanvas.getContext('2d');
  bCtx.drawImage(canvas, 0, 0, 1024, 512);

  const colorTex = new THREE.CanvasTexture(canvas);
  colorTex.colorSpace = THREE.SRGBColorSpace;
  colorTex.wrapS = THREE.RepeatWrapping;
  colorTex.wrapT = THREE.RepeatWrapping;
  colorTex.anisotropy = 8;

  const bumpTex = new THREE.CanvasTexture(bumpCanvas);
  bumpTex.wrapS = THREE.RepeatWrapping;
  bumpTex.wrapT = THREE.RepeatWrapping;

  return { colorTex, bumpTex };
}

export function createAsphaltRoadTexture() {
  const w = 256;
  const h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Dark slate micro-asphalt base
  ctx.fillStyle = '#1e2128';
  ctx.fillRect(0, 0, w, h);

  // Darker rubberized racing groove in center 45% of width
  const grooveGrad = ctx.createLinearGradient(0, 0, w, 0);
  grooveGrad.addColorStop(0.0, 'rgba(42, 46, 56, 0.5)');
  grooveGrad.addColorStop(0.25, 'rgba(20, 22, 28, 0.7)');
  grooveGrad.addColorStop(0.5, 'rgba(14, 16, 21, 0.85)');
  grooveGrad.addColorStop(0.75, 'rgba(20, 22, 28, 0.7)');
  grooveGrad.addColorStop(1.0, 'rgba(42, 46, 56, 0.5)');
  ctx.fillStyle = grooveGrad;
  ctx.fillRect(0, 0, w, h);

  // Fine aggregate speckle
  for (let i = 0; i < 6500; i++) {
    const x = (i * 73) % w;
    const y = (i * 199) % h;
    const v = 24 + (i % 34);
    ctx.fillStyle = `rgb(${v}, ${v + 2}, ${v + 5})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Warm yellow racing edge lines on left and right margins
  ctx.fillStyle = '#f5a623';
  ctx.fillRect(12, 0, 5, h);
  ctx.fillRect(w - 17, 0, 5, h);

  // Crisp dashed white centerline
  ctx.fillStyle = 'rgba(240, 245, 255, 0.78)';
  for (let y = 0; y < h; y += 64) {
    ctx.fillRect(w / 2 - 2, y + 8, 4, 34);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 56);
  tex.anisotropy = 8;
  return tex;
}

export function createMonitorScreenTexture() {
  const w = 1024;
  const h = 576;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Deep midnight-blue & golden-hour sunset gradient wallpaper
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0.0, '#070c1a');
  bg.addColorStop(0.45, '#0b1833');
  bg.addColorStop(0.8, '#1b2442');
  bg.addColorStop(1.0, '#30222b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Subtle perspective grid on lower screen
  ctx.strokeStyle = 'rgba(30, 107, 255, 0.22)';
  ctx.lineWidth = 1.5;
  for (let y = 320; y < h; y += 28) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  for (let x = -200; x <= w + 200; x += 64) {
    ctx.beginPath();
    ctx.moveTo(w / 2 + (x - w / 2) * 0.25, 320);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  // Glowing electric-blue audio spectrum bars (matching the podcasting mic!)
  for (let i = 0; i < 48; i++) {
    const bx = 140 + i * 15.5;
    const bh = 22 + Math.sin(i * 0.42) * 48 + Math.cos(i * 0.95) * 28;
    const barGrad = ctx.createLinearGradient(0, 290 - bh, 0, 290);
    barGrad.addColorStop(0, '#5ce1ff');
    barGrad.addColorStop(0.5, '#1e6bff');
    barGrad.addColorStop(1, 'rgba(30, 107, 255, 0.15)');
    ctx.fillStyle = barGrad;
    ctx.fillRect(bx, 290 - bh, 9, bh);
  }

  // IDE / Telemetry window header
  ctx.fillStyle = 'rgba(12, 19, 36, 0.82)';
  ctx.strokeStyle = 'rgba(76, 194, 255, 0.35)';
  ctx.lineWidth = 2;
  ctx.fillRect(70, 52, 884, 135);
  ctx.strokeRect(70, 52, 884, 135);

  ctx.fillStyle = '#ffaa44';
  ctx.font = 'bold 24px monospace';
  ctx.fillText('LG ULTRAGEAR 27" • 1:87 HO MICRO-COASTER TELEMETRY', 98, 96);

  ctx.fillStyle = '#7cd4ff';
  ctx.font = '18px monospace';
  ctx.fillText('SPLINE: 720 PERIODIC C² SAMPLES | LENGTH: 3.837m (333.8m @ 1:87)', 98, 132);
  ctx.fillStyle = '#a8b8d0';
  ctx.fillText('SECTORS: [1] BOYATA CLIMB [2] CAT 360° HELIX [3] #1E6BFF MIC [4] LAMP SPIRAL', 98, 164);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createCheckeredGantryTexture() {
  const w = 512;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0d1017';
  ctx.fillRect(0, 0, w, h);

  // Checkered strips on left and right
  const sq = 16;
  for (let r = 0; r < h / sq; r++) {
    for (let c = 0; c < 5; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#14171f';
      ctx.fillRect(c * sq, r * sq, sq, sq);
      ctx.fillRect(w - (c + 1) * sq, r * sq, sq, sq);
    }
  }

  // Center banner text
  ctx.fillStyle = '#ffaa44';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('START • FINISH', w / 2, 54);
  ctx.fillStyle = '#5ce1ff';
  ctx.font = 'bold 17px monospace';
  ctx.fillText('1:87 MICRO-COASTER GRAND PRIX', w / 2, 88);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates a lightweight, realistic procedural PMREM environment texture once at startup
 * so PBR metals, brushed steel appliances, glass panels, and polished marble surfaces have
 * authentic warm golden-hour & cool neon specular reflections with zero per-frame GPU cost.
 */
let cachedPmremEnvTex = null;
export function createProceduralPMREMEnvironment(renderer) {
  if (cachedPmremEnvTex) return cachedPmremEnvTex;
  if (!renderer) return null;

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileCubemapShader();

  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x16141a);

  // Warm golden-amber ceiling & window softboxes
  const warmDome = new THREE.Mesh(
    new THREE.SphereGeometry(8, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0x241d18, side: THREE.BackSide })
  );
  envScene.add(warmDome);

  const addLightPanel = (w, h, x, y, z, rx, ry, rz, hex) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: hex, side: THREE.DoubleSide })
    );
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    envScene.add(m);
  };

  // Warm key window & overhead chandelier bounce panels
  addLightPanel(5.5, 3.2, -4.5, 3.2, -3.5, 0.35, 0.65, 0.0, 0xffd296);
  addLightPanel(6.0, 6.0, 0.0, 5.8, 0.0, Math.PI / 2, 0.0, 0.0, 0xffdfb8);
  // Subtle electric-cyan & neon-magenta accent strips for realistic rim speculars
  addLightPanel(4.2, 1.8, 4.8, 1.6, 2.5, 0.0, -Math.PI / 2, 0.0, 0x5ce8ff);
  addLightPanel(3.8, 1.6, -4.6, 1.4, 3.8, 0.0, Math.PI / 2, 0.0, 0xff62a8);
  // Warm hardwood floor bounce
  addLightPanel(10.0, 10.0, 0.0, -4.5, 0.0, -Math.PI / 2, 0.0, 0.0, 0x6b472a);

  const renderTarget = pmremGenerator.fromScene(envScene, 0.035);
  cachedPmremEnvTex = renderTarget.texture;
  pmremGenerator.dispose();
  return cachedPmremEnvTex;
}

/**
 * Generates and caches all high-resolution procedural CanvasTextures (Albedo + Bump/Roughness)
 * for the 14-Room Giant House Open World:
 * - Planked Oak Hardwood & Dark Fluted Walnut
 * - Soft Velvet / Bouclé Fabric Weave
 * - Polished Calacatta Veined Marble & Ceramic Subway/Hex Tiles
 * - Brushed Stainless Steel & Anodized Aluminum
 * - Woven Geometric Area Rugs, OLED TV / Cinema Screens, and Pool Water Caustics
 */
let cachedHousePBRTextures = null;
export function getHousePBRTextures() {
  if (cachedHousePBRTextures) return cachedHousePBRTextures;

  // 1. PLANKED HARDWOOD FLOOR & BUMP MAP (1024x1024)
  const hwCanvas = document.createElement('canvas');
  hwCanvas.width = 1024;
  hwCanvas.height = 1024;
  const hwCtx = hwCanvas.getContext('2d');

  const hwBumpCanvas = document.createElement('canvas');
  hwBumpCanvas.width = 512;
  hwBumpCanvas.height = 512;
  const hwbCtx = hwBumpCanvas.getContext('2d');

  const plankRows = 8;
  const plankH = 1024 / plankRows;
  const plankTones = ['#9b683e', '#8e5c34', '#a77346', '#84532d', '#956239', '#a06d42'];

  for (let r = 0; r < plankRows; r++) {
    const y0 = r * plankH;
    const cols = 3;
    const offset = (r % 2) * 170;
    for (let c = -1; c <= cols; c++) {
      const x0 = c * 340 + offset;
      const wPlank = 340;
      const baseHex = plankTones[(r * 3 + c + 10) % plankTones.length];
      hwCtx.fillStyle = baseHex;
      hwCtx.fillRect(x0, y0, wPlank, plankH);

      // Organic wood grain cathedral rings and fibers inside each plank
      for (let g = 0; g < 28; g++) {
        const gy = y0 + ((g * 19) % plankH);
        const gh = 2 + (g % 5);
        hwCtx.fillStyle =
          g % 2 === 0 ? 'rgba(52, 28, 10, 0.08)' : 'rgba(220, 168, 114, 0.06)';
        hwCtx.fillRect(x0, gy, wPlank, gh);
      }

      // Recessed dark beveled seam around each plank
      hwCtx.strokeStyle = 'rgba(36, 18, 6, 0.55)';
      hwCtx.lineWidth = 3;
      hwCtx.strokeRect(x0 + 1.5, y0 + 1.5, wPlank - 3, plankH - 3);
    }
  }
  hwbCtx.drawImage(hwCanvas, 0, 0, 512, 512);

  const hardwoodColorTex = new THREE.CanvasTexture(hwCanvas);
  hardwoodColorTex.colorSpace = THREE.SRGBColorSpace;
  hardwoodColorTex.wrapS = THREE.RepeatWrapping;
  hardwoodColorTex.wrapT = THREE.RepeatWrapping;
  hardwoodColorTex.repeat.set(3, 3);
  hardwoodColorTex.anisotropy = 8;

  const hardwoodBumpTex = new THREE.CanvasTexture(hwBumpCanvas);
  hardwoodBumpTex.wrapS = THREE.RepeatWrapping;
  hardwoodBumpTex.wrapT = THREE.RepeatWrapping;
  hardwoodBumpTex.repeat.set(3, 3);

  // 2. RICH ESPRESSO / DARK WALNUT WOOD GRAIN & BUMP (512x512)
  const walCanvas = document.createElement('canvas');
  walCanvas.width = 512;
  walCanvas.height = 512;
  const walCtx = walCanvas.getContext('2d');
  const walGrad = walCtx.createLinearGradient(0, 0, 512, 512);
  walGrad.addColorStop(0.0, '#442817');
  walGrad.addColorStop(0.5, '#54331e');
  walGrad.addColorStop(1.0, '#382011');
  walCtx.fillStyle = walGrad;
  walCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 160; i++) {
    const y = (i * 23) % 512;
    walCtx.fillStyle = i % 2 === 0 ? 'rgba(20, 10, 4, 0.14)' : 'rgba(120, 78, 46, 0.09)';
    walCtx.fillRect(0, y, 512, 3 + (i % 6));
  }
  const walnutColorTex = new THREE.CanvasTexture(walCanvas);
  walnutColorTex.colorSpace = THREE.SRGBColorSpace;
  walnutColorTex.wrapS = THREE.RepeatWrapping;
  walnutColorTex.wrapT = THREE.RepeatWrapping;
  walnutColorTex.anisotropy = 8;

  const walnutBumpTex = new THREE.CanvasTexture(walCanvas);
  walnutBumpTex.wrapS = THREE.RepeatWrapping;
  walnutBumpTex.wrapT = THREE.RepeatWrapping;

  // 3. POLISHED CALACATTA VEINED MARBLE & CERAMIC TILE (1024x1024)
  const marCanvas = document.createElement('canvas');
  marCanvas.width = 1024;
  marCanvas.height = 1024;
  const marCtx = marCanvas.getContext('2d');
  marCtx.fillStyle = '#f5f6f9';
  marCtx.fillRect(0, 0, 1024, 1024);

  // Soft warm-grey & gold Calacatta marble veins
  for (let v = 0; v < 22; v++) {
    marCtx.beginPath();
    let vx = ((v * 173) % 1024);
    let vy = 0;
    marCtx.moveTo(vx, vy);
    for (let step = 1; step <= 16; step++) {
      vy = (step / 16) * 1024;
      vx += Math.sin(step * 0.85 + v * 1.7) * 42;
      marCtx.lineTo(vx, vy);
    }
    marCtx.strokeStyle =
      v % 4 === 0 ? 'rgba(198, 166, 112, 0.22)' : 'rgba(136, 146, 162, 0.24)';
    marCtx.lineWidth = 2 + (v % 6) * 1.8;
    marCtx.stroke();
  }
  const marbleColorTex = new THREE.CanvasTexture(marCanvas);
  marbleColorTex.colorSpace = THREE.SRGBColorSpace;
  marbleColorTex.wrapS = THREE.RepeatWrapping;
  marbleColorTex.wrapT = THREE.RepeatWrapping;
  marbleColorTex.anisotropy = 8;

  // Ceramic large-format tile with subtle grout grid
  const tileCanvas = document.createElement('canvas');
  tileCanvas.width = 512;
  tileCanvas.height = 512;
  const tCtx = tileCanvas.getContext('2d');
  tCtx.drawImage(marCanvas, 0, 0, 512, 512);
  tCtx.strokeStyle = 'rgba(150, 162, 176, 0.55)';
  tCtx.lineWidth = 3;
  const tileStep = 128;
  for (let p = 0; p <= 512; p += tileStep) {
    tCtx.beginPath();
    tCtx.moveTo(p, 0);
    tCtx.lineTo(p, 512);
    tCtx.stroke();
    tCtx.beginPath();
    tCtx.moveTo(0, p);
    tCtx.lineTo(512, p);
    tCtx.stroke();
  }
  const ceramicTileColorTex = new THREE.CanvasTexture(tileCanvas);
  ceramicTileColorTex.colorSpace = THREE.SRGBColorSpace;
  ceramicTileColorTex.wrapS = THREE.RepeatWrapping;
  ceramicTileColorTex.wrapT = THREE.RepeatWrapping;
  ceramicTileColorTex.repeat.set(3, 3);
  ceramicTileColorTex.anisotropy = 8;

  const ceramicTileBumpTex = new THREE.CanvasTexture(tileCanvas);
  ceramicTileBumpTex.wrapS = THREE.RepeatWrapping;
  ceramicTileBumpTex.wrapT = THREE.RepeatWrapping;
  ceramicTileBumpTex.repeat.set(3, 3);

  // 4. SOFT VELVET / BOUCLÉ FABRIC WEAVE BUMP & ALBEDO (512x512)
  const fabCanvas = document.createElement('canvas');
  fabCanvas.width = 256;
  fabCanvas.height = 256;
  const fabCtx = fabCanvas.getContext('2d');
  fabCtx.fillStyle = '#d8d8d8';
  fabCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 4) {
    for (let x = 0; x < 256; x += 4) {
      const shade = ((x + y) % 8 === 0) ? 235 : 196;
      fabCtx.fillStyle = `rgb(${shade},${shade},${shade})`;
      fabCtx.fillRect(x, y, 3, 2);
    }
  }
  const fabricWeaveBumpTex = new THREE.CanvasTexture(fabCanvas);
  fabricWeaveBumpTex.wrapS = THREE.RepeatWrapping;
  fabricWeaveBumpTex.wrapT = THREE.RepeatWrapping;
  fabricWeaveBumpTex.repeat.set(6, 6);

  // 5. BRUSHED STAINLESS STEEL & CHROME TEXTURE (512x512)
  const metCanvas = document.createElement('canvas');
  metCanvas.width = 512;
  metCanvas.height = 512;
  const metCtx = metCanvas.getContext('2d');
  const metGrad = metCtx.createLinearGradient(0, 0, 512, 512);
  metGrad.addColorStop(0.0, '#d2d8e0');
  metGrad.addColorStop(0.45, '#e8edf4');
  metGrad.addColorStop(0.55, '#bfc7d2');
  metGrad.addColorStop(1.0, '#d8dfe8');
  metCtx.fillStyle = metGrad;
  metCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 360; i++) {
    const y = (i * 7) % 512;
    metCtx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(90,102,118,0.10)';
    metCtx.fillRect(0, y, 512, 1);
  }
  const brushedMetalTex = new THREE.CanvasTexture(metCanvas);
  brushedMetalTex.colorSpace = THREE.SRGBColorSpace;
  brushedMetalTex.wrapS = THREE.RepeatWrapping;
  brushedMetalTex.wrapT = THREE.RepeatWrapping;

  // 6. WOVEN DESIGNER AREA RUG TEXTURE (512x512)
  const rugCanvas = document.createElement('canvas');
  rugCanvas.width = 512;
  rugCanvas.height = 512;
  const rCtx = rugCanvas.getContext('2d');
  rCtx.fillStyle = '#dfd5c6';
  rCtx.fillRect(0, 0, 512, 512);
  // Decorative border + mid-century geometric diamond motif
  rCtx.strokeStyle = '#2d4b6e';
  rCtx.lineWidth = 18;
  rCtx.strokeRect(24, 24, 464, 464);
  rCtx.strokeStyle = '#c87d48';
  rCtx.lineWidth = 8;
  rCtx.strokeRect(48, 48, 416, 416);
  for (let ry = 96; ry <= 416; ry += 128) {
    for (let rx = 96; rx <= 416; rx += 128) {
      rCtx.beginPath();
      rCtx.moveTo(rx, ry - 44);
      rCtx.lineTo(rx + 44, ry);
      rCtx.lineTo(rx, ry + 44);
      rCtx.lineTo(rx - 44, ry);
      rCtx.closePath();
      rCtx.fillStyle = 'rgba(45, 75, 110, 0.22)';
      rCtx.fill();
      rCtx.strokeStyle = '#2d4b6e';
      rCtx.lineWidth = 5;
      rCtx.stroke();
    }
  }
  const wovenRugLivingTex = new THREE.CanvasTexture(rugCanvas);
  wovenRugLivingTex.colorSpace = THREE.SRGBColorSpace;
  wovenRugLivingTex.anisotropy = 8;

  // 7. CINEMA / OLED TV VIBRANT SCREEN TEXTURE (512x256)
  const tvCanvas = document.createElement('canvas');
  tvCanvas.width = 512;
  tvCanvas.height = 256;
  const tvCtx = tvCanvas.getContext('2d');
  const tvGrad = tvCtx.createLinearGradient(0, 0, 512, 256);
  tvGrad.addColorStop(0.0, '#091326');
  tvGrad.addColorStop(0.45, '#13284c');
  tvGrad.addColorStop(0.78, '#4e1f5a');
  tvGrad.addColorStop(1.0, '#ff6b4a');
  tvCtx.fillStyle = tvGrad;
  tvCtx.fillRect(0, 0, 512, 256);
  // Glowing horizon sun & synthwave grid on TV/Theater screens
  const sunG = tvCtx.createRadialGradient(256, 136, 8, 256, 136, 92);
  sunG.addColorStop(0.0, '#fff2b2');
  sunG.addColorStop(0.45, '#ff7b38');
  sunG.addColorStop(1.0, 'rgba(255, 42, 133, 0.0)');
  tvCtx.fillStyle = sunG;
  tvCtx.beginPath();
  tvCtx.arc(256, 136, 92, 0, Math.PI * 2);
  tvCtx.fill();
  tvCtx.strokeStyle = 'rgba(0, 240, 255, 0.42)';
  tvCtx.lineWidth = 2;
  for (let y = 160; y < 256; y += 16) {
    tvCtx.beginPath();
    tvCtx.moveTo(0, y);
    tvCtx.lineTo(512, y);
    tvCtx.stroke();
  }
  const tvCinemaTex = new THREE.CanvasTexture(tvCanvas);
  tvCinemaTex.colorSpace = THREE.SRGBColorSpace;

  // 8. POOL WATER CAUSTICS TEXTURE (512x512)
  const poolCanvas = document.createElement('canvas');
  poolCanvas.width = 512;
  poolCanvas.height = 512;
  const pCtx = poolCanvas.getContext('2d');
  const pGrad = pCtx.createLinearGradient(0, 0, 512, 512);
  pGrad.addColorStop(0.0, '#00a8e8');
  pGrad.addColorStop(0.5, '#00d2ff');
  pGrad.addColorStop(1.0, '#0090d0');
  pCtx.fillStyle = pGrad;
  pCtx.fillRect(0, 0, 512, 512);
  pCtx.strokeStyle = 'rgba(215, 252, 255, 0.38)';
  pCtx.lineWidth = 3;
  for (let i = 0; i < 42; i++) {
    const cx = (i * 97) % 512;
    const cy = (i * 151) % 512;
    const r = 24 + (i % 5) * 14;
    pCtx.beginPath();
    pCtx.arc(cx, cy, r, 0, Math.PI * 2);
    pCtx.stroke();
  }
  const poolCausticsTex = new THREE.CanvasTexture(poolCanvas);
  poolCausticsTex.colorSpace = THREE.SRGBColorSpace;
  poolCausticsTex.wrapS = THREE.RepeatWrapping;
  poolCausticsTex.wrapT = THREE.RepeatWrapping;
  poolCausticsTex.repeat.set(2, 2);

  // 9. SOFT RADIAL GLOW LIGHTMAP TEXTURE (for warm lamp / neon LED floor & wall pools)
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = 256;
  glowCanvas.height = 256;
  const gCtx = glowCanvas.getContext('2d');
  const radG = gCtx.createRadialGradient(128, 128, 4, 128, 128, 124);
  radG.addColorStop(0.0, 'rgba(255, 255, 255, 0.85)');
  radG.addColorStop(0.45, 'rgba(255, 255, 255, 0.34)');
  radG.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
  gCtx.fillStyle = radG;
  gCtx.fillRect(0, 0, 256, 256);
  const softGlowMapTex = new THREE.CanvasTexture(glowCanvas);

  cachedHousePBRTextures = {
    hardwoodColorTex,
    hardwoodBumpTex,
    walnutColorTex,
    walnutBumpTex,
    marbleColorTex,
    ceramicTileColorTex,
    ceramicTileBumpTex,
    fabricWeaveBumpTex,
    brushedMetalTex,
    wovenRugLivingTex,
    tvCinemaTex,
    poolCausticsTex,
    softGlowMapTex,
  };
  return cachedHousePBRTextures;
}
