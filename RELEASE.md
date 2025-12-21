# Release Guide

This guide explains how to create and publish a Windows portable build release.

## Prerequisites

- Windows machine (or Linux/Mac with Wine installed for cross-platform building)
- Node.js and npm installed
- Git installed
- Repository cloned and dependencies installed

## Building the Portable Executable

### On Windows

1. **Ensure all dependencies are installed:**
   ```bash
   npm install
   ```

2. **Build the portable executable:**
   ```bash
   npm run build
   ```

3. **The output will be located at:**
   ```
   dist/osu-autoref-{version}-portable.exe
   ```

### On Linux/macOS (requires Wine)

1. **Install Wine** (if not already installed):
   - Linux: `sudo apt-get install wine64` (Ubuntu/Debian) or equivalent
   - macOS: `brew install wine-stable`

2. **Build the portable executable:**
   ```bash
   npm run build
   ```

## Creating a GitHub Release

1. **Tag the release:**
   ```bash
   git tag -a v0.2.0 -m "Release version 0.2.0"
   git push origin v0.2.0
   ```

2. **Go to GitHub Releases:**
   - Navigate to https://github.com/heipizhu4/osu-qualifiers-autoref/releases
   - Click "Draft a new release"

3. **Fill in the release details:**
   - **Tag version:** Select your tag (e.g., v0.2.0)
   - **Release title:** e.g., "v0.2.0 - Windows Portable Build"
   - **Description:** Include:
     - What's new in this release
     - Installation instructions for the portable build
     - Link to setup documentation

4. **Upload the portable executable:**
   - Drag and drop `dist/osu-autoref-{version}-portable.exe` to the release assets

5. **Publish the release**

## Release Checklist

- [ ] Code is tested and working
- [ ] Version number updated in `package.json`
- [ ] CHANGELOG updated (if exists)
- [ ] README.md is up to date
- [ ] Build created successfully
- [ ] Portable executable tested on Windows
- [ ] Git tag created
- [ ] GitHub release created
- [ ] Portable executable uploaded to release
- [ ] Release notes written and published

## Example Release Notes Template

```markdown
## osu!autoref v0.2.0 - Windows Portable Build

### New Features
- Windows portable build - no Node.js installation required!
- Simply download, configure, and double-click to run

### Installation (Portable Version)

1. Download `osu-autoref-0.2.0-portable.exe` below
2. Place it in a new folder
3. Run the executable once to create necessary files
4. Edit `config.json` with your credentials
5. Configure `pool.json` and `match.json` for your tournament
6. Double-click the executable to start!

### For Developers

If you prefer to run from source:
```bash
npm install
npm start
```

### Full Changelog
- Added electron-builder for portable builds
- Updated documentation with portable build instructions
- Improved user accessibility for non-technical users

**Download:** See assets below
```

## Testing the Release

Before publishing, test the portable executable:

1. Copy the .exe to a clean folder (without node_modules)
2. Run the executable
3. Verify it creates the necessary folder structure
4. Test with valid config.json to ensure it runs properly
5. Check that the UI loads correctly
6. Verify core functionality works

## Troubleshooting

### Build fails on Linux
- Ensure Wine is installed: `wine --version`
- If build still fails, build on Windows natively

### Executable won't run
- Ensure Windows Defender/antivirus isn't blocking it
- Check that all required files are included in the build
- Verify the electron-builder configuration in package.json

### Large file size
- This is normal for Electron apps as they bundle Node.js and Chromium
- Typical size: 150-200 MB

## Automated Builds (Future Enhancement)

Consider setting up GitHub Actions to automatically build on:
- Git tag push
- Manual workflow dispatch

This would eliminate the need for local builds and ensure consistent build environment.
