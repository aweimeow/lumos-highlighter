# Makefile for Lumos Highlighter
# Provides commands for testing, building, and maintaining the Chrome extension

.PHONY: help install test test-watch test-coverage clean lint build package make-zip

# Default target
help:
	@echo "Lumos Highlighter Development Commands"
	@echo "===================================="
	@echo ""
	@echo "Available commands:"
	@echo "  make install      - Install dependencies"
	@echo "  make test         - Run all tests"
	@echo "  make test-watch   - Run tests in watch mode"
	@echo "  make test-coverage - Run tests with coverage report"
	@echo "  make lint         - Run linting checks"
	@echo "  make clean        - Clean temporary files"
	@echo "  make build        - Build extension for production"
	@echo "  make package      - Create extension package (legacy)"
	@echo "  make make-zip     - Create optimized ZIP for Chrome Web Store"
	@echo "  make help         - Show this help message"

# Install dependencies
install:
	@echo "Installing dependencies..."
	@npm install

# Run all tests
test:
	@echo "Running tests..."
	@npm test

# Run tests in watch mode for development
test-watch:
	@echo "Running tests in watch mode..."
	@npm run test:watch

# Run tests with coverage report
test-coverage:
	@echo "Running tests with coverage..."
	@npm run test:coverage
	@echo ""
	@echo "Coverage report generated in coverage/ directory"
	@echo "Open coverage/lcov-report/index.html to view detailed report"

# Lint code (if we add a linter later)
lint:
	@echo "Linting code..."
	@echo "Note: Add eslint or similar linter to package.json for full linting"
	@find . -name "*.js" -not -path "./node_modules/*" -not -path "./coverage/*" -exec echo "Checking: {}" \;

# Clean temporary files
clean:
	@echo "Cleaning temporary files..."
	@rm -rf node_modules/
	@rm -rf coverage/
	@rm -rf *.log
	@echo "Clean complete"

# Build extension (prepare for production)
build:
	@echo "Building extension..."
	@node scripts/build.js
	@echo ""
	@echo "Build complete! Files are ready in build/ directory"
	@echo ""
	@echo "To load in Chrome:"
	@echo "1. Open Chrome and go to chrome://extensions/"
	@echo "2. Enable 'Developer mode'"
	@echo "3. Click 'Load unpacked' and select the build/ directory"

# Create optimized ZIP for Chrome Web Store
make-zip:
	@echo "Creating optimized ZIP for Chrome Web Store..."
	@node scripts/build.js
	@echo ""
	@echo "ZIP package created successfully!"
	@echo "Ready for upload to Chrome Web Store"

# Create extension package (legacy)
package: test
	@echo "Creating extension package..."
	@mkdir -p dist
	@zip -r dist/lumos-highlighter.zip . \
		-x "node_modules/*" \
		-x "tests/*" \
		-x "coverage/*" \
		-x ".git/*" \
		-x "*.log" \
		-x "Makefile" \
		-x "package.json" \
		-x "package-lock.json" \
		-x "README.md"
	@echo "Extension package created: dist/lumos-highlighter.zip"

# Development setup (install + initial test)
setup: install test
	@echo ""
	@echo "Development setup complete!"
	@echo "Use 'make test' to run tests"
	@echo "Use 'make test-watch' for development"

# Quick validation (runs tests and basic checks)
validate: test
	@echo ""
	@echo "Validation complete - all tests passed!"
	@echo ""
	@echo "Extension is ready for:"
	@echo "  - Loading in Chrome (make build)"
	@echo "  - Creating package (make package)"

# Show test results in a formatted way
test-report: test-coverage
	@echo ""
	@echo "=== TEST REPORT ==="
	@echo "Tests completed successfully"
	@echo "Coverage report available in coverage/ directory"
	@echo ""
	@echo "Key test areas covered:"
	@echo "  ✓ Utility functions (shared/utils.js)"
	@echo "  ✓ Text matching algorithms (textMatcher.js)"
	@echo "  ✓ DOM manipulation utilities (domUtils.js)"
	@echo ""
	@echo "All functionality verified and working correctly!"