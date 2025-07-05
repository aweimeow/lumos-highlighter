// Content script for Lumos Highlighter
// Handles text selection, highlight rendering, and DOM interactions

console.log('Lumos Highlighter content script loaded');

let highlightToolbar = null;
let currentSelection = null;
let isShowingToolbar = false;
let pendingHighlights = [];
let domObserver = null;
let currentStyles = {
    cornerStyle: 'rectangular',
    backgroundStyle: 'transparent',
    textStyle: 'default'
};

// Initialize content script
function init() {
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('click', handleClick);
    
    // Load style settings
    loadStyleSettings();
    
    // Load and restore highlights for this page
    restoreHighlights();
}

// Handle text selection
function handleTextSelection(event) {
    // Small delay to ensure selection is complete
    setTimeout(() => {
        const selection = window.getSelection();
        
        if (selection.rangeCount === 0 || selection.toString().trim() === '') {
            if (!isShowingToolbar) {
                hideHighlightToolbar();
            }
            return;
        }
        
        const selectedText = selection.toString().trim();
        if (selectedText.length < 3) { // Minimum text length for highlighting
            if (!isShowingToolbar) {
                hideHighlightToolbar();
            }
            return;
        }
        
        // Check if selection is inside an already highlighted element
        const range = selection.getRangeAt(0);
        const commonAncestor = range.commonAncestorContainer;
        const parentElement = commonAncestor.nodeType === Node.TEXT_NODE ? commonAncestor.parentElement : commonAncestor;
        
        if (parentElement && parentElement.closest('.lumos-highlight')) {
            // Don't hide if we're showing a remove toolbar
            if (!isShowingToolbar) {
                hideHighlightToolbar();
            }
            return;
        }
        
        currentSelection = {
            selection: selection,
            range: range,
            text: selectedText
        };
        
        showHighlightToolbar(event);
    }, 10);
}

// Handle mouse down to hide toolbar when clicking elsewhere
function handleMouseDown(event) {
    // Don't hide if we're about to show a toolbar
    if (isShowingToolbar) {
        console.log('Skipping hide because isShowingToolbar is true');
        return;
    }
    
    // Add delay to prevent conflicts with click events
    setTimeout(() => {
        // Double check the flag again in case it was set during the delay
        if (isShowingToolbar) {
            console.log('Skipping hide because isShowingToolbar became true during delay');
            return;
        }
        
        if (highlightToolbar && !highlightToolbar.contains(event.target) && !event.target.closest('.lumos-highlight')) {
            console.log('Hiding toolbar due to mousedown elsewhere');
            hideHighlightToolbar();
        }
    }, 100);
}

// Handle clicks on existing highlights
function handleClick(event) {
    const highlightElement = event.target.closest('.lumos-highlight');
    if (highlightElement) {
        console.log('Clicked on highlight, showing remove toolbar');
        event.preventDefault();
        event.stopPropagation();
        isShowingToolbar = true;
        showRemoveHighlightToolbar(event, highlightElement);
    }
}

// Show highlight toolbar near selection
function showHighlightToolbar(event) {
    if (!currentSelection || !currentSelection.range) return;
    
    // Hide existing toolbar but keep currentSelection
    if (highlightToolbar) {
        highlightToolbar.remove();
        highlightToolbar = null;
    }
    
    highlightToolbar = createHighlightToolbar();
    document.body.appendChild(highlightToolbar);
    
    // Position toolbar near mouse cursor
    const rect = currentSelection.range.getBoundingClientRect();
    const toolbarRect = highlightToolbar.getBoundingClientRect();
    
    let left = rect.left + (rect.width / 2) - (toolbarRect.width / 2);
    let top = rect.top - toolbarRect.height - 10;
    
    // Adjust position if toolbar would be off-screen
    if (left < 10) left = 10;
    if (left + toolbarRect.width > window.innerWidth - 10) {
        left = window.innerWidth - toolbarRect.width - 10;
    }
    if (top < 10) {
        top = rect.bottom + 10;
    }
    
    highlightToolbar.style.left = left + window.scrollX + 'px';
    highlightToolbar.style.top = top + window.scrollY + 'px';
    highlightToolbar.style.display = 'block';
}

