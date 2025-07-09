// Position Data Generator
// Extracted from content.js to provide position data generation utilities for highlight restoration

import { getXPath, getCSSSelector, createDOMFingerprint } from './domUtils.js';

/**
 * Generate comprehensive position data for a range
 * This data is used to restore highlights across page reloads and dynamic content changes
 * @param {Range} range - The DOM range to generate position data for
 * @returns {Object} Position data object with multiple positioning strategies
 */
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

/**
 * Get text index within a larger context
 * Calculates the position of text within its parent's text content
 * @param {Node} container - The container node (usually a text node)
 * @param {number} offset - The offset within the container
 * @returns {number} The calculated text index
 */
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

/**
 * Map normalized text position back to original text position
 * Used to convert positions from normalized text back to original text
 * @param {string} originalText - The original text
 * @param {string} normalizedText - The normalized text
 * @param {number} normalizedPosition - Position in normalized text
 * @returns {number} Position in original text, or -1 if not found
 */
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

/**
 * Find text location within a container element
 * Searches for text and returns position information
 * @param {Element} container - The container element to search within
 * @param {string} text - The text to find
 * @returns {Object|null} Location object with start/end positions or null if not found
 */
function findTextLocation(container, text) {
    if (!container || !text) return null;
    
    const textContent = container.textContent || '';
    const textIndex = textContent.indexOf(text);
    
    if (textIndex === -1) return null;
    
    // Find the actual DOM nodes that contain this text
    const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    let currentIndex = 0;
    let node;
    
    while (node = walker.nextNode()) {
        const nodeLength = node.textContent.length;
        
        if (currentIndex + nodeLength > textIndex) {
            const startOffset = textIndex - currentIndex;
            const endOffset = startOffset + text.length;
            
            // Check if the text spans multiple nodes
            if (endOffset <= nodeLength) {
                // Text is within a single node
                return {
                    startContainer: node,
                    startOffset: startOffset,
                    endContainer: node,
                    endOffset: endOffset
                };
            } else {
                // Text spans multiple nodes - need to find the end node
                let remainingLength = text.length - (nodeLength - startOffset);
                let endNode = node;
                
                while (remainingLength > 0 && (endNode = walker.nextNode())) {
                    const endNodeLength = endNode.textContent.length;
                    if (remainingLength <= endNodeLength) {
                        return {
                            startContainer: node,
                            startOffset: startOffset,
                            endContainer: endNode,
                            endOffset: remainingLength
                        };
                    }
                    remainingLength -= endNodeLength;
                }
            }
        }
        
        currentIndex += nodeLength;
    }
    
    return null;
}

/**
 * Calculate text position within a specific node
 * @param {Node} targetNode - The node to find position within
 * @param {Node} referenceNode - The reference node (usually parent)
 * @returns {number} The text position index
 */
function calculateTextPosition(targetNode, referenceNode) {
    if (!targetNode || !referenceNode) return 0;
    
    let position = 0;
    let currentNode = referenceNode.firstChild;
    
    while (currentNode && currentNode !== targetNode) {
        if (currentNode.nodeType === Node.TEXT_NODE) {
            position += currentNode.textContent.length;
        }
        currentNode = currentNode.nextSibling;
    }
    
    return position;
}



/**
 * Find the first text node within an element
 * @param {Element} element - The element to search within
 * @returns {Node|null} The first text node or null if none found
 */
function findFirstTextNode(element) {
    if (!element) return null;
    
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    return walker.nextNode();
}

/**
 * Validate position data for completeness
 * @param {Object} positionData - Position data to validate
 * @returns {boolean} True if position data is valid
 */
function validatePositionData(positionData) {
    if (!positionData) return false;
    
    const required = ['startOffset', 'endOffset'];
    const optional = ['startXPath', 'endXPath', 'startSelector', 'endSelector', 'startTextIndex', 'endTextIndex'];
    
    // Check required fields
    for (const field of required) {
        if (typeof positionData[field] === 'undefined') {
            return false;
        }
    }
    
    // At least one positioning method should be available
    const hasXPath = positionData.startXPath && positionData.endXPath;
    const hasSelector = positionData.startSelector && positionData.endSelector;
    const hasTextIndex = typeof positionData.startTextIndex !== 'undefined' && typeof positionData.endTextIndex !== 'undefined';
    
    return hasXPath || hasSelector || hasTextIndex;
}

// Export all functions
export {
    getPositionData,
    getTextIndex,
    mapNormalizedToOriginal,
    findTextLocation,
    calculateTextPosition,
    findFirstTextNode,
    validatePositionData
};