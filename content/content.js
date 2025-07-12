// Content script for Lumos Highlighter - Clean Entry Point
// Orchestrates all highlighting functionality through global references

// All modules are loaded through the content script injection in manifest.json
// Access all functionality through global window objects:

// Initial load message - will be controlled by debug mode once logger is available

// Global state management
let lastClickTime = 0;
let clickCount = 0;

// Main initialization function
function init() {
    // Only log if logger is available and debug mode is enabled
    if (window.LumosLogger) {
        window.LumosLogger.info('🚀 Initializing Lumos Highlighter...');
    }
    
    // Wait for all modules to load
    if (!window.LumosEventHandler || !window.LumosStorageManager || !window.LumosToolbarManager) {
        if (window.LumosLogger) {
            window.LumosLogger.debug('Waiting for modules to load...');
        }
        setTimeout(init, 100);
        return;
    }
    
    // Note: Debug toggle is now in popup, not content script
    // Content script will receive debug mode updates via messages
    
    // Initialize event handlers
    window.LumosEventHandler.init();
    
    // Setup SPA navigation detection
    window.LumosEventHandler.setupSPANavigationDetection();
    
    // Load saved styles and set double click mode
    loadSavedStyles();
    
    // Restore existing highlights on page load
    window.LumosStorageManager.restoreHighlights();
    
    // Setup message listener for background communication
    setupMessageListener();
    
    if (window.LumosLogger) {
        window.LumosLogger.info('✅ Lumos Highlighter initialized successfully');
    }
}

// Load saved styles and set double click mode
function loadSavedStyles() {
    try {
        // Check if chrome.storage is available
        if (!chrome || !chrome.storage || !chrome.storage.sync) {
            if (window.LumosLogger) {
                window.LumosLogger.warn('Chrome storage not available, using default styles');
            }
            return;
        }
        
        chrome.storage.sync.get(['lumosHighlightStyles'], function(result) {
            if (chrome.runtime.lastError) {
                if (window.LumosLogger) {
                    window.LumosLogger.error('Error loading styles:', chrome.runtime.lastError);
                }
                return;
            }
            
            const styles = result.lumosHighlightStyles || {};
            
            // Set double click mode based on highlight mode
            if (styles.highlightMode) {
                const isDoubleClickMode = styles.highlightMode === 'doubleclick';
                if (window.LumosEventHandler) {
                    window.LumosEventHandler.setDoubleClickDragMode(isDoubleClickMode);
                    if (window.LumosLogger) {
                        window.LumosLogger.debug('Double click mode loaded from storage:', isDoubleClickMode);
                    }
                }
            }
            
            // Update styles in highlight manager
            if (window.LumosHighlightManager) {
                window.LumosHighlightManager.updateHighlightStyles(styles);
            }
        });
    } catch (error) {
        if (window.LumosLogger) {
            window.LumosLogger.error('Error loading saved styles:', error);
        }
    }
}

// Setup message listener for background script communication
function setupMessageListener() {
    try {
        // Check if chrome.runtime is available
        if (!chrome || !chrome.runtime || !chrome.runtime.onMessage) {
            if (window.LumosLogger) {
                window.LumosLogger.warn('Chrome runtime not available, message listener not set up');
            }
            return;
        }
        
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        try {
            switch (request.action) {
                case 'confirmRemoveAllHighlights':
                    handleRemoveAllHighlightsConfirmation();
                    break;
                case 'updateHighlightStyles':
                    window.LumosHighlightManager.updateHighlightStyles(request.styles);
                    // Update double click mode based on highlight mode
                    if (request.styles && request.styles.highlightMode) {
                        const isDoubleClickMode = request.styles.highlightMode === 'doubleclick';
                        if (window.LumosEventHandler) {
                            window.LumosEventHandler.setDoubleClickDragMode(isDoubleClickMode);
                            if (window.LumosLogger) {
                                window.LumosLogger.debug('Double click mode updated:', isDoubleClickMode);
                            }
                        }
                    }
                    break;
                case 'getStorageStats':
                    window.LumosStorageManager.getStorageStats().then(stats => sendResponse(stats));
                    return true; // Async response
                case 'updateDebugMode':
                    if (window.LumosLogger) {
                        window.LumosLogger.setDebugMode(request.enabled);
                    }
                    break;
                default:
                    if (window.LumosLogger) {
                        window.LumosLogger.debug('Unknown message action:', request.action);
                    }
            }
        } catch (error) {
            if (window.LumosLogger) {
                window.LumosLogger.error('Error handling message:', error);
            }
        }
    });
    } catch (error) {
        if (window.LumosLogger) {
            window.LumosLogger.error('Error setting up message listener:', error);
        }
    }
}