// Create highlight toolbar element
function createHighlightToolbar() {
    const toolbar = document.createElement('div');
    toolbar.className = 'lumos-highlight-toolbar';
    toolbar.innerHTML = `
        <div class="lumos-toolbar-colors">
            <button class="lumos-color-btn" data-color="red" title="Red highlight"></button>
            <button class="lumos-color-btn" data-color="orange" title="Orange highlight"></button>
            <button class="lumos-color-btn" data-color="yellow" title="Yellow highlight"></button>
            <button class="lumos-color-btn" data-color="green" title="Green highlight"></button>
            <button class="lumos-color-btn" data-color="blue" title="Blue highlight"></button>
        </div>
    `;
    
    // Add event listeners to color buttons
    toolbar.querySelectorAll('.lumos-color-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const color = btn.dataset.color;
            applyHighlight(color);
            hideHighlightToolbar();
        });
    });
    
    return toolbar;
}

// Show remove highlight toolbar
function showRemoveHighlightToolbar(event, highlightElement) {
    console.log('showRemoveHighlightToolbar called');
    hideHighlightToolbar();
    
    highlightToolbar = document.createElement('div');
    highlightToolbar.className = 'lumos-highlight-toolbar';
    highlightToolbar.innerHTML = `
        <div class="lumos-toolbar-actions">
            <div class="lumos-color-options">
                <button class="lumos-color-btn" data-color="red" title="Red"></button>
                <button class="lumos-color-btn" data-color="orange" title="Orange"></button>
                <button class="lumos-color-btn" data-color="yellow" title="Yellow"></button>
                <button class="lumos-color-btn" data-color="green" title="Green"></button>
                <button class="lumos-color-btn" data-color="blue" title="Blue"></button>
            </div>
            <div class="lumos-separator">|</div>
            <button class="lumos-remove-btn" title="Remove highlight">Delete</button>
        </div>
    `;
    
    // Add color change listeners
    const colorBtns = highlightToolbar.querySelectorAll('.lumos-color-btn');
    colorBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const newColor = btn.dataset.color;
            changeHighlightColor(highlightElement, newColor);
            hideHighlightToolbar();
        });
    });
    
    const removeBtn = highlightToolbar.querySelector('.lumos-remove-btn');
    removeBtn.addEventListener('click', (e) => {
        console.log('Remove button clicked');
        e.stopPropagation();
        removeHighlight(highlightElement);
        hideHighlightToolbar();
    });
    
    document.body.appendChild(highlightToolbar);
    console.log('Toolbar appended to body');
    
    // Position toolbar near click
    const rect = highlightElement.getBoundingClientRect();
    const toolbarRect = highlightToolbar.getBoundingClientRect();
    
    let left = event.clientX - (toolbarRect.width / 2);
    let top = rect.top - toolbarRect.height - 10;
    
    // Adjust position if toolbar would be off-screen
    if (left < 10) left = 10;
    if (left + toolbarRect.width > window.innerWidth - 10) {
        left = window.innerWidth - toolbarRect.width - 10;
    }
    if (top < 10) {
        top = rect.bottom + 10;
    }
    
    highlightToolbar.style.left = left + window.scrollX + 'px';
    highlightToolbar.style.top = top + window.scrollY + 'px';
    highlightToolbar.style.display = 'block';
    console.log('Toolbar positioned and shown');
    
    // Keep the flag true longer to prevent immediate hiding
    setTimeout(() => {
        isShowingToolbar = false;
        console.log('Reset isShowingToolbar flag (delayed)');
    }, 300);
}

// Hide highlight toolbar
function hideHighlightToolbar() {
    if (highlightToolbar) {
        console.log('Hiding highlight toolbar');
        highlightToolbar.remove();
        highlightToolbar = null;
    }
    currentSelection = null;
}

