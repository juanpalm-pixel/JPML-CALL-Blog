/**
 * Main E-Reader Functionality
 * Core logic for the Irish e-reader interface with Google Cloud integration
 */

class IrishEReader {
    constructor() {
        this.currentSentenceIndex = 0;
        this.sentences = [];
        this.isPlaying = false;
        this.isPracticeMode = false;
        this.currentAudio = null;
        
        // Service instances
        this.ttsService = null;
        this.sttService = null;
        this.audioProcessor = null;
        this.errorManager = null;
        
        // Practice mode data
        this.practiceResults = [];
        this.currentPracticeText = '';
        
        // Pronunciation feedback system
        this.pronunciationSession = {
            currentSentenceId: null,
            attempts: [],
            startTime: null,
            targetWords: [],
            confidenceThresholds: {
                excellent: 0.8,
                good: 0.7,
                fair: 0.5,
                poor: 0.3
            },
            practiceOptions: {
                hearAgain: true,
                tryAgain: true,
                markCorrect: false,
                skipNext: false
            },
            sessionHistory: [],
            lastSavedTime: null,
            ttsSettings: {
                speakingRate: 1.0,
                pitch: 0.0,
                volume: 0.0
            },
            practicePreferences: {
                autoAdvance: false,
                confirmMarkCorrect: true,
                showDetailedFeedback: true
            }
        };
        
        // Real-time feedback state
        this.feedbackState = {
            isAnalyzing: false,
            currentAnalysis: null,
            wordLevelResults: [],
            sessionStats: {
                totalAttempts: 0,
                correctWords: 0,
                totalWords: 0,
                averageConfidence: 0,
                sessionDuration: 0,
                improvementTrend: [],
                bestAttempts: new Map(),
                streaks: {
                    current: 0,
                    best: 0
                }
            },
            practiceControlState: {
                canHearAgain: true,
                canTryAgain: true,
                canMarkCorrect: false,
                canSkipNext: true,
                isOperationInProgress: false
            }
        };
        
        // Load saved settings
        this.settings = this.loadSettings();
        
        this.init();
    }

    /**
     * Initialize the e-reader with all services
     */
    async init() {
        console.log('Initializing Irish E-Reader...');
        
        try {
            // Initialize services with new Abair.ie integration
            this.ttsService = new AbairTTSService();
            this.sttService = new BrowserSTTService();
            this.audioProcessor = new AudioProcessor();
            this.errorManager = new ErrorManager();
            this.uiAnimations = new UIAnimations(); // Add animation system
            
            // Apply saved settings to services
            this.applySettings();
            
            // Try to load previous session
            if (this.loadSavedSession()) {
                console.log('Loaded previous practice session');
                this.updateStatsDisplay();
            }
            
            // Set up UI
            this.setupEventListeners();
            await this.loadDefaultText();
            
            // Set up auto-save interval
            this.setupAutoSave();
            
            console.log('Irish E-Reader initialized successfully');
        } catch (error) {
            console.error('Failed to initialize e-reader:', error);
            this.showError('Failed to initialize e-reader: ' + error.message);
        }
    }

    /**
     * Set up auto-save interval for session persistence
     */
    setupAutoSave() {
        // Auto-save every 30 seconds during active sessions
        this.autoSaveInterval = setInterval(() => {
            if (this.pronunciationSession.startTime && this.feedbackState.sessionStats.totalAttempts > 0) {
                this.autoSaveSession();
            }
        }, 30000);
    }

