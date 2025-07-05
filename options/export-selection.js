// Export Selection script for Lumos Highlighter

let allData = null;
let filteredData = null;
let selectedPeriod = '1w'; // Default to past week
let selectedWebsites = new Set();

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'initExportSelection') {
        allData = message.data;
        initializeUI();
    }
});

function setupEventListeners() {
    // Time option selection
    document.getElementById('timeOptions').addEventListener('click', (e) => {
        if (e.target.classList.contains('time-option')) {
            selectTimeOption(e.target);
        }
    });

    // Custom date inputs
    document.getElementById('fromDate').addEventListener('change', updatePreview);
    document.getElementById('toDate').addEventListener('change', updatePreview);

    // Action buttons
    document.getElementById('cancelBtn').addEventListener('click', () => {
        window.close();
    });
    
    document.getElementById('exportBtn').addEventListener('click', exportPDF);

    // Select all websites by default
    selectedPeriod = '1w';
    document.querySelector('[data-period="1w"]').classList.add('selected');
}

function selectTimeOption(element) {
    // Remove previous selection
    document.querySelectorAll('.time-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // Add selection to clicked option
    element.classList.add('selected');
    selectedPeriod = element.dataset.period;
    
    // Show/hide custom time inputs
    const customTime = document.getElementById('customTime');
    if (selectedPeriod === 'custom') {
        customTime.classList.add('visible');
        setDefaultCustomDates();
    } else {
        customTime.classList.remove('visible');
    }
    
    updatePreview();
}

function setDefaultCustomDates() {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    document.getElementById('fromDate').value = formatDateTimeLocal(oneWeekAgo);
    document.getElementById('toDate').value = formatDateTimeLocal(now);
}

function formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function loadData() {
    // Request data from background script
    chrome.runtime.sendMessage({
        action: 'getExportSelectionData'
    });
}

function initializeUI() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('selection-ui').style.display = 'block';
    
    renderWebsitesList();
    updatePreview();
}

