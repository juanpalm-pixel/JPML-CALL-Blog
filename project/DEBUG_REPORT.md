# Irish E-Reader Debug Report - Reading & Speaking Functionality Issues

## Executive Summary

The Irish e-reader's reading (Text-to-Speech) and speaking (Speech-to-Text) functionality is broken due to **5 critical issues** that prevent the application from initializing and running properly. This report details all issues found and provides specific line numbers and fixes.

---

## 🔴 CRITICAL ISSUES (Must Fix)

### 1. **API Key Storage Mismatch** - HIGHEST PRIORITY
**Severity:** 🔴 CRITICAL  
**Impact:** API authentication fails completely

#### Problem
The UI stores API keys with different names than the services expect to retrieve them.

| Component | Stores As | Looks For | Status |
|-----------|-----------|-----------|--------|
| ui-foundation.js (L34-35) | `ereader-tts-key`, `ereader-stt-key` | — | ✓ |
| tts-service.js (L65) | — | `google_cloud_api_key` | ✗ MISMATCH |
| stt-service.js (L62) | — | `google_cloud_api_key` | ✗ MISMATCH |

#### Files Affected
- `scripts/ui-foundation.js` - Lines 34-35
- `scripts/tts-service.js` - Line 65
- `scripts/stt-service.js` - Line 62

#### Current Code
```javascript
// ui-foundation.js (L34-35) - Saves with these keys:
localStorage.setItem('ereader-tts-key', ttsKey);
localStorage.setItem('ereader-stt-key', sttKey);

// tts-service.js (L65) - Looks for this key:
this.apiKey = localStorage.getItem('google_cloud_api_key');

// stt-service.js (L62) - Looks for this key:
this.apiKey = localStorage.getItem('google_cloud_api_key');
```

#### Why This Breaks Reading & Speaking
- User enters API keys and clicks "Save API Keys"
- Keys are saved to localStorage with keys: `ereader-tts-key`, `ereader-stt-key`
- TTS and STT services initialize and look for `google_cloud_api_key`
- Keys are never found → `this.apiKey` stays null
- All API calls fail with authentication errors → **no reading or speaking works**

#### Fix Options

**Option A: Update Services to Use UI Keys (RECOMMENDED)**
```javascript
// In tts-service.js, change line 65:
- this.apiKey = localStorage.getItem('google_cloud_api_key');
+ this.apiKey = localStorage.getItem('ereader-tts-key');

// In stt-service.js, change line 62:
- this.apiKey = localStorage.getItem('google_cloud_api_key');
+ this.apiKey = localStorage.getItem('ereader-stt-key');
```

**Option B: Update UI to Use Service Keys**
```javascript
// In ui-foundation.js, change lines 34-35:
- localStorage.setItem('ereader-tts-key', ttsKey);
- localStorage.setItem('ereader-stt-key', sttKey);
+ localStorage.setItem('google_cloud_api_key', ttsKey);
+ localStorage.setItem('google_cloud_api_key', sttKey); // Also overwrites!
```

**Recommendation:** Choose **Option A** because it keeps the UI key names clean.

---

### 2. **Missing `transcribeAudio()` Method in STT Service**
**Severity:** 🔴 CRITICAL  
**Impact:** Recording crashes when comparing pronunciation

#### Problem
`ereader.js` calls a method that doesn't exist in the STT service.

#### Files Affected
- `scripts/ereader.js` - Lines 1299 and 2299
- `scripts/stt-service.js` - No such method exists

#### Current Code - What's Being Called
```javascript
// ereader.js line 2299
const sttResult = await this.sttService.transcribeAudio(audioBlob);

// ereader.js line 1299 (similar call)
const recordingResult = await this.sttService.transcribeAudio(recordingBlob);
```

#### What Actually Exists in STT Service
```javascript
// stt-service.js line 180 - This method DOES exist:
async speechToText(audioBlob) {
    // ... implementation
}

// stt-service.js - transcribeAudio() does NOT exist
```

#### Why This Breaks Speaking
1. User records pronunciation
2. Code tries to call `this.sttService.transcribeAudio(audioBlob)`
3. Method doesn't exist → JavaScript throws error: **"TypeError: this.sttService.transcribeAudio is not a function"**
4. **Recording feature completely broken**

#### Fix
Change the method calls in `ereader.js`:

```javascript
// Line 1299 - Change from:
const recordingResult = await this.sttService.transcribeAudio(recordingBlob);
// To:
const recordingResult = await this.sttService.speechToText(recordingBlob);

// Line 2299 - Change from:
const sttResult = await this.sttService.transcribeAudio(audioBlob);
// To:
const sttResult = await this.sttService.speechToText(audioBlob);
```

**Also check:** Search for all occurrences of `transcribeAudio` in ereader.js and replace them.

---

### 3. **Missing `comparePronunciation()` Method in STT Service**
**Severity:** 🔴 CRITICAL  
**Impact:** Pronunciation analysis crashes

