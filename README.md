# Desk Racer 3D — Android APK & 3D Web Racing Game

## Direct Android APK Download on GitHub

When this repository is pushed to GitHub, **GitHub Actions** automatically builds the Android `.apk` and publishes it to the **Releases** section on the right sidebar of your GitHub repo!

### How to Download the `.apk` on GitHub:
1. Look at the **right-hand sidebar** of your GitHub repository page under **"Releases"** -> Click **"Desk Racer 3D — Android APK"** -> Click **`Desk-Racer-3D.apk`** for a 1-click direct download!
2. **OR** go to the **"Actions"** tab at the top of your GitHub repository -> Click **"Build & Release Android APK"** -> Click **"Run workflow"** (or open the latest green run) -> Scroll down to **Artifacts** and download **`Desk-Racer-Android-APK`**.

### Note if you uploaded via ZIP:
On GitHub's web uploader ("Add file" -> "Upload files"), hidden folders starting with a dot (like `.github`) are sometimes skipped if you only drag inner files.
- If the **Actions** tab is empty, click **"Actions"** -> **"New workflow"** -> **"set up a workflow yourself"** and paste the contents of `build-apk.yml` (also saved in the root of this project as `build-apk.yml`).

---

## Local Development

```bash
npm install
npm run dev
```

## Build APK Locally

```bash
npm install
npm run build
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
```
