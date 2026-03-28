# 🚨 Important Information About Speech Recognition

## Abair.ie API CORS Issue

The Abair.ie Speech-to-Text API **does not support CORS** (Cross-Origin Resource Sharing), which means it cannot be called directly from web browsers - even when running from a local web server.

### The Error You're Seeing:
```
Access to fetch at 'https://api.abair.ie/v3/recognition/recognise' from origin 'http://localhost:8000' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

### What This Means:
- ❌ Abair STT API cannot be used from browser (CORS policy)
- ❌ Audio files are also too large (>900KB exceeds API limit)
- ✅ Browser STT fallback works (uses browser's built-in speech recognition)
- ⚠️ Browser STT quality may be lower than Abair for Irish language

## Solutions

### Option 1: Use Browser STT Only (Current)
The system automatically falls back to browser speech recognition when Abair fails. This works but:
- May not be as accurate for Irish language
- Requires microphone permission
- Works in Chrome, Edge (Chromium-based browsers)
- Limited Irish language support

### Option 2: Create Backend Proxy (Recommended for Production)
To use Abair STT properly, you need a backend server that:
1. Receives audio from the frontend
2. Sends it to Abair API from the server
3. Returns results to frontend

**Example Node.js proxy:**
```javascript
const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.post('/api/stt', async (req, res) => {
    try {
        const response = await fetch('https://api.abair.ie/v3/recognition/recognise', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000);
```

### Option 3: Reduce Audio Size
The audio is too large (>900KB). To reduce:
1. Shorten recording time from 10s to 5s
2. Lower sample rate from 16kHz to 8kHz
3. More aggressive compression

## Current Behavior

The system now:
1. ✅ Tries Abair STT first (will fail due to CORS)
2. ✅ Falls back to browser STT automatically
3. ✅ Shows error message if browser STT also fails
4. ✅ Does NOT show fake pronunciation feedback on failure
5. ✅ Prevents infinite loops on silent audio

## Recommendations

**For Development/Testing:**
- Use browser STT fallback (current setup)
- Accept lower accuracy for Irish language

**For Production:**
- Implement backend proxy server
- Or contact Abair.ie team to request CORS support
- Or use alternative STT API with CORS support

## Contact Abair.ie

You may want to contact the Abair.ie team about CORS support:
- Website: https://abair.ie
- GitHub: https://github.com/phoneticsrr/abair-main-website

They may be able to enable CORS headers for browser use.

---

**Last Updated**: March 28, 2026
