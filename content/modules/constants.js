// Constants and Configuration
// Extracted from content.js to provide centralized configuration and default values

// Default highlight styles and settings
const DEFAULT_STYLES = {
    cornerStyle: 'rectangular',
    backgroundStyle: 'transparent',
    textStyle: 'default',
    highlightMode: 'instant'
};

// Color button configurations with titles
const COLOR_BUTTON_CONFIG = [
    { color: 'red', title: 'Red highlight' },
    { color: 'orange', title: 'Orange highlight' },
    { color: 'yellow', title: 'Yellow highlight' },
    { color: 'green', title: 'Green highlight' },
    { color: 'blue', title: 'Blue highlight' }
];

// Text and content validation constants
const TEXT_VALIDATION = {
    MIN_TEXT_LENGTH: 3,
    MIN_CONTEXT_LENGTH: 5,
    MAX_WORD_LENGTH: 30,
    MAX_CONTEXT_WORDS: 30,
    PREVIEW_LENGTH: 100
};

// Timeout values for various operations
const TIMEOUTS = {
    // SPA navigation detection
    URL_CHANGE_CHECK: 100,
    URL_CHANGE_INTERVAL: 2000,
    
    // Text selection and highlighting
    SELECTION_DELAY: 100,
    DOUBLE_CLICK_TIMEOUT: 3000,
    
    // DOM operations and retries
    DOM_CHANGE_DEBOUNCE_SHORT: 100,
    DOM_CHANGE_DEBOUNCE_LONG: 200,
    
    // Content loading and restoration
    HIGHLIGHT_RESTORATION_DELAY: 1000,
    LAZY_CONTENT_WAIT: 500,
    LAZY_CONTENT_FALLBACK: 3000,
    
    // Async operations
    ASYNC_OPERATION_DELAY: 0 // setTimeout with 0 for next tick
};

// DOM observer configuration
const DOM_OBSERVER_CONFIG = {
    childList: true,
    subtree: true,
    attributes: false,
    attributeOldValue: false,
    characterData: false,
    characterDataOldValue: false
};

// Content detection selectors
const CONTENT_SELECTORS = {
    // Priority selectors for content containers
    CONTENT_CONTAINERS: [
        'article', 'main', '[role="main"]', '.article', '.content', '.post',
        '.entry', '.story', 'section', 'div.text', 'div[class*="content"]',
        'div[class*="article"]', 'div[class*="post"]', 'div[class*="story"]', 'p'
    ],
    
    // Avoid these containers
    AVOID_CONTAINERS: [
        'header', 'footer', 'nav', 'aside', '[class*="ad"]', '[id*="ad"]',
        '[class*="advertisement"]', '[class*="menu"]', '[class*="sidebar"]',
        '[class*="navigation"]', '[class*="comment"]', '[class*="reply"]'
    ],
    
    // Skip these elements in text processing
    SKIP_ELEMENTS: [
        'script', 'style', 'noscript', 'nav', 'header', 'footer', 
        '[class*="ad"]', '[class*="menu"]'
    ]
};

