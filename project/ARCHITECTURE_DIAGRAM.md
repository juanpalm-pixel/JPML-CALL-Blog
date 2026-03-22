# Irish E-Reader Architecture & Data Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Browser Application                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           index.html (Main UI)                           │   │
│  │  - API Key inputs                                        │   │
│  │  - Text input area                                       │   │
│  │  - Control buttons (Start Reading, Record, etc)          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                            ↓                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │       IrishEReader Class (scripts/ereader.js)            │   │
│  │  Main orchestrator for all functionality                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│           ↙                          ↓                    ↘       │
│          /                                                 \      │
│    TTS Service              STT Service          AudioProcessor  │
│    (scripts/tts-             (scripts/stt-         (scripts/     │
│     service.js)              service.js)            audio-       │
│                                                      processor.js)│
│         ↓                       ↓                         ↓       │
│  ┌──────────┐           ┌──────────┐            ┌──────────┐    │
│  │ localStorage.getItem  │ localStorage.getItem  │ Web      │    │
│  │ 'google_cloud_api_key'│ 'google_cloud_api_key'│ Audio    │    │
│  │ ❌ MISMATCH!         │ ❌ MISMATCH!          │ API      │    │
│  │                      │                        │ ✓ OK     │    │
│  │ (UI saves:           │ (UI saves:             │          │    │
│  │  'ereader-tts-key')  │  'ereader-stt-key')    │          │    │
│  └──────────┘           └──────────┘            └──────────┘    │
│       ↓                       ↓                         ↓        │
│  Google Cloud API         Google Cloud API       Microphone     │
│  Text-to-Speech           Speech-to-Text         (getUserMedia) │
│  (FAILS: no key)          (FAILS: no key)        (OK)           │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
        ↓                       ↓
    ❌ NO AUDIO              ❌ NO RECORDING
```

---

## Data Flow Diagrams

### Text-to-Speech (Reading) Flow - BROKEN

```
User Input:
┌─────────────────────┐
│ Enter Irish Text    │
│ Click "Start Reading"
└──────────┬──────────┘
           ↓
┌──────────────────────────────────┐
│ IrishEReader.startReading()       │
│ - Extract text from textarea      │
│ - Split into sentences            │
│ - Loop through sentences          │
└──────────┬───────────────────────┘
           ↓
┌──────────────────────────────────┐
│ TTSService.synthesize()           │
│ Creates API request:              │
│ {                                 │
│   text: "Dia duit",               │
│   languageCode: "ga-IE",          │
│   voice: "ga-IE-Standard-A",      │
│   apiKey: ??? (undefined!)        │  ❌ BROKEN
│ }                                 │
└──────────┬───────────────────────┘
           ↓
┌──────────────────────────────────┐
│ Google Cloud API Call             │
│ POST texttospeech.googleapis.com  │
│                                   │
│ Response:                         │
│ 403 Unauthorized                  │  ❌ NO API KEY
│ "Invalid API key"                 │
└──────────────────────────────────┘
           ↓
           ❌ NO AUDIO PLAYS
```

**Root Cause:** API key lookup failure
```
Line 65 in tts-service.js:
  this.apiKey = localStorage.getItem('google_cloud_api_key');
  
But UI saved it as (ui-foundation.js L34):
  localStorage.setItem('ereader-tts-key', ttsKey);
  
Result: apiKey = null
```

---

### Speech-to-Text (Speaking/Recording) Flow - BROKEN

```
User Action:
┌─────────────────────┐
│ Click "Start Recording"
│ Speak Irish text    │
│ Click "Stop Recording"
└──────────┬──────────┘
           ↓
┌──────────────────────────────────┐
│ IrishEReader.startRecording()     │
│ - Request microphone permission   │
│ - Record audio                    │
│ - Get audio blob                  │
└──────────┬───────────────────────┘
           ↓
┌──────────────────────────────────┐
│ IrishEReader.processRecording()   │
│ Line 2299:                        │
│ transcribeAudio(audioBlob)  ❌    │
│ - Method doesn't exist            │
│                                   │
│ Result: TypeError thrown          │
└──────────┬───────────────────────┘
           ↓
     ❌ CRASH - NO COMPARISON

Even if #1 is fixed:
┌──────────────────────────────────┐
│ STTService.speechToText()         │
│ (correct method exists)           │
│ Creates API request:              │
│ {                                 │
│   audioContent: <blob>,           │
│   languageCode: "ga-IE",          │
│   apiKey: ??? (undefined!)        │  ❌ BROKEN
│ }                                 │
└──────────┬───────────────────────┘
           ↓
