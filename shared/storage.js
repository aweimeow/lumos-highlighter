// Shared storage interface for Lumos Highlighter
// This module provides a standardized way to interact with Chrome storage

/**
 * Storage interface for managing highlights and settings
 */
class StorageInterface {
    /**
     * Get highlights data from storage
     * @returns {Promise<Object>} Highlights data
     */
    static async getHighlightsData() {
        const STORAGE_KEYS = window.LumosSharedConstants.STORAGE_KEYS;
        return new Promise((resolve) => {
            chrome.storage.local.get([STORAGE_KEYS.HIGHLIGHTS], (result) => {
                resolve(result[STORAGE_KEYS.HIGHLIGHTS] || {
                    websites: {},
                    metadata: {
                        total_highlights: 0,
                        last_updated: null,
                        date_range: { earliest: null, latest: null },
                        color_stats: { red: 0, orange: 0, yellow: 0, green: 0, blue: 0 }
                    }
                });
            });
        });
    }

    /**
     * Save highlights data to storage
     * @param {Object} data - Highlights data to save
     * @returns {Promise<void>}
     */
    static async saveHighlightsData(data) {
        const STORAGE_KEYS = window.LumosSharedConstants.STORAGE_KEYS;
        return new Promise((resolve) => {
            chrome.storage.local.set({
                [STORAGE_KEYS.HIGHLIGHTS]: data
            }, resolve);
        });
    }

    /**
     * Get settings from storage
     * @returns {Promise<Object>} Settings object
     */
    static async getSettings() {
        const STORAGE_KEYS = window.LumosSharedConstants.STORAGE_KEYS;
        return new Promise((resolve) => {
            chrome.storage.local.get([STORAGE_KEYS.SETTINGS], (result) => {
                resolve(result[STORAGE_KEYS.SETTINGS] || {});
            });
        });
    }

    /**
     * Save settings to storage
     * @param {Object} settings - Settings object to save
     * @returns {Promise<void>}
     */
    static async saveSettings(settings) {
        const STORAGE_KEYS = window.LumosSharedConstants.STORAGE_KEYS;
        return new Promise((resolve) => {
            chrome.storage.local.set({
                [STORAGE_KEYS.SETTINGS]: settings
            }, resolve);
        });
    }

    /**
     * Get highlights for a specific domain
     * @param {string} domain - Domain name
     * @returns {Promise<Object>} Domain highlights data
     */
    static async getDomainHighlights(domain) {
        const data = await this.getHighlightsData();
        return data.websites[domain] || { title: '', favicon: '', highlights: [] };
    }

    /**
     * Save highlights for a specific domain
     * @param {string} domain - Domain name
     * @param {Object} domainData - Domain highlights data
     * @returns {Promise<void>}
     */
    static async saveDomainHighlights(domain, domainData) {
        const data = await this.getHighlightsData();
        data.websites[domain] = domainData;
        await this.saveHighlightsData(data);
    }

    /**
     * Update metadata after highlight operations
     * @param {Object} metadata - Updated metadata
     * @returns {Promise<void>}
     */
    static async updateMetadata(metadata) {
        const data = await this.getHighlightsData();
        data.metadata = { ...data.metadata, ...metadata };
        await this.saveHighlightsData(data);
    }

    /**
     * Get all websites with highlights
     * @returns {Promise<Array>} Array of website objects
     */
    static async getAllWebsites() {
        const data = await this.getHighlightsData();
        return Object.keys(data.websites).map(domain => ({
            domain,
            ...data.websites[domain]
        }));
    }

    /**
     * Get metadata
     * @returns {Promise<Object>} Metadata object
     */
    static async getMetadata() {
        const data = await this.getHighlightsData();
        return data.metadata;
    }

    /**
     * Clear all highlights data
     * @returns {Promise<void>}
     */
    static async clearAllHighlights() {
        await this.saveHighlightsData({
            websites: {},
            metadata: {
                total_highlights: 0,
                last_updated: null,
                date_range: { earliest: null, latest: null },
                color_stats: { red: 0, orange: 0, yellow: 0, green: 0, blue: 0 }
            }
        });
    }

    /**
     * Export all data for backup
     * @returns {Promise<Object>} Complete data object
     */
    static async exportAllData() {
        const highlights = await this.getHighlightsData();
        const settings = await this.getSettings();
        return { highlights, settings };
    }

    /**
     * Import data from backup
     * @param {Object} data - Data to import
     * @returns {Promise<void>}
     */
    static async importData(data) {
        if (data.highlights) {
            await this.saveHighlightsData(data.highlights);
        }
        if (data.settings) {
            await this.saveSettings(data.settings);
        }
    }
}

// Legacy function wrappers for backward compatibility
const getHighlightsData = () => StorageInterface.getHighlightsData();
const saveHighlightsData = (data) => StorageInterface.saveHighlightsData(data);
const getSettings = () => StorageInterface.getSettings();
const saveSettings = (settings) => StorageInterface.saveSettings(settings);

// Assign to global window object
window.LumosStorageInterface = {
    StorageInterface,
    getHighlightsData,
    saveHighlightsData,
    getSettings,
    saveSettings
};