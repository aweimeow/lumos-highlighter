# Lumos Highlighter - Detailed Design Document

## Overview

Lumos Highlighter is a Chrome Extension that enables users to highlight text across web pages using five distinct colors, store highlights locally, and export them as organized PDF notes for later review.

## Technical Stack

### Core Technologies
- **JavaScript/TypeScript**: Extension logic and content scripts
- **Chrome Extension APIs**: Storage, scripting, and UI integration
- **HTML/CSS**: Popup UI and styling
- **Web APIs**: Range and Selection APIs for text manipulation

### Storage & Data Management
- **Chrome Storage API**: Primary storage for highlight data
- **IndexedDB**: Backup storage option for large datasets
- **JSON**: Data serialization format

### PDF Generation
- **jsPDF**: PDF generation library
- **html2canvas**: Optional for capturing visual context

### UI Framework
- **Vanilla JavaScript**: Lightweight approach for extension UI
- **CSS3**: Modern styling with flexbox/grid
- **Chrome Extension Popup**: Settings and export interface

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Chrome Extension                         │
├─────────────────────────────────────────────────────────────────┤
│  Background Script  │  Content Script  │  Popup UI  │  Options  │
│  - Storage mgmt     │  - Text selection│  - Export  │  - Config │
│  - PDF export       │  - Highlight UI  │  - Settings│  - Prefs  │
│  - Data sync        │  - DOM injection │  - History │           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Storage Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  Chrome Storage API  │  IndexedDB (backup)  │  JSON Export     │
│  - Sync across       │  - Large datasets    │  - User export   │
│    devices           │  - Offline access    │  - Backup        │
└─────────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### 1. Background Script (`background.js`)
**Responsibilities:**
- Manage extension lifecycle
- Handle storage operations
- Coordinate PDF export process
- Sync data across tabs

**Key Functions:**
- `saveHighlight(highlightData)` - Add to website group
- `getHighlightsByDomain(domain)` - Fast domain-based retrieval
- `exportToPDF(timeRange, options)` - Direct export from grouped structure
- `updateMetadata()` - Maintain stats and date ranges

### 2. Content Script (`content.js`) - Modular Architecture
**Responsibilities:**
- Orchestrate module initialization
- Coordinate inter-module communication
- Handle background script messages
- Maintain global state

**Key Modules:**
- **EventHandler**: Text selection and user interaction events
- **ToolbarManager**: Highlight toolbar rendering and positioning
- **HighlightManager**: Core highlighting logic and DOM manipulation
- **TextMatcher**: Advanced text matching and similarity algorithms
- **StorageManager**: Local storage operations and data persistence
- **StyleManager**: Dynamic style management and customization

### 3. Highlight Manager (`highlightManager.js`)
**Responsibilities:**
- Abstract highlight operations
- Manage highlight persistence
- Handle DOM range calculations
- Coordinate with storage

**Key Functions:**
- `createHighlight(text, color, context)`
- `updateHighlight(id, changes)`
- `deleteHighlight(id)`
- `findHighlightsByUrl(url)`

### 4. Storage Manager (`storageManager.js`)
**Responsibilities:**
- Unified storage interface
- Data serialization/deserialization
- Storage quota management
- Backup/restore operations

**Key Functions:**
- `addHighlightToWebsite(domain, highlight)` - Add to pre-grouped structure
- `getWebsiteHighlights(domain)` - Fast single-domain retrieval
- `getAllWebsites()` - Get all domains with highlights
- `removeHighlight(domain, highlightId)` - Remove from specific website group
- `exportData(format)` - Export already-grouped data

### 5. PDF Export Service (`pdfExporter.js`)
**Responsibilities:**
- Generate PDF from highlights
- Group and sort highlights
- Format content for export
- Handle large datasets

**Key Functions:**
- `generatePDF(websiteData, options)` - Process pre-grouped data
- `sortHighlightsByTimestamp(highlights)` - Simple array sort
- `formatHighlightContent(highlight)` - Format individual highlight
- `addPageBreaks(content)` - Handle pagination

### 6. UI Components

#### Highlight Toolbar (`highlightToolbar.js`)
- Floating toolbar with color selection
- Remove highlight functionality
- Positioning and styling

#### Popup Interface (`popup.html/js`)
- Export controls
- Time range selection
- Settings access
- Usage statistics

#### Options Page (`options.html/js`)
- Color customization
- Export preferences
- Storage management
- Privacy settings

## Data Models

### Storage Structure (Pre-Grouped for Performance)
```javascript
{
  "websites": {
    "example.com": {
      "title": "Example Site",
      "favicon": "https://example.com/favicon.ico",
      "highlights": [
        {
          "id": "uuid1",
          "timestamp": "2025-07-05T10:00:00Z",
          "url": "https://example.com/article1",
          "page_title": "Article 1 Title",
          "color": "yellow",
          "text": "highlighted text",
          "context_before": "text before...",
          "context_after": "...text after",
          "position": {
            "startOffset": 123,
            "endOffset": 156,
            "xpath": "/html/body/div[1]/p[2]"
          }
        }
      ]
    },
    "github.com": {
      "title": "GitHub",
      "favicon": "https://github.com/favicon.ico",
      "highlights": [...]
    }
  },
  "metadata": {
    "total_highlights": 156,
    "last_updated": "2025-07-05T12:00:00Z",
    "date_range": {
      "earliest": "2025-01-01T00:00:00Z",
      "latest": "2025-07-05T12:00:00Z"
    },
    "color_stats": {
      "yellow": 45,
      "red": 23,
      "green": 12,
      "blue": 8,
      "orange": 68
    }
  }
}
```