    /**
     * Set up enhanced event listeners for UI interactions
     */
    setupEventListeners() {
        // Navigation buttons
        document.getElementById('settings-btn')?.addEventListener('click', () => this.openSettings());
        document.getElementById('errors-btn')?.addEventListener('click', () => this.navigateToErrors());
        
        // Text processing - integrate with existing UI foundation
        const startReadingBtn = document.getElementById('start-reading-btn');
        if (startReadingBtn) {
            startReadingBtn.addEventListener('click', () => {
                const textarea = document.getElementById('irish-text-input');
                const text = textarea ? textarea.value.trim() : '';
                
                if (!text) {
                    alert('Please enter some Irish text first!');
                    return;
                }

                this.loadText(text);
                
                if (this.sentences.length > 0) {
                    // Show reading area
                    const readingArea = document.getElementById('reading-area');
                    const practicePanel = document.getElementById('practice-panel');
                    
                    if (readingArea) readingArea.style.display = 'block';
                    if (practicePanel) practicePanel.style.display = 'block';
                    
                    // Auto-select first sentence
                    this.selectSentence(0);
                    
                    // Scroll to reading area
                    readingArea?.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
        
        // Audio controls
        document.getElementById('play-all-btn')?.addEventListener('click', () => this.playAllSentences());
        document.getElementById('play-sentence-btn')?.addEventListener('click', () => this.playSentence());
        document.getElementById('stop-audio-btn')?.addEventListener('click', () => this.stopAudio());
        document.getElementById('repeat-btn')?.addEventListener('click', () => this.repeatSentence());
        
        // Recording controls
        document.getElementById('record-btn')?.addEventListener('click', () => this.toggleRecording());
        document.getElementById('stop-recording-btn')?.addEventListener('click', () => this.stopRecording());
        document.getElementById('playback-btn')?.addEventListener('click', () => this.playbackRecording());
        document.getElementById('compare-btn')?.addEventListener('click', () => this.analyzePronunciation());
        
        // Enhanced pronunciation practice controls
        document.getElementById('hear-again-btn')?.addEventListener('click', () => this.hearTargetAgain());
        document.getElementById('try-again-btn')?.addEventListener('click', () => this.tryPronunciationAgain());
        document.getElementById('mark-correct-btn')?.addEventListener('click', () => this.markAsCorrect());
        document.getElementById('skip-next-btn')?.addEventListener('click', () => this.skipToNext());
        document.getElementById('compare-btn')?.addEventListener('click', () => this.comparePronounciation());
        
        // Session management controls
        document.getElementById('export-session-btn')?.addEventListener('click', () => this.exportSession());
        document.getElementById('clear-session-btn')?.addEventListener('click', () => this.clearSession());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    /**
     * Handle keyboard shortcuts for navigation
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyboardShortcuts(e) {
        // Only handle shortcuts when reading area is visible
        const readingArea = document.getElementById('reading-area');
        if (!readingArea || readingArea.style.display === 'none') {
            return;
        }

        // Check if we're in practice mode to enable practice shortcuts
        const practiceMode = document.getElementById('practice-panel')?.style.display !== 'none';
        
        switch (e.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                e.preventDefault();
                this.nextSentence();
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                e.preventDefault();
                this.previousSentence();
                break;
            case ' ':
                e.preventDefault();
                this.playSentence();
                break;
            case 'r':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.toggleRecording();
                }
                break;
            case 'Escape':
                this.stopAudio();
                break;
            
            // Practice mode shortcuts (when practice controls are visible)
            case '1':
                if (practiceMode && this.feedbackState.practiceControlState.canHearAgain) {
                    e.preventDefault();
                    this.hearTargetAgain();
                }
                break;
            case '2':
                if (practiceMode && this.feedbackState.practiceControlState.canTryAgain) {
                    e.preventDefault();
                    this.tryPronunciationAgain();
                }
                break;
            case '3':
                if (practiceMode && this.feedbackState.practiceControlState.canMarkCorrect) {
                    e.preventDefault();
                    this.markAsCorrect();
                }
                break;
            case '4':
                if (practiceMode && this.feedbackState.practiceControlState.canSkipNext) {
                    e.preventDefault();
                    this.skipToNext();
                }
                break;
            
            // Additional practice shortcuts
            case 'h':
                if (practiceMode) {
                    e.preventDefault();
                    this.hearTargetAgain();
                }
                break;
            case 't':
                if (practiceMode) {
                    e.preventDefault();
                    this.tryPronunciationAgain();
                }
                break;
            case 'm':
                if (practiceMode && this.feedbackState.practiceControlState.canMarkCorrect) {
                    e.preventDefault();
                    this.markAsCorrect();
                }
                break;
            case 's':
                if (practiceMode) {
                    e.preventDefault();
                    this.skipToNext();
                }
                break;
        }
    }

    /**
     * Additional UI event listeners setup
     */
    setupAdditionalEventListeners() {
        const practiceBtn = document.getElementById('practice-btn');
        practiceBtn?.addEventListener('click', () => this.togglePracticeMode());
        
        // Text input for custom text
        const textInput = document.getElementById('text-input');
        textInput?.addEventListener('input', (e) => this.handleTextInput(e.target.value));
        
        // Sentence navigation
        const prevBtn = document.getElementById('prev-sentence');
        const nextBtn = document.getElementById('next-sentence');
        
        prevBtn?.addEventListener('click', () => this.previousSentence());
        nextBtn?.addEventListener('click', () => this.nextSentence());
    }

    /**
     * Load and parse text content from textarea
     */
    loadText(text = null) {
        let textContent;
        
        if (text) {
            textContent = text;
        } else {
            const textarea = document.getElementById('irish-text-input');
            textContent = textarea ? textarea.value.trim() : '';
        }

        if (!textContent) {
            console.log('No text content provided');
            this.sentences = [];
            return;
        }

        // Parse text into sentences using Irish-specific logic
        this.sentences = this.parseTextToSentences(textContent);
        
        // Reset current position
        this.currentSentenceIndex = 0;
        
        console.log(`Loaded ${this.sentences.length} sentences`);
        
        // Update UI if sentences were parsed
        if (this.sentences.length > 0) {
            this.updateTextDisplay();
            this.updateProgress();
        }
    }

    /**
     * Update the text display with parsed sentences
     */
    updateTextDisplay() {
        const textDisplay = document.getElementById('text-display');
        if (!textDisplay || !this.sentences.length) {
            return;
        }

        textDisplay.innerHTML = '';
        
        this.sentences.forEach((sentence, index) => {
            const sentenceElement = this.createSentenceElement(sentence, index);
            textDisplay.appendChild(sentenceElement);
        });

        // Add segmentation info
        this.addSegmentationInfo(textDisplay);
    }

    /**
     * Create a DOM element for a sentence
     * @param {Object} sentence - Sentence object
     * @param {number} index - Sentence index
     * @returns {HTMLElement} Sentence element
     */
    createSentenceElement(sentence, index) {
        const span = document.createElement('span');
        span.className = 'sentence';
        span.textContent = sentence.content;
        span.dataset.index = index;
        span.dataset.sentenceId = sentence.id;
        
        // Add special classes for different sentence types
        if (sentence.hasIrishContent) {
            span.classList.add('irish-content');
        }
        
        if (sentence.isLong) {
            span.classList.add('long-sentence');
            span.title = `Long sentence: ${sentence.wordCount} words`;
        }

        // Add click handler for sentence selection
        span.addEventListener('click', (e) => {
            e.preventDefault();
            // Prevent selecting different sentence while TTS is playing
            if (this.isPlaying) {
                console.log('Cannot select sentence while audio is playing');
                return;
            }
            this.selectSentence(index);
        });

        // Add space after sentence if not ending the paragraph
        if (!sentence.content.endsWith('\n') && index < this.sentences.length - 1) {
            span.textContent += ' ';
        }

        return span;
    }

    /**
     * Add segmentation information to display
     * @param {HTMLElement} container - Container element
     */
    addSegmentationInfo(container) {
        const infoDiv = document.createElement('div');
        infoDiv.className = 'segmentation-info';
        infoDiv.style.cssText = `
            margin-top: 1rem; 
            padding: 0.75rem; 
            background-color: #f8f9fa; 
            border-radius: 4px; 
            font-size: 0.9rem; 
            color: #666;
            border-left: 3px solid var(--primary-color);
        `;

        const totalSentences = this.sentences.length;
        const irishSentences = this.sentences.filter(s => s.hasIrishContent).length;
        const longSentences = this.sentences.filter(s => s.isLong).length;
        const avgWordsPerSentence = Math.round(
            this.sentences.reduce((sum, s) => sum + s.wordCount, 0) / totalSentences
        );

        infoDiv.innerHTML = `
            <strong>Text Analysis:</strong> 
            ${totalSentences} sentences parsed
            ${irishSentences > 0 ? ` • ${irishSentences} with Irish content` : ''}
            ${longSentences > 0 ? ` • ${longSentences} long sentences` : ''}
            • Average: ${avgWordsPerSentence} words per sentence
        `;

        container.appendChild(infoDiv);
    }

    /**
     * Parse text into sentences with Irish language considerations
     * @param {string} text - The text to parse
     * @returns {Array} Array of sentence objects with metadata
     */
    parseTextToSentences(text) {
        if (!text || typeof text !== 'string') {
            return [];
        }

        // Clean the input text
        const cleanedText = this.cleanInputText(text);
        
        // Get sentence boundaries using Irish-specific logic
        const sentenceBoundaries = this.detectSentenceBoundaries(cleanedText);
        
        // Create sentence objects with metadata
        const sentences = this.createSentenceObjects(cleanedText, sentenceBoundaries);
        
        // Filter and validate sentences
        const validSentences = this.filterValidSentences(sentences);
        
        console.log(`Parsed ${validSentences.length} valid sentences from text`);
        return validSentences;
    }

    /**
     * Clean and normalize input text
     * @param {string} text - Raw input text
     * @returns {string} Cleaned text
     */
    cleanInputText(text) {
        return text
            // Normalize whitespace
            .replace(/\s+/g, ' ')
            // Remove excessive line breaks
            .replace(/\n{3,}/g, '\n\n')
            // Fix spacing around punctuation
            .replace(/\s*([.!?])\s*/g, '$1 ')
            // Remove leading/trailing whitespace
            .trim();
    }

    /**
     * Detect sentence boundaries with Irish language considerations
     * @param {string} text - Cleaned text
     * @returns {Array} Array of boundary positions
     */
    detectSentenceBoundaries(text) {
        const boundaries = [0]; // Always start at beginning
        
        // Irish abbreviations that shouldn't trigger sentence breaks
        const irishAbbreviations = new Set([
            'srl', 'rl', 'ucht', 'm.sh', 'dr', 'teo', 'teoranta',
            'lch', 'lch.', 'caib', 'caib.', 'b.á.c', 'bác',
            'eag', 'eag.', 'cpt', 'cpt.', 'lth', 'lth.'
        ]);

        // Common English abbreviations in mixed text
        const commonAbbreviations = new Set([
            'mr', 'mrs', 'ms', 'dr', 'prof', 'st', 'ave', 'rd',
            'inc', 'ltd', 'co', 'corp', 'etc', 'vs', 'ie', 'eg',
            'am', 'pm', 'a.m', 'p.m'
        ]);

        const allAbbreviations = new Set([...irishAbbreviations, ...commonAbbreviations]);

        // Pattern for sentence-ending punctuation
        const sentenceEndPattern = /[.!?]+/g;
        let match;

        while ((match = sentenceEndPattern.exec(text)) !== null) {
            const position = match.index + match[0].length;
            
            // Check if this is a valid sentence boundary
            if (this.isValidSentenceBoundary(text, position, allAbbreviations)) {
                boundaries.push(position);
            }
        }

        // Ensure we end at the text length if not already there
        if (boundaries[boundaries.length - 1] !== text.length) {
            boundaries.push(text.length);
        }

        return boundaries;
    }

    /**
     * Check if a position represents a valid sentence boundary
     * @param {string} text - The full text
     * @param {number} position - Position to check
     * @param {Set} abbreviations - Set of known abbreviations
     * @returns {boolean} True if valid boundary
     */
    isValidSentenceBoundary(text, position, abbreviations) {
        // Get context before and after the punctuation
        const beforeContext = text.substring(Math.max(0, position - 10), position);
        const afterContext = text.substring(position, Math.min(text.length, position + 10));

        // Check for abbreviations
        if (this.isAbbreviation(beforeContext, abbreviations)) {
            return false;
        }

        // Check for decimal numbers (e.g., "3.14")
        if (/\d\.\d/.test(beforeContext + afterContext.charAt(0))) {
            return false;
        }

        // Check for URLs or email addresses
        if (/[a-zA-Z]\.[a-zA-Z]/.test(beforeContext + afterContext)) {
            return false;
        }

        // Must have whitespace or end of text after punctuation for valid boundary
        const nextChar = text.charAt(position);
        if (nextChar && !/\s/.test(nextChar)) {
            return false;
        }

        // If next character exists, it should be uppercase or a quote
        const nextNonWhitespace = afterContext.trim().charAt(0);
        if (nextNonWhitespace && 
            !/[A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÄËÏÖÜŶĆÑŇ"""'']/u.test(nextNonWhitespace)) {
            return false;
        }

        return true;
    }

    /**
     * Check if text before position contains an abbreviation
     * @param {string} context - Text context
     * @param {Set} abbreviations - Set of known abbreviations
     * @returns {boolean} True if abbreviation found
     */
    isAbbreviation(context, abbreviations) {
        const words = context.toLowerCase().split(/\s+/);
        const lastWord = words[words.length - 1];
        
        if (!lastWord) return false;

        // Remove trailing punctuation to check the word
        const cleanWord = lastWord.replace(/[.!?]+$/, '');
        
        return abbreviations.has(cleanWord);
    }

    /**
     * Create sentence objects with metadata from boundaries
     * @param {string} text - The full text
     * @param {Array} boundaries - Array of boundary positions
     * @returns {Array} Array of sentence objects
     */
    createSentenceObjects(text, boundaries) {
        const sentences = [];

        for (let i = 0; i < boundaries.length - 1; i++) {
            const start = boundaries[i];
            const end = boundaries[i + 1];
            
            const content = text.substring(start, end).trim();
            
            if (content) {
                const sentence = {
                    id: i,
                    content: content,
                    startPosition: start,
                    endPosition: end,
                    length: content.length,
                    wordCount: this.countWords(content),
                    hasIrishContent: this.detectIrishContent(content),
                    punctuation: this.extractPunctuation(content),
                    isValid: true
                };

                sentences.push(sentence);
            }
        }

        return sentences;
    }

    /**
     * Count words in text
     * @param {string} text - Text to analyze
     * @returns {number} Word count
     */
    countWords(text) {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    /**
     * Detect if text contains Irish language content
     * @param {string} text - Text to analyze
     * @returns {boolean} True if Irish content detected
     */
    detectIrishContent(text) {
        // Irish-specific characters and patterns
        const irishCharacters = /[áéíóúàèìòùâêîôûäëïöüŷńñ]/i;
        const irishWords = /\b(agus|le|ar|i|in|an|na|is|tá|bhí|go|do|de|sa|sna|den|don|faoi|ó|trí|chun|mar|leis|léi|dá|má|ach|nó|mura|sula|nuair|cén|cad|conas|cá|cathain|cé|céard|táim|beidh|chonaic|inné|amárach|anocht|inniu|aimsir|breá|liom|maith|agat)\b/i;
        
        // Count Irish indicators
        const irishCharCount = (text.match(irishCharacters) || []).length;
        const irishWordMatches = text.match(irishWords) || [];
        
        // Consider it Irish if it has multiple Irish indicators or significant Irish words
        return irishCharCount > 1 || irishWordMatches.length >= 2 || 
               (irishWordMatches.length >= 1 && irishCharCount >= 1);
    }

    /**
     * Extract punctuation from sentence
     * @param {string} text - Text to analyze
     * @returns {Array} Array of punctuation marks
     */
    extractPunctuation(text) {
        const punctuation = text.match(/[.!?;:,"""''()[\]{}—–-]/g) || [];
        return punctuation;
    }

    /**
     * Filter and validate sentences
     * @param {Array} sentences - Array of sentence objects
     * @returns {Array} Array of valid sentences
     */
    filterValidSentences(sentences) {
        return sentences.filter(sentence => {
            // Remove empty or too short sentences
            if (!sentence.content || sentence.content.length < 2) {
                return false;
            }

            // Remove sentences that are just punctuation or numbers
            if (/^[.!?;:,\s\d]+$/.test(sentence.content)) {
                return false;
            }

            // Handle very long sentences (>200 words) - mark but keep
            if (sentence.wordCount > 200) {
                sentence.isLong = true;
                console.warn(`Long sentence detected: ${sentence.wordCount} words`);
            }

            // Add sequential numbering
            sentence.number = sentences.indexOf(sentence) + 1;

            return true;
        }).map((sentence, index) => {
            // Re-number after filtering
            sentence.number = index + 1;
            sentence.id = index;
            return sentence;
        });
    }

    /**
     * Select a sentence for practice
     * @param {number} index - Index of sentence to select
     */
    selectSentence(index) {
        if (index < 0 || index >= this.sentences.length) {
            console.warn('Invalid sentence index:', index);
            return;
        }

        // Update current index
        this.currentSentenceIndex = index;
        
        // Enhanced highlighting with animations
        this.highlightSentence(index);
        
        // Update practice panel
        this.updatePracticePanel(this.sentences[index]);
        
        console.log(`Selected sentence ${index + 1}: ${this.sentences[index].content.substring(0, 50)}...`);
    }

    /**
     * Highlight current sentence with advanced animations
     * @param {number} index - Index of sentence to highlight
     */
    async highlightSentence(index) {
        // Get sentence element
        const sentenceElement = document.querySelector(`[data-index="${index}"]`);
        if (!sentenceElement) {
            console.warn('Sentence element not found for index:', index);
            return;
        }

        // Use advanced animation system if available
        if (this.uiAnimations) {
            await this.uiAnimations.focusSentence(sentenceElement, {
                scroll: true,
                prepareWords: true
            });
        } else {
            // Fallback to basic highlighting
            this.basicHighlightSentence(index);
        }

        // Update progress
        this.updateProgress();
        
        console.log(`Highlighted sentence ${index + 1} with animations`);
    }

    /**
     * Basic sentence highlighting (fallback)
     * @param {number} index - Index of sentence to highlight
     */
    basicHighlightSentence(index) {
        // Remove active class from all sentences
        document.querySelectorAll('.sentence').forEach(span => {
            span.classList.remove('active', 'current', 'sentence-focus', 'current-playing');
        });

        // Add active class to selected sentence
        const sentenceElement = document.querySelector(`[data-index="${index}"]`);
        if (sentenceElement) {
            sentenceElement.classList.add('active', 'current');
            
            // Scroll into view if needed
            sentenceElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest'
            });
        }
    }

    /**
     * Update the practice panel with current sentence
     * @param {Object} sentence - Sentence object
     */
    updatePracticePanel(sentence) {
        const targetDiv = document.getElementById('target-sentence');
        const playButton = document.getElementById('play-sentence-btn');
        
        // Set the current practice text for pronunciation analysis
        this.currentPracticeText = sentence.content;
        console.log('Updated currentPracticeText:', this.currentPracticeText);
        
        if (targetDiv) {
            targetDiv.innerHTML = `
                <div style="font-size: 1.3rem; font-weight: bold; margin-bottom: 0.5rem;">
                    ${sentence.content}
                </div>
                <div style="font-size: 0.9rem; color: #666; display: flex; justify-content: space-between; flex-wrap: wrap;">
                    <span>Sentence ${sentence.number} of ${this.sentences.length}</span>
                    <span>${sentence.wordCount} words</span>
                    <span>${sentence.hasIrishContent ? 'Irish content' : 'Mixed/Other'}</span>
                </div>
            `;
        }

        // Enable sentence controls
        if (playButton) {
            playButton.disabled = false;
        }

        // Reset recording state
        this.resetRecordingInterface();
    }

    /**
     * Update reading progress display
     */
    updateProgress() {
        const progressText = document.getElementById('progress-text');
        const progressBar = document.getElementById('progress-bar');
        
        if (progressText && this.sentences.length > 0) {
            const current = this.currentSentenceIndex + 1;
            const total = this.sentences.length;
            progressText.textContent = `${current} / ${total} sentences`;
            
            if (progressBar) {
                const percentage = (current / total) * 100;
                progressBar.style.width = percentage + '%';
            }
        }
    }

    /**
     * Navigate to next sentence
     */
    nextSentence() {
        if (this.currentSentenceIndex < this.sentences.length - 1) {
            this.selectSentence(this.currentSentenceIndex + 1);
            return true;
        }
        return false;
    }

    /**
     * Navigate to previous sentence
     */
    previousSentence() {
        if (this.currentSentenceIndex > 0) {
            this.selectSentence(this.currentSentenceIndex - 1);
            return true;
        }
        return false;
    }

    /**
     * Get current sentence object
     * @returns {Object|null} Current sentence or null
     */
    getCurrentSentence() {
        if (this.currentSentenceIndex >= 0 && this.currentSentenceIndex < this.sentences.length) {
            return this.sentences[this.currentSentenceIndex];
        }
        return null;
    }

    /**
     * Reset recording interface
     */
    resetRecordingInterface() {
        const recordingStatus = document.getElementById('recording-status');
        const playbackBtn = document.getElementById('playback-btn');
        const compareBtn = document.getElementById('compare-btn');
        const feedbackArea = document.getElementById('feedback-area');

        if (recordingStatus) {
            recordingStatus.textContent = 'Ready to record';
            recordingStatus.className = 'status-info';
        }

        if (playbackBtn) playbackBtn.disabled = true;
        if (compareBtn) compareBtn.disabled = true;
        if (feedbackArea) feedbackArea.style.display = 'none';
    }

    /**
     * Play audio for current sentence using TTS service with enhanced animations
     */
    async playSentence() {
        try {
            if (!this.sentences[this.currentSentenceIndex]) {
                this.showError('No sentence selected');
                return;
            }

            const sentence = this.sentences[this.currentSentenceIndex];
            const sentenceElement = document.querySelector(`[data-index="${this.currentSentenceIndex}"]`);
            
            console.log('Playing sentence with animations:', sentence.content.substring(0, 50) + '...');
            
            // Show loading indicator
            let loadingSpinner = null;
            if (this.uiAnimations && sentenceElement) {
                loadingSpinner = this.uiAnimations.showTTSLoading(sentenceElement.parentElement);
                this.uiAnimations.setSentenceAsPlaying(sentenceElement);
            }
            
            this.updateStatus('Converting text to speech...');
            
            // Get TTS audio with timing data using configured playback speed
            const playbackSpeed = Math.max(
                0.5,
                Math.min(
                    2,
                    Number(this.pronunciationSession?.ttsSettings?.speakingRate || this.settings?.speechRate || 1)
                )
            );
            const ttsResult = await this.ttsService.synthesize(sentence.content, null, {
                speed: playbackSpeed
            });
            
            // Hide loading indicator
            if (loadingSpinner && this.uiAnimations) {
                this.uiAnimations.hideTTSLoading(loadingSpinner);
            }
            
            this.updateStatus('Playing audio...');
            
            // Prepare word-level highlighting
            if (this.uiAnimations && sentenceElement) {
                this.uiAnimations.prepareWordsForHighlighting(sentenceElement);
            }
            
            // Play audio with enhanced word highlighting
            // OPTIMIZED: Use bound method to prevent memory leaks and add cleanup
            const highlightCallback = this.createHighlightCallback();
            this.ttsService.setWordHighlightCallback(highlightCallback.callback);
            this.currentAudio = await this.ttsService.play(ttsResult);

            // Store cleanup function for later use
            this.currentHighlightCleanup = highlightCallback.cleanup;

            // Setup word synchronization if timing data is available
            const timingData = ttsResult.timepoints || ttsResult.wordTimings;
            if (this.uiAnimations && timingData) {
                const syncCallback = this.createSyncCallback();
                await this.uiAnimations.syncWordHighlighting(
                    timingData,
                    this.currentAudio,
                    syncCallback.callback
                );
                this.currentSyncCleanup = syncCallback.cleanup;
            }

            this.isPlaying = true;
            this.updatePlaybackControls();

            // Listen for audio end with proper cleanup
            const endedHandler = () => {
                this.isPlaying = false;
                this.updatePlaybackControls();
                this.updateStatus('Playback finished');
                
                // Mark sentence as completed with animation
                if (this.uiAnimations && sentenceElement) {
                    this.uiAnimations.setSentenceAsCompleted(sentenceElement);
                }
                
                // Update progress animation
                this.updateProgressWithAnimation();
                
                // Cleanup callbacks
                this.cleanupAudioCallbacks();
            };
            
            this.currentAudio.addEventListener('ended', endedHandler);
            this.currentEndedHandler = endedHandler;

        } catch (error) {
            console.error('Playback error:', error);
            this.showError('Audio playback failed: ' + error.message);
            this.isPlaying = false;
            this.updatePlaybackControls();
        }
    }

    /**
     * Enhanced word highlighting with animations
     * @param {string} word - Current word
     * @param {number} wordIndex - Word index
     */
    enhancedHighlightWord(word, wordIndex) {
        // Basic word highlighting (fallback)
        const sentenceEl = document.querySelector(`.sentence[data-index="${this.currentSentenceIndex}"]`);
        if (sentenceEl) {
            console.log(`Highlighting word: "${word}" at position ${wordIndex}`);
            
            // If advanced animations are available, they handle word highlighting
            // This is primarily a fallback for basic highlighting
            if (!this.uiAnimations) {
                const words = sentenceEl.textContent.split(/\s+/);
                if (words[wordIndex]) {
                    // Basic visual feedback
                    sentenceEl.style.background = 'linear-gradient(90deg, #fff3cd 0%, #ffc107 100%)';
                    setTimeout(() => {
                        sentenceEl.style.background = '';
                    }, 200);
                }
            }
        }
    }

    /**
     * Create highlight callback with cleanup capability
     * OPTIMIZED: Prevents memory leaks by providing cleanup mechanism
     */
    createHighlightCallback() {
        const weakRef = new WeakRef(this);
        let isActive = true;
        
        const callback = (word, wordIndex) => {
            const instance = weakRef.deref();
            if (instance && isActive) {
                instance.enhancedHighlightWord(word, wordIndex);
            }
        };
        
        const cleanup = () => {
            isActive = false;
        };
        
        return { callback, cleanup };
    }

    /**
     * Create sync callback with cleanup capability
     * OPTIMIZED: Prevents memory leaks by providing cleanup mechanism  
     */
    createSyncCallback() {
        let isActive = true;
        
        const callback = (word, index) => {
            if (isActive) {
                console.log(`Word completed: ${word} (${index})`);
            }
        };
        
        const cleanup = () => {
            isActive = false;
        };
        
        return { callback, cleanup };
    }

    /**
     * Clean up audio callbacks to prevent memory leaks
     */
    cleanupAudioCallbacks() {
        if (this.currentHighlightCleanup) {
            this.currentHighlightCleanup();
            this.currentHighlightCleanup = null;
        }
        
        if (this.currentSyncCleanup) {
            this.currentSyncCleanup();
            this.currentSyncCleanup = null;
        }
        
        if (this.currentAudio && this.currentEndedHandler) {
            this.currentAudio.removeEventListener('ended', this.currentEndedHandler);
            this.currentEndedHandler = null;
        }
    }

    /**
     * Update progress with animation
     */
    updateProgressWithAnimation() {
        const current = this.currentSentenceIndex + 1;
        const total = this.sentences.length;
        const percentage = (current / total) * 100;
        
        // Update text progress
        const progressText = document.getElementById('progress-text');
        if (progressText) {
            progressText.textContent = `${current} / ${total} sentences`;
        }
        
        // Animate progress bar
        if (this.uiAnimations) {
            this.uiAnimations.updateReadingProgress(percentage);
        } else {
            // Fallback progress update
            const progressBar = document.getElementById('progress-bar');
            if (progressBar) {
                progressBar.style.width = percentage + '%';
            }
        }
    }

    /**
     * Pause current audio playback
     */
    pauseAudio() {
        if (this.currentAudio && !this.currentAudio.paused) {
            this.currentAudio.pause();
            this.isPlaying = false;
            this.updatePlaybackControls();
            this.updateStatus('Playback paused');
        }
    }

    /**
     * Stop current audio playback
     */
    stopAudio() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.isPlaying = false;
            this.updatePlaybackControls();
            this.updateStatus('Playback stopped');
        }
    }

    /**
     * Navigate to previous sentence
     */
    previousSentence() {
        if (this.currentSentenceIndex > 0) {
            this.currentSentenceIndex--;
            this.highlightSentence(this.currentSentenceIndex);
            this.updateSentenceCounter();
        }
    }

    /**
     * Navigate to next sentence
     */
    nextSentence() {
        if (this.currentSentenceIndex < this.sentences.length - 1) {
            this.currentSentenceIndex++;
            this.highlightSentence(this.currentSentenceIndex);
            this.updateSentenceCounter();
        }
    }

    /**
     * Play all sentences sequentially with enhanced animations
     */
    async playAllSentences() {
        if (!this.sentences.length) {
            console.warn('No sentences to play');
            return;
        }

        console.log('Playing all sentences with animations...');
        this.isPlaying = true;
        
        // Set reading area to active mode
        const readingArea = document.getElementById('reading-area') || document.getElementById('text-display');
        if (readingArea && this.uiAnimations) {
            readingArea.classList.add('reading-active');
        }
        
        try {
            for (let i = 0; i < this.sentences.length && this.isPlaying; i++) {
                // Select and focus sentence with animation
                this.selectSentence(i);
                await new Promise(resolve => setTimeout(resolve, 200)); // Allow focus animation
                
                await this.playSentence();
                
                // Wait for audio to finish before proceeding
                if (this.currentAudio) {
                    await new Promise(resolve => {
                        this.currentAudio.addEventListener('ended', resolve, { once: true });
                    });
                }
                
                // Check auto-advance setting
                const autoAdvance = localStorage.getItem('ereader-auto-advance') === 'true';
                if (!autoAdvance) break; // Only play first sentence if auto-advance is off
                
                // Small pause between sentences
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } catch (error) {
            console.error('Error playing all sentences:', error);
            this.showError('Failed to play all sentences: ' + error.message);
        } finally {
            this.isPlaying = false;
            this.updatePlaybackControls();
            
            // Remove reading area active mode
            if (readingArea && this.uiAnimations) {
                readingArea.classList.remove('reading-active');
                // Clear all focus animations
                this.uiAnimations.clearSentenceFocus();
            }
        }
    }

    /**
     * Repeat current sentence
     */
    repeatSentence() {
        if (this.currentSentenceIndex >= 0 && this.currentSentenceIndex < this.sentences.length) {
            this.playSentence();
        }
    }

    /**
     * Update playback control states
     */
    updatePlaybackControls() {
        const playAllBtn = document.getElementById('play-all-btn');
        const playSelectedBtn = document.getElementById('play-sentence-btn');
        const stopBtn = document.getElementById('stop-audio-btn');
        const repeatBtn = document.getElementById('repeat-btn');

        if (playAllBtn) playAllBtn.disabled = this.isPlaying;
        if (playSelectedBtn) playSelectedBtn.disabled = this.isPlaying;
        if (stopBtn) stopBtn.disabled = !this.isPlaying;
        if (repeatBtn) repeatBtn.disabled = this.isPlaying || this.currentSentenceIndex < 0;
    }

    /**
     * Compare pronunciation with expected text (enhanced with animations)
     */
    async comparePronounciation() {
        const currentSentence = this.getCurrentSentence();
        if (!currentSentence) {
            alert('Please select a sentence first');
            return;
        }

        // TODO: This will be implemented when STT service is integrated
        console.log('Comparing pronunciation for:', currentSentence.content);
        
        // Show feedback area with animations
        const feedbackArea = document.getElementById('feedback-area');
        const sentenceElement = document.querySelector(`[data-index="${this.currentSentenceIndex}"]`);
        
        if (feedbackArea) {
            feedbackArea.style.display = 'block';
            feedbackArea.innerHTML = `
                <h4>Pronunciation Feedback</h4>
                <p>This feature will be available when the Speech-to-Text service is configured.</p>
                <p><strong>Target sentence:</strong> ${currentSentence.content}</p>
                <p><strong>Words to practice:</strong> ${currentSentence.wordCount}</p>
                <p><strong>Irish content detected:</strong> ${currentSentence.hasIrishContent ? 'Yes' : 'No'}</p>
            `;
            
            // Add entrance animation
            if (this.uiAnimations) {
                this.uiAnimations.animateEntrance(feedbackArea, 'fade-in');
            }
        }
        
        // Demo pronunciation feedback animation
        if (this.uiAnimations && sentenceElement) {
            // Simulate pronunciation analysis with random results for demo
            const words = currentSentence.content.split(/\s+/);
            const feedbackResults = words.map((word, index) => ({
                element: sentenceElement, // In real implementation, this would be individual word elements
                isCorrect: Math.random() > 0.3, // 70% chance correct for demo
                confidence: Math.random() * 0.4 + 0.6, // 60-100% confidence
                feedback: Math.random() > 0.7 ? `Try emphasizing the "${word}" sound` : ''
            }));
            
            // Show bulk feedback with staggered animation
            setTimeout(() => {
                this.uiAnimations.showBulkPronunciationFeedback(feedbackResults);
            }, 500);
        }
    }

    // ============ ENHANCED PRONUNCIATION FEEDBACK SYSTEM ============

    /**
     * Analyze pronunciation with real-time feedback
     */
    async analyzePronunciation() {
        if (!this.audioProcessor.lastRecording) {
            this.showError('No recording available for analysis');
            return;
        }

        if (this.feedbackState.isAnalyzing) {
            console.log('Analysis already in progress...');
            return;
        }

        try {
            this.feedbackState.isAnalyzing = true;
            this.showPronunciationStatus('Analyzing pronunciation...', 'analyzing');
            
            // Get current sentence as target
            const currentSentence = this.sentences[this.currentSentenceIndex];
            if (!currentSentence) {
                throw new Error('No current sentence available for comparison');
            }

            // Start pronunciation analysis
            const analysisResult = await this.performPronunciationAnalysis(
                this.audioProcessor.lastRecording, 
                currentSentence
            );

            // Process and display results
            await this.processAnalysisResults(analysisResult);
            
        } catch (error) {
            console.error('Pronunciation analysis failed:', error);
            this.showPronunciationStatus('Analysis failed: ' + error.message, 'error');
        } finally {
            this.feedbackState.isAnalyzing = false;
        }
    }

    /**
     * Perform comprehensive pronunciation analysis
     */
    async performPronunciationAnalysis(audioBlob, targetSentence) {
        // Convert audio for STT analysis
        const audioConfig = this.sttService.updateConfigForFormat('webm', 48000);
        
        // Get STT transcription with word-level confidence
        const sttResult = await this.sttService.speechToText(audioBlob);
        const enhancedResults = this.sttService.enhanceRecognitionResults(sttResult);
        
        // Analyze pronunciation quality
        const targetWords = this.extractTargetWords(targetSentence);
        const pronunciationComparison = await this.sttService.identifyPronunciationIssues(
            targetSentence,
            enhancedResults
        );

        // Calculate detailed metrics
        const analysisMetrics = this.calculatePronunciationMetrics(
            enhancedResults, 
            targetWords, 
            pronunciationComparison
        );

        return {
            transcription: enhancedResults,
            comparison: pronunciationComparison,
            metrics: analysisMetrics,
            targetSentence: targetSentence,
            timestamp: Date.now()
        };
    }

    /**
     * Extract and normalize target words from sentence
     */
    extractTargetWords(sentence) {
        // Remove punctuation and split into words
        const cleanSentence = sentence.replace(/[^\w\s\u00C0-\u017F\u1E00-\u1EFF]/g, '');
        const words = cleanSentence.split(/\s+/).filter(word => word.length > 0);
        
        return words.map(word => ({
            text: word.toLowerCase(),
            original: word,
            isIrishWord: this.detectIrishWord(word)
        }));
    }

    /**
     * Basic Irish word detection (enhanced version would use dictionary)
     */
    detectIrishWord(word) {
        const irishPatterns = [
            /^[bcdfghj-np-tv-z]*[aeiouáéíóú][bcdfghj-np-tv-z]*$/i,  // Basic Irish phonetic pattern
            /dh|gh|bh|mh|fh|th|ch|ph/i,  // Irish consonant clusters
            /á|é|í|ó|ú/,  // Irish vowels with fada
        ];
        
        return irishPatterns.some(pattern => pattern.test(word));
    }

    /**
     * Clear pronunciation feedback visual elements
     */
    clearPronunciationFeedback() {
        // Clear word highlighting
        const sentenceElement = document.querySelector(`[data-index="${this.currentSentenceIndex}"]`);
        if (sentenceElement) {
            // Restore original text content
            sentenceElement.innerHTML = sentenceElement.textContent;
        }
        
        // Clear feedback areas
        const feedbackArea = document.getElementById('feedback-area');
        const optionsContainer = document.getElementById('practice-options');
        
        if (feedbackArea) feedbackArea.style.display = 'none';
        if (optionsContainer) optionsContainer.style.display = 'none';
        
        // Clear UI animations
        if (this.uiAnimations) {
            this.uiAnimations.clearAllWordHighlights();
        }
    }

    /**
     * Show pronunciation analysis status
     */
    showPronunciationStatus(message, type = 'info') {
        const statusElement = document.getElementById('recording-status');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `pronunciation-status ${type}`;
        }
        console.log(`[Pronunciation Status] ${message}`);
    }

    /**
     * Calculate comprehensive pronunciation metrics
     */
    calculatePronunciationMetrics(enhancedResults, targetWords, comparison) {
        const wordDetails = enhancedResults.analysis.wordDetails || [];
        const totalWords = targetWords.length;
        
        // Word-level accuracy analysis
        const wordAccuracy = wordDetails.map((detail, index) => {
            const targetWord = targetWords[index];
            const confidence = detail.confidence;
            
            // Determine accuracy level based on confidence thresholds
            let accuracyLevel = 'poor';
            if (confidence >= this.pronunciationSession.confidenceThresholds.excellent) {
                accuracyLevel = 'excellent';
            } else if (confidence >= this.pronunciationSession.confidenceThresholds.good) {
                accuracyLevel = 'good';
            } else if (confidence >= this.pronunciationSession.confidenceThresholds.fair) {
                accuracyLevel = 'fair';
            }

            return {
                word: targetWord ? targetWord.original : detail.word,
                transcribed: detail.word,
                confidence: confidence,
                accuracyLevel: accuracyLevel,
                isCorrect: confidence >= this.pronunciationSession.confidenceThresholds.good,
                feedback: this.generateWordLevelFeedback(detail, targetWord, confidence)
            };
        });

        // Overall metrics
        const averageConfidence = wordDetails.length > 0 
            ? wordDetails.reduce((sum, detail) => sum + detail.confidence, 0) / wordDetails.length 
            : 0;

        const correctWords = wordAccuracy.filter(w => w.isCorrect).length;
        const overallScore = totalWords > 0 ? (correctWords / totalWords) * 100 : 0;

        return {
            overallScore: overallScore,
            averageConfidence: averageConfidence,
            totalWords: totalWords,
            correctWords: correctWords,
            wordAccuracy: wordAccuracy,
            pronunciationGrade: this.calculatePronunciationGrade(overallScore),
            improvementAreas: this.identifyImprovementAreas(wordAccuracy)
        };
    }

    /**
     * Generate specific feedback for individual words
     */
    generateWordLevelFeedback(wordDetail, targetWord, confidence) {
        if (!targetWord) return '';

        const word = targetWord.original;
        
        if (confidence >= this.pronunciationSession.confidenceThresholds.excellent) {
            return `Excellent pronunciation of "${word}"!`;
        } else if (confidence >= this.pronunciationSession.confidenceThresholds.good) {
            return `Good pronunciation of "${word}"`;
        } else if (confidence >= this.pronunciationSession.confidenceThresholds.fair) {
            if (targetWord.isIrishWord) {
                return `Try to pronounce "${word}" more clearly. Focus on Irish vowel sounds.`;
            }
            return `Try to pronounce "${word}" more clearly.`;
        } else {
            if (targetWord.isIrishWord) {
                return `"${word}" needs work. Practice the Irish pronunciation slowly.`;
            }
            return `"${word}" was unclear. Try speaking more slowly and clearly.`;
        }
    }

    /**
     * Calculate overall pronunciation grade
     */
    calculatePronunciationGrade(score) {
        if (score >= 90) return { grade: 'A', description: 'Excellent' };
        if (score >= 80) return { grade: 'B', description: 'Good' };
        if (score >= 70) return { grade: 'C', description: 'Fair' };
        if (score >= 60) return { grade: 'D', description: 'Needs Improvement' };
        return { grade: 'F', description: 'Poor' };
    }

    /**
     * Identify specific areas for pronunciation improvement
     */
    identifyImprovementAreas(wordAccuracy) {
        const improvements = [];
        
        // Find consistently problematic areas
        const poorWords = wordAccuracy.filter(w => w.accuracyLevel === 'poor');
        const fairWords = wordAccuracy.filter(w => w.accuracyLevel === 'fair');
        
        if (poorWords.length > 0) {
            improvements.push({
                type: 'clarity',
                message: `Focus on clearer pronunciation of: ${poorWords.map(w => w.word).join(', ')}`,
                priority: 'high'
            });
        }
        
        if (fairWords.length > 0) {
            improvements.push({
                type: 'confidence',
                message: `Practice these words: ${fairWords.map(w => w.word).join(', ')}`,
                priority: 'medium'
            });
        }

        // Irish-specific suggestions
        const irishWords = wordAccuracy.filter(w => w.accuracyLevel !== 'excellent');
        if (irishWords.length > 0) {
            improvements.push({
                type: 'irish_pronunciation',
                message: 'Focus on Irish vowel sounds and consonant clusters (dh, gh, bh, mh)',
                priority: 'medium'
            });
        }

        return improvements;
    }

    /**
     * Process and display analysis results with real-time feedback
     */
    async processAnalysisResults(analysisResult) {
        const { metrics, comparison } = analysisResult;
        
        // Update session statistics
        this.updateSessionStatistics(metrics);
        
        // Show real-time word highlighting
        await this.displayWordLevelFeedback(metrics.wordAccuracy);
        
        // Display comprehensive feedback panel
        this.displayPronunciationResults(analysisResult);
        
        // Update practice session state
        this.updatePracticeSession(analysisResult);
        
        // Show practice options
        this.showPracticeOptions(metrics);
    }

    /**
     * Display word-level feedback with color highlighting
     * OPTIMIZED: Uses requestAnimationFrame for better performance
     */
    async displayWordLevelFeedback(wordAccuracy) {
        const sentenceElement = document.querySelector(`[data-index="${this.currentSentenceIndex}"]`);
        if (!sentenceElement || !this.uiAnimations) {
            console.log('Word-level feedback:', wordAccuracy.map(w => `${w.word}: ${w.isCorrect ? 'CORRECT' : 'INCORRECT'} (${Math.round(w.confidence * 100)}%)`));
            return;
        }

        // Break sentence into individual word elements for highlighting
        const words = sentenceElement.textContent.split(/\s+/);
        const wordElements = this.createWordElements(sentenceElement, words);
        
        // OPTIMIZED: Use requestAnimationFrame for better performance
        this.animateWordFeedback(wordAccuracy, wordElements);
    }

    /**
     * Optimized word feedback animation using requestAnimationFrame
     */
    animateWordFeedback(wordAccuracy, wordElements) {
        let currentWordIndex = 0;
        const animationDelay = 100;
        let lastTime = 0;

        const animateNext = (currentTime) => {
            if (currentTime - lastTime >= animationDelay) {
                if (currentWordIndex < Math.min(wordAccuracy.length, wordElements.length)) {
                    const wordData = wordAccuracy[currentWordIndex];
                    const element = wordElements[currentWordIndex];
                    
                    if (element) {
                        // Apply confidence-based highlighting
                        const highlightClass = this.getHighlightClass(wordData.confidence);
                        element.className = `word-highlight ${highlightClass}`;
                        
                        // Show detailed feedback with animation
                        if (this.uiAnimations) {
                            this.uiAnimations.showPronunciationFeedback(
                                element, 
                                wordData.isCorrect, 
                                wordData.confidence, 
                                wordData.feedback
                            );
                        }
                    }
                    
                    currentWordIndex++;
                    lastTime = currentTime;
                }
            }
            
            if (currentWordIndex < Math.min(wordAccuracy.length, wordElements.length)) {
                requestAnimationFrame(animateNext);
            }
        };
        
        requestAnimationFrame(animateNext);
    }

    /**
     * Create individual word elements for highlighting
     * OPTIMIZED: Uses DocumentFragment instead of innerHTML for better performance
     */
    createWordElements(sentenceElement, words) {
        const originalText = sentenceElement.textContent;
        const wordElements = [];
        
        // OPTIMIZED: Use DocumentFragment to avoid reflows
        const fragment = document.createDocumentFragment();
        let wordIndex = 0;
        
        words.forEach((word, index) => {
            if (word.trim()) {
                const wordSpan = document.createElement('span');
                wordSpan.className = 'word-element';
                wordSpan.dataset.wordIndex = wordIndex;
                wordSpan.textContent = word;
                fragment.appendChild(wordSpan);
                wordElements.push(wordSpan);
                wordIndex++;
            }
            if (index < words.length - 1 && words[index + 1].trim()) {
                fragment.appendChild(document.createTextNode(' '));
            }
        });
        
        // Clear and append fragment (single reflow)
        sentenceElement.textContent = '';
        sentenceElement.appendChild(fragment);
        
        return wordElements;
    }

    /**
     * Get appropriate highlight class based on confidence score
     */
    getHighlightClass(confidence) {
        if (confidence >= this.pronunciationSession.confidenceThresholds.excellent) {
            return 'excellent-pronunciation'; // Dark green
        } else if (confidence >= this.pronunciationSession.confidenceThresholds.good) {
            return 'good-pronunciation'; // Green
        } else if (confidence >= this.pronunciationSession.confidenceThresholds.fair) {
            return 'fair-pronunciation'; // Yellow/Orange
        } else {
            return 'poor-pronunciation'; // Red
        }
    }

    /**
     * Display comprehensive pronunciation results panel
     */
    displayPronunciationResults(analysisResult) {
        const { metrics, comparison } = analysisResult;
        const feedbackArea = document.getElementById('feedback-area');
        const feedbackContent = document.getElementById('feedback-content');
        
        if (!feedbackArea || !feedbackContent) {
            console.log('Pronunciation Results:', metrics);
            return;
        }

        // Create comprehensive feedback display
        feedbackContent.innerHTML = `
            <div class="pronunciation-results">
                <!-- Overall Score -->
                <div class="overall-score">
                    <div class="score-circle ${metrics.pronunciationGrade.grade.toLowerCase()}">
                        <span class="grade">${metrics.pronunciationGrade.grade}</span>
                        <span class="score">${Math.round(metrics.overallScore)}%</span>
                    </div>
                    <div class="score-description">
                        <h4>${metrics.pronunciationGrade.description}</h4>
                        <p>Average Confidence: ${Math.round(metrics.averageConfidence * 100)}%</p>
                    </div>
                </div>

                <!-- Word-by-word Analysis -->
                <div class="word-analysis">
                    <h5>Word-by-Word Analysis</h5>
                    <div class="word-grid">
                        ${metrics.wordAccuracy.map(word => `
                            <div class="word-result ${word.accuracyLevel}">
                                <span class="word">${word.word}</span>
                                <span class="confidence">${Math.round(word.confidence * 100)}%</span>
                                <span class="status">${word.isCorrect ? '✓' : '✗'}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Improvement Suggestions -->
                ${metrics.improvementAreas.length > 0 ? `
                    <div class="improvements">
                        <h5>Suggestions for Improvement</h5>
                        <ul>
                            ${metrics.improvementAreas.map(area => `
                                <li class="improvement ${area.priority}">
                                    <strong>${area.type.replace('_', ' ')}:</strong> ${area.message}
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}

                <!-- Irish Language Tips -->
                <div class="irish-tips">
                    <h5>Irish Pronunciation Tips</h5>
                    <div class="tips-grid">
                        <div class="tip">
                            <strong>Vowels:</strong> Irish vowels can be broad (a, o, u) or slender (e, i)
                        </div>
                        <div class="tip">
                            <strong>Fadas:</strong> Vowels with fadas (á, é, í, ó, ú) are longer
                        </div>
                        <div class="tip">
                            <strong>Consonants:</strong> Watch for aspirated consonants (bh, dh, gh, mh)
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Show feedback area with animation
        feedbackArea.style.display = 'block';
        if (this.uiAnimations) {
            this.uiAnimations.animateEntrance(feedbackArea, 'slide-up');
        }
    }

    /**
     * Update session statistics
     */
    updateSessionStatistics(metrics) {
        this.feedbackState.sessionStats.totalAttempts++;
        this.feedbackState.sessionStats.correctWords += metrics.correctWords;
        this.feedbackState.sessionStats.totalWords += metrics.totalWords;
        
        // Calculate rolling average confidence
        const currentAvg = this.feedbackState.sessionStats.averageConfidence;
        const attempts = this.feedbackState.sessionStats.totalAttempts;
        this.feedbackState.sessionStats.averageConfidence = 
            (currentAvg * (attempts - 1) + metrics.averageConfidence) / attempts;

        // Update UI statistics display
        this.updateStatsDisplay();
    }

    /**
     * Update pronunciation practice session state
     */
    updatePracticeSession(analysisResult) {
        this.pronunciationSession.attempts.push({
            timestamp: analysisResult.timestamp,
            metrics: analysisResult.metrics,
            comparison: analysisResult.comparison
        });

        // Update error tracking
        const errors = analysisResult.metrics.wordAccuracy.filter(w => !w.isCorrect);
        errors.forEach(error => {
            if (this.errorManager) {
                const currentSentence = this.sentences[this.currentSentenceIndex];
                this.errorManager.recordError({
                    sentence: currentSentence ? currentSentence.content : '',
                    expectedText: error.word,
                    actualText: error.transcribed,
                    errorType: 'pronunciation',
                    confidence: error.confidence,
                    feedback: error.feedback,
                    sessionContext: {
                        sentenceIndex: this.currentSentenceIndex,
                        attemptNumber: this.pronunciationSession.attempts.length
                    }
                });
            }
        });

        // Show error tracking modal if there are recent errors (after 3+ errors in session)
        if (this.errorManager && this.feedbackState.sessionStats.totalAttempts >= 2) {
            const recentErrors = this.errorManager.getRecentSessionErrors(3);
            if (recentErrors.length >= 2) {
                // Delay modal to not interrupt immediate feedback
                setTimeout(() => {
                    this.errorManager.showErrorTrackingModal(recentErrors);
                }, 3000);
            }
        }
    }

    /**
     * Show practice options based on results with enhanced controls
     */
    showPracticeOptions(metrics) {
        const optionsContainer = document.getElementById('practice-options');
        if (!optionsContainer) return;

        const needsImprovement = metrics.overallScore < 70;
        
        // Update practice control state
        this.feedbackState.practiceControlState = {
            canHearAgain: true,
            canTryAgain: true,
            canMarkCorrect: !needsImprovement,
            canSkipNext: true,
            isOperationInProgress: false
        };
        
        optionsContainer.innerHTML = `
            <div class="practice-options">
                <h5>What would you like to do next?</h5>
                <div class="practice-shortcuts-hint" style="font-size: 0.8em; margin-bottom: 10px; color: #666;">
                    Quick keys: 1-Hear Again, 2-Try Again, 3-Mark Correct, 4-Skip Next
                </div>
                <div class="option-buttons">
                    <button id="hear-again-btn" 
                            class="practice-option-btn" 
                            aria-label="Press 1 or H to hear the target pronunciation again"
                            title="Keyboard: 1 or H">
                        🔊 Hear Again
                    </button>
                    <button id="try-again-btn" 
                            class="practice-option-btn ${needsImprovement ? 'recommended' : ''}"
                            aria-label="Press 2 or T to record another pronunciation attempt"
                            title="Keyboard: 2 or T">
                        🎤 Try Again ${needsImprovement ? '(Recommended)' : ''}
                    </button>
                    <button id="mark-correct-btn" 
                            class="practice-option-btn" 
                            ${needsImprovement ? 'disabled' : ''}
                            aria-label="Press 3 or M to manually mark this pronunciation as correct"
                            title="Keyboard: 3 or M${needsImprovement ? ' (Disabled - needs improvement)' : ''}">
                        ✓ Mark as Correct
                    </button>
                    <button id="skip-next-btn" 
                            class="practice-option-btn"
                            aria-label="Press 4 or S to skip to the next sentence"
                            title="Keyboard: 4 or S">
                        ⏭ Skip to Next
                    </button>
                </div>
                <div class="practice-session-info" style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 5px; font-size: 0.9em;">
                    <div class="session-stats-quick">
                        Attempt: <strong>${this.feedbackState.sessionStats.totalAttempts + 1}</strong> | 
                        Accuracy: <strong>${Math.round(this.getSessionAccuracy())}%</strong> |
                        Confidence: <strong>${Math.round(this.feedbackState.sessionStats.averageConfidence * 100)}%</strong>
                    </div>
                </div>
            </div>
        `;

        // Re-bind event listeners with enhanced handling
        this.bindPracticeOptionEvents();
        
        // Auto-focus recommended action
        if (needsImprovement) {
            setTimeout(() => {
                document.getElementById('try-again-btn')?.focus();
            }, 100);
        }
        
        optionsContainer.style.display = 'block';
        
        // Save attempt to session history
        this.recordAttemptInHistory(metrics);
        
        // Auto-save session state
        this.autoSaveSession();
    }

    /**
     * Bind event listeners for practice options with enhanced handling
     */
    bindPracticeOptionEvents() {
        // Use event delegation to handle dynamically created buttons
        const optionsContainer = document.getElementById('practice-options');
        if (!optionsContainer) return;

        // Remove existing listeners to prevent duplicates
        optionsContainer.removeEventListener('click', this.practiceOptionHandler);
        
        // Create bound handler if it doesn't exist
        if (!this.practiceOptionHandler) {
            this.practiceOptionHandler = (e) => {
                if (this.feedbackState.practiceControlState.isOperationInProgress) {
                    return; // Prevent concurrent operations
                }

                const target = e.target.closest('button');
                if (!target) return;

                e.preventDefault();
                
                switch (target.id) {
                    case 'hear-again-btn':
                        if (this.feedbackState.practiceControlState.canHearAgain) {
                            this.hearTargetAgain();
                        }
                        break;
                    case 'try-again-btn':
                        if (this.feedbackState.practiceControlState.canTryAgain) {
                            this.tryPronunciationAgain();
                        }
                        break;
                    case 'mark-correct-btn':
                        if (this.feedbackState.practiceControlState.canMarkCorrect) {
                            this.markAsCorrect();
                        }
                        break;
                    case 'skip-next-btn':
                        if (this.feedbackState.practiceControlState.canSkipNext) {
                            this.skipToNext();
                        }
                        break;
                }
            };
        }
        
        // Add event listener with delegation
        optionsContainer.addEventListener('click', this.practiceOptionHandler);
    }

    /**
     * Practice option: Hear target pronunciation again with enhanced controls
     */
    async hearTargetAgain() {
        if (this.feedbackState.practiceControlState.isOperationInProgress) {
            return;
        }

        this.feedbackState.practiceControlState.isOperationInProgress = true;
        this.showPronunciationStatus('Playing target pronunciation...', 'playing');
        
        try {
            await this.playSentence();
            
            this.showPronunciationStatus('Ready to practice', 'ready');
        } catch (error) {
            console.error('Error playing target pronunciation:', error);
            this.showPronunciationStatus('Error playing audio. Try again.', 'error');
        } finally {
            this.feedbackState.practiceControlState.isOperationInProgress = false;
        }
    }

    /**
     * Practice option: Try pronunciation again with enhanced state reset
     */
    tryPronunciationAgain() {
        if (this.feedbackState.practiceControlState.isOperationInProgress) {
            return;
        }

        this.clearPronunciationFeedback();
        this.showPronunciationStatus('Ready for another attempt', 'ready');
        
        // Reset recording UI with enhanced state management
        const recordBtn = document.getElementById('record-btn');
        const playbackBtn = document.getElementById('playback-btn');
        const compareBtn = document.getElementById('compare-btn');
        
        if (recordBtn) {
            recordBtn.disabled = false;
            recordBtn.textContent = '🎤 Record Pronunciation';
            recordBtn.classList.remove('recording', 'recorded');
        }
        
        if (playbackBtn) {
            playbackBtn.disabled = true;
            playbackBtn.classList.remove('active');
        }
        
        if (compareBtn) {
            compareBtn.disabled = true;
            compareBtn.classList.remove('active');
        }
        
        // Clear current recording
        this.currentRecording = null;
        
        // Hide practice options
        const optionsContainer = document.getElementById('practice-options');
        if (optionsContainer) {
            optionsContainer.style.display = 'none';
        }
        
        // Focus on record button for easy access
        setTimeout(() => recordBtn?.focus(), 100);
    }

    /**
     * Practice option: Mark as correct with confirmation and enhanced tracking
     */
    async markAsCorrect() {
        if (this.feedbackState.practiceControlState.isOperationInProgress) {
            return;
        }

        // Check if confirmation is needed for low scores
        if (this.pronunciationSession.practicePreferences.confirmMarkCorrect) {
            const currentAnalysis = this.feedbackState.currentAnalysis;
            if (currentAnalysis && currentAnalysis.overallScore < 70) {
                const confirmed = await this.showConfirmationDialog(
                    'Mark as Correct?',
                    `The pronunciation score is ${Math.round(currentAnalysis.overallScore)}%. Are you sure you want to mark this as correct?`,
                    ['Yes, mark correct', 'Cancel']
                );
                
                if (!confirmed) {
                    return;
                }
            }
        }

        this.feedbackState.practiceControlState.isOperationInProgress = true;
        
        const currentSentence = this.sentences[this.currentSentenceIndex];
        this.showPronunciationStatus('Marked as correct!', 'success');
        
        // Update statistics as if it was a perfect score
        const targetWords = this.extractTargetWords(currentSentence);
        this.feedbackState.sessionStats.correctWords += targetWords.length;
        
        // Record this as a manual override in session history
        this.recordManualOverride(currentSentence, targetWords.length);
        
        // Update improvement trend
        this.updateImprovementTrend(100); // Perfect score for manual override
        
        this.updateStatsDisplay();
        
        // Auto-advance if enabled
        if (this.pronunciationSession.practicePreferences.autoAdvance) {
            setTimeout(() => this.skipToNext(), 1000);
        } else {
            setTimeout(() => {
                this.feedbackState.practiceControlState.isOperationInProgress = false;
                this.skipToNext();
            }, 1500);
        }
    }

    /**
     * Practice option: Skip to next sentence with enhanced state management
     */
    skipToNext() {
        if (this.feedbackState.practiceControlState.isOperationInProgress) {
            return;
        }

        // Record skip in session history if there was an active attempt
        if (this.feedbackState.currentAnalysis) {
            this.recordSkippedAttempt();
        }

        this.clearPronunciationFeedback();
        this.nextSentence();
        this.showPronunciationStatus('Ready to practice next sentence', 'ready');
        
        // Auto-save progress
        this.autoSaveSession();
    }

    /**
     * Update statistics display with enhanced metrics
     */
    updateStatsDisplay() {
        const stats = this.feedbackState.sessionStats;
        const accuracy = this.getSessionAccuracy();
        
        // Update total attempts
        const totalAttemptsEl = document.getElementById('total-attempts');
        if (totalAttemptsEl) totalAttemptsEl.textContent = stats.totalAttempts;
        
        // Update pronunciation accuracy
        const accuracyEl = document.getElementById('pronunciation-accuracy');
        if (accuracyEl) {
            accuracyEl.textContent = Math.round(accuracy) + '%';
            // Add visual feedback for accuracy level
            accuracyEl.className = this.getAccuracyClass(accuracy);
        }
        
        // Update average confidence
        const confidenceEl = document.getElementById('avg-confidence');
        if (confidenceEl) {
            confidenceEl.textContent = Math.round(stats.averageConfidence * 100) + '%';
            confidenceEl.className = this.getConfidenceClass(stats.averageConfidence);
        }
        
        // Update practice attempts counter
        const attemptsEl = document.getElementById('practice-attempts');
        if (attemptsEl) attemptsEl.textContent = stats.totalAttempts;
        
        // Update streak information
        const currentStreakEl = document.getElementById('current-streak');
        if (currentStreakEl) currentStreakEl.textContent = stats.streaks.current;
        
        const bestStreakEl = document.getElementById('best-streak');
        if (bestStreakEl) bestStreakEl.textContent = stats.streaks.best;
        
        // Show stats panel if hidden
        const statsPanel = document.getElementById('pronunciation-stats');
        if (statsPanel && stats.totalAttempts > 0) {
            statsPanel.style.display = 'block';
        }
        
        // Update session duration
        this.updateSessionDuration();
    }

    /**
     * Get session accuracy percentage
     */
    getSessionAccuracy() {
        const stats = this.feedbackState.sessionStats;
        return stats.totalWords > 0 ? (stats.correctWords / stats.totalWords * 100) : 0;
    }

    /**
     * Get CSS class for accuracy level
     */
    getAccuracyClass(accuracy) {
        if (accuracy >= 90) return 'accuracy-excellent';
        if (accuracy >= 80) return 'accuracy-good';
        if (accuracy >= 70) return 'accuracy-fair';
        return 'accuracy-poor';
    }

    /**
     * Get CSS class for confidence level
     */
    getConfidenceClass(confidence) {
        if (confidence >= 0.9) return 'confidence-excellent';
        if (confidence >= 0.8) return 'confidence-good';
        if (confidence >= 0.7) return 'confidence-fair';
        return 'confidence-poor';
    }

    /**
     * Record attempt in session history
     */
    recordAttemptInHistory(metrics) {
        const attempt = {
            sentenceIndex: this.currentSentenceIndex,
            sentenceText: this.sentences[this.currentSentenceIndex]?.text || '',
            timestamp: new Date().toISOString(),
            metrics: {
                overallScore: metrics.overallScore,
                confidence: metrics.averageConfidence,
                wordAccuracy: metrics.wordAccuracy,
                grade: metrics.grade
            },
            wordResults: this.feedbackState.wordLevelResults,
            type: 'pronunciation_attempt'
        };

        this.pronunciationSession.attempts.push(attempt);
        this.pronunciationSession.sessionHistory.push(attempt);

        // Update improvement trend
        this.updateImprovementTrend(metrics.overallScore);

        // Update streaks
        this.updateStreaks(metrics.overallScore >= 70);
        
        // Track best attempts per sentence
        const sentenceKey = `sentence_${this.currentSentenceIndex}`;
        const currentBest = this.feedbackState.sessionStats.bestAttempts.get(sentenceKey);
        if (!currentBest || metrics.overallScore > currentBest.score) {
            this.feedbackState.sessionStats.bestAttempts.set(sentenceKey, {
                score: metrics.overallScore,
                timestamp: attempt.timestamp,
                attempt: attempt
            });
        }
    }

    /**
     * Record manual override in history
     */
    recordManualOverride(sentence, wordCount) {
        const override = {
            sentenceIndex: this.currentSentenceIndex,
            sentenceText: sentence?.text || '',
            timestamp: new Date().toISOString(),
            wordCount: wordCount,
            type: 'manual_override',
            reason: 'user_marked_correct'
        };

        this.pronunciationSession.sessionHistory.push(override);
    }

    /**
     * Record skipped attempt in history
     */
    recordSkippedAttempt() {
        const skip = {
            sentenceIndex: this.currentSentenceIndex,
            sentenceText: this.sentences[this.currentSentenceIndex]?.text || '',
            timestamp: new Date().toISOString(),
            type: 'skipped_attempt',
            previousAnalysis: this.feedbackState.currentAnalysis
        };

        this.pronunciationSession.sessionHistory.push(skip);
    }

    /**
     * Update improvement trend
     */
    updateImprovementTrend(score) {
        const trend = this.feedbackState.sessionStats.improvementTrend;
        trend.push({
            timestamp: Date.now(),
            score: score,
            sentenceIndex: this.currentSentenceIndex
        });

        // Keep only last 20 scores for trend analysis
        if (trend.length > 20) {
            trend.shift();
        }
    }

    /**
     * Update streak counters
     */
    updateStreaks(isCorrect) {
        const streaks = this.feedbackState.sessionStats.streaks;
        
        if (isCorrect) {
            streaks.current++;
            if (streaks.current > streaks.best) {
                streaks.best = streaks.current;
            }
        } else {
            streaks.current = 0;
        }
    }

    /**
     * Update session duration
     */
    updateSessionDuration() {
        if (!this.pronunciationSession.startTime) {
            this.pronunciationSession.startTime = Date.now();
        }
        
        const duration = Date.now() - this.pronunciationSession.startTime;
        this.feedbackState.sessionStats.sessionDuration = duration;
        
        const durationEl = document.getElementById('session-duration');
        if (durationEl) {
            const minutes = Math.floor(duration / 60000);
            const seconds = Math.floor((duration % 60000) / 1000);
            durationEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    /**
     * Auto-save session to localStorage
     */
    autoSaveSession() {
        try {
            const sessionData = {
                pronunciationSession: this.pronunciationSession,
                feedbackState: {
                    sessionStats: this.feedbackState.sessionStats
                },
                currentSentenceIndex: this.currentSentenceIndex,
                savedAt: new Date().toISOString()
            };
            
            // OPTIMIZED: Check available storage space before saving
            const dataString = JSON.stringify(sessionData);
            const dataSize = new Blob([dataString]).size;
            
            // Check if we have enough space (conservative estimate)
            if (this.checkStorageQuota(dataSize)) {
                localStorage.setItem('pronunciation_session_autosave', dataString);
                this.pronunciationSession.lastSavedTime = Date.now();
            } else {
                console.warn('Insufficient storage space for session save');
                this.handleStorageFull();
            }
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                console.warn('Storage quota exceeded:', error);
                this.handleStorageFull();
            } else {
                console.warn('Failed to auto-save session:', error);
            }
        }
    }

    /**
     * Check if there's enough storage quota for data
     */
    checkStorageQuota(dataSize) {
        try {
            // Estimate current usage
            let currentUsage = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    currentUsage += localStorage[key].length + key.length;
                }
            }
            
            // Conservative estimate: assume 5MB limit (minimum across browsers)
            const quotaLimit = 5 * 1024 * 1024; // 5MB in bytes
            const safetyMargin = 0.8; // Use 80% of available space
            
            return (currentUsage + dataSize) < (quotaLimit * safetyMargin);
        } catch (error) {
            console.warn('Could not check storage quota:', error);
            return true; // Assume it's fine if we can't check
        }
    }

