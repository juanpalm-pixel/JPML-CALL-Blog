/**
 * Debug Test Script for Irish E-Reader
 * Tests TTS/STT functionality and checks for common issues
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(80));
console.log('IRISH E-READER DEBUG TEST');
console.log('='.repeat(80));

// Test 1: Check if all necessary files exist
console.log('\n[TEST 1] Checking Project Files...');
const requiredFiles = [
    'index.html',
    'scripts/tts-service.js',
    'scripts/stt-service.js',
    'scripts/audio-processor.js',
    'scripts/error-manager.js',
    'scripts/ui-foundation.js',
    'scripts/ereader.js',
    'scripts/ui-animations.js',
    'styles/ereader.css'
];

const projectDir = __dirname;
let allFilesExist = true;

requiredFiles.forEach(file => {
    const filePath = path.join(projectDir, file);
    const exists = fs.existsSync(filePath);
    const status = exists ? '✓' : '✗';
    console.log(`  ${status} ${file} - ${exists ? 'Found' : 'MISSING'}`);
    if (!exists) allFilesExist = false;
});

if (!allFilesExist) {
    console.log('\n⚠️  WARNING: Some required files are missing!');
} else {
    console.log('\n✓ All required files found!');
}

// Test 2: Check script file sizes and basic syntax
console.log('\n[TEST 2] Checking Script Files...');
const scriptFiles = [
    'scripts/tts-service.js',
    'scripts/stt-service.js',
    'scripts/ereader.js'
];

scriptFiles.forEach(file => {
    const filePath = path.join(projectDir, file);
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const size = fs.statSync(filePath).size;
        
        // Check for common issues
        const hasClassDefinition = content.includes('class ');
        const hasConstructor = content.includes('constructor()');
        const hasInit = content.includes('init()');
        
        console.log(`\n  ${file} (${Math.round(size / 1024)}KB)`);
        console.log(`    ✓ Class definition: ${hasClassDefinition}`);
        console.log(`    ✓ Constructor: ${hasConstructor}`);
        console.log(`    ✓ Init method: ${hasInit}`);
        
        // Check for syntax errors (basic)
        try {
            // Try to validate JSON if it looks like it might have it
            if (file.includes('tts') || file.includes('stt')) {
                const apiUrlMatches = content.match(/baseUrl\s*=\s*['"]([^'"]+)['"]/);
                if (apiUrlMatches) {
                    console.log(`    ✓ API URL found: ${apiUrlMatches[1]}`);
                }
            }
        } catch (e) {
            console.log(`    ✗ Error analyzing: ${e.message}`);
        }
    }
});

// Test 3: Check HTML structure
console.log('\n[TEST 3] Checking HTML Structure...');
const htmlPath = path.join(projectDir, 'index.html');
if (fs.existsSync(htmlPath)) {
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    const hasApiConfig = htmlContent.includes('tts-api-key') && htmlContent.includes('stt-api-key');
    const hasTextInput = htmlContent.includes('irish-text-input');
    const hasStartButton = htmlContent.includes('start-reading-btn');
    const hasRecordButton = htmlContent.includes('record-btn');
    
    console.log(`  ✓ API Configuration section: ${hasApiConfig}`);
    console.log(`  ✓ Text input field: ${hasTextInput}`);
    console.log(`  ✓ Start reading button: ${hasStartButton}`);
    console.log(`  ✓ Record button: ${hasRecordButton}`);
    
    // Check if scripts are loaded
    const scriptLoads = htmlContent.match(/<script\s+src=['"]/g) || [];
    console.log(`  ✓ Script includes: ${scriptLoads.length} found`);
    
    // Check for async/defer issues
    const deferredScripts = htmlContent.match(/<script\s+.*?defer/g) || [];
    if (deferredScripts.length > 0) {
        console.log(`    ⚠️  ${deferredScripts.length} scripts have 'defer' attribute`);
    }
}

// Test 4: Summary and recommendations
console.log('\n' + '='.repeat(80));
console.log('DEBUG TEST SUMMARY');
console.log('='.repeat(80));

console.log(`
NEXT STEPS:

1. Open the application in a browser:
   - URL: http://localhost:8000/project/index.html
   
2. Open Browser DevTools (F12) and check:
   - Console tab for JavaScript errors
   - Network tab for failed API calls
   - Application tab for stored API keys
   
3. Test the application:
   - Check if API configuration section loads
   - Try entering Google Cloud API keys
   - Test text input and "Start Reading" button
   - Check if TTS audio plays
   - Try recording for STT
   
4. Common issues to check:
   - Are API keys properly configured?
   - Is the Irish language (ga-IE) specified correctly?
   - Are there CORS errors for API calls?
   - Is the Web Audio API supported?
   - Is microphone permission granted?
   
5. If there are console errors:
   - Check that all script files are loading (Network tab)
   - Verify API endpoints are correct
   - Check for missing dependencies
   - Verify localStorage availability
`);

console.log('='.repeat(80));
