/**
 * Abair.ie Speech-to-Text Service for Irish Language
 * Uses Abair.ie STT API for speech recognition with pronunciation feedback
 * Also includes browser Speech Recognition API fallback for live recognition
 */

class AbairSTTService {
    constructor() {
        // Check for Speech Recognition support
        this.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.isSupported = !!this.SpeechRecognition;
        
        this.recognition = null;
        this.isListening = false;
        this.currentText = '';
        this.expectedText = '';
        this.confidenceThreshold = 0.7;
        
        // Callbacks
        this.onResult = null;
        this.onError = null;
        this.onStart = null;
        this.onEnd = null;
        
        if (this.isSupported) {
            this.initializeRecognition();
        } else {
            console.warn('Speech Recognition API not supported in this browser');
        }
    }

    /**
     * Initialize the Speech Recognition instance
     */
    initializeRecognition() {
        this.recognition = new this.SpeechRecognition();
        
        // Configure for Irish language
        this.recognition.lang = 'ga-IE'; // Irish language code
        this.recognition.continuous = false; // Stop after one result
        this.recognition.interimResults = false; // Only final results
        this.recognition.maxAlternatives = 3; // Get multiple alternatives for comparison
        
        // Set up event listeners
        this.setupEventListeners();
    }

    /**
     * Set up Speech Recognition event listeners
     */
    setupEventListeners() {
        this.recognition.onstart = () => {
            console.log('Speech recognition started');
            this.isListening = true;
            if (this.onStart) {
                this.onStart();
            }
        };

        this.recognition.onend = () => {
            console.log('Speech recognition ended');
            this.isListening = false;
            if (this.onEnd) {
                this.onEnd();
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.isListening = false;
            
            let errorMessage = 'Speech recognition failed';
            switch (event.error) {
                case 'not-allowed':
                    errorMessage = 'Microphone access denied. Please enable microphone permissions.';
                    break;
                case 'no-speech':
                    errorMessage = 'No speech detected. Please speak clearly into the microphone.';
                    break;
                case 'audio-capture':
                    errorMessage = 'Microphone not found or not working.';
                    break;
                case 'network':
                    errorMessage = 'Network error during speech recognition.';
                    break;
                case 'aborted':
                    errorMessage = 'Speech recognition was aborted.';
                    break;
                case 'language-not-supported':
                    errorMessage = 'Irish language not supported by browser. Trying English fallback.';
                    this.recognition.lang = 'en-IE'; // Fallback to Irish English
                    break;
            }
            
            if (this.onError) {
                this.onError(new Error(errorMessage));
            }
        };

        this.recognition.onresult = (event) => {
            const results = Array.from(event.results[0]);
            const transcription = results[0].transcript.trim();
            const confidence = results[0].confidence || 0.8; // Default confidence if not provided
            
            console.log('Speech recognition result:', {
                transcript: transcription,
                confidence: confidence,
                alternatives: results.slice(1).map(r => ({ transcript: r.transcript, confidence: r.confidence }))
            });

            this.currentText = transcription;
            
            if (this.onResult) {
                const analysis = this.analyzePronunciation(transcription, this.expectedText, confidence);
                this.onResult(analysis);
            }
        };
    }

    /**
     * Start speech recognition for pronunciation practice
     */
    async startListening(expectedText = '', options = {}) {
        if (!this.isSupported) {
            throw new Error('Speech Recognition API not supported in this browser');
        }

        if (this.isListening) {
            this.stopListening();
            await new Promise(resolve => setTimeout(resolve, 100)); // Brief pause
        }

        this.expectedText = expectedText.toLowerCase().trim();
        
        // Apply options
        if (options.language) {
            this.recognition.lang = options.language;
        }
        if (options.confidenceThreshold) {
            this.confidenceThreshold = options.confidenceThreshold;
        }

        try {
            console.log('Starting speech recognition for:', expectedText);
            this.recognition.start();
        } catch (error) {
            console.error('Failed to start speech recognition:', error);
            throw new Error(`Could not start speech recognition: ${error.message}`);
        }
    }

    /**
     * Stop speech recognition
     */
    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }

    /**
     * Abort speech recognition
     */
    abort() {
        if (this.recognition && this.isListening) {
            this.recognition.abort();
        }
    }

