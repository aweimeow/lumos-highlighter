// Background script for Lumos Highlighter
// Handles storage operations, PDF export, and cross-tab synchronization

console.log('Lumos Highlighter background script loaded');

// Create context menu when extension installs
chrome.runtime.onInstalled.addListener(() => {
    // Create parent menu
    chrome.contextMenus.create({
        id: 'lumos-highlighter',
        title: 'Lumos Highlighter',
        contexts: ['page']
    });

    // Create export option
    chrome.contextMenus.create({
        id: 'export-page-summary',
        parentId: 'lumos-highlighter',
        title: 'Export highlights to PDF',
        contexts: ['page']
    });

    chrome.contextMenus.create({
        id: 'manage-highlights',
        parentId: 'lumos-highlighter',
        title: 'Manage highlights',
        contexts: ['page']
    });

    chrome.contextMenus.create({
        id: 'remove-all-highlights',
        parentId: 'lumos-highlighter',
        title: 'Remove all highlights from page',
        contexts: ['page']
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    switch (info.menuItemId) {
        case 'export-page-summary':
            exportPageSummary(tab);
            break;
        case 'manage-highlights':
            openManagementInterface();
            break;
        case 'remove-all-highlights':
            removeAllHighlightsFromPage(tab);
            break;
    }
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'saveHighlight':
            saveHighlight(request.domain, request.highlight);
            sendResponse({success: true});
            break;
            
        case 'deleteHighlight':
            deleteHighlight(request.domain, request.highlightId).then(() => {
                sendResponse({success: true});
            }).catch(error => {
                console.error('Error in deleteHighlight:', error);
                sendResponse({success: false, error: error.message});
            });
            return true; // Keep message channel open for async response
            
        case 'getHighlights':
            getHighlights(request.domain, request.url).then(highlights => {
                sendResponse({highlights: highlights});
            });
            return true; // Keep message channel open for async response
            
        case 'updateHighlightColor':
            updateHighlightColor(request.domain, request.highlightId, request.newColor);
            sendResponse({success: true});
            break;
            
        case 'getExportSelectionData':
            getExportSelectionData().then(data => {
                sendResponse({data: data});
            });
            return true; // Keep message channel open for async response
            
        case 'generateFilteredPDF':
            generatePDF(request.data, request.type);
            sendResponse({success: true});
            break;
            
        case 'removeAllHighlightsFromPage':
            removeAllHighlightsFromPageStorage(request.domain, request.url).then(() => {
                sendResponse({success: true});
            }).catch(error => {
                console.error('Error in removeAllHighlightsFromPage:', error);
                sendResponse({success: false, error: error.message});
            });
            return true; // Keep message channel open for async response
            
        // Note: openHighlightInPage removed - now using direct <a> href links
            
        default:
            sendResponse({error: 'Unknown action'});
    }
});

// Save highlight to storage
async function saveHighlight(domain, highlightData) {
    try {
        // Get existing data
        const result = await chrome.storage.local.get(['lumosHighlights']);
        const data = result.lumosHighlights || {
            websites: {},
            metadata: {
                total_highlights: 0,
                last_updated: new Date().toISOString(),
                date_range: {
                    earliest: new Date().toISOString(),
                    latest: new Date().toISOString()
                },
                color_stats: {
                    red: 0,
                    orange: 0,
                    yellow: 0,
                    green: 0,
                    blue: 0
                }
            }
        };
        
        // Initialize website if it doesn't exist
        if (!data.websites[domain]) {
            data.websites[domain] = {
                title: domain,
                favicon: `https://${domain}/favicon.ico`,
                highlights: []
            };
        }
        
        // Add highlight to website
        data.websites[domain].highlights.push(highlightData);
        
        // Update metadata
        data.metadata.total_highlights++;
        data.metadata.last_updated = new Date().toISOString();
        data.metadata.color_stats[highlightData.color]++;
        
        // Update date range
        const highlightDate = new Date(highlightData.timestamp);
        const earliestDate = new Date(data.metadata.date_range.earliest);
        const latestDate = new Date(data.metadata.date_range.latest);
        
        if (highlightDate < earliestDate) {
            data.metadata.date_range.earliest = highlightData.timestamp;
        }
        if (highlightDate > latestDate) {
            data.metadata.date_range.latest = highlightData.timestamp;
        }
        
        // Save to storage
        await chrome.storage.local.set({ lumosHighlights: data });
        
        console.log('Highlight saved:', highlightData.id);
        
    } catch (error) {
        console.error('Error saving highlight:', error);
    }
}

// Delete highlight from storage
async function deleteHighlight(domain, highlightId) {
    try {
        // Get existing data
        const result = await chrome.storage.local.get(['lumosHighlights']);
        const data = result.lumosHighlights;
        
        if (!data || !data.websites[domain]) {
            console.warn('No highlights found for domain:', domain);
            return;
        }
        
        // Find and remove highlight
        const highlights = data.websites[domain].highlights;
        const highlightIndex = highlights.findIndex(h => h.id === highlightId);
        
        if (highlightIndex === -1) {
            console.warn('Highlight not found:', highlightId);
            return;
        }
        
        const removedHighlight = highlights[highlightIndex];
        highlights.splice(highlightIndex, 1);
        
        // Update metadata
        data.metadata.total_highlights--;
        data.metadata.last_updated = new Date().toISOString();
        data.metadata.color_stats[removedHighlight.color]--;
        
        // Remove website entry if no highlights left
        if (highlights.length === 0) {
            delete data.websites[domain];
        }
        
        // Save to storage
        await chrome.storage.local.set({ lumosHighlights: data });
        
        console.log('Highlight deleted:', highlightId);
        
    } catch (error) {
        console.error('Error deleting highlight:', error);
    }
}

// Update highlight color
async function updateHighlightColor(domain, highlightId, newColor) {
    try {
        // Get existing data
        const result = await chrome.storage.local.get(['lumosHighlights']);
        let data = result.lumosHighlights;
        
        if (!data || !data.websites[domain]) {
            console.error('Domain not found:', domain);
            return;
        }
        
        // Find and update the highlight
        const highlights = data.websites[domain].highlights;
        const highlightIndex = highlights.findIndex(h => h.id === highlightId);
        
        if (highlightIndex === -1) {
            console.error('Highlight not found:', highlightId);
            return;
        }
        
        const oldColor = highlights[highlightIndex].color;
        highlights[highlightIndex].color = newColor;
        
        // Update metadata color stats
        if (data.metadata && data.metadata.color_stats) {
            // Decrease old color count
            if (data.metadata.color_stats[oldColor] > 0) {
                data.metadata.color_stats[oldColor]--;
            }
            // Increase new color count
            data.metadata.color_stats[newColor] = (data.metadata.color_stats[newColor] || 0) + 1;
        }
        
        // Save updated data
        await chrome.storage.local.set({lumosHighlights: data});
        
        console.log('Highlight color updated:', highlightId, 'from', oldColor, 'to', newColor);
        
    } catch (error) {
        console.error('Error updating highlight color:', error);
    }
}

// Get highlights for a domain and URL
async function getHighlights(domain, url) {
    try {
        // Get existing data
        const result = await chrome.storage.local.get(['lumosHighlights']);
        const data = result.lumosHighlights;
        
        if (!data || !data.websites[domain]) {
            return [];
        }
        
        // Filter highlights by URL (for page-specific highlights)
        const highlights = data.websites[domain].highlights.filter(highlight => 
            highlight.url === url
        );
        
        return highlights;
        
    } catch (error) {
        console.error('Error getting highlights:', error);
        return [];
    }
}

// Get all highlights for a domain
async function getAllHighlightsForDomain(domain) {
    try {
        const result = await chrome.storage.local.get(['lumosHighlights']);
        const data = result.lumosHighlights;
        
        if (!data || !data.websites[domain]) {
            return [];
        }
        
        return data.websites[domain].highlights;
        
    } catch (error) {
        console.error('Error getting domain highlights:', error);
        return [];
    }
}

// Get all websites with highlights
async function getAllWebsites() {
    try {
        const result = await chrome.storage.local.get(['lumosHighlights']);
        const data = result.lumosHighlights;
        
        if (!data || !data.websites) {
            return {};
        }
        
        return data.websites;
        
    } catch (error) {
        console.error('Error getting all websites:', error);
        return {};
    }
}

// Get storage metadata
async function getMetadata() {
    try {
        const result = await chrome.storage.local.get(['lumosHighlights']);
        const data = result.lumosHighlights;
        
        if (!data || !data.metadata) {
            return {
                total_highlights: 0,
                last_updated: new Date().toISOString(),
                date_range: {
                    earliest: new Date().toISOString(),
                    latest: new Date().toISOString()
                },
                color_stats: {
                    red: 0,
                    orange: 0,
                    yellow: 0,
                    green: 0,
                    blue: 0
                }
            };
        }
        
        return data.metadata;
        
    } catch (error) {
        console.error('Error getting metadata:', error);
        return null;
    }
}

// Export page summary to PDF
async function exportPageSummary(tab) {
    try {
        const domain = new URL(tab.url).hostname;
        const highlights = await getHighlights(domain, tab.url);
        
        if (highlights.length === 0) {
            console.log('No highlights found for this page');
            return;
        }
        
        const summaryData = {
            title: tab.title,
            url: tab.url,
            domain: domain,
            highlights: highlights,
            exportDate: new Date().toISOString()
        };
        
        await generatePDF(summaryData, 'page');
        
    } catch (error) {
        console.error('Error exporting page summary:', error);
    }
}


// Get data for export selection interface
async function getExportSelectionData() {
    try {
        const result = await chrome.storage.local.get(['lumosHighlights']);
        const data = result.lumosHighlights;
        
        if (!data || !data.websites) {
            return {
                websites: {},
                metadata: {
                    total_highlights: 0,
                    color_stats: { red: 0, orange: 0, yellow: 0, green: 0, blue: 0 }
                }
            };
        }
        
        return data;
        
    } catch (error) {
        console.error('Error getting export selection data:', error);
        return {
            websites: {},
            metadata: {
                total_highlights: 0,
                color_stats: { red: 0, orange: 0, yellow: 0, green: 0, blue: 0 }
            }
        };
    }
}

// Generate PDF from highlight data
async function generatePDF(data, type) {
    try {
        // Create a new tab with the PDF generator and make it active
        const pdfTab = await chrome.tabs.create({
            url: chrome.runtime.getURL('options/pdf-export.html'),
            active: true
        });
        
        // Wait for the tab to load, then send the data
        setTimeout(() => {
            chrome.tabs.sendMessage(pdfTab.id, {
                action: 'generatePDF',
                data: data,
                type: type
            });
        }, 1000);
        
    } catch (error) {
        console.error('Error generating PDF:', error);
    }
}

// Remove all highlights from current page
async function removeAllHighlightsFromPage(tab) {
    try {
        // Send message to content script to show confirmation and handle removal
        chrome.tabs.sendMessage(tab.id, {
            action: 'confirmRemoveAllHighlights'
        });
        
    } catch (error) {
        console.error('Error removing all highlights from page:', error);
    }
}

// Open management interface
async function openManagementInterface() {
    try {
        const result = await chrome.storage.local.get(['lumosHighlights']);
        const data = result.lumosHighlights;
        
        // Create management interface tab and make it active
        const managementTab = await chrome.tabs.create({
            url: chrome.runtime.getURL('options/management.html'),
            active: true
        });
        
        // Wait for the tab to load, then send the data
        setTimeout(() => {
            chrome.tabs.sendMessage(managementTab.id, {
                action: 'initManagement',
                data: data || { websites: {}, metadata: { total_highlights: 0 } }
            });
        }, 1000);
        
    } catch (error) {
        console.error('Error opening management interface:', error);
    }
}

// Remove all highlights from page storage
async function removeAllHighlightsFromPageStorage(domain, url) {
    try {
        // Get existing data
        const result = await chrome.storage.local.get(['lumosHighlights']);
        let data = result.lumosHighlights;
        
        if (!data || !data.websites[domain]) {
            console.log('No highlights found for domain:', domain);
            return;
        }
        
        // Filter out highlights from this specific page
        const originalHighlights = data.websites[domain].highlights;
        const remainingHighlights = originalHighlights.filter(highlight => highlight.url !== url);
        const removedCount = originalHighlights.length - remainingHighlights.length;
        
        // Update the highlights array
        data.websites[domain].highlights = remainingHighlights;
        
        // If no highlights remain for this domain, remove the entire domain entry
        if (remainingHighlights.length === 0) {
            delete data.websites[domain];
        }
        
        // Update metadata
        if (data.metadata) {
            data.metadata.total_highlights -= removedCount;
            
            // Recalculate color stats
            const allHighlights = Object.values(data.websites).flatMap(site => site.highlights);
            data.metadata.color_stats = { red: 0, orange: 0, yellow: 0, green: 0, blue: 0 };
            
            allHighlights.forEach(highlight => {
                if (data.metadata.color_stats[highlight.color] !== undefined) {
                    data.metadata.color_stats[highlight.color]++;
                }
            });
            
            // Update date range
            if (allHighlights.length > 0) {
                const dates = allHighlights.map(h => h.timestamp).filter(Boolean).sort();
                data.metadata.date_range = {
                    earliest: dates[0],
                    latest: dates[dates.length - 1]
                };
            } else {
                data.metadata.date_range = { earliest: null, latest: null };
            }
        }
        
        // Save updated data
        await chrome.storage.local.set({ lumosHighlights: data });
        
        console.log('Removed', removedCount, 'highlights from page:', url);
        
    } catch (error) {
        console.error('Error removing highlights from page storage:', error);
    }
}

// Note: openHighlightInPage function removed - now using direct <a> href links