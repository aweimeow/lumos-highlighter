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
    
    // Set up SPA navigation detection
    setupSPANavigationDetection();
}

// Detect SPA navigation and re-restore highlights
function setupSPANavigationDetection() {
    let currentURL = window.location.href;
    
    // Listen for URL changes (SPA navigation)
    const checkURLChange = () => {
        if (window.location.href !== currentURL) {
            console.log('SPA navigation detected:', currentURL, '->', window.location.href);
            currentURL = window.location.href;
            
            // Clear existing highlights and restore for new page
            setTimeout(() => {
                restoreHighlights();
            }, 1000);
        }
    };
    
    // Use multiple detection methods for SPA navigation
    
    // Method 1: History API events
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
        originalPushState.apply(history, args);
        setTimeout(checkURLChange, 100);
    };
    
    history.replaceState = function(...args) {
        originalReplaceState.apply(history, args);
        setTimeout(checkURLChange, 100);
    };
    
    window.addEventListener('popstate', () => {
        setTimeout(checkURLChange, 100);
    });
    
    // Method 2: Periodic URL checking (fallback)
    setInterval(checkURLChange, 2000);
    
    // Method 3: Hash change detection
    window.addEventListener('hashchange', () => {
        setTimeout(checkURLChange, 100);
    });
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

// Get context before selection using multiple robust strategies
function getContextBefore(range) {
    try {
        // Strategy 1: Direct text node traversal from selection start
        const strategy1Result = getContextBeforeByTextNodeTraversal(range);
        if (strategy1Result) {
            console.log('getContextBefore - Strategy 1 (text node traversal) succeeded:', strategy1Result);
            return strategy1Result;
        }
        
        // Strategy 2: DOM walker approach
        const strategy2Result = getContextBeforeByDOMWalker(range);
        if (strategy2Result) {
            console.log('getContextBefore - Strategy 2 (DOM walker) succeeded:', strategy2Result);
            return strategy2Result;
        }
        
        // Strategy 3: Simple container-based approach (fallback)
        const strategy3Result = getContextBeforeByContainer(range);
        if (strategy3Result) {
            console.log('getContextBefore - Strategy 3 (container-based) succeeded:', strategy3Result);
            return strategy3Result;
        }
        
        console.log('getContextBefore - All strategies failed');
        return '';
    } catch (error) {
        console.error('Error getting context before:', error);
        return '';
    }
}

// Strategy 1: Direct text node traversal
function getContextBeforeByTextNodeTraversal(range) {
    try {
        const startContainer = range.startContainer;
        const startOffset = range.startOffset;
        
        let contextText = '';
        let currentNode = startContainer;
        
        // If we're in a text node, get the text before the selection
        if (currentNode.nodeType === Node.TEXT_NODE) {
            const textBefore = currentNode.textContent.substring(0, startOffset);
            contextText = textBefore + contextText;
        }
        
        // Walk backwards through text nodes to collect context
        let wordsCollected = 0;
        const maxWords = 30;
        
        while (wordsCollected < maxWords) {
            const previousTextNode = getPreviousTextNode(currentNode);
            if (!previousTextNode) break;
            
            const nodeText = previousTextNode.textContent || '';
            if (nodeText.trim().length > 0) {
                contextText = nodeText + ' ' + contextText;
                wordsCollected += nodeText.split(/\s+/).length;
            }
            
            currentNode = previousTextNode;
        }
        
        // Clean and return the last 30 words
        const words = contextText.split(/\s+/).filter(word => word.trim().length > 0);
        const result = words.slice(-30).join(' ').trim();
        
        console.log('Strategy 1 - Text node traversal result:', {
            contextLength: result.length,
            preview: result.substring(0, 100) + '...'
        });
        
        return result.length > 0 ? result : null;
    } catch (error) {
        console.error('Strategy 1 failed:', error);
        return null;
    }
}

// Strategy 2: DOM walker approach
function getContextBeforeByDOMWalker(range) {
    try {
        const startContainer = range.startContainer;
        const startOffset = range.startOffset;
        
        // Create a range that ends at our selection start
        const contextRange = document.createRange();
        contextRange.selectNodeContents(document.body);
        contextRange.setEnd(startContainer, startOffset);
        
        // Get the text content of this range
        const contextText = contextRange.toString();
        
        // Get the last 30 words
        const words = contextText.split(/\s+/).filter(word => word.trim().length > 0);
        const result = words.slice(-30).join(' ').trim();
        
        console.log('Strategy 2 - DOM walker result:', {
            contextLength: result.length,
            preview: result.substring(0, 100) + '...'
        });
        
        return result.length > 0 ? result : null;
    } catch (error) {
        console.error('Strategy 2 failed:', error);
        return null;
    }
}