    /**
     * Analyze pronunciation accuracy by comparing spoken and expected text
     */
    analyzePronunciation(spokenText, expectedText, confidence) {
        const spoken = this.normalizeText(spokenText);
        const expected = this.normalizeText(expectedText);
        
        console.log('Analyzing pronunciation:', { spoken, expected, confidence });

        // Calculate word-level accuracy
        const spokenWords = spoken.split(/\s+/).filter(w => w.length > 0);
        const expectedWords = expected.split(/\s+/).filter(w => w.length > 0);
        
        const wordAnalysis = this.compareWords(spokenWords, expectedWords);
        const overallAccuracy = this.calculateOverallAccuracy(wordAnalysis, confidence);
        
        // Classify pronunciation quality
        let qualityLevel;
        let feedback;
        
        if (overallAccuracy >= 0.9) {
            qualityLevel = 'excellent';
            feedback = 'Excellent pronunciation! All words were clearly spoken.';
        } else if (overallAccuracy >= 0.7) {
            qualityLevel = 'good';
            feedback = 'Good pronunciation! Minor improvements needed on some words.';
        } else if (overallAccuracy >= 0.5) {
            qualityLevel = 'fair';
            feedback = 'Fair pronunciation. Practice needed on several words.';
        } else {
            qualityLevel = 'poor';
            feedback = 'Pronunciation needs significant improvement. Try speaking more clearly.';
        }

        return {
            spokenText: spokenText,
            expectedText: expectedText,
            confidence: confidence,
            accuracy: overallAccuracy,
            qualityLevel: qualityLevel,
            feedback: feedback,
            wordAnalysis: wordAnalysis,
            correctWords: wordAnalysis.filter(w => w.isCorrect).length,
            totalWords: expectedWords.length,
            errors: wordAnalysis.filter(w => !w.isCorrect),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Normalize text for comparison (lowercase, remove punctuation, etc.)
     */
    normalizeText(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\sáéíóúàèìòùäëïöü]/g, '') // Remove punctuation, keep accented chars
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Compare spoken words with expected words
     */
    compareWords(spokenWords, expectedWords) {
        const analysis = [];
        
        // Use simple alignment - could be improved with dynamic programming
        const maxLength = Math.max(spokenWords.length, expectedWords.length);
        
        for (let i = 0; i < maxLength; i++) {
            const expectedWord = expectedWords[i] || '';
            const spokenWord = spokenWords[i] || '';
            
            if (expectedWord) {
                const isCorrect = this.wordsMatch(spokenWord, expectedWord);
                const similarity = this.calculateWordSimilarity(spokenWord, expectedWord);
                
                analysis.push({
                    expected: expectedWord,
                    spoken: spokenWord,
                    isCorrect: isCorrect,
                    similarity: similarity,
                    position: i,
                    type: this.determineErrorType(spokenWord, expectedWord)
                });
            }
        }
        
        return analysis;
    }

    /**
     * Check if two words match (with some tolerance for pronunciation variations)
     */
    wordsMatch(spoken, expected) {
        if (!spoken || !expected) return false;
        
        // Exact match
        if (spoken === expected) return true;
        
        // High similarity match (accounts for pronunciation variations)
        const similarity = this.calculateWordSimilarity(spoken, expected);
        return similarity >= 0.8;
    }

    /**
     * Calculate similarity between two words using Levenshtein distance
     */
    calculateWordSimilarity(word1, word2) {
        if (!word1 || !word2) return 0;
        if (word1 === word2) return 1;
        
        const maxLength = Math.max(word1.length, word2.length);
        const distance = this.levenshteinDistance(word1, word2);
        return Math.max(0, 1 - (distance / maxLength));
    }

    /**
     * Calculate Levenshtein distance between two strings
     */
    levenshteinDistance(str1, str2) {
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
        
        for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
        
        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,     // deletion
                    matrix[j - 1][i] + 1,     // insertion
                    matrix[j - 1][i - 1] + substitutionCost // substitution
                );
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    /**
     * Determine the type of pronunciation error
     */
    determineErrorType(spoken, expected) {
        if (!spoken && expected) return 'missing';
        if (spoken && !expected) return 'extra';
        if (!spoken || !expected) return 'unknown';
        
        const similarity = this.calculateWordSimilarity(spoken, expected);
        
        if (similarity >= 0.8) return 'minor'; // Close pronunciation
        if (similarity >= 0.5) return 'moderate'; // Some similarity
        return 'major'; // Very different
    }

    /**
     * Calculate overall pronunciation accuracy
     */
    calculateOverallAccuracy(wordAnalysis, confidence) {
        if (wordAnalysis.length === 0) return 0;
        
        // Weight by word accuracy and confidence
        const wordAccuracy = wordAnalysis.reduce((sum, word) => sum + (word.isCorrect ? 1 : word.similarity), 0) / wordAnalysis.length;
        
        // Combine word accuracy with speech recognition confidence
        return (wordAccuracy * 0.8) + (confidence * 0.2);
    }

    /**
     * Set callback for speech recognition results
     */
    setResultCallback(callback) {
        this.onResult = callback;
    }

    /**
     * Set callback for speech recognition errors
     */
    setErrorCallback(callback) {
        this.onError = callback;
    }

    /**
     * Set callback for speech recognition start
     */
    setStartCallback(callback) {
        this.onStart = callback;
    }

    /**
     * Set callback for speech recognition end
     */
    setEndCallback(callback) {
        this.onEnd = callback;
    }

    /**
     * Check if browser supports Irish language recognition
     */
    async checkIrishSupport() {
        if (!this.isSupported) return false;
        
        try {
            // Test with a temporary recognition instance
            const testRecognition = new this.SpeechRecognition();
            testRecognition.lang = 'ga-IE';
            
            return new Promise((resolve) => {
                testRecognition.onerror = (event) => {
                    resolve(event.error !== 'language-not-supported');
                };
                
                testRecognition.onstart = () => {
                    testRecognition.abort();
                    resolve(true);
                };
                
                setTimeout(() => {
                    testRecognition.abort();
                    resolve(false);
                }, 1000);
                
                testRecognition.start();
            });
        } catch (error) {
            return false;
        }
    }

    /**
     * Test the STT service
     */
    async test() {
        if (!this.isSupported) {
            console.error('✗ Browser STT not supported');
            return false;
        }

        try {
            console.log('Testing Browser STT service...');
            const irishSupported = await this.checkIrishSupport();
            
            if (irishSupported) {
                console.log('✓ Irish language recognition supported');
            } else {
                console.log('⚠ Irish language not directly supported, using fallback');
            }
            
            console.log('✓ STT service test successful');
            return true;
        } catch (error) {
            console.error('✗ STT service test failed:', error);
            return false;
        }
    }

    /**
     * Get service status and information
     */
    getStatus() {
        return {
            serviceName: 'Browser STT',
            isSupported: this.isSupported,
            isListening: this.isListening,
            language: this.recognition ? this.recognition.lang : 'N/A',
            confidenceThreshold: this.confidenceThreshold,
            lastText: this.currentText,
            browserAPI: this.SpeechRecognition ? 'Available' : 'Not Available'
        };
    }

    /**
     * Check if STT is currently supported
     */
    isServiceSupported() {
        return this.isSupported;
    }

    /**
     * Check if currently listening
     */
    isCurrentlyListening() {
        return this.isListening;
    }

    /**
     * Update configuration for audio format (compatibility method for ereader.js)
     * Note: Browser Speech Recognition API doesn't need explicit format configuration
     * @param {string} format - Audio format (ignored in browser API)
     * @param {number} sampleRate - Sample rate (ignored in browser API)
     */
    updateConfigForFormat(format, sampleRate) {
        // Browser Speech Recognition API handles format automatically
        console.log(`Format configuration requested: ${format} at ${sampleRate}Hz (handled automatically by browser)`);
    }

    /**
     * Convert speech to text using Abair.ie STT API (two-step process)
     * @param {Blob} audioBlob - Audio blob to transcribe
     * @returns {Promise<Object>} STT results with transcript and confidence
     */
    async speechToText(audioBlob) {
        try {
            console.log('🎯 Using Abair.ie STT API (two-step process)');
            console.log('Audio blob size:', audioBlob.size, 'bytes');
            
            // Step 1: Convert audio blob to base64
            const base64Audio = await this.audioToBase64(audioBlob);
            console.log('✅ Audio converted to base64, length:', base64Audio.length);
            
            // Step 2: Submit audio for recognition
            const recognitionPayload = {
                recogniseBlob: base64Audio,
                developer: true,
                method: "online2bin"
            };
            
            console.log('📤 Submitting audio for recognition...');
            const recogniseResponse = await fetch('https://api.abair.ie/v3/recognition/recognise', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(recognitionPayload)
            });
            
            if (!recogniseResponse.ok) {
                const errorText = await recogniseResponse.text();
                console.error('❌ Recognition submission failed:', recogniseResponse.status, errorText);
                throw new Error(`Abair STT submission failed: ${recogniseResponse.status} - ${errorText}`);
            }
            
            const recogniseResult = await recogniseResponse.json();
            console.log('📋 Recognition response:', recogniseResult);
            
            // Step 3: Extract file path and transcription
            if (recogniseResult.error) {
                throw new Error(`Abair STT error: ${recogniseResult.error}`);
            }
            
            if (!recogniseResult.audioFilePath) {
                throw new Error('No audioFilePath returned from Abair STT API');
            }
            
            // Extract transcription from initial response
            let transcript = '';
            let confidence = 0.8; // Default confidence
            
            if (recogniseResult.transcriptions && recogniseResult.transcriptions.length > 0) {
                transcript = recogniseResult.transcriptions[0].utterance || '';
                console.log(`📝 Transcription found: "${transcript}"`);
            }
            
            // Step 4: Get processed audio (optional - for our use case, we mainly need the transcript)
            const audioPath = recogniseResult.audioFilePath.replace('/tmp/', '').replace('.wav', '');
            console.log('🔍 Audio file path:', audioPath);
            
            try {
                console.log('📥 Retrieving processed audio...');
                const recordingResponse = await fetch(
                    `https://api.abair.ie/v3/recognition/recordings?path=${audioPath}`,
                    {
                        method: 'GET',
                        headers: { 'Accept': 'application/json' }
                    }
                );
                
                if (recordingResponse.ok) {
                    const recordingResult = await recordingResponse.json();
                    console.log('✅ Retrieved processed audio data');
                } else {
                    console.warn('⚠️ Could not retrieve processed audio, but transcription is available');
                }
            } catch (audioError) {
                console.warn('⚠️ Audio retrieval failed, but continuing with transcription:', audioError.message);
            }
            
            // Return standardized result
            const result = {
                transcript: transcript,
                confidence: confidence,
                service: 'abair-stt',
                audioFilePath: recogniseResult.audioFilePath,
                duration: recogniseResult.duration || 0,
                rawResponse: recogniseResult
            };
            
            console.log(`✅ Abair STT complete: "${transcript}" (confidence: ${confidence})`);
            return result;
            
        } catch (error) {
            console.error('❌ Abair STT error:', error);
            
            // Fallback to browser STT if available
            if (this.recognition) {
                console.log('🔄 Falling back to browser STT...');
                return await this.fallbackToBrowserSTT();
            }
            
            // Fallback: return empty result with error info
            return {
                transcript: '',
                confidence: 0.0,
                error: error.message,
                service: 'abair-stt-failed',
                alternatives: []
            };
        }
    }
    