// Handle confirmation dialog for removing all highlights
function handleRemoveAllHighlightsConfirmation() {
    const highlightElements = document.querySelectorAll('.lumos-highlight');
    const count = highlightElements.length;
    
    if (count === 0) {
        alert('No highlights found on this page.');
        return;
    }
    
    const confirmMessage = `Are you sure you want to remove all ${count} highlight${count > 1 ? 's' : ''} from this page?\n\nThis action cannot be undone.`;
    
    if (confirm(confirmMessage)) {
        window.LumosStorageManager.removeAllHighlightsFromCurrentPage((highlightId) => {
            window.LumosStorageManager.deleteHighlight(highlightId);
        });
        
        // Hide any open toolbar
        window.LumosToolbarManager.hideHighlightToolbar();
    }
}

// Handle complex ranges that span multiple elements
function highlightComplexRange(range, highlightElement) {
    try {
        // Debug: Check what's available in the global objects
        if (window.LumosLogger) {
            window.LumosLogger.info('Debug: Available LumosTextSelectionValidator functions:', 
                window.LumosTextSelectionValidator ? Object.keys(window.LumosTextSelectionValidator) : 'undefined');
            window.LumosLogger.info('Debug: Available LumosDomUtils functions:', 
                window.LumosDomUtils ? Object.keys(window.LumosDomUtils) : 'undefined');
        }
        
        // Get all text nodes within the range
        let textNodes;
        try {
            if (window.LumosTextSelectionValidator && window.LumosTextSelectionValidator.getTextNodesInRange) {
                textNodes = window.LumosTextSelectionValidator.getTextNodesInRange(range);
            } else if (window.LumosTextSelectionValidator && window.LumosTextSelectionValidator.getTextNodesInRangeForValidation) {
                if (window.LumosLogger) {
                    window.LumosLogger.warn('Debug: Using getTextNodesInRangeForValidation as fallback');
                }
                textNodes = window.LumosTextSelectionValidator.getTextNodesInRangeForValidation(range);
            } else if (window.LumosDomUtils && window.LumosDomUtils.getTextNodesInRange) {
                if (window.LumosLogger) {
                    window.LumosLogger.warn('Debug: Using LumosDomUtils.getTextNodesInRange as fallback');
                }
                textNodes = window.LumosDomUtils.getTextNodesInRange(range);
            } else {
                throw new Error('No available getTextNodesInRange function found');
            }
        } catch (functionError) {
            if (window.LumosLogger) {
                window.LumosLogger.error('Debug: Error calling getTextNodesInRange function:', functionError);
            }
            throw functionError;
        }
        
        if (textNodes.length === 0) {
            if (window.LumosLogger) {
                window.LumosLogger.warn('No text nodes found in range');
            }
            return false;
        }
        
        // If only one text node, handle it simply
        if (textNodes.length === 1) {
            const textNode = textNodes[0];
            const nodeRange = document.createRange();
            
            // Calculate the correct offsets within this text node
            const startOffset = textNode === range.startContainer ? range.startOffset : 0;
            const endOffset = textNode === range.endContainer ? range.endOffset : textNode.textContent.length;
            
            nodeRange.setStart(textNode, startOffset);
            nodeRange.setEnd(textNode, endOffset);
            
            if (!nodeRange.collapsed) {
                nodeRange.surroundContents(highlightElement);
                return true;
            }
        }
        
        // For multiple text nodes, create separate highlights for each
        const highlightNodes = [];
        
        for (let i = 0; i < textNodes.length; i++) {
            const textNode = textNodes[i];
            const nodeRange = document.createRange();
            
            // Calculate offsets for this text node
            let startOffset = 0;
            let endOffset = textNode.textContent.length;
            
            if (textNode === range.startContainer) {
                startOffset = range.startOffset;
            }
            if (textNode === range.endContainer) {
                endOffset = range.endOffset;
            }
            
            // Skip if this would create an empty range
            if (startOffset >= endOffset) {
                continue;
            }
            
            nodeRange.setStart(textNode, startOffset);
            nodeRange.setEnd(textNode, endOffset);
            
            // Create a separate highlight element for this text node
            const nodeHighlightElement = document.createElement('span');
            nodeHighlightElement.className = highlightElement.className;
            nodeHighlightElement.setAttribute('data-highlight-id', highlightElement.getAttribute('data-highlight-id'));
            nodeHighlightElement.setAttribute('data-highlight-color', highlightElement.getAttribute('data-highlight-color'));
            nodeHighlightElement.setAttribute('data-highlight-part', i.toString());
            
            // Apply styles
            window.LumosStyleManager.applyStylesToHighlight(nodeHighlightElement);
            
            try {
                nodeRange.surroundContents(nodeHighlightElement);
                highlightNodes.push(nodeHighlightElement);
            } catch (error) {
                if (window.LumosLogger) {
                    window.LumosLogger.warn(`Failed to highlight text node ${i + 1}:`, error);
                }
                continue;
            }
        }
        
        return highlightNodes.length > 0;
        
    } catch (error) {
        if (window.LumosLogger) {
            window.LumosLogger.error('Error in complex range highlighting:', error);
        }
        return false;
    }
}