#### Problem
`ereader.js` calls a method that doesn't exist in the STT service.

#### Files Affected
- `scripts/ereader.js` - Line 1304
- `scripts/stt-service.js` - No such method exists

#### Current Code - What's Being Called
```javascript
// ereader.js line 1304
const pronunciationComparison = await this.sttService.comparePronunciation(
    targetWords, 
    enhancedResults
);
```

#### What Actually Exists
```javascript
// stt-service.js line 300+ - This method DOES exist:
async identifyPronunciationIssues(targetText, recognitionResult) {
    // ... implementation
}

// stt-service.js - comparePronunciation() does NOT exist
```

#### Why This Breaks Speaking
1. User records pronunciation to get feedback
2. Code tries to call `this.sttService.comparePronunciation(targetWords, enhancedResults)`
3. Method doesn't exist → JavaScript throws error
4. **Pronunciation comparison/feedback broken**

#### Fix - Option A: Rename Method Calls
Change the method calls in `ereader.js` to use the existing method:

```javascript
// Line 1304 - Change from:
const pronunciationComparison = await this.sttService.comparePronunciation(
    targetWords, 
    enhancedResults
);

// To:
const pronunciationComparison = await this.sttService.identifyPronunciationIssues(
    targetText,  // Need targetText instead of targetWords
    enhancedResults
);
```

#### Fix - Option B: Implement the Missing Method
Add to `stt-service.js`:

```javascript
async comparePronunciation(targetWords, recognitionResult) {
    // Implement pronunciation comparison logic
    return {
        accuracy: this.calculateAccuracy(targetWords, recognitionResult),
        issues: this.identifyIssues(targetWords, recognitionResult),
        confidence: recognitionResult.confidence
    };
}
```

**Recommendation:** First try Option A (rename to existing method), then Option B if needed.

---

### 4. **Missing `setupUI()` Method Call**
**Severity:** 🔴 CRITICAL  
**Impact:** Application fails to initialize

#### Problem
`ereader.js` calls a method that doesn't exist anywhere in the codebase.

#### Files Affected
- `scripts/ereader.js` - Line 108

#### Current Code
```javascript
// ereader.js line 107-108
this.setupEventListeners();
this.setupUI();  // ← This method doesn't exist!
```

#### Available Methods
The `setupUI()` method is not defined in `ereader.js` class. Only `setupEventListeners()` exists.

#### Why This Breaks Everything
1. Initialization runs `this.init()`
2. Calls `this.setupEventListeners()` - OK
3. Calls `this.setupUI()` - **Method doesn't exist**
4. JavaScript throws error: **"TypeError: this.setupUI is not a function"**
5. **Entire application initialization fails**

#### Fix
Either remove the call or create the method:

**Option A: Remove the Call (SIMPLE)**
```javascript
// Line 107-108 - Change from:
this.setupEventListeners();
this.setupUI();

// To:
this.setupEventListeners();
```

**Option B: Create the Method**
```javascript
setupUI() {
    // Populate UI elements, bind handlers, etc.
    console.log('Setting up UI...');
    this.updateSessionStats();
    this.setupPracticeOptionsUI();
    // ... other UI initialization
}
```

**Recommendation:** Choose **Option A** (remove the call) unless you identify specific UI setup that's needed.

---

### 5. **Duplicate Script Inclusion**
**Severity:** 🟡 MEDIUM (Not blocking, but wasteful)  
**Impact:** google-cloud-test.js loads twice

#### Problem
The same script file is included twice in the HTML.

#### Files Affected
- `index.html` - Lines 382 and 385

#### Current Code
```html
<!-- Line 382 -->
<script src="scripts/google-cloud-test.js"></script>

<!-- Line 384 (duplicate comment) -->
<!-- Include test script for development -->

<!-- Line 385 (duplicate) -->
<script src="scripts/google-cloud-test.js"></script>
```

#### Fix
Remove one of the duplicate lines:

```html
<!-- Line 382 -->
<script src="scripts/google-cloud-test.js"></script>

<!-- Remove lines 384-385 completely -->
```

---

## 🟡 MEDIUM ISSUES (Should Fix)

### 6. **No Error Recovery in TTS Service Initialization**
**File:** `scripts/tts-service.js`, Lines 46-58

```javascript
async init() {
    console.log('Initializing Google Cloud TTS Service...');
    try {
        await this.loadApiKey();
        await this.loadCacheFromStorage();
        if (this.apiKey) {
            await this.loadAvailableVoices();
        }
        console.log('TTS Service initialized successfully');
    } catch (error) {
        console.error('Failed to initialize TTS Service:', error);
        // ← No recovery or status flag
    }
}
```

**Issue:** If API key loading fails, the service silently continues with `apiKey = null`, causing cryptic errors later.

