// Content script for Lumos Highlighter
// Handles text selection, highlight rendering, and DOM interactions

console.log('Lumos Highlighter content script loaded');

let highlightToolbar = null;
let currentSelection = null;
let isShowingToolbar = false;
let pendingHighlights = [];
let domObserver = null;
let lastClickTime = 0;
let clickCount = 0;
let isDoubleClickDragMode = false;
let currentStyles = {
    cornerStyle: 'rectangular',
    backgroundStyle: 'transparent',
    textStyle: 'default',
    highlightMode: 'instant'
};

// Initialize content script
function init() {
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('click', handleClick);
    document.addEventListener('dblclick', handleDoubleClick);
    
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
            // Reset double-click mode
            isDoubleClickDragMode = false;
            return;
        }
        
        const selectedText = selection.toString().trim();
        if (selectedText.length < 3) { // Minimum text length for highlighting
            if (!isShowingToolbar) {
                hideHighlightToolbar();
            }
            return;
        }
        
        const range = selection.getRangeAt(0);
        
        // Check if selection is inside an already highlighted element
        const commonAncestor = range.commonAncestorContainer;
        const parentElement = commonAncestor.nodeType === Node.TEXT_NODE ? commonAncestor.parentElement : commonAncestor;
        
        if (parentElement && parentElement.closest('.lumos-highlight')) {
            // Don't hide if we're showing a remove toolbar
            if (!isShowingToolbar) {
                hideHighlightToolbar();
            }
            return;
        }
        
        // Check if this is a cross-element selection (spans multiple elements)
        if (isCrossElementSelection(range)) {
            console.log('Cross-element selection detected, skipping highlight toolbar');
            if (!isShowingToolbar) {
                hideHighlightToolbar();
            }
            return;
        }
        
        // Check highlight mode - only show toolbar in appropriate conditions
        if (currentStyles.highlightMode === 'doubleclick' && !isDoubleClickDragMode) {
            // In double-click mode, only show toolbar if we're in double-click drag mode
            console.log('Double-click mode active, waiting for double-click');
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

// Check if a selection spans across multiple elements
function isCrossElementSelection(range) {
    try {
        // If start and end containers are different, it might be cross-element
        if (range.startContainer !== range.endContainer) {
            
            // But first check if they're both text nodes in the same parent
            if (range.startContainer.nodeType === Node.TEXT_NODE && 
                range.endContainer.nodeType === Node.TEXT_NODE) {
                
                const startParent = range.startContainer.parentElement;
                const endParent = range.endContainer.parentElement;
                
                // If both text nodes have the same immediate parent, it's likely safe
                if (startParent === endParent) {
                    return false;
                }
                
                // If parents are very close (same paragraph), might be okay
                if (startParent && endParent) {
                    const commonParent = getCommonParent(startParent, endParent);
                    if (commonParent && (
                        commonParent.tagName === 'P' || 
                        commonParent.tagName === 'DIV' || 
                        commonParent.tagName === 'SPAN'
                    )) {
                        return false;
                    }
                }
            }
            
            console.log('Cross-element selection detected:', {
                startContainer: range.startContainer.nodeName,
                endContainer: range.endContainer.nodeName,
                startParent: range.startContainer.parentElement?.tagName,
                endParent: range.endContainer.parentElement?.tagName
            });
            
            return true;
        }
        
        return false;
        
    } catch (error) {
        console.warn('Error checking cross-element selection:', error);
        return true; // Err on the side of caution
    }
}

// Find the closest common parent element
function getCommonParent(element1, element2) {
    if (!element1 || !element2) return null;
    
    // Get all ancestors of element1
    const ancestors1 = [];
    let current = element1;
    while (current && current !== document.body) {
        ancestors1.push(current);
        current = current.parentElement;
    }
    
    // Find the first common ancestor with element2
    current = element2;
    while (current && current !== document.body) {
        if (ancestors1.includes(current)) {
            return current;
        }
        current = current.parentElement;
    }
    
    return null;
}

// Handle double click for double-click mode
function handleDoubleClick(event) {
    if (currentStyles.highlightMode === 'doubleclick') {
        console.log('Double-click detected, entering drag mode');
        isDoubleClickDragMode = true;
        
        // Set a timeout to reset the mode if no drag happens
        setTimeout(() => {
            if (isDoubleClickDragMode && !window.getSelection().toString().trim()) {
                isDoubleClickDragMode = false;
                console.log('Double-click mode timeout, resetting');
            }
        }, 3000); // 3 second timeout
    }
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
    
    // Find all parts of this highlight (in case it spans multiple elements)
    const allParts = document.querySelectorAll(`[data-highlight-id="${highlightId}"]`);
    
    // Update all parts of the highlight
    allParts.forEach(part => {
        part.className = `lumos-highlight lumos-highlight-${newColor}`;
        part.setAttribute('data-highlight-color', newColor);
        
        // Apply current styles
        applyStylesToHighlight(part);
    });
    
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
    
    // Find all parts of this highlight (in case it spans multiple elements)
    const allParts = document.querySelectorAll(`[data-highlight-id="${highlightId}"]`);
    
    // Remove all parts from DOM
    allParts.forEach(part => {
        const parent = part.parentNode;
        if (parent) {
            while (part.firstChild) {
                parent.insertBefore(part.firstChild, part);
            }
            parent.removeChild(part);
            
            // Normalize text nodes for each parent
            parent.normalize();
        }
    });
    
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

// Strategy 1: Local text node traversal (limited scope)
function getContextBeforeByTextNodeTraversal(range) {
    try {
        const startContainer = range.startContainer;
        const startOffset = range.startOffset;
        
        // Find the content container to limit our search scope
        const contentContainer = findNearestContentContainer(startContainer);
        if (!contentContainer) {
            console.log('Strategy 1 - No content container found for traversal');
            return null;
        }
        
        let contextText = '';
        let currentNode = startContainer;
        
        // If we're in a text node, get the text before the selection
        if (currentNode.nodeType === Node.TEXT_NODE) {
            const textBefore = currentNode.textContent.substring(0, startOffset);
            contextText = textBefore + contextText;
        }
        
        // Walk backwards through text nodes but stay within the content container
        let wordsCollected = 0;
        const maxWords = 30;
        let nodesTraversed = 0;
        const maxNodes = 20; // Limit the number of nodes to traverse
        
        while (wordsCollected < maxWords && nodesTraversed < maxNodes) {
            const previousTextNode = getPreviousTextNodeInContainer(currentNode, contentContainer);
            if (!previousTextNode) break;
            
            const nodeText = previousTextNode.textContent || '';
            if (nodeText.trim().length > 0 && !isNonContentText(nodeText)) {
                contextText = nodeText + ' ' + contextText;
                wordsCollected += nodeText.split(/\s+/).length;
            }
            
            currentNode = previousTextNode;
            nodesTraversed++;
        }
        
        // Clean and return the last 30 words
        const words = contextText.split(/\s+/).filter(word => word.trim().length > 0);
        const result = words.slice(-30).join(' ').trim();
        
        console.log('Strategy 1 - Local text node result:', {
            containerTag: contentContainer.tagName,
            nodesTraversed: nodesTraversed,
            contextLength: result.length,
            preview: result.substring(0, 100) + '...'
        });
        
        return result.length > 0 ? result : null;
    } catch (error) {
        console.error('Strategy 1 failed:', error);
        return null;
    }
}

// Strategy 2: Local content area approach (more focused)
function getContextBeforeByDOMWalker(range) {
    try {
        const startContainer = range.startContainer;
        const startOffset = range.startOffset;
        
        // Find the closest content container (article, main, or paragraph-like element)
        const contentContainer = findNearestContentContainer(startContainer);
        
        if (!contentContainer) {
            console.log('Strategy 2 - No content container found');
            return null;
        }
        
        // Create a range within the content container that ends at our selection start
        const contextRange = document.createRange();
        contextRange.setStart(contentContainer, 0);
        contextRange.setEnd(startContainer, startOffset);
        
        // Get the text content of this limited range
        const contextText = contextRange.toString();
        
        // Get the last 30 words from the content area only
        const words = contextText.split(/\s+/).filter(word => word.trim().length > 0);
        const result = words.slice(-30).join(' ').trim();
        
        console.log('Strategy 2 - Local content result:', {
            containerTag: contentContainer.tagName,
            containerClass: contentContainer.className,
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

// Strategy 1: Local text node traversal for after context (limited scope)
function getContextAfterByTextNodeTraversal(range) {
    try {
        const endContainer = range.endContainer;
        const endOffset = range.endOffset;
        
        // Find the content container to limit our search scope
        const contentContainer = findNearestContentContainer(endContainer);
        if (!contentContainer) {
            console.log('Strategy 1 - No content container found for traversal (after)');
            return null;
        }
        
        let contextText = '';
        let currentNode = endContainer;
        
        // If we're in a text node, get the text after the selection
        if (currentNode.nodeType === Node.TEXT_NODE) {
            const textAfter = currentNode.textContent.substring(endOffset);
            contextText = contextText + textAfter;
        }
        
        // Walk forwards through text nodes but stay within the content container
        let wordsCollected = 0;
        const maxWords = 30;
        let nodesTraversed = 0;
        const maxNodes = 20; // Limit the number of nodes to traverse
        
        while (wordsCollected < maxWords && nodesTraversed < maxNodes) {
            const nextTextNode = getNextTextNodeInContainer(currentNode, contentContainer);
            if (!nextTextNode) break;
            
            const nodeText = nextTextNode.textContent || '';
            if (nodeText.trim().length > 0 && !isNonContentText(nodeText)) {
                contextText = contextText + ' ' + nodeText;
                wordsCollected += nodeText.split(/\s+/).length;
            }
            
            currentNode = nextTextNode;
            nodesTraversed++;
        }
        
        // Clean and return the first 30 words
        const words = contextText.split(/\s+/).filter(word => word.trim().length > 0);
        const result = words.slice(0, 30).join(' ').trim();
        
        console.log('Strategy 1 - Local text node result (after):', {
            containerTag: contentContainer.tagName,
            nodesTraversed: nodesTraversed,
            contextLength: result.length,
            preview: result.substring(0, 100) + '...'
        });
        
        return result.length > 0 ? result : null;
    } catch (error) {
        console.error('Strategy 1 failed (after):', error);
        return null;
    }
}

// Strategy 2: Local content area approach for after context
function getContextAfterByDOMWalker(range) {
    try {
        const endContainer = range.endContainer;
        const endOffset = range.endOffset;
        
        // Find the closest content container (article, main, or paragraph-like element)
        const contentContainer = findNearestContentContainer(endContainer);
        
        if (!contentContainer) {
            console.log('Strategy 2 - No content container found (after)');
            return null;
        }
        
        // Create a range within the content container that starts at our selection end
        const contextRange = document.createRange();
        contextRange.setStart(endContainer, endOffset);
        contextRange.setEnd(contentContainer, contentContainer.childNodes.length);
        
        // Get the text content of this limited range
        const contextText = contextRange.toString();
        
        // Get the first 30 words from the content area only
        const words = contextText.split(/\s+/).filter(word => word.trim().length > 0);
        const result = words.slice(0, 30).join(' ').trim();
        
        console.log('Strategy 2 - Local content result (after):', {
            containerTag: contentContainer.tagName,
            containerClass: contentContainer.className,
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

// Find the nearest content container (more focused than findBestTextContainer)
function findNearestContentContainer(element) {
    let current = element.nodeType === Node.TEXT_NODE ? element.parentElement : element;
    
    // Priority selectors for content containers
    const contentSelectors = [
        'article',
        'main',
        '[role="main"]',
        '.article',
        '.content',
        '.post',
        '.entry',
        '.story',
        'section',
        'div.text',
        'div[class*="content"]',
        'div[class*="article"]',
        'div[class*="post"]',
        'div[class*="story"]',
        'p' // Even a single paragraph can be a content container
    ];
    
    // Avoid these containers
    const avoidSelectors = [
        'header', 'footer', 'nav', 'aside',
        '[class*="ad"]', '[id*="ad"]', '[class*="advertisement"]',
        '[class*="menu"]', '[class*="sidebar"]', '[class*="navigation"]',
        '[class*="comment"]', '[class*="reply"]'
    ];
    
    // Walk up the DOM tree to find a content container
    while (current && current !== document.body) {
        // Skip if this element should be avoided
        const shouldAvoid = avoidSelectors.some(selector => {
            try {
                return current.matches && current.matches(selector);
            } catch (e) {
                return false;
            }
        });
        
        if (!shouldAvoid) {
            // Check if this element matches content selectors
            const isContentContainer = contentSelectors.some(selector => {
                try {
                    return current.matches && current.matches(selector);
                } catch (e) {
                    return false;
                }
            });
            
            if (isContentContainer) {
                // Additional validation: make sure it has substantial text content
                const textLength = (current.textContent || '').trim().length;
                if (textLength > 50) { // At least 50 characters
                    console.log('Found content container:', {
                        tag: current.tagName,
                        class: current.className,
                        textLength: textLength
                    });
                    return current;
                }
            }
        }
        
        current = current.parentElement;
    }
    
    // Fallback: find the immediate paragraph or div container
    current = element.nodeType === Node.TEXT_NODE ? element.parentElement : element;
    while (current && current !== document.body) {
        if (current.tagName === 'P' || current.tagName === 'DIV') {
            const textLength = (current.textContent || '').trim().length;
            if (textLength > 20) {
                return current;
            }
        }
        current = current.parentElement;
    }
    
    return null;
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
    
    try {
        // Use ID if available and valid
        if (element.id && isValidCSSIdentifier(element.id)) {
            return `#${element.id}`;
        }
        
        // Build selector path
        const path = [];
        let current = element;
        let depth = 0;
        const maxDepth = 10; // Limit selector depth
        
        while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body && depth < maxDepth) {
            let selector = current.tagName.toLowerCase();
            
            // Add class if available and valid
            if (current.className && typeof current.className === 'string') {
                const classes = current.className.split(/\s+/)
                    .filter(c => c && !c.startsWith('lumos-') && isValidCSSIdentifier(c))
                    .slice(0, 2); // Limit to 2 classes
                
                if (classes.length > 0) {
                    selector += '.' + classes.join('.');
                }
            }
            
            // Add nth-child if needed for uniqueness (but limit complexity)
            if (current.parentElement && depth < 3) {
                const siblings = Array.from(current.parentElement.children).filter(el => el.tagName === current.tagName);
                if (siblings.length > 1 && siblings.length < 20) { // Don't use nth-child for very large lists
                    const index = siblings.indexOf(current) + 1;
                    selector += `:nth-child(${index})`;
                }
            }
            
            path.unshift(selector);
            current = current.parentElement;
            depth++;
        }
        
        const fullSelector = path.join(' > ');
        
        // Validate the selector before returning
        try {
            document.querySelector(fullSelector);
            return fullSelector;
        } catch (error) {
            // Silent warning for invalid selectors - common with dynamic content
            console.log('Generated invalid CSS selector, trying fallback:', fullSelector.length > 50 ? 'too long' : fullSelector);
            
            // Fallback: Try a simpler selector with just tag names
            const simplePath = [];
            let fallbackCurrent = element;
            let fallbackDepth = 0;
            
            while (fallbackCurrent && fallbackCurrent.nodeType === Node.ELEMENT_NODE && 
                   fallbackCurrent !== document.body && fallbackDepth < 5) {
                simplePath.unshift(fallbackCurrent.tagName.toLowerCase());
                fallbackCurrent = fallbackCurrent.parentElement;
                fallbackDepth++;
            }
            
            const simpleSelector = simplePath.join(' > ');
            
            try {
                document.querySelector(simpleSelector);
                console.log('Using fallback selector:', simpleSelector);
                return simpleSelector;
            } catch (fallbackError) {
                // Silent fail - this is expected for complex dynamic pages
                return ''; // Return empty string for invalid selectors
            }
        }
        
    } catch (error) {
        console.error('Error generating CSS selector:', error);
        return '';
    }
}

// Check if a string is a valid CSS identifier
function isValidCSSIdentifier(str) {
    if (!str || typeof str !== 'string') return false;
    
    // CSS identifier can contain letters, digits, hyphens, underscores
    // Must not start with a digit or two hyphens
    // Must not contain special characters that would break selectors
    const validPattern = /^[a-zA-Z_][\w-]*$/;
    const invalidChars = /[+(){}[\]="'<>.,!@#$%^&*|\\/?]/;
    
    // Additional check for problematic characters commonly found in generated class names
    const hasEquals = str.includes('=');
    const hasPlus = str.includes('+');
    const hasSpecialChars = /[^a-zA-Z0-9_-]/.test(str);
    
    if (hasEquals || hasPlus || hasSpecialChars) {
        // Silent fail for invalid CSS identifiers - this is common with generated class names
        return false;
    }
    
    return validPattern.test(str) && !invalidChars.test(str) && !str.startsWith('--');
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

// Restore individual highlight using a robust text-based approach
function restoreHighlight(highlightData) {
    console.log('🔄 Attempting to restore highlight:', {
        text: highlightData.text.substring(0, 50) + '...',
        textLength: highlightData.text.length,
        color: highlightData.color,
        id: highlightData.id,
        context_before: highlightData.context_before ? highlightData.context_before.substring(0, 30) + '...' : 'none',
        context_after: highlightData.context_after ? highlightData.context_after.substring(0, 30) + '...' : 'none',
        url: highlightData.url
    });
    
    // Skip if already highlighted
    if (document.querySelector(`[data-highlight-id="${highlightData.id}"]`)) {
        console.log('✅ Highlight already exists, skipping');
        return;
    }
    
    // Log current page context for debugging
    console.log('📄 Current page context:', {
        url: window.location.href,
        title: document.title,
        bodyTextLength: document.body.textContent.length,
        firstTextNodes: getAllTextNodes().slice(0, 3).map(node => node.textContent.substring(0, 50) + '...')
    });
    
    // Use a simple but robust text-based approach
    const success = restoreHighlightByTextContent(highlightData);
    
    if (success) {
        console.log('✅ Successfully restored highlight:', highlightData.text.substring(0, 30) + '...');
        return;
    }
    
    console.log('❌ Could not restore highlight:', {
        text: highlightData.text,
        textLength: highlightData.text.length,
        possibleReasons: [
            'Text may have been modified on the page',
            'Text may be dynamically loaded',
            'Text may be split across multiple elements',
            'Text formatting may have changed'
        ]
    });
    
    // Add to pending highlights for retry
    if (!pendingHighlights.find(h => h.id === highlightData.id)) {
        pendingHighlights.push(highlightData);
        console.log('➕ Added to pending highlights queue, total pending:', pendingHighlights.length);
    }
}

// Find text matches using multiple strategies
function findTextMatches(nodeText, targetText, node) {
    const matches = [];
    
    console.log('🔍 Finding text matches:', {
        targetText: targetText.substring(0, 50) + '...',
        nodeText: nodeText.substring(0, 100) + '...',
        nodeLength: nodeText.length,
        targetLength: targetText.length
    });
    
    // Strategy 1: Exact match
    let index = nodeText.indexOf(targetText);
    if (index !== -1) {
        console.log('✅ Exact match found at index:', index);
        matches.push({
            node: node,
            index: index,
            score: 100, // Highest score for exact match
            strategy: 'exact'
        });
        return matches; // Return early for exact match
    }
    
    // Strategy 2: Case-insensitive exact match
    const lowerNodeText = nodeText.toLowerCase();
    const lowerTargetText = targetText.toLowerCase();
    index = lowerNodeText.indexOf(lowerTargetText);
    if (index !== -1) {
        console.log('✅ Case-insensitive match found at index:', index);
        matches.push({
            node: node,
            index: index,
            score: 95,
            strategy: 'case-insensitive'
        });
        return matches;
    }
    
    // Strategy 3: Normalized match (remove extra whitespace)
    const normalizedNodeText = normalizeText(nodeText);
    const normalizedTargetText = normalizeText(targetText);
    
    console.log('🔍 Normalized matching:', {
        normalizedTarget: normalizedTargetText.substring(0, 50) + '...',
        normalizedNode: normalizedNodeText.substring(0, 100) + '...'
    });
    
    index = normalizedNodeText.indexOf(normalizedTargetText);
    if (index !== -1) {
        // Find the original position in unnormalized text
        const originalIndex = findOriginalIndex(nodeText, normalizedNodeText, index);
        if (originalIndex !== -1) {
            console.log('✅ Normalized match found at original index:', originalIndex);
            matches.push({
                node: node,
                index: originalIndex,
                score: 90,
                strategy: 'normalized'
            });
        }
    }
    
    // Strategy 4: Character-based partial matching (language-agnostic)
    const charNormalizedNodeText = normalizeTextForMatching(nodeText);
    const charNormalizedTargetText = normalizeTextForMatching(targetText);
    
    // Try to find the target text with flexible character matching
    if (charNormalizedTargetText.length >= 6) {
        // Look for substrings of the target text
        const targetLength = charNormalizedTargetText.length;
        
        // Try matching with different substring lengths
        for (let subLength = Math.max(6, Math.floor(targetLength * 0.7)); subLength <= targetLength; subLength++) {
            for (let subStart = 0; subStart <= targetLength - subLength; subStart++) {
                const substring = charNormalizedTargetText.substring(subStart, subStart + subLength);
                const foundIndex = charNormalizedNodeText.indexOf(substring);
                
                if (foundIndex !== -1) {
                    // Map back to original text position
                    const originalIndex = mapNormalizedToOriginal(nodeText, charNormalizedNodeText, foundIndex);
                    
                    if (originalIndex !== -1) {
                        const coverage = subLength / targetLength;
                        console.log('✅ Character-based partial match:', {
                            substring: substring.substring(0, 30) + '...',
                            coverage: (coverage * 100).toFixed(1) + '%',
                            index: originalIndex
                        });
                        matches.push({
                            node: node,
                            index: originalIndex,
                            score: Math.round(70 * coverage), // Score based on coverage
                            strategy: 'character-partial'
                        });
                    }
                }
            }
        }
    }
    
    // Strategy 5: Fuzzy match (allow small differences)
    console.log('🔍 Attempting fuzzy matching...');
    const fuzzyMatches = findFuzzyMatches(nodeText, targetText);
    matches.push(...fuzzyMatches.map(match => ({
        ...match,
        node: node,
        score: Math.round(70 * match.similarity), // Scale similarity to score
        strategy: 'fuzzy'
    })));
    
    // Strategy 6: Very flexible matching for severely fragmented text
    if (matches.length === 0 && targetText.length >= 10) {
        console.log('🔍 Attempting very flexible matching for fragmented text...');
        
        // Break target into smaller chunks and look for any of them
        const chunkSize = Math.max(5, Math.floor(targetText.length / 3));
        for (let i = 0; i <= targetText.length - chunkSize; i += Math.floor(chunkSize / 2)) {
            const chunk = targetText.substring(i, i + chunkSize).trim();
            if (chunk.length >= 5) {
                const chunkIndex = nodeText.toLowerCase().indexOf(chunk.toLowerCase());
                if (chunkIndex !== -1) {
                    console.log('✅ Flexible chunk match:', {
                        chunk: chunk,
                        index: chunkIndex
                    });
                    matches.push({
                        node: node,
                        index: chunkIndex,
                        score: 40, // Low score for chunk matches
                        strategy: 'chunk'
                    });
                }
            }
        }
    }
    
    console.log('📊 Total matches found:', matches.length);
    return matches;
}

// Normalize text by removing extra whitespace and standardizing
function normalizeText(text) {
    return text
        .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
        .replace(/\n/g, ' ')   // Replace newlines with spaces
        .replace(/\t/g, ' ')   // Replace tabs with spaces
        .trim();
}

// Find the original index in unnormalized text
function findOriginalIndex(originalText, normalizedText, normalizedIndex) {
    let originalIndex = 0;
    let normalizedPos = 0;
    
    while (originalIndex < originalText.length && normalizedPos < normalizedIndex) {
        const originalChar = originalText[originalIndex];
        
        // Skip whitespace characters that were normalized
        if (/\s/.test(originalChar)) {
            // Skip consecutive whitespace in original
            while (originalIndex < originalText.length && /\s/.test(originalText[originalIndex])) {
                originalIndex++;
            }
            // Count as one space in normalized
            normalizedPos++;
        } else {
            originalIndex++;
            normalizedPos++;
        }
    }
    
    return normalizedPos === normalizedIndex ? originalIndex : -1;
}

// Find fuzzy matches (allowing small differences)
function findFuzzyMatches(nodeText, targetText) {
    const matches = [];
    const targetWords = targetText.split(/\s+/).filter(word => word.trim().length > 0);
    const nodeWords = nodeText.split(/\s+/).filter(word => word.trim().length > 0);
    
    console.log('🔍 Fuzzy matching:', {
        targetText: targetText.substring(0, 50) + '...',
        targetWords: targetWords,
        nodeText: nodeText.substring(0, 100) + '...',
        nodeWordsCount: nodeWords.length
    });
    
    // Strategy 1: Look for exact word sequences
    for (let i = 0; i <= nodeWords.length - targetWords.length; i++) {
        const nodeSequence = nodeWords.slice(i, i + targetWords.length);
        const similarity = calculateSimilarity(nodeSequence, targetWords);
        
        if (similarity > 0.8) { // 80% similarity threshold
            const sequenceText = nodeSequence.join(' ');
            const startIndex = nodeText.indexOf(sequenceText);
            if (startIndex !== -1) {
                console.log('✅ Fuzzy sequence match:', {
                    similarity: similarity,
                    sequence: sequenceText.substring(0, 30) + '...',
                    startIndex: startIndex
                });
                matches.push({
                    index: startIndex,
                    similarity: similarity
                });
            }
        }
    }
    
    // Strategy 2: Look for partial sequences (especially useful for fragmented text)
    if (targetWords.length >= 2) {
        // Try smaller subsequences
        for (let seqLength = Math.max(2, Math.floor(targetWords.length * 0.6)); seqLength >= 2; seqLength--) {
            for (let startPos = 0; startPos <= targetWords.length - seqLength; startPos++) {
                const targetSubsequence = targetWords.slice(startPos, startPos + seqLength);
                
                for (let i = 0; i <= nodeWords.length - seqLength; i++) {
                    const nodeSubsequence = nodeWords.slice(i, i + seqLength);
                    const similarity = calculateSimilarity(nodeSubsequence, targetSubsequence);
                    
                    if (similarity > 0.7) { // Lower threshold for partial matches
                        const sequenceText = nodeSubsequence.join(' ');
                        const startIndex = nodeText.indexOf(sequenceText);
                        if (startIndex !== -1) {
                            console.log('✅ Fuzzy partial match:', {
                                similarity: similarity,
                                subsequence: sequenceText.substring(0, 30) + '...',
                                startIndex: startIndex,
                                seqLength: seqLength
                            });
                            matches.push({
                                index: startIndex,
                                similarity: similarity * 0.9 // Slight penalty for partial match
                            });
                        }
                    }
                }
            }
        }
    }
    
    // Strategy 3: Look for individual significant words (for very fragmented text)
    targetWords.forEach((targetWord, wordIndex) => {
        if (targetWord.length >= 4) { // Only check longer words
            nodeWords.forEach((nodeWord, nodeIndex) => {
                const wordSimilarity = calculateWordSimilarity(nodeWord, targetWord);
                if (wordSimilarity > 0.8) {
                    const wordIndex = nodeText.indexOf(nodeWord);
                    if (wordIndex !== -1) {
                        console.log('✅ Fuzzy word match:', {
                            similarity: wordSimilarity,
                            nodeWord: nodeWord,
                            targetWord: targetWord,
                            startIndex: wordIndex
                        });
                        matches.push({
                            index: wordIndex,
                            similarity: wordSimilarity * 0.6 // Lower weight for individual words
                        });
                    }
                }
            });
        }
    });
    
    // Remove duplicates and sort by similarity
    const uniqueMatches = [];
    const seen = new Set();
    
    matches
        .sort((a, b) => b.similarity - a.similarity)
        .forEach(match => {
            const key = match.index;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueMatches.push(match);
            }
        });
    
    console.log('📊 Fuzzy matches found:', uniqueMatches.length);
    return uniqueMatches.slice(0, 3); // Return top 3 fuzzy matches
}

// Calculate word-level similarity (more forgiving than character-level)
function calculateWordSimilarity(word1, word2) {
    if (word1 === word2) return 1.0;
    
    const normalized1 = word1.toLowerCase().replace(/[^\w]/g, '');
    const normalized2 = word2.toLowerCase().replace(/[^\w]/g, '');
    
    if (normalized1 === normalized2) return 0.95;
    
    // Check for substring matches
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
        return 0.85;
    }
    
    // Use Levenshtein distance for character-level similarity
    const maxLength = Math.max(normalized1.length, normalized2.length);
    if (maxLength === 0) return 0;
    
    const distance = levenshteinDistance(normalized1, normalized2);
    const similarity = 1 - (distance / maxLength);
    
    return similarity;
}

// Calculate similarity between two word arrays
function calculateSimilarity(words1, words2) {
    if (words1.length !== words2.length) return 0;
    
    let matches = 0;
    for (let i = 0; i < words1.length; i++) {
        const word1 = words1[i].toLowerCase().replace(/[^\w]/g, '');
        const word2 = words2[i].toLowerCase().replace(/[^\w]/g, '');
        
        if (word1 === word2 || 
            word1.includes(word2) || 
            word2.includes(word1) ||
            levenshteinDistance(word1, word2) <= 2) {
            matches++;
        }
    }
    
    return matches / words1.length;
}

// Calculate Levenshtein distance between two strings
function levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

// Map normalized text position back to original text position
function mapNormalizedToOriginal(originalText, normalizedText, normalizedPosition) {
    if (normalizedPosition === 0) return 0;
    
    let originalIndex = 0;
    let normalizedIndex = 0;
    
    while (originalIndex < originalText.length && normalizedIndex < normalizedPosition) {
        const originalChar = originalText[originalIndex];
        
        // Check if this character would be kept in normalization
        const normalizedChar = originalChar.toLowerCase();
        const isKept = /[\w\s\u4e00-\u9fff\u3400-\u4dbf\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2b820-\u2ceaf]/.test(normalizedChar);
        
        if (isKept) {
            // If it's whitespace, it might be normalized to a single space
            if (/\s/.test(normalizedChar)) {
                // Skip consecutive whitespace in original
                while (originalIndex < originalText.length && /\s/.test(originalText[originalIndex])) {
                    originalIndex++;
                }
                normalizedIndex++;
            } else {
                originalIndex++;
                normalizedIndex++;
            }
        } else {
            // Character was removed in normalization, skip it
            originalIndex++;
        }
    }
    
    return normalizedIndex === normalizedPosition ? originalIndex : -1;
}

// Find partial matches for text that might be fragmented or corrupted
function findPartialMatches(targetText) {
    console.log('🔍 Finding partial matches for:', targetText);
    
    const matches = [];
    const minWordLength = 3;
    const minMatchLength = 8; // Minimum total length for partial match
    
    // Split target text into words and create search patterns
    const targetWords = targetText.split(/\s+/).filter(word => word.length >= minWordLength);
    console.log('📝 Target words:', targetWords);
    
    if (targetWords.length === 0) {
        return matches;
    }
    
    // Create various search patterns
    const searchPatterns = [];
    
    // Pattern 1: First and last words
    if (targetWords.length >= 2) {
        searchPatterns.push({
            pattern: `${targetWords[0]}.*${targetWords[targetWords.length - 1]}`,
            description: 'first-last',
            minScore: 0.6
        });
    }
    
    // Pattern 2: First few words
    if (targetWords.length >= 2) {
        const firstHalf = targetWords.slice(0, Math.ceil(targetWords.length / 2));
        searchPatterns.push({
            pattern: firstHalf.join('.*'),
            description: 'first-half',
            minScore: 0.7
        });
    }
    
    // Pattern 3: Last few words
    if (targetWords.length >= 2) {
        const lastHalf = targetWords.slice(Math.floor(targetWords.length / 2));
        searchPatterns.push({
            pattern: lastHalf.join('.*'),
            description: 'last-half',
            minScore: 0.7
        });
    }
    
    // Pattern 4: Consecutive word pairs
    for (let i = 0; i < targetWords.length - 1; i++) {
        searchPatterns.push({
            pattern: `${targetWords[i]}.*${targetWords[i + 1]}`,
            description: `pair-${i}`,
            minScore: 0.5
        });
    }
    
    // Pattern 5: Individual significant words (longer words are more significant)
    targetWords.forEach((word, index) => {
        if (word.length >= 5) {
            searchPatterns.push({
                pattern: word,
                description: `word-${index}`,
                minScore: 0.4
            });
        }
    });
    
    console.log('🎯 Search patterns:', searchPatterns.map(p => p.pattern));
    
    // Search for each pattern in the document
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(node) {
                // Skip already highlighted text
                if (node.parentElement && node.parentElement.closest('.lumos-highlight')) {
                    return NodeFilter.FILTER_REJECT;
                }
                
                // Skip hidden elements
                if (node.parentElement) {
                    const style = window.getComputedStyle(node.parentElement);
                    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                        return NodeFilter.FILTER_REJECT;
                    }
                }
                
                return NodeFilter.FILTER_ACCEPT;
            }
        },
        false
    );
    
    let node;
    while (node = walker.nextNode()) {
        const nodeText = node.textContent;
        if (nodeText.length < minMatchLength) continue;
        
        const nodeTextLower = nodeText.toLowerCase();
        const targetTextLower = targetText.toLowerCase();
        
        // Check each search pattern
        for (const searchPattern of searchPatterns) {
            try {
                const regex = new RegExp(searchPattern.pattern.toLowerCase(), 'i');
                const match = nodeTextLower.match(regex);
                
                if (match) {
                    const matchStart = match.index;
                    const matchEnd = matchStart + match[0].length;
                    const matchedText = nodeText.substring(matchStart, matchEnd);
                    
                    // Calculate similarity score
                    const similarity = calculateTextSimilarity(matchedText.toLowerCase(), targetTextLower);
                    
                    if (similarity >= searchPattern.minScore) {
                        console.log('✅ Partial match found:', {
                            pattern: searchPattern.description,
                            similarity: similarity,
                            matchedText: matchedText.substring(0, 50) + '...',
                            originalText: targetText.substring(0, 50) + '...'
                        });
                        
                        matches.push({
                            node: node,
                            index: matchStart,
                            text: matchedText,
                            similarity: similarity,
                            pattern: searchPattern.description
                        });
                    }
                }
            } catch (error) {
                console.warn('Error in pattern matching:', error);
                continue;
            }
        }
    }
    
    // Sort matches by similarity and remove duplicates
    const uniqueMatches = [];
    const seen = new Set();
    
    matches
        .sort((a, b) => b.similarity - a.similarity)
        .forEach(match => {
            const key = `${match.node.textContent}-${match.index}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueMatches.push(match);
            }
        });
    
    console.log('📊 Partial matches found:', uniqueMatches.length);
    return uniqueMatches.slice(0, 5); // Return top 5 matches
}

// Calculate text similarity using multiple metrics
function calculateTextSimilarity(text1, text2) {
    if (text1 === text2) return 1.0;
    
    // Normalize texts
    const normalize = (text) => text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
    const norm1 = normalize(text1);
    const norm2 = normalize(text2);
    
    if (norm1 === norm2) return 0.95;
    
    // Word-based similarity
    const words1 = norm1.split(/\s+/);
    const words2 = norm2.split(/\s+/);
    
    const allWords = new Set([...words1, ...words2]);
    const common = words1.filter(word => words2.includes(word)).length;
    const wordSimilarity = common / allWords.size;
    
    // Character-based similarity using Levenshtein distance
    const maxLength = Math.max(norm1.length, norm2.length);
    const charSimilarity = maxLength > 0 ? 1 - (levenshteinDistance(norm1, norm2) / maxLength) : 0;
    
    // Substring similarity
    const longer = norm1.length > norm2.length ? norm1 : norm2;
    const shorter = norm1.length > norm2.length ? norm2 : norm1;
    const substringScore = longer.includes(shorter) ? 0.8 : 0;
    
    // Combined score with weights
    const combinedScore = (wordSimilarity * 0.4) + (charSimilarity * 0.4) + (substringScore * 0.2);
    
    return Math.min(1.0, combinedScore);
}

// Helper function to get all text nodes for debugging
function getAllTextNodes() {
    const textNodes = [];
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(node) {
                // Skip already highlighted text
                if (node.parentElement && node.parentElement.closest('.lumos-highlight')) {
                    return NodeFilter.FILTER_REJECT;
                }
                
                // Skip hidden elements
                if (node.parentElement) {
                    const style = window.getComputedStyle(node.parentElement);
                    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                        return NodeFilter.FILTER_REJECT;
                    }
                }
                
                // Only include nodes with meaningful text
                const text = node.textContent.trim();
                if (text.length < 5) {
                    return NodeFilter.FILTER_REJECT;
                }
                
                return NodeFilter.FILTER_ACCEPT;
            }
        },
        false
    );
    
    let node;
    while (node = walker.nextNode()) {
        textNodes.push(node);
    }
    
    return textNodes;
}

// Debug function to test text matching with specific examples
// Can be called from browser console: testTextMatching("ity federation with an identit")
window.testTextMatching = function(targetText) {
    console.log('🧪 Testing text matching for:', targetText);
    console.log('=====================================================');
    
    const allTextNodes = getAllTextNodes();
    console.log('📊 Total text nodes on page:', allTextNodes.length);
    
    let totalMatches = 0;
    
    allTextNodes.forEach((node, index) => {
        const nodeText = node.textContent;
        const matches = findTextMatches(nodeText, targetText, node);
        
        if (matches.length > 0) {
            totalMatches += matches.length;
            console.log(`📍 Node ${index + 1}/${allTextNodes.length} - Found ${matches.length} matches:`);
            console.log('   Node text:', nodeText.substring(0, 100) + '...');
            matches.forEach((match, matchIndex) => {
                console.log(`   Match ${matchIndex + 1}:`, {
                    strategy: match.strategy,
                    score: match.score,
                    index: match.index,
                    foundText: nodeText.substring(match.index, match.index + 50) + '...'
                });
            });
        }
    });
    
    if (totalMatches === 0) {
        console.log('❌ No matches found. Trying partial matching...');
        const partialMatches = findPartialMatches(targetText);
        console.log('🔍 Partial matches found:', partialMatches.length);
        partialMatches.forEach((match, index) => {
            console.log(`Partial match ${index + 1}:`, {
                pattern: match.pattern,
                similarity: match.similarity,
                text: match.text.substring(0, 50) + '...'
            });
        });
    }
    
    console.log('=====================================================');
    console.log('📊 Summary: Found', totalMatches, 'total matches across all strategies');
    
    return {
        totalMatches: totalMatches,
        textNodesSearched: allTextNodes.length,
        targetText: targetText
    };
};

// Debug function to analyze why specific highlights fail
window.debugHighlightRestoration = function(highlightText, contextBefore = '', contextAfter = '') {
    console.log('🔬 Debugging highlight restoration for:', highlightText);
    console.log('=====================================================');
    
    const mockHighlightData = {
        text: highlightText,
        context_before: contextBefore,
        context_after: contextAfter,
        id: 'debug-test',
        color: 'yellow'
    };
    
    console.log('📋 Mock highlight data:', mockHighlightData);
    
    // Test the restoration process
    const success = restoreHighlightByTextContent(mockHighlightData);
    
    console.log('🎯 Restoration result:', success ? 'SUCCESS' : 'FAILED');
    console.log('=====================================================');
    
    return success;
};

console.log('🛠️ Debug functions available:');
console.log('   testTextMatching("your text here") - Test text matching strategies');
console.log('   debugHighlightRestoration("text", "before", "after") - Debug restoration process');

// New robust text-based restoration method
function restoreHighlightByTextContent(highlightData) {
    const { text, context_before, context_after } = highlightData;
    
    try {
        // Find all text nodes in the document
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    // Skip already highlighted text
                    if (node.parentElement && node.parentElement.closest('.lumos-highlight')) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    
                    // Skip hidden elements
                    if (node.parentElement) {
                        const style = window.getComputedStyle(node.parentElement);
                        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                            return NodeFilter.FILTER_REJECT;
                        }
                    }
                    
                    return NodeFilter.FILTER_ACCEPT;
                }
            },
            false
        );
        
        const candidates = [];
        let node;
        
        // Collect all potential text nodes
        while (node = walker.nextNode()) {
            const nodeText = node.textContent;
            
            // Try multiple matching strategies
            candidates.push(...findTextMatches(nodeText, text, node));
        }
        
        if (candidates.length === 0) {
            console.log('No text matches found for:', text.substring(0, 30));
            console.log('Trying partial search...');
            
            // Try to find partial matches
            const partialMatches = findPartialMatches(text);
            if (partialMatches.length > 0) {
                console.log('Found partial matches:', partialMatches.map(m => m.text.substring(0, 30)));
                
                // If we found good partial matches, add them as candidates
                partialMatches.forEach(match => {
                    candidates.push({
                        node: match.node,
                        index: match.index,
                        score: 50, // Lower score for partial matches
                        strategy: 'partial'
                    });
                });
            }
            
            if (candidates.length === 0) {
                return false;
            }
        }
        
        // Score candidates based on context
        for (const candidate of candidates) {
            const baseScore = candidate.score || 0;
            const contextScore = scoreTextCandidate(candidate, text, context_before, context_after);
            candidate.score = baseScore + contextScore;
        }
        
        // Sort by score (highest first)
        candidates.sort((a, b) => b.score - a.score);
        
        console.log(`Found ${candidates.length} candidates for: "${text.substring(0, 30)}...":`);
        candidates.forEach((candidate, i) => {
            console.log(`  ${i + 1}. Score: ${candidate.score}, Strategy: ${candidate.strategy}, Text: "${candidate.node.textContent.substring(candidate.index, candidate.index + 30)}..."`);
        });
        
        // Try to highlight the best candidate
        const bestCandidate = candidates[0];
        
        // Only proceed if we have a reasonable confidence
        if (bestCandidate.score > 0) {
            return createSimpleHighlight(bestCandidate.node, bestCandidate.index, text, highlightData);
        }
        
        return false;
        
    } catch (error) {
        console.error('Error in text-based restoration:', error);
        return false;
    }
}

// Score a text candidate based on surrounding context
function scoreTextCandidate(candidate, targetText, contextBefore, contextAfter) {
    let score = 1; // Base score for finding the text
    
    try {
        const node = candidate.node;
        const index = candidate.index;
        
        // Get surrounding text
        const nodeText = node.textContent;
        const beforeText = nodeText.substring(0, index);
        const afterText = nodeText.substring(index + targetText.length);
        
        // Get text from adjacent nodes
        const extendedBefore = getExtendedContext(node, 'before', beforeText, 200);
        const extendedAfter = getExtendedContext(node, 'after', afterText, 200);
        
        // Score based on context matching
        if (contextBefore && extendedBefore) {
            const beforeMatch = calculateContextMatch(extendedBefore, contextBefore);
            score += beforeMatch * 10; // Weight context matching heavily
        }
        
        if (contextAfter && extendedAfter) {
            const afterMatch = calculateContextMatch(extendedAfter, contextAfter);
            score += afterMatch * 10;
        }
        
        // Bonus for being in likely content areas
        const contentScore = scoreContentContext(node);
        score += contentScore;
        
        return score;
        
    } catch (error) {
        console.warn('Error scoring candidate:', error);
        return 0;
    }
}

// Get extended context by walking adjacent text nodes
function getExtendedContext(startNode, direction, initialText, maxLength) {
    let context = initialText;
    let currentNode = startNode;
    
    try {
        // Walk through adjacent text nodes
        for (let i = 0; i < 10 && context.length < maxLength; i++) {
            const nextNode = direction === 'before' ? 
                getPreviousTextNode(currentNode) : 
                getNextTextNode(currentNode);
                
            if (!nextNode) break;
            
            const nodeText = nextNode.textContent || '';
            
            if (direction === 'before') {
                context = nodeText + ' ' + context;
            } else {
                context = context + ' ' + nodeText;
            }
            
            currentNode = nextNode;
        }
        
        return context.trim();
        
    } catch (error) {
        console.warn('Error getting extended context:', error);
        return initialText;
    }
}

// Calculate how well two context strings match
function calculateContextMatch(actual, expected) {
    if (!actual || !expected) return 0;
    
    const actualLower = actual.toLowerCase().trim();
    const expectedLower = expected.toLowerCase().trim();
    
    if (actualLower === expectedLower) return 1.0;
    
    // Check for substring matches
    if (actualLower.includes(expectedLower) || expectedLower.includes(actualLower)) {
        return 0.8;
    }
    
    // Check for word overlap
    const actualWords = actualLower.split(/\s+/);
    const expectedWords = expectedLower.split(/\s+/);
    const commonWords = actualWords.filter(word => 
        word.length > 3 && expectedWords.includes(word)
    );
    
    if (commonWords.length > 0) {
        return Math.min(0.6, commonWords.length / Math.max(actualWords.length, expectedWords.length));
    }
    
    return 0;
}

// Score the content context (prefer main content areas)
function scoreContentContext(node) {
    let score = 0;
    let current = node.parentElement;
    
    try {
        while (current && current !== document.body) {
            const tagName = current.tagName.toLowerCase();
            const className = current.className || '';
            
            // Bonus for content containers
            if (tagName === 'article' || tagName === 'main') score += 3;
            if (tagName === 'section' || tagName === 'div') score += 1;
            if (tagName === 'p') score += 2;
            
            // Bonus for content-related classes
            if (className.includes('content') || className.includes('article') || 
                className.includes('post') || className.includes('text')) {
                score += 2;
            }
            
            // Penalty for navigation/sidebar areas
            if (className.includes('nav') || className.includes('menu') || 
                className.includes('sidebar') || className.includes('ad')) {
                score -= 5;
            }
            
            current = current.parentElement;
        }
        
        return Math.max(0, score);
        
    } catch (error) {
        return 0;
    }
}

// Create a simple highlight without complex DOM manipulation
function createSimpleHighlight(textNode, startIndex, text, highlightData) {
    try {
        const nodeText = textNode.textContent;
        
        // For flexible matching, find the best actual end position
        let actualLength = text.length;
        let rangeText = nodeText.substring(startIndex, startIndex + actualLength);
        
        // Try to find the best match by extending or reducing the range
        const normalizedTarget = normalizeTextForMatching(text);
        let bestMatch = null;
        let bestScore = 0;
        
        // Try different lengths around the expected length
        for (let lengthOffset = -5; lengthOffset <= 20; lengthOffset++) {
            const testLength = text.length + lengthOffset;
            if (startIndex + testLength > nodeText.length || testLength < 5) continue;
            
            const testText = nodeText.substring(startIndex, startIndex + testLength);
            const normalizedTest = normalizeTextForMatching(testText);
            
            const similarity = calculateTextSimilarity(normalizedTest, normalizedTarget);
            
            if (similarity > bestScore && similarity > 0.8) {
                bestScore = similarity;
                bestMatch = {
                    text: testText,
                    length: testLength,
                    similarity: similarity
                };
            }
        }
        
        // If we found a good match, use that
        if (bestMatch) {
            actualLength = bestMatch.length;
            rangeText = bestMatch.text;
            console.log('📍 Using flexible match:', {
                original: text.substring(0, 30) + '...',
                matched: rangeText.substring(0, 30) + '...',
                similarity: bestMatch.similarity
            });
        } else {
            // Fallback to original length
            rangeText = nodeText.substring(startIndex, startIndex + actualLength);
            
            // Check if it's close enough
            const normalizedRange = normalizeTextForMatching(rangeText);
            const similarity = calculateTextSimilarity(normalizedRange, normalizedTarget);
            
            if (similarity < 0.7) {
                console.warn('Text similarity too low:', {
                    similarity: similarity,
                    expected: text.substring(0, 50),
                    actual: rangeText.substring(0, 50)
                });
                return false;
            }
        }
        
        const range = document.createRange();
        range.setStart(textNode, startIndex);
        range.setEnd(textNode, startIndex + actualLength);
        
        if (range.collapsed) {
            console.warn('Range is collapsed, cannot highlight');
            return false;
        }
        
        const highlightElement = document.createElement('span');
        highlightElement.className = `lumos-highlight lumos-highlight-${highlightData.color}`;
        highlightElement.setAttribute('data-highlight-id', highlightData.id);
        highlightElement.setAttribute('data-highlight-color', highlightData.color);
        
        // Apply current styles
        applyStylesToHighlight(highlightElement);
        
        range.surroundContents(highlightElement);
        
        console.log('✅ Flexible highlight created successfully:', rangeText.substring(0, 30) + '...');
        return true;
        
    } catch (error) {
        console.error('Error creating simple highlight:', error);
        return false;
    }
}

// Normalize text for matching (more aggressive than the basic normalizeText)
function normalizeTextForMatching(text) {
    return text
        .toLowerCase()
        .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
        .replace(/\n/g, ' ')   // Replace newlines with spaces
        .replace(/\t/g, ' ')   // Replace tabs with spaces
        .replace(/[^\w\s\u4e00-\u9fff\u3400-\u4dbf\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2b820-\u2ceaf]/g, '') // Keep only letters, numbers, whitespace, and CJK characters
        .trim();
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
        // Check if the selector is valid before trying to use it
        if (!position.startSelector.trim()) {
            console.log('Empty CSS selector, skipping');
            return false;
        }
        
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
        // Don't log CSS selector errors as errors - they're expected for dynamic content
        console.log('CSS selector restoration failed (normal for dynamic content):', position.startSelector);
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

// Get previous text node within a specific container
function getPreviousTextNodeInContainer(node, container) {
    let walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(n) {
                // Skip text nodes in non-content elements
                const parent = n.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                
                // Skip hidden elements
                const style = window.getComputedStyle(parent);
                if (style.display === 'none' || style.visibility === 'hidden') {
                    return NodeFilter.FILTER_REJECT;
                }
                
                // Skip script, style, and navigation elements
                if (parent.matches('script, style, noscript, nav, header, footer, [class*="ad"], [class*="menu"]')) {
                    return NodeFilter.FILTER_REJECT;
                }
                
                return NodeFilter.FILTER_ACCEPT;
            }
        },
        false
    );
    
    walker.currentNode = node;
    return walker.previousNode();
}

// Get next text node within a specific container
function getNextTextNodeInContainer(node, container) {
    let walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(n) {
                // Skip text nodes in non-content elements
                const parent = n.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                
                // Skip hidden elements
                const style = window.getComputedStyle(parent);
                if (style.display === 'none' || style.visibility === 'hidden') {
                    return NodeFilter.FILTER_REJECT;
                }
                
                // Skip script, style, and navigation elements
                if (parent.matches('script, style, noscript, nav, header, footer, [class*="ad"], [class*="menu"]')) {
                    return NodeFilter.FILTER_REJECT;
                }
                
                return NodeFilter.FILTER_ACCEPT;
            }
        },
        false
    );
    
    walker.currentNode = node;
    return walker.nextNode();
}

// Check if text is likely non-content (UI elements, navigation, etc.)
function isNonContentText(text) {
    const trimmed = text.trim().toLowerCase();
    
    // Skip very short text
    if (trimmed.length < 3) return true;
    
    // Common UI/navigation text patterns
    const nonContentPatterns = [
        /^(menu|navigation|nav|click|button|link)$/,
        /^(login|logout|sign in|sign up|register)$/,
        /^(home|about|contact|privacy|terms)$/,
        /^(share|like|follow|subscribe)$/,
        /^(loading|error|warning|alert)$/,
        /^(advertisement|sponsored|ads)$/,
        /^\d+$/, // Pure numbers
        /^[^\w\u4e00-\u9fff]+$/ // Only punctuation/symbols
    ];
    
    return nonContentPatterns.some(pattern => pattern.test(trimmed));
}

// Get previous text node (original function kept for compatibility)
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
        
        try {
            range.surroundContents(highlightElement);
            return true;
        } catch (error) {
            console.warn('surroundContents failed, trying alternative approach:', error);
            
            // Fallback: Extract content and wrap it
            const content = range.extractContents();
            highlightElement.appendChild(content);
            range.insertNode(highlightElement);
            return true;
        }
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
        // Add retry count if not exists
        if (!highlightData.retryCount) {
            highlightData.retryCount = 0;
        }
        
        highlightData.retryCount++;
        
        // Give up after too many retries
        if (highlightData.retryCount > 10) {
            console.warn('Giving up on highlight after 10 retries:', highlightData.text.substring(0, 50));
            return;
        }
        
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
    
    // Use the new robust text-based approach
    const success = restoreHighlightByTextContent(highlightData);
    
    if (success) {
        console.log('Successfully restored pending highlight:', highlightData.text.substring(0, 30) + '...');
        return true;
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

// Simplified highlighting method for safe ranges
function highlightRangeRobustly(range, highlightElement) {
    try {
        // Since we've filtered out cross-element selections, this should be simpler
        if (range.startContainer === range.endContainer && 
            range.startContainer.nodeType === Node.TEXT_NODE) {
            range.surroundContents(highlightElement);
            return true;
        }
        
        // For any remaining complex cases, try the complex handler
        return highlightComplexRange(range, highlightElement);
        
    } catch (error) {
        console.error('Highlighting failed:', error);
        return false;
    }
}

// Handle complex ranges that span multiple elements
function highlightComplexRange(range, highlightElement) {
    try {
        // Get all text nodes within the range
        const textNodes = getTextNodesInRange(range);
        
        if (textNodes.length === 0) {
            console.warn('No text nodes found in range');
            return false;
        }
        
        // If only one text node, handle it simply
        if (textNodes.length === 1) {
            const textNode = textNodes[0];
            const nodeRange = document.createRange();
            
            // Calculate the correct offsets within this text node
            const startOffset = textNode === range.startContainer ? range.startOffset : 0;
            const endOffset = textNode === range.endContainer ? range.endOffset : textNode.textContent.length;
            
            nodeRange.setStart(textNode, startOffset);
            nodeRange.setEnd(textNode, endOffset);
            
            if (!nodeRange.collapsed) {
                nodeRange.surroundContents(highlightElement);
                return true;
            }
        }
        
        // For multiple text nodes, create separate highlights for each
        const highlightNodes = [];
        const selectedText = range.toString();
        let processedLength = 0;
        
        for (let i = 0; i < textNodes.length; i++) {
            const textNode = textNodes[i];
            const nodeRange = document.createRange();
            
            // Calculate offsets for this text node
            let startOffset = 0;
            let endOffset = textNode.textContent.length;
            
            if (textNode === range.startContainer) {
                startOffset = range.startOffset;
            }
            if (textNode === range.endContainer) {
                endOffset = range.endOffset;
            }
            
            console.log(`🎯 Processing text node ${i + 1}/${textNodes.length}:`, {
                nodeContent: textNode.textContent,
                startOffset: startOffset,
                endOffset: endOffset,
                isStartContainer: textNode === range.startContainer,
                isEndContainer: textNode === range.endContainer,
                parent: textNode.parentElement.tagName,
                parentClass: textNode.parentElement.className,
                originalRangeStartOffset: range.startOffset,
                originalRangeEndOffset: range.endOffset
            });
            
            // Skip if this would create an empty range
            if (startOffset >= endOffset) {
                console.log('⚠️ Skipping empty range');
                continue;
            }
            
            nodeRange.setStart(textNode, startOffset);
            nodeRange.setEnd(textNode, endOffset);
            
            const nodeText = nodeRange.toString();
            console.log(`💡 Will highlight: "${nodeText}"`);
            
            // Create a separate highlight element for this text node
            const nodeHighlightElement = document.createElement('span');
            nodeHighlightElement.className = highlightElement.className;
            nodeHighlightElement.setAttribute('data-highlight-id', highlightElement.getAttribute('data-highlight-id'));
            nodeHighlightElement.setAttribute('data-highlight-color', highlightElement.getAttribute('data-highlight-color'));
            nodeHighlightElement.setAttribute('data-highlight-part', i.toString());
            
            // Apply styles
            applyStylesToHighlight(nodeHighlightElement);
            
            try {
                nodeRange.surroundContents(nodeHighlightElement);
                highlightNodes.push(nodeHighlightElement);
                processedLength += nodeRange.toString().length;
                console.log(`✅ Successfully highlighted part ${i + 1}: "${nodeText}"`);
            } catch (error) {
                console.warn(`❌ Failed to highlight text node ${i + 1}:`, error);
                continue;
            }
        }
        
        // Verify that we highlighted something
        if (highlightNodes.length > 0) {
            console.log(`✅ Successfully highlighted ${highlightNodes.length} text nodes`);
            console.log('📊 Highlight summary:', {
                originalSelection: selectedText,
                originalLength: selectedText.length,
                processedLength: processedLength,
                totalParts: highlightNodes.length,
                highlightedTexts: highlightNodes.map(node => node.textContent)
            });
            return true;
        }
        
        console.log('❌ No nodes were highlighted');
        return false;
        
    } catch (error) {
        console.error('Error in complex range highlighting:', error);
        return false;
    }
}

// Get all text nodes within a range using a simpler, more reliable method
function getTextNodesInRange(range) {
    const textNodes = [];
    const selectedText = range.toString();
    
    console.log('🔍 getTextNodesInRange - Original selection:', {
        text: selectedText,
        textLength: selectedText.length,
        startContainer: range.startContainer.nodeName,
        startOffset: range.startOffset,
        endContainer: range.endContainer.nodeName,
        endOffset: range.endOffset,
        commonAncestor: range.commonAncestorContainer.nodeName
    });
    
    // If it's a simple range within the same text node, handle it directly
    if (range.startContainer === range.endContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
        console.log('📍 Simple range within same text node');
        textNodes.push(range.startContainer);
        return textNodes;
    }
    
    // For complex ranges, use a more conservative approach
    // Walk through all text nodes and carefully check if they're actually in the range
    const walker = document.createTreeWalker(
        range.commonAncestorContainer,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    let node;
    while (node = walker.nextNode()) {
        // Skip empty or whitespace-only nodes unless they're the exact start/end containers
        const nodeText = node.textContent;
        const isWhitespaceOnly = /^\s*$/.test(nodeText);
        
        if (node === range.startContainer) {
            console.log('✅ Start container found:', nodeText.substring(0, 50));
            textNodes.push(node);
        } else if (node === range.endContainer) {
            console.log('✅ End container found:', nodeText.substring(0, 50));
            textNodes.push(node);
        } else if (!isWhitespaceOnly && range.intersectsNode(node)) {
            // For other nodes, verify they're actually selected by checking if they intersect
            // and contain meaningful content
            try {
                const nodeRange = document.createRange();
                nodeRange.selectNodeContents(node);
                
                // Check if any part of this node's text appears in our selected text
                const nodeTextTrimmed = nodeText.trim();
                if (nodeTextTrimmed.length > 0 && selectedText.includes(nodeTextTrimmed)) {
                    console.log('✅ Content node accepted:', nodeTextTrimmed.substring(0, 50));
                    textNodes.push(node);
                } else {
                    console.log('❌ Content node rejected (not in selection):', nodeTextTrimmed.substring(0, 50));
                }
            } catch (error) {
                console.warn('Error checking node:', error);
            }
        } else if (isWhitespaceOnly) {
            console.log('⚪ Skipping whitespace node:', nodeText.replace(/\n/g, '\\n').replace(/\t/g, '\\t'));
        } else {
            console.log('❌ Node rejected (no intersection):', nodeText.substring(0, 50));
        }
    }
    
    console.log('📝 Total text nodes found:', textNodes.length);
    return textNodes;
}

// More precise check to see if a text node is within the range
function isTextNodeInRange(textNode, range) {
    try {
        // Skip whitespace-only text nodes unless they're start/end containers
        const nodeText = textNode.textContent;
        const isWhitespaceOnly = /^\s*$/.test(nodeText);
        
        // Check if the node is the start container
        if (textNode === range.startContainer) {
            console.log('📍 This is the start container');
            return true;
        }
        
        // Check if the node is the end container
        if (textNode === range.endContainer) {
            console.log('📍 This is the end container');
            return true;
        }
        
        // Skip whitespace-only nodes that are not start/end containers
        if (isWhitespaceOnly) {
            console.log('⚪ Skipping whitespace-only node:', nodeText.replace(/\n/g, '\\n').replace(/\t/g, '\\t'));
            return false;
        }
        
        // Create a range that represents the position just before this text node
        const beforeNodeRange = document.createRange();
        beforeNodeRange.setStartBefore(textNode);
        beforeNodeRange.collapse(true);
        
        // Create a range that represents the position just after this text node
        const afterNodeRange = document.createRange();
        afterNodeRange.setStartAfter(textNode);
        afterNodeRange.collapse(true);
        
        // Check if this text node is between the start and end of our selection
        const isAfterStart = range.compareBoundaryPoints(Range.START_TO_START, beforeNodeRange) <= 0;
        const isBeforeEnd = range.compareBoundaryPoints(Range.END_TO_START, afterNodeRange) >= 0;
        
        console.log('🔍 Boundary comparison:', {
            nodeContent: nodeText.substring(0, 50) + '...',
            isAfterStart: isAfterStart,
            isBeforeEnd: isBeforeEnd,
            isInRange: isAfterStart && isBeforeEnd
        });
        
        return isAfterStart && isBeforeEnd;
        
    } catch (error) {
        console.error('Error checking text node in range:', error);
        return false;
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