// Non-content text patterns (UI elements, navigation, etc.)
const NON_CONTENT_PATTERNS = [
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

// Text cleaning patterns for context extraction
const TEXT_CLEANING_PATTERNS = {
    // JavaScript/code removal
    FUNCTION_DECLARATIONS: /\b(function|var|let|const)\s+\w+\s*[=\(][^;{}]*[;}]/g,
    WINDOW_REFERENCES: /window\s*[=.\[].+?[;\]]/g,
    
    // Advertising patterns
    AD_PATTERNS: /triggerPrebid[^"']*["']?\s*[^,}]*/gi,
    AD_PROPERTIES: /(labelClasses|adLocation|trackingKey|renderAd|observeFromUAC|pageId)[^,}]*/gi,
    
    // JSON-like patterns
    JSON_LIKE: /['"]\w+['"]:\s*[^,}]+,?\s*/g,
    
    // URLs
    URLS: /https?:\/\/[^\s"']+/g,
    
    // CSS-like content
    CSS_PROPERTIES: /[a-zA-Z-]+:\s*[^;]+;\s*/g,
    CSS_BLOCKS: /\{[^}]*\}/g,
    
    // Function calls
    FUNCTION_CALLS: /\w+\([^)]*\)\s*[;,]?/g,
    
    // Excessive punctuation
    EXCESSIVE_PUNCT: /[{}[\]();,=&|'"]{2,}/g,
    WHITESPACE: /\s+/g
};

// CSS class and ID validation
const CSS_VALIDATION = {
    VALID_PATTERN: /^[a-zA-Z_][\w-]*$/,
    INVALID_CHARS: /[+(){}[\]="'<>.,!@#$%^&*|\\/?]/,
    MAX_DEPTH: 10,
    MAX_CLASSES: 2,
    MAX_SELECTOR_LENGTH: 50
};

// Highlight element configuration
const HIGHLIGHT_CONFIG = {
    CLASS_PREFIX: 'lumos-highlight',
    COLOR_CLASS_PREFIX: 'lumos-highlight-',
    ATTRIBUTES: {
        ID: 'data-highlight-id',
        COLOR: 'data-highlight-color'
    }
};

// Toolbar HTML templates
const TOOLBAR_TEMPLATES = {
    MAIN_TOOLBAR: `
        <div class="lumos-toolbar-colors">
            ${COLOR_BUTTON_CONFIG.map(config => 
                `<button class="lumos-color-btn" data-color="${config.color}" title="${config.title}"></button>`
            ).join('')}
        </div>
    `,
    
    EDIT_TOOLBAR: `
        <div class="lumos-color-options">
            ${COLOR_BUTTON_CONFIG.map(config => 
                `<button class="lumos-color-btn" data-color="${config.color}" title="${config.color}"></button>`
            ).join('')}
        </div>
        <div class="lumos-separator">|</div>
        <button class="lumos-remove-btn" title="Remove highlight">Delete</button>
    `
};

// Text matching and normalization
const TEXT_MATCHING = {
    // Characters to keep in normalized text
    KEEP_CHARS: /[\w\s\u4e00-\u9fff\u3400-\u4dbf\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2b820-\u2ceaf]/g,
    
    // Remove everything except the above
    REMOVE_CHARS: /[^\w\s\u4e00-\u9fff\u3400-\u4dbf\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2b820-\u2ceaf]/g
};

// Performance thresholds
const PERFORMANCE = {
    MAX_HIGHLIGHTS_PER_BATCH: 50,
    MAX_DOM_DEPTH: 20,
    MAX_TEXT_CONTENT_LENGTH: 100,
    SIGNIFICANT_CHANGE_THRESHOLD: 100
};

// Debug and logging configuration
const DEBUG_CONFIG = {
    ENABLED: true,
    LOG_PREFIXES: {
        HIGHLIGHT: '[Lumos Highlight]',
        RESTORE: '[Lumos Restore]',
        RETRY: '[Lumos Retry]',
        DOM: '[Lumos DOM]'
    }
};

// Export current styles object (mutable reference)
let currentStyles = { ...DEFAULT_STYLES };

// Function to update current styles
function updateCurrentStyles(newStyles) {
    Object.assign(currentStyles, newStyles);
}

// Function to reset styles to defaults
function resetCurrentStyles() {
    Object.assign(currentStyles, DEFAULT_STYLES);
}

// All constants as a single object for easy access
const CONSTANTS = {
    DEFAULT_STYLES,
    COLOR_BUTTON_CONFIG,
    TEXT_VALIDATION,
    TIMEOUTS,
    DOM_OBSERVER_CONFIG,
    CONTENT_SELECTORS,
    NON_CONTENT_PATTERNS,
    TEXT_CLEANING_PATTERNS,
    CSS_VALIDATION,
    HIGHLIGHT_CONFIG,
    TOOLBAR_TEMPLATES,
    TEXT_MATCHING,
    PERFORMANCE,
    DEBUG_CONFIG
};

// Assign to global window object
window.LumosContentConstants = {
    DEFAULT_STYLES,
    COLOR_BUTTON_CONFIG,
    TEXT_VALIDATION,
    TIMEOUTS,
    DOM_OBSERVER_CONFIG,
    CONTENT_SELECTORS,
    NON_CONTENT_PATTERNS,
    TEXT_CLEANING_PATTERNS,
    CSS_VALIDATION,
    HIGHLIGHT_CONFIG,
    TOOLBAR_TEMPLATES,
    TEXT_MATCHING,
    PERFORMANCE,
    DEBUG_CONFIG,
    CONSTANTS,
    currentStyles,
    updateCurrentStyles,
    resetCurrentStyles
};