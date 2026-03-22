/**
 * UI Foundation Script for Irish E-Reader
 * Basic functionality to make the interface interactive
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize UI components
    initializeApiConfig();
    initializeTextInput();
    initializeSettings();
    initializeQuickActions();
    loadSavedSettings();
});

/**
 * Initialize API configuration section
 */
function initializeApiConfig() {
    const saveButton = document.getElementById('save-api-keys');
    const ttsInput = document.getElementById('tts-api-key');
    const sttInput = document.getElementById('stt-api-key');
    const statusDiv = document.getElementById('api-status');

    saveButton.addEventListener('click', function() {
        const ttsKey = ttsInput.value.trim();
        const sttKey = sttInput.value.trim();

        if (!ttsKey || !sttKey) {
            showStatus(statusDiv, 'Please enter both API keys', 'error');
            return;
        }

        // Save to localStorage (in production, this should be more secure)
        localStorage.setItem('ereader-tts-key', ttsKey);
        localStorage.setItem('ereader-stt-key', sttKey);

        showStatus(statusDiv, 'API keys saved successfully!', 'success');
        
        // Clear the input fields for security
        ttsInput.value = '';
        sttInput.value = '';
    });

    // Load existing keys
    const savedTtsKey = localStorage.getItem('ereader-tts-key');
    const savedSttKey = localStorage.getItem('ereader-stt-key');
    
    if (savedTtsKey && savedSttKey) {
        showStatus(statusDiv, 'API keys loaded', 'info');
    }
}

/**
 * Initialize text input functionality
 */
function initializeTextInput() {
    const textArea = document.getElementById('irish-text-input');
    const startButton = document.getElementById('start-reading-btn');
    const clearButton = document.getElementById('clear-text-btn');
    const sampleButton = document.getElementById('load-sample-btn');
    const readingArea = document.getElementById('reading-area');
    const practicePanel = document.getElementById('practice-panel');
    
    startButton.addEventListener('click', function() {
        const text = textArea.value.trim();
        
        if (!text) {
            alert('Please enter some Irish text first!');
            return;
        }

        if (!hasApiKeys()) {
            alert('Please configure your API keys first!');
            return;
        }

        processTextForReading(text);
        readingArea.style.display = 'block';
        practicePanel.style.display = 'block';
        
        // Scroll to reading area
        readingArea.scrollIntoView({ behavior: 'smooth' });
    });

    clearButton.addEventListener('click', function() {
        textArea.value = '';
        hideReadingInterface();
    });

    sampleButton.addEventListener('click', function() {
        const sampleText = `Tá mé ag foghlaim na Gaeilge. Is breá liom an teanga seo. Tá sí an-suimiúil agus tá cultúr saibhir aici. Bíonn mé ag cleachtadh gach lá. Táim ag iarraidh mo chuid Gaeilge a fheabhsú. Is féidir liom briathra simplí a rá anois. Tá súil agam go mbeidh mé líofa sa Ghaeilge go luath.`;
        
        textArea.value = sampleText;
        showStatus(textArea.parentElement, 'Sample text loaded!', 'success');
    });
}

/**
 * Initialize settings controls
 */
function initializeSettings() {
    const speechRate = document.getElementById('speech-rate');
    const rateValue = document.getElementById('rate-value');
    const voiceSelect = document.getElementById('voice-select');
    const autoAdvance = document.getElementById('auto-advance');

    speechRate.addEventListener('input', function() {
        rateValue.textContent = this.value + 'x';
        localStorage.setItem('ereader-speech-rate', this.value);
    });

    voiceSelect.addEventListener('change', function() {
        localStorage.setItem('ereader-voice', this.value);
    });

    autoAdvance.addEventListener('change', function() {
        localStorage.setItem('ereader-auto-advance', this.checked);
    });
}

/**
 * Initialize quick action buttons
 */