// Apply highlight to selected text
function applyHighlight(color) {
    if (!currentSelection || !currentSelection.range) return;
    
    const range = currentSelection.range;
    const text = currentSelection.text;
    
    // Create highlight data
    const highlightData = {
        id: generateUUID(),
        timestamp: new Date().toISOString(),
        url: window.location.href,
        page_title: document.title,
        color: color,
        text: text,
        context_before: getContextBefore(range) || getBackupContext('before', range),
        context_after: getContextAfter(range) || getBackupContext('after', range),
        position: getPositionData(range)
    };
    
    // Debug: Log the highlight data to check context
    console.log('Highlight data being saved:', {
        text: highlightData.text,
        context_before: highlightData.context_before,
        context_after: highlightData.context_after,
        domain: new URL(window.location.href).hostname
    });
    
    // Apply highlight to DOM
    const highlightElement = document.createElement('span');
    highlightElement.className = `lumos-highlight lumos-highlight-${color}`;
    highlightElement.setAttribute('data-highlight-id', highlightData.id);
    highlightElement.setAttribute('data-highlight-color', color);
    
    // Apply current styles
    applyStylesToHighlight(highlightElement);
    
    try {
        // Validate range before highlighting
        if (range.collapsed) {
            console.warn('Cannot highlight collapsed range');
            return;
        }
        
        // Additional validation
        const selectedText = range.toString().trim();
        if (selectedText.length === 0) {
            console.warn('Cannot highlight empty selection');
            return;
        }
        
        // Debug logging
        console.log('Attempting to highlight:', {
            text: selectedText,
            startContainer: range.startContainer.nodeName,
            endContainer: range.endContainer.nodeName,
            startOffset: range.startOffset,
            endOffset: range.endOffset
        });
        
        // Use a more robust highlighting method
        if (!highlightRangeRobustly(range, highlightElement)) {
            console.warn('Cannot highlight this selection');
            return;
        }
        
        console.log('Highlight successfully applied');
        
        // Clear selection first to ensure UI responds properly
        window.getSelection().removeAllRanges();
        
        // Save highlight to storage (async, shouldn't block UI)
        try {
            saveHighlight(highlightData);
        } catch (error) {
            console.log('Could not save highlight to storage, but highlight applied to DOM:', error);
        }
        
    } catch (error) {
        console.error('Error applying highlight:', error);
        // Clean up any partially created elements
        if (highlightElement.parentNode) {
            highlightElement.parentNode.removeChild(highlightElement);
        }
        return;
    }
}

// Change highlight color
function changeHighlightColor(highlightElement, newColor) {
    const highlightId = highlightElement.getAttribute('data-highlight-id');
    const oldColor = highlightElement.getAttribute('data-highlight-color');
    
    if (oldColor === newColor) {
        return; // No change needed
    }
    
    // Update DOM element
    highlightElement.className = `lumos-highlight lumos-highlight-${newColor}`;
    highlightElement.setAttribute('data-highlight-color', newColor);
    
    // Apply current styles
    applyStylesToHighlight(highlightElement);
    
    // Update storage (async, non-blocking)
    setTimeout(() => {
        try {
            const domain = new URL(window.location.href).hostname;
            chrome.runtime.sendMessage({
                action: 'updateHighlightColor',
                domain: domain,
                highlightId: highlightId,
                newColor: newColor
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.log('Extension context invalidated, cannot update color in storage:', chrome.runtime.lastError.message);
                    // Keep DOM changes since they're visible to user
                }
            });
        } catch (error) {
            console.log('Extension context invalidated, cannot update color in storage:', error);
            // Keep DOM changes since they're visible to user
        }
    }, 0);
}

