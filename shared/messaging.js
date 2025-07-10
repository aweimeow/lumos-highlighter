// Shared messaging system for Lumos Highlighter
// This module provides a standardized way for inter-script communication

/**
 * Messaging system for communication between different scripts
 */
class MessagingSystem {
    /**
     * Send a message to background script
     * @param {string} type - Message type
     * @param {Object} data - Message data
     * @returns {Promise<any>} Response from background script
     */
    static async sendToBackground(type, data = {}) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ type, data }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(response);
                }
            });
        });
    }

    /**
     * Send a message to content script
     * @param {number} tabId - Tab ID
     * @param {string} type - Message type
     * @param {Object} data - Message data
     * @returns {Promise<any>} Response from content script
     */
    static async sendToContentScript(tabId, type, data = {}) {
        return new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(tabId, { type, data }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(response);
                }
            });
        });
    }

    /**
     * Listen for messages from other scripts
     * @param {Function} handler - Message handler function
     */
    static addMessageListener(handler) {
        chrome.runtime.onMessage.addListener(handler);
    }

    /**
     * Remove message listener
     * @param {Function} handler - Message handler function to remove
     */
    static removeMessageListener(handler) {
        chrome.runtime.onMessage.removeListener(handler);
    }

    /**
     * Create a standardized message response
     * @param {boolean} success - Whether operation was successful
     * @param {any} data - Response data
     * @param {string} error - Error message if failed
     * @returns {Object} Standardized response object
     */
    static createResponse(success, data = null, error = null) {
        return { success, data, error };
    }

    /**
     * Handle message routing in background script
     * @param {Object} message - Received message
     * @param {Object} sender - Message sender
     * @param {Function} sendResponse - Response callback
     * @returns {boolean} True if response is async
     */
    static handleMessage(message, sender, sendResponse) {
        // This method should be overridden by specific implementations
        // Return true if response will be sent asynchronously
        return false;
    }
}

/**
 * Specialized messaging functions for common operations
 */
class HighlightMessaging {
    /**
     * Save a highlight
     * @param {string} domain - Domain name
     * @param {Object} highlightData - Highlight data
     * @returns {Promise<Object>} Response
     */
    static async saveHighlight(domain, highlightData) {
        const MESSAGE_TYPES = window.LumosSharedConstants.MESSAGE_TYPES;
        return MessagingSystem.sendToBackground(MESSAGE_TYPES.SAVE_HIGHLIGHT, {
            domain,
            highlightData
        });
    }

    /**
     * Delete a highlight
     * @param {string} domain - Domain name
     * @param {string} highlightId - Highlight ID
     * @returns {Promise<Object>} Response
     */
    static async deleteHighlight(domain, highlightId) {
        const MESSAGE_TYPES = window.LumosSharedConstants.MESSAGE_TYPES;
        return MessagingSystem.sendToBackground(MESSAGE_TYPES.DELETE_HIGHLIGHT, {
            domain,
            highlightId
        });
    }

    /**
     * Update highlight color
     * @param {string} domain - Domain name
     * @param {string} highlightId - Highlight ID
     * @param {string} newColor - New color
     * @returns {Promise<Object>} Response
     */
    static async updateHighlightColor(domain, highlightId, newColor) {
        const MESSAGE_TYPES = window.LumosSharedConstants.MESSAGE_TYPES;
        return MessagingSystem.sendToBackground(MESSAGE_TYPES.UPDATE_HIGHLIGHT_COLOR, {
            domain,
            highlightId,
            newColor
        });
    }

    /**
     * Get highlights for a page
     * @param {string} domain - Domain name
     * @param {string} url - Page URL
     * @returns {Promise<Object>} Response
     */
    static async getHighlights(domain, url) {
        const MESSAGE_TYPES = window.LumosSharedConstants.MESSAGE_TYPES;
        return MessagingSystem.sendToBackground(MESSAGE_TYPES.GET_HIGHLIGHTS, {
            domain,
            url
        });
    }

    /**
     * Get all highlights for a domain
     * @param {string} domain - Domain name
     * @returns {Promise<Object>} Response
     */
    static async getAllHighlights(domain) {
        const MESSAGE_TYPES = window.LumosSharedConstants.MESSAGE_TYPES;
        return MessagingSystem.sendToBackground(MESSAGE_TYPES.GET_ALL_HIGHLIGHTS, {
            domain
        });
    }

