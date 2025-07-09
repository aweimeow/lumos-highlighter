// Storage Manager Module for Lumos Highlighter
// Handles all storage operations including save/load/delete of highlights
// and communication with background script

import { HighlightMessaging } from '../../shared/messaging.js';

// Storage state variables
let pendingHighlights = [];
let domObserver = null;

/**
 * Save highlight to storage (async, non-blocking)
 * @param {Object} highlightData - The highlight data to save
 */
export function saveHighlight(highlightData) {
    setTimeout(async () => {
        try {
            await HighlightMessaging.saveHighlight(getCurrentDomain(), highlightData);
            console.log('Highlight saved successfully:', highlightData.text.substring(0, 30) + '...');
        } catch (error) {
            console.log('Extension context invalidated, cannot save highlight:', error);
        }
    }, 0);
}

/**
 * Delete highlight from storage (async, non-blocking)
 * @param {string} highlightId - The ID of the highlight to delete
 */
export function deleteHighlight(highlightId) {
    setTimeout(async () => {
        try {
            await HighlightMessaging.deleteHighlight(getCurrentDomain(), highlightId);
            console.log('Highlight deleted successfully:', highlightId);
        } catch (error) {
            console.log('Extension context invalidated, cannot delete highlight:', error);
        }
    }, 0);
}

/**
 * Restore highlights on page load
 * @param {Function} restoreHighlightCallback - Callback function to restore individual highlights
 */
export function restoreHighlights(restoreHighlightCallback) {
    const domain = getCurrentDomain();
    
    try {
        HighlightMessaging.getHighlights(domain, window.location.href)
            .then(response => {
                if (response && response.data && response.data.highlights) {
                    console.log('Restoring', response.data.highlights.length, 'highlights for URL:', window.location.href);
                    
                    response.data.highlights.forEach(highlight => {
                        console.log('Restoring highlight:', highlight.text, 'with context:', {
                            before: highlight.context_before ? highlight.context_before.substring(0, 50) + '...' : 'none',
                            after: highlight.context_after ? highlight.context_after.substring(0, 50) + '...' : 'none'
                        });
                        restoreHighlightCallback(highlight);
                    });
                    
                    // Set up DOM observer for dynamic content
                    setupDOMObserver(restoreHighlightCallback);
                    
                    // Retry pending highlights multiple times for dynamic content
                    scheduleRetryAttempts(restoreHighlightCallback);
                }
            })
            .catch(error => {
                console.log('Extension context invalidated, cannot restore highlights:', error);
            });
    } catch (error) {
        console.log('Extension context invalidated, cannot restore highlights:', error);
    }
}

/**
 * Add a highlight to the pending restoration queue
 * @param {Object} highlightData - The highlight data to add to pending queue
 */
export function addToPendingHighlights(highlightData) {
    if (!pendingHighlights.find(h => h.id === highlightData.id)) {
        pendingHighlights.push(highlightData);
        console.log('➕ Added to pending highlights queue, total pending:', pendingHighlights.length);
    }
}

/**
 * Get current pending highlights count
 * @returns {number} Number of pending highlights
 */
export function getPendingHighlightsCount() {
    return pendingHighlights.length;
}

/**
 * Clear all pending highlights
 */
export function clearPendingHighlights() {
    pendingHighlights = [];
    console.log('Cleared pending highlights queue');
}

/**
 * Schedule retry attempts for dynamic content
 * @param {Function} restoreHighlightCallback - Callback function to restore individual highlights
 */
function scheduleRetryAttempts(restoreHighlightCallback) {
    // Multiple retry intervals to handle different types of dynamic content
    const retryIntervals = [500, 1000, 2000, 3000, 5000, 8000, 12000];
    
    retryIntervals.forEach((interval, index) => {
        setTimeout(() => {
            if (pendingHighlights.length > 0) {
                console.log(`Retry attempt ${index + 1}/${retryIntervals.length} after ${interval}ms`);
                retryPendingHighlights(restoreHighlightCallback);
                
                // Additional check for common dynamic content indicators
                if (index === retryIntervals.length - 1 && pendingHighlights.length > 0) {
                    console.log('Final retry attempt - checking for lazy-loaded content');
                    waitForLazyContent().then(() => {
                        setTimeout(() => retryPendingHighlights(restoreHighlightCallback), 1000);
                    });
                }
            }
        }, interval);
    });
}

/**
 * Wait for lazy-loaded content
 * @returns {Promise} Promise that resolves when lazy content is potentially loaded
 */
