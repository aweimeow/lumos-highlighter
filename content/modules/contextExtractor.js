// Context Extractor Module
// Extracted from content.js - Functions to extract text context before and after selected text

// Get context before the selection
function getContextBefore(range) {
    try {
        const startContainer = range.startContainer;
        const startOffset = range.startOffset;
        
        if (startContainer.nodeType === Node.TEXT_NODE) {
            const textBefore = startContainer.textContent.substring(0, startOffset);
            const words = textBefore.split(/\s+/).filter(word => word.trim().length > 0);
            return words.slice(-30).join(' ').trim();
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
            const textAfter = endContainer.textContent.substring(endOffset);
            const words = textAfter.split(/\s+/).filter(word => word.trim().length > 0);
            return words.slice(0, 30).join(' ').trim();
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
    cleanContextText,
    getBackupContext
};