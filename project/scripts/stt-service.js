/**
 * Google Cloud Speech-to-Text Service
 * Handles conversion of user pronunciation to text for Irish language analysis
 */

class STTService {
    constructor() {
        this.apiKey = null;
        this.baseUrl = 'https://speech.googleapis.com/v1/speech:recognize';
        this.streamingUrl = 'wss://speech.googleapis.com/v1/speech:streamingrecognize';
        
        this.recognitionConfig = {
            encoding: 'WEBM_OPUS',
            sampleRateHertz: 48000,
            languageCode: 'ga-IE', // Irish locale
            maxAlternatives: 3,
            enableWordTimeOffsets: true,
            enableWordConfidence: true,
            enableAutomaticPunctuation: true,
            model: 'latest_long' // Best model for Irish
        };
        
        // Pronunciation analysis thresholds
        this.confidenceThresholds = {
            excellent: 0.9,
            good: 0.7,
            fair: 0.5,
            poor: 0.3
        };
        
        // Rate limiting
        this.requestCount = 0;
        this.requestLimit = 30; // per minute for STT
        this.requestWindow = 60000;
        this.requestTimestamps = [];
        
        // Caching for analysis results
        this.cache = new Map();
        this.cachePrefix = 'stt_cache_';
        
        this.init();
    }

    /**
     * Initialize the STT service
     */
    async init() {
        console.log('Initializing Google Cloud STT Service...');
        try {
            await this.loadApiKey();
            console.log('STT Service initialized successfully');
        } catch (error) {
            console.error('Failed to initialize STT Service:', error);
        }
    }

    /**
     * Load API key from storage or user input
     */
    async loadApiKey() {
        // Try to get from localStorage first
        this.apiKey = localStorage.getItem('ereader-stt-key');
        
        if (!this.apiKey) {
            this.apiKey = await this.promptForApiKey();
        }
        
        if (this.apiKey) {
            localStorage.setItem('ereader-stt-key', this.apiKey);
            console.log('Google Cloud API key loaded for STT');
        } else {
            console.warn('No Google Cloud API key provided for STT');
        }
    }

    /**
     * Prompt user for API key
     */
    async promptForApiKey() {
        const key = prompt(
            'Please enter your Google Cloud API key for Speech-to-Text:\n\n' +
            'To get an API key:\n' +
            '1. Go to Google Cloud Console\n' +
            '2. Enable Cloud Speech-to-Text API\n' +
            '3. Create credentials (API key)\n' +
            '4. Restrict the key to Speech-to-Text API\n\n' +
            'Enter your API key:'
        );
        return key ? key.trim() : null;
    }

     /**
     * Update recognition configuration for different audio formats
     * @param {string} audioFormat - Audio format ('webm', 'wav', 'ogg', etc.)
     * @param {number} sampleRate - Sample rate in Hz (default: 16000 for WAV)
     */
    updateConfigForFormat(audioFormat, sampleRate = null) {
        switch(audioFormat.toLowerCase()) {
            case 'wav':
                this.recognitionConfig.encoding = 'LINEAR16';
                this.recognitionConfig.sampleRateHertz = sampleRate || 16000;
                break;
            case 'webm':
            case 'webm_opus':
                this.recognitionConfig.encoding = 'WEBM_OPUS';
                this.recognitionConfig.sampleRateHertz = sampleRate || 48000;
                break;
            case 'ogg':
            case 'ogg_opus':
                this.recognitionConfig.encoding = 'OGG_OPUS';
                this.recognitionConfig.sampleRateHertz = sampleRate || 48000;
                break;
            case 'mp3':
                this.recognitionConfig.encoding = 'MP3';
                this.recognitionConfig.sampleRateHertz = sampleRate || 16000;
                break;
            case 'flac':
                this.recognitionConfig.encoding = 'FLAC';
                this.recognitionConfig.sampleRateHertz = sampleRate || 16000;
                break;
            default:
                console.warn(`Unknown audio format: ${audioFormat}, using WEBM_OPUS`);
                this.recognitionConfig.encoding = 'WEBM_OPUS';
                this.recognitionConfig.sampleRateHertz = sampleRate || 48000;
        }
        
        console.log(`STT configuration updated for ${audioFormat}:`, {
            encoding: this.recognitionConfig.encoding,
            sampleRate: this.recognitionConfig.sampleRateHertz
        });
    }