// Strategy 3: Container-based approach (original logic, simplified)
function getContextBeforeByContainer(range) {
    try {
        const startContainer = range.startContainer;
        let container = startContainer.nodeType === Node.TEXT_NODE ? startContainer.parentElement : startContainer;
        
        // Try progressively larger containers
        for (let i = 0; i < 5 && container && container !== document.body; i++) {
            const fullText = container.textContent || '';
            const selectedText = range.toString();
            const selectedIndex = fullText.indexOf(selectedText);
            
            if (selectedIndex > 0) {
                const beforeText = fullText.substring(0, selectedIndex);
                const words = beforeText.split(/\s+/).filter(word => word.trim().length > 0);
                const result = words.slice(-30).join(' ').trim();
                
                if (result.length > 0) {
                    console.log('Strategy 3 - Container-based result:', {
                        containerTag: container.tagName,
                        contextLength: result.length,
                        preview: result.substring(0, 100) + '...'
                    });
                    return result;
                }
            }
            
            container = container.parentElement;
        }
        
        return null;
    } catch (error) {
        console.error('Strategy 3 failed:', error);
        return null;
    }
}

// Get context after selection using multiple robust strategies
function getContextAfter(range) {
    try {
        // Strategy 1: Direct text node traversal from selection end
        const strategy1Result = getContextAfterByTextNodeTraversal(range);
        if (strategy1Result) {
            console.log('getContextAfter - Strategy 1 (text node traversal) succeeded:', strategy1Result);
            return strategy1Result;
        }
        
        // Strategy 2: DOM walker approach
        const strategy2Result = getContextAfterByDOMWalker(range);
        if (strategy2Result) {
            console.log('getContextAfter - Strategy 2 (DOM walker) succeeded:', strategy2Result);
            return strategy2Result;
        }
        
        // Strategy 3: Simple container-based approach (fallback)
        const strategy3Result = getContextAfterByContainer(range);
        if (strategy3Result) {
            console.log('getContextAfter - Strategy 3 (container-based) succeeded:', strategy3Result);
            return strategy3Result;
        }
        
        console.log('getContextAfter - All strategies failed');
        return '';
    } catch (error) {
        console.error('Error getting context after:', error);
        return '';
    }
}

// Strategy 1: Direct text node traversal for after context
function getContextAfterByTextNodeTraversal(range) {
    try {
        const endContainer = range.endContainer;
        const endOffset = range.endOffset;
        
        let contextText = '';
        let currentNode = endContainer;
        
        // If we're in a text node, get the text after the selection
        if (currentNode.nodeType === Node.TEXT_NODE) {
            const textAfter = currentNode.textContent.substring(endOffset);
            contextText = contextText + textAfter;
        }
        
        // Walk forwards through text nodes to collect context
        let wordsCollected = 0;
        const maxWords = 30;
        
        while (wordsCollected < maxWords) {
            const nextTextNode = getNextTextNode(currentNode);
            if (!nextTextNode) break;
            
            const nodeText = nextTextNode.textContent || '';
            if (nodeText.trim().length > 0) {
                contextText = contextText + ' ' + nodeText;
                wordsCollected += nodeText.split(/\s+/).length;
            }
            
            currentNode = nextTextNode;
        }
        
        // Clean and return the first 30 words
        const words = contextText.split(/\s+/).filter(word => word.trim().length > 0);
        const result = words.slice(0, 30).join(' ').trim();
        
        console.log('Strategy 1 - Text node traversal result (after):', {
            contextLength: result.length,
            preview: result.substring(0, 100) + '...'
        });
        
        return result.length > 0 ? result : null;
    } catch (error) {
        console.error('Strategy 1 failed (after):', error);
        return null;
    }
}

