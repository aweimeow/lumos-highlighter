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

### 2. Content Script (`content.js`)
**Responsibilities:**
- Detect text selection events
- Render highlight toolbar
- Apply/remove highlights in DOM
- Restore highlights on page load

**Key Functions:**
- `onTextSelection()`
- `showHighlightToolbar(selection, position)`
- `applyHighlight(range, color)`
- `removeHighlight(highlightId)`
- `restoreHighlights()`

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
├── background/
│   ├── background.js
│   ├── storageManager.js
│   └── pdfExporter.js
├── content/
│   ├── content.js
│   ├── highlightManager.js
│   └── highlightToolbar.js
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── options/
│   ├── options.html
│   ├── options.js
│   └── options.css
├── styles/
│   ├── content.css
│   └── highlights.css
├── lib/
│   ├── jspdf.min.js
│   └── utils.js
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

## Questions for Clarification

1. **Context Length**: How much context text should be captured before/after highlights?
2. **Storage Limits**: Should we implement automatic cleanup based on age or count?
3. **Export Format**: Any specific PDF formatting requirements (fonts, layout, etc.)?
4. **Color Customization**: Should users be able to customize the five colors?
5. **Conflict Resolution**: How to handle overlapping highlights?
6. **Performance**: Any specific performance requirements for large numbers of highlights?

This design provides a solid foundation for the Lumos Highlighter extension. Please review and let me know if you'd like me to elaborate on any section or if you have questions about the implementation approach.