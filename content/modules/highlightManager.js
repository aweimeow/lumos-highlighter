// Highlight Manager Module
// Extracted from content.js - Core highlight creation, modification, and removal functionality

// Re-export style functions for backward compatibility

// Apply highlight to selected text
function applyHighlight(color, selection) {
    if (!selection || !selection.range) return;
    
    const range = selection.range;
    const text = selection.text;
    
    // Create highlight data
    const highlightData = {
        id: window.LumosDomUtils.generateUUID(),
        timestamp: new Date().toISOString(),
        url: window.location.href,
        page_title: document.title,
        color: color,
        text: text,
        context_before: window.LumosContextExtractor.getContextBefore(range) || getBackupContext('before', range),
        context_after: window.LumosContextExtractor.getContextAfter(range) || getBackupContext('after', range),
        position: window.LumosPositionDataGenerator.getPositionData(range)
    };
    
    if (window.LumosLogger) {
        window.LumosLogger.debug('Highlight data being saved:', {
            text: highlightData.text,
            context_before: highlightData.context_before,
            context_after: highlightData.context_after,
            domain: new URL(window.location.href).hostname
        });
    }
    
    // Apply highlight to DOM
    const highlightElement = document.createElement('span');
    highlightElement.className = `lumos-highlight lumos-highlight-${color}`;
    highlightElement.setAttribute('data-highlight-id', highlightData.id);
    highlightElement.setAttribute('data-highlight-color', color);
    
    // Apply current styles
    window.LumosStyleManager.applyStylesToHighlight(highlightElement);
    
    try {
        // Validate range before highlighting
        if (range.collapsed) {
            if (window.LumosLogger) { window.LumosLogger.warn('Cannot highlight collapsed range'); }
            return;
        }
        
        // Additional validation
        const selectedText = range.toString().trim();
        if (selectedText.length === 0) {
            if (window.LumosLogger) { window.LumosLogger.warn('Cannot highlight empty selection'); }
            return;
        }
        
        if (window.LumosLogger) { 
            window.LumosLogger.debug('Attempting to highlight:', {
                text: selectedText,
                startContainer: range.startContainer.nodeName,
                endContainer: range.endContainer.nodeName,
                startOffset: range.startOffset,
                endOffset: range.endOffset
            }); 
        }
        
        // Use a more robust highlighting method
        if (!highlightRangeRobustly(range, highlightElement)) {
            if (window.LumosLogger) { window.LumosLogger.warn('Cannot highlight this selection'); }
            return;
        }
        
        if (window.LumosLogger) { window.LumosLogger.debug('Highlight successfully applied'); }
        
        // Clear selection first to ensure UI responds properly
        window.getSelection().removeAllRanges();
        
        // Save highlight to storage (async, shouldn't block UI)
        try {
            window.LumosStorageManager.saveHighlight(highlightData);
        } catch (error) {
            if (window.LumosLogger) { window.LumosLogger.debug('Could not save highlight to storage, but highlight applied to DOM:', error); }
        }
        
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.error('Error applying highlight:', error); }
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
        window.LumosStyleManager.applyStylesToHighlight(part);
    });
    
    // Update storage (async, non-blocking) - with proper error handling
    setTimeout(() => {
        try {
            // Check if chrome.runtime is available
            if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
                if (window.LumosLogger) { 
                    window.LumosLogger.debug('Chrome runtime not available, skipping storage update'); 
                }
                return;
            }
            
            const domain = new URL(window.location.href).hostname;
            chrome.runtime.sendMessage({
                action: 'updateHighlightColor',
                domain: domain,
                highlightId: highlightId,
                newColor: newColor
            }, (response) => {
                if (chrome.runtime.lastError) {
                    if (window.LumosLogger) { 
                        window.LumosLogger.debug('Extension context invalidated, cannot update color in storage:', chrome.runtime.lastError.message); 
                    }
                }
            });
        } catch (error) {
            if (window.LumosLogger) { 
                window.LumosLogger.debug('Extension context invalidated, cannot update color in storage:', error); 
            }
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
    window.LumosStorageManager.deleteHighlight(highlightId);
}

// Restore individual highlight using a robust text-based approach
function restoreHighlight(highlightData, addToPending = true) {
    if (window.LumosLogger) { 
        window.LumosLogger.debug('🔄 Attempting to restore highlight:', {
            text: highlightData.text.substring(0, 50) + '...',
            textLength: highlightData.text.length,
            color: highlightData.color,
            id: highlightData.id,
            context_before: highlightData.context_before ? highlightData.context_before.substring(0, 30) + '...' : 'none',
            context_after: highlightData.context_after ? highlightData.context_after.substring(0, 30) + '...' : 'none'
        }); 
    }
    
    // Skip if already highlighted
    if (document.querySelector(`[data-highlight-id="${highlightData.id}"]`)) {
        if (window.LumosLogger) { window.LumosLogger.debug('✅ Highlight already exists, skipping'); }
        return true;
    }
    
    // Use a simple but robust text-based approach
    const success = restoreHighlightByTextContent(highlightData);
    
    if (success) {
        if (window.LumosLogger) { window.LumosLogger.debug('✅ Successfully restored highlight:', highlightData.text.substring(0, 30) + '...'); }
        return true;
    } else {
        if (window.LumosLogger) { window.LumosLogger.debug('❌ Failed to restore highlight:', highlightData.text.substring(0, 30) + '...'); }
        return false;
    }
}

// Restore highlight using text content matching
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
            candidates.push(...window.LumosTextMatcher.findTextMatches(nodeText, text, node));
        }
        
        if (candidates.length === 0) {
            if (window.LumosLogger) { window.LumosLogger.debug('No text matches found for:', text.substring(0, 30)); }
            return false;
        }
        
        // Score candidates based on context
        for (const candidate of candidates) {
            const baseScore = candidate.score || 0;
            const contextScore = scoreTextCandidate(candidate, text, context_before, context_after);
            candidate.score = baseScore + contextScore;
        }
        
        // Sort by score (highest first)
        candidates.sort((a, b) => b.score - a.score);
        
        if (window.LumosLogger) { window.LumosLogger.debug(`Found ${candidates.length} candidates for: "${text.substring(0, 30)}...":`); }
        candidates.forEach((candidate, i) => {
            if (window.LumosLogger) { window.LumosLogger.debug(`  ${i + 1}. Score: ${candidate.score}, Strategy: ${candidate.strategy}`); }
        });
        
        // Try to highlight the best candidate
        const bestCandidate = candidates[0];
        
        // Only proceed if we have a reasonable confidence
        if (bestCandidate.score > 0) {
            return createSimpleHighlight(bestCandidate.node, bestCandidate.index, text, highlightData);
        }
        
        return false;
        
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.error('Error in text-based restoration:', error); }
        return false;
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
        const normalizedTarget = window.LumosTextMatcher.normalizeTextForMatching(text);
        let bestMatch = null;
        let bestScore = 0;
        
        // Try different lengths around the expected length
        for (let lengthOffset = -5; lengthOffset <= 20; lengthOffset++) {
            const testLength = text.length + lengthOffset;
            if (startIndex + testLength > nodeText.length || testLength < 5) continue;
            
            const testText = nodeText.substring(startIndex, startIndex + testLength);
            const normalizedTest = window.LumosTextMatcher.normalizeTextForMatching(testText);
            
            const similarity = window.LumosTextMatcher.calculateTextSimilarity(normalizedTest, normalizedTarget);
            
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
            if (window.LumosLogger) { 
                window.LumosLogger.debug('📍 Using flexible match:', {
                    original: text.substring(0, 30) + '...',
                    matched: rangeText.substring(0, 30) + '...',
                    similarity: bestMatch.similarity
                }); 
            }
        } else {
            // Fallback to original length
            rangeText = nodeText.substring(startIndex, startIndex + actualLength);
            
            // Check if it's close enough
            const normalizedRange = window.LumosTextMatcher.normalizeTextForMatching(rangeText);
            const similarity = window.LumosTextMatcher.calculateTextSimilarity(normalizedRange, normalizedTarget);
            
            if (similarity < 0.7) {
                if (window.LumosLogger) { 
                    window.LumosLogger.warn('Text similarity too low:', {
                        similarity: similarity,
                        expected: text.substring(0, 50),
                        actual: rangeText.substring(0, 50)
                    }); 
                }
                return false;
            }
        }
        
        const range = document.createRange();
        range.setStart(textNode, startIndex);
        range.setEnd(textNode, startIndex + actualLength);
        
        if (range.collapsed) {
            if (window.LumosLogger) { window.LumosLogger.warn('Range is collapsed, cannot highlight'); }
            return false;
        }
        
        const highlightElement = document.createElement('span');
        highlightElement.className = `lumos-highlight lumos-highlight-${highlightData.color}`;
        highlightElement.setAttribute('data-highlight-id', highlightData.id);
        highlightElement.setAttribute('data-highlight-color', highlightData.color);
        
        // Apply current styles
        window.LumosStyleManager.applyStylesToHighlight(highlightElement);
        
        range.surroundContents(highlightElement);
        
        if (window.LumosLogger) { window.LumosLogger.debug('✅ Flexible highlight created successfully:', rangeText.substring(0, 30) + '...'); }
        return true;
        
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.error('Error creating simple highlight:', error); }
        return false;
    }
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
        if (window.LumosLogger) { window.LumosLogger.error('Highlighting failed:', error); }
        return false;
    }
}

