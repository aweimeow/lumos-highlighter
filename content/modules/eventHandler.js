// Event Handler Module
// Handles all event listeners and user interactions

let isInitialized = false;
let doubleClickDragMode = false;

// Initialize event handlers
function init() {
    if (isInitialized) return;
    
    try {
        // Text selection event
        document.addEventListener('mouseup', handleTextSelection);
        
        // Click events for highlight interaction
        document.addEventListener('click', handleHighlightClick);
        
        // Hide toolbar on document click
        document.addEventListener('click', handleDocumentClick);
        
        // Initialize current styles
        currentStyles = window.LumosSharedConstants?.currentStyles || {};
        
        isInitialized = true;
        console.log('Event handlers initialized');
        
    } catch (error) {
        console.error('Error initializing event handlers:', error);
    }
}

// Handle text selection
function handleTextSelection(event) {
    try {
        if (event.target.closest('.lumos-highlight-toolbar')) {
            return; // Don't handle selections inside toolbar
        }
        
        // Add small delay to ensure selection is complete
        setTimeout(() => {
            const selection = window.LumosToolbarManager?.getCurrentSelection();
            if (selection && selection.text.length > 2) {
                // Show highlight toolbar
                if (window.LumosToolbarManager) {
                    window.LumosToolbarManager.showHighlightToolbar(selection);
                }
            }
        }, 10);
    } catch (error) {
        console.error('Error handling text selection:', error);
    }
}

// Handle highlight click
function handleHighlightClick(event) {
    try {
        const highlightElement = event.target.closest('.lumos-highlight');
        if (highlightElement) {
            event.stopPropagation();
            
            // Show remove/edit toolbar
            if (window.LumosToolbarManager) {
                window.LumosToolbarManager.showRemoveHighlightToolbar(highlightElement);
            }
        }
    } catch (error) {
        console.error('Error handling highlight click:', error);
    }
}

// Handle document click
function handleDocumentClick(event) {
    try {
        // Hide toolbar if clicked outside
        if (!event.target.closest('.lumos-highlight-toolbar') && 
            !event.target.closest('.lumos-highlight')) {
            if (window.LumosToolbarManager) {
                window.LumosToolbarManager.hideHighlightToolbar();
            }
        }
    } catch (error) {
        console.error('Error handling document click:', error);
    }
}

// Handle double click
function handleDoubleClick(event) {
    try {
        // Simple double click handling
        const selection = window.LumosToolbarManager?.getCurrentSelection();
        if (selection && selection.text.length > 2) {
            // Auto-highlight with yellow
            if (window.LumosHighlightManager) {
                window.LumosHighlightManager.applyHighlight('yellow', selection);
            }
        }
    } catch (error) {
        console.error('Error handling double click:', error);
    }
}

// Setup SPA navigation detection
function setupSPANavigationDetection() {
    try {
        // Simple approach - listen for URL changes
        let currentUrl = window.location.href;
        
        const checkUrlChange = () => {
            if (window.location.href !== currentUrl) {
                currentUrl = window.location.href;
                
                // Restore highlights after navigation
                setTimeout(() => {
                    if (window.LumosStorageManager) {
                        window.LumosStorageManager.restoreHighlights();
                    }
                }, 1000);
            }
        };
        
        // Check for URL changes periodically
        setInterval(checkUrlChange, 2000);
        
    } catch (error) {
        console.error('Error setting up SPA navigation detection:', error);
    }
}



// Get double click drag mode
function getDoubleClickDragMode() {
    return doubleClickDragMode;
}

// Set double click drag mode
function setDoubleClickDragMode(mode) {
    doubleClickDragMode = mode;
}

// Assign to global window object
window.LumosEventHandler = {
    init,
    handleTextSelection,
    handleHighlightClick,
    handleDocumentClick,
    handleDoubleClick,
    setupSPANavigationDetection,
    getDoubleClickDragMode,
    setDoubleClickDragMode
};