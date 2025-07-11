# Building Lumos Highlighter

This document explains how to build and package the Lumos Highlighter Chrome extension for distribution.

## Quick Start

To create a production-ready ZIP file for Chrome Web Store:

```bash
# Using npm
npm run make-zip

# Using make
make make-zip
```

## Available Commands

### NPM Scripts
- `npm run make-zip` - Create optimized ZIP for Chrome Web Store
- `npm run build` - Build extension without creating ZIP
- `npm test` - Run tests
- `npm run test:coverage` - Run tests with coverage report

### Make Commands
- `make make-zip` - Create optimized ZIP for Chrome Web Store
- `make build` - Build extension without creating ZIP
- `make test` - Run tests
- `make clean` - Clean build directories
- `make help` - Show all available commands

## Build Process

The build process:

1. **Cleans** build and dist directories
2. **Copies** only essential files for the extension
3. **Excludes** development files (tests, node_modules, etc.)
4. **Validates** manifest.json
5. **Checks** file sizes (Chrome Web Store limit: 128MB)
6. **Creates** ZIP file in `dist/` directory

## Output

### Build Directory (`build/`)
Contains the uncompressed extension files ready for:
- Local testing in Chrome developer mode
- Manual inspection of final files

### Distribution Directory (`dist/`)
Contains the compressed ZIP file:
- `lumos-highlighter-v{version}.zip` - Ready for Chrome Web Store upload

## File Structure

The build process includes only these essential files:

```
build/
├── manifest.json              # Extension manifest
├── assets/                    # Icons and images
│   ├── icons/
│   └── images/
├── background/                # Background script
├── content/                   # Content scripts
│   ├── content.js
│   └── modules/
├── options/                   # Options pages
├── popup/                     # Extension popup
├── shared/                    # Shared utilities
└── styles/                    # CSS styles
```

## Excluded Files

The following files are automatically excluded from the build:

- Development files: `node_modules/`, `tests/`, `coverage/`
- Documentation: `README.md`, `*.md` files
- Build configuration: `package.json`, `Makefile`, `scripts/`
- Version control: `.git/`, `.gitignore`
- Temporary files: `*.log`, `*.tmp`, `.DS_Store`
- Debug files: `test_*.js`, `DEBUG_*.md`

## Testing the Build

### Local Testing
1. Build the extension:
   ```bash
   npm run build
   ```

2. Load in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `build/` directory

### Production Testing
1. Create the ZIP file:
   ```bash
   npm run make-zip
   ```

2. The ZIP file will be created in `dist/lumos-highlighter-v{version}.zip`

## Chrome Web Store Upload

1. Create the ZIP file:
   ```bash
   npm run make-zip
   ```

2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard)

3. Upload the ZIP file from `dist/lumos-highlighter-v{version}.zip`

4. Follow the Chrome Web Store review process

## Build Configuration

The build configuration is in `scripts/build.js`:

- **Include patterns**: Files and directories to include
- **Exclude patterns**: Files and directories to exclude
- **Validation rules**: Manifest.json validation
- **Size limits**: File size checking

## Troubleshooting

### Common Issues

1. **"ZIP file too large"**
   - Check if unnecessary files are included
   - Optimize images if needed
   - Review exclude patterns

2. **"Missing manifest.json"**
   - Ensure manifest.json is in the root directory
   - Check if it's valid JSON

3. **"Build script fails"**
   - Ensure Node.js is installed
   - Run `npm install` first
   - Check file permissions

### File Size Optimization

Current build size: ~0.25MB (compressed)
- Well under Chrome Web Store limit (128MB)
- Optimized for fast download and installation

## Version Management

The build script automatically:
- Reads version from `manifest.json`
- Names ZIP file with version: `lumos-highlighter-v{version}.zip`
- Validates version format

## Security Considerations

The build process:
- ✅ Excludes sensitive development files
- ✅ Validates manifest.json permissions
- ✅ Removes debug code and test files
- ✅ Creates clean, production-ready package

## Dependencies

- **Node.js** (v12 or higher)
- **zip** command (usually pre-installed on macOS/Linux)
- **npm** (comes with Node.js)

## Contributing

When modifying the build process:

1. Update `scripts/build.js` for logic changes
2. Update `package.json` for new npm scripts
3. Update `Makefile` for new make targets
4. Update this documentation
5. Test both npm and make commands