function initializeQuickActions() {
    const exportButton = document.getElementById('export-session-btn');
    const importButton = document.getElementById('import-text-btn');
    const shareButton = document.getElementById('share-progress-btn');
    const resetButton = document.getElementById('reset-session-btn');
    const fileInput = document.getElementById('file-input');

    exportButton.addEventListener('click', exportSession);
    importButton.addEventListener('click', () => fileInput.click());
    shareButton.addEventListener('click', shareProgress);
    resetButton.addEventListener('click', resetSession);

    fileInput.addEventListener('change', handleFileImport);
}

/**
 * Process text for reading interface using enhanced Irish text segmentation
 */
function processTextForReading(text) {
    const textDisplay = document.getElementById('text-display');
    
    // Use the e-reader's enhanced segmentation if available
    if (window.eReader && typeof window.eReader.parseTextToSentences === 'function') {
        // Let the e-reader handle the text processing
        window.eReader.loadText(text);
        return;
    }
    
    // Fallback to basic sentence splitting for now
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    textDisplay.innerHTML = '';
    
    sentences.forEach((sentence, index) => {
        const span = document.createElement('span');
        span.className = 'sentence';
        span.textContent = sentence.trim() + '. ';
        span.dataset.index = index;
        
        span.addEventListener('click', function() {
            selectSentence(this);
        });
        
        textDisplay.appendChild(span);
    });

    updateProgress(0, sentences.length);
    setupAudioControls(sentences);
}

/**
 * Select a sentence for practice
 */
function selectSentence(sentenceElement) {
    // Remove active class from all sentences
    document.querySelectorAll('.sentence').forEach(s => s.classList.remove('active'));
    
    // Add active class to selected sentence
    sentenceElement.classList.add('active');
    
    // Update practice panel
    const targetDiv = document.getElementById('target-sentence');
    targetDiv.textContent = sentenceElement.textContent.trim();
    
    // Enable sentence-specific controls
    document.getElementById('play-sentence-btn').disabled = false;
    
    // Update recording interface
    resetRecordingState();
}

/**
 * Setup audio controls
 */
function setupAudioControls(sentences) {
    const playAllBtn = document.getElementById('play-all-btn');
    const playSelectedBtn = document.getElementById('play-sentence-btn');
    const stopBtn = document.getElementById('stop-audio-btn');
    const repeatBtn = document.getElementById('repeat-btn');

    playAllBtn.onclick = () => playAllSentences(sentences);
    playSelectedBtn.onclick = () => playSelectedSentence();
    stopBtn.onclick = () => stopAudio();
    repeatBtn.onclick = () => repeatLastSentence();

    // Recording controls
    const recordBtn = document.getElementById('record-btn');
    const playbackBtn = document.getElementById('playback-btn');
    const compareBtn = document.getElementById('compare-btn');

    recordBtn.onclick = () => toggleRecording();
    playbackBtn.onclick = () => playbackRecording();
    compareBtn.onclick = () => comparePronounciation();
}

/**
 * Update reading progress
 */
function updateProgress(current, total) {
    const progressText = document.getElementById('progress-text');
    const progressBar = document.getElementById('progress-bar');
    
    progressText.textContent = `${current} / ${total} sentences`;
    const percentage = total > 0 ? (current / total) * 100 : 0;
    progressBar.style.width = percentage + '%';
}

/**
 * Utility functions
 */
function hasApiKeys() {
    return localStorage.getItem('ereader-tts-key') && localStorage.getItem('ereader-stt-key');
}

function hideReadingInterface() {
    document.getElementById('reading-area').style.display = 'none';
    document.getElementById('practice-panel').style.display = 'none';
}

function showStatus(container, message, type) {
    const statusElement = container.querySelector('.status-display') || document.createElement('div');
    statusElement.className = `status-indicator status-${type}`;
    statusElement.textContent = message;
    
    if (!container.querySelector('.status-display')) {
        statusElement.classList.add('status-display');
        container.appendChild(statusElement);
    }
    
    setTimeout(() => {
        if (statusElement.parentElement) {
            statusElement.remove();
        }
    }, 3000);
}