// Expose key functions to global scope for debugging
window.lumosHighlighter = {
    init,
    
    // Access through global objects
    get saveHighlight() { return window.LumosStorageManager?.saveHighlight; },
    get deleteHighlight() { return window.LumosStorageManager?.deleteHighlight; },
    get restoreHighlights() { return window.LumosStorageManager?.restoreHighlights; },
    get removeAllHighlightsFromCurrentPage() { return window.LumosStorageManager?.removeAllHighlightsFromCurrentPage; },
    get handleTextSelection() { return window.LumosEventHandler?.handleTextSelection; },
    get getCurrentSelection() { return window.LumosToolbarManager?.getCurrentSelection; },
    get showHighlightToolbar() { return window.LumosToolbarManager?.showHighlightToolbar; },
    get hideHighlightToolbar() { return window.LumosToolbarManager?.hideHighlightToolbar; },
    get getContextBefore() { return window.LumosContextExtractor?.getContextBefore; },
    get getContextAfter() { return window.LumosContextExtractor?.getContextAfter; },
    get findTextMatches() { return window.LumosTextMatcher?.findTextMatches; },
    get normalizeText() { return window.LumosTextMatcher?.normalizeText; },
    get getStorageStats() { return window.LumosStorageManager?.getStorageStats; },
    get generateUUID() { return window.LumosDomUtils?.generateUUID; },
    
    // Debug controls (now managed by popup)
    get getDebugMode() { return window.LumosLogger?.getDebugMode; },
    get setDebugMode() { return window.LumosLogger?.setDebugMode; },
    
    testTextMatching: function(targetText) {
        const allTextNodes = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        let totalMatches = 0;
        let node;
        while (node = allTextNodes.nextNode()) {
            totalMatches += window.LumosTextMatcher?.findTextMatches(node.textContent, targetText, node).length || 0;
        }
        return { totalMatches, targetText };
    },
    
    debugHighlightRestoration: function(highlightText, contextBefore = '', contextAfter = '') {
        const mockHighlightData = {
            text: highlightText, context_before: contextBefore, context_after: contextAfter,
            id: 'debug-test', color: 'yellow'
        };
        return window.LumosHighlightManager?.restoreHighlightByTextContent(mockHighlightData);
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export for module compatibility - now using global scope
window.LumosContent = {
    init,
    loadSavedStyles,
    handleRemoveAllHighlightsConfirmation,
    highlightComplexRange
};