    /**
     * Convert speech to text with detailed analysis
     * @param {Blob} audioBlob - Audio blob to transcribe
     * @param {Object} options - Additional options for STT
     * @returns {Promise<Object>} - Transcription results with analysis
     */
    async speechToText(audioBlob, options = {}) {
        try {
            console.log('Converting speech to text...');
            
            if (!this.apiKey) {
                throw new Error('Google Cloud API key not configured');
            }

            // Check rate limiting
            if (!this.checkRateLimit()) {
                throw new Error('Rate limit exceeded. Please wait before making more requests.');
            }

            // Convert blob to base64
            const audioData = await this.blobToBase64(audioBlob);
            
            const requestBody = {
                config: { ...this.recognitionConfig, ...options.config },
                audio: {
                    content: audioData
                }
            };

            console.log('Making STT API request...');
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
            this.recordRequest();

            // Process and enhance the results
            const enhancedResults = this.enhanceRecognitionResults(data);
            console.log('STT conversion successful');
            
            return enhancedResults;

        } catch (error) {
            console.error('STT Error:', error);
            if (error.message.includes('API key')) {
                // Clear invalid API key
                localStorage.removeItem('google_cloud_api_key');
                this.apiKey = null;
            }
            throw new Error(`Speech-to-text conversion failed: ${error.message}`);
        }
    }

    /**
     * Enhance recognition results with additional analysis
     * @param {Object} rawResults - Raw API response
     * @returns {Object} - Enhanced results
     */
    enhanceRecognitionResults(rawResults) {
        if (!rawResults.results || rawResults.results.length === 0) {
            return {
                transcript: '',
                confidence: 0,
                words: [],
                alternatives: [],
                analysis: {
                    overallQuality: 'poor',
                    wordCount: 0,
                    avgConfidence: 0
                }
            };
        }

        const primary = rawResults.results[0].alternatives[0];
        const words = primary.words || [];
        
        // Calculate metrics
        const avgConfidence = words.length > 0 
            ? words.reduce((sum, word) => sum + (word.confidence || 0), 0) / words.length
            : primary.confidence || 0;

        const analysis = {
            overallQuality: this.getQualityRating(avgConfidence),
            wordCount: words.length,
            avgConfidence: avgConfidence,
            lowConfidenceWords: words.filter(word => (word.confidence || 0) < this.confidenceThresholds.fair),
            wordDetails: words.map(word => ({
                word: word.word,
                confidence: word.confidence || 0,
                startTime: word.startTime,
                endTime: word.endTime,
                quality: this.getQualityRating(word.confidence || 0)
            }))
        };

        return {
            transcript: primary.transcript || '',
            confidence: avgConfidence,
            words: words,
            alternatives: rawResults.results[0].alternatives.slice(1), // Additional alternatives
            analysis: analysis,
            rawResults: rawResults
        };
    }

    /**
     * Identify pronunciation issues based on confidence scores and patterns
     * @param {Array} expectedWords - Expected words
     * @param {Array} wordDetails - Word confidence details from STT
     * @returns {Array} - Pronunciation issues
     */
    identifyPronunciationIssues(expectedWords, wordDetails) {
        const issues = [];
        
        wordDetails.forEach((detail, index) => {
            if (detail.confidence < this.confidenceThresholds.fair) {
                issues.push({
                    word: detail.word,
                    expectedWord: expectedWords[index] || '',
                    confidence: detail.confidence,
                    issue: this.categorizePronunciationIssue(detail.confidence),
                    position: index,
                    startTime: detail.startTime,
                    endTime: detail.endTime
                });
            }
        });
        
        return issues;
    }

    /**
     * Categorize pronunciation issue based on confidence level
     * @param {number} confidence - Confidence score
     * @returns {string} - Issue category
     */
    categorizePronunciationIssue(confidence) {
        if (confidence < this.confidenceThresholds.poor) {
            return 'unclear_pronunciation';
        } else if (confidence < this.confidenceThresholds.fair) {
            return 'pronunciation_needs_improvement';
        } else if (confidence < this.confidenceThresholds.good) {
            return 'slight_pronunciation_issue';
        }
        return 'good_pronunciation';
    }

    /**
     * Generate feedback based on comparison results
     * @param {Object} comparison - Comparison results
     * @returns {string} - Feedback message
     */
    generateFeedback(comparison) {
        const score = comparison.overallScore;
        
        if (score >= 90) {
            return "Excellent pronunciation! Your Irish is very clear.";
        } else if (score >= 80) {
            return "Good pronunciation with minor areas for improvement.";
        } else if (score >= 70) {
            return "Fair pronunciation. Focus on clarity and specific sounds.";
        } else if (score >= 60) {
            return "Pronunciation needs practice. Try speaking more slowly.";
        } else {
            return "Pronunciation requires significant improvement. Practice individual words.";
        }
    }

