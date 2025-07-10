# Lumos Highlighter

<p align="center">
  <img src="assets/images/large-banner.png" alt="Lumos Highlighter" width="400">
</p>

<p align="center">
  <em>Transform your web reading experience with beautiful, persistent highlights and organized PDF exports</em>
</p>

---

## ✨ What is Lumos Highlighter?

Lumos Highlighter is a Chrome extension that makes it easy to highlight important text on any webpage. Your highlights stay visible when you return to the page, and you can export them as beautifully formatted PDF summaries.

## 🎨 Features

- **Five Beautiful Colors**: Choose from red, orange, yellow, green, and blue highlights
- **Custom Styling Options**: Rectangular or rounded corners, different background styles, and text effects
- **Always There**: Your highlights persist across browser sessions
- **Smart Export**: Generate organized PDF summaries grouped by website
- **Context Aware**: Automatically captures surrounding text for better understanding
- **Easy Management**: Remove individual highlights or clear entire pages with one click

## 🚀 Getting Started

### Installation

1. **Download the Extension**
   - Clone or download this repository to your computer

2. **Install Dependencies** (for development)
   ```bash
   npm install
   ```

3. **Run Tests** (optional)
   ```bash
   make test
   ```

4. **Open Chrome Extensions**
   - Go to `chrome://extensions/` in your browser
   - Turn on "Developer mode" (top-right toggle)

5. **Load the Extension**
   - Click "Load unpacked"
   - Select the `lumos-highlighter` folder
   - The extension will appear in your toolbar

### First Steps

1. **Visit any webpage** and select some text
2. **Choose a color** from the popup toolbar that appears
3. **Click the extension icon** to customize your highlight styles
4. **Right-click the extension icon** to export your highlights to PDF

## 📖 How to Use

### Highlighting Text
- Select any text on a webpage
- Pick your favorite color from the toolbar
- Your highlight is automatically saved

### Customizing Styles
- Click the Lumos Highlighter icon in your toolbar
- Choose from different corner styles, background effects, and text formatting
- See a live preview of your changes

### Exporting Your Highlights
- Right-click the extension icon
- Choose "Export page summary" for current page highlights
- Choose "Export all sites summary" for everything you've highlighted
- Your PDF will open in a new tab, ready to print or save

### Managing Highlights
- Click any highlight to change its color or remove it
- Right-click the extension icon and choose "Remove all highlights from page" to clear everything

## 🎯 Perfect For

- **Students** taking notes from online articles and research papers
- **Researchers** collecting important quotes and references
- **Professionals** highlighting key information in reports and documents
- **Anyone** who wants to remember important web content

## 💝 Support the Project

If Lumos Highlighter makes your web browsing more productive, consider buying the developer a coffee! ☕

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Support%20Development-yellow?style=for-the-badge&logo=buy-me-a-coffee)](https://coff.ee/weiyudev)

## 📄 License

This project is open source and available under the MIT License.

## 🛠️ Development

This extension uses a modular architecture for better maintainability:

### Architecture
- **Modular Design**: Code split into focused modules (event handling, text matching, DOM utilities)
- **Comprehensive Testing**: 53+ tests covering core algorithms and functionality
- **Modern Tooling**: Jest testing framework, Make-based build system

### Development Commands
```bash
make test           # Run all tests
make test-watch     # Run tests in watch mode  
make test-coverage  # Generate coverage report
make build          # Prepare for production
make package        # Create extension package
```

### File Structure
```
lumos-highlighter/
├── content/modules/     # Modular content script components
├── shared/             # Shared utilities and constants
├── background/         # Service worker
├── popup/             # Extension popup UI
├── options/           # Settings and management pages
├── tests/             # Comprehensive test suite
└── styles/            # CSS styling
```

## 🤝 Contributing

We welcome contributions! Feel free to:
- Report bugs or suggest features by creating an issue
- Submit pull requests with improvements
- Run tests with `make test` before submitting
- Share the extension with others who might find it useful

---

<p align="center">
  Made with ✨ by the claude code
</p>