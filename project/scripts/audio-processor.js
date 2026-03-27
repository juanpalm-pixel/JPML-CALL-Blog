/**
 * Audio Recording and Processing
 * Handles microphone input, recording, and audio format conversion
 */

class AudioProcessor {
    constructor() {
        this.mediaRecorder = null;
        this.audioStream = null;
        this.audioChunks = [];
        this.isRecording = false;
        
        // Audio processing components
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.dataArray = null;
        this.levelMonitoringInterval = null;
        this.recordingStopResolver = null;
        
        // Default recording configuration
        this.recordingConfig = {
            mimeType: 'audio/webm;codecs=opus',
            audioBitsPerSecond: 128000
        };
        
        this.init();
    }

    /**
     * Initialize the audio processor
     */
    init() {
        console.log('Initializing Audio Processor...');
        this.checkBrowserSupport();
        
        // Update config with best supported format
        this.recordingConfig.mimeType = this.getBestSupportedFormat();
    }

    /**
     * Check browser support for audio recording
     */
    checkBrowserSupport() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Browser does not support audio recording');
        }
        
        if (!window.MediaRecorder) {
            throw new Error('MediaRecorder API not supported');
        }
        
        console.log('Browser audio support verified');
    }

    /**
     * Request microphone access
     * @returns {Promise<MediaStream>} - Audio stream
     */
    async requestMicrophoneAccess() {
        try {
            console.log('Requesting microphone access...');
            
            const constraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 48000
                }
            };

            this.audioStream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('Microphone access granted');
            
            return this.audioStream;

        } catch (error) {
            console.error('Microphone access error:', error);
            throw new Error(`Failed to access microphone: ${error.message}`);
        }
    }

    /**
     * Start audio recording
     * @param {Object} options - Recording options
     * @returns {Promise<void>}
     */
    async startRecording(options = {}) {
        return new Promise(async (resolve, reject) => {
            try {
                if (this.isRecording) {
                    console.warn('Recording already in progress');
                    resolve();
                    return;
                }

                if (!this.audioStream) {
                    await this.requestMicrophoneAccess();
                }

                console.log('Starting audio recording...');
                
                this.audioChunks = [];
                const config = { ...this.recordingConfig, ...options };
                
                this.mediaRecorder = new MediaRecorder(this.audioStream, config);
                
                this.mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        this.audioChunks.push(event.data);
                    }
                };

                this.mediaRecorder.onstart = () => {
                    this.isRecording = true;
                    console.log('Recording started');
                    resolve(); // Resolve when recording actually starts
                };

                this.mediaRecorder.onstop = () => {
                    this.isRecording = false;
                    console.log('Recording stopped');
                };

                this.mediaRecorder.onerror = (error) => {
                    console.error('MediaRecorder error:', error);
                    this.isRecording = false;
                    reject(new Error(`MediaRecorder error: ${error.error || error}`));
                };

                this.mediaRecorder.start();

            } catch (error) {
                console.error('Recording start error:', error);
                reject(new Error(`Failed to start recording: ${error.message}`));
            }
        });
    }

    /**
     * Stop audio recording
     * @returns {Promise<Blob>} - Recorded audio blob
     */
    async stopRecording() {
        return new Promise((resolve, reject) => {
            if (!this.isRecording || !this.mediaRecorder) {
                reject(new Error('No recording in progress'));
                return;
            }

            console.log('Stopping audio recording...');

            this.mediaRecorder.onstop = () => {
                try {
                    const audioBlob = new Blob(this.audioChunks, { 
                        type: this.recordingConfig.mimeType 
                    });
                    
                    this.audioChunks = [];
                    this.isRecording = false;
                    
                    console.log(`Recording completed: ${audioBlob.size} bytes`);
                    
                    // Resolve any waiting promises
                    if (this.recordingStopResolver) {
                        this.recordingStopResolver(audioBlob);
                        this.recordingStopResolver = null;
                    }
                    
                    resolve(audioBlob);
                    
                } catch (error) {
                    reject(error);
                }
            };

            this.mediaRecorder.stop();
        });
    }

    /**
     * Convert audio blob to WAV format for Google Cloud STT
     * @param {Blob} audioBlob - Input audio blob
     * @param {Object} options - Conversion options
     * @returns {Promise<Blob>} - WAV audio blob (16kHz, mono, LINEAR16)
     */
    async convertToWAV(audioBlob, options = {}) {
        try {
            console.log('Converting audio to WAV format for STT...');
            
            const targetSampleRate = options.sampleRate || 16000;
            const targetChannels = options.channels || 1;
            
            // Create audio context
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Convert blob to array buffer
            const arrayBuffer = await audioBlob.arrayBuffer();
            
            // Decode the audio data
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
            // Resample and convert to mono if needed
            const processedBuffer = await this.resampleAudio(
                audioBuffer, 
                targetSampleRate, 
                targetChannels
            );
            
            // Convert to WAV format
            const wavBlob = this.audioBufferToWAV(processedBuffer);
            
            console.log(`Audio converted to WAV: ${wavBlob.size} bytes, ${targetSampleRate}Hz, ${targetChannels} channel(s)`);
            return wavBlob;

        } catch (error) {
            console.error('Audio conversion error:', error);
            throw new Error(`Failed to convert audio to WAV: ${error.message}`);
        }
    }

    /**
     * Resample audio to target sample rate and channels
     * @param {AudioBuffer} audioBuffer - Input audio buffer
     * @param {number} targetSampleRate - Target sample rate
     * @param {number} targetChannels - Target number of channels
     * @returns {AudioBuffer} - Resampled audio buffer
     */
    async resampleAudio(audioBuffer, targetSampleRate, targetChannels) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // If already at target specs, return original
        if (audioBuffer.sampleRate === targetSampleRate && 
            audioBuffer.numberOfChannels === targetChannels) {
            return audioBuffer;
        }
        
        // Create offline audio context for processing
        const offlineContext = new OfflineAudioContext(
            targetChannels,
            Math.round(audioBuffer.length * targetSampleRate / audioBuffer.sampleRate),
            targetSampleRate
        );
        
        // Create source node
        const source = offlineContext.createBufferSource();
        source.buffer = audioBuffer;
        
        // If converting to mono, add channel merger
        if (targetChannels === 1 && audioBuffer.numberOfChannels > 1) {
            const merger = offlineContext.createChannelMerger(1);
            const splitter = offlineContext.createChannelSplitter(audioBuffer.numberOfChannels);
            
            source.connect(splitter);
            splitter.connect(merger, 0, 0);
            if (audioBuffer.numberOfChannels > 1) {
                splitter.connect(merger, 1, 0);
            }
            merger.connect(offlineContext.destination);
        } else {
            source.connect(offlineContext.destination);
        }
        
        source.start(0);
        
        return await offlineContext.startRendering();
    }

    /**
     * Convert AudioBuffer to WAV blob
     * @param {AudioBuffer} audioBuffer - Audio buffer to convert
     * @returns {Blob} - WAV audio blob
     */
    audioBufferToWAV(audioBuffer) {
        const length = audioBuffer.length;
        const numberOfChannels = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;
        const bytesPerSample = 2; // 16-bit
        
        const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * bytesPerSample);
        const view = new DataView(arrayBuffer);
        
        // WAV header
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };
        
        let offset = 0;
        
        // RIFF chunk descriptor
        writeString(offset, 'RIFF'); offset += 4;
        view.setUint32(offset, arrayBuffer.byteLength - 8, true); offset += 4;
        writeString(offset, 'WAVE'); offset += 4;
        
        // fmt sub-chunk
        writeString(offset, 'fmt '); offset += 4;
        view.setUint32(offset, 16, true); offset += 4; // SubChunk1Size
        view.setUint16(offset, 1, true); offset += 2; // AudioFormat (PCM)
        view.setUint16(offset, numberOfChannels, true); offset += 2;
        view.setUint32(offset, sampleRate, true); offset += 4;
        view.setUint32(offset, sampleRate * numberOfChannels * bytesPerSample, true); offset += 4; // ByteRate
        view.setUint16(offset, numberOfChannels * bytesPerSample, true); offset += 2; // BlockAlign
        view.setUint16(offset, 16, true); offset += 2; // BitsPerSample
        
        // data sub-chunk
        writeString(offset, 'data'); offset += 4;
        view.setUint32(offset, length * numberOfChannels * bytesPerSample, true); offset += 4;
        
        // Write PCM data
        for (let channel = 0; channel < numberOfChannels; channel++) {
            const channelData = audioBuffer.getChannelData(channel);
            let dataOffset = offset + channel * bytesPerSample;
            
            for (let i = 0; i < length; i++) {
                const sample = Math.max(-1, Math.min(1, channelData[i]));
                view.setInt16(dataOffset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
                dataOffset += numberOfChannels * bytesPerSample;
            }
        }
        
        return new Blob([arrayBuffer], { type: 'audio/wav' });
    }

    /**
     * Get audio level/volume for visualization using Web Audio API
     * @returns {Promise<number>} - Audio level (0-100)
     */
    async getAudioLevel() {
        if (!this.audioStream) {
            return 0;
        }

        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.analyser = this.audioContext.createAnalyser();
                this.source = this.audioContext.createMediaStreamSource(this.audioStream);
                
                this.analyser.fftSize = 256;
                this.analyser.smoothingTimeConstant = 0.3;
                this.source.connect(this.analyser);
                
                this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            }
            
            this.analyser.getByteFrequencyData(this.dataArray);
            
            // Calculate average level
            let sum = 0;
            for (let i = 0; i < this.dataArray.length; i++) {
                sum += this.dataArray[i];
            }
            
            const average = sum / this.dataArray.length;
            const level = Math.round((average / 255) * 100);
            
            return Math.min(100, Math.max(0, level));

        } catch (error) {
            console.error('Audio level detection error:', error);
            return 0;
        }
    }

    /**
     * Start continuous audio level monitoring for UI feedback
     * @param {Function} callback - Callback function to receive level updates
     * @returns {number} - Interval ID for stopping monitoring
     */
    startAudioLevelMonitoring(callback) {
        if (this.levelMonitoringInterval) {
            clearInterval(this.levelMonitoringInterval);
        }
        
        this.levelMonitoringInterval = setInterval(async () => {
            const level = await this.getAudioLevel();
            callback(level);
        }, 100); // Update every 100ms
        
        return this.levelMonitoringInterval;
    }

    /**
     * Stop audio level monitoring
     */
    stopAudioLevelMonitoring() {
        if (this.levelMonitoringInterval) {
            clearInterval(this.levelMonitoringInterval);
            this.levelMonitoringInterval = null;
        }
    }

    /**
     * Apply audio filters/processing using Web Audio API
     * @param {Blob} audioBlob - Input audio
     * @param {Object} filters - Filter configuration
     * @returns {Promise<Blob>} - Processed audio
     */
    async applyAudioFilters(audioBlob, filters = {}) {
        try {
            console.log('Applying audio filters...', filters);
            
            // Convert blob to audio buffer for processing
            const arrayBuffer = await audioBlob.arrayBuffer();
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
            // Create offline context for processing
            const offlineContext = new OfflineAudioContext(
                audioBuffer.numberOfChannels,
                audioBuffer.length,
                audioBuffer.sampleRate
            );
            
            // Create source
            const source = offlineContext.createBufferSource();
            source.buffer = audioBuffer;
            
            let lastNode = source;
            
            // Apply noise reduction (high-pass filter)
            if (filters.noiseReduction) {
                const highpass = offlineContext.createBiquadFilter();
                highpass.type = 'highpass';
                highpass.frequency.value = filters.noiseReduction.cutoff || 100;
                highpass.Q.value = filters.noiseReduction.Q || 1;
                
                lastNode.connect(highpass);
                lastNode = highpass;
            }
            
            // Apply gain normalization
            if (filters.normalize) {
                const gainNode = offlineContext.createGain();
                gainNode.gain.value = filters.normalize.gain || 1.0;
                
                lastNode.connect(gainNode);
                lastNode = gainNode;
            }
            
            // Apply compressor for dynamic range control
            if (filters.compress) {
                const compressor = offlineContext.createDynamicsCompressor();
                compressor.threshold.value = filters.compress.threshold || -24;
                compressor.knee.value = filters.compress.knee || 30;
                compressor.ratio.value = filters.compress.ratio || 12;
                compressor.attack.value = filters.compress.attack || 0.003;
                compressor.release.value = filters.compress.release || 0.25;
                
                lastNode.connect(compressor);
                lastNode = compressor;
            }
            
            lastNode.connect(offlineContext.destination);
            source.start(0);
            
            // Process audio
            const processedBuffer = await offlineContext.startRendering();
            
            // Convert back to WAV blob
            const processedBlob = this.audioBufferToWAV(processedBuffer);
            
            console.log('Audio filtering completed');
            return processedBlob;

        } catch (error) {
            console.error('Audio filtering error:', error);
            throw new Error(`Failed to apply audio filters: ${error.message}`);
        }
    }

    /**
     * Analyze audio quality and characteristics
     * @param {Blob} audioBlob - Audio to analyze
     * @returns {Promise<Object>} - Analysis results
     */
    async analyzeAudioQuality(audioBlob) {
        try {
            console.log('Analyzing audio quality...');
            
            const arrayBuffer = await audioBlob.arrayBuffer();
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
            const analysis = {
                duration: audioBuffer.duration,
                sampleRate: audioBuffer.sampleRate,
                channels: audioBuffer.numberOfChannels,
                size: audioBlob.size,
                quality: 'unknown',
                silenceRatio: 0,
                averageLevel: 0,
                maxLevel: 0,
                recommendations: []
            };
            
            // Analyze audio levels
            const channelData = audioBuffer.getChannelData(0);
            let sum = 0;
            let max = 0;
            let silentSamples = 0;
            const silenceThreshold = 0.01;
            
            for (let i = 0; i < channelData.length; i++) {
                const value = Math.abs(channelData[i]);
                sum += value;
                max = Math.max(max, value);
                
                if (value < silenceThreshold) {
                    silentSamples++;
                }
            }
            
            analysis.averageLevel = sum / channelData.length;
            analysis.maxLevel = max;
            analysis.silenceRatio = silentSamples / channelData.length;
            
            // Quality assessment
            if (analysis.duration < 0.5) {
                analysis.quality = 'too_short';
                analysis.recommendations.push('Recording is too short. Speak for at least 0.5 seconds.');
            } else if (analysis.silenceRatio > 0.8) {
                analysis.quality = 'too_quiet';
                analysis.recommendations.push('Audio is too quiet. Speak louder or move closer to the microphone.');
            } else if (analysis.averageLevel > 0.5) {
                analysis.quality = 'too_loud';
                analysis.recommendations.push('Audio is too loud. Speak softer or move away from the microphone.');
            } else if (analysis.averageLevel < 0.05) {
                analysis.quality = 'low_volume';
                analysis.recommendations.push('Audio volume is low. Consider speaking louder.');
            } else {
                analysis.quality = 'good';
            }
            
            console.log('Audio analysis completed:', analysis);
            return analysis;
            
        } catch (error) {
            console.error('Audio analysis error:', error);
            return {
                quality: 'error',
                error: error.message,
                recommendations: ['Unable to analyze audio quality.']
            };
        }
    }

    /**
     * Release microphone resources and cleanup
     */
    cleanup() {
        console.log('Cleaning up audio resources...');
        
        if (this.isRecording) {
            this.stopRecording();
        }

        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => {
                track.stop();
            });
            this.audioStream = null;
        }

        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
            this.audioContext = null;
        }

        this.stopAudioLevelMonitoring();
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.analyser = null;
        this.source = null;
        this.dataArray = null;
    }

    /**
     * Get available audio input devices
     * @returns {Promise<Array>} - List of audio input devices
     */
    async getAudioInputDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = devices.filter(device => device.kind === 'audioinput');
            
            console.log(`Found ${audioInputs.length} audio input devices`);
            return audioInputs;

        } catch (error) {
            console.error('Error enumerating devices:', error);
            return [];
        }
    }

    /**
     * Create audio URL for playback
     * @param {Blob} audioBlob - Audio blob to create URL for
     * @returns {string} - Object URL for audio
     */
    createAudioURL(audioBlob) {
        return URL.createObjectURL(audioBlob);
    }

    /**
     * Revoke audio URL to free memory
     * @param {string} audioURL - Audio URL to revoke
     */
    revokeAudioURL(audioURL) {
        URL.revokeObjectURL(audioURL);
    }

    /**
     * Record audio with automatic stopping after duration
     * @param {number} maxDuration - Maximum recording duration in seconds
     * @param {Function} onLevelUpdate - Callback for audio level updates
     * @returns {Promise<Blob>} - Recorded audio blob
     */
    async recordWithTimeout(maxDuration = 30, onLevelUpdate = null) {
        try {
            console.log(`Starting recording with ${maxDuration}s timeout...`);
            
            await this.startRecording();
            
            // Start level monitoring if callback provided
            let levelMonitor = null;
            if (onLevelUpdate) {
                levelMonitor = this.startAudioLevelMonitoring(onLevelUpdate);
            }
            
            // Set timeout for automatic stopping
            const timeoutPromise = new Promise((resolve) => {
                setTimeout(() => {
                    console.log('Recording timeout reached');
                    resolve(null);
                }, maxDuration * 1000);
            });
            
            // Wait for either manual stop or timeout
            const result = await Promise.race([
                this.waitForRecordingStop(),
                timeoutPromise
            ]);
            
            // Stop level monitoring
            if (levelMonitor) {
                this.stopAudioLevelMonitoring();
            }
            
            // If timeout occurred, stop recording
            if (result === null && this.isRecording) {
                const audioBlob = await this.stopRecording();
                console.log('Recording stopped by timeout');
                return audioBlob;
            }
            
            return result;
            
        } catch (error) {
            console.error('Recording with timeout error:', error);
            throw error;
        }
    }

    /**
     * Wait for recording to be manually stopped
     * @returns {Promise<Blob>} - Recorded audio blob
     */
    waitForRecordingStop() {
        return new Promise((resolve, reject) => {
            if (!this.isRecording) {
                reject(new Error('No recording in progress'));
                return;
            }
            
            this.recordingStopResolver = resolve;
        });
    }

    /**
     * Validate audio format support
     * @param {string} mimeType - MIME type to check
     * @returns {boolean} - Whether format is supported
     */
    isFormatSupported(mimeType) {
        return MediaRecorder.isTypeSupported(mimeType);
    }

    /**
     * Get best supported recording format
     * @returns {string} - Best supported MIME type
     */
    getBestSupportedFormat() {
        const formats = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/ogg',
            'audio/mp4',
            'audio/wav'
        ];
        
        for (const format of formats) {
            if (this.isFormatSupported(format)) {
                console.log(`Using audio format: ${format}`);
                return format;
            }
        }
        
        console.warn('No optimal audio format found, using default');
        return 'audio/webm';
    }

    /**
     * Update recording configuration
     * @param {Object} config - New configuration options
     */
    updateConfig(config) {
        this.recordingConfig = { ...this.recordingConfig, ...config };
        console.log('Audio configuration updated:', this.recordingConfig);
    }
}

// Export for use in other modules
window.AudioProcessor = AudioProcessor;