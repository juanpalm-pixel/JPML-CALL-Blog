/**
 * Error Tracking and Management
 * Handles storage and analysis of pronunciation errors for targeted practice
 */

class ErrorManager {
    constructor() {
        this.errors = new Map(); // Map of error_id -> error_data
        this.storageKey = 'irish_ereader_errors';
        this.sessionErrors = [];
        
        this.init();
    }

    /**
     * Initialize the error manager
     */
    init() {
        console.log('Initializing Error Manager...');
        this.loadErrorsFromStorage();
    }

    /**
     * Record a new pronunciation error
     * @param {Object} errorData - Error information
     * @returns {string} - Error ID
     */
    recordError(errorData) {
        const errorId = this.generateErrorId();
        const timestamp = new Date().toISOString();
        
        const error = {
            id: errorId,
            timestamp: timestamp,
            sentence: errorData.sentence || '',
            expectedText: errorData.expectedText || '',
            actualText: errorData.actualText || '',
            errorType: errorData.errorType || 'pronunciation', // pronunciation, word, phrase
            confidence: errorData.confidence || 0,
            audioData: errorData.audioData || null,
            practiceCount: 0,
            lastPracticed: null,
            resolved: false,
            ...errorData
        };

        // Check if similar error exists
        const existingErrorId = this.findSimilarError(error);
        if (existingErrorId) {
            this.incrementErrorCount(existingErrorId);
            return existingErrorId;
        }

        // Store new error
        this.errors.set(errorId, error);
        this.sessionErrors.push(errorId);
        
        console.log(`Recorded new error: ${errorId}`, error);
        
        this.saveErrorsToStorage();
        return errorId;
    }

    /**
     * Find similar existing error
     * @param {Object} newError - New error to check
     * @returns {string|null} - Existing error ID or null
     */
    findSimilarError(newError) {
        for (const [errorId, existingError] of this.errors) {
            if (this.areSimilarErrors(newError, existingError)) {
                return errorId;
            }
        }
        return null;
    }

    /**
     * Check if two errors are similar
     * @param {Object} error1 - First error
     * @param {Object} error2 - Second error
     * @returns {boolean} - True if similar
     */
    areSimilarErrors(error1, error2) {
        // TODO: Implement sophisticated similarity comparison
        // Consider phonetic similarity, word patterns, etc.
        
        return (
            error1.expectedText === error2.expectedText &&
            error1.errorType === error2.errorType
        );
    }

    /**
     * Increment error count for existing error
     * @param {string} errorId - Error ID to increment
     */
    incrementErrorCount(errorId) {
        const error = this.errors.get(errorId);
        if (error) {
            error.occurrenceCount = (error.occurrenceCount || 1) + 1;
            error.lastOccurrence = new Date().toISOString();
            this.saveErrorsToStorage();
            console.log(`Incremented error count for ${errorId}: ${error.occurrenceCount}`);
        }
    }

    /**
     * Get all errors sorted by priority
     * @param {Object} filters - Optional filters
     * @returns {Array} - Sorted array of errors
     */
    getErrorsByPriority(filters = {}) {
        let errorList = Array.from(this.errors.values());
        
        // Apply filters
        if (filters.unresolved) {
            errorList = errorList.filter(error => !error.resolved);
        }
        
        if (filters.errorType) {
            errorList = errorList.filter(error => error.errorType === filters.errorType);
        }
        
        if (filters.minOccurrences) {
            errorList = errorList.filter(error => 
                (error.occurrenceCount || 1) >= filters.minOccurrences
            );
        }

        // Sort by priority (frequency, recency, practice need)
        errorList.sort((a, b) => {
            const aScore = this.calculateErrorPriority(a);
            const bScore = this.calculateErrorPriority(b);
            return bScore - aScore; // Higher score = higher priority
        });

        console.log(`Retrieved ${errorList.length} errors with filters:`, filters);
        return errorList;
    }

    /**
     * Calculate error priority score
     * @param {Object} error - Error object
     * @returns {number} - Priority score
     */
    calculateErrorPriority(error) {
        let score = 0;
        
        // Frequency weight
        score += (error.occurrenceCount || 1) * 10;
        
        // Recency weight
        const daysSinceOccurrence = this.getDaysSince(error.lastOccurrence || error.timestamp);
        score += Math.max(0, 30 - daysSinceOccurrence) * 2;
        
        // Practice need weight
        const daysSincePractice = error.lastPracticed ? 
            this.getDaysSince(error.lastPracticed) : 999;
        score += Math.min(daysSincePractice * 3, 50);
        
        // Confidence penalty (lower confidence = higher priority)
        score += (1 - (error.confidence || 0)) * 20;

        return score;
    }

