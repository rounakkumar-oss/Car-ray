import JSZip from 'jszip';

const SOURCE_FILES = import.meta.glob(
  [
    '/.env.example',
    '/.gitignore',
    '/index.css',
    '/index.html',
    '/metadata.json',
    '/package.json',
    '/tsconfig.json',
    '/vite.config.ts',
    '/src/**/*',
  ],
  { query: '?raw', import: 'default', eager: true }
);

const PUBLIC_DATA_FILES = [
  'assets/data/desk_manifest.json',
  'assets/data/track_spline.json',
];

const PUBLIC_AUDIO_FILES = [
  'assets/audio/curb_rumble_loop.wav',
  'assets/audio/engine_sputter_burst_1.wav',
  'assets/audio/engine_sputter_burst_2.wav',
  'assets/audio/engine_sputter_burst_3.wav',
  'assets/audio/kart_cruise_mid_loop.wav',
  'assets/audio/kart_idle_loop.wav',
  'assets/audio/kart_tire_drift_loop.wav',
];

const README_CONTENT = `# Desk Racer — Miniature 1:87 Desk Coaster Racing Game

A 3D miniature desk coaster time-trial racing game built with **Three.js**, **Rapier3D Physics**, and **Vite**.

## Features
- **1:87 HO Micro-Scale Physics**: Banked coaster track spline physics powered by \`@dimforge/rapier3d-compat\`.
- **Custom Post-Processing**: Hardware-depth Golden-Angle Vogel Spiral Bokeh DOF, ACES Filmic Tone Mapping, Unreal Bloom, and FXAA.
- **4 Camera Perspectives**:
  - \`1\` — Low Chase View
  - \`2\` — Cockpit Visor POV
  - \`3\` — Full Desk Diorama Orbit View
  - \`4\` — Obstacle-Free Helicopter Drone View
- **WebAudio Synthesizer**: Dynamic multi-layered kart engine, tire drift, and curb rumble synthesis.

## Quick Start (Local Development)

1. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

2. **Start the development server:**
   \`\`\`bash
   npm run dev
   \`\`\`
   Open \`http://localhost:3000\` in your browser.

3. **Build for production:**
   \`\`\`bash
   npm run build
   \`\`\`

## Pushing to GitHub

To upload this downloaded project to your own GitHub repository:

\`\`\`bash
git init
git add .
git commit -m "Initial commit: Desk Racer 3D"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/desk-racer.git
git push -u origin main
\`\`\`
`;

export async function downloadProjectForGitHub(onStatusUpdate) {
  const notify = (msg) => {
    if (typeof onStatusUpdate === 'function') {
      onStatusUpdate(msg);
    }
  };

  notify('PACKAGING CODE...');
  const zip = new JSZip();

  // 1. Add all source files captured via Vite's import.meta.glob
  for (const [rawPath, content] of Object.entries(SOURCE_FILES)) {
    const cleanPath = rawPath.replace(/^\//, '');
    if (typeof content === 'string') {
      zip.file(cleanPath, content);
    }
  }

  // 2. Add README.md with GitHub & local setup instructions
  zip.file('README.md', README_CONTENT);

  // 3. Fetch and bundle JSON data files into public/assets/data/
  notify('BUNDLING ASSETS...');
  await Promise.all(
    PUBLIC_DATA_FILES.map(async (relPath) => {
      try {
        const res = await fetch(`/${relPath}`);
        if (res.ok) {
          const text = await res.text();
          zip.file(`public/${relPath}`, text);
        }
      } catch (_err) {
        // Ignore individual asset fetch warnings
      }
    })
  );

  // 4. Fetch and bundle WAV audio loops into public/assets/audio/
  await Promise.all(
    PUBLIC_AUDIO_FILES.map(async (relPath) => {
      try {
        const res = await fetch(`/${relPath}`);
        if (res.ok) {
          const buf = await res.arrayBuffer();
          zip.file(`public/${relPath}`, buf);
        }
      } catch (_err) {
        // Ignore individual audio fetch warnings
      }
    })
  );

  notify('COMPRESSING ZIP...');
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'desk-racer-github-repo.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);

  notify('DOWNLOAD COMPLETE!');
}
