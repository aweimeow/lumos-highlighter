// Dynamic Content Handler Module
// Handles dynamic content loading and DOM changes

let pendingHighlights = [];
let domObserver = null;

// Add highlight to pending list
function addToPendingHighlights(highlightData) {
    try {
        pendingHighlights.push(highlightData);
        if (window.LumosLogger) { window.LumosLogger.debug('Added highlight to pending list:', highlightData.text.substring(0, 30) + '...'); }
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.error('Error adding to pending highlights:', error); }
    }
}

// Process pending highlights
function processPendingHighlights() {
    if (pendingHighlights.length === 0) return;
    
    try {
        if (window.LumosLogger) { window.LumosLogger.debug(`Processing ${pendingHighlights.length} pending highlights...`); }
        
        const remaining = [];
        
        for (const highlightData of pendingHighlights) {
            if (window.LumosHighlightManager) {
                const success = window.LumosHighlightManager.restoreHighlight(highlightData, false);
                if (!success) {
                    remaining.push(highlightData);
                }
            } else {
                remaining.push(highlightData);
            }
        }
        
        pendingHighlights = remaining;
        
        if (pendingHighlights.length > 0) {
            if (window.LumosLogger) { window.LumosLogger.debug(`${pendingHighlights.length} highlights still pending`); }
        }
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.error('Error processing pending highlights:', error); }
    }
}

// Start DOM observer
function startDOMObserver() {
    if (domObserver) return;
    
    try {
        domObserver = new MutationObserver((mutations) => {
            let hasSignificantChanges = false;
            
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Check if significant content was added
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const textContent = node.textContent || '';
                            if (textContent.length > 100) {
                                hasSignificantChanges = true;
                                break;
                            }
                        }
                    }
                }
            }
            
            if (hasSignificantChanges) {
                if (window.LumosLogger) { window.LumosLogger.debug('Significant DOM changes detected, processing pending highlights...'); }
                setTimeout(processPendingHighlights, 1000);
            }
        });
        
        // Temporarily disable DOM observer to test toolbar issue
        // domObserver.observe(document.body, {
        //     childList: true,
        //     subtree: true
        // });
        
        if (window.LumosLogger) { window.LumosLogger.debug('DOM observer started'); }
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.error('Error starting DOM observer:', error); }
    }
}

// Stop DOM observer
function stopDOMObserver() {
    if (domObserver) {
        domObserver.disconnect();
        domObserver = null;
        if (window.LumosLogger) { window.LumosLogger.debug('DOM observer stopped'); }
    }
}

// Disconnect DOM observer
function disconnectDOMObserver() {
    stopDOMObserver();
}

// Handle content changes
function handleContentChanges() {
    try {
        // Simple approach - just process pending highlights
        processPendingHighlights();
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.error('Error handling content changes:', error); }
    }
}

// Initialize dynamic content handling
function initializeDynamicContent() {
    try {
        startDOMObserver();
        
        // Process pending highlights periodically
        setInterval(processPendingHighlights, 5000);
        
        if (window.LumosLogger) { window.LumosLogger.debug('Dynamic content handler initialized'); }
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.error('Error initializing dynamic content handler:', error); }
    }
}

// Retry highlight restoration
function retryHighlightRestoration(highlightData, maxRetries = 3) {
    let retries = 0;
    
    const tryRestore = () => {
        if (window.LumosHighlightManager) {
            const success = window.LumosHighlightManager.restoreHighlight(highlightData, false);
            if (success) {
                if (window.LumosLogger) { window.LumosLogger.debug('Highlight restored after retry:', highlightData.text.substring(0, 30) + '...'); }
                return;
            }
        }
        
        retries++;
        if (retries < maxRetries) {
            setTimeout(tryRestore, 1000 * retries);
        } else {
            if (window.LumosLogger) { window.LumosLogger.debug('Failed to restore highlight after retries:', highlightData.text.substring(0, 30) + '...'); }
            addToPendingHighlights(highlightData);
        }
    };
    
    tryRestore();
}

// Get pending highlights count
function getPendingHighlightsCount() {
    return pendingHighlights.length;
}

// Clear pending highlights
function clearPendingHighlights() {
    pendingHighlights = [];
}

// Initialize when module loads
setTimeout(initializeDynamicContent, 1000);

// Assign to global window object
window.LumosDynamicContentHandler = {
    addToPendingHighlights,
    processPendingHighlights,
    startDOMObserver,
    stopDOMObserver,
    disconnectDOMObserver,
    handleContentChanges,
    initializeDynamicContent,
    retryHighlightRestoration,
    getPendingHighlightsCount,
    clearPendingHighlights
};