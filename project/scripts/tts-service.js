/**
 * Google Cloud Text-to-Speech Service
 * Handles conversion of Irish text to speech audio with caching and error handling
 */

class TTSService {
    constructor() {
        this.apiKey = null;
        this.baseUrl = 'https://texttospeech.googleapis.com/v1/text:synthesize';
        this.voicesUrl = 'https://texttospeech.googleapis.com/v1/voices';
        
        this.voiceConfig = {
            languageCode: 'ga-IE', // Irish locale
            name: 'ga-IE-Standard-A', // Irish standard voice
            ssmlGender: 'NEUTRAL'
        };
        this.audioConfig = {
            audioEncoding: 'MP3',
            pitch: 0.0,
            speakingRate: 1.0,
            volumeGainDb: 0.0
        };
        
        // Caching and rate limiting - OPTIMIZED with LRU and TTL
        this.cache = new Map();
        this.cachePrefix = 'tts_cache_';
        this.maxCacheItems = 100;
        this.cacheMaxAge = 24 * 60 * 60 * 1000; // 24 hours TTL
        this.cacheCheckInterval = 60 * 60 * 1000; // Check every hour
        this.lastCacheCleanup = Date.now();
        this.requestCount = 0;
        this.requestLimit = 60; // per minute
        this.requestWindow = 60000; // 1 minute
        this.requestTimestamps = [];
        
        // Available Irish voices (will be populated from API)
        this.availableVoices = [];
        this.voicesLoaded = false;
        
        this.init();
    }

