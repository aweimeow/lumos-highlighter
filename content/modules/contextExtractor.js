// Context Extractor Module
// Extracted from content.js - Functions to extract text context before and after selected text

// Get context before the selection
function getContextBefore(range) {
    try {
        const startContainer = range.startContainer;
        const startOffset = range.startOffset;
        
        if (startContainer.nodeType === Node.TEXT_NODE) {
            // First try the immediate context
            const textBefore = startContainer.textContent.substring(0, startOffset);
            const words = textBefore.split(/\s+/).filter(word => word.trim().length > 0);
            let result = words.slice(-30).join(' ').trim();
            
            // If context is too short, try to get extended context including highlights
            if (result.length < 20) {
                const extendedResult = getExtendedContextBefore(range);
                if (extendedResult && extendedResult.length > result.length) {
                    result = extendedResult;
                }
            }
            
            // Debug for problematic context extraction
            if (window.LumosLogger && (result === 'l.' || result.length < 5)) {
                window.LumosLogger.debug('Debug: Context extraction analysis:', {
                    startContainer: startContainer.textContent?.substring(0, 100),
                    startOffset: startOffset,
                    textBefore: textBefore,
                    words: words,
                    result: result,
                    parentElement: startContainer.parentElement?.tagName,
                    parentText: startContainer.parentElement?.textContent?.substring(0, 100)
                });
            }
            
            return result;
        }
        
        return '';
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.error('Error getting context before:', error); }
        return '';
    }
}

// Get context after the selection
function getContextAfter(range) {
    try {
        const endContainer = range.endContainer;
        const endOffset = range.endOffset;
        
        if (endContainer.nodeType === Node.TEXT_NODE) {
            // First try the immediate context
            const textAfter = endContainer.textContent.substring(endOffset);
            const words = textAfter.split(/\s+/).filter(word => word.trim().length > 0);
            let result = words.slice(0, 30).join(' ').trim();
            
            // If context is too short, try to get extended context including highlights
            if (result.length < 20) {
                const extendedResult = getExtendedContextAfter(range);
                if (extendedResult && extendedResult.length > result.length) {
                    result = extendedResult;
                }
            }
            
            return result;
        }
        
        return '';
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.error('Error getting context after:', error); }
        return '';
    }
}

// Clean context text
function cleanContextText(text) {
    if (!text) return '';
    
    // Remove JavaScript/code patterns
    let cleaned = text
        .replace(/\b(function|var|let|const)\s+\w+\s*[=\(][^;{}]*[;}]/g, '')
        .replace(/window\s*[=.\[].+?[;\]]/g, '')
        .replace(/https?:\/\/[^\s"']+/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    
    // Filter meaningful words
    const words = cleaned.split(/\s+/).filter(word => {
        return word.length >= 1 && 
               /[a-zA-Z]/.test(word) && 
               word.length <= 30;
    });
    
    return words.slice(0, 30).join(' ');
}

// Get extended context that includes content from highlight elements
function getExtendedContextBefore(range) {
    try {
        const startContainer = range.startContainer;
        const contextWords = [];
        const maxWords = 50; // More words for better context
        
        // Walk backwards through text nodes and highlight elements
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        // Position walker at start container
        walker.currentNode = startContainer;
        
        // Get text before selection in current node
        const startOffset = range.startOffset;
        const currentText = startContainer.textContent.substring(0, startOffset);
        if (currentText.trim()) {
            const currentWords = currentText.split(/\s+/).filter(word => word.trim().length > 0);
            contextWords.unshift(...currentWords);
        }
        
        // Walk backwards to collect previous text
        let node = walker.previousNode();
        while (node && contextWords.length < maxWords) {
            const nodeText = node.textContent || '';
            if (nodeText.trim()) {
                // Check if this text node is inside a highlight
                const parentHighlight = node.parentElement?.closest('.lumos-highlight');
                let textToAdd = nodeText;
                
                // If inside highlight, include the highlight content
                if (parentHighlight) {
                    textToAdd = parentHighlight.textContent || nodeText;
                }
                
                const words = textToAdd.split(/\s+/).filter(word => word.trim().length > 0);
                contextWords.unshift(...words);
                
                // If we found a highlight, we might want to skip ahead to avoid duplicates
                if (parentHighlight) {
                    // Skip to before this highlight
                    while (node && node.parentElement?.closest('.lumos-highlight') === parentHighlight) {
                        node = walker.previousNode();
                    }
                    continue;
                }
            }
            node = walker.previousNode();
        }
        
        return contextWords.slice(-maxWords).join(' ').trim();
        
    } catch (error) {
        if (window.LumosLogger) { 
            window.LumosLogger.error('Error in extended context extraction (before):', error); 
        }
        return '';
    }
}

// Get extended context after selection
function getExtendedContextAfter(range) {
    try {
        const endContainer = range.endContainer;
        const contextWords = [];
        const maxWords = 50;
        
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        // Position walker at end container
        walker.currentNode = endContainer;
        
        // Get text after selection in current node
        const endOffset = range.endOffset;
        const currentText = endContainer.textContent.substring(endOffset);
        if (currentText.trim()) {
            const currentWords = currentText.split(/\s+/).filter(word => word.trim().length > 0);
            contextWords.push(...currentWords);
        }
        
        // Walk forwards to collect following text
        let node = walker.nextNode();
        while (node && contextWords.length < maxWords) {
            const nodeText = node.textContent || '';
            if (nodeText.trim()) {
                const parentHighlight = node.parentElement?.closest('.lumos-highlight');
                let textToAdd = nodeText;
                
                if (parentHighlight) {
                    textToAdd = parentHighlight.textContent || nodeText;
                }
                
                const words = textToAdd.split(/\s+/).filter(word => word.trim().length > 0);
                contextWords.push(...words);
                
                if (parentHighlight) {
                    while (node && node.parentElement?.closest('.lumos-highlight') === parentHighlight) {
                        node = walker.nextNode();
                    }
                    continue;
                }
            }
            node = walker.nextNode();
        }
        
        return contextWords.slice(0, maxWords).join(' ').trim();
        
    } catch (error) {
        if (window.LumosLogger) { 
            window.LumosLogger.error('Error in extended context extraction (after):', error); 
        }
        return '';
    }
}

// Get backup context
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
window.LumosContextExtractor = {
    getContextBefore,
    getContextAfter,
    getExtendedContextBefore,
    getExtendedContextAfter,
    cleanContextText,
    getBackupContext
};