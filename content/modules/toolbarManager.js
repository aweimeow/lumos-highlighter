// Toolbar Manager Module
// Handles showing/hiding toolbars and managing user interactions

let currentToolbar = null;
let showingToolbar = false;
let currentSelection = null;

// Show highlight toolbar
function showHighlightToolbar(selection) {
    try {
        hideHighlightToolbar(); // Hide any existing toolbar
        
        if (!selection || !selection.range) {
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
                if (window.LumosHighlightManager && currentSelection) {
                    window.LumosHighlightManager.applyHighlight(color, currentSelection);
                }
                hideHighlightToolbar();
            });
        });
        
        document.body.appendChild(toolbar);
        currentToolbar = toolbar;
        showingToolbar = true;
        
    } catch (error) {
        console.error('Error showing highlight toolbar:', error);
    }
}

// Hide highlight toolbar
function hideHighlightToolbar() {
    try {
        if (currentToolbar) {
            currentToolbar.remove();
            currentToolbar = null;
        }
        showingToolbar = false;
        currentSelection = null;
    } catch (error) {
        console.error('Error hiding highlight toolbar:', error);
    }
}

// Show remove highlight toolbar
function showRemoveHighlightToolbar(highlightElement) {
    try {
        hideHighlightToolbar();
        
        if (!highlightElement) return;
        
        const toolbar = document.createElement('div');
        toolbar.className = 'lumos-highlight-toolbar lumos-remove-toolbar';
        toolbar.innerHTML = `
            <div class="lumos-color-options">
                <button class="lumos-color-btn" data-color="red" title="Red"></button>
                <button class="lumos-color-btn" data-color="orange" title="Orange"></button>
                <button class="lumos-color-btn" data-color="yellow" title="Yellow"></button>
                <button class="lumos-color-btn" data-color="green" title="Green"></button>
                <button class="lumos-color-btn" data-color="blue" title="Blue"></button>
            </div>
            <div class="lumos-separator">|</div>
            <button class="lumos-remove-btn" title="Remove highlight">Delete</button>
        `;
        
        // Position toolbar
        const rect = highlightElement.getBoundingClientRect();
        toolbar.style.position = 'absolute';
        toolbar.style.top = (rect.top + window.scrollY - 50) + 'px';
        toolbar.style.left = (rect.left + window.scrollX) + 'px';
        toolbar.style.zIndex = '10000';
        
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
        console.error('Error showing remove highlight toolbar:', error);
    }
}

// Get current selection
function getCurrentSelection() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return null;
    
    const range = selection.getRangeAt(0);
    const text = range.toString().trim();
    
    if (text.length === 0) return null;
    
    return {
        range: range,
        text: text,
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
    cleanupToolbar
};