async function waitForLazyContent() {
    return new Promise((resolve) => {
        const commonSelectors = ['[data-lazy-loaded]', '[data-testid]', '.loaded', '[aria-live]'];
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        for (const selector of commonSelectors) {
                            if (document.querySelector(selector)) {
                                console.log('Detected potential dynamic content:', selector);
                                break;
                            }
                        }
                        resolve();
                    }, 500);
                    observer.disconnect();
                }
            });
        });
        
        const mainContent = document.querySelector('main, #main, .main, [role="main"]') || document.body;
        observer.observe(mainContent);
        setTimeout(() => { observer.disconnect(); resolve(); }, 3000);
    });
}

/**
 * Set up DOM observer for dynamic content
 * @param {Function} restoreHighlightCallback - Callback function to restore individual highlights
 */
function setupDOMObserver(restoreHighlightCallback) {
    if (domObserver) return;
    
    domObserver = new MutationObserver((mutations) => {
        let shouldRetry = false;
        let significantChange = false;
        
        mutations.forEach(mutation => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.TEXT_NODE || 
                        (node.nodeType === Node.ELEMENT_NODE && node.textContent.trim())) {
                        shouldRetry = true;
                        if (node.nodeType === Node.ELEMENT_NODE && node.textContent.length > 100) {
                            significantChange = true;
                        }
                    }
                });
            }
        });
        
        if (shouldRetry && pendingHighlights.length > 0) {
            clearTimeout(window.retryTimeout);
            window.retryTimeout = setTimeout(() => {
                console.log('DOM change detected, retrying highlight restoration');
                retryPendingHighlights(restoreHighlightCallback);
            }, significantChange ? 100 : 200);
        }
    });
    
    domObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
}

/**
 * Retry restoring pending highlights
 * @param {Function} restoreHighlightCallback - Callback function to restore individual highlights
 */
function retryPendingHighlights(restoreHighlightCallback) {
    if (pendingHighlights.length === 0) return;
    
    console.log('Retrying', pendingHighlights.length, 'pending highlights');
    const stillPending = [];
    
    pendingHighlights.forEach(highlightData => {
        highlightData.retryCount = (highlightData.retryCount || 0) + 1;
        
        if (highlightData.retryCount > 10) {
            console.warn('Giving up on highlight after 10 retries:', highlightData.text.substring(0, 50));
            return;
        }
        
        if (!attemptRestoreHighlight(highlightData, restoreHighlightCallback)) {
            stillPending.push(highlightData);
        }
    });
    
    pendingHighlights = stillPending;
    console.log('Still pending:', pendingHighlights.length, 'highlights');
}

/**
 * Attempt to restore a highlight without adding to pending list
 * @param {Object} highlightData - The highlight data to restore
 * @param {Function} restoreHighlightCallback - Callback function to restore individual highlights
 * @returns {boolean} True if successfully restored, false otherwise
 */
function attemptRestoreHighlight(highlightData, restoreHighlightCallback) {
    if (document.querySelector(`[data-highlight-id="${highlightData.id}"]`)) return true;
    
    const success = restoreHighlightCallback(highlightData, false);
    if (success) {
        console.log('Successfully restored pending highlight:', highlightData.text.substring(0, 30) + '...');
    }
    return success;
}

/**
 * Get current domain from URL
 * @returns {string} Current domain
 */
function getCurrentDomain() {
    try {
        return new URL(window.location.href).hostname;
    } catch (error) {
        console.error('Error getting current domain:', error);
        return 'unknown';
    }
}

/**
 * Remove all highlights from current page
 * @param {Function} deleteHighlightCallback - Callback to handle highlight deletion
 */
export function removeAllHighlightsFromCurrentPage(deleteHighlightCallback) {
    const highlightElements = document.querySelectorAll('.lumos-highlight');
    
    if (highlightElements.length === 0) {
        console.log('No highlights found on this page');
        return;
    }
    
    // Remove from DOM and storage
    highlightElements.forEach(element => {
        const highlightId = element.getAttribute('data-highlight-id');
        if (highlightId) deleteHighlightCallback(highlightId);
        
        const parent = element.parentNode;
        if (parent) {
            parent.replaceChild(document.createTextNode(element.textContent), element);
            parent.normalize();
        }
    });
    
    // Also remove from storage via messaging
    try {
        HighlightMessaging.removeAllHighlightsFromPage(getCurrentDomain(), window.location.href)
            .then(() => console.log('All highlights removed from page'))
            .catch(error => console.error('Error removing highlights from storage:', error));
    } catch (error) {
        console.log('Extension context invalidated, cannot remove highlights from storage:', error);
    }
    
    clearPendingHighlights();
}

/**
 * Disconnect DOM observer
 */
export function disconnectDOMObserver() {
    if (domObserver) {
        domObserver.disconnect();
        domObserver = null;
        console.log('DOM observer disconnected');
    }
}

/**
 * Get storage statistics
 * @returns {Object} Storage statistics
 */
export function getStorageStats() {
    return {
        pendingHighlights: pendingHighlights.length,
        domObserverActive: domObserver !== null
    };
}