// Remove highlight from DOM and storage
function removeHighlight(highlightElement) {
    const highlightId = highlightElement.getAttribute('data-highlight-id');
    
    // Remove from DOM
    const parent = highlightElement.parentNode;
    while (highlightElement.firstChild) {
        parent.insertBefore(highlightElement.firstChild, highlightElement);
    }
    parent.removeChild(highlightElement);
    
    // Normalize text nodes
    parent.normalize();
    
    // Remove from storage
    deleteHighlight(highlightId);
}

// Get context before selection
function getContextBefore(range) {
    try {
        // Get the paragraph or container element
        let container = range.startContainer;
        if (container.nodeType === Node.TEXT_NODE) {
            container = container.parentElement;
        }
        
        // Find the most appropriate text container, avoiding ad containers
        const textElement = findBestTextContainer(container);
        
        // Get visible text content only
        const fullText = getVisibleTextContent(textElement);
        const selectedText = range.toString();
        const selectedIndex = fullText.indexOf(selectedText);
        
        if (selectedIndex > 0) {
            const beforeText = fullText.substring(0, selectedIndex);
            const words = beforeText.split(/\s+/).filter(word => word.trim().length > 0);
            const last30Words = words.slice(-30).join(' ');
            const cleanedText = cleanContextText(last30Words);
            console.log('Context before:', cleanedText); // Debug log
            return cleanedText;
        }
    } catch (error) {
        console.error('Error getting context before:', error);
    }
    
    return '';
}

// Get context after selection
function getContextAfter(range) {
    try {
        // Get the paragraph or container element
        let container = range.endContainer;
        if (container.nodeType === Node.TEXT_NODE) {
            container = container.parentElement;
        }
        
        // Find the most appropriate text container, avoiding ad containers
        const textElement = findBestTextContainer(container);
        
        // Get visible text content only
        const fullText = getVisibleTextContent(textElement);
        const selectedText = range.toString();
        const selectedIndex = fullText.indexOf(selectedText);
        
        if (selectedIndex >= 0) {
            const afterStartIndex = selectedIndex + selectedText.length;
            const afterText = fullText.substring(afterStartIndex);
            const words = afterText.split(/\s+/).filter(word => word.trim().length > 0);
            const first30Words = words.slice(0, 30).join(' ');
            const cleanedText = cleanContextText(first30Words);
            console.log('Context after:', cleanedText); // Debug log
            return cleanedText;
        }
    } catch (error) {
        console.error('Error getting context after:', error);
    }
    
    return '';
}

// Find the best text container, avoiding ad and script containers
function findBestTextContainer(element) {
    // List of selectors to avoid (ads, scripts, navigation, etc.)
    const avoidSelectors = [
        '[class*="ad"]', '[id*="ad"]', '[data-module*="ad"]',
        '[class*="advertisement"]', '[class*="promo"]', 
        '[class*="sponsored"]', '[class*="tracking"]',
        'script', 'style', 'noscript', 'iframe',
        'nav', 'header', 'footer', '[role="navigation"]',
        '[class*="menu"]', '[class*="sidebar"]'
    ];
    
    let current = element;
    
    // Walk up the DOM to find a good text container
    while (current && current !== document.body) {
        // Check if current element should be avoided
        const shouldAvoid = avoidSelectors.some(selector => {
            try {
                return current.matches && current.matches(selector);
            } catch (e) {
                return false;
            }
        });
        
        if (!shouldAvoid) {
            // Look for article content containers
            if (current.matches && (
                current.matches('article, main, [role="main"]') ||
                current.matches('[class*="content"], [class*="article"], [class*="story"]') ||
                current.matches('p, div.paragraph, div.text')
            )) {
                return current;
            }
        }
        
        current = current.parentElement;
    }
    
    // Fallback to original element if no better container found
    return element;
}

// Get visible text content, excluding hidden elements and scripts
function getVisibleTextContent(element) {
    if (!element) return '';
    
    let text = '';
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(node) {
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                
                // Skip hidden elements
                const style = window.getComputedStyle(parent);
                if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                    return NodeFilter.FILTER_REJECT;
                }
                
                // Skip script, style, and ad elements
                if (parent.matches('script, style, noscript, [class*="ad"], [id*="ad"]')) {
                    return NodeFilter.FILTER_REJECT;
                }
                
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );
    
    let node;
    while (node = walker.nextNode()) {
        text += node.textContent;
    }
    
    return text;
}