**Fix:** Add status tracking:
```javascript
async init() {
    console.log('Initializing Google Cloud TTS Service...');
    try {
        await this.loadApiKey();
        await this.loadCacheFromStorage();
        if (this.apiKey) {
            await this.loadAvailableVoices();
        }
        console.log('TTS Service initialized successfully');
        this.initialized = true;  // ← Add this
    } catch (error) {
        console.error('Failed to initialize TTS Service:', error);
        this.initialized = false;  // ← Add this
        this.initError = error.message;  // ← Add this
    }
}
```

### 7. **No Error Recovery in STT Service Initialization**
**File:** `scripts/stt-service.js`, Lines 47-55

Same issue as TTS Service. Apply same fix.

### 8. **Voice Configuration Inconsistency**
**File:** `scripts/tts-service.js`, Lines 13-14 and 220-224

The voice name might not exist:
```javascript
// Line 14
name: 'ga-IE-Wavenet-A',  // ← This may not exist for Irish

// But fallback exists:
name: 'ga-IE-Standard-A',  // ← This one does exist
```

**Fix:** Use the voice that's guaranteed to exist:
```javascript
this.voiceConfig = {
    languageCode: 'ga-IE',
    name: 'ga-IE-Standard-A',  // Use Standard instead of Wavenet
    ssmlGender: 'NEUTRAL'
};
```

### 9. **Placeholder Functions in ui-foundation.js**
**File:** `scripts/ui-foundation.js`, Lines 278-314

Several functions don't do anything:
```javascript
function playAllSentences(sentences) {
    console.log('Playing all sentences:', sentences);
    // Will be implemented with TTS service ← Not actually implemented!
}

function playSelectedSentence() {
    const activeSentence = document.querySelector('.sentence.active');
    if (activeSentence) {
        console.log('Playing sentence:', activeSentence.textContent);
        // Will be implemented with TTS service ← Not actually implemented!
    }
}
```

**Fix:** Either implement these functions or ensure they're not called in favor of the `ereader.js` handlers.

---

## 📋 Quick Fix Checklist

- [ ] **CRITICAL #1:** Fix API key storage mismatch (ui-foundation.js L34-35 OR tts-service.js L65 & stt-service.js L62)
- [ ] **CRITICAL #2:** Fix `transcribeAudio()` calls in ereader.js (Lines 1299, 2299) → change to `speechToText()`
- [ ] **CRITICAL #3:** Fix `comparePronunciation()` call in ereader.js (Line 1304) → use existing method or implement
- [ ] **CRITICAL #4:** Remove or implement `setupUI()` in ereader.js (Line 108)
- [ ] **CRITICAL #5:** Remove duplicate script in index.html (Line 385)
- [ ] **MEDIUM #6:** Add error handling flags to tts-service.js init
- [ ] **MEDIUM #7:** Add error handling flags to stt-service.js init
- [ ] **MEDIUM #8:** Change voice name from Wavenet-A to Standard-A in tts-service.js

---

## 🧪 How to Test

### Testing Tool
A diagnostic tool has been created at: `/project/debug-diagnostic.html`

To use it:
1. Open in browser: `http://localhost:8000/project/debug-diagnostic.html`
2. Check the "Known Issues & Fixes" section
3. Enter your Google Cloud API keys in the "API Key Configuration" section
4. Click "Test API Keys"
5. Try "Test TTS" and "Test Microphone" buttons
6. Download the diagnostic report if needed

### Manual Testing
1. Open main page: `http://localhost:8000/project/index.html`
2. Open Browser DevTools (F12)
3. Go to Console tab
4. Look for errors
5. Try entering text and clicking "Start Reading"
6. Try recording with "Start Recording"

---

## 📚 Reference Information

### Files That Need Changes
1. `scripts/ui-foundation.js` - API key storage
2. `scripts/ereader.js` - Method calls and initialization
3. `scripts/tts-service.js` - API key retrieval and voice config
4. `scripts/stt-service.js` - API key retrieval and error handling
5. `index.html` - Remove duplicate script

### Google Cloud API Configuration
- **TTS API URL:** `https://texttospeech.googleapis.com/v1/text:synthesize`
- **STT API URL:** `https://speech.googleapis.com/v1/speech:recognize`
- **Language:** `ga-IE` (Irish - Ireland) ✓ Correct
- **TTS Voice:** `ga-IE-Standard-A` ✓ Correct (not Wavenet-A)
- **STT Encoding:** `WEBM_OPUS` ✓ Correct
- **STT Model:** `latest_long` ✓ Good for Irish

### Browser Requirements
- Web Audio API support
- getUserMedia API for microphone (for recording)
- Fetch API for network requests
- localStorage for storing API keys

---

## 💡 Prevention Tips for Future Development

1. **Consistent Key Naming:** Use same localStorage key names across all components
2. **Method Existence Checks:** Verify all called methods exist before using them
3. **Testing Before Integration:** Test each service independently before integrating
4. **Error Handling:** Always add try-catch and proper error reporting
5. **Code Review:** Have another person review critical paths like initialization

---

**Report Generated:** 2024  
**Status:** 5 Critical Issues, 4 Medium Issues Found  
**Estimated Fix Time:** 30 minutes for all critical fixes