    /**
     * Initialize the TTS service
     */
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
        }
    }

    /**
     * Load API key from user input or storage
     */
    async loadApiKey() {
        // Try to get from localStorage first
        this.apiKey = localStorage.getItem('ereader-tts-key');
        
        if (!this.apiKey) {
            this.apiKey = await this.promptForApiKey();
        }
        
        if (this.apiKey) {
            localStorage.setItem('ereader-tts-key', this.apiKey);
            console.log('Google Cloud API key loaded successfully');
        } else {
            console.warn('No Google Cloud API key provided');
        }
    }

    /**
     * Prompt user for API key
     */
    async promptForApiKey() {
        const key = prompt(
            'Please enter your Google Cloud API key for Text-to-Speech:\n\n' +
            'To get an API key:\n' +
            '1. Go to Google Cloud Console\n' +
            '2. Enable Cloud Text-to-Speech API\n' +
            '3. Create credentials (API key)\n' +
            '4. Restrict the key to Text-to-Speech API\n\n' +
            'Enter your API key:'
        );
        return key ? key.trim() : null;
    }

    /**
     * Validate API key by making a test call
     */
    async validateApiKey() {
        if (!this.apiKey) return false;
        
        try {
            const response = await fetch(`${this.voicesUrl}?key=${this.apiKey}`);
            return response.ok;
        } catch (error) {
            console.error('API key validation failed:', error);
            return false;
        }
    }

    /**
     * Convert text to speech with caching and word-level timing
     * @param {string} text - Text to convert to speech
     * @param {Object} options - Additional options for TTS
     * @returns {Promise<Object>} - Audio data and timing information
     */
    async textToSpeech(text, options = {}) {
        try {
            console.log(`Converting text to speech: "${text}"`);
            
            if (!this.apiKey) {
                throw new Error('Google Cloud API key not configured');
            }

            // Check cache first
            const cacheKey = this.getCacheKey(text, options);
            const cachedResult = this.getFromCache(cacheKey);
            if (cachedResult) {
                console.log('Using cached TTS result');
                return cachedResult;
            }

            // Check rate limiting
            if (!this.checkRateLimit()) {
                throw new Error('Rate limit exceeded. Please wait before making more requests.');
            }

            const requestBody = {
                input: { text: text },
                voice: { ...this.voiceConfig, ...options.voice },
                audioConfig: { 
                    ...this.audioConfig, 
                    ...options.audio,
                    enableTimePointing: ['SSML_MARK'] // Enable word timing
                }
            };

            console.log('Making TTS API request...');
            const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorData.error?.message || errorData.error}`);
            }

            const data = await response.json();
            
            const result = {
                audioContent: data.audioContent,
                timepoints: data.timepoints || [],
                text: text,
                voice: requestBody.voice,
                timestamp: Date.now()
            };

            // Cache the result
            this.saveToCache(cacheKey, result);
            this.recordRequest();

            console.log('TTS conversion successful');
            return result;

        } catch (error) {
            console.error('TTS Error:', error);
            if (error.message.includes('API key')) {
                // Clear invalid API key and prompt for new one
                localStorage.removeItem('google_cloud_api_key');
                this.apiKey = null;
            }
            throw new Error(`Text-to-speech conversion failed: ${error.message}`);
        }
    }

    /**
     * Load available voices for Irish language
     * @returns {Promise<Array>} - List of available voices
     */
    async loadAvailableVoices() {
        try {
            console.log('Fetching available Irish voices...');
            
            if (!this.apiKey) {
                console.warn('No API key available for voice fetching');
                return [];
            }

            const response = await fetch(`${this.voicesUrl}?key=${this.apiKey}`);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch voices: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            // Filter for Irish voices
            this.availableVoices = data.voices.filter(voice => 
                voice.languageCodes.includes('ga-IE')
            );

            this.voicesLoaded = true;
            
            if (this.availableVoices.length === 0) {
                console.warn('No Irish voices found. Using fallback configuration.');
                this.availableVoices = [{
                    languageCodes: ['ga-IE'],
                    name: 'ga-IE-Standard-A',
                    ssmlGender: 'FEMALE',
                    naturalSampleRateHertz: 24000
                }];
            }

            console.log(`Found ${this.availableVoices.length} Irish voices:`, 
                this.availableVoices.map(v => v.name));
            
            // Update voice config to use first available voice
            if (this.availableVoices.length > 0) {
                this.voiceConfig.name = this.availableVoices[0].name;
            }

            return this.availableVoices;

        } catch (error) {
            console.error('Error fetching voices:', error);
            this.voicesLoaded = false;
            return [];
        }
    }

    /**
     * Get available voices for Irish language (public method)
     * @returns {Promise<Array>} - List of available voices
     */
    async getAvailableVoices() {
        if (!this.voicesLoaded) {
            await this.loadAvailableVoices();
        }
        return this.availableVoices;
    }

    /**
     * Play audio from TTS result with timing synchronization
     * @param {Object} ttsResult - Result from textToSpeech method
     * @param {Function} onWordHighlight - Callback for word highlighting
     * @returns {Promise<HTMLAudioElement>} - Audio element
     */
    async playAudio(ttsResult, onWordHighlight = null) {
        try {
            console.log('Playing generated audio...');
            
            const audioData = ttsResult.audioContent;
            if (!audioData) {
                throw new Error('No audio data provided');
            }

            // Convert base64 to blob
            const binaryString = atob(audioData);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            const audioBlob = new Blob([bytes], { type: 'audio/mp3' });
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);

            // Set up word highlighting if callback provided
            if (onWordHighlight && ttsResult.timepoints) {
                this.setupWordHighlighting(audio, ttsResult.timepoints, ttsResult.text, onWordHighlight);
            }

            // Clean up object URL when done
            audio.addEventListener('ended', () => {
                URL.revokeObjectURL(audioUrl);
            });

            await audio.play();
            return audio;

        } catch (error) {
            console.error('Audio playback error:', error);
            throw new Error(`Audio playback failed: ${error.message}`);
        }
    }

    /**
     * Set up word-by-word highlighting during audio playback
     * @param {HTMLAudioElement} audio - Audio element
     * @param {Array} timepoints - Word timing data from TTS
     * @param {string} text - Original text
     * @param {Function} onWordHighlight - Callback function
     */
    setupWordHighlighting(audio, timepoints, text, onWordHighlight) {
        const words = text.split(/\s+/);
        let currentWordIndex = 0;

        const highlightNextWord = () => {
            if (currentWordIndex < words.length && currentWordIndex < timepoints.length) {
                const timepoint = timepoints[currentWordIndex];
                const timeOffsetMs = parseFloat(timepoint.timeOffset.replace('s', '')) * 1000;
                
                setTimeout(() => {
                    onWordHighlight(words[currentWordIndex], currentWordIndex);
                    currentWordIndex++;
                    highlightNextWord();
                }, timeOffsetMs - (audio.currentTime * 1000));
            }
        };

        audio.addEventListener('play', highlightNextWord);
    }

    /**
     * Update voice configuration
     * @param {Object} newConfig - New voice configuration
     */
    updateVoiceConfig(newConfig) {
        this.voiceConfig = { ...this.voiceConfig, ...newConfig };
        console.log('Voice configuration updated:', this.voiceConfig);
    }

    /**
     * Update audio configuration
     * @param {Object} newConfig - New audio configuration
     */
    updateAudioConfig(newConfig) {
        this.audioConfig = { ...this.audioConfig, ...newConfig };
        console.log('Audio configuration updated:', this.audioConfig);
    }

    // ============ CACHING METHODS ============

    /**
     * Generate cache key for TTS request
     * @param {string} text - Text to synthesize
     * @param {Object} options - TTS options
     * @returns {string} - Cache key
     */
    getCacheKey(text, options = {}) {
        const voice = { ...this.voiceConfig, ...options.voice };
        const audio = { ...this.audioConfig, ...options.audio };
        return `${this.cachePrefix}${btoa(text + JSON.stringify(voice) + JSON.stringify(audio))}`;
    }

    /**
     * Get item from cache
     * @param {string} key - Cache key
     * @returns {Object|null} - Cached result or null
     */
    getFromCache(key) {
        try {
            const cached = this.cache.get(key);
            if (cached) return cached;

            // Try localStorage for persistence
            const stored = localStorage.getItem(key);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Check if cache entry is still valid (24 hours)
                if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
                    this.cache.set(key, parsed);
                    return parsed;
                } else {
                    localStorage.removeItem(key);
                }
            }
        } catch (error) {
            console.warn('Cache retrieval error:', error);
        }
        return null;
    }

    /**
     * Save item to cache with both memory and localStorage
     * OPTIMIZED: Implements proper LRU eviction and TTL management
     * @param {string} key - Cache key
     * @param {Object} value - Value to cache
     */
    saveToCache(key, value) {
        try {
            // Add timestamp for TTL
            const cacheEntry = {
                ...value,
                lastAccessed: Date.now(),
                timestamp: Date.now()
            };

            // Memory cache with LRU - if key exists, delete it first to move to end
            if (this.cache.has(key)) {
                this.cache.delete(key);
            }
            this.cache.set(key, cacheEntry);

            // OPTIMIZED: Maintain cache size limit with LRU eviction
            if (this.cache.size > this.maxCacheItems) {
                // Remove oldest entries until under limit
                let entriesToRemove = this.cache.size - this.maxCacheItems;
                const iterator = this.cache.keys();
                while (entriesToRemove > 0) {
                    const oldestKey = iterator.next().value;
                    this.cache.delete(oldestKey);
                    try {
                        localStorage.removeItem(oldestKey);
                    } catch (e) {
                        // Ignore localStorage errors
                    }
                    entriesToRemove--;
                }
            }

            // localStorage for persistence with error handling
            try {
                localStorage.setItem(key, JSON.stringify(cacheEntry));
            } catch (storageError) {
                if (storageError.name === 'QuotaExceededError') {
                    console.warn('Storage quota exceeded, clearing old cache entries');
                    this.forceCleanOldCacheEntries();
                    // Try again after cleanup
                    try {
                        localStorage.setItem(key, JSON.stringify(cacheEntry));
                    } catch (e) {
                        console.warn('Still unable to save to cache after cleanup');
                    }
                }
            }

            // Periodic cleanup to remove expired entries
            if (Date.now() - this.lastCacheCleanup > this.cacheCheckInterval) {
                this.cleanExpiredCacheEntries();
                this.lastCacheCleanup = Date.now();
            }
        } catch (error) {
            console.warn('Cache save error:', error);
        }
    }

    /**
     * Load existing cache from localStorage
     */
    async loadCacheFromStorage() {
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.cachePrefix)) {
                    const item = this.getFromCache(key);
                    if (item) {
                        this.cache.set(key, item);
                    }
                }
            }
            console.log(`Loaded ${this.cache.size} items from TTS cache`);
        } catch (error) {
            console.warn('Cache loading error:', error);
        }
    }

    /**
     * Clean old cache entries from localStorage
     */
    cleanOldCacheEntries() {
        try {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.cachePrefix)) {
                    keys.push(key);
                }
            }

            const now = Date.now();
            let removed = 0;
            
            keys.forEach(key => {
                try {
                    const item = JSON.parse(localStorage.getItem(key));
                    if (now - item.timestamp > 24 * 60 * 60 * 1000) {
                        localStorage.removeItem(key);
                        removed++;
                    }
                } catch (e) {
                    localStorage.removeItem(key);
                    removed++;
                }
            });

            if (removed > 0) {
                console.log(`Cleaned ${removed} old cache entries`);
            }
        } catch (error) {
            console.warn('Cache cleaning error:', error);
        }
    }

    /**
     * Force clean old cache entries (more aggressive cleanup)
     * OPTIMIZED: Used when storage quota is exceeded
     */
    forceCleanOldCacheEntries() {
        try {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.cachePrefix)) {
                    keys.push(key);
                }
            }

            // Remove any cache entry older than 1 hour when storage is full
            const now = Date.now();
            const aggressiveAge = 60 * 60 * 1000; // 1 hour instead of 24 hours
            let removed = 0;
            
            keys.forEach(key => {
                try {
                    const item = JSON.parse(localStorage.getItem(key));
                    if (now - (item.timestamp || 0) > aggressiveAge) {
                        localStorage.removeItem(key);
                        this.cache.delete(key);
                        removed++;
                    }
                } catch (e) {
                    localStorage.removeItem(key);
                    this.cache.delete(key);
                    removed++;
                }
            });
            
            console.log(`Force cleaned ${removed} cache entries`);
        } catch (error) {
            console.warn('Force cache cleaning error:', error);
        }
    }

    /**
     * Clean expired cache entries from memory cache
     * OPTIMIZED: Periodically removes expired entries to save memory
     */
    cleanExpiredCacheEntries() {
        try {
            const now = Date.now();
            const keysToRemove = [];
            
            for (const [key, entry] of this.cache.entries()) {
                if (now - (entry.timestamp || 0) > this.cacheMaxAge) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => {
                this.cache.delete(key);
            });
            
            if (keysToRemove.length > 0) {
                console.log(`Cleaned ${keysToRemove.length} expired memory cache entries`);
            }
        } catch (error) {
            console.warn('Memory cache cleaning error:', error);
        }
    }

    // ============ RATE LIMITING METHODS ============

    /**
     * Check if request is within rate limits
     * @returns {boolean} - True if request allowed
     */
    checkRateLimit() {
        const now = Date.now();
        
        // Remove old timestamps outside the window
        this.requestTimestamps = this.requestTimestamps.filter(
            timestamp => now - timestamp < this.requestWindow
        );

        // Check if under limit
        return this.requestTimestamps.length < this.requestLimit;
    }

    /**
     * Record a new request for rate limiting
     */
    recordRequest() {
        this.requestTimestamps.push(Date.now());
        this.requestCount++;
    }

    /**
     * Get current rate limit status
     * @returns {Object} - Rate limit information
     */
    getRateLimitStatus() {
        const now = Date.now();
        const recentRequests = this.requestTimestamps.filter(
            timestamp => now - timestamp < this.requestWindow
        ).length;

        return {
            requestsInWindow: recentRequests,
            requestLimit: this.requestLimit,
            windowDurationMs: this.requestWindow,
            canMakeRequest: recentRequests < this.requestLimit,
            resetTime: Math.max(...this.requestTimestamps) + this.requestWindow
        };
    }

    /**
     * Clear all caches and reset service
     */
    clearCache() {
        this.cache.clear();
        
        // Remove from localStorage
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.cachePrefix)) {
                keys.push(key);
            }
        }
        keys.forEach(key => localStorage.removeItem(key));
        
        console.log('TTS cache cleared');
    }
}

// Export for use in other modules
window.TTSService = TTSService;