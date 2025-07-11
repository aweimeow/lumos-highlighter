// Unified logging system for Lumos Highlighter
// Supports configurable log levels and debug mode

// Log levels in order of severity
const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

class Logger {
    constructor() {
        this.debugMode = false;
        this.currentLevel = LOG_LEVELS.WARN; // Default: only show ERROR and WARN
        this.init();
    }

    async init() {
        try {
            // Try to read debug mode from storage
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const result = await chrome.storage.local.get(['lumosDebugMode']);
                this.debugMode = result.lumosDebugMode === true;
                this.currentLevel = this.debugMode ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN;
            }
        } catch (error) {
            // Fallback if storage access fails
            this.debugMode = false;
            this.currentLevel = LOG_LEVELS.WARN;
        }
    }

    async setDebugMode(enabled) {
        this.debugMode = enabled;
        this.currentLevel = enabled ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN;
        
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                await chrome.storage.local.set({ lumosDebugMode: enabled });
            }
        } catch (error) {
            console.error('Failed to save debug mode setting:', error);
        }

        this.info(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    getDebugMode() {
        return this.debugMode;
    }

    // Internal logging method
    _log(level, message, ...args) {
        if (level <= this.currentLevel) {
            const timestamp = new Date().toISOString().substr(11, 12);
            const levelName = Object.keys(LOG_LEVELS)[level];
            const prefix = `[${timestamp}] [Lumos:${levelName}]`;
            
            switch (level) {
                case LOG_LEVELS.ERROR:
                    console.error(prefix, message, ...args);
                    break;
                case LOG_LEVELS.WARN:
                    console.warn(prefix, message, ...args);
                    break;
                case LOG_LEVELS.INFO:
                    console.info(prefix, message, ...args);
                    break;
                case LOG_LEVELS.DEBUG:
                    console.log(prefix, message, ...args);
                    break;
            }
        }
    }

    // Public logging methods
    error(message, ...args) {
        this._log(LOG_LEVELS.ERROR, message, ...args);
    }

    warn(message, ...args) {
        this._log(LOG_LEVELS.WARN, message, ...args);
    }

    info(message, ...args) {
        this._log(LOG_LEVELS.INFO, message, ...args);
    }

    debug(message, ...args) {
        this._log(LOG_LEVELS.DEBUG, message, ...args);
    }

    // Convenience methods for common scenarios
    highlightCreated(highlight) {
        this.debug('Highlight created successfully:', {
            id: highlight.id,
            color: highlight.color,
            text: highlight.text.substring(0, 50) + '...'
        });
    }

    highlightRestored(count) {
        this.debug(`Successfully restored ${count} highlights`);
    }

    matchingAttempt(strategy, target, candidates) {
        this.debug(`Using ${strategy} matching strategy for "${target.substring(0, 30)}..." (${candidates} candidates)`);
    }

    storageOperation(operation, data) {
        this.debug(`Storage operation: ${operation}`, data);
    }

    performance(operation, duration) {
        this.debug(`Performance: ${operation} took ${duration}ms`);
    }
}

// Create global logger instance
window.LumosLogger = new Logger();

// Expose debug mode toggle for console access
window.setLumosDebugMode = (enabled) => {
    window.LumosLogger.setDebugMode(enabled);
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Logger;
}