// PDF Export script for Lumos Highlighter

console.log('PDF export script loaded');

// Store current highlight styles
let currentStyles = {
    cornerStyle: 'rectangular',
    backgroundStyle: 'transparent',
    textStyle: 'default'
};

// Load current styles from storage
chrome.storage.sync.get(['lumosHighlightStyles'], function(result) {
    if (result.lumosHighlightStyles) {
        currentStyles = result.lumosHighlightStyles;
        console.log('Loaded styles for PDF export:', currentStyles);
    }
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'generatePDF') {
        console.log('Generating PDF with data:', message.data);
        generatePDFContent(message.data, message.type);
    }
});

function generatePDFContent(data, type) {
    const body = document.body;
    
    if (type === 'page') {
        generatePageSummary(data);
    } else if (type === 'all') {
        generateAllSitesSummary(data);
    }
    
    // Add print button and controls
    addPrintControls();
    
    // Auto-trigger print dialog after content is loaded
    setTimeout(() => {
        window.print();
    }, 500);
}

function addPrintControls() {
    const printBtn = document.createElement('button');
    printBtn.className = 'print-btn-fixed';
    printBtn.innerHTML = '🖨️ Print PDF';
    
    printBtn.addEventListener('click', () => {
        // Ensure background colors are included in print
        document.body.style.webkitPrintColorAdjust = 'exact';
        document.body.style.colorAdjust = 'exact';
        document.body.style.printColorAdjust = 'exact';
        
        // Add styles to all elements
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
            el.style.webkitPrintColorAdjust = 'exact';
            el.style.colorAdjust = 'exact';
            el.style.printColorAdjust = 'exact';
        });
        
        setTimeout(() => {
            window.print();
        }, 100);
    });
    
    document.body.appendChild(printBtn);
}

function generatePageSummary(data) {
    const content = `
        <div class="header">
            <img src="../assets/images/banner.png" alt="Lumos Highlighter" class="banner-logo">
            <h1>Page Summary</h1>
            <div class="export-info">
                <p><strong>Page:</strong> ${escapeHtml(data.title)}</p>
                <p><strong>URL:</strong> ${escapeHtml(data.url)}</p>
                <p><strong>Exported:</strong> ${formatDate(data.exportDate)}</p>
                <p><strong>Total Highlights:</strong> ${data.highlights.length}</p>
            </div>
        </div>
        
        <div class="website-section">
            <div class="website-header">
                <div class="website-title">${escapeHtml(data.title)}</div>
                <div class="website-url">${escapeHtml(data.url)}</div>
            </div>
            
            ${data.highlights.map(highlight => generateHighlightHTML(highlight)).join('')}
        </div>
    `;
    
    document.body.innerHTML = content;
}

function generateAllSitesSummary(data) {
    const websites = Object.entries(data.websites);
    const totalHighlights = websites.reduce((total, [domain, site]) => total + site.highlights.length, 0);
    
    const websiteSections = websites.map(([domain, site]) => `
        <div class="website-section">
            <div class="website-header">
                <div class="website-title">${escapeHtml(site.title || domain)}</div>
                <div class="website-url">${escapeHtml(domain)}</div>
            </div>
            
            ${site.highlights.map(highlight => generateHighlightHTML(highlight)).join('')}
        </div>
    `).join('');
    
    const content = `
        <div class="header">
            <img src="../assets/images/banner.png" alt="Lumos Highlighter" class="banner-logo">
            <h1>All Sites Summary</h1>
            <div class="export-info">
                <p><strong>Total Websites:</strong> ${websites.length}</p>
                <p><strong>Total Highlights:</strong> ${totalHighlights}</p>
                <p><strong>Exported:</strong> ${formatDate(data.exportDate)}</p>
                ${data.metadata ? generateMetadataHTML(data.metadata) : ''}
            </div>
        </div>
        
        ${websiteSections}
    `;
    
    document.body.innerHTML = content;
}

function generateHighlightHTML(highlight) {
    const contextBefore = highlight.context_before ? escapeHtml(highlight.context_before.trim()) : '';
    const contextAfter = highlight.context_after ? escapeHtml(highlight.context_after.trim()) : '';
    const highlightText = escapeHtml(highlight.text);
    
    // Show context only if it exists and is meaningful (not just CSS/HTML)
    const showContext = (contextBefore && contextBefore.length > 5) || (contextAfter && contextAfter.length > 5);
    
    // Apply current styles
    const styleClasses = [highlight.color];
    if (currentStyles.cornerStyle === 'rounded') {
        styleClasses.push('corner-rounded');
    }
    if (currentStyles.backgroundStyle === 'underline') {
        styleClasses.push('bg-underline');
    } else if (currentStyles.backgroundStyle === 'crayon') {
        styleClasses.push('bg-crayon');
    }
    if (currentStyles.textStyle === 'bold') {
        styleClasses.push('text-bold');
    } else if (currentStyles.textStyle === 'shadow') {
        styleClasses.push('text-shadow');
    }
    
    return `
        <div class="highlight highlight-${highlight.color}">
            <div class="highlight-text ${styleClasses.join(' ')}">${highlightText}</div>
            ${showContext ? `
                <div class="highlight-context">
                    ${contextBefore && contextBefore.length > 5 ? `<span class="context-before">${contextBefore} </span>` : ''}
                    <span class="context-highlighted ${styleClasses.join(' ')}">${highlightText}</span>
                    ${contextAfter && contextAfter.length > 5 ? `<span class="context-after"> ${contextAfter}</span>` : ''}
                </div>
            ` : `
                <div class="highlight-context">
                    <span class="context-highlighted ${styleClasses.join(' ')}">${highlightText}</span>
                </div>
            `}
            <div class="highlight-meta">
                ${highlight.timestamp ? `Highlighted On: ${formatDate(highlight.timestamp)}` : ''}
                ${highlight.url ? ` • URL: ${escapeHtml(highlight.url)}` : ''}
            </div>
        </div>
    `;
}

function generateMetadataHTML(metadata) {
    if (!metadata.color_stats) return '';
    
    const colorStats = Object.entries(metadata.color_stats)
        .filter(([color, count]) => count > 0)
        .map(([color, count]) => `<span style="background-color: rgba(${getColorRgb(color)}, 0.3); padding: 2px 6px; border-radius: 3px; margin-right: 8px;">${capitalizeFirst(color)}: ${count}</span>`)
        .join('');
    
    return `
        <p><strong>Highlight Distribution:</strong> ${colorStats}</p>
        ${metadata.date_range ? `<p><strong>Date Range:</strong> ${formatDate(metadata.date_range.earliest)} - ${formatDate(metadata.date_range.latest)}</p>` : ''}
    `;
}

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

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Show loading message initially
document.body.innerHTML = `
    <div class="loading">
        <h2>🔆 Lumos Highlighter</h2>
        <p>Generating PDF export...</p>
    </div>
`;