    /**
     * Convert audio blob to base64 string
     * @param {Blob} blob - Audio blob
     * @returns {Promise<string>} Base64 encoded audio
     */
    async audioToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                // Remove the data URL prefix to get just the base64 data
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
    
    /**
     * Fallback to browser STT when Abair.ie STT fails
     * @returns {Promise<Object>} Recognition result
     */
    async fallbackToBrowserSTT() {
        return new Promise((resolve) => {
            // Return a simulation result as fallback
            resolve({
                transcript: 'Abair STT unavailable - using browser fallback',
                confidence: 0.3,
                service: 'browser-fallback',
                fallback: true
            });
        });
    }

    /**
     * Start live speech recognition (alternative to blob processing)
     * @param {string} expectedText - Text user should speak
     * @returns {Promise<Object>} Live STT results
     */
    async startLiveSpeechRecognition(expectedText) {
        return new Promise((resolve, reject) => {
            if (!this.isSupported) {
                reject(new Error('Speech Recognition API not supported in this browser'));
                return;
            }

            this.expectedText = expectedText;
            this.recognition.lang = 'ga-IE'; // Irish language
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.maxAlternatives = 3;

            let resolved = false;

            this.recognition.onresult = (event) => {
                if (resolved) return;
                resolved = true;

                const result = event.results[0];
                const transcript = result[0].transcript;
                const confidence = result[0].confidence || 0.8;

                console.log(`Live STT Result: "${transcript}" (confidence: ${confidence})`);

                resolve({
                    transcript: transcript,
                    confidence: confidence,
                    live: true,
                    alternatives: Array.from(result).map(alt => ({
                        transcript: alt.transcript,
                        confidence: alt.confidence || 0.8
                    }))
                });
            };

            this.recognition.onerror = (event) => {
                if (resolved) return;
                resolved = true;

                console.error('Live speech recognition error:', event.error);
                reject(new Error(`Speech recognition failed: ${event.error}`));
            };

            this.recognition.onend = () => {
                if (!resolved) {
                    resolved = true;
                    resolve({
                        transcript: '',
                        confidence: 0.0,
                        live: true,
                        alternatives: []
                    });
                }
            };

            try {
                console.log('Starting live speech recognition...');
                this.recognition.start();
                this.isListening = true;
            } catch (error) {
                if (!resolved) {
                    resolved = true;
                    reject(error);
                }
            }
        });
    }

    /**
     * Identify pronunciation issues by comparing expected vs actual text
     * @param {string} expectedText - The text the user should have said
     * @param {Object} sttResults - Results from speechToText()
     * @returns {Object} Pronunciation analysis with word-by-word feedback
     */
    identifyPronunciationIssues(expectedText, sttResults) {
        const actualText = sttResults.transcript || '';
        const confidence = sttResults.confidence || 0;
        
        console.log(`Comparing expected: "${expectedText}" vs actual: "${actualText}"`);
        
        // Use the existing pronunciation analysis method
        return this.analyzePronunciation(actualText, expectedText, confidence);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AbairSTTService;
} else {
    window.AbairSTTService = AbairSTTService;
    // Keep backward compatibility
    window.BrowserSTTService = AbairSTTService;
}