    /**
     * Mark error as practiced
     * @param {string} errorId - Error ID
     * @param {Object} practiceResult - Practice session result
     */
    markAsPracticed(errorId, practiceResult = {}) {
        const error = this.errors.get(errorId);
        if (error) {
            error.practiceCount += 1;
            error.lastPracticed = new Date().toISOString();
            
            if (practiceResult.accuracy) {
                error.lastAccuracy = practiceResult.accuracy;
                // Mark as resolved if consistently accurate
                if (practiceResult.accuracy > 0.9 && error.practiceCount >= 3) {
                    error.resolved = true;
                }
            }
            
            this.saveErrorsToStorage();
            console.log(`Marked error ${errorId} as practiced:`, practiceResult);
        }
    }

    /**
     * Get error statistics
     * @returns {Object} - Error statistics
     */
    getErrorStatistics() {
        const allErrors = Array.from(this.errors.values());
        const unresolvedErrors = allErrors.filter(error => !error.resolved);
        const recentErrors = allErrors.filter(error => 
            this.getDaysSince(error.timestamp) <= 7
        );

        const stats = {
            totalErrors: allErrors.length,
            unresolvedErrors: unresolvedErrors.length,
            resolvedErrors: allErrors.length - unresolvedErrors.length,
            recentErrors: recentErrors.length,
            sessionErrors: this.sessionErrors.length,
            errorTypes: this.getErrorTypeBreakdown(allErrors),
            practiceStreak: this.calculatePracticeStreak(),
            averageAccuracy: this.calculateAverageAccuracy(allErrors)
        };

        console.log('Error statistics:', stats);
        return stats;
    }

    /**
     * Get breakdown of errors by type
     * @param {Array} errors - Array of errors
     * @returns {Object} - Error type breakdown
     */
    getErrorTypeBreakdown(errors) {
        const breakdown = {};
        errors.forEach(error => {
            breakdown[error.errorType] = (breakdown[error.errorType] || 0) + 1;
        });
        return breakdown;
    }

    /**
     * Calculate practice streak
     * @returns {number} - Days of consecutive practice
     */
    calculatePracticeStreak() {
        // TODO: Implement practice streak calculation
        return 0;
    }

    /**
     * Calculate average accuracy
     * @param {Array} errors - Array of errors
     * @returns {number} - Average accuracy percentage
     */
    calculateAverageAccuracy(errors) {
        const errorsWithAccuracy = errors.filter(error => error.lastAccuracy !== undefined);
        if (errorsWithAccuracy.length === 0) return 0;
        
        const totalAccuracy = errorsWithAccuracy.reduce((sum, error) => 
            sum + error.lastAccuracy, 0
        );
        
        return totalAccuracy / errorsWithAccuracy.length;
    }

    /**
     * Clear all errors
     */
    clearAllErrors() {
        console.log('Clearing all errors...');
        this.errors.clear();
        this.sessionErrors = [];
        this.saveErrorsToStorage();
    }

    /**
     * Delete specific error
     * @param {string} errorId - Error ID to delete
     */
    deleteError(errorId) {
        if (this.errors.delete(errorId)) {
            this.sessionErrors = this.sessionErrors.filter(id => id !== errorId);
            this.saveErrorsToStorage();
            console.log(`Deleted error: ${errorId}`);
            return true;
        }
        return false;
    }

    /**
     * Load errors from localStorage
     */
    loadErrorsFromStorage() {
        try {
            const storedErrors = localStorage.getItem(this.storageKey);
            if (storedErrors) {
                const errorData = JSON.parse(storedErrors);
                this.errors = new Map(errorData);
                console.log(`Loaded ${this.errors.size} errors from storage`);
            }
        } catch (error) {
            console.error('Error loading from storage:', error);
        }
    }

    /**
     * Save errors to localStorage
     */
    saveErrorsToStorage() {
        try {
            const errorData = Array.from(this.errors.entries());
            localStorage.setItem(this.storageKey, JSON.stringify(errorData));
            console.log(`Saved ${this.errors.size} errors to storage`);
        } catch (error) {
            console.error('Error saving to storage:', error);
        }
    }

    /**
     * Export error data for backup/sharing
     * @returns {Object} - Exported error data
     */
    exportErrorData() {
        const exportData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            errorCount: this.errors.size,
            errors: Object.fromEntries(this.errors),
            statistics: this.getErrorStatistics()
        };
        
