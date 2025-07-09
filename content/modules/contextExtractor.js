// Context Extraction Utilities
// Extracted from content.js to provide centralized context extraction functionality

import { TEXT_VALIDATION } from './constants.js';
import { 
    findNearestContentContainer, 
    getPreviousTextNodeInContainer, 
    getNextTextNodeInContainer, 
    isNonContentText, 
    cleanContextText 
} from './domUtils.js';

// Get context before/after selection using multiple robust strategies
export function getContextBefore(range) {
    return getContext(range, 'before');
}

export function getContextAfter(range) {
    return getContext(range, 'after');
}

// Unified context extraction function
function getContext(range, direction) {
    try {
        const strategies = [
            () => getContextByTextNodeTraversal(range, direction),
            () => getContextByDOMWalker(range, direction),
            () => getContextByContainer(range, direction)
        ];
        
        for (let i = 0; i < strategies.length; i++) {
            const result = strategies[i]();
            if (result) {
                console.log(`getContext${direction} - Strategy ${i + 1} succeeded:`, result);
                return result;
            }
        }
        
        console.log(`getContext${direction} - All strategies failed`);
        return '';
    } catch (error) {
        console.error(`Error getting context ${direction}:`, error);
        return '';
    }
}

// Strategy 1: Local text node traversal (limited scope)
function getContextByTextNodeTraversal(range, direction) {
    try {
        const isAfter = direction === 'after';
        const container = isAfter ? range.endContainer : range.startContainer;
        const offset = isAfter ? range.endOffset : range.startOffset;
        
        const contentContainer = findNearestContentContainer(container);
        if (!contentContainer) return null;
        
        let contextText = '';
        let currentNode = container;
        
        // Get text from current node
        if (currentNode.nodeType === Node.TEXT_NODE) {
            const nodeText = currentNode.textContent;
            contextText = isAfter ? nodeText.substring(offset) : nodeText.substring(0, offset);
        }
        
        // Walk through text nodes
        let wordsCollected = 0;
        const maxWords = TEXT_VALIDATION.MAX_CONTEXT_WORDS;
        let nodesTraversed = 0;
        const maxNodes = 20;
        
        while (wordsCollected < maxWords && nodesTraversed < maxNodes) {
            const nextNode = isAfter ? 
                getNextTextNodeInContainer(currentNode, contentContainer) :
                getPreviousTextNodeInContainer(currentNode, contentContainer);
            if (!nextNode) break;
            
            const nodeText = nextNode.textContent || '';
            if (nodeText.trim().length > 0 && !isNonContentText(nodeText)) {
                contextText = isAfter ? 
                    contextText + ' ' + nodeText :
                    nodeText + ' ' + contextText;
                wordsCollected += nodeText.split(/\s+/).length;
            }
            
            currentNode = nextNode;
            nodesTraversed++;
        }
        
        const words = contextText.split(/\s+/).filter(word => word.trim().length > 0);
        const result = isAfter ? 
            words.slice(0, maxWords).join(' ').trim() :
            words.slice(-maxWords).join(' ').trim();
        
        return result.length > 0 ? result : null;
    } catch (error) {
        console.error('Strategy 1 failed:', error);
        return null;
    }
}

// Strategy 2: Local content area approach (more focused)
function getContextByDOMWalker(range, direction) {
    try {
        const isAfter = direction === 'after';
        const container = isAfter ? range.endContainer : range.startContainer;
        const offset = isAfter ? range.endOffset : range.startOffset;
        
        const contentContainer = findNearestContentContainer(container);
        if (!contentContainer) return null;
        
        const contextRange = document.createRange();
        if (isAfter) {
            contextRange.setStart(container, offset);
            contextRange.setEnd(contentContainer, contentContainer.childNodes.length);
        } else {
            contextRange.setStart(contentContainer, 0);
            contextRange.setEnd(container, offset);
        }
        
        const contextText = contextRange.toString();
        const words = contextText.split(/\s+/).filter(word => word.trim().length > 0);
        const result = isAfter ? 
            words.slice(0, TEXT_VALIDATION.MAX_CONTEXT_WORDS).join(' ').trim() :
            words.slice(-TEXT_VALIDATION.MAX_CONTEXT_WORDS).join(' ').trim();
        
        return result.length > 0 ? result : null;
    } catch (error) {
        console.error('Strategy 2 failed:', error);
        return null;
    }
}