// Handle complex ranges that span multiple elements
function highlightComplexRange(range, highlightElement) {
    try {
        // Get all text nodes within the range
        const textNodes = window.LumosDomUtils.getTextNodesInRange(range);
        
        if (textNodes.length === 0) {
            if (window.LumosLogger) { window.LumosLogger.warn('No text nodes found in range'); }
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
            
            // Skip if this would create an empty range
            if (startOffset >= endOffset) {
                continue;
            }
            
            nodeRange.setStart(textNode, startOffset);
            nodeRange.setEnd(textNode, endOffset);
            
            // Create a separate highlight element for this text node
            const nodeHighlightElement = document.createElement('span');
            nodeHighlightElement.className = highlightElement.className;
            nodeHighlightElement.setAttribute('data-highlight-id', highlightElement.getAttribute('data-highlight-id'));
            nodeHighlightElement.setAttribute('data-highlight-color', highlightElement.getAttribute('data-highlight-color'));
            nodeHighlightElement.setAttribute('data-highlight-part', i.toString());
            
            // Apply styles
            window.LumosStyleManager.applyStylesToHighlight(nodeHighlightElement);
            
            try {
                nodeRange.surroundContents(nodeHighlightElement);
            } catch (error) {
                if (window.LumosLogger) { window.LumosLogger.warn('Failed to highlight text node part:', error); }
            }
        }
        
        return true;
        
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.error('Error in complex range highlighting:', error); }
        return false;
    }
}

