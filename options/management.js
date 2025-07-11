// Management interface script for Lumos Highlighter

console.log('Management interface script loaded');

let allData = null;
let filteredData = null;
let expandedDomains = new Set();
let expandedSubpages = new Set();

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'initManagement') {
        console.log('Received initManagement message from background script:', message.data);
        // Only initialize if we don't already have data loaded
        if (!allData || !allData.websites) {
            console.log('No data loaded yet, initializing with background data');
            allData = message.data;
            initializeInterface();
        } else {
            console.log('Data already loaded, ignoring background script message');
        }
    }
});

// Initialize the interface
function initializeInterface() {
    setupEventListeners();
    applyFilters();
    hideLoadingIndicator();
    hideNoDataIndicator();
}

// Set up event listeners
function setupEventListeners() {
    const timeRange = document.getElementById('timeRange');
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');

    timeRange.addEventListener('change', handleTimeRangeChange);
    dateFrom.addEventListener('change', applyFilters);
    dateTo.addEventListener('change', applyFilters);
    
    // Set up color filter circles
    setupColorFilterCircles();
    
    // Set up event delegation for dynamic content
    const domainList = document.getElementById('domainList');
    domainList.addEventListener('click', handleDomainListClick);
    
    // Set up statistics click events
    const statsOverview = document.getElementById('statsOverview');
    statsOverview.addEventListener('click', handleStatsClick);
    
    // Set up modal close events
    const modal = document.getElementById('statisticsModal');
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeStatisticsModal();
        }
    });
    
    // Set up PDF export button
    const exportPDFBtn = document.getElementById('exportPDFBtn');
    exportPDFBtn.addEventListener('click', exportFilteredDataToPDF);
}

