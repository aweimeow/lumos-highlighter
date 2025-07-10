// Text Selection Validator Module
// Validates text selections and provides helper functions


// Find best text container
function findBestTextContainer(element) {
    return window.LumosDomUtils.findNearestContentContainer(element);
}


// Check context match
function checkContextMatch(actual, expected) {
    if (!actual || !expected) return false;
    
    const actualLower = actual.toLowerCase().trim();
    const expectedLower = expected.toLowerCase().trim();
    
    if (actualLower === expectedLower) return true;
    
    return actualLower.includes(expectedLower) || expectedLower.includes(actualLower);
}

// Calculate context match score
function calculateContextMatchForValidation(actual, expected) {
    if (!actual || !expected) return 0;
    
    const actualLower = actual.toLowerCase().trim();
    const expectedLower = expected.toLowerCase().trim();
    
    if (actualLower === expectedLower) return 1.0;
    
    if (actualLower.includes(expectedLower) || expectedLower.includes(actualLower)) {
        return 0.8;
    }
    
    const actualWords = actualLower.split(/\s+/);
    const expectedWords = expectedLower.split(/\s+/);
    const commonWords = actualWords.filter(word => 
        word.length > 3 && expectedWords.includes(word)
    );
    
    if (commonWords.length > 0) {
        return commonWords.length / Math.max(actualWords.length, expectedWords.length);
    }
    
    return 0;
}

// Score content context
function scoreContentContext(element, targetText) {
    try {
        const container = window.LumosDomUtils.findNearestContentContainer(element);
        if (!container) return 0;
        
        const containerText = container.textContent || '';
        const similarity = calculateContextMatchForValidation(containerText, targetText);
        
        return similarity;
    } catch (error) {
        console.error('Error scoring content context:', error);
        return 0;
    }
}

// Get text nodes in range
function getTextNodesInRangeForValidation(range) {
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

// Check if text node is in range
function isTextNodeInRange(node, range) {
    try {
        return range.intersectsNode(node);
    } catch (error) {
        return range.commonAncestorContainer.contains(node);
    }
}


// Get previous text node in container
function getPreviousTextNodeInContainer(node, container) {
    const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    walker.currentNode = node;
    return walker.previousNode();
}

// Get next text node in container
function getNextTextNodeInContainer(node, container) {
    const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    walker.currentNode = node;
    return walker.nextNode();
}

// Assign to global window object
window.LumosTextSelectionValidator = {
    findBestTextContainer,
    checkContextMatch,
    calculateContextMatchForValidation,
    scoreContentContext,
    getTextNodesInRangeForValidation,
    isTextNodeInRange,
    getPreviousTextNodeInContainer,
    getNextTextNodeInContainer
};