┌──────────────────────────────────┐
│ Google Cloud API Call             │
│ POST speech.googleapis.com        │
│                                   │
│ Response:                         │
│ 403 Unauthorized                  │  ❌ NO API KEY
│ "Invalid API key"                 │
└──────────┬───────────────────────┘
           ↓
┌──────────────────────────────────┐
│ Line 1304:                        │
│ comparePronunciation() ❌         │
│ - Method doesn't exist            │
│                                   │
│ Result: TypeError thrown          │
└──────────┬───────────────────────┘
           ↓
❌ NO FEEDBACK, NO COMPARISON
```

**Root Causes:**
1. Same API key issue as TTS
2. Wrong method name: `transcribeAudio()` doesn't exist (line 2299)
3. Wrong method name: `comparePronunciation()` doesn't exist (line 1304)

---

### Initialization Flow - BROKEN

```
Page Loads:
└─ index.html loaded
   └─ All scripts loaded in order
   
   1. site.js
   2. ui-foundation.js
   3. tts-service.js
   4. stt-service.js
   5. audio-processor.js
   6. error-manager.js
   7. ui-animations.js
   8. ereader.js  ← Main app starts here
   └─ google-cloud-test.js (duplicate!)

   ↓
   IrishEReader constructor() called
   └─ this.init()
      ├─ Creates services:
      │  ├─ this.ttsService = new TTSService()
      │  │  └─ init() → loadApiKey() 
      │  │     └─ this.apiKey = localStorage.getItem('google_cloud_api_key')
      │  │        └─ Returns NULL ❌
      │  │        └─ TTS service unusable
      │  │
      │  ├─ this.sttService = new STTService()
      │  │  └─ init() → loadApiKey()
      │  │     └─ this.apiKey = localStorage.getItem('google_cloud_api_key')
      │  │        └─ Returns NULL ❌
      │  │        └─ STT service unusable
      │  │
      │  ├─ this.audioProcessor = new AudioProcessor()
      │  │  └─ init() → requestMicrophoneAccess()
      │  │     └─ May fail or wait for user permission ⚠️
      │  │
      │  └─ this.errorManager = new ErrorManager()
      │
      ├─ this.setupEventListeners() ✓ OK
      │
      └─ this.setupUI() ❌ METHOD DOESN'T EXIST
         └─ TypeError: this.setupUI is not a function
            └─ INITIALIZATION FAILS
               └─ NO EVENT HANDLERS SET UP
                  └─ UI IS UNRESPONSIVE

Application State After Init:
- ❌ Services initialized but with NULL API keys
- ❌ setupUI() fails → initialization stops
- ❌ Event listeners might not be fully set up
- ❌ UI is partially broken or unresponsive
- ❌ Console shows errors but app might appear to load
```

---

## LocalStorage Key Mismatch Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Browser LocalStorage                         │
└─────────────────────────────────────────────────────────────────┘

What UI Saves (ui-foundation.js):
┌────────────────────────────┐
│ Key: 'ereader-tts-key'     │  ← UI saves here
│ Value: 'AIza...'           │
│                            │
│ Key: 'ereader-stt-key'     │  ← UI saves here
│ Value: 'AIza...'           │
└────────────────────────────┘
         ↓
    These keys exist!

What Services Look For:
┌────────────────────────────┐
│ TTS Service (L65):         │
│ getItem('google_cloud_     │  ← Looks here
│          api_key')         │  ❌ NOT FOUND
│                            │
│ STT Service (L62):         │
│ getItem('google_cloud_     │  ← Looks here
│          api_key')         │  ❌ NOT FOUND
└────────────────────────────┘
         ↓
    These keys DON'T exist!

Result:
  apiKey = null  ❌
  API calls fail with 403 Unauthorized
```

---

## Method Call Issues Diagram

```
ereader.js calls:                stt-service.js provides:
├─ transcribeAudio() ❌          └─ speechToText() ✓
│  Lines: 1299, 2299
│  Expected: async function      Method exists at:
│  Actual: undefined             Line 180+
│  Result: TypeError crash       
│
└─ comparePronunciation() ❌     Method exists:
   Line: 1304                    └─ identifyPronunciationIssues() ✓
   Expected: async function      Location: Line 300+
   Actual: undefined
   Result: TypeError crash
```