function loadSavedSettings() {
    const speechRate = document.getElementById('speech-rate');
    const rateValue = document.getElementById('rate-value');
    const voiceSelect = document.getElementById('voice-select');
    const autoAdvance = document.getElementById('auto-advance');

    // Load saved settings
    const savedRate = localStorage.getItem('ereader-speech-rate') || '1.0';
    const savedVoice = localStorage.getItem('ereader-voice') || 'ga-IE-Standard-A';
    const savedAutoAdvance = localStorage.getItem('ereader-auto-advance') === 'true';

    speechRate.value = savedRate;
    rateValue.textContent = savedRate + 'x';
    voiceSelect.value = savedVoice;
    autoAdvance.checked = savedAutoAdvance;
}

// Placeholder functions for future implementation
function playAllSentences(sentences) {
    console.log('Playing all sentences:', sentences);
    // Will be implemented with TTS service
}

function playSelectedSentence() {
    const activeSentence = document.querySelector('.sentence.active');
    if (activeSentence) {
        console.log('Playing sentence:', activeSentence.textContent);
        // Will be implemented with TTS service
    }
}

function stopAudio() {
    console.log('Stopping audio');
    // Will be implemented with audio processor
}

function repeatLastSentence() {
    console.log('Repeating last sentence');
    // Will be implemented with TTS service
}

function toggleRecording() {
    console.log('Toggling recording');
    // Will be implemented with STT service
}

function playbackRecording() {
    console.log('Playing back recording');
    // Will be implemented with audio processor
}

function comparePronounciation() {
    console.log('Comparing pronunciation');
    // Will be implemented with analysis service
}

function resetRecordingState() {
    const recordingStatus = document.getElementById('recording-status');
    recordingStatus.textContent = 'Ready to record';
    recordingStatus.className = 'status-info';
    
    document.getElementById('playback-btn').disabled = true;
    document.getElementById('compare-btn').disabled = true;
    document.getElementById('feedback-area').style.display = 'none';
}

function exportSession() {
    const sessionData = {
        text: document.getElementById('irish-text-input').value,
        settings: {
            speechRate: localStorage.getItem('ereader-speech-rate'),
            voice: localStorage.getItem('ereader-voice'),
            autoAdvance: localStorage.getItem('ereader-auto-advance')
        },
        timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `irish-ereader-session-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function handleFileImport(event) {
    const file = event.target.files[0];
    if (file && file.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('irish-text-input').value = e.target.result;
        };
        reader.readAsText(file);
    } else {
        alert('Please select a text file (.txt)');
    }
}

function shareProgress() {
    const progress = {
        totalAttempts: document.getElementById('total-attempts').textContent,
        errors: document.getElementById('error-count').textContent,
        accuracy: Math.max(0, 100 - parseInt(document.getElementById('error-count').textContent))
    };
    
    if (navigator.share) {
        navigator.share({
            title: 'Irish E-Reader Progress',
            text: `I've completed ${progress.totalAttempts} pronunciation attempts with ${progress.accuracy}% accuracy!`,
            url: window.location.href
        });
    } else {
        // Fallback: copy to clipboard
        const text = `Irish E-Reader Progress: ${progress.totalAttempts} attempts, ${progress.accuracy}% accuracy`;
        navigator.clipboard.writeText(text).then(() => {
            alert('Progress copied to clipboard!');
        });
    }
}

function resetSession() {
    if (confirm('Are you sure you want to reset the current session? This will clear all progress.')) {
        document.getElementById('irish-text-input').value = '';
        hideReadingInterface();
        document.getElementById('total-attempts').textContent = '0';
        document.getElementById('error-count').textContent = '0';
        updateProgress(0, 0);
    }
}