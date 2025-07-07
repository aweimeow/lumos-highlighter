// Management interface script for Lumos Highlighter

console.log('Management interface script loaded');

let allData = null;
let filteredData = null;
let expandedDomains = new Set();
let expandedSubpages = new Set();

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'initManagement') {
        console.log('Initializing management interface with data:', message.data);
        allData = message.data;
        initializeInterface();
    }
});

// Initialize the interface
function initializeInterface() {
    setupEventListeners();
    applyFilters();
    hideLoadingIndicator();
}

// Set up event listeners
function setupEventListeners() {
    const timeRange = document.getElementById('timeRange');
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');
    const colorFilter = document.getElementById('colorFilter');

    timeRange.addEventListener('change', handleTimeRangeChange);
    dateFrom.addEventListener('change', applyFilters);
    dateTo.addEventListener('change', applyFilters);
    colorFilter.addEventListener('change', applyFilters);
    
    // Set up event delegation for dynamic content
    const domainList = document.getElementById('domainList');
    domainList.addEventListener('click', handleDomainListClick);
}

// Handle clicks in domain list using event delegation
function handleDomainListClick(event) {
    const target = event.target;
    
    // Handle domain header clicks
    if (target.closest('.domain-header')) {
        const domainHeader = target.closest('.domain-header');
        const domain = domainHeader.getAttribute('data-domain');
        if (domain) {
            toggleDomain(domain);
        }
        return;
    }
    
    // Handle subpage view button clicks
    if (target.classList.contains('btn-view')) {
        const url = target.getAttribute('data-url');
        if (url) {
            toggleSubpage(url);
        }
        return;
    }
    
    // Handle subpage delete button clicks
    if (target.classList.contains('btn-delete') && target.closest('.subpage-item')) {
        const domain = target.getAttribute('data-domain');
        const url = target.getAttribute('data-url');
        if (domain && url) {
            deleteSubpage(domain, url);
        }
        return;
    }
    
    // Handle highlight delete button clicks
    if (target.classList.contains('btn-delete') && target.closest('.highlight-item')) {
        const highlightId = target.getAttribute('data-highlight-id');
        if (highlightId) {
            deleteHighlight(highlightId, target);
        }
        return;
    }
}

// Handle time range selection change
function handleTimeRangeChange() {
    const timeRange = document.getElementById('timeRange');
    const customDateFrom = document.getElementById('customDateFrom');
    const customDateTo = document.getElementById('customDateTo');
    
    if (timeRange.value === 'custom') {
        customDateFrom.style.display = 'block';
        customDateTo.style.display = 'block';
    } else {
        customDateFrom.style.display = 'none';
        customDateTo.style.display = 'none';
    }
    
    applyFilters();
}

// Apply all filters
function applyFilters() {
    if (!allData || !allData.websites) {
        showNoDataIndicator();
        return;
    }

    const timeRange = document.getElementById('timeRange').value;
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    const colorFilter = document.getElementById('colorFilter').value;

    // Filter data based on criteria
    filteredData = filterDataByTimeAndColor(allData, timeRange, dateFrom, dateTo, colorFilter);
    
    // Sort domains by last updated time
    const sortedDomains = sortDomainsByTime(filteredData.websites);
    
    // Update the interface
    updateStatsOverview(filteredData);
    updateDomainList(sortedDomains);
}

// Filter data by time range and color
function filterDataByTimeAndColor(data, timeRange, dateFrom, dateTo, colorFilter) {
    const now = new Date();
    let cutoffDate = null;

    // Determine cutoff date
    if (timeRange !== 'all' && timeRange !== 'custom') {
        const days = parseInt(timeRange);
        cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    } else if (timeRange === 'custom' && dateFrom) {
        cutoffDate = new Date(dateFrom);
    }

    let endDate = null;
    if (timeRange === 'custom' && dateTo) {
        endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999); // End of day
    }

    const filteredWebsites = {};
    let totalHighlights = 0;
    const colorStats = { red: 0, orange: 0, yellow: 0, green: 0, blue: 0 };

    Object.entries(data.websites).forEach(([domain, site]) => {
        const filteredHighlights = site.highlights.filter(highlight => {
            const highlightDate = new Date(highlight.timestamp);
            
            // Time filter
            if (cutoffDate && highlightDate < cutoffDate) return false;
            if (endDate && highlightDate > endDate) return false;
            
            // Color filter
            if (colorFilter !== 'all' && highlight.color !== colorFilter) return false;
            
            return true;
        });

        if (filteredHighlights.length > 0) {
            filteredWebsites[domain] = {
                ...site,
                highlights: filteredHighlights
            };
            
            totalHighlights += filteredHighlights.length;
            filteredHighlights.forEach(h => {
                if (colorStats[h.color] !== undefined) {
                    colorStats[h.color]++;
                }
            });
        }
    });

    return {
        websites: filteredWebsites,
        metadata: {
            total_highlights: totalHighlights,
            color_stats: colorStats
        }
    };
}