function renderWebsitesList() {
    const websitesList = document.getElementById('websitesList');
    const websites = Object.entries(allData.websites);
    
    websitesList.innerHTML = websites.map(([domain, siteData]) => {
        const totalHighlights = siteData.highlights.length;
        const colors = getColorStats(siteData.highlights);
        
        // Select all websites by default
        selectedWebsites.add(domain);
        
        return `
            <div class="website-item">
                <input type="checkbox" class="website-checkbox" 
                       data-domain="${domain}" checked>
                <div class="website-info">
                    <div class="website-title">${escapeHtml(siteData.title || domain)}</div>
                    <div class="website-stats">
                        ${totalHighlights} highlights • ${domain}
                        <div class="color-stats">
                            ${Object.entries(colors).map(([color, count]) => 
                                count > 0 ? `<span class="color-badge" style="background-color: rgba(${getColorRgb(color)}, 0.3)">${color}: ${count}</span>` : ''
                            ).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Add event listeners to checkboxes
    setTimeout(() => {
        document.querySelectorAll('.website-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const domain = e.target.dataset.domain;
                toggleWebsite(domain, e.target.checked);
            });
        });
    }, 100);
}

function toggleWebsite(domain, checked) {
    if (checked) {
        selectedWebsites.add(domain);
    } else {
        selectedWebsites.delete(domain);
    }
    updatePreview();
}

function getColorStats(highlights) {
    const stats = { red: 0, orange: 0, yellow: 0, green: 0, blue: 0 };
    highlights.forEach(h => {
        if (stats.hasOwnProperty(h.color)) {
            stats[h.color]++;
        }
    });
    return stats;
}

function updatePreview() {
    if (!allData) return;
    
    filteredData = filterData();
    renderPreview();
}

function filterData() {
    const timeRange = getTimeRange();
    const filtered = {
        websites: {},
        metadata: {
            total_highlights: 0,
            color_stats: { red: 0, orange: 0, yellow: 0, green: 0, blue: 0 },
            date_range: { earliest: null, latest: null }
        },
        exportDate: new Date().toISOString()
    };
    
    Object.entries(allData.websites).forEach(([domain, siteData]) => {
        if (!selectedWebsites.has(domain)) return;
        
        const filteredHighlights = siteData.highlights.filter(highlight => {
            if (!highlight.timestamp) return true;
            const highlightDate = new Date(highlight.timestamp);
            return highlightDate >= timeRange.start && highlightDate <= timeRange.end;
        });
        
        if (filteredHighlights.length > 0) {
            filtered.websites[domain] = {
                ...siteData,
                highlights: filteredHighlights
            };
            
            // Update metadata
            filtered.metadata.total_highlights += filteredHighlights.length;
            
            filteredHighlights.forEach(h => {
                if (filtered.metadata.color_stats[h.color] !== undefined) {
                    filtered.metadata.color_stats[h.color]++;
                }
                
                if (h.timestamp) {
                    const date = h.timestamp;
                    if (!filtered.metadata.date_range.earliest || date < filtered.metadata.date_range.earliest) {
                        filtered.metadata.date_range.earliest = date;
                    }
                    if (!filtered.metadata.date_range.latest || date > filtered.metadata.date_range.latest) {
                        filtered.metadata.date_range.latest = date;
                    }
                }
            });
        }
    });
    
    return filtered;
}

function getTimeRange() {
    const now = new Date();
    let start, end = now;
    
    if (selectedPeriod === 'custom') {
        start = new Date(document.getElementById('fromDate').value);
        end = new Date(document.getElementById('toDate').value);
    } else {
        const periods = {
            '1h': 1 * 60 * 60 * 1000,
            '6h': 6 * 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
            '3d': 3 * 24 * 60 * 60 * 1000,
            '1w': 7 * 24 * 60 * 60 * 1000,
            '1m': 30 * 24 * 60 * 60 * 1000
        };
        
        const duration = periods[selectedPeriod] || periods['1w'];
        start = new Date(now.getTime() - duration);
    }
    
    return { start, end };
}

function renderPreview() {
    const previewSection = document.getElementById('previewSection');
    const websiteCount = Object.keys(filteredData.websites).length;
    const totalHighlights = filteredData.metadata.total_highlights;
    const colors = filteredData.metadata.color_stats;
    
    const colorStatsHtml = Object.entries(colors)
        .filter(([color, count]) => count > 0)
        .map(([color, count]) => 
            `<span class="color-badge" style="background-color: rgba(${getColorRgb(color)}, 0.3)">${color}: ${count}</span>`
        ).join('');
    
    previewSection.innerHTML = `
        <div class="preview-stats">
            <div class="stat-card">
                <div class="stat-number">${websiteCount}</div>
                <div class="stat-label">Websites</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${totalHighlights}</div>
                <div class="stat-label">Total Highlights</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${Object.values(colors).filter(c => c > 0).length}</div>
                <div class="stat-label">Colors Used</div>
            </div>
        </div>
        ${colorStatsHtml ? `<div style="margin-top: 16px;"><strong>Color Distribution:</strong><br>${colorStatsHtml}</div>` : ''}
        ${filteredData.metadata.date_range.earliest ? 
            `<div style="margin-top: 12px; color: #666; font-size: 0.9em;">
                <strong>Date Range:</strong> ${formatDate(filteredData.metadata.date_range.earliest)} - ${formatDate(filteredData.metadata.date_range.latest)}
            </div>` : ''
        }
    `;
    
    // Enable/disable export button
    const exportBtn = document.getElementById('exportBtn');
    exportBtn.disabled = totalHighlights === 0;
    if (totalHighlights === 0) {
        exportBtn.textContent = 'No highlights to export';
        exportBtn.style.opacity = '0.5';
    } else {
        exportBtn.textContent = '🖨️ Export PDF';
        exportBtn.style.opacity = '1';
    }
}

function exportPDF() {
    if (!filteredData || filteredData.metadata.total_highlights === 0) {
        alert('No highlights to export!');
        return;
    }
    
    // Send filtered data to background for PDF generation
    chrome.runtime.sendMessage({
        action: 'generateFilteredPDF',
        data: filteredData,
        type: 'all'
    });
    
    // Close this tab
    setTimeout(() => {
        window.close();
    }, 500);
}

// Utility functions
function getColorRgb(color) {
    const colorMap = {
        'red': '255, 99, 99',
        'orange': '255, 165, 0',
        'yellow': '255, 235, 59',
        'green': '76, 175, 80',
        'blue': '33, 150, 243'
    };
    return colorMap[color] || '128, 128, 128';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (e) {
        return dateString;
    }
}