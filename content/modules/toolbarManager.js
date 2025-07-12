// Toolbar Manager Module
// Handles showing/hiding toolbars and managing user interactions

let currentToolbar = null;
let showingToolbar = false;
let currentSelection = null;
let toolbarProtectionTime = 0; // Timestamp to prevent immediate hiding

// Show highlight toolbar
function showHighlightToolbar(selection) {
    try {
        if (window.LumosLogger) { 
            window.LumosLogger.debug('🔧 showHighlightToolbar called with selection:', {
                hasSelection: !!selection,
                hasRange: selection ? !!selection.range : false,
                text: selection ? selection.text.substring(0, 30) + '...' : 'none'
            }); 
        }
        
        hideHighlightToolbar(); // Hide any existing toolbar
        
        if (!selection || !selection.range) {
            if (window.LumosLogger) { 
                window.LumosLogger.debug('❌ No selection or range, aborting toolbar creation'); 
            }
            return;
        }
        
        currentSelection = selection;
        
        // Create toolbar
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
        
        // Position toolbar
        const range = selection.range;
        const rect = range.getBoundingClientRect();
        const top = rect.top + window.scrollY - 50;
        const left = rect.left + window.scrollX;
        
        toolbar.style.position = 'absolute';
        toolbar.style.top = top + 'px';
        toolbar.style.left = left + 'px';
        toolbar.style.zIndex = '10000';
        toolbar.style.display = 'block';
        
        if (window.LumosLogger) { 
            window.LumosLogger.debug('📍 Positioning toolbar at:', {
                top: top,
                left: left,
                rectTop: rect.top,
                rectLeft: rect.left,
                scrollY: window.scrollY,
                scrollX: window.scrollX
            }); 
        }
        
        // Add event listeners
        const colorButtons = toolbar.querySelectorAll('.lumos-color-btn');
        colorButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const color = button.dataset.color;
                if (window.LumosHighlightManager && currentSelection) {
                    window.LumosHighlightManager.applyHighlight(color, currentSelection);
                }
                hideHighlightToolbar();
            });
        });
        
        document.body.appendChild(toolbar);
        currentToolbar = toolbar;
        showingToolbar = true;
        toolbarProtectionTime = Date.now(); // Set protection timestamp
        
        if (window.LumosLogger) { 
            window.LumosLogger.debug('✅ Toolbar created and added to DOM:', {
                className: toolbar.className,
                display: toolbar.style.display,
                position: toolbar.style.position,
                top: toolbar.style.top,
                left: toolbar.style.left,
                zIndex: toolbar.style.zIndex,
                buttonCount: toolbar.querySelectorAll('.lumos-color-btn').length,
                protectionTime: toolbarProtectionTime
            }); 
        }
        
        // Check if toolbar still exists after a short delay
        setTimeout(() => {
            const stillExists = document.querySelector('.lumos-highlight-toolbar');
            if (window.LumosLogger) { 
                window.LumosLogger.debug('🔍 Toolbar existence check after 100ms:', {
                    stillExists: !!stillExists,
                    currentToolbar: !!currentToolbar,
                    showingToolbar: showingToolbar
                }); 
            }
        }, 100);
        
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.error('Error showing highlight toolbar:', error); }
    }
}

// Hide highlight toolbar
function hideHighlightToolbar() {
    try {
        if (currentToolbar) {
            if (window.LumosLogger) { 
                window.LumosLogger.debug('🗑️ Hiding toolbar - removing from DOM'); 
            }
            currentToolbar.remove();
            currentToolbar = null;
        }
        showingToolbar = false;
        currentSelection = null;
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.error('Error hiding highlight toolbar:', error); }
    }
}

// Show remove highlight toolbar
function showRemoveHighlightToolbar(highlightElement) {
    try {
        if (window.LumosLogger) {
            window.LumosLogger.debug('Showing remove highlight toolbar for element:', highlightElement);
        }
        
        hideHighlightToolbar();
        
        if (!highlightElement) {
            if (window.LumosLogger) {
                window.LumosLogger.warn('No highlight element provided to showRemoveHighlightToolbar');
            }
            return;
        }
        
        const toolbar = document.createElement('div');
        toolbar.className = 'lumos-highlight-toolbar lumos-remove-toolbar';
        toolbar.innerHTML = `
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
        
        // Position toolbar
        const rect = highlightElement.getBoundingClientRect();
        toolbar.style.position = 'absolute';
        toolbar.style.top = (rect.top + window.scrollY - 50) + 'px';
        toolbar.style.left = (rect.left + window.scrollX) + 'px';
        toolbar.style.zIndex = '10000';
        toolbar.style.display = 'block';
        
        // Add event listeners
        const colorButtons = toolbar.querySelectorAll('.lumos-color-btn');
        colorButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const color = button.dataset.color;
                if (window.LumosHighlightManager) {
                    window.LumosHighlightManager.changeHighlightColor(highlightElement, color);
                }
                hideHighlightToolbar();
            });
        });
        
        const removeButton = toolbar.querySelector('.lumos-remove-btn');
        removeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.LumosHighlightManager) {
                window.LumosHighlightManager.removeHighlight(highlightElement);
            }
            hideHighlightToolbar();
        });
        
        document.body.appendChild(toolbar);
        currentToolbar = toolbar;
        showingToolbar = true;
        
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.error('Error showing remove highlight toolbar:', error); }
    }
}

// Get current selection
function getCurrentSelection() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return null;
    
    const range = selection.getRangeAt(0);
    const originalText = range.toString();
    
    // Don't trim the text as it may truncate important characters
    // Only check if the selection is effectively empty (all whitespace)
    if (originalText.trim().length === 0) return null;
    
    // Debug potential truncation issues
    if (window.LumosLogger && originalText !== originalText.trim()) {
        window.LumosLogger.debug('Debug: Selection text has leading/trailing whitespace:', {
            original: `"${originalText}"`,
            trimmed: `"${originalText.trim()}"`,
            startChar: originalText.charAt(0),
            endChar: originalText.charAt(originalText.length - 1)
        });
    }
    
    return {
        range: range,
        text: originalText, // Use original text without trimming
        selection: selection
    };
}

// Check if toolbar is showing
function getShowingToolbar() {
    return showingToolbar;
}

// Set toolbar showing state
function setShowingToolbar(state) {
    showingToolbar = state;
}

// Get current toolbar element
function getHighlightToolbar() {
    return currentToolbar;
}

// Check if toolbar is in protection period (just created)
function isToolbarProtected() {
    const now = Date.now();
    const isProtected = (now - toolbarProtectionTime) < 200; // 200ms protection period
    if (window.LumosLogger && isProtected) {
        window.LumosLogger.debug('🛡️ Toolbar is in protection period:', {
            timeSinceCreation: now - toolbarProtectionTime,
            protectionRemaining: 200 - (now - toolbarProtectionTime)
        });
    }
    return isProtected;
}

// Cleanup toolbar
function cleanupToolbar() {
    hideHighlightToolbar();
}

// Assign to global window object
window.LumosToolbarManager = {
    showHighlightToolbar,
    hideHighlightToolbar,
    showRemoveHighlightToolbar,
    getCurrentSelection,
    getShowingToolbar,
    setShowingToolbar,
    getHighlightToolbar,
    isToolbarProtected,
    cleanupToolbar
};