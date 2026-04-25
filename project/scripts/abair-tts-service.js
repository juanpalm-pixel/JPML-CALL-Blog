/**
 * Abair.ie Text-to-Speech Service
 * Provides Irish language text-to-speech using the university's Abair.ie API
 */

class AbairTTSService {
    constructor() {
        this.baseUrl = 'https://api.abair.ie/v3';
        this.availableVoices = [];
        this.cache = new Map(); // Cache generated audio to reduce API calls
        this.currentAudio = null;
        this.isPlaying = false;
        this.onWordHighlight = null; // Callback for word highlighting during playback
        this.playbackStartTime = null;
        this.wordTimings = [];
        
        // Voice and speech settings
        this.currentVoice = null;
        this.speechRate = 1.0;
        
        // Initialize the service
        this.initialize();
    }

    /**
     * Initialize the TTS service by loading available voices
     */
    async initialize() {
        console.log('Initializing Abair.ie TTS service...');
        try {
            await this.loadAvailableVoices();
            console.log(`Loaded ${this.availableVoices.length} Irish voices`);
        } catch (error) {
            console.warn('Failed to load voices from API, using fallback list:', error);
            this.setFallbackVoices();
        }
    }

    /**
     * Load available voices from Abair.ie metadata API
     */
    async loadAvailableVoices() {
        try {
            const response = await fetch(`${this.baseUrl}/synthesis/metadata`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Abair.ie voices response:', data);
            
            if (data.data && Array.isArray(data.data)) {
                this.availableVoices = [];
                
                data.data.forEach(speaker => {
                    // For each speaker, create entries for their available voice technologies
                    speaker.voicenames.forEach((voicename, index) => {
                        const voiceType = speaker.voices[index] || speaker.voices[0] || 'PIPER';
                        this.availableVoices.push({
                            id: voicename,
                            name: speaker.name,
                            locale: speaker.locale,
                            gender: speaker.gender,
                            technology: voiceType,
                            shortCode: speaker.shortCode,
                            heritage: speaker.heritage,
                            displayName: `${speaker.locale} - ${speaker.name} (${speaker.gender}) [${voiceType}]`
                        });
                    });
                });
                
                console.log('Processed voices:', this.availableVoices);
            } else {
                throw new Error('Unexpected voices format in API response - expected data array');
            }

        } catch (error) {
            console.error('Error loading voices from Abair.ie:', error);
            throw error;
        }
    }

    /**
     * Set fallback voices if API is unavailable
     */
    setFallbackVoices() {
        this.availableVoices = [
            {
                id: 'ga_CO_snc_piper',
                name: 'Sibéal',
                locale: 'Connemara',
                gender: 'female',
                technology: 'PIPER',
                shortCode: 'snc',
                heritage: false,
                displayName: 'Connemara - Sibéal (female) [PIPER]'
            },
            {
                id: 'ga_CO_pmc_piper',
                name: 'Pádraig',
                locale: 'Connemara',
                gender: 'male',
                technology: 'PIPER',
                shortCode: 'pmc',
                heritage: false,
                displayName: 'Connemara - Pádraig (male) [PIPER]'
            },
            {
                id: 'ga_UL_anb_piper',
                name: 'Áine',
                locale: 'Ulster',
                gender: 'female',
                technology: 'PIPER',
                shortCode: 'anb',
                heritage: false,
                displayName: 'Ulster - Áine (female) [PIPER]'
            },
            {
                id: 'ga_MU_cmg_piper',
                name: 'Colm',
                locale: 'Munster',
                gender: 'male',
                technology: 'PIPER',
                shortCode: 'cmg',
                heritage: false,
                displayName: 'Munster - Colm (male) [PIPER]'
            },
            {
                id: 'ga_MU_nnc_piper',
                name: 'Neasa',
                locale: 'Munster',
                gender: 'female',
                technology: 'PIPER',
                shortCode: 'nnc',
                heritage: false,
                displayName: 'Munster - Neasa (female) [PIPER]'
            }
        ];
    }

    /**
     * Get list of available Irish voices
     */
    getAvailableVoices() {
        return this.availableVoices;
    }

    /**
     * Get default voice (first available voice)
     */
    getDefaultVoice() {
        return this.availableVoices.length > 0 ? this.availableVoices[0] : { id: 'ga_CO_snc_piper', name: 'Connacht' };
    }

    /**
     * Set the current voice for synthesis
     */
    setVoice(voiceId) {
        const voice = this.availableVoices.find(v => v.id === voiceId);
        if (voice) {
            this.currentVoice = voice;
            console.log('Voice changed to:', voice.name);
        } else {
            console.warn('Voice not found:', voiceId);
        }
    }

    /**
     * Get the currently selected voice
     */
    getCurrentVoice() {
        return this.currentVoice || this.getDefaultVoice();
    }

    /**
     * Set speech rate/speed
     */
    setSpeechRate(rate) {
        this.speechRate = Math.max(0.5, Math.min(2.0, rate)); // Clamp between 0.5 and 2.0
        console.log('Speech rate set to:', this.speechRate);
    }

    /**
     * Get current speech rate
     */
    getSpeechRate() {
        return this.speechRate || 1.0;
    }

    /**
     * Synthesize Irish text to speech
     */
    async synthesize(text, voiceId = null, options = {}) {
        if (!text || !text.trim()) {
            throw new Error('Text cannot be empty');
        }

        // Use current voice if none specified, or default
        const selectedVoice = voiceId || (this.currentVoice ? this.currentVoice.id : this.getDefaultVoice().id);
        
        // Use current speech rate if not specified in options
        const speechRate = parseFloat(options.speed || this.speechRate || 1.0);
        
        // Clamp speech rate between 0.5 and 2.0
        const clampedRate = Math.max(0.5, Math.min(2.0, speechRate));
        
        // Create cache key including rate for proper caching
        const cacheKey = `${text}_${selectedVoice}_${clampedRate}`;
        if (this.cache.has(cacheKey)) {
            console.log('Returning cached audio for:', text.substring(0, 30) + '...');
            return this.cache.get(cacheKey);
        }

        try {
            console.log(`Synthesizing Irish text with voice ${selectedVoice} at rate ${clampedRate}x:`, text.substring(0, 50) + '...');
            
            // Build request body according to Abair.ie API documentation
            const requestBody = {
                synthinput: {
                    text: text.trim()
                },
                voiceparams: {
                    languageCode: "ga-IE",
                    name: selectedVoice
                },
                audioconfig: {
                    audioEncoding: "LINEAR16",
                    speakingRate: clampedRate,
                    pitch: 1.0,
                    volumeGainDb: 0,
                    sampleRateHertz: 16000,
                    effectsProfileId: []
                },
                outputType: "JSON",
                timing: "WORD"
            };

            console.log('Sending synthesis request:', {
                voice: selectedVoice,
                speakingRate: clampedRate,
                text: text.substring(0, 50) + '...'
            });

            const response = await fetch(`${this.baseUrl}/synthesis`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`Abair.ie API error: HTTP ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            
            console.log('✅ Synthesis response received with speakingRate:', clampedRate);
            
            // Process the audio response
            const audioResult = await this.processAudioResponse(data, text);
            
            // Cache the result
            this.cache.set(cacheKey, audioResult);
            
            // Limit cache size to prevent memory issues
            if (this.cache.size > 50) {
                const firstKey = this.cache.keys().next().value;
                this.cache.delete(firstKey);
            }

            return audioResult;

        } catch (error) {
            console.error('Text-to-speech synthesis failed:', error);
            throw new Error(`Irish TTS synthesis failed: ${error.message}`);
        }
    }

    /**
     * Process the audio response from Abair.ie API
     */
    async processAudioResponse(data, originalText) {
        console.log('Processing audio response:', Object.keys(data));

        // Try different possible audio data fields
        let audioData = null;
        let audioUrl = null;

        if (data.audioContent) {
            audioData = data.audioContent;
        } else if (data.audio) {
            audioData = data.audio;
        } else if (data.url) {
            audioUrl = data.url;
        } else if (data.audio_url) {
            audioUrl = data.audio_url;
        } else {
            console.warn('Audio data not found in expected fields. Available fields:', Object.keys(data));
            throw new Error('No audio data found in API response');
        }

        let audioBlob;
        
        if (audioUrl) {
            // Direct URL - fetch the audio
            const audioResponse = await fetch(audioUrl);
            if (!audioResponse.ok) {
                throw new Error(`Failed to fetch audio from URL: ${audioUrl}`);
            }
            audioBlob = await audioResponse.blob();
        } else if (audioData) {
            // Base64 encoded audio data
            try {
                audioBlob = this.base64ToBlob(audioData);
            } catch (error) {
                console.error('Failed to decode base64 audio:', error);
                throw new Error('Invalid audio data format');
            }
        }

        if (!audioBlob) {
            throw new Error('Could not process audio response');
        }

        // Create object URL for playback
        const objectUrl = URL.createObjectURL(audioBlob);
        
        // Generate word timings for highlighting (estimated since Abair.ie might not provide timing)
        const wordTimings = this.generateWordTimings(originalText, await this.getAudioDuration(audioBlob));

        return {
            audioUrl: objectUrl,
            audioBlob: audioBlob,
            text: originalText,
            wordTimings: wordTimings,
            duration: await this.getAudioDuration(audioBlob)
        };
    }

    /**
     * Convert base64 audio data to blob
     */
    base64ToBlob(base64Data, contentType = 'audio/wav') {
        try {
            // Remove data URL prefix if present
            const base64 = base64Data.replace(/^data:audio\/[^;]+;base64,/, '');
            
            const byteCharacters = atob(base64);
            const byteArrays = [];
            
            for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
                const slice = byteCharacters.slice(offset, offset + 1024);
                const byteNumbers = new Array(slice.length);
                
                for (let i = 0; i < slice.length; i++) {
                    byteNumbers[i] = slice.charCodeAt(i);
                }
                
                byteArrays.push(new Uint8Array(byteNumbers));
            }
            
            return new Blob(byteArrays, { type: contentType });
        } catch (error) {
            console.error('Base64 decode error:', error);
            throw new Error('Failed to decode base64 audio data');
        }
    }

    /**
     * Get audio duration from blob
     */
    async getAudioDuration(audioBlob) {
        return new Promise((resolve) => {
            const audio = new Audio();
            audio.addEventListener('loadedmetadata', () => {
                resolve(audio.duration || 5); // Default to 5 seconds if duration unknown
            });
            audio.addEventListener('error', () => {
                resolve(5); // Fallback duration
            });
            audio.src = URL.createObjectURL(audioBlob);
        });
    }

    /**
     * Generate word timings for highlighting (estimated timing)
     */
    generateWordTimings(text, totalDuration) {
        const words = text.trim().split(/\s+/);
        const avgWordDuration = totalDuration / words.length;
        
        return words.map((word, index) => ({
            word: word,
            startTime: index * avgWordDuration,
            endTime: (index + 1) * avgWordDuration,
            confidence: 1.0
        }));
    }

    /**
     * Play synthesized audio with word highlighting
     */
    async play(audioResult) {
        if (this.isPlaying) {
            this.stop();
        }

        try {
            this.currentAudio = new Audio(audioResult.audioUrl);
            this.wordTimings = audioResult.wordTimings || [];
            this.isPlaying = true;
            this.playbackStartTime = null;

            // Set up playback event listeners
            this.currentAudio.addEventListener('play', () => {
                this.playbackStartTime = Date.now();
                this.startWordHighlighting();
            });

            this.currentAudio.addEventListener('ended', () => {
                this.isPlaying = false;
                this.stopWordHighlighting();
                if (this.onPlaybackComplete) {
                    this.onPlaybackComplete();
                }
            });

            this.currentAudio.addEventListener('error', (error) => {
                console.error('Audio playback error:', error);
                this.isPlaying = false;
                this.stopWordHighlighting();
            });

            await this.currentAudio.play();
            return this.currentAudio;
            
        } catch (error) {
            console.error('Failed to play audio:', error);
            this.isPlaying = false;
            throw new Error(`Audio playback failed: ${error.message}`);
        }
    }

    /**
     * Start word highlighting during playback
     */
    startWordHighlighting() {
        if (!this.onWordHighlight || !this.wordTimings.length) return;

        const highlightInterval = setInterval(() => {
            if (!this.isPlaying || !this.currentAudio || !this.playbackStartTime) {
                clearInterval(highlightInterval);
                return;
            }

            const currentTime = (Date.now() - this.playbackStartTime) / 1000;
            
            // Find current word being spoken
            const currentWord = this.wordTimings.find(timing => 
                currentTime >= timing.startTime && currentTime < timing.endTime
            );

            if (currentWord && this.onWordHighlight) {
                this.onWordHighlight(currentWord.word, this.wordTimings.indexOf(currentWord));
            }
        }, 100); // Check every 100ms

        this.highlightInterval = highlightInterval;
    }

    /**
     * Stop word highlighting
     */
    stopWordHighlighting() {
        if (this.highlightInterval) {
            clearInterval(this.highlightInterval);
            this.highlightInterval = null;
        }
    }

    /**
     * Stop audio playback
     */
    stop() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
        this.isPlaying = false;
        this.stopWordHighlighting();
    }

    /**
     * Pause audio playback
     */
    pause() {
        if (this.currentAudio && this.isPlaying) {
            this.currentAudio.pause();
            this.isPlaying = false;
            this.stopWordHighlighting();
        }
    }

    /**
     * Resume audio playback
     */
    resume() {
        if (this.currentAudio && !this.isPlaying) {
            this.currentAudio.play();
            this.isPlaying = true;
            this.playbackStartTime = Date.now() - (this.currentAudio.currentTime * 1000);
            this.startWordHighlighting();
        }
    }

    /**
     * Check if TTS service is currently playing audio
     */
    isCurrentlyPlaying() {
        return this.isPlaying;
    }

    /**
     * Set callback for word highlighting during playback
     */
    setWordHighlightCallback(callback) {
        this.onWordHighlight = callback;
    }

    /**
     * Set callback for playback completion
     */
    setPlaybackCompleteCallback(callback) {
        this.onPlaybackComplete = callback;
    }

    /**
     * Clear the audio cache
     */
    clearCache() {
        this.cache.clear();
        console.log('TTS cache cleared');
    }

    /**
     * Get cache size information
     */
    getCacheInfo() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()).map(key => key.substring(0, 30) + '...')
        };
    }

    /**
     * Test the TTS service with sample Irish text
     */
    async test() {
        const testText = "Dia dhuit! Conas atá tú inniu?";
        try {
            console.log('Testing Abair.ie TTS service...');
            const result = await this.synthesize(testText);
            await this.play(result);
            console.log('✓ TTS service test successful');
            return true;
        } catch (error) {
            console.error('✗ TTS service test failed:', error);
            return false;
        }
    }

    /**
     * Get service status and information
     */
    getStatus() {
        return {
            serviceName: 'Abair.ie TTS',
            baseUrl: this.baseUrl,
            availableVoices: this.availableVoices.length,
            cacheSize: this.cache.size,
            isPlaying: this.isPlaying,
            currentAudio: !!this.currentAudio,
            initialized: this.availableVoices.length > 0
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AbairTTSService;
} else {
    window.AbairTTSService = AbairTTSService;
}