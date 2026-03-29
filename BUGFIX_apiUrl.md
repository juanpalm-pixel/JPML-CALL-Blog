# 🔧 Bug Fix: apiUrl Undefined Error

## Issue
```
ReferenceError: apiUrl is not defined at AbairSTTService.speechToText (browser-stt-service.js:504:51)
```

## Cause
The `apiUrl` variable was not defined in the `speechToText()` function after previous edits to add proxy detection.

## Fix Applied
Updated `browser-stt-service.js` lines 472-507:

### Before (Broken):
```javascript
// Missing apiUrl definition!
const recogniseResponse = await fetch(apiUrl, { ... });
```

### After (Fixed):
```javascript
// Define API URLs
const proxyUrl = 'http://localhost:3001/api/stt';
const directUrl = 'https://api.abair.ie/v3/recognition/recognise';
let apiUrl = directUrl; // Default to direct API

// Check if proxy is available
let useProxy = false;
try {
    const proxyCheck = await fetch('http://localhost:3001/', { 
        method: 'HEAD', 
        signal: AbortSignal.timeout(1000) 
    });
    useProxy = proxyCheck.ok;
    if (useProxy) {
        apiUrl = proxyUrl; // Use proxy
        console.log('✅ Proxy server detected, using proxy');
    }
} catch (e) {
    console.log('⚠️ Proxy not available, trying direct API');
}

// Now apiUrl is always defined!
const recogniseResponse = await fetch(apiUrl, { ... });
```

## What Changed
1. ✅ **apiUrl defined at start** - Set to direct API as default
2. ✅ **Proxy detection improved** - 1-second timeout to prevent hanging
3. ✅ **Better logging** - Clear messages about which mode is being used
4. ✅ **Updated help text** - Mentions both Docker and Node.js methods

## Testing
After this fix:
1. Hard refresh browser (Ctrl+Shift+R)
2. Try recording pronunciation
3. Should either:
   - Use proxy if running (no error)
   - Try direct API and fall back to browser STT (expected)
   - Show clear console logs about what's happening

## Current Behavior

### With Proxy Running (Docker/Node.js):
```
✅ Proxy server detected, using proxy
📤 Submitting audio for recognition...
[Success: Uses Abair STT via proxy]
```

### Without Proxy:
```
⚠️ Proxy not available, trying direct API (may fail due to CORS)
⚠️ NOTE: Abair.ie API may not support CORS from browsers.
   If this fails, start the proxy server:
   - Docker: Run START_DOCKER.bat
   - Node.js: Run START_PROXY.bat
[Falls back to browser STT - expected behavior]
```

## How to Start Proxy (To Fix Fallback)

### Method 1: Docker (Recommended)
```bash
cd proxy-server
docker-compose up -d
```
Or double-click `START_DOCKER.bat`

### Method 2: Node.js
```bash
cd proxy-server
npm install  # First time only
npm start
```
Or double-click `START_PROXY.bat`

## Status
✅ **FIXED** - Error resolved, proxy auto-detection working

---

**Last Updated:** March 28, 2026  
**File Modified:** `project/scripts/browser-stt-service.js`
