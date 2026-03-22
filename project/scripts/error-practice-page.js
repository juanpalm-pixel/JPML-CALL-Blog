/**
 * Error Practice Page Controller
 * Manages the dedicated error practice interface
 */

class ErrorPracticePage {
    constructor() {
        this.errorManager = null;
        this.ttsService = null;
        this.sttService = null;
        this.audioProcessor = null;
        this.currentPracticeError = null;
        this.isRecording = false;
        this.currentFilter = {
            type: 'all',
            sortBy: 'priority',
            showResolved: false
        };
        this.practiceSession = {
            startTime: null,
            errorsAttempted: 0,
            errorsResolved: 0
        };
    }

    /**
     * Initialize the error practice page
     */
    async initialize() {
        console.log('Initializing Error Practice Page...');
        
        try {
            // Initialize services
            await this.initializeServices();
            
            // Bind event listeners
            this.bindEventListeners();
            
            // Load and display errors
            this.loadErrors();
            
            // Update statistics
            this.updateStatistics();
            
            // Load progress data
            this.loadProgressData();
            
            console.log('Error Practice Page initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Error Practice Page:', error);
            this.showError('Failed to initialize practice page: ' + error.message);
        }
    }

    /**
     * Initialize required services
     */
    async initializeServices() {
        // Initialize error manager
        this.errorManager = new ErrorManager();
        
        // Initialize TTS service if available
        if (window.TTSService) {
            this.ttsService = new TTSService();
            await this.ttsService.initialize();
        }
        
        // Initialize STT service if available
        if (window.STTService) {
            this.sttService = new STTService();
            await this.sttService.initialize();
        }
        
        // Initialize audio processor if available
        if (window.AudioProcessor) {
            this.audioProcessor = new AudioProcessor();
            await this.audioProcessor.initialize();
        }
    }