    /**
     * Generate specific suggestions for improvement
     * @param {Object} comparison - Comparison results
     * @returns {Array} - Improvement suggestions
     */
    generateSuggestions(comparison) {
        const suggestions = [];
        
        // Suggestions based on error types
        if (comparison.analysis.substitutions.length > 0) {
            suggestions.push("Practice the specific words that were misrecognized: " + 
                comparison.analysis.substitutions.map(sub => sub.expected).join(', '));
        }
        
        if (comparison.analysis.pronunciation_issues.length > 0) {
            const lowConfWords = comparison.analysis.pronunciation_issues
                .map(issue => issue.word).join(', ');
            suggestions.push(`Focus on pronouncing these words more clearly: ${lowConfWords}`);
        }
        
        if (comparison.confidence < this.confidenceThresholds.good) {
            suggestions.push("Speak more slowly and clearly to improve recognition accuracy.");
        }
        
        if (comparison.sequenceAccuracy < 0.8) {
            suggestions.push("Practice reading the text in the correct word order.");
        }
        
        return suggestions;
    }

    /**
     * Get quality rating from confidence score
     * @param {number} confidence - Confidence score (0-1)
     * @returns {string} - Quality rating
     */
    getQualityRating(confidence) {
        if (confidence >= this.confidenceThresholds.excellent) return 'excellent';
        if (confidence >= this.confidenceThresholds.good) return 'good';
        if (confidence >= this.confidenceThresholds.fair) return 'fair';
        return 'poor';
    }

    /**
     * Start real-time streaming recognition (placeholder for future implementation)
     * @param {MediaStream} stream - Audio stream from microphone
     * @param {Function} onResult - Callback for partial results
     * @returns {Promise<void>}
     */
    async startStreamingRecognition(stream, onResult) {
        try {
            console.log('Starting streaming speech recognition...');
            
            // TODO: Implement WebSocket-based streaming recognition
            // This would connect to Google Cloud STT streaming API
            console.warn('Streaming recognition not yet implemented - use batch recognition instead');
            
            throw new Error('Streaming recognition not yet implemented');

        } catch (error) {
            console.error('Streaming recognition error:', error);
            throw new Error(`Streaming recognition failed: ${error.message}`);
        }
    }

    /**
     * Compare user pronunciation with expected text
     * @param {string} expectedText - The text that should have been spoken
     * @param {Object} sttResults - Results from speechToText method
     * @returns {Object} - Detailed comparison results with error analysis
     */
    comparePronunciation(expectedText, sttResults) {
        console.log(`Comparing pronunciation: expected "${expectedText}", actual "${sttResults.transcript}"`);
        
        const expectedWords = expectedText.toLowerCase().split(/\s+/);
        const actualWords = sttResults.transcript.toLowerCase().split(/\s+/);
        
        const comparison = {
            expectedText: expectedText,
            actualText: sttResults.transcript,
            overallAccuracy: 0,
            wordAccuracy: 0,
            sequenceAccuracy: 0,
            confidence: sttResults.confidence,
            wordErrors: [],
            analysis: {
                correctWords: 0,
                totalWords: expectedWords.length,
                substitutions: [],
                insertions: [],
                deletions: [],
                pronunciation_issues: []
            },
            overallScore: 0,
            feedback: '',
            suggestions: []
        };

        // Calculate word-level accuracy using Levenshtein distance approach
        const { errors, correctCount } = this.analyzeWordErrors(expectedWords, actualWords, sttResults.analysis.wordDetails);
        
        comparison.analysis.correctWords = correctCount;
        comparison.analysis.substitutions = errors.substitutions;
        comparison.analysis.insertions = errors.insertions;
        comparison.analysis.deletions = errors.deletions;
        
        // Calculate accuracies
        comparison.wordAccuracy = correctCount / expectedWords.length;
        comparison.sequenceAccuracy = this.calculateSequenceAccuracy(expectedWords, actualWords);
        comparison.overallAccuracy = (comparison.wordAccuracy + comparison.sequenceAccuracy + sttResults.confidence) / 3;
        
        // Identify pronunciation issues based on confidence scores
        comparison.analysis.pronunciation_issues = this.identifyPronunciationIssues(
            expectedWords, 
            sttResults.analysis.wordDetails
        );
        
        // Generate overall score (0-100)
        comparison.overallScore = Math.round(comparison.overallAccuracy * 100);
        
        // Generate feedback and suggestions
        comparison.feedback = this.generateFeedback(comparison);
        comparison.suggestions = this.generateSuggestions(comparison);
        
        return comparison;
    }

