// Shared constants for Lumos Highlighter
// This file contains all the constants used across different modules

// Highlight colors
const HIGHLIGHT_COLORS = {
    RED: '#ff6b6b',
    ORANGE: '#ffa726',
    YELLOW: '#ffeb3b',
    GREEN: '#4caf50',
    BLUE: '#2196f3'
};

// Color names mapping
const COLOR_NAMES = {
    '#ff6b6b': 'red',
    '#ffa726': 'orange',
    '#ffeb3b': 'yellow',
    '#4caf50': 'green',
    '#2196f3': 'blue'
};

// Highlight styles
const HIGHLIGHT_STYLES = {
    CORNER_STYLES: {
        RECTANGULAR: 'rectangular',
        ROUNDED: 'rounded'
    },
    BACKGROUND_STYLES: {
        TRANSPARENT: 'transparent',
        SOLID: 'solid'
    },
    TEXT_STYLES: {
        DEFAULT: 'default',
        BOLD: 'bold'
    },
    HIGHLIGHT_MODES: {
        INSTANT: 'instant',
        CONFIRM: 'confirm'
    }
};

// DOM selectors and classes
const DOM_CLASSES = {
    HIGHLIGHT: 'lumos-highlight',
    TOOLBAR: 'lumos-highlight-toolbar',
    TOOLBAR_VISIBLE: 'lumos-toolbar-visible',
    TOOLBAR_BUTTON: 'lumos-toolbar-button',
    TOOLBAR_REMOVE: 'lumos-toolbar-remove',
    TOOLBAR_COLOR: 'lumos-toolbar-color'
};

// Storage keys
const STORAGE_KEYS = {
    HIGHLIGHTS: 'lumosHighlights',
    SETTINGS: 'lumosSettings'
};

// Message types for inter-script communication
const MESSAGE_TYPES = {
    SAVE_HIGHLIGHT: 'SAVE_HIGHLIGHT',
    DELETE_HIGHLIGHT: 'DELETE_HIGHLIGHT',
    UPDATE_HIGHLIGHT_COLOR: 'UPDATE_HIGHLIGHT_COLOR',
    GET_HIGHLIGHTS: 'GET_HIGHLIGHTS',
    GET_ALL_HIGHLIGHTS: 'GET_ALL_HIGHLIGHTS',
    GET_ALL_WEBSITES: 'GET_ALL_WEBSITES',
    GET_METADATA: 'GET_METADATA',
    REMOVE_ALL_HIGHLIGHTS_FROM_PAGE: 'REMOVE_ALL_HIGHLIGHTS_FROM_PAGE',
    EXPORT_PAGE_SUMMARY: 'EXPORT_PAGE_SUMMARY',
    EXPORT_ALL_SITES_SUMMARY: 'EXPORT_ALL_SITES_SUMMARY',
    GET_EXPORT_SELECTION_DATA: 'GET_EXPORT_SELECTION_DATA',
    GENERATE_PDF: 'GENERATE_PDF',
    OPEN_MANAGEMENT_INTERFACE: 'OPEN_MANAGEMENT_INTERFACE'
};

// Default settings
const DEFAULT_SETTINGS = {
    cornerStyle: HIGHLIGHT_STYLES.CORNER_STYLES.RECTANGULAR,
    backgroundStyle: HIGHLIGHT_STYLES.BACKGROUND_STYLES.TRANSPARENT,
    textStyle: HIGHLIGHT_STYLES.TEXT_STYLES.DEFAULT,
    highlightMode: HIGHLIGHT_STYLES.HIGHLIGHT_MODES.INSTANT
};

// Retry configuration
const RETRY_CONFIG = {
    MAX_RETRIES: 3,
    INITIAL_DELAY: 1000,
    BACKOFF_MULTIPLIER: 2,
    MAX_DELAY: 10000
};

// Context extraction configuration
const CONTEXT_CONFIG = {
    BEFORE_LENGTH: 100,
    AFTER_LENGTH: 100,
    MIN_TEXT_LENGTH: 3,
    MAX_CONTEXT_LENGTH: 500
};

// PDF export configuration
const PDF_CONFIG = {
    MARGIN: 20,
    FONT_SIZE: 12,
    LINE_HEIGHT: 1.4,
    COLORS: HIGHLIGHT_COLORS
};

// Time ranges for filtering
const TIME_RANGES = {
    ALL_TIME: 'all',
    LAST_7_DAYS: '7days',
    LAST_30_DAYS: '30days',
    LAST_90_DAYS: '90days',
    LAST_YEAR: '1year'
};

// Export types
const EXPORT_TYPES = {
    PAGE: 'page',
    SELECTION: 'selection',
    ALL_SITES: 'all_sites'
};

// Event names
const EVENTS = {
    HIGHLIGHT_CREATED: 'highlight_created',
    HIGHLIGHT_UPDATED: 'highlight_updated',
    HIGHLIGHT_DELETED: 'highlight_deleted',
    SETTINGS_CHANGED: 'settings_changed',
    DATA_LOADED: 'data_loaded'
};

// Assign all constants to global window object
window.LumosSharedConstants = {
    HIGHLIGHT_COLORS,
    COLOR_NAMES,
    HIGHLIGHT_STYLES,
    DOM_CLASSES,
    STORAGE_KEYS,
    MESSAGE_TYPES,
    DEFAULT_SETTINGS,
    RETRY_CONFIG,
    CONTEXT_CONFIG,
    PDF_CONFIG,
    TIME_RANGES,
    EXPORT_TYPES,
    EVENTS
};