---

## Fix Priority & Impact

```
Priority 1 - CRITICAL (Must fix - app is broken)
├─ API Key Storage Mismatch
│  └─ Impact: TTS & STT completely non-functional
│  └─ Time to fix: 2 minutes
│
├─ transcribeAudio() method missing
│  └─ Impact: Recording crashes
│  └─ Time to fix: 1 minute
│
├─ comparePronunciation() method missing
│  └─ Impact: Pronunciation analysis crashes
│  └─ Time to fix: 2-5 minutes (depends on approach)
│
└─ setupUI() method missing
   └─ Impact: Initialization fails
   └─ Time to fix: 1 minute

Priority 2 - MEDIUM (Should fix - app has issues)
├─ Duplicate script load
│  └─ Impact: Wasted resources, no functional impact
│  └─ Time to fix: 1 minute
│
├─ Voice name inconsistency
│  └─ Impact: Fallback voice may not work
│  └─ Time to fix: 1 minute
│
└─ Missing error recovery
   └─ Impact: Silent failures
   └─ Time to fix: 5 minutes

Total Critical Fix Time: ~6 minutes
Total All Fixes: ~15 minutes
```

---

## Data Flow After All Fixes

```
✅ CORRECT FLOW (After Fixes Applied)

User enters API key and clicks "Save"
    ↓
localStorage.setItem('ereader-tts-key', key)
localStorage.setItem('ereader-stt-key', key)
    ↓
User enters text and clicks "Start Reading"
    ↓
TTSService.synthesize()
    ↓
this.apiKey = localStorage.getItem('ereader-tts-key')  ✓ FOUND
    ↓
API call with valid key
    ↓
Google Cloud API responds with audio
    ↓
AudioProcessor plays audio ✓
    ↓
✓ USER HEARS PRONUNCIATION

---

User clicks "Start Recording"
    ↓
AudioProcessor.startRecording()
    ↓
Records user's pronunciation
    ↓
IrishEReader.processRecording()
    ↓
STTService.speechToText(audioBlob)  ✓ METHOD EXISTS
    ↓
this.apiKey = localStorage.getItem('ereader-stt-key')  ✓ FOUND
    ↓
API call with valid key
    ↓
Google Cloud API responds with recognized text
    ↓
STTService.identifyPronunciationIssues()  ✓ METHOD EXISTS
    ↓
Compare and analyze pronunciation
    ↓
Display feedback to user ✓
    ↓
✓ USER GETS FEEDBACK
```

---

## Module Dependency Tree

```
index.html
├─ styles/ereader.css
├─ styles.css (parent)
└─ Scripts (in order):
   ├─ scripts/site.js
   ├─ scripts/ui-foundation.js
   │  └─ Depends on: site.js, ereader.js (indirect)
   │
   ├─ scripts/tts-service.js
   │  └─ Depends on: site.js
   │
   ├─ scripts/stt-service.js
   │  └─ Depends on: site.js
   │
   ├─ scripts/audio-processor.js
   │  └─ Depends on: Web Audio API, site.js
   │
   ├─ scripts/error-manager.js
   │  └─ Depends on: site.js
   │
   ├─ scripts/ui-animations.js
   │  └─ Depends on: site.js
   │
   ├─ scripts/ereader.js ⭐ MAIN
   │  └─ Depends on: ALL ABOVE
   │     - TTSService
   │     - STTService
   │     - AudioProcessor
   │     - ErrorManager
   │     - UIAnimations
   │
   ├─ scripts/google-cloud-test.js (DUPLICATE)
   │  └─ Depends on: All services
   │
   └─ scripts/google-cloud-test.js (DUPLICATE #2)
      └─ Depends on: All services
```

---

## Summary

**Before Fixes:**
- 🔴 API keys are saved but never found by services
- 🔴 Non-existent methods are called, causing crashes
- 🔴 Initialization fails due to missing setupUI()
- 🔴 Users cannot read text (TTS doesn't work)
- 🔴 Users cannot practice pronunciation (STT doesn't work)
- ❌ **Application is completely non-functional for reading/speaking**

**After Fixes:**
- ✅ API keys are correctly stored and retrieved
- ✅ All called methods exist
- ✅ Initialization completes successfully
- ✅ Users can read text (TTS works)
- ✅ Users can practice pronunciation (STT works)
- ✅ **Application is fully functional**

**Effort Required:** ~15 minutes for 7 code changes
