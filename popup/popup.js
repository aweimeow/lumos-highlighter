// Popup script for Lumos Highlighter
// Handles highlight style customization settings

// Popup script - minimal logging for popup context

// Default style settings
const defaultStyles = {
    cornerStyle: 'rectangular',
    backgroundStyle: 'transparent',
    textStyle: 'default',
    highlightMode: 'instant'
};

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Set default active buttons if no settings exist
    setActiveButton('corner-style', 'rectangular');
    setActiveButton('background-style', 'transparent');
    setActiveButton('text-style', 'default');
    setActiveButton('highlight-mode', 'instant');
    
    initializeStyleSettings();
    setupEventListeners();
    setupDebugToggle();
});

// Initialize style settings from storage
function initializeStyleSettings() {
    chrome.storage.sync.get(['lumosHighlightStyles'], function(result) {
        const styles = result.lumosHighlightStyles || defaultStyles;
        
        // Set button active states
        setActiveButton('corner-style', styles.cornerStyle);
        setActiveButton('background-style', styles.backgroundStyle);
        setActiveButton('text-style', styles.textStyle);
        setActiveButton('highlight-mode', styles.highlightMode || 'instant');
        
        // Update preview
        updatePreview();
    });
}

// Set active button for a style group
function setActiveButton(styleType, value) {
    // Remove active class from all buttons in this group
    document.querySelectorAll(`[data-style="${styleType}"]`).forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to selected button
    const activeBtn = document.querySelector(`[data-style="${styleType}"][data-value="${value}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

// Setup event listeners for style buttons and save button
function setupEventListeners() {
    // Listen for style button clicks
    const styleButtons = document.querySelectorAll('.style-btn');
    styleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const styleType = this.dataset.style;
            const value = this.dataset.value;
            
            // Set this button as active
            setActiveButton(styleType, value);
            
            // Update preview
            updatePreview();
        });
    });
    
    // Save button
    document.getElementById('save-styles').addEventListener('click', saveStyleSettings);
    
    // Buy me a coffee button
    const coffeeButton = document.querySelector('.coffee-button');
    if (coffeeButton) {
        coffeeButton.addEventListener('click', handleCoffeeClick);
    }
}

// Update preview based on selected styles
function updatePreview() {
    const previewElement = document.getElementById('preview-text');
    const cornerStyle = getActiveButtonValue('corner-style');
    const backgroundStyle = getActiveButtonValue('background-style');
    const textStyle = getActiveButtonValue('text-style');
    
    // Reset classes
    previewElement.className = 'preview-highlight';
    
    // Apply corner style
    if (cornerStyle === 'rounded') {
        previewElement.classList.add('corner-rounded');
    }
    
    // Apply background style
    if (backgroundStyle === 'underline') {
        previewElement.classList.add('bg-underline');
    } else if (backgroundStyle === 'crayon') {
        previewElement.classList.add('bg-crayon');
    }
    
    // Apply text style
    if (textStyle === 'bold') {
        previewElement.classList.add('text-bold');
    } else if (textStyle === 'shadow') {
        previewElement.classList.add('text-shadow');
    }
}

// Get active button value for a style group
function getActiveButtonValue(styleType) {
    const activeBtn = document.querySelector(`[data-style="${styleType}"].active`);
    return activeBtn ? activeBtn.dataset.value : 'default';
}

// Save style settings to storage
function saveStyleSettings() {
    const styles = {
        cornerStyle: getActiveButtonValue('corner-style'),
        backgroundStyle: getActiveButtonValue('background-style'),
        textStyle: getActiveButtonValue('text-style'),
        highlightMode: getActiveButtonValue('highlight-mode')
    };
    
    chrome.storage.sync.set({ lumosHighlightStyles: styles }, function() {
        console.log('Style settings saved:', styles);
        
        // Show success feedback
        const saveButton = document.getElementById('save-styles');
        const originalText = saveButton.textContent;
        saveButton.textContent = 'Saved!';
        saveButton.style.backgroundColor = '#27ae60';
        
        setTimeout(() => {
            saveButton.textContent = originalText;
            saveButton.style.backgroundColor = '#3498db';
        }, 2000);
        
        // Notify all content scripts to update their styles
        notifyStyleUpdate(styles);
    });
}

// Notify all tabs to update their highlight styles
function notifyStyleUpdate(styles) {
    chrome.tabs.query({}, function(tabs) {
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
                action: 'updateHighlightStyles',
                styles: styles
            }, function(response) {
                // Ignore errors for tabs that don't have the content script
                if (chrome.runtime.lastError) {
                    console.log('Could not send message to tab:', tab.id);
                }
            });
        });
    });
}

// Handle coffee button click with fireworks and thank you animation
function handleCoffeeClick(event) {
    event.preventDefault();
    
    // Create fireworks effect
    createFireworks();
    
    // Show thank you message
    showThankYouMessage();
    
    // Delay opening the link to show animation (1 second)
    setTimeout(() => {
        window.open('https://coff.ee/weiyudev', '_blank');
    }, 1500);
}

// Setup debug toggle functionality
function setupDebugToggle() {
    const debugActivationArea = document.querySelector('.debug-activation-area');
    const debugPageFlip = document.querySelector('.debug-page-flip');
    const debugText = document.querySelector('.debug-text');
    
    if (!debugActivationArea || !debugPageFlip || !debugText) {
        console.error('Debug toggle elements not found');
        return;
    }
    
    let isDebugEnabled = false;
    
    // Get initial debug state
    chrome.storage.local.get(['lumosDebugMode'], function(result) {
        isDebugEnabled = result.lumosDebugMode === true;
        updateDebugUI();
    });
    
    // Click handler for debug toggle
    debugActivationArea.addEventListener('click', function() {
        isDebugEnabled = !isDebugEnabled;
        
        // Add flipping animation
        debugPageFlip.classList.add('flipping');
        
        // Save debug state to storage
        chrome.storage.local.set({ lumosDebugMode: isDebugEnabled }, function() {
            updateDebugUI();
            showDebugFeedback();
            
            // Notify content scripts about debug mode change
            notifyDebugModeChange(isDebugEnabled);
        });
        
        // Remove flipping animation after it completes
        setTimeout(() => {
            debugPageFlip.classList.remove('flipping');
        }, 600);
    });
    
    // Update debug UI state
    function updateDebugUI() {
        if (isDebugEnabled) {
            debugPageFlip.classList.add('flipped');
            debugText.textContent = 'debug';
            debugText.style.color = '#e91e63';
        } else {
            debugPageFlip.classList.remove('flipped');
            debugText.textContent = 'debug';
            debugText.style.color = '#e91e63';
        }
    }
    
    // Show debug toggle feedback
    function showDebugFeedback() {
        // Brief animation feedback
        debugPageFlip.style.transform = 'scale(1.1)';
        setTimeout(() => {
            debugPageFlip.style.transform = 'scale(1)';
        }, 150);
        
        // Console feedback
        if (isDebugEnabled) {
            console.log('🔍 [Lumos Debug] Debug mode enabled - console logs will now appear');
        } else {
            console.log('🔍 [Lumos Debug] Debug mode disabled - console logs are now hidden');
        }
    }
    
    // Notify all content scripts about debug mode change
    function notifyDebugModeChange(enabled) {
        chrome.tabs.query({}, function(tabs) {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    action: 'updateDebugMode',
                    enabled: enabled
                }, function(response) {
                    // Ignore errors for tabs that don't have the content script
                    if (chrome.runtime.lastError) {
                        // Silent fail - not all tabs have content scripts
                    }
                });
            });
        });
    }
}

// Create fireworks animation
function createFireworks() {
    const colors = ['red', 'blue', 'green', 'yellow', 'purple'];
    const container = document.body;
    
    // Create multiple firework bursts
    for (let burst = 0; burst < 3; burst++) {
        setTimeout(() => {
            const centerX = Math.random() * window.innerWidth;
            const centerY = Math.random() * (window.innerHeight * 0.6) + (window.innerHeight * 0.2);
            
            // Create sparks for each burst
            for (let i = 0; i < 12; i++) {
                const spark = document.createElement('div');
                spark.className = `firework ${colors[Math.floor(Math.random() * colors.length)]}`;
                
                const angle = (i * 30) * (Math.PI / 180);
                const distance = 50 + Math.random() * 100;
                const endX = centerX + Math.cos(angle) * distance;
                const endY = centerY + Math.sin(angle) * distance;
                
                spark.style.left = centerX + 'px';
                spark.style.top = centerY + 'px';
                
                container.appendChild(spark);
                
                // Animate spark
                spark.animate([
                    {
                        transform: 'translate(0, 0) scale(0)',
                        opacity: 1
                    },
                    {
                        transform: `translate(${endX - centerX}px, ${endY - centerY}px) scale(1)`,
                        opacity: 1,
                        offset: 0.7
                    },
                    {
                        transform: `translate(${endX - centerX}px, ${endY - centerY + 50}px) scale(0)`,
                        opacity: 0
                    }
                ], {
                    duration: 1000 + Math.random() * 500,
                    easing: 'ease-out'
                }).onfinish = () => {
                    spark.remove();
                };
            }
        }, burst * 200);
    }
}

// Show thank you message
function showThankYouMessage() {
    const message = document.createElement('div');
    message.className = 'thank-you-message';
    message.textContent = 'THANK YOU! ❤️';
    
    document.body.appendChild(message);
    
    // Animate in
    message.animate([
        {
            transform: 'translate(-50%, -50%) scale(0) rotate(-10deg)',
            opacity: 0
        },
        {
            transform: 'translate(-50%, -50%) scale(1.2) rotate(0deg)',
            opacity: 1,
            offset: 0.6
        },
        {
            transform: 'translate(-50%, -50%) scale(1) rotate(0deg)',
            opacity: 1
        }
    ], {
        duration: 1500,
        easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    });
    
    // Animate out after delay
    setTimeout(() => {
        message.animate([
            {
                transform: 'translate(-50%, -50%) scale(1) rotate(0deg)',
                opacity: 1
            },
            {
                transform: 'translate(-50%, -50%) scale(0) rotate(10deg)',
                opacity: 0
            }
        ], {
            duration: 500,
            easing: 'ease-in'
        }).onfinish = () => {
            message.remove();
        };
    }, 2000);
}