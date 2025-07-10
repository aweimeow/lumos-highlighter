// Dynamic Content Handler Module
// Handles dynamic content loading and DOM changes

let pendingHighlights = [];
let domObserver = null;

// Add highlight to pending list
function addToPendingHighlights(highlightData) {
    try {
        pendingHighlights.push(highlightData);
        console.log('Added highlight to pending list:', highlightData.text.substring(0, 30) + '...');
    } catch (error) {
        console.error('Error adding to pending highlights:', error);
    }
}

// Process pending highlights
function processPendingHighlights() {
    if (pendingHighlights.length === 0) return;
    
    try {
        console.log(`Processing ${pendingHighlights.length} pending highlights...`);
        
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
            console.log(`${pendingHighlights.length} highlights still pending`);
        }
    } catch (error) {
        console.error('Error processing pending highlights:', error);
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
                console.log('Significant DOM changes detected, processing pending highlights...');
                setTimeout(processPendingHighlights, 1000);
            }
        });
        
        domObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        console.log('DOM observer started');
    } catch (error) {
        console.error('Error starting DOM observer:', error);
    }
}

// Stop DOM observer
function stopDOMObserver() {
    if (domObserver) {
        domObserver.disconnect();
        domObserver = null;
        console.log('DOM observer stopped');
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
        console.error('Error handling content changes:', error);
    }
}

// Initialize dynamic content handling
function initializeDynamicContent() {
    try {
        startDOMObserver();
        
        // Process pending highlights periodically
        setInterval(processPendingHighlights, 5000);
        
        console.log('Dynamic content handler initialized');
    } catch (error) {
        console.error('Error initializing dynamic content handler:', error);
    }
}

// Retry highlight restoration
function retryHighlightRestoration(highlightData, maxRetries = 3) {
    let retries = 0;
    
    const tryRestore = () => {
        if (window.LumosHighlightManager) {
            const success = window.LumosHighlightManager.restoreHighlight(highlightData, false);
            if (success) {
                console.log('Highlight restored after retry:', highlightData.text.substring(0, 30) + '...');
                return;
            }
        }
        
        retries++;
        if (retries < maxRetries) {
            setTimeout(tryRestore, 1000 * retries);
        } else {
            console.log('Failed to restore highlight after retries:', highlightData.text.substring(0, 30) + '...');
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