// Clean context text from unwanted content
function cleanContextText(text) {
    if (!text) return '';
    
    // First pass: Remove obvious code blocks and structures
    let cleaned = text
        // Remove complete JavaScript/code blocks
        .replace(/\b(function|var|let|const|if|for|while|return)\b[^.]*?[;}]/g, '')
        .replace(/window\s*[=.\[].+?[;\]]/g, '')
        .replace(/\w+\s*=\s*\w+\s*\|\|\s*[^;]+;/g, '')
        // Remove advertising patterns
        .replace(/triggerPrebid[^"']*["']?\s*[^,}]*/gi, '')
        .replace(/(labelClasses|adLocation|trackingKey|renderAd|observeFromUAC|pageId)[^,}]*/gi, '')
        // Remove JSON-like patterns
        .replace(/['"]\w+['"]:\s*[^,}]+/g, '')
        .replace(/:\s*(true|false|null|\d+)/g, '')
        // Remove URLs and paths
        .replace(/https?:\/\/[^\s"']+/g, '')
        .replace(/\/[\w\/-]+\.[\w]+/g, '')
        // Remove CSS-like content
        .replace(/[a-zA-Z-]+:\s*[^;]+;/g, '')
        .replace(/\{[^}]*\}/g, '')
        .replace(/\[[^\]]*\]/g, '')
        // Remove function calls and code structures
        .replace(/\w+\([^)]*\)/g, '')
        .replace(/\w+\.\w+/g, '')
        // Remove symbols and punctuation that are code-like
        .replace(/[{}[\]();,=&|'"]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    
    // Second pass: Keep only sentences with real words
    const words = cleaned.split(/\s+/).filter(word => {
        // Keep words that look like real English words
        return word.length >= 2 && 
               /^[a-zA-Z]/.test(word) && // Starts with letter
               !/^[A-Z]{3,}$/.test(word) && // Not all caps (likely acronym/code)
               !/\d/.test(word) && // No numbers
               word.length <= 20; // Reasonable word length
    });
    
    // Return up to 30 meaningful words
    return words.slice(0, 30).join(' ');
}

// Backup context extraction for problematic websites
function getBackupContext(direction, range) {
    try {
        const selectedText = range.toString();
        const bodyText = document.body.textContent || '';
        const selectedIndex = bodyText.indexOf(selectedText);
        
        if (selectedIndex >= 0) {
            if (direction === 'before') {
                const beforeText = bodyText.substring(Math.max(0, selectedIndex - 500), selectedIndex);
                const words = beforeText.split(/\s+/).filter(word => word.trim().length > 0);
                const contextText = words.slice(-30).join(' ');
                return cleanContextText(contextText);
            } else if (direction === 'after') {
                const afterStartIndex = selectedIndex + selectedText.length;
                const afterText = bodyText.substring(afterStartIndex, afterStartIndex + 500);
                const words = afterText.split(/\s+/).filter(word => word.trim().length > 0);
                const contextText = words.slice(0, 30).join(' ');
                return cleanContextText(contextText);
            }
        }
    } catch (error) {
        console.error('Error in backup context extraction:', error);
    }
    
    return '';
}

// Get position data for highlight
function getPositionData(range) {
    return {
        startOffset: range.startOffset,
        endOffset: range.endOffset,
        xpath: getXPath(range.commonAncestorContainer)
    };
}

// Generate XPath for element
function getXPath(element) {
    if (element.nodeType === Node.TEXT_NODE) {
        element = element.parentNode;
    }
    
    if (element.id) {
        return `//*[@id="${element.id}"]`;
    }
    
    const parts = [];
    while (element && element.nodeType === Node.ELEMENT_NODE) {
        let index = 0;
        let sibling = element.previousSibling;
        
        while (sibling) {
            if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === element.nodeName) {
                index++;
            }
            sibling = sibling.previousSibling;
        }
        
        const tagName = element.nodeName.toLowerCase();
        const part = index > 0 ? `${tagName}[${index + 1}]` : tagName;
        parts.unshift(part);
        
        element = element.parentNode;
    }
    
    return parts.length ? '/' + parts.join('/') : '';
}

// Generate UUID
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Save highlight to storage (async, non-blocking)
function saveHighlight(highlightData) {
    // Use setTimeout to make this completely async and non-blocking
    setTimeout(() => {
        try {
            const domain = new URL(window.location.href).hostname;
            
            chrome.runtime.sendMessage({
                action: 'saveHighlight',
                domain: domain,
                highlight: highlightData
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.log('Extension context invalidated, highlight saved locally:', chrome.runtime.lastError.message);
                    // Could implement local storage fallback here if needed
                }
            });
        } catch (error) {
            console.log('Extension context invalidated, cannot save highlight:', error);
        }
    }, 0);
}

// Delete highlight from storage (async, non-blocking)
function deleteHighlight(highlightId) {
    // Use setTimeout to make this completely async and non-blocking
    setTimeout(() => {
        try {
            const domain = new URL(window.location.href).hostname;
            
            chrome.runtime.sendMessage({
                action: 'deleteHighlight',
                domain: domain,
                highlightId: highlightId
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.log('Extension context invalidated, cannot delete highlight:', chrome.runtime.lastError.message);
                }
            });
        } catch (error) {
            console.log('Extension context invalidated, cannot delete highlight:', error);
        }
    }, 0);
}

