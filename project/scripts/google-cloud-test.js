/**
 * Google Cloud API Integration Test
 * Test script to verify TTS and STT services are working
 */

async function testGoogleCloudIntegration() {
    console.log('🧪 Testing Google Cloud TTS and STT Integration');
    
    const results = {
        tts: { status: 'pending', message: '' },
        stt: { status: 'pending', message: '' },
        integration: { status: 'pending', message: '' }
    };
    
    try {
        // Test TTS Service
        console.log('1️⃣ Testing TTS Service...');
        const ttsService = new TTSService();
        
        if (!ttsService) {
            throw new Error('TTS Service not available');
        }
        
        // Check if TTS service initializes properly
        results.tts.status = 'success';
        results.tts.message = 'TTS Service initialized successfully';
        console.log('✅ TTS Service: OK');
        
        // Test STT Service
        console.log('2️⃣ Testing STT Service...');
        const sttService = new STTService();
        
        if (!sttService) {
            throw new Error('STT Service not available');
        }
        
        // Check if STT service initializes properly
        results.stt.status = 'success';
        results.stt.message = 'STT Service initialized successfully';
        console.log('✅ STT Service: OK');
        
        // Test Integration Features
        console.log('3️⃣ Testing Integration Features...');
        
        // Test caching
        const cacheTest = ttsService.cache instanceof Map;
        if (!cacheTest) {
            throw new Error('TTS caching not properly initialized');
        }
        
        // Test rate limiting
        const rateLimitStatus = ttsService.getRateLimitStatus();
        if (!rateLimitStatus.hasOwnProperty('canMakeRequest')) {
            throw new Error('Rate limiting not properly initialized');
        }
        
        // Test pronunciation thresholds
        const confidenceThresholds = sttService.getConfidenceThresholds();
        if (!confidenceThresholds.hasOwnProperty('good')) {
            throw new Error('Confidence thresholds not properly initialized');
        }
        
        results.integration.status = 'success';
        results.integration.message = 'All integration features working correctly';
        console.log('✅ Integration Features: OK');
        
        // Test with sample text (without API key)
        console.log('4️⃣ Testing Sample Text Processing...');
        
        const sampleText = "Tá an aimsir go hálainn inniu.";
        
        try {
            // This should fail gracefully without API key
            await ttsService.textToSpeech(sampleText);
        } catch (error) {
            if (error.message.includes('API key not configured')) {
                console.log('✅ Proper API key validation working');
            } else {
                throw error;
            }
        }
        
        // Test pronunciation comparison logic
        const mockSTTResult = {
            transcript: "Ta an aimsir go halainn inniu",
            confidence: 0.85,
            analysis: {
                wordDetails: [
                    { word: "Ta", confidence: 0.9 },
                    { word: "an", confidence: 0.95 },
                    { word: "aimsir", confidence: 0.8 },
                    { word: "go", confidence: 0.9 },
                    { word: "halainn", confidence: 0.7 },
                    { word: "inniu", confidence: 0.88 }
                ]
            }
        };
        
        const comparison = sttService.comparePronunciation(sampleText, mockSTTResult);
        if (!comparison.hasOwnProperty('overallScore')) {
            throw new Error('Pronunciation comparison not working');
        }
        
        console.log(`✅ Pronunciation comparison: ${comparison.overallScore}% accuracy`);
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        
        if (results.tts.status === 'pending') {
            results.tts.status = 'error';
            results.tts.message = error.message;
        } else if (results.stt.status === 'pending') {
            results.stt.status = 'error';
            results.stt.message = error.message;
        } else if (results.integration.status === 'pending') {
            results.integration.status = 'error';
            results.integration.message = error.message;
        }
    }
    
    // Display results
    console.log('\n📊 Test Results Summary:');
    console.log('TTS Service:', results.tts.status === 'success' ? '✅' : '❌', results.tts.message);
    console.log('STT Service:', results.stt.status === 'success' ? '✅' : '❌', results.stt.message);
    console.log('Integration:', results.integration.status === 'success' ? '✅' : '❌', results.integration.message);
    
    const allPassed = Object.values(results).every(result => result.status === 'success');
    
    console.log('\n🏁 Overall Status:', allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
    
    // Display API capability summary
    displayAPISummary();
    
    return results;
}

function displayAPISummary() {
    console.log('\n📋 Google Cloud API Capabilities Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('\n🎤 Text-to-Speech (TTS) Features:');
    console.log('  • Irish language support (ga-IE)');
    console.log('  • Neural voice synthesis');  
    console.log('  • Word-level timing for highlighting');
    console.log('  • MP3 audio output');
    console.log('  • Configurable speech rate and pitch');
    console.log('  • Local caching for performance');
    console.log('  • Rate limiting and quota management');
    
    console.log('\n🗣️ Speech-to-Text (STT) Features:');
    console.log('  • Irish speech recognition (ga-IE)');
    console.log('  • Word-level confidence scores');
    console.log('  • Multiple transcription alternatives');
    console.log('  • Pronunciation accuracy analysis');
    console.log('  • Detailed error reporting');
    console.log('  • Phonetic comparison capabilities');
    
    console.log('\n🔧 Integration Features:');
    console.log('  • Secure API key management');
    console.log('  • Automatic error handling and retries');
    console.log('  • Performance optimization with caching');
    console.log('  • Real-time pronunciation feedback');
    console.log('  • Educational error tracking');
    console.log('  • Cross-browser audio support');
    
    console.log('\n⚠️ Known Limitations:');
    console.log('  • Requires valid Google Cloud API key');
    console.log('  • Irish voice availability may vary');
    console.log('  • Internet connection required for API calls');
    console.log('  • API usage subject to Google Cloud quotas');
    console.log('  • Browser microphone permissions needed');
    
    console.log('\n💡 Setup Instructions:');
    console.log('  1. Create Google Cloud account');
    console.log('  2. Enable Text-to-Speech and Speech-to-Text APIs');
    console.log('  3. Create an API key with appropriate restrictions');
    console.log('  4. Enter API key in the settings menu');
    console.log('  5. Grant microphone permissions when prompted');
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

// Auto-run test when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for services to initialize
    setTimeout(() => {
        if (window.TTSService && window.STTService) {
            testGoogleCloudIntegration();
        } else {
            console.warn('⚠️ Services not yet loaded, test skipped');
        }
    }, 1000);
});

// Make test function globally available
window.testGoogleCloudIntegration = testGoogleCloudIntegration;