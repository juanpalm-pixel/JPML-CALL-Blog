# Step-by-Step Fix Application Guide

Follow these steps in order to fix the Irish E-Reader reading and speaking functionality.

---

## Prerequisites
- Text editor (VS Code, Notepad++, etc.)
- Browser for testing
- Local web server running on port 8000

---

## Step 1: Fix API Key Storage (tts-service.js)

**File:** `scripts/tts-service.js`  
**What:** Change where the TTS service looks for the API key  
**Why:** UI saves keys as `ereader-tts-key` but service was looking for `google_cloud_api_key`

### Instructions:
1. Open `scripts/tts-service.js` in your editor
2. Go to line 65
3. Find this line:
   ```javascript
   this.apiKey = localStorage.getItem('google_cloud_api_key');
   ```
4. Change it to:
   ```javascript
   this.apiKey = localStorage.getItem('ereader-tts-key');
   ```
5. Save the file (Ctrl+S)

✅ **Status:** Fix #1 Complete

---

## Step 2: Fix API Key Storage (stt-service.js)

**File:** `scripts/stt-service.js`  
**What:** Change where the STT service looks for the API key  
**Why:** Same reason as Step 1

### Instructions:
1. Open `scripts/stt-service.js` in your editor
2. Go to line 62
3. Find this line:
   ```javascript
   this.apiKey = localStorage.getItem('google_cloud_api_key');
   ```
4. Change it to:
   ```javascript
   this.apiKey = localStorage.getItem('ereader-stt-key');
   ```
5. Save the file (Ctrl+S)

✅ **Status:** Fix #2 Complete

---

## Step 3: Fix transcribeAudio() Method Calls

**File:** `scripts/ereader.js`  
**What:** Replace incorrect method name with correct one  
**Why:** The method doesn't exist; the correct name is `speechToText()`

### Instructions:
1. Open `scripts/ereader.js` in your editor
2. Use Find & Replace (Ctrl+H):
   - **Find:** `transcribeAudio(`
   - **Replace with:** `speechToText(`
   - Click "Replace All"

3. Verify the changes were made. You should see changes at:
   - Line 1299 (approximately)
   - Line 2299 (approximately)

4. Save the file (Ctrl+S)

**Before:**
```javascript
const sttResult = await this.sttService.transcribeAudio(audioBlob);
```

**After:**
```javascript
const sttResult = await this.sttService.speechToText(audioBlob);
```

✅ **Status:** Fix #3 Complete

---

## Step 4: Fix comparePronunciation() Method Call

**File:** `scripts/ereader.js`  
**What:** Replace with correct method name  
**Why:** The method doesn't exist

### Instructions:
1. Open `scripts/ereader.js` in your editor
2. Go to line 1304 (approximately)
3. Find this code block:
   ```javascript
   const pronunciationComparison = await this.sttService.comparePronunciation(
       targetWords, 
       enhancedResults
   );
   ```

4. Replace it with:
   ```javascript
   const pronunciationComparison = await this.sttService.identifyPronunciationIssues(
       targetText,
       enhancedResults
   );
   ```

5. Check if `targetText` variable exists in that function. If not, use:
   ```javascript
   const targetText = Array.isArray(targetWords) 
       ? targetWords.join(' ') 
       : targetWords;
   ```
   
   Add this line before the call to `identifyPronunciationIssues()`.

6. Save the file (Ctrl+S)

**Before:**
```javascript
const pronunciationComparison = await this.sttService.comparePronunciation(
    targetWords, 
    enhancedResults
);
```

**After:**
```javascript
const pronunciationComparison = await this.sttService.identifyPronunciationIssues(
    targetText,
    enhancedResults
);
```

✅ **Status:** Fix #4 Complete

---

## Step 5: Remove setupUI() Call

**File:** `scripts/ereader.js`  
**What:** Remove the call to non-existent `setupUI()` method  
**Why:** The method doesn't exist

### Instructions:
1. Open `scripts/ereader.js` in your editor
2. Go to line 108 (approximately)
3. Find these lines:
   ```javascript
   this.setupEventListeners();
   this.setupUI();
   ```

4. Delete the line `this.setupUI();` completely

5. Result should be:
   ```javascript
   this.setupEventListeners();
   ```

6. Save the file (Ctrl+S)

**Before:**
```javascript
this.setupEventListeners();
this.setupUI();
```

**After:**
```javascript
this.setupEventListeners();
```

✅ **Status:** Fix #5 Complete

---

## Step 6: Remove Duplicate Script

**File:** `index.html`  
**What:** Remove the duplicate script include  
**Why:** Same script is loaded twice (wasteful)

### Instructions:
1. Open `index.html` in your editor
2. Go to line 380-386 (near the end of the file)
3. You should see:
   ```html
   <!-- Include test script for development -->
   <script src="scripts/google-cloud-test.js"></script>
   
   <!-- Include test script for development -->
   <script src="scripts/google-cloud-test.js"></script>
   </body>
   </html>
   ```

4. Delete lines 384-385:
   ```html
   <!-- Include test script for development -->
   <script src="scripts/google-cloud-test.js"></script>
   ```
   
   Keep only ONE copy.

5. Result should be:
   ```html
   <!-- Include test script for development -->
   <script src="scripts/google-cloud-test.js"></script>
   </body>
   </html>
   ```

6. Save the file (Ctrl+S)

✅ **Status:** Fix #6 Complete

---

## Step 7: Fix Voice Configuration (Optional but Recommended)

**File:** `scripts/tts-service.js`  
**What:** Change voice name from Wavenet-A to Standard-A  
**Why:** Wavenet-A may not exist for Irish; Standard-A is guaranteed