// Restore highlights on page load
function restoreHighlights() {
    const domain = new URL(window.location.href).hostname;
    
    try {
        chrome.runtime.sendMessage({
            action: 'getHighlights',
            domain: domain,
            url: window.location.href
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.log('Extension context invalidated, cannot restore highlights:', chrome.runtime.lastError.message);
                return;
            }
            
            if (response && response.highlights) {
                console.log('Restoring', response.highlights.length, 'highlights');
                response.highlights.forEach(highlight => {
                    restoreHighlight(highlight);
                });
                
                // Set up DOM observer for dynamic content
                setupDOMObserver();
                
                // Retry pending highlights after a delay for dynamic content
                setTimeout(() => {
                    retryPendingHighlights();
                }, 2000);
            }
        });
    } catch (error) {
        console.log('Extension context invalidated, cannot restore highlights:', error);
    }
}

// Restore individual highlight
function restoreHighlight(highlightData) {
    console.log('Attempting to restore highlight:', highlightData);
    
    // Skip if already highlighted
    if (document.querySelector(`[data-highlight-id="${highlightData.id}"]`)) {
        console.log('Highlight already exists, skipping');
        return;
    }
    
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        // Skip text nodes that are already inside highlights
        (node) => {
            if (node.parentElement && node.parentElement.closest('.lumos-highlight')) {
                return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
        },
        false
    );
    
    let node;
    let found = false;
    while (node = walker.nextNode()) {
        const text = node.textContent;
        const highlightText = highlightData.text;
        
        if (text.includes(highlightText)) {
            console.log('Found matching text:', highlightText, 'in node:', text);
            const index = text.indexOf(highlightText);
            if (index !== -1) {
                const range = document.createRange();
                range.setStart(node, index);
                range.setEnd(node, index + highlightText.length);
                
                const highlightElement = document.createElement('span');
                highlightElement.className = `lumos-highlight lumos-highlight-${highlightData.color}`;
                highlightElement.setAttribute('data-highlight-id', highlightData.id);
                highlightElement.setAttribute('data-highlight-color', highlightData.color);
                
                // Apply current styles
                applyStylesToHighlight(highlightElement);
                
                try {
                    // Validate range before restoring
                    if (range.collapsed) {
                        console.log('Range is collapsed, skipping');
                        continue;
                    }
                    
                    range.surroundContents(highlightElement);
                    console.log('Successfully restored highlight');
                    found = true;
                    break;
                } catch (error) {
                    console.error('Error restoring highlight:', error);
                    // Clean up failed highlight element
                    if (highlightElement.parentNode) {
                        highlightElement.parentNode.removeChild(highlightElement);
                    }
                    continue;
                }
            }
        }
    }
    
    if (!found) {
        console.log('Could not find text to restore highlight:', highlightData.text);
        // Add to pending highlights for retry
        if (!pendingHighlights.find(h => h.id === highlightData.id)) {
            pendingHighlights.push(highlightData);
        }
    }
}

