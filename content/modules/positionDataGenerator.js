// Position Data Generator Module
// Extracted from content.js - Functions to generate position data for highlights

// Generate position data for a range
function getPositionData(range) {
    try {
        const startContainer = range.startContainer;
        const endContainer = range.endContainer;
        
        // Basic position data for simple cases
        if (startContainer === endContainer && startContainer.nodeType === Node.TEXT_NODE) {
            return {
                startOffset: range.startOffset,
                endOffset: range.endOffset,
                textContent: startContainer.textContent,
                xpath: getXPathForNode(startContainer.parentNode)
            };
        }
        
        // For complex cases, provide basic fallback
        return {
            startOffset: range.startOffset,
            endOffset: range.endOffset,
            textContent: range.toString(),
            xpath: getXPathForNode(range.commonAncestorContainer)
        };
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.error('Error generating position data:', error); }
        return {
            startOffset: 0,
            endOffset: 0,
            textContent: '',
            xpath: ''
        };
    }
}

// Get XPath for a node
function getXPathForNode(node) {
    if (!node) return '';
    
    try {
        if (node.id) {
            return `//*[@id="${node.id}"]`;
        }
        
        const parts = [];
        let current = node;
        
        while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
            let index = 0;
            let sibling = current.previousSibling;
            
            while (sibling) {
                if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === current.nodeName) {
                    index++;
                }
                sibling = sibling.previousSibling;
            }
            
            const tagName = current.nodeName.toLowerCase();
            const part = index > 0 ? `${tagName}[${index + 1}]` : tagName;
            parts.unshift(part);
            
            current = current.parentNode;
        }
        
        return parts.length ? '/' + parts.join('/') : '';
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.error('Error generating XPath:', error); }
        return '';
    }
}

// Get text index (simplified version)
function getTextIndex(node, text) {
    if (!node || !text) return -1;
    
    try {
        const nodeText = node.textContent || '';
        return nodeText.indexOf(text);
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.error('Error getting text index:', error); }
        return -1;
    }
}

// Map normalized position to original (simplified)
function mapNormalizedToOriginalSimple(originalText, normalizedText, normalizedPosition) {
    try {
        if (normalizedPosition >= normalizedText.length) return originalText.length;
        if (normalizedPosition <= 0) return 0;
        
        // Simple mapping for basic cases
        let originalIndex = 0;
        let normalizedIndex = 0;
        
        while (originalIndex < originalText.length && normalizedIndex < normalizedPosition) {
            const originalChar = originalText[originalIndex];
            const normalizedChar = originalChar.toLowerCase();
            
            if (/[a-zA-Z0-9\s]/.test(normalizedChar)) {
                if (normalizedChar === normalizedText[normalizedIndex]) {
                    normalizedIndex++;
                }
            }
            originalIndex++;
        }
        
        return Math.min(originalIndex, originalText.length);
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.error('Error mapping normalized position:', error); }
        return 0;
    }
}

// Assign to global window object
window.LumosPositionDataGenerator = {
    getPositionData,
    getXPathForNode,
    getTextIndex,
    mapNormalizedToOriginalSimple
};