### Instructions:
1. Open `scripts/tts-service.js` in your editor
2. Go to line 12-16 (the `this.voiceConfig` object)
3. Find this section:
   ```javascript
   this.voiceConfig = {
       languageCode: 'ga-IE', // Irish locale
       name: 'ga-IE-Wavenet-A', // Irish neural voice
       ssmlGender: 'NEUTRAL'
   };
   ```

4. Change `'ga-IE-Wavenet-A'` to `'ga-IE-Standard-A'`:
   ```javascript
   this.voiceConfig = {
       languageCode: 'ga-IE', // Irish locale
       name: 'ga-IE-Standard-A', // Irish neural voice
       ssmlGender: 'NEUTRAL'
   };
   ```

5. Save the file (Ctrl+S)

✅ **Status:** Fix #7 Complete (Optional)

---

## 🧪 Testing After Fixes

### Test 1: Browser Console Check
1. Open `http://localhost:8000/project/index.html` in your browser
2. Press F12 to open Developer Tools
3. Click the "Console" tab
4. Look for JavaScript errors (should see none or only warnings)
5. You should see log messages like: "Initializing Irish E-Reader..."

**Expected:** No red error messages  
**Status:** ✅ Pass if no red errors

### Test 2: API Key Configuration
1. In the same page, look for "API Configuration" section at the top
2. Enter your Google Cloud TTS API key in the first field
3. Enter your Google Cloud STT API key in the second field
4. Click "Save API Keys" button
5. Check the console - should show a success message

**Expected:** API keys saved successfully message  
**Status:** ✅ Pass if you see success message

### Test 3: Reading (TTS) Functionality
1. In the "Irish Text Input" section, enter some Irish text:
   ```
   Dia duit, conas atá tú?
   ```
2. Click the "Start Reading" button
3. You should hear audio playing the Irish text
4. Check the console - should show no errors

**Expected:** Hear audio playback  
**Status:** ✅ Pass if you hear audio

### Test 4: Recording (STT) Functionality
1. In the "Pronunciation Practice" section, look for "Start Recording" button
2. Click "Start Recording"
3. The browser will ask for microphone permission - click "Allow"
4. Speak some Irish text clearly
5. After recording stops, it should analyze your pronunciation
6. Check the console - should show no errors

**Expected:** See pronunciation feedback  
**Status:** ✅ Pass if you see feedback

### Test 5: Diagnostic Tool
1. Open `http://localhost:8000/project/debug-diagnostic.html`
2. Review the test results at the top
3. All tests in "Service Initialization Status" should show ✓
4. Enter your API keys and click "Test API Keys"
5. All checks should pass

**Expected:** All green checkmarks  
**Status:** ✅ Pass if all green

---

## 📋 Verification Checklist

Before and after applying each fix, mark them off:

- [ ] Step 1: Fixed API key in tts-service.js (line 65)
- [ ] Step 2: Fixed API key in stt-service.js (line 62)
- [ ] Step 3: Replaced transcribeAudio() calls
- [ ] Step 4: Replaced comparePronunciation() call
- [ ] Step 5: Removed setupUI() call
- [ ] Step 6: Removed duplicate script in index.html
- [ ] Step 7: (Optional) Fixed voice name in tts-service.js

---

## 🆘 Troubleshooting

### Issue: Console shows "Uncaught SyntaxError"
**Cause:** You made a typo when editing  
**Solution:**
1. Check the line number shown in the error
2. Go to that line and compare with the guide
3. Fix the typo (usually missing semicolon or quote)
4. Save and refresh browser

### Issue: Still no audio when clicking "Start Reading"
**Cause:** API key is still not being found  
**Solution:**
1. Open Browser DevTools → Console
2. Type: `localStorage.getItem('ereader-tts-key')`
3. If it shows `null`, the key wasn't saved
4. Re-enter the key and click "Save API Keys"
5. Type again to verify it was saved

### Issue: Microphone not working
**Cause:** Permission denied or no microphone  
**Solution:**
1. Check if your browser asked for permission
2. If yes, make sure you clicked "Allow"
3. Check browser settings - allow microphone access
4. Test microphone with another app
5. Try a different browser

### Issue: Still seeing errors
**Cause:** Syntax error in edits  
**Solution:**
1. Open the problematic file
2. Use Ctrl+F to find the line from the error
3. Compare character-by-character with the guide
4. Look for missing quotes, semicolons, or brackets
5. Fix and save

---

## 📞 Getting Help

If you're stuck:

1. **Check the files exist:**
   ```
   scripts/tts-service.js ✓
   scripts/stt-service.js ✓
   scripts/ereader.js ✓
   index.html ✓
   ```

2. **Check your edits using Find:**
   - Open the file
   - Use Ctrl+F to search for key phrases
   - Verify the change was made correctly

3. **Compare with DEBUG_REPORT.md:**
   - For detailed explanations of each issue
   - For code context and line numbers

4. **Use the Diagnostic Tool:**
   - Open debug-diagnostic.html
   - It shows what's working and what's not

5. **Check the Console:**
   - Browser DevTools → Console (F12)
   - Copy any error messages
   - Search in DEBUG_REPORT.md for that error

---

## ✅ Final Verification

After all steps:

1. **Refresh the page:** `http://localhost:8000/project/index.html`
2. **Open Console:** Press F12
3. **Look for:** Initialization messages, no red errors
4. **Try reading:** Enter text, click "Start Reading", hear audio
5. **Try recording:** Click "Start Recording", speak, see feedback
6. **Check console:** Should show success logs

**All working?** Congratulations! 🎉 All fixes are complete and the app is functional.

---

**Total Time:** 15-20 minutes  
**Difficulty:** Low to Medium  
**Success Rate:** Very high if you follow these steps exactly  

Good luck! 🍀