// Sort domains by last highlight time (most recent first)
function sortDomainsByTime(websites) {
    return Object.entries(websites).map(([domain, site]) => {
        // Get the most recent highlight timestamp for this domain
        const lastHighlightTime = Math.max(...site.highlights.map(h => new Date(h.timestamp).getTime()));
        
        // Group highlights by URL (subpages)
        const subpages = groupHighlightsByURL(site.highlights);
        
        return {
            domain,
            site,
            lastHighlightTime,
            subpages
        };
    }).sort((a, b) => b.lastHighlightTime - a.lastHighlightTime);
}

// Group highlights by URL to create subpages
function groupHighlightsByURL(highlights) {
    const subpages = {};
    
    highlights.forEach(highlight => {
        const url = highlight.url;
        if (!subpages[url]) {
            subpages[url] = {
                url,
                title: highlight.page_title || getPageTitleFromURL(url),
                highlights: [],
                lastHighlightTime: 0,
                colorStats: { red: 0, orange: 0, yellow: 0, green: 0, blue: 0 }
            };
        }
        
        subpages[url].highlights.push(highlight);
        const highlightTime = new Date(highlight.timestamp).getTime();
        if (highlightTime > subpages[url].lastHighlightTime) {
            subpages[url].lastHighlightTime = highlightTime;
        }
        
        if (subpages[url].colorStats[highlight.color] !== undefined) {
            subpages[url].colorStats[highlight.color]++;
        }
    });
    
    // Sort subpages by last highlight time (most recent first)
    return Object.values(subpages).sort((a, b) => b.lastHighlightTime - a.lastHighlightTime);
}

// Extract page title from URL if not available
function getPageTitleFromURL(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.pathname === '/' ? urlObj.hostname : urlObj.pathname.split('/').pop() || urlObj.hostname;
    } catch (e) {
        return url;
    }
}

// Update stats overview
function updateStatsOverview(data) {
    const statsOverview = document.getElementById('statsOverview');
    const totalHighlights = data.metadata.total_highlights;
    const colorStats = data.metadata.color_stats;
    const totalDomains = Object.keys(data.websites).length;
    
    // Calculate total pages
    const totalPages = Object.values(data.websites).reduce((total, site) => {
        const uniqueUrls = new Set(site.highlights.map(h => h.url));
        return total + uniqueUrls.size;
    }, 0);

    // Generate website tooltip (top 10 by highlight count)
    const websiteTooltip = generateWebsiteTooltip(data.websites);
    
    // Generate pages tooltip (top 10 by highlight count)
    const pagesTooltip = generatePagesTooltip(data.websites);
    
    // Generate color chart tooltip
    const colorTooltip = generateColorTooltip(colorStats);

    statsOverview.innerHTML = `
        <div class="stat-item">
            <div class="stat-icon">🌐</div>
            <div class="stat-number">${totalDomains}</div>
            <div class="stat-label">Websites</div>
            <div class="tooltip">
                <div class="tooltip-content">${websiteTooltip}</div>
            </div>
        </div>
        <div class="stat-item">
            <div class="stat-icon">📄</div>
            <div class="stat-number">${totalPages}</div>
            <div class="stat-label">Pages</div>
            <div class="tooltip">
                <div class="tooltip-content">${pagesTooltip}</div>
            </div>
        </div>
        <div class="stat-item">
            <div class="stat-icon">🎨</div>
            <div class="stat-number">${totalHighlights}</div>
            <div class="stat-label">Highlights</div>
            <div class="tooltip">
                <div class="tooltip-content">${colorTooltip}</div>
            </div>
        </div>
    `;
}

// Generate website tooltip with top 10 domains
function generateWebsiteTooltip(websites) {
    const domainStats = Object.entries(websites).map(([domain, site]) => ({
        domain,
        count: site.highlights.length
    })).sort((a, b) => b.count - a.count).slice(0, 10);

    if (domainStats.length === 0) {
        return '<div>No websites with highlights</div>';
    }

    const listItems = domainStats.map(({domain, count}) => 
        `<li>${domain}: <strong>${count}</strong> highlights</li>`
    ).join('');

    return `
        <div><strong>Top Websites (by highlights)</strong></div>
        <ul class="tooltip-list">
            ${listItems}
        </ul>
    `;
}