// Set up DOM observer for dynamic content
function setupDOMObserver() {
    if (domObserver) return; // Already set up
    
    domObserver = new MutationObserver((mutations) => {
        let shouldRetry = false;
        
        mutations.forEach(mutation => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Check if added nodes contain text content
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.TEXT_NODE || 
                        (node.nodeType === Node.ELEMENT_NODE && node.textContent.trim())) {
                        shouldRetry = true;
                    }
                });
            }
        });
        
        if (shouldRetry && pendingHighlights.length > 0) {
            // Debounce the retry to avoid too many attempts
            clearTimeout(window.retryTimeout);
            window.retryTimeout = setTimeout(() => {
                retryPendingHighlights();
            }, 500);
        }
    });
    
    domObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Retry restoring pending highlights
function retryPendingHighlights() {
    if (pendingHighlights.length === 0) return;
    
    console.log('Retrying', pendingHighlights.length, 'pending highlights');
    const stillPending = [];
    
    pendingHighlights.forEach(highlightData => {
        const wasRestored = attemptRestoreHighlight(highlightData);
        if (!wasRestored) {
            stillPending.push(highlightData);
        }
    });
    
    pendingHighlights = stillPending;
    console.log('Still pending:', pendingHighlights.length, 'highlights');
}

// Attempt to restore a highlight without adding to pending list
function attemptRestoreHighlight(highlightData) {
    // Skip if already highlighted
    if (document.querySelector(`[data-highlight-id="${highlightData.id}"]`)) {
        return true;
    }
    
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        (node) => {
            if (node.parentElement && node.parentElement.closest('.lumos-highlight')) {
                return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
        },
        false
    );
    
    let node;
    while (node = walker.nextNode()) {
        const text = node.textContent;
        const highlightText = highlightData.text;
        
        if (text.includes(highlightText)) {
            const index = text.indexOf(highlightText);
            if (index !== -1) {
                const range = document.createRange();
                range.setStart(node, index);
                range.setEnd(node, index + highlightText.length);
                
                const highlightElement = document.createElement('span');
                highlightElement.className = `lumos-highlight lumos-highlight-${highlightData.color}`;
                highlightElement.setAttribute('data-highlight-id', highlightData.id);
                highlightElement.setAttribute('data-highlight-color', highlightData.color);
                
                // Apply current styles
                applyStylesToHighlight(highlightElement);
                
                try {
                    if (!range.collapsed) {
                        range.surroundContents(highlightElement);
                        console.log('Successfully restored pending highlight:', highlightData.text);
                        return true;
                    }
                } catch (error) {
                    console.error('Error restoring pending highlight:', error);
                    if (highlightElement.parentNode) {
                        highlightElement.parentNode.removeChild(highlightElement);
                    }
                }
            }
        }
    }
    
    return false;
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'confirmRemoveAllHighlights') {
        handleRemoveAllHighlightsConfirmation();
    } else if (request.action === 'updateHighlightStyles') {
        updateHighlightStyles(request.styles);
    }
});

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
        removeAllHighlightsFromCurrentPage();
    }
}

