import JSZip from 'jszip';

const SOURCE_FILES = import.meta.glob(
  [
    '/.env.example',
    '/.gitignore',
    '/.github/workflows/build-apk.yml',
    '/capacitor.config.json',
    '/README.md',
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

const PUBLIC_ICON_FILES = [
  'icon.svg',
  'pwa-192x192.png',
  'pwa-512x512.png',
  'pwa-maskable-512x512.png',
  'apple-touch-icon.png',
];

export const APK_WORKFLOW_YAML = `name: Build & Release Android APK

on:
  push:
    branches: [ "*" ]
  workflow_dispatch:

permissions:
  contents: write

jobs:
  build-apk:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Setup Java JDK 21 for Android Gradle
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '21'

      - name: Install dependencies & Build Web Game
        run: |
          npm install
          npm run build

      - name: Add Capacitor Android & Sync
        run: |
          npm install @capacitor/core @capacitor/cli @capacitor/android
          npx cap add android || true
          npx cap sync android

      - name: Build Debug APK with Gradle
        working-directory: ./android
        run: |
          chmod +x gradlew
          ./gradlew assembleDebug
          cp app/build/outputs/apk/debug/app-debug.apk ../Desk-Racer-3D.apk

      - name: Upload APK to Actions Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: Desk-Racer-Android-APK
          path: Desk-Racer-3D.apk

      - name: Create Direct Download GitHub Release with APK
        uses: softprops/action-gh-release@v2
        with:
          tag_name: v1.0.\${{ github.run_number }}
          name: "Desk Racer 3D — Android APK (Build #\${{ github.run_number }})"
          body: |
            ### Direct Android APK Download
            Click **Desk-Racer-3D.apk** below under **Assets** to download and install the game directly on your Android phone!
          files: Desk-Racer-3D.apk
          prerelease: false
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
`;

export async function downloadProjectForGitHub(onStatusUpdate) {
  const notify = (msg) => {
    if (typeof onStatusUpdate === 'function') {
      onStatusUpdate(msg);
    }
  };

  notify('PACKAGING APK & CODE...');
  const zip = new JSZip();

  // 1. Add all source files captured via Vite's import.meta.glob
  for (const [rawPath, content] of Object.entries(SOURCE_FILES)) {
    const cleanPath = rawPath.replace(/^\//, '');
    if (typeof content === 'string') {
      zip.file(cleanPath, content);
    }
  }

  // Also ensure workflow is present both in .github/workflows/build-apk.yml AND visible build-apk.yml
  zip.file('.github/workflows/build-apk.yml', APK_WORKFLOW_YAML);
  zip.file('build-apk.yml', APK_WORKFLOW_YAML);

  // 2. Fetch and bundle JSON data files into public/assets/data/
  notify('BUNDLING GAME ASSETS...');
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

  // 3. Fetch and bundle WAV audio loops into public/assets/audio/
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

  // 4. Fetch and bundle PWA/Android app icons
  await Promise.all(
    PUBLIC_ICON_FILES.map(async (relPath) => {
      try {
        const res = await fetch(`/${relPath}`);
        if (res.ok) {
          const buf = await res.arrayBuffer();
          zip.file(`public/${relPath}`, buf);
        }
      } catch (_err) {
        // Ignore icon fetch warnings
      }
    })
  );

  notify('GENERATING PACKAGE...');
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Desk-Racer-Android-APK-Project.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);

  notify('DOWNLOADED!');
}