// Generate pages tooltip with top 10 pages
function generatePagesTooltip(websites) {
    const pageStats = [];
    
    Object.entries(websites).forEach(([domain, site]) => {
        const pages = {};
        site.highlights.forEach(highlight => {
            if (!pages[highlight.url]) {
                pages[highlight.url] = {
                    url: highlight.url,
                    title: highlight.page_title || getPageTitleFromURL(highlight.url),
                    count: 0
                };
            }
            pages[highlight.url].count++;
        });
        
        Object.values(pages).forEach(page => pageStats.push(page));
    });

    pageStats.sort((a, b) => b.count - a.count);
    const top10 = pageStats.slice(0, 10);

    if (top10.length === 0) {
        return '<div>No pages with highlights</div>';
    }

    const listItems = top10.map(page => 
        `<li>${page.title}: <strong>${page.count}</strong> highlights</li>`
    ).join('');

    return `
        <div><strong>Top Pages (by highlights)</strong></div>
        <ul class="tooltip-list">
            ${listItems}
        </ul>
    `;
}

// Generate color tooltip with bar chart
function generateColorTooltip(colorStats) {
    const maxCount = Math.max(...Object.values(colorStats));
    const colors = {
        red: '#ff6363',
        orange: '#ffa500', 
        yellow: '#ffeb3b',
        green: '#4caf50',
        blue: '#2196f3'
    };

    const colorBars = Object.entries(colorStats).map(([color, count]) => {
        const height = maxCount > 0 ? Math.max((count / maxCount) * 60, 4) : 4;
        return `
            <div class="color-bar">
                <div class="color-bar-value">${count}</div>
                <div class="color-bar-fill" style="height: ${height}px; background-color: ${colors[color]};"></div>
                <div class="color-bar-label">${color}</div>
            </div>
        `;
    }).join('');

    return `
        <div><strong>Highlights by Color</strong></div>
        <div class="color-chart">
            ${colorBars}
        </div>
    `;
}

// Update domain list
function updateDomainList(sortedDomains) {
    const domainList = document.getElementById('domainList');
    
    if (sortedDomains.length === 0) {
        showNoDataIndicator();
        return;
    }

    domainList.innerHTML = sortedDomains.map(({domain, site, lastHighlightTime, subpages}) => {
        const totalHighlights = site.highlights.length;
        const colorStats = site.highlights.reduce((stats, h) => {
            if (stats[h.color] !== undefined) stats[h.color]++;
            return stats;
        }, { red: 0, orange: 0, yellow: 0, green: 0, blue: 0 });

        const isExpanded = expandedDomains.has(domain);
        
        return `
            <div class="domain-item">
                <div class="domain-header ${isExpanded ? 'expanded' : ''}" data-domain="${domain}">
                    <div class="domain-info">
                        <div>
                            <div class="domain-name">${domain}</div>
                            <div class="last-updated">Last updated: ${formatDate(lastHighlightTime)}</div>
                        </div>
                        <div class="domain-stats">
                            <div class="highlight-count">
                                ${Object.entries(colorStats).map(([color, count]) => 
                                    count > 0 ? `<span class="color-indicator ${color}"></span><span>${count}</span>` : ''
                                ).join('')}
                                <span class="total-count">${totalHighlights} total</span>
                            </div>
                            <span class="expand-icon ${isExpanded ? 'expanded' : ''}">▶</span>
                        </div>
                    </div>
                </div>
                <div class="subpages ${isExpanded ? 'expanded' : ''}" id="subpages-${domain}">
                    ${generateSubpagesHTML(domain, subpages)}
                </div>
            </div>
        `;
    }).join('');
}