// Strategy 2: DOM walker approach for after context
function getContextAfterByDOMWalker(range) {
    try {
        const endContainer = range.endContainer;
        const endOffset = range.endOffset;
        
        // Create a range that starts at our selection end and goes to the end of the document
        const contextRange = document.createRange();
        contextRange.setStart(endContainer, endOffset);
        contextRange.setEndAfter(document.body);
        
        // Get the text content of this range
        const contextText = contextRange.toString();
        
        // Get the first 30 words
        const words = contextText.split(/\s+/).filter(word => word.trim().length > 0);
        const result = words.slice(0, 30).join(' ').trim();
        
        console.log('Strategy 2 - DOM walker result (after):', {
            contextLength: result.length,
            preview: result.substring(0, 100) + '...'
        });
        
        return result.length > 0 ? result : null;
    } catch (error) {
        console.error('Strategy 2 failed (after):', error);
        return null;
    }
}

// Strategy 3: Container-based approach for after context
function getContextAfterByContainer(range) {
    try {
        const endContainer = range.endContainer;
        let container = endContainer.nodeType === Node.TEXT_NODE ? endContainer.parentElement : endContainer;
        
        // Try progressively larger containers
        for (let i = 0; i < 5 && container && container !== document.body; i++) {
            const fullText = container.textContent || '';
            const selectedText = range.toString();
            const selectedIndex = fullText.indexOf(selectedText);
            
            if (selectedIndex >= 0) {
                const afterStartIndex = selectedIndex + selectedText.length;
                const afterText = fullText.substring(afterStartIndex);
                const words = afterText.split(/\s+/).filter(word => word.trim().length > 0);
                const result = words.slice(0, 30).join(' ').trim();
                
                if (result.length > 0) {
                    console.log('Strategy 3 - Container-based result (after):', {
                        containerTag: container.tagName,
                        contextLength: result.length,
                        preview: result.substring(0, 100) + '...'
                    });
                    return result;
                }
            }
            
            container = container.parentElement;
        }
        
        return null;
    } catch (error) {
        console.error('Strategy 3 failed (after):', error);
        return null;
    }
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
    
    // First pass: Remove only obvious code/technical content but preserve regular text
    let cleaned = text
        // Remove complete JavaScript/code blocks (more conservative)
        .replace(/\b(function|var|let|const)\s+\w+\s*[=\(][^;{}]*[;}]/g, '')
        .replace(/window\s*[=.\[].+?[;\]]/g, '')
        // Remove advertising patterns (specific ones)
        .replace(/triggerPrebid[^"']*["']?\s*[^,}]*/gi, '')
        .replace(/(labelClasses|adLocation|trackingKey|renderAd|observeFromUAC|pageId)[^,}]*/gi, '')
        // Remove JSON-like patterns (more conservative)
        .replace(/['"]\w+['"]:\s*[^,}]+,?\s*/g, '')
        // Remove URLs (but keep domain names in text)
        .replace(/https?:\/\/[^\s"']+/g, '')
        // Remove CSS-like content (more conservative)
        .replace(/[a-zA-Z-]+:\s*[^;]+;\s*/g, '')
        .replace(/\{[^}]*\}/g, '')
        // Remove function calls (more conservative)
        .replace(/\w+\([^)]*\)\s*[;,]?/g, '')
        // Clean up excessive punctuation but preserve sentence structure
        .replace(/[{}[\]();,=&|'"]{2,}/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    
    // Second pass: Filter words more conservatively
    const words = cleaned.split(/\s+/).filter(word => {
        // Remove empty words
        if (!word.trim()) return false;
        
        // Keep words that contain letters (more permissive)
        return word.length >= 1 && 
               /[a-zA-Z]/.test(word) && // Contains at least one letter
               word.length <= 30; // Reasonable word length
    });
    
    // Return up to 30 meaningful words
    const result = words.slice(0, 30).join(' ');
    
    // Debug log to help troubleshoot
    console.log('cleanContextText:', {
        original: text.substring(0, 100) + '...',
        cleaned: result.substring(0, 100) + '...',
        wordsKept: words.length
    });
    
    return result;
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

// Get position data for highlight (enhanced for dynamic content)
function getPositionData(range) {
    const startContainer = range.startContainer;
    const endContainer = range.endContainer;
    
    return {
        // Traditional offset-based positioning
        startOffset: range.startOffset,
        endOffset: range.endOffset,
        
        // XPath-based positioning (more robust for dynamic content)
        startXPath: getXPath(startContainer),
        endXPath: getXPath(endContainer),
        
        // CSS selector-based positioning (fallback)
        startSelector: getCSSSelector(startContainer.nodeType === Node.TEXT_NODE ? startContainer.parentElement : startContainer),
        endSelector: getCSSSelector(endContainer.nodeType === Node.TEXT_NODE ? endContainer.parentElement : endContainer),
        
        // Text-based positioning (for verification)
        startTextIndex: getTextIndex(startContainer, range.startOffset),
        endTextIndex: getTextIndex(endContainer, range.endOffset),
        
        // DOM structure fingerprint
        domFingerprint: createDOMFingerprint(range.commonAncestorContainer),
        
        // Additional context for verification
        surroundingText: {
            before: range.startContainer.textContent?.substring(Math.max(0, range.startOffset - 50), range.startOffset) || '',
            after: range.endContainer.textContent?.substring(range.endOffset, range.endOffset + 50) || ''
        }
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

// Generate CSS selector for element
function getCSSSelector(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
        return '';
    }
    
    // Use ID if available
    if (element.id) {
        return `#${element.id}`;
    }
    
    // Build selector path
    const path = [];
    let current = element;
    
    while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
        let selector = current.tagName.toLowerCase();
        
        // Add class if available
        if (current.className && typeof current.className === 'string') {
            const classes = current.className.split(/\s+/).filter(c => c && !c.startsWith('lumos-'));
            if (classes.length > 0) {
                selector += '.' + classes.slice(0, 2).join('.');
            }
        }
        
        // Add nth-child if needed for uniqueness
        if (current.parentElement) {
            const siblings = Array.from(current.parentElement.children).filter(el => el.tagName === current.tagName);
            if (siblings.length > 1) {
                const index = siblings.indexOf(current) + 1;
                selector += `:nth-child(${index})`;
            }
        }
        
        path.unshift(selector);
        current = current.parentElement;
    }
    
    return path.join(' > ');
}

// Get text index within a larger context
function getTextIndex(container, offset) {
    if (container.nodeType === Node.TEXT_NODE) {
        // Find the text node's position within its parent's text content
        let textIndex = 0;
        let currentNode = container.parentNode.firstChild;
        
        while (currentNode && currentNode !== container) {
            if (currentNode.nodeType === Node.TEXT_NODE) {
                textIndex += currentNode.textContent.length;
            }
            currentNode = currentNode.nextSibling;
        }
        
        return textIndex + offset;
    }
    
    return offset;
}

// Create DOM structure fingerprint
function createDOMFingerprint(element) {
    if (!element) return '';
    
    const fingerprint = [];
    let current = element;
    
    // Go up the DOM tree to create a structural fingerprint
    for (let i = 0; i < 5 && current && current !== document.body; i++) {
        const tagName = current.tagName ? current.tagName.toLowerCase() : 'text';
        const className = current.className && typeof current.className === 'string' ? 
            current.className.split(/\s+/).filter(c => c && !c.startsWith('lumos-')).slice(0, 2).join('.') : '';
        
        fingerprint.unshift(`${tagName}${className ? '.' + className : ''}`);
        current = current.parentElement;
    }
    
    return fingerprint.join(' > ');
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
                console.log('Restoring', response.highlights.length, 'highlights for URL:', window.location.href);
                response.highlights.forEach(highlight => {
                    console.log('Restoring highlight:', highlight.text, 'with context:', {
                        before: highlight.context_before ? highlight.context_before.substring(0, 50) + '...' : 'none',
                        after: highlight.context_after ? highlight.context_after.substring(0, 50) + '...' : 'none'
                    });
                    restoreHighlight(highlight);
                });
                
                // Set up DOM observer for dynamic content
                setupDOMObserver();
                
                // Retry pending highlights multiple times for dynamic content
                scheduleRetryAttempts();
            }
        });
    } catch (error) {
        console.log('Extension context invalidated, cannot restore highlights:', error);
    }
}

// Restore individual highlight using multiple strategies
function restoreHighlight(highlightData) {
    console.log('Attempting to restore highlight:', highlightData);
    
    // Skip if already highlighted
    if (document.querySelector(`[data-highlight-id="${highlightData.id}"]`)) {
        console.log('Highlight already exists, skipping');
        return;
    }
    
    // Try restoration strategies in order of robustness
    const strategies = [
        { name: 'XPath-based', method: restoreHighlightWithXPath },
        { name: 'CSS selector-based', method: restoreHighlightWithSelector },
        { name: 'DOM fingerprint-based', method: restoreHighlightWithFingerprint },
        { name: 'Context-based', method: restoreHighlightWithContext },
        { name: 'Simple text matching', method: restoreHighlightSimple }
    ];
    
    for (const strategy of strategies) {
        console.log(`Trying ${strategy.name} restoration...`);
        
        if (strategy.method(highlightData)) {
            console.log(`Successfully restored highlight using ${strategy.name}`);
            return;
        }
    }
    
    console.log('Could not restore highlight with any strategy:', highlightData.text);
    // Add to pending highlights for retry
    if (!pendingHighlights.find(h => h.id === highlightData.id)) {
        pendingHighlights.push(highlightData);
    }
}

// Restore highlight using XPath (most robust for dynamic content)
function restoreHighlightWithXPath(highlightData) {
    const { text, position } = highlightData;
    
    if (!position || (!position.startXPath && !position.xpath)) {
        console.log('No XPath data available');
        return false;
    }
    
    try {
        // Try new format first, then fall back to old format
        const xpath = position.startXPath || position.xpath;
        
        const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        const targetElement = result.singleNodeValue;
        
        if (!targetElement) {
            console.log('XPath element not found:', xpath);
            return false;
        }
        
        // Find the text within the element
        const textContent = targetElement.textContent || '';
        const textIndex = textContent.indexOf(text);
        
        if (textIndex === -1) {
            console.log('Text not found in XPath element');
            return false;
        }
        
        // Create range and highlight
        const walker = document.createTreeWalker(
            targetElement,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let currentIndex = 0;
        let textNode = walker.nextNode();
        
        while (textNode) {
            const nodeLength = textNode.textContent.length;
            
            if (currentIndex + nodeLength > textIndex) {
                const startOffset = textIndex - currentIndex;
                const endOffset = Math.min(startOffset + text.length, nodeLength);
                
                if (textNode.textContent.substring(startOffset, endOffset) === text.substring(0, endOffset - startOffset)) {
                    return createHighlightElement(textNode, startOffset, text.substring(0, endOffset - startOffset), highlightData);
                }
            }
            
            currentIndex += nodeLength;
            textNode = walker.nextNode();
        }
        
        return false;
    } catch (error) {
        console.error('Error in XPath restoration:', error);
        return false;
    }
}

// Restore highlight using CSS selector
function restoreHighlightWithSelector(highlightData) {
    const { text, position } = highlightData;
    
    if (!position || !position.startSelector) {
        console.log('No CSS selector data available');
        return false;
    }
    
    try {
        const targetElement = document.querySelector(position.startSelector);
        
        if (!targetElement) {
            console.log('CSS selector element not found:', position.startSelector);
            return false;
        }
        
        // Find the text within the element
        const textContent = targetElement.textContent || '';
        const textIndex = textContent.indexOf(text);
        
        if (textIndex === -1) {
            console.log('Text not found in CSS selector element');
            return false;
        }
        
        // Create range and highlight
        const walker = document.createTreeWalker(
            targetElement,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let currentIndex = 0;
        let textNode = walker.nextNode();
        
        while (textNode) {
            const nodeLength = textNode.textContent.length;
            
            if (currentIndex + nodeLength > textIndex) {
                const startOffset = textIndex - currentIndex;
                const endOffset = Math.min(startOffset + text.length, nodeLength);
                
                if (textNode.textContent.substring(startOffset, endOffset) === text.substring(0, endOffset - startOffset)) {
                    return createHighlightElement(textNode, startOffset, text.substring(0, endOffset - startOffset), highlightData);
                }
            }
            
            currentIndex += nodeLength;
            textNode = walker.nextNode();
        }
        
        return false;
    } catch (error) {
        console.error('Error in CSS selector restoration:', error);
        return false;
    }
}

// Restore highlight using DOM fingerprint
function restoreHighlightWithFingerprint(highlightData) {
    const { text, position } = highlightData;
    
    if (!position || !position.domFingerprint) {
        console.log('No DOM fingerprint data available');
        return false;
    }
    
    try {
        // Find elements matching the fingerprint pattern
        const fingerprintParts = position.domFingerprint.split(' > ');
        const lastPart = fingerprintParts[fingerprintParts.length - 1];
        
        // Create a rough CSS selector from the fingerprint
        const selectorParts = fingerprintParts.map(part => {
            if (part.includes('.')) {
                return part.replace(/\./g, '.');
            }
            return part;
        });
        
        const candidates = document.querySelectorAll(selectorParts.join(' '));
        
        for (const candidate of candidates) {
            const textContent = candidate.textContent || '';
            const textIndex = textContent.indexOf(text);
            
            if (textIndex !== -1) {
                // Verify the context matches
                if (position.surroundingText) {
                    const beforeText = textContent.substring(Math.max(0, textIndex - 50), textIndex);
                    const afterText = textContent.substring(textIndex + text.length, textIndex + text.length + 50);
                    
                    if (beforeText.includes(position.surroundingText.before) || 
                        afterText.includes(position.surroundingText.after)) {
                        
                        // Create range and highlight
                        const walker = document.createTreeWalker(
                            candidate,
                            NodeFilter.SHOW_TEXT,
                            null,
                            false
                        );
                        
                        let currentIndex = 0;
                        let textNode = walker.nextNode();
                        
                        while (textNode) {
                            const nodeLength = textNode.textContent.length;
                            
                            if (currentIndex + nodeLength > textIndex) {
                                const startOffset = textIndex - currentIndex;
                                const endOffset = Math.min(startOffset + text.length, nodeLength);
                                
                                if (textNode.textContent.substring(startOffset, endOffset) === text.substring(0, endOffset - startOffset)) {
                                    return createHighlightElement(textNode, startOffset, text.substring(0, endOffset - startOffset), highlightData);
                                }
                            }
                            
                            currentIndex += nodeLength;
                            textNode = walker.nextNode();
                        }
                    }
                }
            }
        }
        
        return false;
    } catch (error) {
        console.error('Error in DOM fingerprint restoration:', error);
        return false;
    }
}

// Restore highlight using context for better accuracy
function restoreHighlightWithContext(highlightData) {
    const { text, context_before, context_after } = highlightData;
    
    // If we don't have context, skip this method
    if (!context_before && !context_after) {
        return false;
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
        const nodeText = node.textContent;
        
        // Find the highlight text in this node
        const highlightIndex = nodeText.indexOf(text);
        if (highlightIndex === -1) continue;
        
        // Get surrounding context from the DOM
        const contextBefore = getContextAroundNode(node, 'before', 200);
        const contextAfter = getContextAroundNode(node, 'after', 200);
        
        // Check if the context matches (fuzzy matching)
        const contextMatch = checkContextMatch(
            contextBefore, contextAfter,
            context_before, context_after
        );
        
        if (contextMatch) {
            console.log('Found highlight with matching context');
            return createHighlightElement(node, highlightIndex, text, highlightData);
        }
    }
    
    return false;
}

// Simple text matching restoration (fallback)
function restoreHighlightSimple(highlightData) {
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
        const nodeText = node.textContent;
        const highlightIndex = nodeText.indexOf(highlightData.text);
        
        if (highlightIndex !== -1) {
            console.log('Found matching text:', highlightData.text);
            return createHighlightElement(node, highlightIndex, highlightData.text, highlightData);
        }
    }
    
    return false;
}

// Get context around a text node
function getContextAroundNode(node, direction, maxLength) {
    let context = '';
    let currentNode = node;
    
    if (direction === 'before') {
        // Get text before the current node
        while (currentNode && context.length < maxLength) {
            if (currentNode.nodeType === Node.TEXT_NODE) {
                context = currentNode.textContent + context;
            }
            currentNode = getPreviousTextNode(currentNode);
        }
    } else {
        // Get text after the current node
        while (currentNode && context.length < maxLength) {
            if (currentNode.nodeType === Node.TEXT_NODE) {
                context += currentNode.textContent;
            }
            currentNode = getNextTextNode(currentNode);
        }
    }
    
    return context.trim();
}

// Get previous text node
function getPreviousTextNode(node) {
    let walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    walker.currentNode = node;
    return walker.previousNode();
}

// Get next text node
function getNextTextNode(node) {
    let walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    walker.currentNode = node;
    return walker.nextNode();
}

// Check if context matches using fuzzy matching
function checkContextMatch(actualBefore, actualAfter, expectedBefore, expectedAfter) {
    // Simple fuzzy matching - check if we have some overlap
    const beforeMatch = expectedBefore ? 
        actualBefore.toLowerCase().includes(expectedBefore.toLowerCase().slice(-50)) ||
        expectedBefore.toLowerCase().includes(actualBefore.toLowerCase().slice(-50)) : true;
    
    const afterMatch = expectedAfter ? 
        actualAfter.toLowerCase().includes(expectedAfter.toLowerCase().slice(0, 50)) ||
        expectedAfter.toLowerCase().includes(actualAfter.toLowerCase().slice(0, 50)) : true;
    
    return beforeMatch && afterMatch;
}

// Create highlight element at specified position
function createHighlightElement(node, index, text, highlightData) {
    try {
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + text.length);
        
        if (range.collapsed) {
            console.log('Range is collapsed, skipping');
            return false;
        }
        
        const highlightElement = document.createElement('span');
        highlightElement.className = `lumos-highlight lumos-highlight-${highlightData.color}`;
        highlightElement.setAttribute('data-highlight-id', highlightData.id);
        highlightElement.setAttribute('data-highlight-color', highlightData.color);
        
        // Apply current styles
        applyStylesToHighlight(highlightElement);
        
        range.surroundContents(highlightElement);
        return true;
    } catch (error) {
        console.error('Error creating highlight element:', error);
        return false;
    }
}

// Schedule retry attempts for dynamic content
function scheduleRetryAttempts() {
    // Multiple retry intervals to handle different types of dynamic content
    const retryIntervals = [500, 1000, 2000, 3000, 5000, 8000, 12000];
    
    retryIntervals.forEach((interval, index) => {
        setTimeout(() => {
            if (pendingHighlights.length > 0) {
                console.log(`Retry attempt ${index + 1}/${retryIntervals.length} after ${interval}ms`);
                retryPendingHighlights();
                
                // Additional check for common dynamic content indicators
                if (index === retryIntervals.length - 1 && pendingHighlights.length > 0) {
                    console.log('Final retry attempt - checking for lazy-loaded content');
                    waitForLazyContent().then(() => {
                        setTimeout(() => retryPendingHighlights(), 1000);
                    });
                }
            }
        }, interval);
    });
}

// Wait for lazy-loaded content
async function waitForLazyContent() {
    return new Promise((resolve) => {
        // Check for common lazy loading indicators
        const checkForContent = () => {
            const commonSelectors = [
                '[data-lazy-loaded]',
                '[data-testid]',
                '.loaded',
                '[aria-live]',
                '[data-react-element]'
            ];
            
            for (const selector of commonSelectors) {
                if (document.querySelector(selector)) {
                    console.log('Detected potential dynamic content:', selector);
                    break;
                }
            }
            
            resolve();
        };
        
        // Use Intersection Observer to detect when content is loaded
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setTimeout(checkForContent, 500);
                    observer.disconnect();
                }
            });
        });
        
        // Observe the main content area
        const mainContent = document.querySelector('main, #main, .main, [role="main"]') || document.body;
        observer.observe(mainContent);
        
        // Fallback timeout
        setTimeout(() => {
            observer.disconnect();
            resolve();
        }, 3000);
    });
}