    /**
     * Analyze word-level errors between expected and actual text
     * @param {Array} expected - Expected words
     * @param {Array} actual - Actual words
     * @param {Array} wordDetails - Word confidence details
     * @returns {Object} - Error analysis
     */
    analyzeWordErrors(expected, actual, wordDetails) {
        const errors = {
            substitutions: [],
            insertions: [],
            deletions: []
        };
        
        let correctCount = 0;
        let i = 0, j = 0;
        
        while (i < expected.length && j < actual.length) {
            if (expected[i] === actual[j]) {
                correctCount++;
                i++;
                j++;
            } else {
                // Check if it's a substitution
                const nextExpectedMatch = actual.indexOf(expected[i], j + 1);
                const nextActualMatch = expected.indexOf(actual[j], i + 1);
                
                if (nextExpectedMatch === -1 && nextActualMatch === -1) {
                    // Substitution
                    errors.substitutions.push({
                        expected: expected[i],
                        actual: actual[j],
                        position: i,
                        confidence: wordDetails[j]?.confidence || 0
                    });
                    i++;
                    j++;
                } else if (nextExpectedMatch !== -1 && (nextActualMatch === -1 || nextExpectedMatch < nextActualMatch)) {
                    // Insertion in actual
                    errors.insertions.push({
                        word: actual[j],
                        position: j,
                        confidence: wordDetails[j]?.confidence || 0
                    });
                    j++;
                } else {
                    // Deletion from actual
                    errors.deletions.push({
                        word: expected[i],
                        position: i
                    });
                    i++;
                }
            }
        }
        
        // Handle remaining words
        while (i < expected.length) {
            errors.deletions.push({
                word: expected[i],
                position: i
            });
            i++;
        }
        
        while (j < actual.length) {
            errors.insertions.push({
                word: actual[j],
                position: j,
                confidence: wordDetails[j]?.confidence || 0
            });
            j++;
        }
        
        return { errors, correctCount };
    }

    /**
     * Calculate sequence accuracy (order preservation)
     * @param {Array} expected - Expected word sequence
     * @param {Array} actual - Actual word sequence
     * @returns {number} - Sequence accuracy (0-1)
     */
    calculateSequenceAccuracy(expected, actual) {
        if (expected.length === 0 && actual.length === 0) return 1;
        if (expected.length === 0 || actual.length === 0) return 0;
        
        // Find longest common subsequence
        const lcs = this.longestCommonSubsequence(expected, actual);
        return lcs.length / Math.max(expected.length, actual.length);
    }

    /**
     * Find longest common subsequence
     * @param {Array} seq1 - First sequence
     * @param {Array} seq2 - Second sequence
     * @returns {Array} - LCS
     */
    longestCommonSubsequence(seq1, seq2) {
        const m = seq1.length;
        const n = seq2.length;
        const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));
        
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (seq1[i - 1] === seq2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }
        
        // Reconstruct LCS
        const lcs = [];
        let i = m, j = n;
        while (i > 0 && j > 0) {
            if (seq1[i - 1] === seq2[j - 1]) {
                lcs.unshift(seq1[i - 1]);
                i--;
                j--;
            } else if (dp[i - 1][j] > dp[i][j - 1]) {
                i--;
            } else {
                j--;
            }
        }
        
        return lcs;
    }

    /**
     * Analyze pronunciation errors (legacy method - use comparePronunciation instead)
     * @param {Object} recognitionResult - STT recognition result
     * @param {string} expectedText - Expected text
     * @returns {Array} - Array of pronunciation errors
     */
    analyzeErrors(recognitionResult, expectedText) {
        console.log('Analyzing pronunciation errors...');
        
        // This method is now handled by the enhanced comparePronunciation method
        console.warn('This method is deprecated - use comparePronunciation for better analysis');
        
        return this.comparePronunciation(expectedText, recognitionResult).analysis.pronunciation_issues;
    }

    /**
     * Convert blob to base64
     * @param {Blob} blob - Blob to convert
     * @returns {Promise<string>} - Base64 string
     */
    async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Update recognition configuration
     * @param {Object} newConfig - New recognition configuration
     */
    updateRecognitionConfig(newConfig) {
        this.recognitionConfig = { ...this.recognitionConfig, ...newConfig };
        console.log('Recognition configuration updated:', this.recognitionConfig);
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
     * Get pronunciation confidence thresholds
     * @returns {Object} - Current thresholds
     */
    getConfidenceThresholds() {
        return { ...this.confidenceThresholds };
    }

    /**
     * Update pronunciation confidence thresholds
     * @param {Object} newThresholds - New threshold values
     */
    updateConfidenceThresholds(newThresholds) {
        this.confidenceThresholds = { ...this.confidenceThresholds, ...newThresholds };
        console.log('Confidence thresholds updated:', this.confidenceThresholds);
    }

    /**
     * Validate API key by making a test call
     */
    async validateApiKey() {
        if (!this.apiKey) return false;
        
        try {
            // Create a minimal test audio blob (silence)
            const testBlob = new Blob([new Uint8Array(1024)], { type: 'audio/webm' });
            await this.speechToText(testBlob);
            return true;
        } catch (error) {
            console.error('API key validation failed:', error);
            return false;
        }
    }
}

// Export for use in other modules
window.STTService = STTService;