// Generate HTML for subpages
function generateSubpagesHTML(domain, subpages) {
    return subpages.map(subpage => {
        const isExpanded = expandedSubpages.has(subpage.url);
        const colorCounts = Object.entries(subpage.colorStats)
            .filter(([color, count]) => count > 0)
            .map(([color, count]) => `<span class="color-indicator ${color}"></span><span>${count}</span>`)
            .join('');

        return `
            <div class="subpage-item">
                <div class="subpage-info">
                    <div class="subpage-url" title="${subpage.url}">${subpage.title}</div>
                    <div class="subpage-actions">
                        <button class="btn btn-view" data-url="${subpage.url}">
                            ${isExpanded ? 'Hide' : 'View'} (${subpage.highlights.length})
                        </button>
                        <button class="btn btn-delete" data-domain="${domain}" data-url="${subpage.url}">
                            Delete All
                        </button>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                    <div class="highlight-count">${colorCounts}</div>
                    <div class="last-updated">Last: ${formatDate(subpage.lastHighlightTime)}</div>
                </div>
                <div class="highlight-list ${isExpanded ? 'expanded' : ''}" id="highlights-${btoa(subpage.url)}">
                    ${generateHighlightsHTML(subpage.highlights)}
                </div>
            </div>
        `;
    }).join('');
}

// Generate HTML for individual highlights
function generateHighlightsHTML(highlights) {
    return highlights.map(highlight => `
        <div class="highlight-item ${highlight.color}" data-highlight-id="${highlight.id}">
            <div class="highlight-text">${escapeHtml(highlight.text)}</div>
            ${highlight.context_before || highlight.context_after ? `
                <div class="highlight-context">
                    ${highlight.context_before ? escapeHtml(highlight.context_before) + ' ' : ''}
                    <strong>${escapeHtml(highlight.text)}</strong>
                    ${highlight.context_after ? ' ' + escapeHtml(highlight.context_after) : ''}
                </div>
            ` : ''}
            <div class="highlight-meta">
                <span>${formatDate(highlight.timestamp)}</span>
                <button class="btn btn-delete" data-highlight-id="${highlight.id}">Delete</button>
            </div>
        </div>
    `).join('');
}

// Toggle domain expansion
function toggleDomain(domain) {
    if (expandedDomains.has(domain)) {
        expandedDomains.delete(domain);
    } else {
        expandedDomains.add(domain);
    }
    applyFilters(); // Re-render
}

// Toggle subpage highlights
function toggleSubpage(url) {
    if (expandedSubpages.has(url)) {
        expandedSubpages.delete(url);
    } else {
        expandedSubpages.add(url);
    }
    applyFilters(); // Re-render
}

// Delete entire subpage
async function deleteSubpage(domain, url) {
    if (!confirm(`Are you sure you want to delete all highlights from this page?\n\n${url}`)) {
        return;
    }

    try {
        const response = await chrome.runtime.sendMessage({
            action: 'removeAllHighlightsFromPage',
            domain: domain,
            url: url
        });

        if (response.success) {
            // Remove from local data
            if (allData.websites[domain]) {
                allData.websites[domain].highlights = allData.websites[domain].highlights.filter(h => h.url !== url);
                if (allData.websites[domain].highlights.length === 0) {
                    delete allData.websites[domain];
                }
            }
            applyFilters(); // Re-render
        }
    } catch (error) {
        console.error('Error deleting subpage highlights:', error);
        alert('Failed to delete highlights. Please try again.');
    }
}

// Delete individual highlight
async function deleteHighlight(highlightId, buttonElement) {
    if (!confirm('Are you sure you want to delete this highlight?')) {
        return;
    }

    try {
        // Find the domain for this highlight
        let targetDomain = null;
        for (const [domain, site] of Object.entries(allData.websites)) {
            if (site.highlights.find(h => h.id === highlightId)) {
                targetDomain = domain;
                break;
            }
        }

        if (!targetDomain) {
            throw new Error('Could not find domain for highlight');
        }

        const response = await chrome.runtime.sendMessage({
            action: 'deleteHighlight',
            domain: targetDomain,
            highlightId: highlightId
        });

        if (response.success) {
            // Remove from local data
            allData.websites[targetDomain].highlights = allData.websites[targetDomain].highlights.filter(h => h.id !== highlightId);
            if (allData.websites[targetDomain].highlights.length === 0) {
                delete allData.websites[targetDomain];
            }
            
            // Remove the highlight element from DOM
            const highlightElement = buttonElement.closest('.highlight-item');
            highlightElement.remove();
            
            // Update stats
            applyFilters();
        }
    } catch (error) {
        console.error('Error deleting highlight:', error);
        alert('Failed to delete highlight. Please try again.');
    }
}

// Utility functions
function formatDate(timestamp) {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function hideLoadingIndicator() {
    document.getElementById('loadingIndicator').style.display = 'none';
}

function showNoDataIndicator() {
    document.getElementById('domainList').innerHTML = '';
    document.getElementById('statsOverview').innerHTML = '';
    document.getElementById('noDataIndicator').style.display = 'block';
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Management interface DOM loaded');
});