// Set up DOM observer for dynamic content
function setupDOMObserver() {
    if (domObserver) return; // Already set up
    
    domObserver = new MutationObserver((mutations) => {
        let shouldRetry = false;
        let significantChange = false;
        
        mutations.forEach(mutation => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Check if added nodes contain text content
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.TEXT_NODE || 
                        (node.nodeType === Node.ELEMENT_NODE && node.textContent.trim())) {
                        shouldRetry = true;
                        
                        // Check for significant content additions
                        if (node.nodeType === Node.ELEMENT_NODE && node.textContent.length > 100) {
                            significantChange = true;
                        }
                    }
                });
            }
        });
        
        if (shouldRetry && pendingHighlights.length > 0) {
            // Debounce the retry to avoid too many attempts
            clearTimeout(window.retryTimeout);
            
            // Use shorter timeout for significant changes
            const timeout = significantChange ? 100 : 200;
            
            window.retryTimeout = setTimeout(() => {
                console.log('DOM change detected, retrying highlight restoration');
                retryPendingHighlights();
            }, timeout);
        }
    });
    
    domObserver.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true // Also watch for text changes
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
    
    // Try restoration strategies in order of robustness
    const strategies = [
        { name: 'XPath-based', method: restoreHighlightWithXPath },
        { name: 'CSS selector-based', method: restoreHighlightWithSelector },
        { name: 'DOM fingerprint-based', method: restoreHighlightWithFingerprint },
        { name: 'Context-based', method: restoreHighlightWithContext },
        { name: 'Simple text matching', method: restoreHighlightSimple }
    ];
    
    for (const strategy of strategies) {
        if (strategy.method(highlightData)) {
            console.log(`Successfully restored pending highlight using ${strategy.name}:`, highlightData.text);
            return true;
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