    /**
     * Bind all event listeners
     */
    bindEventListeners() {
        // Navigation
        document.getElementById('back-to-reader')?.addEventListener('click', () => {
            window.location.href = 'index.html';
        });

        // Error management
        document.getElementById('clear-errors')?.addEventListener('click', () => this.clearAllErrors());
        document.getElementById('export-errors')?.addEventListener('click', () => this.showImportExportModal());

        // Filters
        document.getElementById('error-type-filter')?.addEventListener('change', (e) => {
            this.currentFilter.type = e.target.value;
            this.filterAndDisplayErrors();
        });

        document.getElementById('sort-by')?.addEventListener('change', (e) => {
            this.currentFilter.sortBy = e.target.value;
            this.filterAndDisplayErrors();
        });

        document.getElementById('show-resolved')?.addEventListener('change', (e) => {
            this.currentFilter.showResolved = e.target.checked;
            this.filterAndDisplayErrors();
        });

        // Practice controls
        document.getElementById('play-target')?.addEventListener('click', () => this.playTargetPronunciation());
        document.getElementById('record-practice')?.addEventListener('click', () => this.toggleRecording());
        document.getElementById('mark-resolved')?.addEventListener('click', () => this.markCurrentErrorResolved());

        // Import/Export
        document.getElementById('download-errors')?.addEventListener('click', () => this.downloadErrors());
        document.getElementById('upload-errors')?.addEventListener('click', () => this.uploadErrors());
        document.getElementById('import-file')?.addEventListener('change', (e) => this.handleFileSelect(e));

        // Modal controls
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => this.closeModal(e.target.closest('.modal')));
        });

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Start reading button
        document.getElementById('start-reading')?.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    /**
     * Load and display errors from error manager
     */
    loadErrors() {
        if (!this.errorManager) {
            console.error('Error manager not initialized');
            return;
        }

        this.filterAndDisplayErrors();
    }

    /**
     * Filter and display errors based on current filters
     */
    filterAndDisplayErrors() {
        const filters = {
            unresolved: !this.currentFilter.showResolved,
            errorType: this.currentFilter.type !== 'all' ? this.currentFilter.type : null
        };

        let errors = this.errorManager.getErrorsByPriority(filters);
        
        // Apply additional sorting
        if (this.currentFilter.sortBy === 'date') {
            errors.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } else if (this.currentFilter.sortBy === 'frequency') {
            errors.sort((a, b) => (b.occurrenceCount || 1) - (a.occurrenceCount || 1));
        } else if (this.currentFilter.sortBy === 'confidence') {
            errors.sort((a, b) => (a.confidence || 0) - (b.confidence || 0));
        }

        this.displayErrors(errors);
    }

    /**
     * Display errors in the error list
     */
    displayErrors(errors) {
        const errorList = document.getElementById('error-list');
        const noErrorsMessage = document.getElementById('no-errors');

        if (errors.length === 0) {
            errorList.style.display = 'none';
            noErrorsMessage.style.display = 'block';
            return;
        }

        errorList.style.display = 'grid';
        noErrorsMessage.style.display = 'none';

        errorList.innerHTML = errors.map(error => `
            <div class="error-item ${error.resolved ? 'resolved' : ''}" data-error-id="${error.id}">
                <div class="error-header">
                    <div class="error-text">${error.expectedText}</div>
                    <div class="error-type">${error.errorType}</div>
                </div>
                <div class="error-details">
                    <div class="error-meta">
                        <span class="confidence">
                            Confidence: ${Math.round((error.confidence || 0) * 100)}%
                        </span>
                        <span class="attempts">
                            Attempts: ${error.practiceCount || 0}
                        </span>
                        <span class="frequency">
                            Frequency: ${error.occurrenceCount || 1}
                        </span>
                    </div>
                    <div class="error-date">
                        ${new Date(error.timestamp).toLocaleDateString()}
                    </div>
                </div>
                <div class="error-feedback">
                    ${error.feedback || 'No specific feedback available'}
                </div>
                <div class="error-actions">
                    <button class="practice-error-btn" data-error-id="${error.id}">
                        Practice
                    </button>
                    <button class="resolve-error-btn" data-error-id="${error.id}" 
                            ${error.resolved ? 'disabled' : ''}>
                        ${error.resolved ? 'Resolved' : 'Mark Resolved'}
                    </button>
                    <button class="delete-error-btn" data-error-id="${error.id}">
                        Delete
                    </button>
                </div>
            </div>
        `).join('');

        // Bind error item event listeners
        this.bindErrorItemListeners();
    }

    /**
     * Bind event listeners for error items
     */
    bindErrorItemListeners() {
        document.querySelectorAll('.practice-error-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const errorId = e.target.dataset.errorId;
                this.startErrorPractice(errorId);
            });
        });

        document.querySelectorAll('.resolve-error-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const errorId = e.target.dataset.errorId;
                this.markErrorResolved(errorId);
            });
        });

        document.querySelectorAll('.delete-error-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const errorId = e.target.dataset.errorId;
                this.deleteError(errorId);
            });
        });

        document.querySelectorAll('.error-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.error-actions')) {
                    const errorId = item.dataset.errorId;
                    this.selectError(errorId);
                }
            });
        });
    }

    /**
     * Start practice session for specific error
     */
    async startErrorPractice(errorId) {
        const error = this.errorManager.errors.get(errorId);
        if (!error) {
            console.error('Error not found:', errorId);
            return;
        }

        this.currentPracticeError = error;
        this.practiceSession.errorsAttempted++;

        // Show practice panel
        this.showPracticePanel(error);

        // Mark error as being practiced
        this.errorManager.markAsPracticed(errorId);

        // Play target pronunciation first
        await this.playTargetPronunciation();
    }

    /**
     * Show practice panel with error details
     */
    showPracticePanel(error) {
        const practiceInstructions = document.getElementById('practice-instructions');
        const currentPractice = document.getElementById('current-practice');
        const practiceText = document.getElementById('practice-text-display');

        practiceInstructions.style.display = 'none';
        currentPractice.style.display = 'block';

        if (practiceText) {
            practiceText.textContent = error.expectedText;
        }

        // Clear previous feedback
        const feedbackArea = document.getElementById('practice-feedback');
        if (feedbackArea) {
            feedbackArea.innerHTML = '';
        }

        // Highlight selected error in list
        document.querySelectorAll('.error-item').forEach(item => {
            item.classList.remove('selected');
        });
        const selectedItem = document.querySelector(`.error-item[data-error-id="${error.id}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }
    }

    /**
     * Select error (highlight without starting practice)
     */
    selectError(errorId) {
        const error = this.errorManager.errors.get(errorId);
        if (!error) return;

        // Highlight selected error
        document.querySelectorAll('.error-item').forEach(item => {
            item.classList.remove('selected');
        });
        const selectedItem = document.querySelector(`.error-item[data-error-id="${errorId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }

        // Show error details in practice panel
        this.showPracticePanel(error);
    }

    /**
     * Play target pronunciation for current practice error
     */
    async playTargetPronunciation() {
        if (!this.currentPracticeError || !this.ttsService) {
            console.warn('Cannot play target: missing error or TTS service');
            return;
        }

        try {
            const playBtn = document.getElementById('play-target');
            if (playBtn) {
                playBtn.disabled = true;
                playBtn.textContent = '🔄 Playing...';
            }

            const result = await this.ttsService.synthesizeText(this.currentPracticeError.expectedText);
            if (result.audioContent) {
                const audio = new Audio(result.audioContent);
                await new Promise(resolve => {
                    audio.onended = resolve;
                    audio.onerror = resolve;
                    audio.play();
                });
            }
        } catch (error) {
            console.error('Error playing target pronunciation:', error);
            this.showPracticeFeedback('Failed to play target pronunciation', 'error');
        } finally {
            const playBtn = document.getElementById('play-target');
            if (playBtn) {
                playBtn.disabled = false;
                playBtn.textContent = '🔊 Hear Target';
            }
        }
    }

    /**
     * Toggle recording for practice
     */
    async toggleRecording() {
        if (!this.currentPracticeError) {
            this.showPracticeFeedback('Select an error to practice first', 'warning');
            return;
        }

        if (this.isRecording) {
            await this.stopRecording();
        } else {
            await this.startRecording();
        }
    }

    /**
     * Start recording practice attempt
     */
    async startRecording() {
        if (!this.audioProcessor) {
            this.showPracticeFeedback('Audio recording not available', 'error');
            return;
        }

        try {
            this.isRecording = true;
            
            const recordBtn = document.getElementById('record-practice');
            if (recordBtn) {
                recordBtn.textContent = '⏹️ Stop Recording';
                recordBtn.classList.add('recording');
            }

            this.showPracticeFeedback('Recording... Speak clearly!', 'recording');

            await this.audioProcessor.startRecording();
        } catch (error) {
            console.error('Failed to start recording:', error);
            this.showPracticeFeedback('Failed to start recording: ' + error.message, 'error');
            this.isRecording = false;
        }
    }

    /**
     * Stop recording and analyze pronunciation
     */
    async stopRecording() {
        if (!this.audioProcessor || !this.isRecording) return;

        try {
            this.isRecording = false;
            
            const recordBtn = document.getElementById('record-practice');
            if (recordBtn) {
                recordBtn.textContent = '🔄 Analyzing...';
                recordBtn.classList.remove('recording');
                recordBtn.disabled = true;
            }

            this.showPracticeFeedback('Analyzing pronunciation...', 'analyzing');

            const audioBlob = await this.audioProcessor.stopRecording();
            
            if (this.sttService) {
                const result = await this.sttService.transcribeAudio(audioBlob);
                await this.processPracticeResult(result);
            } else {
                this.showPracticeFeedback('Speech recognition not available', 'warning');
            }

        } catch (error) {
            console.error('Failed to process recording:', error);
            this.showPracticeFeedback('Failed to analyze pronunciation: ' + error.message, 'error');
        } finally {
            const recordBtn = document.getElementById('record-practice');
            if (recordBtn) {
                recordBtn.textContent = '🎤 Record Practice';
                recordBtn.disabled = false;
            }
        }
    }

    /**
     * Process practice result and show feedback
     */
    async processPracticeResult(recognitionResult) {
        if (!this.currentPracticeError) return;

        const targetText = this.currentPracticeError.expectedText.toLowerCase();
        const spokenText = (recognitionResult.transcript || '').toLowerCase();
        
        // Calculate similarity score
        const confidence = this.calculateSimilarityScore(targetText, spokenText);
        const isCorrect = confidence > 0.8;

        // Update error with practice result
        this.errorManager.markAsPracticed(this.currentPracticeError.id, {
            accuracy: confidence,
            transcription: spokenText,
            timestamp: new Date().toISOString()
        });

        // Show practice feedback
        this.showPracticeResult(isCorrect, confidence, spokenText);

        // Update statistics
        this.updateStatistics();
    }

    /**
     * Calculate similarity score between target and spoken text
     */
    calculateSimilarityScore(target, spoken) {
        if (!target || !spoken) return 0;

        // Simple similarity calculation
        const targetWords = target.split(/\s+/);
        const spokenWords = spoken.split(/\s+/);
        
        let matches = 0;
        targetWords.forEach(targetWord => {
            if (spokenWords.some(spokenWord => 
                this.wordSimilarity(targetWord, spokenWord) > 0.7)) {
                matches++;
            }
        });

        return Math.min(matches / targetWords.length, 1);
    }

    /**
     * Calculate word similarity (basic implementation)
     */
    wordSimilarity(word1, word2) {
        if (word1 === word2) return 1;
        if (Math.abs(word1.length - word2.length) > 2) return 0;

        let matches = 0;
        const minLength = Math.min(word1.length, word2.length);
        
        for (let i = 0; i < minLength; i++) {
            if (word1[i] === word2[i]) matches++;
        }
        
        return matches / Math.max(word1.length, word2.length);
    }

    /**
     * Show practice result feedback
     */
    showPracticeResult(isCorrect, confidence, spokenText) {
        const feedbackArea = document.getElementById('practice-feedback');
        if (!feedbackArea) return;

        const confidencePercent = Math.round(confidence * 100);
        let feedbackClass = 'poor';
        let feedbackMessage = '';

        if (confidence >= 0.9) {
            feedbackClass = 'excellent';
            feedbackMessage = 'Excellent pronunciation!';
        } else if (confidence >= 0.8) {
            feedbackClass = 'good';
            feedbackMessage = 'Good pronunciation!';
        } else if (confidence >= 0.6) {
            feedbackClass = 'fair';
            feedbackMessage = 'Fair pronunciation. Try again for better accuracy.';
        } else {
            feedbackClass = 'poor';
            feedbackMessage = 'Keep practicing. Focus on clarity.';
        }

        feedbackArea.innerHTML = `
            <div class="practice-result ${feedbackClass}">
                <div class="result-header">
                    <span class="result-icon">${isCorrect ? '✓' : '⚠'}</span>
                    <span class="result-message">${feedbackMessage}</span>
                </div>
                <div class="result-details">
                    <div class="confidence-score">
                        Confidence: ${confidencePercent}%
                    </div>
                    <div class="transcription">
                        You said: "${spokenText}"
                    </div>
                </div>
                ${isCorrect ? `
                    <div class="success-actions">
                        <button onclick="errorPracticePage.markCurrentErrorResolved()">
                            Mark as Mastered
                        </button>
                    </div>
                ` : `
                    <div class="retry-actions">
                        <button onclick="errorPracticePage.playTargetPronunciation()">
                            Hear Target Again
                        </button>
                        <button onclick="errorPracticePage.startRecording()">
                            Try Again
                        </button>
                    </div>
                `}
            </div>
        `;

        // If significantly improved, suggest marking as resolved
        if (confidence > 0.85 && this.currentPracticeError.confidence < 0.6) {
            this.showPracticeFeedback('Great improvement! Consider marking this error as resolved.', 'success');
        }
    }

    /**
     * Show practice feedback message
     */
    showPracticeFeedback(message, type = 'info') {
        const feedbackArea = document.getElementById('practice-feedback');
        if (feedbackArea && type !== 'result') {
            feedbackArea.innerHTML = `
                <div class="practice-status ${type}">
                    ${message}
                </div>
            `;
        }
    }

    /**
     * Mark current error as resolved
     */
    markCurrentErrorResolved() {
        if (!this.currentPracticeError) return;

        this.errorManager.markErrorAsResolved(this.currentPracticeError.id);
        this.practiceSession.errorsResolved++;
        
        // Update UI
        this.filterAndDisplayErrors();
        this.updateStatistics();
        this.showPracticeFeedback('Error marked as resolved!', 'success');

        // Clear practice panel after delay
        setTimeout(() => {
            this.clearPracticePanel();
        }, 2000);
    }

    /**
     * Mark specific error as resolved
     */
    markErrorResolved(errorId) {
        this.errorManager.markErrorAsResolved(errorId);
        this.filterAndDisplayErrors();
        this.updateStatistics();
    }

    /**
     * Delete specific error
     */
    deleteError(errorId) {
        if (confirm('Are you sure you want to delete this error? This action cannot be undone.')) {
            this.errorManager.deleteError(errorId);
            this.filterAndDisplayErrors();
            this.updateStatistics();
            
            if (this.currentPracticeError && this.currentPracticeError.id === errorId) {
                this.clearPracticePanel();
            }
        }
    }

    /**
     * Clear all errors
     */
    clearAllErrors() {
        if (confirm('Are you sure you want to clear all errors? This action cannot be undone.')) {
            this.errorManager.clearAllErrors();
            this.filterAndDisplayErrors();
            this.updateStatistics();
            this.clearPracticePanel();
        }
    }

    /**
     * Clear practice panel
     */
    clearPracticePanel() {
        const practiceInstructions = document.getElementById('practice-instructions');
        const currentPractice = document.getElementById('current-practice');
        
        if (practiceInstructions) practiceInstructions.style.display = 'block';
        if (currentPractice) currentPractice.style.display = 'none';
        
        this.currentPracticeError = null;
        
        // Clear selection
        document.querySelectorAll('.error-item').forEach(item => {
            item.classList.remove('selected');
        });
    }

    /**
     * Update statistics display
     */
    updateStatistics() {
        const stats = this.errorManager.getErrorStatistics();
        
        // Update stat cards
        document.getElementById('total-errors-count').textContent = stats.totalErrors;
        document.getElementById('unresolved-errors-count').textContent = stats.unresolvedErrors;
        document.getElementById('practice-streak').textContent = stats.practiceStreak + ' days';
        document.getElementById('average-accuracy').textContent = Math.round(stats.averageAccuracy * 100) + '%';
    }

    /**
     * Load progress data and visualizations
     */
    loadProgressData() {
        // Load error patterns
        const patterns = this.errorManager.getErrorPatterns();
        this.displayErrorPatterns(patterns);
        
        // Display improvement areas
        this.displayImprovementAreas();
    }

    /**
     * Display error patterns
     */
    displayErrorPatterns(patterns) {
        const patternsContainer = document.getElementById('error-patterns');
        if (!patternsContainer || !patterns.troubleSpots) return;

        if (patterns.troubleSpots.length === 0) {
            patternsContainer.innerHTML = '<p>No error patterns identified yet.</p>';
            return;
        }

        patternsContainer.innerHTML = `
            <h5>Most Challenging Words:</h5>
            <ul>
                ${patterns.troubleSpots.slice(0, 5).map(spot => `
                    <li>${spot.word} <span class="error-count">(${spot.count} errors)</span></li>
                `).join('')}
            </ul>
        `;
    }

    /**
     * Display improvement areas
     */
    displayImprovementAreas() {
        const areasContainer = document.getElementById('improvement-areas');
        if (!areasContainer) return;

        const errors = this.errorManager.getErrorsByPriority({ unresolved: true });
        const totalErrors = errors.length;

        if (totalErrors === 0) {
            areasContainer.innerHTML = '<p>Great job! No active error areas to work on.</p>';
            return;
        }

        // Categorize errors
        const lowConfidenceErrors = errors.filter(e => (e.confidence || 0) < 0.5).length;
        const frequentErrors = errors.filter(e => (e.occurrenceCount || 1) >= 3).length;
        const recentErrors = errors.filter(e => this.errorManager.getDaysSince(e.timestamp) <= 7).length;

        areasContainer.innerHTML = `
            <div class="improvement-suggestions">
                ${lowConfidenceErrors > 0 ? `
                    <div class="suggestion">
                        <strong>Focus on Clarity:</strong> ${lowConfidenceErrors} words need clearer pronunciation
                    </div>
                ` : ''}
                ${frequentErrors > 0 ? `
                    <div class="suggestion">
                        <strong>Persistent Challenges:</strong> ${frequentErrors} words need extra practice
                    </div>
                ` : ''}
                ${recentErrors > 0 ? `
                    <div class="suggestion">
                        <strong>Recent Issues:</strong> ${recentErrors} new pronunciation challenges this week
                    </div>
                ` : ''}
                ${totalErrors <= 5 ? `
                    <div class="suggestion success">
                        <strong>Almost There:</strong> Only ${totalErrors} errors left to resolve!
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Show import/export modal
     */
    showImportExportModal() {
        const modal = document.getElementById('import-export-modal');
        if (modal) {
            modal.style.display = 'block';
            this.updateExportStats();
        }
    }

    /**
     * Update export statistics
     */
    updateExportStats() {
        const stats = this.errorManager.getErrorStatistics();
        const exportStats = document.getElementById('export-stats');
        if (exportStats) {
            exportStats.innerHTML = `
                <div class="export-summary">
                    <p>Ready to export ${stats.totalErrors} errors</p>
                    <p>Including ${stats.unresolvedErrors} unresolved and ${stats.resolvedErrors} resolved</p>
                </div>
            `;
        }
    }

    /**
     * Download error data as JSON file
     */
    downloadErrors() {
        const exportData = this.errorManager.exportErrorData();
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `irish-ereader-errors-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        // Show success feedback
        const exportStats = document.getElementById('export-stats');
        if (exportStats) {
            exportStats.innerHTML = '<div class="success">✓ Error data downloaded successfully!</div>';
        }
    }

    /**
     * Handle file selection for import
     */
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        const uploadBtn = document.getElementById('upload-errors');
        if (uploadBtn) {
            uploadBtn.disabled = false;
        }

        const statusDiv = document.getElementById('import-status');
        if (statusDiv) {
            statusDiv.innerHTML = `<p>File selected: ${file.name}</p>`;
        }
    }

    /**
     * Upload and import error data
     */
    async uploadErrors() {
        const fileInput = document.getElementById('import-file');
        const file = fileInput?.files[0];
        
        if (!file) {
            this.showImportStatus('Please select a file first', 'error');
            return;
        }

        try {
            const text = await file.text();
            const importData = JSON.parse(text);
            
            const success = this.errorManager.importErrorData(importData);
            
            if (success) {
                this.showImportStatus('✓ Error data imported successfully!', 'success');
                
                // Refresh the display
                setTimeout(() => {
                    this.loadErrors();
                    this.updateStatistics();
                    this.loadProgressData();
                    this.closeModal(document.getElementById('import-export-modal'));
                }, 1500);
            } else {
                this.showImportStatus('Failed to import data. Please check the file format.', 'error');
            }
        } catch (error) {
            console.error('Import error:', error);
            this.showImportStatus('Failed to import: ' + error.message, 'error');
        }
    }

    /**
     * Show import status message
     */
    showImportStatus(message, type) {
        const statusDiv = document.getElementById('import-status');
        if (statusDiv) {
            statusDiv.innerHTML = `<div class="${type}">${message}</div>`;
        }
    }

    /**
     * Switch between import/export tabs
     */
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`)?.classList.add('active');
    }

    /**
     * Close modal
     */
    closeModal(modal) {
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error(message);
        // Could implement a notification system here
        alert(message);
    }
}

// Make instance globally available
window.errorPracticePage = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.errorPracticePage = new ErrorPracticePage();
    window.errorPracticePage.initialize();
});