// Remove all highlights from current page (DOM and storage)
function removeAllHighlightsFromCurrentPage() {
    const highlightElements = document.querySelectorAll('.lumos-highlight');
    const count = highlightElements.length;
    
    if (count === 0) {
        return;
    }
    
    // Remove from DOM
    highlightElements.forEach(element => {
        const parent = element.parentNode;
        if (parent) {
            // Move the text content back to parent and remove the highlight element
            parent.insertBefore(document.createTextNode(element.textContent), element);
            parent.removeChild(element);
            
            // Normalize the parent node to merge adjacent text nodes
            parent.normalize();
        }
    });
    
    // Remove from storage via background script (async, non-blocking)
    setTimeout(() => {
        try {
            const domain = new URL(window.location.href).hostname;
            chrome.runtime.sendMessage({
                action: 'removeAllHighlightsFromPage',
                domain: domain,
                url: window.location.href
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.log('Extension context invalidated, cannot remove from storage:', chrome.runtime.lastError.message);
                } else {
                    console.log('Successfully removed all highlights from page');
                }
            });
        } catch (error) {
            console.log('Extension context invalidated, cannot remove from storage:', error);
        }
    }, 0);
    
    // Hide any open toolbar
    hideHighlightToolbar();
}

// Load style settings from storage
function loadStyleSettings() {
    try {
        chrome.storage.sync.get(['lumosHighlightStyles'], function(result) {
            if (chrome.runtime.lastError) {
                console.log('Extension context invalidated, using default styles:', chrome.runtime.lastError.message);
                return;
            }
            if (result.lumosHighlightStyles) {
                currentStyles = result.lumosHighlightStyles;
                console.log('Loaded highlight styles:', currentStyles);
            }
        });
    } catch (error) {
        console.log('Extension context invalidated, using default styles:', error);
    }
}

// Update highlight styles when settings change
function updateHighlightStyles(newStyles) {
    currentStyles = newStyles;
    console.log('Updated highlight styles:', currentStyles);
    
    // Update all existing highlights with new styles
    const existingHighlights = document.querySelectorAll('.lumos-highlight');
    existingHighlights.forEach(highlight => {
        applyStylesToHighlight(highlight);
    });
}

// Robust highlighting method that handles complex ranges
function highlightRangeRobustly(range, highlightElement) {
    try {
        // First try the simple method for simple ranges
        if (range.startContainer === range.endContainer && 
            range.startContainer.nodeType === Node.TEXT_NODE) {
            range.surroundContents(highlightElement);
            return true;
        }
        
        // For complex ranges, use extractContents and insertNode
        const contents = range.extractContents();
        highlightElement.appendChild(contents);
        range.insertNode(highlightElement);
        return true;
        
    } catch (error) {
        console.warn('Standard highlighting failed, trying text-only highlighting:', error);
        
        // Fallback: Create a simple text highlight
        try {
            const selectedText = range.toString();
            if (selectedText.trim().length === 0) {
                return false;
            }
            
            // Create a text node with the selected text
            highlightElement.textContent = selectedText;
            
            // Replace the range content with our highlight
            range.deleteContents();
            range.insertNode(highlightElement);
            return true;
            
        } catch (fallbackError) {
            console.error('All highlighting methods failed:', fallbackError);
            return false;
        }
    }
}

// Apply styles to a highlight element
function applyStylesToHighlight(element) {
    // Remove existing style classes
    element.classList.remove('corner-rounded', 'bg-underline', 'bg-crayon', 'text-bold', 'text-shadow');
    
    // Apply corner style
    if (currentStyles.cornerStyle === 'rounded') {
        element.classList.add('corner-rounded');
    }
    
    // Apply background style
    if (currentStyles.backgroundStyle === 'underline') {
        element.classList.add('bg-underline');
    } else if (currentStyles.backgroundStyle === 'crayon') {
        element.classList.add('bg-crayon');
    }
    
    // Apply text style
    if (currentStyles.textStyle === 'bold') {
        element.classList.add('text-bold');
    } else if (currentStyles.textStyle === 'shadow') {
        element.classList.add('text-shadow');
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}