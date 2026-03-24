// Quick verification test for Abair.ie API integration
async function verifyAbairIntegration() {
    console.log('=== Abair.ie Integration Verification ===');
    
    try {
        // Test 1: Check if we can reach Abair.ie metadata endpoint
        console.log('Testing Abair.ie metadata endpoint...');
        const metadataResponse = await fetch('https://api.abair.ie/v3/synthesis/metadata');
        
        if (metadataResponse.ok) {
            const metadata = await metadataResponse.json();
            console.log('✓ Metadata endpoint working');
            console.log(`  Available voices: ${metadata.voices ? metadata.voices.length : 'Unknown'}`);
        } else {
            console.log('✗ Metadata endpoint failed:', metadataResponse.status);
        }
        
        // Test 2: Check if we can synthesize Irish text
        console.log('\nTesting Irish text synthesis...');
        const testText = "Dia dhuit! Conas atá tú?";
        const synthUrl = new URL('https://api.abair.ie/v3/synthesis');
        synthUrl.searchParams.append('input', testText);
        synthUrl.searchParams.append('voice', 'ga_CO_snc_piper');
        
        const synthResponse = await fetch(synthUrl.toString());
        
        if (synthResponse.ok) {
            const synthData = await synthResponse.json();
            console.log('✓ Synthesis endpoint working');
            console.log(`  Response fields: ${Object.keys(synthData).join(', ')}`);
            
            // Check if we got audio data
            if (synthData.audioContent || synthData.audio || synthData.url) {
                console.log('✓ Audio data received');
            } else {
                console.log('⚠ No audio data in response');
            }
        } else {
            console.log('✗ Synthesis endpoint failed:', synthResponse.status);
        }
        
        // Test 3: Check browser Speech Recognition support
        console.log('\nTesting browser Speech Recognition...');
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (SpeechRecognition) {
            console.log('✓ Speech Recognition API available');
            
            const recognition = new SpeechRecognition();
            recognition.lang = 'ga-IE';
            console.log(`  Language set to: ${recognition.lang}`);
        } else {
            console.log('✗ Speech Recognition API not available');
        }
        
        console.log('\n=== Verification Complete ===');
        
    } catch (error) {
        console.error('Verification failed:', error);
    }
}

// Run verification
verifyAbairIntegration();