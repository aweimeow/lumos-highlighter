// Shared utility functions for Lumos Highlighter
// This module contains common utility functions used across different modules

/**
 * Utility functions for common operations
 */
class Utils {
    /**
     * Generate a unique ID for highlights
     * @returns {string} Unique ID
     */
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Get current timestamp in ISO format
     * @returns {string} ISO timestamp
     */
    static getCurrentTimestamp() {
        return new Date().toISOString();
    }

    /**
     * Format timestamp to readable date string
     * @param {string} timestamp - ISO timestamp
     * @returns {string} Formatted date string
     */
    static formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Extract domain from URL
     * @param {string} url - Full URL
     * @returns {string} Domain name
     */
    static extractDomain(url) {
        try {
            return new URL(url).hostname;
        } catch (e) {
            return url;
        }
    }

    /**
     * Get color name from hex value
     * @param {string} hexColor - Hex color value
     * @returns {string} Color name
     */
    static getColorName(hexColor) {
        const COLOR_NAMES = window.LumosSharedConstants.COLOR_NAMES;
        return COLOR_NAMES[hexColor] || 'unknown';
    }

    /**
     * Clean text by removing extra whitespace and normalizing
     * @param {string} text - Text to clean
     * @returns {string} Cleaned text
     */
    static cleanText(text) {
        return text.replace(/\s+/g, ' ').trim();
    }

    /**
     * Escape HTML characters in text
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Truncate text to specified length
     * @param {string} text - Text to truncate
     * @param {number} length - Maximum length
     * @param {string} suffix - Suffix to add (default: '...')
     * @returns {string} Truncated text
     */
    static truncateText(text, length, suffix = '...') {
        if (text.length <= length) return text;
        return text.substring(0, length - suffix.length) + suffix;
    }

    /**
     * Debounce function execution
     * @param {Function} func - Function to debounce
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Debounced function
     */
    static debounce(func, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    /**
     * Throttle function execution
     * @param {Function} func - Function to throttle
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Throttled function
     */
    static throttle(func, delay) {
        let lastExecTime = 0;
        return function(...args) {
            const currentTime = Date.now();
            if (currentTime - lastExecTime > delay) {
                func.apply(this, args);
                lastExecTime = currentTime;
            }
        };
    }

    /**
     * Wait for a specified amount of time
     * @param {number} ms - Milliseconds to wait
     * @returns {Promise<void>}
     */
    static async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Retry a function with exponential backoff
     * @param {Function} func - Function to retry
     * @param {number} maxRetries - Maximum number of retries
     * @param {number} initialDelay - Initial delay in milliseconds
     * @param {number} backoffMultiplier - Backoff multiplier
     * @returns {Promise<any>} Function result
     */
    static async retry(func, maxRetries = 3, initialDelay = 1000, backoffMultiplier = 2) {
        let lastError;
        let delay = initialDelay;

        for (let i = 0; i <= maxRetries; i++) {
            try {
                return await func();
            } catch (error) {
                lastError = error;
                if (i === maxRetries) break;
                
                await this.wait(delay);
                delay *= backoffMultiplier;
            }
        }

        throw lastError;
    }

    /**
     * Check if a string is a valid URL
     * @param {string} string - String to check
     * @returns {boolean} True if valid URL
     */
    static isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    /**
     * Deep clone an object
     * @param {any} obj - Object to clone
     * @returns {any} Cloned object
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const cloned = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    cloned[key] = this.deepClone(obj[key]);
                }
            }
            return cloned;
        }
        return obj;
    }

    /**
     * Calculate text similarity using Levenshtein distance
     * @param {string} str1 - First string
     * @param {string} str2 - Second string
     * @returns {number} Similarity ratio (0-1)
     */
    static calculateSimilarity(str1, str2) {
        const matrix = [];
        const len1 = str1.length;
        const len2 = str2.length;

        for (let i = 0; i <= len2; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= len1; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= len2; i++) {
            for (let j = 1; j <= len1; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        const maxLen = Math.max(len1, len2);
        return maxLen === 0 ? 1 : (maxLen - matrix[len2][len1]) / maxLen;
    }

    /**
     * Check if element is visible in viewport
     * @param {Element} element - Element to check
     * @returns {boolean} True if visible
     */
    static isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        return rect.top >= 0 && rect.left >= 0 && 
               rect.bottom <= window.innerHeight && 
               rect.right <= window.innerWidth;
    }

    /**
     * Get element position relative to document
     * @param {Element} element - Element to get position for
     * @returns {Object} Position object with x, y properties
     */
    static getElementPosition(element) {
        const rect = element.getBoundingClientRect();
        return {
            x: rect.left + window.pageXOffset,
            y: rect.top + window.pageYOffset
        };
    }

    /**
     * Create a promise that resolves when DOM is ready
     * @returns {Promise<void>}
     */
    static async waitForDOMReady() {
        return new Promise(resolve => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    }
}

// Legacy function exports for backward compatibility
const generateId = () => Utils.generateId();
const getCurrentTimestamp = () => Utils.getCurrentTimestamp();
const formatDate = (timestamp) => Utils.formatDate(timestamp);
const extractDomain = (url) => Utils.extractDomain(url);
const getColorName = (hexColor) => Utils.getColorName(hexColor);
const cleanText = (text) => Utils.cleanText(text);
const escapeHtml = (text) => Utils.escapeHtml(text);
const truncateText = (text, length, suffix) => Utils.truncateText(text, length, suffix);
const debounce = (func, delay) => Utils.debounce(func, delay);
const throttle = (func, delay) => Utils.throttle(func, delay);
const wait = (ms) => Utils.wait(ms);
const retry = (func, maxRetries, initialDelay, backoffMultiplier) => 
    Utils.retry(func, maxRetries, initialDelay, backoffMultiplier);
const isValidUrl = (string) => Utils.isValidUrl(string);
const deepClone = (obj) => Utils.deepClone(obj);
const calculateSimilarity = (str1, str2) => Utils.calculateSimilarity(str1, str2);
const isElementVisible = (element) => Utils.isElementVisible(element);
const getElementPosition = (element) => Utils.getElementPosition(element);
const waitForDOMReady = () => Utils.waitForDOMReady();

// Assign to global window object
window.LumosUtils = {
    Utils,
    generateId,
    getCurrentTimestamp,
    formatDate,
    extractDomain,
    getColorName,
    cleanText,
    escapeHtml,
    truncateText,
    debounce,
    throttle,
    wait,
    retry,
    isValidUrl,
    deepClone,
    calculateSimilarity,
    isElementVisible,
    getElementPosition,
    waitForDOMReady
};