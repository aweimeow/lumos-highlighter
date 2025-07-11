#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const PROJECT_ROOT = path.join(__dirname, '..');
const BUILD_DIR = path.join(PROJECT_ROOT, 'build');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');

// Files and directories that should be included in the extension
const INCLUDE_FILES = [
    'manifest.json',
    'assets/',
    'background/',
    'content/',
    'options/',
    'popup/',
    'shared/',
    'styles/'
];

// Files and directories that should be excluded
const EXCLUDE_PATTERNS = [
    // Development files
    'node_modules/',
    'coverage/',
    'tests/',
    'scripts/',
    
    // Documentation files
    'README.md',
    'DESIGN.md',
    'PRIVACY_POLICY.md',
    'DEBUG_TOOLBAR_ISSUE.md',
    
    // Build files
    'package.json',
    'package-lock.json',
    'Makefile',
    '.git/',
    '.gitignore',
    'build/',
    'dist/',
    
    // Test files
    'test_extension.js',
    'test_toolbar.js',
    '*.test.js',
    
    // Module files that are not used
    'content/modules/debugToggle.js',
    
    // Temporary files
    '*.tmp',
    '*.log',
    '.DS_Store',
    'Thumbs.db'
];

console.log('🏗️  Building Lumos Highlighter Extension...');

// Clean build directory
function cleanBuildDir() {
    console.log('🧹 Cleaning build directory...');
    if (fs.existsSync(BUILD_DIR)) {
        fs.rmSync(BUILD_DIR, { recursive: true, force: true });
    }
    if (fs.existsSync(DIST_DIR)) {
        fs.rmSync(DIST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(BUILD_DIR, { recursive: true });
    fs.mkdirSync(DIST_DIR, { recursive: true });
}

// Copy files recursively
function copyFiles(src, dest, basePath = '') {
    const items = fs.readdirSync(src);
    
    for (const item of items) {
        const srcPath = path.join(src, item);
        const destPath = path.join(dest, item);
        const relativePath = path.join(basePath, item);
        
        // Check if this item should be excluded
        const shouldExclude = EXCLUDE_PATTERNS.some(pattern => {
            if (pattern.endsWith('/')) {
                return relativePath.startsWith(pattern) || relativePath === pattern.slice(0, -1);
            }
            return relativePath === pattern || relativePath.includes(pattern);
        });
        
        if (shouldExclude) {
            console.log(`  ⏭️  Skipping: ${relativePath}`);
            continue;
        }
        
        const stat = fs.statSync(srcPath);
        
        if (stat.isDirectory()) {
            fs.mkdirSync(destPath, { recursive: true });
            copyFiles(srcPath, destPath, relativePath);
        } else {
            fs.copyFileSync(srcPath, destPath);
            console.log(`  ✅ Copied: ${relativePath}`);
        }
    }
}

// Copy only included files
function copyIncludedFiles() {
    console.log('📁 Copying extension files...');
    
    for (const includePattern of INCLUDE_FILES) {
        const srcPath = path.join(PROJECT_ROOT, includePattern);
        
        if (!fs.existsSync(srcPath)) {
            console.log(`  ⚠️  Warning: ${includePattern} not found, skipping...`);
            continue;
        }
        
        const stat = fs.statSync(srcPath);
        
        if (stat.isDirectory()) {
            const destPath = path.join(BUILD_DIR, includePattern);
            fs.mkdirSync(destPath, { recursive: true });
            copyFiles(srcPath, destPath, includePattern);
        } else {
            const destPath = path.join(BUILD_DIR, includePattern);
            fs.copyFileSync(srcPath, destPath);
            console.log(`  ✅ Copied: ${includePattern}`);
        }
    }
}

// Validate manifest.json
function validateManifest() {
    console.log('🔍 Validating manifest.json...');
    
    const manifestPath = path.join(BUILD_DIR, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
        throw new Error('manifest.json not found in build directory');
    }
    
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // Check required fields
    const requiredFields = ['name', 'version', 'manifest_version'];
    for (const field of requiredFields) {
        if (!manifest[field]) {
            throw new Error(`Missing required field in manifest.json: ${field}`);
        }
    }
    
    console.log(`  ✅ Manifest version: ${manifest.version}`);
    console.log(`  ✅ Extension name: ${manifest.name}`);
    return manifest;
}

// Check file sizes
function checkFileSizes() {
    console.log('📊 Checking file sizes...');
    
    const getTotalSize = (dir) => {
        let totalSize = 0;
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const itemPath = path.join(dir, item);
            const stat = fs.statSync(itemPath);
            
            if (stat.isDirectory()) {
                totalSize += getTotalSize(itemPath);
            } else {
                totalSize += stat.size;
            }
        }
        
        return totalSize;
    };
    
    const totalSize = getTotalSize(BUILD_DIR);
    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    
    console.log(`  📦 Total size: ${totalSizeMB} MB`);
    
    // Chrome Web Store has a limit of 128 MB
    if (totalSize > 128 * 1024 * 1024) {
        console.warn('  ⚠️  Warning: Extension size exceeds 128MB limit');
    }
    
    return totalSize;
}

// Create ZIP file
function createZip(manifest) {
    console.log('📦 Creating ZIP file...');
    
    const zipName = `lumos-highlighter-v${manifest.version}.zip`;
    const zipPath = path.join(DIST_DIR, zipName);
    
    try {
        // Use system zip command
        const command = `cd "${BUILD_DIR}" && zip -r "${zipPath}" . -x "*.DS_Store" "*.log" "*.tmp"`;
        execSync(command, { stdio: 'inherit' });
        
        const zipStat = fs.statSync(zipPath);
        const zipSizeMB = (zipStat.size / (1024 * 1024)).toFixed(2);
        
        console.log(`  ✅ ZIP created: ${zipName}`);
        console.log(`  📦 ZIP size: ${zipSizeMB} MB`);
        
        return zipPath;
    } catch (error) {
        console.error('❌ Error creating ZIP:', error.message);
        throw error;
    }
}

// Main build function
function build() {
    try {
        cleanBuildDir();
        copyIncludedFiles();
        const manifest = validateManifest();
        checkFileSizes();
        const zipPath = createZip(manifest);
        
        console.log('\n🎉 Build completed successfully!');
        console.log(`📦 Extension package: ${path.relative(PROJECT_ROOT, zipPath)}`);
        console.log('\n📋 Next steps:');
        console.log('1. Test the extension by loading the build/ directory in Chrome');
        console.log('2. Upload the ZIP file to Chrome Web Store');
        console.log('3. Follow Chrome Web Store review process');
        
        return zipPath;
    } catch (error) {
        console.error('\n❌ Build failed:', error.message);
        process.exit(1);
    }
}

// Run build if this script is executed directly
if (require.main === module) {
    build();
}

module.exports = { build };