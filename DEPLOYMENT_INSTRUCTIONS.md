# Deployment Instructions

## Prerequisites
1. Firebase CLI installed: `npm install -g firebase-tools`
2. Logged into Firebase: `firebase login`
3. Node.js and npm installed

## Deployment Steps

### 1. Install Dependencies
```bash
npm install
```

**Note:** If you encounter permission errors, you may need to:
- Run with `sudo` (macOS/Linux): `sudo npm install`
- Or fix npm permissions: `npm config set prefix ~/.npm-global`

### 2. Build the Project
```bash
npm run build
```

This will create a `dist` folder with the production build.

### 3. Deploy to Firebase

#### Deploy Everything (Hosting, Firestore Rules, Storage Rules)
```bash
firebase deploy
```

#### Deploy Only Hosting
```bash
firebase deploy --only hosting
```

#### Deploy Specific Services
```bash
firebase deploy --only hosting,firestore:rules,storage:rules
```

### 4. Verify Deployment
After deployment, Firebase will provide a hosting URL. Visit it to verify the deployment.

## PDF.js Library Note

The PDF attendance import feature uses PDF.js. The code is configured to:
1. First try to use the npm package (`pdfjs-dist`) if installed
2. Fall back to CDN if the package is not available

This means the build will work even if `pdfjs-dist` is not installed, as it will load from CDN at runtime.

## Troubleshooting

### Build Fails with "pdfjs-dist" error
- Run `npm install` to install dependencies
- Or the code will automatically use CDN fallback

### Permission Errors
- Use `sudo npm install` (macOS/Linux)
- Or configure npm to use a different directory

### Firebase Deploy Fails
- Ensure you're logged in: `firebase login`
- Check Firebase project: `firebase use --add`
- Verify firebase.json configuration

## Recent Changes
- Added PDF attendance import support
- Added Attendance Rules Settings
- Added secondary sidebar to Attendance page with Report and Settings tabs




