// Style Manager Module
// Handles styling and appearance of highlights

// Apply styles to a highlight element
function applyStylesToHighlight(highlightElement) {
    try {
        if (!highlightElement) return;
        
        // Get current styles from shared constants
        const currentStyles = window.LumosSharedConstants?.currentStyles || {};
        
        // Apply corner style
        if (currentStyles.cornerStyle === 'rounded') {
            highlightElement.style.borderRadius = '3px';
        } else {
            highlightElement.style.borderRadius = '0';
        }
        
        // Apply background style
        if (currentStyles.backgroundStyle === 'solid') {
            highlightElement.style.backgroundColor = getColorWithOpacity(highlightElement.dataset.highlightColor, 0.8);
        } else {
            highlightElement.style.backgroundColor = getColorWithOpacity(highlightElement.dataset.highlightColor, 0.3);
        }
        
        // Apply text style
        if (currentStyles.textStyle === 'bold') {
            highlightElement.style.fontWeight = 'bold';
        } else {
            highlightElement.style.fontWeight = 'normal';
        }
        
        // Basic highlight styling
        highlightElement.style.padding = '1px 2px';
        highlightElement.style.cursor = 'pointer';
        
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.error('Error applying styles to highlight:', error); }
    }
}

// Get color with opacity
function getColorWithOpacity(colorName, opacity) {
    const colors = {
        'red': `rgba(255, 107, 107, ${opacity})`,
        'orange': `rgba(255, 167, 38, ${opacity})`,
        'yellow': `rgba(255, 235, 59, ${opacity})`,
        'green': `rgba(76, 175, 80, ${opacity})`,
        'blue': `rgba(33, 150, 243, ${opacity})`
    };
    
    return colors[colorName] || `rgba(255, 235, 59, ${opacity})`;
}

// Update highlight styles globally
function updateHighlightStyles(newStyles) {
    try {
        // Update current styles
        if (window.LumosSharedConstants && window.LumosSharedConstants.updateCurrentStyles) {
            window.LumosSharedConstants.updateCurrentStyles(newStyles);
        }
        
        // Apply to all existing highlights
        const highlights = document.querySelectorAll('.lumos-highlight');
        highlights.forEach(highlight => {
            applyStylesToHighlight(highlight);
        });
        
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.error('Error updating highlight styles:', error); }
    }
}

// Update highlight color
function updateHighlightColor(highlightElement, newColor) {
    try {
        if (!highlightElement) return;
        
        // Update class
        highlightElement.className = `lumos-highlight lumos-highlight-${newColor}`;
        highlightElement.setAttribute('data-highlight-color', newColor);
        
        // Apply new styles
        applyStylesToHighlight(highlightElement);
        
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.error('Error updating highlight color:', error); }
    }
}

// Assign to global window object
window.LumosStyleManager = {
    applyStylesToHighlight,
    getColorWithOpacity,
    updateHighlightStyles,
    updateHighlightColor
};