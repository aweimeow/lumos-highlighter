// Storage Manager Module
// Handles saving, loading, and managing highlights in storage

// Save a highlight
function saveHighlight(highlightData) {
    try {
        const domain = window.LumosUtils.extractDomain(window.location.href);
        
        // Use shared storage interface
        if (window.LumosStorageInterface) {
            window.LumosStorageInterface.StorageInterface.getDomainHighlights(domain).then(domainData => {
                domainData.highlights = domainData.highlights || [];
                domainData.highlights.push(highlightData);
                domainData.title = document.title;
                return window.LumosStorageInterface.StorageInterface.saveDomainHighlights(domain, domainData);
            }).catch(error => {
                if (window.LumosLogger) { window.LumosLogger.error('Error saving highlight:', error); }
            });
        }
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.error('Error in saveHighlight:', error); }
    }
}

// Delete a highlight
function deleteHighlight(highlightId) {
    try {
        const domain = window.LumosUtils.extractDomain(window.location.href);
        
        if (window.LumosStorageInterface) {
            window.LumosStorageInterface.StorageInterface.getDomainHighlights(domain).then(domainData => {
                if (domainData.highlights) {
                    domainData.highlights = domainData.highlights.filter(h => h.id !== highlightId);
                    return window.LumosStorageInterface.StorageInterface.saveDomainHighlights(domain, domainData);
                }
            }).catch(error => {
                if (window.LumosLogger) { window.LumosLogger.error('Error deleting highlight:', error); }
            });
        }
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.error('Error in deleteHighlight:', error); }
    }
}

// Restore highlights on page load
function restoreHighlights() {
    try {
        const domain = window.LumosUtils.extractDomain(window.location.href);
        
        if (window.LumosStorageInterface) {
            window.LumosStorageInterface.StorageInterface.getDomainHighlights(domain).then(domainData => {
                if (domainData.highlights && domainData.highlights.length > 0) {
                    if (window.LumosLogger) { window.LumosLogger.debug(`Restoring ${domainData.highlights.length} highlights...`); }
                    
                    // Simple restoration - just try to restore each highlight
                    domainData.highlights.forEach(highlightData => {
                        setTimeout(() => {
                            if (window.LumosHighlightManager) {
                                window.LumosHighlightManager.restoreHighlight(highlightData);
                            }
                        }, 100);
                    });
                }
            }).catch(error => {
                if (window.LumosLogger) { window.LumosLogger.error('Error restoring highlights:', error); }
            });
        }
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.error('Error in restoreHighlights:', error); }
    }
}

// Remove all highlights from current page
function removeAllHighlightsFromCurrentPage(callback) {
    try {
        const highlightElements = document.querySelectorAll('.lumos-highlight');
        
        highlightElements.forEach(element => {
            const highlightId = element.getAttribute('data-highlight-id');
            if (highlightId) {
                // Remove from DOM
                const parent = element.parentNode;
                if (parent) {
                    while (element.firstChild) {
                        parent.insertBefore(element.firstChild, element);
                    }
                    parent.removeChild(element);
                    parent.normalize();
                }
                
                // Callback for storage removal
                if (callback) {
                    callback(highlightId);
                }
            }
        });
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.error('Error removing highlights:', error); }
    }
}

// Get storage statistics
function getStorageStats() {
    return new Promise((resolve) => {
        try {
            if (window.LumosStorageInterface) {
                window.LumosStorageInterface.StorageInterface.getMetadata().then(metadata => {
                    resolve({
                        totalHighlights: metadata.total_highlights || 0,
                        lastUpdated: metadata.last_updated || null,
                        colorStats: metadata.color_stats || {}
                    });
                }).catch(error => {
                    if (window.LumosLogger) { window.LumosLogger.error('Error getting storage stats:', error); }
                    resolve({
                        totalHighlights: 0,
                        lastUpdated: null,
                        colorStats: {}
                    });
                });
            } else {
                resolve({
                    totalHighlights: 0,
                    lastUpdated: null,
                    colorStats: {}
                });
            }
        } catch (error) {
            if (window.LumosLogger) { window.LumosLogger.error('Error in getStorageStats:', error); }
            resolve({
                totalHighlights: 0,
                lastUpdated: null,
                colorStats: {}
            });
        }
    });
}

// Assign to global window object
window.LumosStorageManager = {
    saveHighlight,
    deleteHighlight,
    restoreHighlights,
    removeAllHighlightsFromCurrentPage,
    getStorageStats
};