// Debug Toggle Module - Page Flip Animation
// Provides a visual toggle for debug mode in the top-left corner

class DebugToggle {
    constructor() {
        this.isDebugEnabled = false;
        this.toggleElement = null;
        this.pageElement = null;
        this.textElement = null;
        this.activationArea = null;
        
        this.init();
    }

    async init() {
        // Wait for logger to be available
        await this.waitForLogger();
        
        // Get initial debug state
        this.isDebugEnabled = window.LumosLogger.getDebugMode();
        
        // Create UI elements
        this.createToggleUI();
        this.setupEventListeners();
        
        // Update initial state
        this.updateUI();
    }

    waitForLogger() {
        return new Promise((resolve) => {
            const checkLogger = () => {
                if (window.LumosLogger) {
                    resolve();
                } else {
                    setTimeout(checkLogger, 100);
                }
            };
            checkLogger();
        });
    }

    createToggleUI() {
        // Create activation area (invisible, larger click area)
        this.activationArea = document.createElement('div');
        this.activationArea.className = 'lumos-debug-activation-area';
        
        // Create main toggle container
        this.toggleElement = document.createElement('div');
        this.toggleElement.className = 'lumos-debug-toggle';
        
        // Create page element (the triangle)
        this.pageElement = document.createElement('div');
        this.pageElement.className = 'lumos-debug-page';
        
        // Create text element
        this.textElement = document.createElement('div');
        this.textElement.className = 'lumos-debug-text';
        this.textElement.textContent = 'turn on debug';
        
        // Assemble elements
        this.pageElement.appendChild(this.textElement);
        this.toggleElement.appendChild(this.pageElement);
        
        // Add to document
        document.body.appendChild(this.activationArea);
        document.body.appendChild(this.toggleElement);
    }

    setupEventListeners() {
        // Click handler for activation area
        this.activationArea.addEventListener('click', (e) => {
            this.toggleDebugMode();
            e.stopPropagation();
        });

        // Hover effects
        this.activationArea.addEventListener('mouseenter', () => {
            this.showToggle();
        });

        this.activationArea.addEventListener('mouseleave', () => {
            if (!this.isDebugEnabled) {
                this.hideToggle();
            }
        });
    }

    showToggle() {
        this.toggleElement.style.opacity = '1';
        this.pageElement.classList.add('flipped');
    }

    hideToggle() {
        this.toggleElement.style.opacity = '0.3';
        this.pageElement.classList.remove('flipped');
    }

    async toggleDebugMode() {
        this.isDebugEnabled = !this.isDebugEnabled;
        
        // Update logger state
        await window.LumosLogger.setDebugMode(this.isDebugEnabled);
        
        // Update UI
        this.updateUI();
        
        // Provide visual feedback
        this.showToggleFeedback();
    }

    updateUI() {
        if (this.isDebugEnabled) {
            this.textElement.textContent = 'debug on';
            this.textElement.style.color = '#28a745';
            this.pageElement.classList.add('flipped');
            this.pageElement.style.borderColor = '#d4edda transparent transparent #d4edda';
        } else {
            this.textElement.textContent = 'turn on debug';
            this.textElement.style.color = '#495057';
            this.pageElement.classList.remove('flipped');
            this.pageElement.style.borderColor = '#f8f9fa transparent transparent #f8f9fa';
        }
    }

    showToggleFeedback() {
        // Brief animation feedback
        this.pageElement.style.transform = 'scale(1.1)';
        setTimeout(() => {
            this.pageElement.style.transform = 'scale(1)';
        }, 150);
        
        // Console feedback
        if (this.isDebugEnabled) {
            if (window.LumosLogger) { window.LumosLogger.debug('🔍 [Lumos Debug] Debug mode enabled - console logs will now appear'); }
        } else {
            if (window.LumosLogger) { window.LumosLogger.debug('🔍 [Lumos Debug] Debug mode disabled - console logs are now hidden'); }
        }
    }

    // Public method to get debug state
    getDebugMode() {
        return this.isDebugEnabled;
    }

    // Public method to set debug state programmatically
    async setDebugMode(enabled) {
        if (this.isDebugEnabled !== enabled) {
            await this.toggleDebugMode();
        }
    }

    // Clean up method
    destroy() {
        if (this.activationArea) {
            this.activationArea.remove();
        }
        if (this.toggleElement) {
            this.toggleElement.remove();
        }
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DebugToggle;
}

// Make available globally
window.DebugToggle = DebugToggle;