// Handle clicks in domain list using event delegation
function handleDomainListClick(event) {
    const target = event.target;
    console.log('Click detected on:', target, 'Classes:', target.classList);
    
    // Handle clicks on subpage items (but not on buttons)
    if (target.closest('.subpage-item') && !target.closest('button') && !target.closest('a')) {
        const subpageItem = target.closest('.subpage-item');
        const url = subpageItem.getAttribute('data-url');
        
        console.log('Subpage item clicked - url:', url);
        
        if (url) {
            console.log('Toggling subpage:', url);
            toggleSubpage(url);
        }
        return;
    }
    
    // Handle clicks on color blocks (highlight-count area) to expand domain or subpage
    if (target.closest('.highlight-count')) {
        const highlightCount = target.closest('.highlight-count');
        const domain = highlightCount.getAttribute('data-domain');
        const url = highlightCount.getAttribute('data-url');
        
        console.log('Color block clicked - domain:', domain, 'url:', url);
        
        if (url) {
            // This is a subpage-level color block, toggle subpage
            console.log('Toggling subpage:', url);
            toggleSubpage(url);
        } else if (domain) {
            // This is a domain-level color block, toggle domain
            console.log('Toggling domain:', domain);
            toggleDomain(domain);
        }
        return;
    }
    
    // Handle domain header clicks - but not if clicking on buttons
    if (target.closest('.domain-header') && !target.closest('button') && !target.closest('a')) {
        const domainHeader = target.closest('.domain-header');
        const domain = domainHeader.getAttribute('data-domain');
        if (domain) {
            toggleDomain(domain);
        }
        return;
    }
    
    // Note: Highlight view buttons are now <a> tags, so no JavaScript handling needed
    
    // Handle subpage view button clicks (for show/hide highlights)
    if (target.classList.contains('btn-view') && target.closest('.subpage-item')) {
        const url = target.getAttribute('data-url');
        if (url) {
            toggleSubpage(url);
        }
        return;
    }

    // Handle highlight delete button clicks - check this first since it's more specific
    if (target.classList.contains('btn-delete') && target.closest('.highlight-item')) {
        const highlightId = target.getAttribute('data-highlight-id');
        if (highlightId) {
            deleteHighlight(highlightId, target);
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
    
    // Handle any other delete buttons that might have highlight-id
    if (target.classList.contains('btn-delete') && target.hasAttribute('data-highlight-id')) {
        const highlightId = target.getAttribute('data-highlight-id');
        if (highlightId) {
            deleteHighlight(highlightId, target);
        }
        return;
    }
}

// Handle statistics clicks
function handleStatsClick(event) {
    const statItem = event.target.closest('.stat-item');
    if (!statItem) return;
    
    const type = statItem.getAttribute('data-stat-type');
    if (type) {
        openStatisticsModal(type);
    }
}

// Open statistics modal
function openStatisticsModal(type) {
    const modal = document.getElementById('statisticsModal');
    const modalIcon = document.getElementById('modalIcon');
    const modalTitleText = document.getElementById('modalTitleText');
    const modalBody = document.getElementById('modalBody');
    
    // Set modal title and icon based on type
    const config = {
        websites: { icon: '🌐', title: 'Website Statistics' },
        pages: { icon: '📄', title: 'Page Statistics' },
        highlights: { icon: '🎨', title: 'Highlight Statistics' }
    };
    
    modalIcon.textContent = config[type].icon;
    modalTitleText.textContent = config[type].title;
    
    // Generate modal content based on type
    let content = '';
    if (type === 'websites') {
        content = generateWebsiteModalContent();
    } else if (type === 'pages') {
        content = generatePagesModalContent();
    } else if (type === 'highlights') {
        content = generateHighlightsModalContent();
    }
    
    modalBody.innerHTML = content;
    modal.classList.add('show');
}

// Close statistics modal
window.closeStatisticsModal = function() {
    const modal = document.getElementById('statisticsModal');
    modal.classList.remove('show');
}

// Generate website modal content
function generateWebsiteModalContent() {
    if (!filteredData || !filteredData.websites) {
        return '<p>No website data available</p>';
    }
    
    const domainStats = Object.entries(filteredData.websites).map(([domain, site]) => ({
        domain,
        count: site.highlights.length
    })).sort((a, b) => b.count - a.count).slice(0, 15);

    if (domainStats.length === 0) {
        return '<p>No websites with highlights</p>';
    }

    const listItems = domainStats.map(({domain, count}) => 
        `<li><span class="stat-name">${domain}</span><span class="stat-value">${count} highlights</span></li>`
    ).join('');

    return `
        <div>
            <p style="margin-bottom: 16px; color: #666;">
                Top ${domainStats.length} websites ranked by highlight count:
            </p>
            <ul class="stat-list">${listItems}</ul>
        </div>
    `;
}

// Generate pages modal content
function generatePagesModalContent() {
    if (!filteredData || !filteredData.websites) {
        return '<p>No page data available</p>';
    }
    
    const pageStats = [];
    
    Object.entries(filteredData.websites).forEach(([domain, site]) => {
        const pages = {};
        site.highlights.forEach(highlight => {
            if (!pages[highlight.url]) {
                pages[highlight.url] = {
                    url: highlight.url,
                    title: highlight.page_title || getPageTitleFromURL(highlight.url),
                    domain: domain,
                    count: 0
                };
            }
            pages[highlight.url].count++;
        });
        
        Object.values(pages).forEach(page => pageStats.push(page));
    });

    pageStats.sort((a, b) => b.count - a.count);
    const top15 = pageStats.slice(0, 15);

    if (top15.length === 0) {
        return '<p>No pages with highlights</p>';
    }

    const listItems = top15.map(page => 
        `<li>
            <div>
                <div class="stat-name">${page.title}</div>
                <div style="font-size: 0.8em; color: #888;">${page.domain}</div>
            </div>
            <span class="stat-value">${page.count}</span>
        </li>`
    ).join('');

    return `
        <div>
            <p style="margin-bottom: 16px; color: #666;">
                Top ${top15.length} pages ranked by highlight count:
            </p>
            <ul class="stat-list">${listItems}</ul>
        </div>
    `;
}

// Generate highlights modal content with color chart
function generateHighlightsModalContent() {
    if (!filteredData || !filteredData.metadata) {
        return '<p>No highlight data available</p>';
    }
    
    const colorStats = filteredData.metadata.color_stats;
    const total = filteredData.metadata.total_highlights;
    
    const maxCount = Math.max(...Object.values(colorStats));
    const colors = {
        red: '#ff6363',
        orange: '#ffa500', 
        yellow: '#ffeb3b',
        green: '#4caf50',
        blue: '#2196f3'
    };

    const colorBars = Object.entries(colorStats).map(([color, count]) => {
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
        const height = maxCount > 0 ? Math.max((count / maxCount) * 60, 4) : 4;
        return `
            <div class="color-bar">
                <div class="color-bar-container">
                    <div class="color-bar-value">${count}</div>
                    <div class="color-bar-fill" style="height: ${height}px; background-color: ${colors[color]};"></div>
                </div>
                <div class="color-bar-label">${color}</div>
            </div>
        `;
    }).join('');

    return `
        <div>
            <p style="margin-bottom: 16px; color: #666;">
                Distribution of ${total} highlights across colors:
            </p>
            <div class="color-chart">
                ${colorBars}
            </div>
            <div style="margin-top: 20px;">
                <ul class="stat-list">
                    ${Object.entries(colorStats).map(([color, count]) => {
                        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                        return `<li>
                            <span class="stat-name" style="display: flex; align-items: center; gap: 8px;">
                                <span style="width: 16px; height: 16px; background-color: ${colors[color]}; border-radius: 3px;"></span>
                                ${color.charAt(0).toUpperCase() + color.slice(1)}
                            </span>
                            <span class="stat-value">${count} (${percentage}%)</span>
                        </li>`;
                    }).join('')}
                </ul>
            </div>
        </div>
    `;
}

// Handle time range selection change
function handleTimeRangeChange() {
    const timeRange = document.getElementById('timeRange');
    const customDateRange = document.getElementById('customDateRange');
    
    if (timeRange.value === 'custom') {
        customDateRange.style.display = 'block';
    } else {
        customDateRange.style.display = 'none';
    }
    
    applyFilters();
}

// Track color selection state in JavaScript
let colorSelectionState = {
    red: false,
    orange: false,
    yellow: false,
    green: false,
    blue: false
};

// Set up color filter dropdown
function setupColorFilterCircles() {
    const colorCircles = document.querySelectorAll('.color-circle');
    const selectAllBtn = document.getElementById('selectAllColors');
    const deselectAllBtn = document.getElementById('deselectAllColors');
    
    // Setup click handlers for color circles
    colorCircles.forEach(circle => {
        const checkbox = circle.querySelector('input[type="checkbox"]');
        const color = circle.dataset.color;
        
        circle.addEventListener('click', (e) => {
            e.preventDefault();
            console.log(`\n=================== CLICK ON ${color.toUpperCase()} ===================`);
            
            // Check state of ALL checkboxes before toggle
            const allCheckboxesBefore = document.querySelectorAll('.color-circle input[type="checkbox"]');
            console.log('STATE BEFORE TOGGLE:');
            Array.from(allCheckboxesBefore).forEach(cb => {
                const circleEl = cb.closest('.color-circle');
                console.log(`  ${cb.value}: checkbox=${cb.checked}, hasActive=${circleEl.classList.contains('active')}`);
            });
            
            toggleColorSelection(color, circle, checkbox);
            
            // Check state of ALL checkboxes after toggle
            const allCheckboxesAfter = document.querySelectorAll('.color-circle input[type="checkbox"]');
            console.log('STATE AFTER TOGGLE:');
            Array.from(allCheckboxesAfter).forEach(cb => {
                const circleEl = cb.closest('.color-circle');
                console.log(`  ${cb.value}: checkbox=${cb.checked}, hasActive=${circleEl.classList.contains('active')}`);
            });
            
            applyFilters();
            console.log(`=================== END CLICK ON ${color.toUpperCase()} ===================\n`);
        });
    });
    
    // Setup Select All button
    selectAllBtn.addEventListener('click', (e) => {
        e.preventDefault();
        selectAllColors();
        applyFilters();
    });
    
    // Setup Deselect All button
    deselectAllBtn.addEventListener('click', (e) => {
        e.preventDefault();
        deselectAllColors();
        applyFilters();
    });
    
    // Synchronize visual state with checkbox state on initialization
    synchronizeVisualState();
    
    // Add debugging to track when checkboxes change
    setupCheckboxChangeTracking();
}

function synchronizeVisualState() {
    const colorCircles = document.querySelectorAll('.color-circle');
    console.log('=== Synchronizing visual state ===');
    
    colorCircles.forEach(circle => {
        const checkbox = circle.querySelector('input[type="checkbox"]');
        const color = circle.dataset.color;
        const colorName = color.charAt(0).toUpperCase() + color.slice(1);
        
        console.log(`Syncing ${color}: checkbox=${checkbox.checked}, hasActive=${circle.classList.contains('active')}`);
        
        if (checkbox.checked) {
            // Checkbox is checked, ensure visual state shows active
            circle.classList.add('active');
            const tooltipText = `${colorName} - ON`;
            circle.setAttribute('data-tooltip', tooltipText);
            circle.setAttribute('title', tooltipText);
        } else {
            // Checkbox is unchecked, ensure visual state shows inactive
            circle.classList.remove('active');
            const tooltipText = `${colorName} - OFF`;
            circle.setAttribute('data-tooltip', tooltipText);
            circle.setAttribute('title', tooltipText);
        }
    });
}

function setupCheckboxChangeTracking() {
    const colorCheckboxes = document.querySelectorAll('.color-circle input[type="checkbox"]');
    
    colorCheckboxes.forEach(checkbox => {
        // Track when checkbox changes
        checkbox.addEventListener('change', (e) => {
            const stack = new Error().stack;
            console.log(`🔍 CHECKBOX CHANGE DETECTED: ${checkbox.value} = ${checkbox.checked}`);
            console.log('Stack trace:', stack);
        });
    });
}

function toggleColorSelection(color, circleElement, checkbox) {
    const colorName = color.charAt(0).toUpperCase() + color.slice(1);
    
    console.log(`TOGGLE ${color}:`);
    console.log(`  Before: JS state=${colorSelectionState[color]}, DOM active=${circleElement.classList.contains('active')}, checkbox=${checkbox.checked}`);
    
    // Toggle the JavaScript state
    colorSelectionState[color] = !colorSelectionState[color];
    
    console.log(`  After JS toggle: ${color} = ${colorSelectionState[color]}`);
    
    // Update DOM to match JavaScript state
    if (colorSelectionState[color]) {
        // Activate color
        console.log(`  Activating ${color} in DOM...`);
        circleElement.classList.add('active');
        checkbox.checked = true;
        const tooltipText = `${colorName} - ON`;
        circleElement.setAttribute('data-tooltip', tooltipText);
        circleElement.setAttribute('title', tooltipText);
    } else {
        // Deactivate color
        console.log(`  Deactivating ${color} in DOM...`);
        circleElement.classList.remove('active');
        checkbox.checked = false;
        const tooltipText = `${colorName} - OFF`;
        circleElement.setAttribute('data-tooltip', tooltipText);
        circleElement.setAttribute('title', tooltipText);
    }
    
    console.log(`  Final state: JS=${colorSelectionState[color]}, DOM active=${circleElement.classList.contains('active')}, checkbox=${checkbox.checked}`);
    
    // Add animation
    circleElement.style.animation = 'none';
    circleElement.offsetHeight; // Trigger reflow
    circleElement.style.animation = 'toggleBounce 0.3s ease';
}

function selectAllColors() {
    console.log('SELECT ALL COLORS');
    
    // Update JavaScript state
    Object.keys(colorSelectionState).forEach(color => {
        colorSelectionState[color] = true;
    });
    
    // Update DOM to match
    const colorCircles = document.querySelectorAll('.color-circle');
    colorCircles.forEach(circle => {
        const checkbox = circle.querySelector('input[type="checkbox"]');
        const color = circle.dataset.color;
        const colorName = color.charAt(0).toUpperCase() + color.slice(1);
        
        // Activate all colors
        circle.classList.add('active');
        checkbox.checked = true;
        const tooltipText = `${colorName} - ON`;
        circle.setAttribute('data-tooltip', tooltipText);
        circle.setAttribute('title', tooltipText);
        
        // Add animation with delay for visual effect
        setTimeout(() => {
            circle.style.animation = 'none';
            circle.offsetHeight; // Trigger reflow
            circle.style.animation = 'toggleBounce 0.3s ease';
        }, Math.random() * 200); // Random delay up to 200ms
    });
    
    console.log('JavaScript state after select all:', colorSelectionState);
}

function deselectAllColors() {
    console.log('DESELECT ALL COLORS');
    
    // Update JavaScript state
    Object.keys(colorSelectionState).forEach(color => {
        colorSelectionState[color] = false;
    });
    
    // Update DOM to match
    const colorCircles = document.querySelectorAll('.color-circle');
    colorCircles.forEach(circle => {
        const checkbox = circle.querySelector('input[type="checkbox"]');
        const color = circle.dataset.color;
        const colorName = color.charAt(0).toUpperCase() + color.slice(1);
        
        // Deactivate all colors
        circle.classList.remove('active');
        checkbox.checked = false;
        const tooltipText = `${colorName} - OFF`;
        circle.setAttribute('data-tooltip', tooltipText);
        circle.setAttribute('title', tooltipText);
        
        // Add animation with delay for visual effect
        setTimeout(() => {
            circle.style.animation = 'none';
            circle.offsetHeight; // Trigger reflow
            circle.style.animation = 'toggleBounce 0.3s ease';
        }, Math.random() * 200); // Random delay up to 200ms
    });
    
    console.log('JavaScript state after deselect all:', colorSelectionState);
}

// Get selected color filters
function getSelectedColors() {
    // Use JavaScript state instead of DOM checkboxes
    const selectedColors = Object.entries(colorSelectionState)
        .filter(([color, isSelected]) => isSelected)
        .map(([color, isSelected]) => color);
    
    console.log('=== getSelectedColors ===');
    console.log('JavaScript state:', colorSelectionState);
    console.log('Selected colors from JS state:', selectedColors);
    
    if (selectedColors.length === 0) {
        console.log('Returning all (no colors selected)');
        return ['all'];
    }
    
    if (selectedColors.length === 5) {
        console.log('Returning all (all colors selected)');
        return ['all'];
    }
    
    console.log('Returning specific colors:', selectedColors);
    return selectedColors;
}

// Export filtered data to PDF
async function exportFilteredDataToPDF() {
    if (!filteredData || !filteredData.websites || Object.keys(filteredData.websites).length === 0) {
        alert('No data to export. Please adjust your filters to include some highlights.');
        return;
    }
    
    try {
        // Prepare export data with additional metadata
        const exportData = {
            ...filteredData,
            exportDate: new Date().toISOString(),
            exportType: 'filtered',
            filterInfo: getFilterInfo()
        };
        
        // Send to background script for PDF generation
        const response = await chrome.runtime.sendMessage({
            action: 'generateFilteredPDF',
            data: exportData,
            type: 'all'
        });
        
        if (response && response.success) {
            console.log('PDF export initiated successfully');
        } else {
            throw new Error('Failed to initiate PDF export');
        }
    } catch (error) {
        console.error('Error exporting PDF:', error);
        alert('Failed to export PDF. Please try again.');
    }
}

// Get current filter information for PDF metadata
function getFilterInfo() {
    const timeRange = document.getElementById('timeRange').value;
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    const selectedColors = getSelectedColors();
    
    const filterInfo = {
        timeRange: timeRange,
        customDateRange: null,
        colorFilter: selectedColors
    };
    
    if (timeRange === 'custom' && (dateFrom || dateTo)) {
        filterInfo.customDateRange = {
            from: dateFrom || 'Not specified',
            to: dateTo || 'Not specified'
        };
    }
    
    return filterInfo;
}

// Generate Text Fragment URL for direct linking
function generateTextFragmentURL(url, highlightText) {
    try {
        // Clean and prepare the text for the text fragment
        let cleanText = highlightText.trim();
        
        // Handle long text by truncating to first meaningful part
        if (cleanText.length > 80) {
            // Try to find a good breaking point (sentence, phrase, or word boundary)
            const breakPoints = ['. ', '! ', '? ', ', ', ' '];
            let truncated = cleanText.substring(0, 80);
            
            for (const breakPoint of breakPoints) {
                const lastIndex = truncated.lastIndexOf(breakPoint);
                if (lastIndex > 20) { // Ensure we keep a reasonable amount of text
                    truncated = cleanText.substring(0, lastIndex + breakPoint.length).trim();
                    break;
                }
            }
            
            // If no good break point found, just truncate at word boundary
            if (truncated.length >= 80) {
                const lastSpace = truncated.lastIndexOf(' ');
                if (lastSpace > 20) {
                    truncated = truncated.substring(0, lastSpace);
                }
            }
            
            cleanText = truncated;
        }
        
        // Remove or escape problematic characters for text fragments
        cleanText = cleanText
            .replace(/[\n\r\t]/g, ' ')  // Replace newlines and tabs with spaces
            .replace(/\s+/g, ' ')       // Collapse multiple spaces
            .trim();
        
        // For text fragments, we need to handle special characters carefully
        const textForFragment = cleanText
            .replace(/[%]/g, '%25')     // Encode % first
            .replace(/[#]/g, '%23')     // Encode #
            .replace(/[&]/g, '%26');    // Encode &
        
        // Create URL with text fragment to jump to the highlighted text
        return `${url}#:~:text=${encodeURIComponent(textForFragment)}`;
        
    } catch (error) {
        console.error('Error generating text fragment URL:', error);
        // Fallback to original URL without text fragment
        return url;
    }
}

// Note: viewHighlightInPage function removed - now using direct <a> href links

// Apply all filters
function applyFilters() {
    if (!allData || !allData.websites) {
        showNoDataIndicator();
        return;
    }

    const timeRange = document.getElementById('timeRange').value;
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    const selectedColors = getSelectedColors();

    // Filter data based on criteria
    filteredData = filterDataByTimeAndColor(allData, timeRange, dateFrom, dateTo, selectedColors);
    
    // Sort domains by last updated time
    const sortedDomains = sortDomainsByTime(filteredData.websites);
    
    // Update the interface
    updateStatsOverview(filteredData);
    updateDomainList(sortedDomains);
}

// Filter data by time range and color
function filterDataByTimeAndColor(data, timeRange, dateFrom, dateTo, selectedColors) {
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
            const passesColorFilter = selectedColors.includes('all') || selectedColors.includes(highlight.color);
            console.log(`Highlight ${highlight.color} - Selected colors: [${selectedColors.join(', ')}] - Passes: ${passesColorFilter}`);
            
            if (!passesColorFilter) return false;
            
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
    
    // Ensure we have valid data and provide defaults for empty results
    const websites = data.websites || {};
    const metadata = data.metadata || { total_highlights: 0 };
    
    const totalHighlights = metadata.total_highlights || 0;
    const totalDomains = Object.keys(websites).length;
    
    // Calculate total pages
    const totalPages = Object.values(websites).reduce((total, site) => {
        if (!site.highlights || site.highlights.length === 0) return total;
        const uniqueUrls = new Set(site.highlights.map(h => h.url));
        return total + uniqueUrls.size;
    }, 0);

    statsOverview.innerHTML = `
        <div class="stat-item" data-stat-type="websites">
            <div class="stat-icon">🌐</div>
            <div class="stat-content">
                <div class="stat-number">${totalDomains}</div>
                <div class="stat-label">Websites</div>
            </div>
        </div>
        <div class="stat-item" data-stat-type="pages">
            <div class="stat-icon">📄</div>
            <div class="stat-content">
                <div class="stat-number">${totalPages}</div>
                <div class="stat-label">Pages</div>
            </div>
        </div>
        <div class="stat-item" data-stat-type="highlights">
            <div class="stat-icon">🎨</div>
            <div class="stat-content">
                <div class="stat-number">${totalHighlights}</div>
                <div class="stat-label">Highlights</div>
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

    // Hide the no data indicator since we have data to show
    hideNoDataIndicator();

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
                            <div class="highlight-count" data-domain="${domain}" style="cursor: pointer;">
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
            <div class="subpage-item" data-url="${subpage.url}" style="cursor: pointer;">
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
                    <div class="highlight-count" data-url="${subpage.url}" style="cursor: pointer;">${colorCounts}</div>
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
                <div class="highlight-actions">
                    <a href="${generateTextFragmentURL(highlight.url, highlight.text)}" target="_blank" class="btn btn-view">View</a>
                    <button class="btn btn-delete" data-highlight-id="${highlight.id}">Delete</button>
                </div>
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
    try {
        // Find the domain and highlight details
        let targetDomain = null;
        let targetHighlight = null;
        
        for (const [domain, site] of Object.entries(allData.websites)) {
            const highlight = site.highlights.find(h => h.id === highlightId);
            if (highlight) {
                targetDomain = domain;
                targetHighlight = highlight;
                break;
            }
        }

        if (!targetDomain || !targetHighlight) {
            throw new Error('Could not find domain for highlight');
        }

        // Create a more descriptive confirmation message
        const highlightText = targetHighlight.text.length > 50 
            ? targetHighlight.text.substring(0, 50) + '...'
            : targetHighlight.text;
        
        const pageTitle = targetHighlight.page_title || getPageTitleFromURL(targetHighlight.url);
        
        const confirmMessage = `Are you sure you want to delete this highlight?\n\nWebsite: ${targetDomain}\nPage: ${pageTitle}\nHighlight: "${highlightText}"\nColor: ${targetHighlight.color}`;
        
        if (!confirm(confirmMessage)) {
            return;
        }

        const response = await chrome.runtime.sendMessage({
            action: 'deleteHighlight',
            domain: targetDomain,
            highlightId: highlightId
        });

        if (response && response.success) {
            // Remove from local data
            allData.websites[targetDomain].highlights = allData.websites[targetDomain].highlights.filter(h => h.id !== highlightId);
            if (allData.websites[targetDomain].highlights.length === 0) {
                delete allData.websites[targetDomain];
            }
            
            // Remove the highlight element from DOM
            const highlightElement = buttonElement.closest('.highlight-item');
            if (highlightElement) {
                highlightElement.remove();
            }
            
            // Update stats
            applyFilters();
        } else {
            throw new Error('Background script returned failure');
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

function hideNoDataIndicator() {
    document.getElementById('noDataIndicator').style.display = 'none';
}

function showNoDataIndicator() {
    document.getElementById('domainList').innerHTML = '';
    document.getElementById('statsOverview').innerHTML = '';
    document.getElementById('loadingIndicator').style.display = 'none';
    document.getElementById('noDataIndicator').style.display = 'block';
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Management interface DOM loaded');
    
    // Try to load data directly from storage first
    try {
        const result = await chrome.storage.local.get(['lumosHighlights']);
        const data = result.lumosHighlights;
        
        if (data && data.websites) {
            console.log('Loading data directly from storage:', data);
            allData = data;
            initializeInterface();
        } else {
            console.log('No data found in storage, showing no data indicator');
            showNoDataIndicator();
        }
    } catch (error) {
        console.error('Error loading data from storage:', error);
        // Try to request data from background script as fallback
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'getExportSelectionData'
            });
            
            if (response && response.data) {
                console.log('Loaded data from background script:', response.data);
                allData = response.data;
                initializeInterface();
            } else {
                showNoDataIndicator();
            }
        } catch (bgError) {
            console.error('Error loading data from background script:', bgError);
            showNoDataIndicator();
        }
    }
});