// Strategy 3: Container-based approach (original logic, simplified)
function getContextByContainer(range, direction) {
    try {
        const isAfter = direction === 'after';
        const container = isAfter ? range.endContainer : range.startContainer;
        let current = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
        
        // Try progressively larger containers
        for (let i = 0; i < 5 && current && current !== document.body; i++) {
            const fullText = current.textContent || '';
            const selectedText = range.toString();
            const selectedIndex = fullText.indexOf(selectedText);
            
            if (selectedIndex >= 0) {
                let contextText;
                if (isAfter) {
                    const afterStartIndex = selectedIndex + selectedText.length;
                    contextText = fullText.substring(afterStartIndex);
                } else {
                    contextText = fullText.substring(0, selectedIndex);
                }
                
                const words = contextText.split(/\s+/).filter(word => word.trim().length > 0);
                const result = isAfter ? 
                    words.slice(0, TEXT_VALIDATION.MAX_CONTEXT_WORDS).join(' ').trim() :
                    words.slice(-TEXT_VALIDATION.MAX_CONTEXT_WORDS).join(' ').trim();
                
                if (result.length > 0) return result;
            }
            
            current = current.parentElement;
        }
        
        return null;
    } catch (error) {
        console.error('Strategy 3 failed:', error);
        return null;
    }
}

// Find the best text container, avoiding ad and script containers
export function findBestTextContainer(element) {
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

// Backup context extraction for problematic websites
export function getBackupContext(direction, range) {
    try {
        const selectedText = range.toString();
        const bodyText = document.body.textContent || '';
        const selectedIndex = bodyText.indexOf(selectedText);
        
        if (selectedIndex >= 0) {
            const isAfter = direction === 'after';
            const contextText = isAfter ? 
                bodyText.substring(selectedIndex + selectedText.length, selectedIndex + selectedText.length + 500) :
                bodyText.substring(Math.max(0, selectedIndex - 500), selectedIndex);
                
            const words = contextText.split(/\s+/).filter(word => word.trim().length > 0);
            const result = isAfter ? 
                words.slice(0, TEXT_VALIDATION.MAX_CONTEXT_WORDS).join(' ') :
                words.slice(-TEXT_VALIDATION.MAX_CONTEXT_WORDS).join(' ');
            return cleanContextText(result);
        }
    } catch (error) {
        console.error('Error in backup context extraction:', error);
    }
    
    return '';
}

// Context validation functions
export function validateContext(contextText) {
    return contextText && typeof contextText === 'string' && 
           contextText.trim().length >= TEXT_VALIDATION.MIN_CONTEXT_LENGTH;
}

export function isContextMeaningful(contextText) {
    if (!validateContext(contextText)) return false;
    
    const words = contextText.split(/\s+/).filter(word => word.trim().length > 0);
    return words.some(word => 
        word.length >= TEXT_VALIDATION.MIN_TEXT_LENGTH && 
        /[a-zA-Z]/.test(word) && 
        !isNonContentText(word)
    );
}

// Enhanced context cleaning specifically for context extraction
export function cleanExtractedContext(text) {
    if (!text) return '';
    
    // Use the base cleaning function from domUtils, then apply additional cleaning
    let cleaned = cleanContextText(text)
        .replace(/\s*[>›]\s*/g, ' ')  // Remove navigation breadcrumbs
        .replace(/^\s*[•·▪▫▸▹‣⁃]\s*/gm, '')  // Remove bullet points
        .replace(/[.]{3,}/g, '...')  // Remove excessive dots
        .replace(/[-]{3,}/g, '---')  // Remove excessive dashes
        .replace(/\s+/g, ' ')
        .trim();
    
    // Final word filtering
    const words = cleaned.split(/\s+/).filter(word => {
        const trimmed = word.trim();
        return trimmed.length >= 1 && 
               trimmed.length <= TEXT_VALIDATION.MAX_WORD_LENGTH &&
               /[a-zA-Z]/.test(trimmed) &&
               !isNonContentText(trimmed);
    });
    
    return words.slice(0, TEXT_VALIDATION.MAX_CONTEXT_WORDS).join(' ');
}

// Export strategy functions for external use
export {
    getContextByTextNodeTraversal,
    getContextByDOMWalker,
    getContextByContainer
};