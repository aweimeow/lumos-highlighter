// DOM Utility Functions
// Extracted from content.js to provide reusable DOM manipulation and traversal utilities

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

// Find the nearest content container (more focused than findBestTextContainer)
function findNearestContentContainer(element) {
    let current = element.nodeType === Node.TEXT_NODE ? element.parentElement : element;
    
    // Priority selectors for content containers
    const contentSelectors = [
        'article', 'main', '[role="main"]', '.article', '.content', '.post',
        '.entry', '.story', 'section', 'div.text', 'div[class*="content"]',
        'div[class*="article"]', 'div[class*="post"]', 'div[class*="story"]', 'p'
    ];
    
    // Avoid these containers
    const avoidSelectors = [
        'header', 'footer', 'nav', 'aside', '[class*="ad"]', '[id*="ad"]',
        '[class*="advertisement"]', '[class*="menu"]', '[class*="sidebar"]',
        '[class*="navigation"]', '[class*="comment"]', '[class*="reply"]'
    ];
    
    // Walk up the DOM tree to find a content container
    while (current && current !== document.body) {
        const shouldAvoid = avoidSelectors.some(selector => {
            try {
                return current.matches && current.matches(selector);
            } catch (e) {
                return false;
            }
        });
        
        if (!shouldAvoid) {
            const isContentContainer = contentSelectors.some(selector => {
                try {
                    return current.matches && current.matches(selector);
                } catch (e) {
                    return false;
                }
            });
            
            if (isContentContainer) {
                const textLength = (current.textContent || '').trim().length;
                if (textLength > 50) {
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

// Check if a string is a valid CSS identifier
function isValidCSSIdentifier(str) {
    if (!str || typeof str !== 'string') return false;
    
    const validPattern = /^[a-zA-Z_][\w-]*$/;
    const invalidChars = /[+(){}[\]="'<>.,!@#$%^&*|\\/?]/;
    
    return validPattern.test(str) && !invalidChars.test(str) && !str.startsWith('--');
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
        const maxDepth = 10;
        
        while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body && depth < maxDepth) {
            let selector = current.tagName.toLowerCase();
            
            // Add class if available and valid
            if (current.className && typeof current.className === 'string') {
                const classes = current.className.split(/\s+/)
                    .filter(c => c && !c.startsWith('lumos-') && isValidCSSIdentifier(c))
                    .slice(0, 2);
                
                if (classes.length > 0) {
                    selector += '.' + classes.join('.');
                }
            }
            
            path.unshift(selector);
            current = current.parentElement;
            depth++;
        }
        
        return path.length > 0 ? path.join(' > ') : '';
    } catch (error) {
        console.error('Error generating CSS selector:', error);
        return '';
    }
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

// Get all text nodes within a range
function getTextNodesInRange(range) {
    const textNodes = [];
    const selectedText = range.toString();
    
    // If it's a simple range within the same text node, handle it directly
    if (range.startContainer === range.endContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
        textNodes.push(range.startContainer);
        return textNodes;
    }
    
    // For complex ranges, walk through all text nodes
    const walker = document.createTreeWalker(
        range.commonAncestorContainer,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    let node;
    while (node = walker.nextNode()) {
        const nodeText = node.textContent;
        const isWhitespaceOnly = /^\s*$/.test(nodeText);
        
        if (node === range.startContainer || node === range.endContainer) {
            textNodes.push(node);
        } else if (!isWhitespaceOnly && range.intersectsNode(node)) {
            try {
                const nodeTextTrimmed = nodeText.trim();
                if (nodeTextTrimmed.length > 0 && selectedText.includes(nodeTextTrimmed)) {
                    textNodes.push(node);
                }
            } catch (error) {
                console.warn('Error checking node:', error);
            }
        }
    }
    
    return textNodes;
}

// Get previous text node within a specific container
function getPreviousTextNodeInContainer(node, container) {
    let walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(n) {
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
        /^(more|read more|continue|next|previous)$/,
        /^[0-9]+$/,
        /^[0-9]+\s*(comments?|views?|likes?|shares?|votes?)$/i,
        /^[\s\n\r\t]+$/
    ];
    
    return nonContentPatterns.some(pattern => pattern.test(trimmed));
}

// Create highlight element at specified position
function createHighlightElement(node, index, text, highlightData) {
    try {
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + text.length);
        
        if (range.collapsed) {
            return false;
        }
        
        const highlightElement = document.createElement('span');
        highlightElement.className = `lumos-highlight lumos-highlight-${highlightData.color}`;
        highlightElement.setAttribute('data-highlight-id', highlightData.id);
        highlightElement.setAttribute('data-highlight-color', highlightData.color);
        
        try {
            range.surroundContents(highlightElement);
            return true;
        } catch (error) {
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
    
    return result;
}

// Generate UUID
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Export all functions
// Export all functions to window object
window.LumosDomUtils = {
    getCommonParent,
    findNearestContentContainer,
    getVisibleTextContent,
    getXPath,
    isValidCSSIdentifier,
    getCSSSelector,
    createDOMFingerprint,
    getTextNodesInRange,
    getPreviousTextNodeInContainer,
    getNextTextNodeInContainer,
    isNonContentText,
    createHighlightElement,
    cleanContextText,
    generateUUID
};