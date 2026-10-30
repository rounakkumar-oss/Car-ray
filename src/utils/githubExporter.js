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

const PUBLIC_ICON_FILES = [
  'icon.svg',
  'pwa-192x192.png',
  'pwa-512x512.png',
  'pwa-maskable-512x512.png',
  'apple-touch-icon.png',
];

const CAPACITOR_CONFIG_JSON = JSON.stringify(
  {
    appId: 'com.deskracer.game',
    appName: 'Desk Racer 3D',
    webDir: 'dist',
    bundledWebRuntime: false,
    server: {
      androidScheme: 'https',
    },
  },
  null,
  2
);

const GITHUB_WORKFLOW_APK_YML = `name: Build Android APK

on:
  push:
    branches: [ main, master ]
  workflow_dispatch:

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

      - name: Upload Ready-to-Install Android APK
        uses: actions/upload-artifact@v4
        with:
          name: Desk-Racer-Android-APK
          path: android/app/build/outputs/apk/debug/app-debug.apk
`;

const README_CONTENT = `# Desk Racer 3D — Android APK & Web Racing Game

A 3D miniature desk coaster time-trial racing game built with **Three.js**, **Rapier3D Physics**, **PWA**, and **Capacitor Android APK** support.

## Method 1: Automatic Android APK Build on GitHub (No Android Studio Needed!)

This package includes a pre-configured GitHub Actions workflow (\`.github/workflows/build-apk.yml\`) that automatically compiles the Android \`.apk\` file in the cloud!

1. Upload/Push all files from this ZIP to a new GitHub repository.
2. Open your repository on GitHub and click the **Actions** tab at the top.
3. Click on the **Build Android APK** workflow run.
4. Once it finishes (takes ~2 minutes), scroll down to **Artifacts** and click **Desk-Racer-Android-APK** to download your ready-to-install \`app-debug.apk\`!

## Method 2: Build Android APK Locally

\`\`\`bash
npm install
npm run build
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
\`\`\`
Your APK will be generated at: \`android/app/build/outputs/apk/debug/app-debug.apk\`.

## Method 3: Run Local Web Development Server

\`\`\`bash
npm install
npm run dev
\`\`\`
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

  // 2. Add Capacitor Android configuration & GitHub Actions automated APK builder workflow
  zip.file('capacitor.config.json', CAPACITOR_CONFIG_JSON);
  zip.file('.github/workflows/build-apk.yml', GITHUB_WORKFLOW_APK_YML);
  zip.file('README.md', README_CONTENT);

  // 3. Fetch and bundle JSON data files into public/assets/data/
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

  // 5. Fetch and bundle PWA/Android app icons
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
