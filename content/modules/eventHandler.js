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
        
        // Double click event for auto-highlighting
        document.addEventListener('dblclick', handleDoubleClick);
        
        // Click events for highlight interaction - use capturing phase to ensure it runs first
        document.addEventListener('click', handleHighlightClick, true);
        
        // Hide toolbar on document click - use bubble phase
        document.addEventListener('click', handleDocumentClick, false);
        
        // Initialize current styles
        currentStyles = window.LumosSharedConstants?.currentStyles || {};
        
        isInitialized = true;
        if (window.LumosLogger) { window.LumosLogger.debug('Event handlers initialized'); }
        
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.error('Error initializing event handlers:', error); }
    }
}

// Handle text selection
function handleTextSelection(event) {
    try {
        if (window.LumosLogger) { 
            window.LumosLogger.debug('🖱️ Mouse up event triggered, target:', event.target.nodeName); 
        }
        
        // Check if event.target is a valid element and has closest method
        if (event.target && typeof event.target.closest === 'function' && 
            event.target.closest('.lumos-highlight-toolbar')) {
            if (window.LumosLogger) { 
                window.LumosLogger.debug('🚫 Event inside toolbar, ignoring'); 
            }
            return; // Don't handle selections inside toolbar
        }
        
        // Add small delay to ensure selection is complete
        setTimeout(() => {
            if (window.LumosLogger) { 
                window.LumosLogger.debug('⏰ Processing text selection after delay'); 
            }
            
            if (!window.LumosToolbarManager) {
                if (window.LumosLogger) { 
                    window.LumosLogger.error('❌ LumosToolbarManager not available!'); 
                }
                return;
            }
            
            const selection = window.LumosToolbarManager.getCurrentSelection();
            if (window.LumosLogger) { 
                window.LumosLogger.debug('📝 Selection result:', {
                    hasSelection: !!selection,
                    text: selection ? selection.text : 'none',
                    textLength: selection ? selection.text.length : 0,
                    doubleClickDragMode: doubleClickDragMode
                }); 
            }
            
            if (selection && selection.text.length > 2) {
                // Check if in double click mode - if so, don't show toolbar for regular text selection
                if (doubleClickDragMode) {
                    if (window.LumosLogger) { 
                        window.LumosLogger.debug('🔄 Double click mode enabled - skipping toolbar for text selection'); 
                    }
                    return;
                }
                
                if (window.LumosLogger) { 
                    window.LumosLogger.debug('✅ Valid selection, showing toolbar for:', selection.text.substring(0, 30) + '...'); 
                }
                // Show highlight toolbar
                window.LumosToolbarManager.showHighlightToolbar(selection);
            } else {
                if (window.LumosLogger) { 
                    window.LumosLogger.debug('❌ Invalid selection - too short or no selection'); 
                }
            }
        }, 10);
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.error('Error handling text selection:', error); }
    }
}

// Handle highlight click
function handleHighlightClick(event) {
    try {
        const highlightElement = event.target.closest('.lumos-highlight');
        if (highlightElement) {
            event.stopPropagation();
            event.preventDefault();
            
            if (window.LumosLogger) {
                window.LumosLogger.debug('Highlight clicked, showing toolbar for element:', highlightElement);
            }
            
            // Show remove/edit toolbar
            if (window.LumosToolbarManager) {
                window.LumosToolbarManager.showRemoveHighlightToolbar(highlightElement);
            }
        }
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.error('Error handling highlight click:', error); }
    }
}

// Handle document click
function handleDocumentClick(event) {
    try {
        if (window.LumosLogger) { 
            window.LumosLogger.debug('🖱️ Document click detected, target:', event.target.nodeName, 'type:', event.type); 
        }
        
        // Add a small delay to ensure highlight click handler has time to execute
        setTimeout(() => {
            const isInsideToolbar = event.target && typeof event.target.closest === 'function' && 
                                   event.target.closest('.lumos-highlight-toolbar');
            const isInsideHighlight = event.target && typeof event.target.closest === 'function' && 
                                     event.target.closest('.lumos-highlight');
            
            if (window.LumosLogger) { 
                window.LumosLogger.debug('🎯 Click analysis:', {
                    isInsideToolbar: !!isInsideToolbar,
                    isInsideHighlight: !!isInsideHighlight,
                    shouldHideToolbar: !isInsideToolbar && !isInsideHighlight
                }); 
            }
            
            // Hide toolbar if clicked outside (but not if in protection period)
            if (!isInsideToolbar && !isInsideHighlight) {
                if (window.LumosToolbarManager) {
                    if (window.LumosToolbarManager.isToolbarProtected && window.LumosToolbarManager.isToolbarProtected()) {
                        if (window.LumosLogger) { 
                            window.LumosLogger.debug('🛡️ Toolbar protected - not hiding due to recent creation'); 
                        }
                        return;
                    }
                    
                    if (window.LumosLogger) { 
                        window.LumosLogger.debug('⚡ Hiding toolbar due to outside click'); 
                    }
                    window.LumosToolbarManager.hideHighlightToolbar();
                }
            }
        }, 50); // Increased delay to allow toolbar creation to complete
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.error('Error handling document click:', error); }
    }
}

// Handle double click
function handleDoubleClick(event) {
    try {
        if (window.LumosLogger) { 
            window.LumosLogger.debug('🖱️ Double click event triggered, target:', event.target.nodeName, 'doubleClickDragMode:', doubleClickDragMode); 
        }
        
        // Only handle double click if in double click mode
        if (!doubleClickDragMode) {
            if (window.LumosLogger) { 
                window.LumosLogger.debug('❌ Double click mode disabled - ignoring double click'); 
            }
            return;
        }
        
        // Get current selection
        const selection = window.LumosToolbarManager?.getCurrentSelection();
        if (window.LumosLogger) { 
            window.LumosLogger.debug('📝 Double click selection result:', {
                hasSelection: !!selection,
                text: selection ? selection.text : 'none',
                textLength: selection ? selection.text.length : 0
            }); 
        }
        
        if (selection && selection.text.length > 2) {
            if (window.LumosLogger) { 
                window.LumosLogger.debug('✅ Valid double click selection, showing toolbar for:', selection.text.substring(0, 30) + '...'); 
            }
            // Show highlight toolbar for user to choose color
            if (window.LumosToolbarManager) {
                window.LumosToolbarManager.showHighlightToolbar(selection);
            }
        } else {
            if (window.LumosLogger) { 
                window.LumosLogger.debug('❌ Invalid double click selection - too short or no selection'); 
            }
        }
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.error('Error handling double click:', error); }
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
        if (window.LumosLogger) { window.LumosLogger.error('Error setting up SPA navigation detection:', error); }
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