    /**
     * Handle storage full situation
     */
    handleStorageFull() {
        // Clear old session data to make space
        const keysToRemove = [];
        for (let key in localStorage) {
            if (key.startsWith('pronunciation_') && key !== 'pronunciation_session_autosave') {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => {
            try {
                localStorage.removeItem(key);
            } catch (e) {
                console.warn('Could not remove key:', key);
            }
        });
        
        // Show user notification
        this.showError('Storage space low. Some old session data was cleared to make room.');
    }

    /**
     * Load session from localStorage
     */
    loadSavedSession() {
        try {
            const saved = localStorage.getItem('pronunciation_session_autosave');
            if (!saved) return false;
            
            const sessionData = JSON.parse(saved);
            
            // Validate saved data
            if (!sessionData.savedAt || !sessionData.pronunciationSession) {
                return false;
            }
            
            // Check if session is recent (within 24 hours)
            const savedTime = new Date(sessionData.savedAt).getTime();
            const now = Date.now();
            if (now - savedTime > 24 * 60 * 60 * 1000) {
                return false;
            }
            
            // Restore session data
            this.pronunciationSession = { ...this.pronunciationSession, ...sessionData.pronunciationSession };
            this.feedbackState.sessionStats = { ...this.feedbackState.sessionStats, ...sessionData.feedbackState.sessionStats };
            
            if (sessionData.currentSentenceIndex !== undefined) {
                this.currentSentenceIndex = sessionData.currentSentenceIndex;
            }
            
            return true;
        } catch (error) {
            console.warn('Failed to load saved session:', error);
            return false;
        }
    }

    /**
     * Clear session data
     */
    clearSessionData() {
        localStorage.removeItem('pronunciation_session_autosave');
        
        // Reset to initial state
        this.pronunciationSession = {
            currentSentenceId: null,
            attempts: [],
            startTime: null,
            targetWords: [],
            confidenceThresholds: {
                excellent: 0.8,
                good: 0.7,
                fair: 0.5,
                poor: 0.3
            },
            practiceOptions: {
                hearAgain: true,
                tryAgain: true,
                markCorrect: false,
                skipNext: false
            },
            sessionHistory: [],
            lastSavedTime: null,
            ttsSettings: {
                speakingRate: 1.0,
                pitch: 0.0,
                volume: 0.0
            },
            practicePreferences: {
                autoAdvance: false,
                confirmMarkCorrect: true,
                showDetailedFeedback: true
            }
        };
        
        this.feedbackState.sessionStats = {
            totalAttempts: 0,
            correctWords: 0,
            totalWords: 0,
            averageConfidence: 0,
            sessionDuration: 0,
            improvementTrend: [],
            bestAttempts: new Map(),
            streaks: {
                current: 0,
                best: 0
            }
        };
    }

    /**
     * Export session data as JSON
     */
    exportSessionData() {
        const exportData = {
            sessionInfo: {
                startTime: this.pronunciationSession.startTime,
                endTime: Date.now(),
                duration: this.feedbackState.sessionStats.sessionDuration
            },
            statistics: this.feedbackState.sessionStats,
            attempts: this.pronunciationSession.attempts,
            history: this.pronunciationSession.sessionHistory,
            settings: {
                ttsSettings: this.pronunciationSession.ttsSettings,
                practicePreferences: this.pronunciationSession.practicePreferences
            },
            textInfo: {
                totalSentences: this.sentences.length,
                currentSentenceIndex: this.currentSentenceIndex,
                completionPercentage: (this.currentSentenceIndex / this.sentences.length * 100)
            },
            exportedAt: new Date().toISOString()
        };
        
        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Show confirmation dialog (simplified implementation)
     */
    async showConfirmationDialog(title, message, buttons) {
        // For now, use browser's confirm dialog
        // In a full implementation, this would show a custom modal
        return confirm(`${title}\n\n${message}`);
    }

    /**
     * Practice specific text (called from error tracking)
     * @param {string} text - Text to practice
     */
    async practiceSpecificText(text) {
        console.log('Starting practice for specific text:', text);
        
        // Set the text as current practice target
        this.currentPracticeText = text;
        this.isPracticeMode = true;
        
        // Show practice status
        this.showPronunciationStatus(`Ready to practice: "${text}"`, 'ready');
        
        // Speak the target text first
        try {
            if (this.ttsService) {
                this.showPronunciationStatus('Playing target pronunciation...', 'playing');
                const playbackSpeed = Math.max(0.5, Math.min(2, Number(this.settings?.speechRate || 1)));
                const ttsResult = await this.ttsService.synthesize(text, null, { speed: playbackSpeed });
                const audio = await this.ttsService.play(ttsResult);
                if (audio) {
                    await new Promise(resolve => {
                        audio.onended = resolve;
                        audio.onerror = resolve;
                    });
                }
            }
        } catch (error) {
            console.error('Error playing target pronunciation:', error);
        }
        
        // Enable recording for practice
        this.showPronunciationStatus(`Ready to record: "${text}"`, 'ready');
        const recordBtn = document.getElementById('record-btn');
        if (recordBtn) {
            recordBtn.disabled = false;
            recordBtn.textContent = '🎤 Record Practice';
        }
    }

    /**
     * Show pronunciation feedback for a specific word with animations
     * @param {number} wordIndex - Index of the word in current sentence
     * @param {boolean} isCorrect - Whether pronunciation was correct
     * @param {number} confidence - Confidence score (0-1)
     * @param {string} feedback - Optional feedback message
     */
    showWordPronunciationFeedback(wordIndex, isCorrect, confidence = 1, feedback = '') {
        if (!this.uiAnimations) {
            console.log(`Word ${wordIndex}: ${isCorrect ? 'Correct' : 'Incorrect'} (${Math.round(confidence * 100)}%)`);
            return;
        }
        
        const sentenceElement = document.querySelector(`[data-index="${this.currentSentenceIndex}"]`);
        if (sentenceElement && this.uiAnimations.currentWordElements[wordIndex]) {
            const wordElement = this.uiAnimations.currentWordElements[wordIndex];
            this.uiAnimations.showPronunciationFeedback(wordElement, isCorrect, confidence, feedback);
        }
    }

    /**
     * Toggle pronunciation practice mode with visual feedback
     */
    async togglePracticeMode() {
        this.isPracticeMode = !this.isPracticeMode;
        
        const practicePanel = document.getElementById('pronunciation-panel');
        const practiceBtn = document.getElementById('practice-btn');
        const recordBtn = document.getElementById('record-btn');

        if (practicePanel) {
            if (this.isPracticeMode) {
                practicePanel.style.display = 'block';
                if (this.uiAnimations) {
                    this.uiAnimations.animateEntrance(practicePanel, 'slide-down');
                }
                if (practiceBtn) practiceBtn.textContent = 'Exit Practice Mode';
                if (recordBtn) recordBtn.disabled = false;
            } else {
                practicePanel.style.display = 'none';
                if (practiceBtn) practiceBtn.textContent = 'Practice Mode';
                if (recordBtn) recordBtn.disabled = true;
                
                // Clear any pronunciation feedback
                if (this.uiAnimations) {
                    this.uiAnimations.clearAllWordHighlights();
                }
            }
        }
        
        console.log(`Practice mode ${this.isPracticeMode ? 'enabled' : 'disabled'}`);
    }

    /**
     * Set up pronunciation practice session
     */
    setupPracticeSession() {
        const practiceText = document.getElementById('practice-text');
        const results = document.getElementById('practice-results');
        const feedback = document.getElementById('pronunciation-feedback');
        
        if (practiceText) {
            practiceText.innerHTML = `
                <h4>Practice this sentence:</h4>
                <p class="practice-sentence">${this.currentPracticeText}</p>
            `;
        }
        
        if (results) results.innerHTML = '';
        if (feedback) feedback.innerHTML = '';
        
        // Set up recording button
        const recordBtn = document.getElementById('record-btn');
        if (recordBtn) {
            recordBtn.addEventListener('click', () => this.toggleRecording());
        }
    }

    /**
     * Toggle audio recording for pronunciation practice
     */
    async toggleRecording() {
        try {
            if (this.audioProcessor.isRecording) {
                // Do nothing - use the dedicated stop button now
                console.log('Use the Stop Recording button to stop recording');
                return;
            } else {
                await this.startRecording();
            }
        } catch (error) {
            console.error('Recording error:', error);
            this.showError('Recording failed: ' + error.message);
        }
    }

    /**
     * Start audio recording with enhanced features
     */
    async startRecording() {
        try {
            this.updateStatus('Starting recording...');
            
            // Request microphone access first
            await this.audioProcessor.requestMicrophoneAccess();
            
            const recordBtn = document.getElementById('record-btn');
            const stopBtn = document.getElementById('stop-recording-btn');
            const recordingStatus = document.getElementById('recording-status');
            const audioLevelBar = document.getElementById('audio-level-bar');
            const audioLevelContainer = document.getElementById('audio-level-container');
            
            // Show audio level container during recording
            if (audioLevelContainer) audioLevelContainer.style.display = 'block';
            
            // Update button states
            if (recordBtn) {
                recordBtn.disabled = true;
                recordBtn.style.backgroundColor = '#6c757d';
            }
            if (stopBtn) {
                stopBtn.disabled = false;
                stopBtn.style.backgroundColor = '#ffc107';
            }
            
            // Set up audio level monitoring
            const onLevelUpdate = (level) => {
                if (audioLevelBar) {
                    audioLevelBar.style.width = `${level}%`;
                    audioLevelBar.style.backgroundColor = level > 80 ? '#ff6b6b' : 
                                                       level > 40 ? '#4ecdc4' : '#95a5a6';
                }
            };
            
            // Start recording with shorter timeout for sentence-level practice
            this.recordingPromise = this.audioProcessor.recordWithTimeout(10, onLevelUpdate);
            
            if (recordingStatus) {
                recordingStatus.textContent = 'Recording... Speak clearly!';
                recordingStatus.className = 'status-recording';
            }
            
            this.updateStatus('Recording in progress. Speak the sentence clearly.');
            
            // Auto-stop after timeout
            this.recordingPromise.then(async (audioBlob) => {
                if (audioBlob) {
                    await this.handleRecordingComplete(audioBlob);
                }
            }).catch(error => {
                console.error('Recording error:', error);
                this.handleRecordingError(error);
            });
            
        } catch (error) {
            this.handleRecordingError(error);
            throw new Error(`Failed to start recording: ${error.message}`);
        }
    }

    /**
     * Stop recording and analyze pronunciation
     */
    async stopRecording() {
        try {
            if (!this.audioProcessor.isRecording) {
                return;
            }
            
            this.updateStatus('Processing recording...');
            
            const audioBlob = await this.audioProcessor.stopRecording();
            await this.handleRecordingComplete(audioBlob);
            
        } catch (error) {
            this.handleRecordingError(error);
            throw new Error(`Failed to process recording: ${error.message}`);
        }
    }

    /**
     * Playback the last recorded audio
     */
    async playbackRecording() {
        try {
            // Check if we have a recent recording
            if (!this.audioProcessor.lastRecording) {
                this.showError('No recording available to playback. Please record first.');
                return;
            }

            this.updateStatus('Playing back recording...');

            // Create audio URL from the blob
            const audioUrl = URL.createObjectURL(this.audioProcessor.lastRecording);
            const audio = new Audio(audioUrl);

            // Update UI during playback
            const playbackBtn = document.getElementById('playback-btn');
            const originalText = playbackBtn ? playbackBtn.textContent : 'Playback Recording';

            if (playbackBtn) {
                playbackBtn.disabled = true;
                playbackBtn.textContent = '⏸ Playing...';
                playbackBtn.style.backgroundColor = '#ffc107';
            }

            // Set up audio event handlers
            audio.onended = () => {
                // Clean up when playback finishes
                URL.revokeObjectURL(audioUrl);
                if (playbackBtn) {
                    playbackBtn.disabled = false;
                    playbackBtn.textContent = originalText;
                    playbackBtn.style.backgroundColor = '#6c757d';
                }
                this.updateStatus('Playback complete');
            };

            audio.onerror = (error) => {
                console.error('Audio playback error:', error);
                URL.revokeObjectURL(audioUrl);
                if (playbackBtn) {
                    playbackBtn.disabled = false;
                    playbackBtn.textContent = originalText;
                    playbackBtn.style.backgroundColor = '#6c757d';
                }
                this.showError('Failed to play recording. Please try recording again.');
            };

            // Start playback
            await audio.play();
            console.log('Playing back recorded audio');

        } catch (error) {
            console.error('Playback error:', error);
            this.showError(`Playback failed: ${error.message}`);
        }
    }

    /**
     * Handle completed recording
     * @param {Blob} audioBlob - Recorded audio
     */
    async handleRecordingComplete(audioBlob) {
        try {
            // Store the recording for playback
            this.audioProcessor.lastRecording = audioBlob;
            
            const recordBtn = document.getElementById('record-btn');
            const stopBtn = document.getElementById('stop-recording-btn');
            const recordingStatus = document.getElementById('recording-status');
            const audioLevelBar = document.getElementById('audio-level-bar');
            const audioLevelContainer = document.getElementById('audio-level-container');
            
            // Reset UI
            if (recordBtn) {
                recordBtn.disabled = false;
                recordBtn.style.backgroundColor = '#dc3545';
            }
            if (stopBtn) {
                stopBtn.disabled = true;
                stopBtn.style.backgroundColor = '#6c757d';
            }
            if (recordingStatus) {
                recordingStatus.textContent = 'Processing...';
                recordingStatus.className = 'status-processing';
            }
            if (audioLevelBar) audioLevelBar.style.width = '0%';
            if (audioLevelContainer) audioLevelContainer.style.display = 'none';
            
            // Analyze audio quality first
            const qualityAnalysis = await this.audioProcessor.analyzeAudioQuality(audioBlob);
            
            if (qualityAnalysis.quality === 'too_short' || qualityAnalysis.quality === 'too_quiet') {
                this.showQualityFeedback(qualityAnalysis);
                if (recordingStatus) {
                    recordingStatus.textContent = 'Recording quality issues - try again';
                    recordingStatus.className = 'status-warning';
                }
                return;
            }
            
            // Convert to WAV format for STT
            if (recordingStatus) recordingStatus.textContent = 'Converting audio...';
            const wavBlob = await this.audioProcessor.convertToWAV(audioBlob);
            
            // Enable playback and comparison
            const playbackBtn = document.getElementById('playback-btn');
            const compareBtn = document.getElementById('compare-btn');
            
            if (playbackBtn) playbackBtn.disabled = false;
            if (compareBtn) compareBtn.disabled = false;
            
            if (recordingStatus) {
                recordingStatus.textContent = 'Recording complete - ready for analysis';
                recordingStatus.className = 'status-success';
            }
            
            // Automatically trigger pronunciation analysis for real-time feedback
            if (this.isPracticeMode) {
                setTimeout(async () => {
                    try {
                        await this.analyzePronunciation();
                    } catch (error) {
                        console.error('Auto-analysis failed:', error);
                        if (recordingStatus) {
                            recordingStatus.textContent = 'Recording complete - click Compare for analysis';
                        }
                    }
                }, 500); // Small delay to ensure UI updates
            }
            
            this.updateStatus('Recording completed successfully');
            
            // Apply audio filters for better STT accuracy
            const filteredBlob = await this.audioProcessor.applyAudioFilters(wavBlob, {
                noiseReduction: { cutoff: 100, Q: 1 },
                normalize: { gain: 1.2 },
                compress: { threshold: -20, ratio: 4 }
            });
            
            // Analyze pronunciation using STT
            await this.analyzePronunciation(filteredBlob);
            
        } catch (error) {
            console.error('Error processing recording:', error);
            this.handleRecordingError(error);
        }
    }

    /**
     * Handle recording errors
     * @param {Error} error - Recording error
     */
    handleRecordingError(error) {
        const recordBtn = document.getElementById('record-btn');
        const stopBtn = document.getElementById('stop-recording-btn');
        const recordingStatus = document.getElementById('recording-status');
        const audioLevelBar = document.getElementById('audio-level-bar');
        const audioLevelContainer = document.getElementById('audio-level-container');
        
        // Reset UI
        if (recordBtn) {
            recordBtn.disabled = false;
            recordBtn.style.backgroundColor = '#dc3545';
        }
        if (stopBtn) {
            stopBtn.disabled = true;
            stopBtn.style.backgroundColor = '#6c757d';
        }
        if (recordingStatus) {
            recordingStatus.textContent = 'Recording failed - try again';
            recordingStatus.className = 'status-error';
        }
        if (audioLevelBar) audioLevelBar.style.width = '0%';
        if (audioLevelContainer) audioLevelContainer.style.display = 'none';
        
        // Show error message
        this.showError(`Recording error: ${error.message}`);
        
        // Clean up
        this.audioProcessor.stopAudioLevelMonitoring();
    }

    /**
     * Show audio quality feedback
     * @param {Object} qualityAnalysis - Audio quality analysis results
     */
    showQualityFeedback(qualityAnalysis) {
        const feedbackDiv = document.getElementById('pronunciation-feedback');
        if (!feedbackDiv) return;
        
        feedbackDiv.innerHTML = `
            <div class="quality-feedback ${qualityAnalysis.quality}">
                <h4>Audio Quality Issues</h4>
                <p><strong>Quality:</strong> ${qualityAnalysis.quality.replace('_', ' ').toUpperCase()}</p>
                <ul>
                    ${qualityAnalysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
                <div class="quality-details">
                    <p><strong>Duration:</strong> ${qualityAnalysis.duration.toFixed(2)}s</p>
                    <p><strong>Average Level:</strong> ${Math.round(qualityAnalysis.averageLevel * 100)}%</p>
                    <p><strong>Silence Ratio:</strong> ${Math.round(qualityAnalysis.silenceRatio * 100)}%</p>
                </div>
                <button id="retry-recording" class="btn btn-primary">Try Again</button>
            </div>
        `;
        
        // Set up retry button
        document.getElementById('retry-recording')?.addEventListener('click', () => {
            feedbackDiv.innerHTML = '';
            this.resetRecordingInterface();
        });
    }

    /**
     * Analyze pronunciation using STT service
     * @param {Blob} audioBlob - Recorded audio
     */
    async analyzePronunciation(audioBlob) {
        try {
            this.updateStatus('Analyzing pronunciation...');
            
            // Update STT configuration for WAV format (since we converted it)
            this.sttService.updateConfigForFormat('wav', 16000);
            
            // Convert speech to text
            const sttResults = await this.sttService.speechToText(audioBlob);
            
            // Compare with expected text
            const comparison = this.sttService.identifyPronunciationIssues(
                this.currentPracticeText,
                sttResults
            );
            
            // Store results for error tracking
            this.practiceResults.push({
                timestamp: new Date(),
                expectedText: this.currentPracticeText,
                actualText: sttResults.transcript,
                comparison: comparison
            });
            
            // Display results
            this.displayPronunciationResults(comparison);
            
            // Track errors if score is below threshold
            if (comparison.overallScore < 70) {
                this.errorManager.logError({
                    type: 'pronunciation',
                    text: this.currentPracticeText,
                    userInput: sttResults.transcript,
                    score: comparison.overallScore,
                    feedback: comparison.feedback
                });
            }
            
            this.updateStatus('Pronunciation analysis complete');
            
        } catch (error) {
            console.error('Pronunciation analysis failed:', error);
            this.showError('Pronunciation analysis failed: ' + error.message);
            
            const recordingStatus = document.getElementById('recording-status');
            if (recordingStatus) recordingStatus.textContent = 'Analysis failed';
        }
    }

    /**
     * Display pronunciation analysis results
     * @param {Object} comparison - Comparison results from STT service
     */
    displayPronunciationResults(comparison) {
        const resultsDiv = document.getElementById('practice-results');
        const feedbackDiv = document.getElementById('pronunciation-feedback');
        
        if (resultsDiv) {
            resultsDiv.innerHTML = `
                <div class="pronunciation-score score-${comparison.overallScore >= 80 ? 'good' : comparison.overallScore >= 60 ? 'fair' : 'poor'}">
                    <h4>Score: ${comparison.overallScore}%</h4>
                    <div class="score-details">
                        <p>Word Accuracy: ${Math.round(comparison.wordAccuracy * 100)}%</p>
                        <p>Sequence Accuracy: ${Math.round(comparison.sequenceAccuracy * 100)}%</p>
                        <p>Confidence: ${Math.round(comparison.confidence * 100)}%</p>
                    </div>
                </div>
                
                <div class="transcription-comparison">
                    <p><strong>Expected:</strong> ${comparison.expectedText}</p>
                    <p><strong>You said:</strong> ${comparison.actualText}</p>
                </div>
            `;
        }
        
        if (feedbackDiv) {
            let feedbackHTML = `<div class="feedback-message">${comparison.feedback}</div>`;
            
            if (comparison.suggestions.length > 0) {
                feedbackHTML += `
                    <div class="suggestions">
                        <h5>Suggestions for improvement:</h5>
                        <ul>
                            ${comparison.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }
            
            if (comparison.analysis.pronunciation_issues.length > 0) {
                feedbackHTML += `
                    <div class="pronunciation-issues">
                        <h5>Words to focus on:</h5>
                        <ul>
                            ${comparison.analysis.pronunciation_issues.map(issue => 
                                `<li>${issue.word} (confidence: ${Math.round(issue.confidence * 100)}%)</li>`
                            ).join('')}
                        </ul>
                    </div>
                `;
            }
            
            feedbackDiv.innerHTML = feedbackHTML;
        }
    }

    /**
     * Open settings dialog
     */
    async openSettings() {
        // Get available Irish voices from Abair.ie service
        const availableVoices = this.ttsService.getAvailableVoices();
        const defaultVoice = this.ttsService.getDefaultVoice();
        
        // Create settings modal
        const modal = document.createElement('div');
        modal.className = 'settings-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Irish E-Reader Settings</h3>
                
                <div class="setting-group">
                    <label>Irish Voice:</label>
                    <select id="voice-select">
                        ${availableVoices.map(voice => 
                            `<option value="${voice.id}" ${voice.id === defaultVoice.id ? 'selected' : ''}>
                                ${voice.name} ${voice.description ? `(${voice.description})` : ''}
                             </option>`
                        ).join('')}
                    </select>
                    <small>University-provided Abair.ie voices for Irish language</small>
                </div>
                
                <div class="setting-group">
                    <label>Speech Rate:</label>
                    <input type="range" id="speech-rate" min="0.5" max="2" step="0.1" value="${this.settings.speechRate || 1}">
                    <span id="speech-rate-value">${this.settings.speechRate || 1}x</span>
                </div>
                
                <div class="setting-group">
                    <label>Pronunciation Threshold:</label>
                    <input type="range" id="pronunciation-threshold" min="0.3" max="0.9" step="0.1" value="${this.settings.pronunciationThreshold || 0.7}">
                    <span id="pronunciation-threshold-value">${Math.round((this.settings.pronunciationThreshold || 0.7) * 100)}%</span>
                    <small>How strict pronunciation checking should be</small>
                </div>

                <div class="setting-group">
                    <label>
                        <input type="checkbox" id="auto-advance" ${this.settings.autoAdvance ? 'checked' : ''}>
                        Auto-advance to next sentence after successful pronunciation
                    </label>
                </div>

                <div class="setting-group">
                    <h4>Service Status</h4>
                    <div class="status-info">
                        <div>TTS Service: <span class="status-indicator success">✓ Abair.ie Active</span></div>
                        <div>STT Service: <span class="status-indicator ${this.sttService.isServiceSupported() ? 'success' : 'warning'}">
                            ${this.sttService.isServiceSupported() ? '✓ Browser STT Available' : '⚠ Limited Browser Support'}
                        </span></div>
                        <div>Irish Voices: <span class="status-indicator success">✓ ${availableVoices.length} Available</span></div>
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button onclick="eReader.saveSettings()">Save Settings</button>
                    <button onclick="eReader.closeSettings()">Cancel</button>
                    <button onclick="eReader.testServices()">Test Services</button>
                    <button onclick="eReader.clearCache()">Clear Cache</button>
                </div>
            </div>
            <div class="modal-backdrop" onclick="eReader.closeSettings()"></div>
        `;
        
        document.body.appendChild(modal);
        
        // Set up event listeners for sliders
        this.setupSettingsEventListeners();
        
        // Initialize display values
        this.updateSettingsDisplay();
        
        // Populate voice dropdown with available voices
        this.populateVoiceDropdown();
    }

    /**
     * Populate voice dropdown with available Abair voices
     */
    async populateVoiceDropdown() {
        const voiceSelect = document.getElementById('voice-select');
        if (!voiceSelect) return;

        try {
            // Get available voices from TTS service
            const voices = this.ttsService.getAvailableVoices();
            
            // Clear existing options
            voiceSelect.innerHTML = '';
            
            // Add voices to dropdown with proper display format
            voices.forEach(voice => {
                const option = document.createElement('option');
                option.value = voice.id;
                
                // Use displayName if available, otherwise format manually
                if (voice.displayName) {
                    option.textContent = voice.displayName;
                } else if (voice.locale && voice.name && voice.gender) {
                    option.textContent = `${voice.locale} - ${voice.name} (${voice.gender})`;
                } else {
                    option.textContent = voice.name || voice.id;
                }
                
                voiceSelect.appendChild(option);
            });
            
            // Set current voice if saved in settings
            if (this.settings.voice) {
                voiceSelect.value = this.settings.voice;
            } else {
                // Set to first voice and save it
                if (voices.length > 0) {
                    voiceSelect.value = voices[0].id;
                    this.settings.voice = voices[0].id;
                    this.saveSettings();
                }
            }
            
            console.log(`Populated voice dropdown with ${voices.length} voices`);
            
        } catch (error) {
            console.error('Error populating voice dropdown:', error);
            // Add fallback options
            voiceSelect.innerHTML = `
                <option value="ga_CO_snc_piper">Connemara - Sibéal (female)</option>
                <option value="ga_CO_pmc_piper">Connemara - Pádraig (male)</option>
                <option value="ga_UL_anb_piper">Ulster - Áine (female)</option>
                <option value="ga_MU_cmg_piper">Munster - Colm (male)</option>
            `;
        }
    }

    /**
     * Update settings display with current values
     */
    updateSettingsDisplay() {
        // Update speech rate display
        const speechRate = document.getElementById('speech-rate');
        const rateValue = document.getElementById('rate-value');
        
        if (speechRate && rateValue) {
            speechRate.value = this.settings.speechRate || 1.0;
            rateValue.textContent = (this.settings.speechRate || 1.0).toFixed(2) + 'x';
        }
        
        // Update voice selection
        const voiceSelect = document.getElementById('voice-select');
        if (voiceSelect && this.settings.voice) {
            voiceSelect.value = this.settings.voice;
        }
    }

    /**
     * Set up event listeners for settings controls
     */
    setupSettingsEventListeners() {
        const speechRate = document.getElementById('speech-rate');
        const rateValue = document.getElementById('rate-value');
        const pronunciationThreshold = document.getElementById('pronunciation-threshold');
        const pronunciationThresholdValue = document.getElementById('pronunciation-threshold-value');
        const voiceSelect = document.getElementById('voice-select');
        
        speechRate?.addEventListener('input', (e) => {
            const rate = parseFloat(e.target.value);
            if (rateValue) {
                rateValue.textContent = rate.toFixed(2) + 'x';
            }
            
            // Apply speech rate to TTS service immediately
            if (this.ttsService && typeof this.ttsService.setSpeechRate === 'function') {
                this.ttsService.setSpeechRate(rate);
                console.log(`Speech rate set to ${rate.toFixed(2)}x`);
            }
            
            // Save to settings
            this.settings.speechRate = rate;
            this.saveSettings();
        });
        
        // Voice selection event listener
        voiceSelect?.addEventListener('change', (e) => {
            const voiceId = e.target.value;
            
            // Apply voice to TTS service immediately
            if (this.ttsService && typeof this.ttsService.setVoice === 'function') {
                this.ttsService.setVoice(voiceId);
                console.log(`Voice set to ${voiceId}`);
            }
            
            // Save to settings
            this.settings.voice = voiceId;
            this.saveSettings();
        });
        
        pronunciationThreshold?.addEventListener('input', (e) => {
            pronunciationThresholdValue.textContent = Math.round(e.target.value * 100) + '%';
            
            // Save threshold setting
            this.settings.pronunciationThreshold = parseFloat(e.target.value);
            this.saveSettings();
        });
    }

    /**
     * Test TTS and STT services
     */
    async testServices() {
        try {
            this.showStatus('Testing services...', 'info');
            
            // Test TTS
            const ttsResult = await this.ttsService.test();
            
            // Test STT
            const sttResult = await this.sttService.test();
            
            if (ttsResult && sttResult) {
                this.showStatus('✓ All services working correctly', 'success');
            } else if (ttsResult) {
                this.showStatus('✓ TTS working, STT has limited support', 'warning');
            } else {
                this.showStatus('✗ Service test failed', 'error');
            }
        } catch (error) {
            console.error('Service test error:', error);
            this.showStatus('Service test failed: ' + error.message, 'error');
        }
    }

    /**
     * Apply settings to services
     */
    applySettings() {
        try {
            if (this.settings && this.ttsService) {
                this.ttsService.setVoice(this.settings.selectedVoice);
                this.ttsService.setSpeechRate(this.settings.speechRate);
                console.log(`Applied settings: voice=${this.settings.selectedVoice}, rate=${this.settings.speechRate}`);
            }
            
            if (this.settings && this.sttService) {
                this.sttService.confidenceThreshold = this.settings.pronunciationThreshold;
                console.log(`Applied STT threshold: ${this.settings.pronunciationThreshold}`);
            }
        } catch (error) {
            console.warn('Failed to apply settings:', error);
        }
    }

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('ireader_settings');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.warn('Failed to load settings:', error);
        }
        
        // Return default settings
        return {
            selectedVoice: 'ga_CO_snc_piper',
            speechRate: 1.0,
            pronunciationThreshold: 0.7,
            autoAdvance: false
        };
    }

    /**
     * Save settings
     */
    saveSettings() {
        try {
            // Get current settings from UI
            const voiceSelect = document.getElementById('voice-select');
            const speechRate = document.getElementById('speech-rate');
            const pronunciationThreshold = document.getElementById('pronunciation-threshold');
            const autoAdvance = document.getElementById('auto-advance');

            // Update settings object
            this.settings = {
                selectedVoice: voiceSelect?.value || this.ttsService.getDefaultVoice().id,
                speechRate: parseFloat(speechRate?.value || 1),
                pronunciationThreshold: parseFloat(pronunciationThreshold?.value || 0.7),
                autoAdvance: autoAdvance?.checked || false
            };

            // Save to localStorage
            localStorage.setItem('ireader_settings', JSON.stringify(this.settings));
            
            // Apply settings to services
            this.sttService.confidenceThreshold = this.settings.pronunciationThreshold;
            
            // Apply TTS settings
            if (this.ttsService) {
                this.ttsService.setVoice(this.settings.selectedVoice);
                this.ttsService.setSpeechRate(this.settings.speechRate);
                console.log(`Applied TTS settings: voice=${this.settings.selectedVoice}, rate=${this.settings.speechRate}`);
            }

            this.showStatus('Settings saved successfully', 'success');
            this.closeSettings();
            
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showStatus('Failed to save settings', 'error');
        }
    }

    /**
     * Close settings modal
     */
    closeSettings() {
        const modal = document.querySelector('.settings-modal');
        if (modal) {
            modal.remove();
        }
    }

    /**
     * Clear all caches
     */
    clearCache() {
        if (confirm('Clear all cached audio and data? This action cannot be undone.')) {
            this.ttsService.clearCache();
            this.showStatus('Cache cleared successfully');
        }
    }

    /**
     * Navigate to error practice page
     */
    navigateToErrors() {
        window.location.href = 'errors.html';
    }

    // ============ UTILITY METHODS ============

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        console.error(message);
        this.updateStatus(message, 'error');
    }

    /**
     * Show status message
     * @param {string} message - Status message  
     */
    showStatus(message) {
        console.log(message);
        this.updateStatus(message, 'success');
    }

    /**
     * Update status display
     * @param {string} message - Status message
     * @param {string} type - Message type (info, error, success)
     */
    updateStatus(message, type = 'info') {
        const statusDisplay = document.getElementById('status-display');
        if (statusDisplay) {
            statusDisplay.className = `status-${type}`;
            statusDisplay.textContent = message;
            
            // Auto-clear after 5 seconds for non-error messages
            if (type !== 'error') {
                setTimeout(() => {
                    if (statusDisplay.textContent === message) {
                        statusDisplay.textContent = '';
                        statusDisplay.className = '';
                    }
                }, 5000);
            }
        }
    }

    /**
     * Get current practice results
     * @returns {Array} - Array of practice results
     */
    getPracticeResults() {
        return this.practiceResults;
    }

    /**
     * Export practice results to JSON
     * @returns {string} - JSON string of results
     */
    exportPracticeResults() {
        return JSON.stringify(this.practiceResults, null, 2);
    }

    /**
     * Export current session data
     */
    exportSession() {
        try {
            const sessionData = this.exportSessionData();
            const blob = new Blob([sessionData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `irish-pronunciation-session-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            this.showStatus('Session exported successfully');
        } catch (error) {
            console.error('Export failed:', error);
            this.showError('Failed to export session: ' + error.message);
        }
    }

    /**
     * Clear current session with confirmation
     */
    clearSession() {
        const confirmMessage = `Clear current practice session?\n\nThis will reset:\n- All statistics and progress\n- Session history\n- Practice attempts\n\nThis action cannot be undone.`;
        
        if (confirm(confirmMessage)) {
            try {
                this.clearSessionData();
                this.updateStatsDisplay();
                this.showStatus('Session cleared successfully');
                
                // Hide stats panel
                const statsPanel = document.getElementById('pronunciation-stats');
                if (statsPanel) {
                    statsPanel.style.display = 'none';
                }
                
                // Clear practice options
                const optionsContainer = document.getElementById('practice-options');
                if (optionsContainer) {
                    optionsContainer.style.display = 'none';
                }
                
            } catch (error) {
                console.error('Clear session failed:', error);
                this.showError('Failed to clear session: ' + error.message);
            }
        }
    }
}

// Initialize the e-reader when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const eReader = new IrishEReader();
    window.eReader = eReader; // Make globally available for debugging
});