### Individual Highlight Object
```javascript
{
  id: string,              // UUID
  timestamp: string,       // ISO 8601
  url: string,            // Full page URL
  page_title: string,     // Specific page title
  color: string,          // Highlight color
  text: string,           // Selected text
  context_before: string, // Text before selection
  context_after: string,  // Text after selection
  position: {             // DOM position data
    startOffset: number,
    endOffset: number,
    xpath: string
  }
}
```

### Export Configuration
```javascript
{
  timeRange: {
    start: string,        // ISO 8601
    end: string          // ISO 8601
  },
  colors: string[],      // Filter by colors
  websites: string[],    // Filter by domains
  format: string,        // 'pdf' | 'json'
  groupBy: string,       // 'website' | 'date' | 'color'
  sortBy: string         // 'timestamp' | 'website'
}
```

## File Structure

```
lumos-highlighter/
├── manifest.json
├── package.json                    # Development dependencies and scripts
├── Makefile                        # Build and test commands
├── background/
│   └── background.js
├── content/
│   ├── content.js                  # Main entry point (orchestration)
│   └── modules/                    # Modular architecture
│       ├── constants.js            # Content-specific constants
│       ├── contextExtractor.js     # Extract text context
│       ├── domUtils.js             # DOM manipulation utilities
│       ├── dynamicContentHandler.js # Handle dynamic content
│       ├── eventHandler.js         # Event management
│       ├── highlightManager.js     # Core highlighting logic
│       ├── positionDataGenerator.js # Position calculations
│       ├── storageManager.js       # Storage operations
│       ├── styleManager.js         # Style management
│       ├── textMatcher.js          # Text matching algorithms
│       ├── textSelectionValidator.js # Validate selections
│       └── toolbarManager.js       # Toolbar management
├── shared/                         # Shared utilities
│   ├── constants.js                # Global constants
│   ├── messaging.js                # Message passing
│   ├── storage.js                  # Storage abstractions
│   └── utils.js                    # Common utilities
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── options/
│   ├── options.html
│   ├── management.html             # Highlight management
│   ├── export-selection.html       # Export interface
│   ├── pdf-export.html             # PDF export
│   └── *.js files
├── tests/                          # Comprehensive test suite
│   ├── setup.js                    # Test environment setup
│   ├── core-functions.test.js      # Core algorithm tests
│   ├── dom-utils.test.js           # DOM utility tests
│   └── text-matcher.test.js        # Text matching tests
├── styles/
│   └── content.css
└── assets/
    ├── icons/
    └── images/
```

## Key Implementation Details

### Performance Optimizations (Pre-Grouped Structure)
- **Page Load**: Only load highlights for current domain using `getWebsiteHighlights(domain)`
- **Export**: Data already grouped by website, simple timestamp sorting within groups
- **Memory**: Metadata provides quick stats without full data parsing
- **Storage**: Domain-based partitioning reduces data transfer

### Highlight Persistence
- Use XPath for reliable DOM element location
- Store relative text offsets for precise positioning
- Handle dynamic content with mutation observers

### Cross-Page Synchronization
- Background script coordinates highlight data
- Content scripts report page changes
- Automatic cleanup of invalid highlights

### Data Operations
```javascript
// Fast page load - only get current domain
const currentDomain = new URL(window.location.href).hostname;
const highlights = await getWebsiteHighlights(currentDomain);

// Fast export - data already grouped
const websiteData = await getAllWebsites();
websiteData.forEach(site => {
  site.highlights.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
});
```

### Privacy & Security
- All data stored locally
- No external API calls
- Optional data encryption

## Testing & Quality Assurance

### Test Suite Architecture
- **Jest Framework**: Modern testing with jsdom environment
- **Chrome API Mocking**: Comprehensive Chrome extension API simulation
- **53+ Tests**: Covering core algorithms and functionality
- **Modular Testing**: Each module tested independently

### Test Categories
1. **Core Functions**: Text processing, utility functions, algorithm validation
2. **DOM Utilities**: UUID generation, element detection, content extraction
3. **Text Matching**: Exact/fuzzy matching, multilingual support, similarity algorithms

### Development Workflow
```bash
make test           # Run all tests
make test-watch     # Development mode with file watching
make test-coverage  # Generate detailed coverage reports
make build          # Prepare production build
make package        # Create distributable package
```

## Current Implementation Status

### ✅ Completed Features
- **Modular Architecture**: Clean separation of concerns across 12+ modules
- **Advanced Text Matching**: Levenshtein distance, fuzzy matching, multilingual support
- **Robust Testing**: Comprehensive test coverage with automated quality checks
- **Modern Development**: Jest testing, Make-based build system
- **DOM Utilities**: Smart content detection, position calculation
- **Storage Management**: Efficient local storage with data persistence

### 🚧 Areas for Enhancement
- **PDF Export Optimization**: Enhanced formatting and export options
- **Performance Monitoring**: Metrics collection for large datasets
- **Cross-Site Synchronization**: Improved data consistency across tabs
- **Advanced Filtering**: Enhanced search and organization features

This design reflects the current modular, well-tested implementation of Lumos Highlighter, providing a solid foundation for future enhancements and maintenance.