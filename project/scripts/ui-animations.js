/**
 * UI Animations and Visual Effects
 * Advanced animation system for sentence highlighting, word-by-word TTS sync, and visual feedback
 */

class UIAnimations {
    constructor() {
        this.animationDuration = 300; // Default animation duration in ms
        this.wordHighlightDuration = 200; // Word highlight transition
        this.sentenceFocusDuration = 400; // Sentence focus transition
        
        // Animation state
        this.currentSentenceElement = null;
        this.currentWordElements = [];
        this.isAnimating = false;
        this.wordTimingData = [];
        this.currentWordIndex = 0;
        
        // Performance optimization
        this.rafId = null;
        this.timeoutIds = new Set();
        
        // Settings
        this.settings = {
            enableAnimations: true,
            enableWordSync: true,
            enableSentenceFocus: true,
            enablePronunciationFeedback: true,
            animationSpeed: 1.0,
            reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        };
        
        this.init();
    }

    /**
     * Initialize UI animations
     */
    init() {
        console.log('Initializing Advanced UI Animations...');
        this.setupAnimationStyles();
        this.bindEventListeners();
        this.checkPerformance();
        console.log('Animation system ready');
    }

    /**
     * Setup event listeners for performance monitoring
     */
    bindEventListeners() {
        // Monitor reduced motion preference changes
        window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
            this.settings.reducedMotion = e.matches;
            console.log('Reduced motion preference changed:', e.matches);
        });
        
        // Monitor page visibility for performance
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseAnimations();
            } else {
                this.resumeAnimations();
            }
        });
    }

    /**
     * Check browser performance capabilities
     */
    checkPerformance() {
        // Detect hardware acceleration support
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) {
            console.warn('WebGL not supported, reducing animation complexity');
            this.settings.animationSpeed = 0.5;
        }
        
        // Memory considerations
        if (navigator.deviceMemory && navigator.deviceMemory < 4) {
            console.warn('Low memory device detected, optimizing animations');
            this.settings.enableAnimations = false;
        }
    }

    // ============ SENTENCE-LEVEL ANIMATIONS ============

    /**
     * Focus on a sentence with smooth scaling and backdrop
     * @param {Element} sentenceElement - Sentence element to focus
     * @param {Object} options - Animation options
     */
    async focusSentence(sentenceElement, options = {}) {
        if (!sentenceElement || !this.settings.enableAnimations) {
            console.warn('Cannot focus sentence: element not found or animations disabled');
            return;
        }

        try {
            console.log('Focusing on sentence:', sentenceElement.textContent.substring(0, 50) + '...');
            
            // Clear previous focus
            await this.clearSentenceFocus();
            
            // Get reading area for context
            const readingArea = sentenceElement.closest('.reading-area') || sentenceElement.closest('#text-display');
            
            if (readingArea && this.settings.enableSentenceFocus) {
                readingArea.classList.add('focus-mode');
            }
            
            // Apply focus with smooth transition
            sentenceElement.classList.add('sentence-transition');
            
            // Use RAF for smooth animation
            this.rafId = requestAnimationFrame(() => {
                sentenceElement.classList.add('sentence-focus');
                this.currentSentenceElement = sentenceElement;
                
                // Scroll into view with options
                if (options.scroll !== false) {
                    this.scrollToSentence(sentenceElement, options.scrollOptions);
                }
            });
            
            // Prepare words for highlighting if TTS will be used
            if (options.prepareWords !== false) {
                this.prepareWordsForHighlighting(sentenceElement);
            }
            
        } catch (error) {
            console.error('Error focusing sentence:', error);
        }
    }

    /**
     * Clear sentence focus
     */
    async clearSentenceFocus() {
        if (this.currentSentenceElement) {
            console.log('Clearing sentence focus');
            
            // Remove focus classes
            this.currentSentenceElement.classList.remove('sentence-focus', 'current-playing');
            
            // Clear reading area focus mode
            const readingArea = this.currentSentenceElement.closest('.reading-area') || 
                                this.currentSentenceElement.closest('#text-display');
            if (readingArea) {
                readingArea.classList.remove('focus-mode');
            }
            
            // Clear word highlights
            this.clearAllWordHighlights();
            
            this.currentSentenceElement = null;
        }
    }

    /**
     * Mark sentence as currently playing
     * @param {Element} sentenceElement - Sentence element
     */
    setSentenceAsPlaying(sentenceElement) {
        if (!sentenceElement) return;
        
        // Remove playing state from other sentences
        document.querySelectorAll('.sentence.current-playing').forEach(el => {
            el.classList.remove('current-playing');
        });
        
        // Add playing state
        sentenceElement.classList.add('current-playing');
        console.log('Sentence marked as playing');
    }

    /**
     * Mark sentence as completed
     * @param {Element} sentenceElement - Sentence element
     */
    setSentenceAsCompleted(sentenceElement) {
        if (!sentenceElement) return;
        
        sentenceElement.classList.remove('current-playing');
        sentenceElement.classList.add('completed');
        
        // Add completed animation
        sentenceElement.style.animation = 'correct-pronunciation 0.6s ease-out forwards';
        
        setTimeout(() => {
            sentenceElement.style.animation = '';
        }, 600);
        
        console.log('Sentence marked as completed');
    }

    // ============ WORD-LEVEL HIGHLIGHTING ============

    /**
     * Prepare words in a sentence for individual highlighting
     * @param {Element} sentenceElement - Sentence element
     */
    prepareWordsForHighlighting(sentenceElement) {
        if (!sentenceElement) return;
        
        const text = sentenceElement.textContent;
        const words = text.match(/\S+|\s+/g) || [];
        
        // Clear existing word structure
        this.currentWordElements = [];
        
        // Create word elements
        const fragment = document.createDocumentFragment();
        
        words.forEach((word, index) => {
            const wordElement = document.createElement('span');
            
            if (word.trim()) {
                // It's a word
                wordElement.className = 'word-highlight';
                wordElement.textContent = word;
                wordElement.dataset.wordIndex = Math.floor(index / 2); // Account for spaces
                this.currentWordElements.push(wordElement);
            } else {
                // It's whitespace
                wordElement.textContent = word;
                wordElement.className = 'word-space';
            }
            
            fragment.appendChild(wordElement);
        });
        
        // Replace sentence content
        sentenceElement.innerHTML = '';
        sentenceElement.appendChild(fragment);
        
        console.log(`Prepared ${this.currentWordElements.length} words for highlighting`);
    }

    /**
     * Highlight word-by-word during TTS playback
     * @param {Array} wordTimings - Array of word timing objects from TTS
     * @param {HTMLAudioElement} audioElement - Audio element for sync
     * @param {Function} onWordComplete - Callback when word highlighting completes
     */
    async syncWordHighlighting(wordTimings, audioElement, onWordComplete = null) {
        if (!wordTimings || !this.settings.enableWordSync) {
            console.log('Word sync disabled or no timing data');
            return;
        }

        this.wordTimingData = wordTimings;
        this.currentWordIndex = 0;
        
        console.log(`Starting word sync with ${wordTimings.length} timing points`);
        
        // Setup audio event listeners
        const onTimeUpdate = () => {
            this.updateWordHighlighting(audioElement.currentTime);
        };
        
        const onEnded = () => {
            this.clearAllWordHighlights();
            audioElement.removeEventListener('timeupdate', onTimeUpdate);
            audioElement.removeEventListener('ended', onEnded);
        };
        
        audioElement.addEventListener('timeupdate', onTimeUpdate);
        audioElement.addEventListener('ended', onEnded);
    }

    /**
     * Update word highlighting based on current playback time
     * @param {number} currentTime - Current playback time in seconds
     */
    updateWordHighlighting(currentTime) {
        if (!this.wordTimingData.length || !this.currentWordElements.length) return;
        
        // Find current word based on timing
        let targetWordIndex = -1;
        
        for (let i = 0; i < this.wordTimingData.length; i++) {
            const timing = this.wordTimingData[i];
            
            // Handle different timing formats from different TTS services
            let timeOffset;
            if (timing.timeOffset && typeof timing.timeOffset === 'string') {
                // Old Google Cloud format with 's' suffix
                timeOffset = parseFloat(timing.timeOffset.replace('s', ''));
            } else if (timing.startTime !== undefined) {
                // New Abair.ie format with startTime/endTime
                timeOffset = timing.startTime;
            } else if (timing.timeOffset && typeof timing.timeOffset === 'number') {
                // Direct numeric timeOffset
                timeOffset = timing.timeOffset;
            } else {
                // Fallback: use index-based estimation
                timeOffset = i * 0.5; // 0.5 seconds per word estimate
            }
            
            if (currentTime >= timeOffset) {
                targetWordIndex = i;
            } else {
                break;
            }
        }
        
        // Update highlighting if word changed
        if (targetWordIndex !== this.currentWordIndex && targetWordIndex >= 0) {
            this.highlightWord(targetWordIndex);
            this.currentWordIndex = targetWordIndex;
        }
    }

    /**
     * Highlight a specific word
     * @param {number} wordIndex - Index of word to highlight
     */
    highlightWord(wordIndex) {
        if (!this.currentWordElements[wordIndex]) return;
        
        // Clear previous highlights
        this.currentWordElements.forEach(el => {
            el.classList.remove('active');
        });
        
        // Highlight current word
        const wordElement = this.currentWordElements[wordIndex];
        wordElement.classList.add('active');
        
        // Smooth scroll to word if needed
        this.scrollToWord(wordElement);
    }

    /**
     * Clear all word highlights
     */
    clearAllWordHighlights() {
        this.currentWordElements.forEach(el => {
            el.classList.remove('active', 'correct', 'incorrect', 'tts-sync');
        });
    }

    // ============ PRONUNCIATION FEEDBACK ============

    /**
     * Show pronunciation feedback for a word or phrase
     * @param {Element} element - Element to show feedback on
     * @param {boolean} isCorrect - Whether pronunciation was correct
     * @param {number} confidence - Confidence score (0-1)
     * @param {string} feedback - Optional feedback message
     */
    showPronunciationFeedback(element, isCorrect, confidence = 1, feedback = '') {
        if (!element || !this.settings.enablePronunciationFeedback) return;
        
        console.log(`Pronunciation feedback: ${isCorrect ? 'correct' : 'incorrect'} (${Math.round(confidence * 100)}%)`);
        
        // Remove existing feedback classes
        element.classList.remove('correct', 'incorrect');
        
        // Add appropriate feedback class
        const feedbackClass = isCorrect ? 'correct' : 'incorrect';
        element.classList.add(feedbackClass);
        
        // Show confidence-based intensity
        if (!this.settings.reducedMotion) {
            const intensity = Math.min(confidence, 1);
            element.style.setProperty('--feedback-intensity', intensity);
        }
        
        // Show feedback message if provided
        if (feedback) {
            this.showTemporaryTooltip(element, feedback, isCorrect ? 'success' : 'error');
        }
        
        // Clear feedback after animation
        const animationDuration = isCorrect ? 600 : 800;
        const timeoutId = setTimeout(() => {
            element.classList.remove(feedbackClass);
            element.style.removeProperty('--feedback-intensity');
            this.timeoutIds.delete(timeoutId);
        }, animationDuration);
        
        this.timeoutIds.add(timeoutId);
    }

    /**
     * Show bulk pronunciation feedback for multiple words
     * @param {Array} results - Array of {element, isCorrect, confidence} objects
     */
    showBulkPronunciationFeedback(results) {
        if (!results || !results.length) return;
        
        console.log(`Showing bulk pronunciation feedback for ${results.length} words`);
        
        results.forEach((result, index) => {
            // Stagger feedback slightly for better visual effect
            const delay = this.settings.reducedMotion ? 0 : index * 50;
            
            const timeoutId = setTimeout(() => {
                this.showPronunciationFeedback(
                    result.element,
                    result.isCorrect,
                    result.confidence,
                    result.feedback
                );
                this.timeoutIds.delete(timeoutId);
            }, delay);
            
            this.timeoutIds.add(timeoutId);
        });
    }

    // ============ PROGRESS AND LOADING ============

    /**
     * Show reading progress animation
     * @param {number} percentage - Progress percentage (0-100)
     * @param {Element} progressContainer - Progress container element
     */
    updateReadingProgress(percentage, progressContainer = null) {
        if (!progressContainer) {
            progressContainer = document.querySelector('.reading-progress-bar');
        }
        
        if (!progressContainer) return;
        
        console.log(`Updating reading progress: ${percentage}%`);
        
        // Smooth progress transition
        progressContainer.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
        
        // Add completion effect at 100%
        if (percentage >= 100) {
            progressContainer.classList.add('completed');
            setTimeout(() => {
                progressContainer.classList.remove('completed');
            }, 1000);
        }
    }

    /**
     * Show TTS loading spinner
     * @param {Element} container - Container for spinner
     * @returns {Element} Spinner element
     */
    showTTSLoading(container) {
        if (!container) return null;
        
        const spinner = document.createElement('div');
        spinner.className = 'tts-loading-spinner';
        spinner.setAttribute('aria-label', 'Generating speech...');
        
        container.appendChild(spinner);
        
        console.log('TTS loading spinner shown');
        return spinner;
    }

    /**
     * Hide TTS loading spinner
     * @param {Element} spinner - Spinner element to remove
     */
    hideTTSLoading(spinner) {
        if (spinner && spinner.parentNode) {
            spinner.parentNode.removeChild(spinner);
            console.log('TTS loading spinner hidden');
        }
    }

    /**
     * Show audio level visualization
     * @param {Element} visualizer - Visualizer container
     * @param {number} level - Audio level (0-100)
     */
    updateAudioVisualization(visualizer, level) {
        if (!visualizer) return;
        
        const bars = visualizer.querySelectorAll('.audio-bar');
        if (bars.length === 0) {
            this.createAudioBars(visualizer);
            return this.updateAudioVisualization(visualizer, level);
        }
        
        const normalizedLevel = Math.max(0, Math.min(100, level));
        const activeBarCount = Math.floor((normalizedLevel / 100) * bars.length);
        
        bars.forEach((bar, index) => {
            const isActive = index < activeBarCount;
            const height = isActive ? 
                `${20 + (normalizedLevel / 100) * 80}%` : '10%';
            
            bar.style.height = height;
            bar.style.backgroundColor = this.getAudioLevelColor(normalizedLevel, isActive);
        });
    }

    /**
     * Create audio visualization bars
     * @param {Element} container - Container for bars
     */
    createAudioBars(container) {
        const barCount = 12;
        container.innerHTML = '';
        container.className += ' audio-visualizer';
        
        for (let i = 0; i < barCount; i++) {
            const bar = document.createElement('div');
            bar.className = 'audio-bar';
            container.appendChild(bar);
        }
    }

    /**
     * Get color for audio level indicator
     * @param {number} level - Audio level (0-100)
     * @param {boolean} isActive - Whether bar is active
     * @returns {string} CSS color
     */
    getAudioLevelColor(level, isActive) {
        if (!isActive) return '#e9ecef';
        
        if (level < 30) return '#28a745'; // Green - good level
        if (level < 70) return '#ffc107'; // Yellow - moderate level
        return '#dc3545'; // Red - high level
    }

    // ============ UTILITY METHODS ============

    /**
     * Smooth scroll to sentence
     * @param {Element} sentenceElement - Target sentence
     * @param {Object} options - Scroll options
     */
    scrollToSentence(sentenceElement, options = {}) {
        if (!sentenceElement) return;
        
        const defaultOptions = {
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
        };
        
        sentenceElement.scrollIntoView({ ...defaultOptions, ...options });
    }

    /**
     * Smooth scroll to word (if visible)
     * @param {Element} wordElement - Target word
     */
    scrollToWord(wordElement) {
        if (!wordElement) return;
        
        // Only scroll if word is not visible
        const rect = wordElement.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        if (rect.top < 0 || rect.bottom > viewportHeight) {
            wordElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }

    /**
     * Show temporary tooltip
     * @param {Element} element - Target element
     * @param {string} message - Tooltip message
     * @param {string} type - Tooltip type
     */
    showTemporaryTooltip(element, message, type = 'info') {
        const tooltip = document.createElement('div');
        tooltip.className = `feedback-tooltip ${type}`;
        tooltip.textContent = message;
        tooltip.style.cssText = `
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: ${this.getTooltipColor(type)};
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.8rem;
            white-space: nowrap;
            z-index: 1000;
            opacity: 0;
            animation: fadeIn 0.2s ease forwards;
        `;
        
        // Position relative to element
        element.style.position = 'relative';
        element.appendChild(tooltip);
        
        // Remove after delay
        const timeoutId = setTimeout(() => {
            if (tooltip.parentNode) {
                tooltip.style.animation = 'fadeOut 0.2s ease forwards';
                setTimeout(() => {
                    if (tooltip.parentNode) {
                        tooltip.parentNode.removeChild(tooltip);
                    }
                }, 200);
            }
            this.timeoutIds.delete(timeoutId);
        }, 2000);
        
        this.timeoutIds.add(timeoutId);
    }

    /**
     * Get tooltip background color
     * @param {string} type - Tooltip type
     * @returns {string} CSS color
     */
    getTooltipColor(type) {
        switch (type) {
            case 'success': return '#28a745';
            case 'error': return '#dc3545';
            case 'warning': return '#ffc107';
            default: return '#007bff';
        }
    }

    /**
     * Setup required CSS styles dynamically
     */
    setupAnimationStyles() {
        if (document.querySelector('#ui-animations-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'ui-animations-styles';
        style.textContent = `
            /* Dynamic animation intensity based on settings */
            :root {
                --animation-speed: ${this.settings.animationSpeed};
                --feedback-intensity: 1;
            }
            
            /* Smooth transitions for all animatable elements */
            .sentence-transition {
                transition: all calc(${this.animationDuration}ms * var(--animation-speed)) cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            /* Fade animations */
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes fadeOut {
                from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(-10px); }
            }
            
            /* Feedback tooltip enhancements */
            .feedback-tooltip {
                pointer-events: none;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
            }
            
            /* Performance optimizations */
            .word-highlight,
            .sentence {
                will-change: transform, background-color;
                backface-visibility: hidden;
                perspective: 1000px;
            }
        `;
        
        document.head.appendChild(style);
        console.log('Dynamic animation styles added');
    }

    /**
     * Pause all running animations
     */
    pauseAnimations() {
        console.log('Pausing animations');
        this.isAnimating = false;
        
        // Cancel any pending RAF
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        
        // Clear all timeouts
        this.timeoutIds.forEach(id => clearTimeout(id));
        this.timeoutIds.clear();
    }

    /**
     * Resume animations
     */
    resumeAnimations() {
        console.log('Resuming animations');
        this.isAnimating = true;
    }

    /**
     * Animate entrance of an element with specified animation type
     * @param {Element} element - Element to animate
     * @param {string} animationType - Type of animation ('fade-in', 'slide-up', 'slide-down', etc.)
     */
    animateEntrance(element, animationType = 'fade-in') {
        if (!element || !this.settings.enableAnimations) {
            return;
        }

        // Remove any existing animation classes
        element.classList.remove('fade-in', 'slide-up', 'slide-down', 'scale-in');
        
        // Force a reflow to ensure the class is removed
        element.offsetHeight;
        
        // Add the animation class
        element.classList.add(animationType);
        
        // Set initial state based on animation type
        switch (animationType) {
            case 'fade-in':
                element.style.opacity = '0';
                element.style.transform = 'translateY(10px)';
                break;
            case 'slide-up':
                element.style.opacity = '0';
                element.style.transform = 'translateY(20px)';
                break;
            case 'slide-down':
                element.style.opacity = '0';
                element.style.transform = 'translateY(-20px)';
                break;
            case 'scale-in':
                element.style.opacity = '0';
                element.style.transform = 'scale(0.9)';
                break;
        }
        
        // Trigger animation
        requestAnimationFrame(() => {
            element.style.transition = 'all 0.3s ease-out';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0) scale(1)';
        });
        
        console.log(`Applied ${animationType} entrance animation to element`);
    }

    /**
     * Animate exit of an element with specified animation type
     * @param {Element} element - Element to animate
     * @param {string} animationType - Type of animation ('fade-out', 'slide-out', etc.)
     * @param {Function} callback - Optional callback after animation completes
     */
    animateExit(element, animationType = 'fade-out', callback = null) {
        if (!element || !this.settings.enableAnimations) {
            if (callback) callback();
            return;
        }

        element.style.transition = 'all 0.3s ease-in';
        
        switch (animationType) {
            case 'fade-out':
                element.style.opacity = '0';
                element.style.transform = 'translateY(-10px)';
                break;
            case 'slide-out':
                element.style.opacity = '0';
                element.style.transform = 'translateY(20px)';
                break;
        }
        
        // Clean up after animation
        const timeoutId = setTimeout(() => {
            if (callback) callback();
            this.timeoutIds.delete(timeoutId);
        }, 300);
        
        this.timeoutIds.add(timeoutId);
        
        console.log(`Applied ${animationType} exit animation to element`);
    }

    /**
     * Update animation settings
     * @param {Object} newSettings - New settings object
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        
        // Update CSS custom properties
        document.documentElement.style.setProperty('--animation-speed', this.settings.animationSpeed);
        
        console.log('Animation settings updated:', this.settings);
    }

    /**
     * Clean up all animations and resources
     */
    cleanup() {
        console.log('Cleaning up animations');
        
        this.pauseAnimations();
        this.clearSentenceFocus();
        this.clearAllWordHighlights();
        
        // Remove dynamic styles
        const styleElement = document.querySelector('#ui-animations-styles');
        if (styleElement) {
            styleElement.remove();
        }
    }
}