// Helper function to get text nodes within a range
function getTextNodesInRangeForHighlighting(range) {
    const textNodes = [];
    const walker = document.createTreeWalker(
        range.commonAncestorContainer,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(node) {
                try {
                    if (range.intersectsNode(node)) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                } catch (error) {
                    // Fallback check
                    if (range.commonAncestorContainer.contains(node)) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                }
                return NodeFilter.FILTER_REJECT;
            }
        }
    );
    
    let node;
    while (node = walker.nextNode()) {
        textNodes.push(node);
    }
    
    return textNodes;
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
            const beforeMatch = calculateContextMatchForHighlighting(extendedBefore, contextBefore);
            score += beforeMatch * 10; // Weight context matching heavily
        }
        
        if (contextAfter && extendedAfter) {
            const afterMatch = calculateContextMatchForHighlighting(extendedAfter, contextAfter);
            score += afterMatch * 10;
        }
        
        return score;
        
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.warn('Error scoring candidate:', error); }
        return 0;
    }
}

// Calculate how well two context strings match
function calculateContextMatchForHighlighting(actual, expected) {
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
        if (window.LumosLogger) { window.LumosLogger.warn('Error getting extended context:', error); }
        return initialText;
    }
}

// Get previous text node
function getPreviousTextNode(node) {
    let current = node.previousSibling;
    while (current && current.nodeType !== Node.TEXT_NODE) {
        current = current.previousSibling;
    }
    return current;
}

// Get next text node
function getNextTextNode(node) {
    let current = node.nextSibling;
    while (current && current.nodeType !== Node.TEXT_NODE) {
        current = current.nextSibling;
    }
    return current;
}


// Backup context extraction
function getBackupContext(direction, range) {
    try {
        const selectedText = range.toString();
        const bodyText = document.body.textContent || '';
        const selectedIndex = bodyText.indexOf(selectedText);
        
        if (selectedIndex >= 0) {
            if (direction === 'before') {
                const beforeText = bodyText.substring(Math.max(0, selectedIndex - 500), selectedIndex);
                const words = beforeText.split(/\s+/).filter(word => word.trim().length > 0);
                return words.slice(-30).join(' ');
            } else if (direction === 'after') {
                const afterStartIndex = selectedIndex + selectedText.length;
                const afterText = bodyText.substring(afterStartIndex, afterStartIndex + 500);
                const words = afterText.split(/\s+/).filter(word => word.trim().length > 0);
                return words.slice(0, 30).join(' ');
            }
        }
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.error('Error in backup context extraction:', error); }
    }
    
    return '';
}

// Assign to global window object
window.LumosHighlightManager = {
    updateHighlightStyles: (styles) => window.LumosStyleManager.updateHighlightStyles(styles),
    applyHighlight,
    changeHighlightColor,
    removeHighlight,
    restoreHighlight,
    restoreHighlightByTextContent,
    createSimpleHighlight,
    highlightRangeRobustly,
    highlightComplexRange,
    getTextNodesInRangeForHighlighting,
    scoreTextCandidate,
    calculateContextMatchForHighlighting,
    getExtendedContext,
    getPreviousTextNode,
    getNextTextNode,
    getBackupContext
};