    /**
     * Get all websites with highlights
     * @returns {Promise<Object>} Response
     */
    static async getAllWebsites() {
        const MESSAGE_TYPES = window.LumosSharedConstants.MESSAGE_TYPES;
        return MessagingSystem.sendToBackground(MESSAGE_TYPES.GET_ALL_WEBSITES);
    }

    /**
     * Get metadata
     * @returns {Promise<Object>} Response
     */
    static async getMetadata() {
        const MESSAGE_TYPES = window.LumosSharedConstants.MESSAGE_TYPES;
        return MessagingSystem.sendToBackground(MESSAGE_TYPES.GET_METADATA);
    }

    /**
     * Remove all highlights from a page
     * @param {string} domain - Domain name
     * @param {string} url - Page URL
     * @returns {Promise<Object>} Response
     */
    static async removeAllHighlightsFromPage(domain, url) {
        const MESSAGE_TYPES = window.LumosSharedConstants.MESSAGE_TYPES;
        return MessagingSystem.sendToBackground(MESSAGE_TYPES.REMOVE_ALL_HIGHLIGHTS_FROM_PAGE, {
            domain,
            url
        });
    }
}

/**
 * Specialized messaging functions for export operations
 */
class ExportMessaging {
    /**
     * Export page summary
     * @param {Object} tab - Tab object
     * @returns {Promise<Object>} Response
     */
    static async exportPageSummary(tab) {
        const MESSAGE_TYPES = window.LumosSharedConstants.MESSAGE_TYPES;
        return MessagingSystem.sendToBackground(MESSAGE_TYPES.EXPORT_PAGE_SUMMARY, { tab });
    }


    /**
     * Get export selection data
     * @returns {Promise<Object>} Response
     */
    static async getExportSelectionData() {
        const MESSAGE_TYPES = window.LumosSharedConstants.MESSAGE_TYPES;
        return MessagingSystem.sendToBackground(MESSAGE_TYPES.GET_EXPORT_SELECTION_DATA);
    }

    /**
     * Generate PDF
     * @param {Object} data - PDF data
     * @param {string} type - Export type
     * @returns {Promise<Object>} Response
     */
    static async generatePDF(data, type) {
        const MESSAGE_TYPES = window.LumosSharedConstants.MESSAGE_TYPES;
        return MessagingSystem.sendToBackground(MESSAGE_TYPES.GENERATE_PDF, { data, type });
    }
}

/**
 * Specialized messaging functions for management operations
 */
class ManagementMessaging {
    /**
     * Open management interface
     * @returns {Promise<Object>} Response
     */
    static async openManagementInterface() {
        const MESSAGE_TYPES = window.LumosSharedConstants.MESSAGE_TYPES;
        return MessagingSystem.sendToBackground(MESSAGE_TYPES.OPEN_MANAGEMENT_INTERFACE);
    }
}

/**
 * Event emitter for internal communication within scripts
 */
class EventEmitter {
    constructor() {
        this.events = {};
    }

    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function to remove
     */
    off(event, callback) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {...any} args - Arguments to pass to callbacks
     */
    emit(event, ...args) {
        if (this.events[event]) {
            this.events[event].forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    console.error('Error in event callback:', error);
                }
            });
        }
    }

    /**
     * Remove all listeners for an event
     * @param {string} event - Event name
     */
    removeAllListeners(event) {
        if (event) {
            delete this.events[event];
        } else {
            this.events = {};
        }
    }
}

// Global event emitter instance
const globalEventEmitter = new EventEmitter();

// Legacy function exports for backward compatibility
const sendToBackground = (type, data) => MessagingSystem.sendToBackground(type, data);
const sendToContentScript = (tabId, type, data) => MessagingSystem.sendToContentScript(tabId, type, data);
const addMessageListener = (handler) => MessagingSystem.addMessageListener(handler);
const removeMessageListener = (handler) => MessagingSystem.removeMessageListener(handler);
const createResponse = (success, data, error) => MessagingSystem.createResponse(success, data, error);

// Assign to global window object
window.LumosMessaging = {
    MessagingSystem,
    HighlightMessaging,
    ExportMessaging,
    ManagementMessaging,
    EventEmitter,
    globalEventEmitter,
    sendToBackground,
    sendToContentScript,
    addMessageListener,
    removeMessageListener,
    createResponse
};