        console.log(`Exported ${exportData.errorCount} errors`);
        return exportData;
    }

    /**
     * Import error data from backup
     * @param {Object} importData - Data to import
     * @returns {boolean} - Success status
     */
    importErrorData(importData) {
        try {
            if (!importData.errors || typeof importData.errors !== 'object') {
                throw new Error('Invalid import data format');
            }
            
            this.errors.clear();
            this.sessionErrors = [];
            
            // Import errors
            Object.entries(importData.errors).forEach(([id, error]) => {
                this.errors.set(id, error);
            });
            
            this.saveErrorsToStorage();
            console.log(`Imported ${this.errors.size} errors successfully`);
            return true;
            
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }

    /**
     * Clean up old or resolved errors
     * @param {Object} options - Cleanup options
     */
    cleanupErrors(options = {}) {
        const maxErrors = options.maxErrors || 50;
        const maxAge = options.maxAgeDays || 30;
        const keepResolved = options.keepResolved || false;
        
        let deletedCount = 0;
        const allErrors = Array.from(this.errors.values());
        
        // Remove old errors
        allErrors.forEach(error => {
            const daysSince = this.getDaysSince(error.timestamp);
            if (daysSince > maxAge || (!keepResolved && error.resolved)) {
                if (this.deleteError(error.id)) {
                    deletedCount++;
                }
            }
        });
        
        // If still too many errors, keep only the highest priority ones
        if (this.errors.size > maxErrors) {
            const sortedErrors = this.getErrorsByPriority();
            const excessCount = this.errors.size - maxErrors;
            
            for (let i = 0; i < excessCount; i++) {
                const errorToRemove = sortedErrors[sortedErrors.length - 1 - i];
                if (errorToRemove && this.deleteError(errorToRemove.id)) {
                    deletedCount++;
                }
            }
        }
        
        console.log(`Cleanup completed: removed ${deletedCount} errors`);
        return deletedCount;
    }

    /**
     * Get recent session errors for modal display
     * @param {number} limit - Maximum number of errors to return
     * @returns {Array} - Recent session errors
     */
    getRecentSessionErrors(limit = 10) {
        return this.sessionErrors
            .slice(-limit)
            .map(errorId => this.errors.get(errorId))
            .filter(error => error && !error.resolved);
    }

    /**
     * Get error patterns and insights
     * @returns {Object} - Error pattern analysis
     */
    getErrorPatterns() {
        const allErrors = Array.from(this.errors.values());
        const patterns = {
            mostCommonWords: {},
            timePatterns: {},
            improvementTrends: {},
            troubleSpots: []
        };
        
        // Analyze most common error words
        allErrors.forEach(error => {
            const word = error.expectedText.toLowerCase();
            patterns.mostCommonWords[word] = (patterns.mostCommonWords[word] || 0) + 1;
        });
        
        // Find trouble spots (words with high error frequency)
        patterns.troubleSpots = Object.entries(patterns.mostCommonWords)
            .filter(([word, count]) => count >= 3)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word, count]) => ({ word, count }));
        
        return patterns;
    }

    /**
     * Mark multiple errors as resolved
     * @param {Array} errorIds - Array of error IDs to mark as resolved
     */
    markMultipleAsResolved(errorIds) {
        let resolvedCount = 0;
        errorIds.forEach(errorId => {
            const error = this.errors.get(errorId);
            if (error && !error.resolved) {
                error.resolved = true;
                error.resolvedAt = new Date().toISOString();
                resolvedCount++;
            }
        });
        
        if (resolvedCount > 0) {
            this.saveErrorsToStorage();
            console.log(`Marked ${resolvedCount} errors as resolved`);
        }
        
        return resolvedCount;
    }

    /**
     * Get errors for specific practice session
     * @param {Object} criteria - Selection criteria
     * @returns {Array} - Errors for practice
     */
    getErrorsForPractice(criteria = {}) {
        const maxErrors = criteria.maxErrors || 5;
        const errorType = criteria.errorType || 'pronunciation';
        const minConfidence = criteria.minConfidence || 0;
        
        return this.getErrorsByPriority({
            unresolved: true,
            errorType: errorType
        })
        .filter(error => (error.confidence || 0) >= minConfidence)
        .slice(0, maxErrors);
    }

    /**
     * Generate unique error ID
     * @returns {string} - Unique error ID
     */
    generateErrorId() {
        return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get days since a given date
     * @param {string} dateString - ISO date string
     * @returns {number} - Days since date
     */
    getDaysSince(dateString) {
        if (!dateString) return 999;
        const date = new Date(dateString);
        const now = new Date();
        return Math.floor((now - date) / (1000 * 60 * 60 * 24));
    }

    /**
     * Show error tracking modal with recent errors
     * @param {Array} recentErrors - Recent pronunciation errors
     */
    showErrorTrackingModal(recentErrors = null) {
        const errors = recentErrors || this.getRecentSessionErrors(5);
        if (errors.length === 0) return;

        // Create modal if it doesn't exist
        let modal = document.getElementById('error-tracking-modal');
        if (!modal) {
            modal = this.createErrorTrackingModal();
        }

        // Update modal content
        this.updateErrorTrackingModalContent(modal, errors);
        
        // Show modal
        modal.style.display = 'block';
        if (window.UIAnimations) {
            window.UIAnimations.animateEntrance(modal, 'fade-in');
        }
    }

    /**
     * Create error tracking modal
     * @returns {HTMLElement} - Modal element
     */
    createErrorTrackingModal() {
        const modal = document.createElement('div');
        modal.id = 'error-tracking-modal';
        modal.className = 'error-tracking-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Pronunciation Errors Tracked</h3>
                    <button class="close-modal" aria-label="Close">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="modal-error-list"></div>
                </div>
                <div class="modal-footer">
                    <button id="practice-errors-btn" class="btn-primary">Practice Errors</button>
                    <button id="dismiss-modal-btn" class="btn-secondary">Continue Reading</button>
                </div>
            </div>
        `;

        // Add event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => this.closeModal(modal));
        modal.querySelector('#dismiss-modal-btn').addEventListener('click', () => this.closeModal(modal));
        modal.querySelector('#practice-errors-btn').addEventListener('click', () => {
            window.location.href = 'errors.html';
        });

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal(modal);
        });

        document.body.appendChild(modal);
        return modal;
    }

    /**
     * Update modal content with errors
     * @param {HTMLElement} modal - Modal element
     * @param {Array} errors - Errors to display
     */
    updateErrorTrackingModalContent(modal, errors) {
        const errorList = modal.querySelector('#modal-error-list');
        errorList.innerHTML = errors.map(error => `
            <div class="modal-error-item">
                <div class="error-text">${error.expectedText}</div>
                <div class="error-details">
                    <span class="confidence">Confidence: ${Math.round((error.confidence || 0) * 100)}%</span>
                    <span class="attempts">Attempts: ${error.practiceCount || 0}</span>
                </div>
                <div class="error-actions">
                    <button class="retry-error" data-error-id="${error.id}">Try Again</button>
                    <button class="resolve-error" data-error-id="${error.id}">Mark Resolved</button>
                </div>
            </div>
        `).join('');

        // Add action listeners
        errorList.addEventListener('click', (e) => {
            if (e.target.classList.contains('retry-error')) {
                const errorId = e.target.dataset.errorId;
                this.retryError(errorId);
            } else if (e.target.classList.contains('resolve-error')) {
                const errorId = e.target.dataset.errorId;
                this.markErrorAsResolved(errorId);
                e.target.closest('.modal-error-item').remove();
            }
        });
    }

    /**
     * Close error tracking modal
     * @param {HTMLElement} modal - Modal to close
     */
    closeModal(modal) {
        if (window.UIAnimations) {
            window.UIAnimations.animateExit(modal, 'fade-out', () => {
                modal.style.display = 'none';
            });
        } else {
            modal.style.display = 'none';
        }
    }

    /**
     * Retry pronunciation for specific error
     * @param {string} errorId - Error ID to retry
     */
    retryError(errorId) {
        const error = this.errors.get(errorId);
        if (error && window.ereader) {
            this.closeModal(document.getElementById('error-tracking-modal'));
            // Trigger pronunciation practice for this specific text
            window.ereader.practiceSpecificText(error.expectedText);
        }
    }

    /**
     * Mark specific error as resolved
     * @param {string} errorId - Error ID to resolve
     */
    markErrorAsResolved(errorId) {
        const error = this.errors.get(errorId);
        if (error) {
            error.resolved = true;
            error.resolvedAt = new Date().toISOString();
            this.saveErrorsToStorage();
            console.log(`Marked error ${errorId} as resolved`);
        }
    }
}

// Export for use in other modules
window.ErrorManager = ErrorManager;