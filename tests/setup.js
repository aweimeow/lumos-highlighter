// Jest setup file for Lumos Highlighter tests

// Mock Chrome APIs
global.chrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    sendMessage: jest.fn(),
    getURL: jest.fn((path) => `chrome-extension://test-id/${path}`)
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn()
    },
    sync: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn()
    }
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn(),
    create: jest.fn()
  }
};

// Mock DOM globals that might be missing in jsdom
global.NodeFilter = {
  SHOW_TEXT: 4,
  FILTER_ACCEPT: 1,
  FILTER_REJECT: 2,
  FILTER_SKIP: 3
};

global.Node = {
  TEXT_NODE: 3,
  ELEMENT_NODE: 1
};

// Mock window.getSelection
global.getSelection = jest.fn(() => ({
  toString: jest.fn(() => ''),
  getRangeAt: jest.fn(),
  rangeCount: 0,
  removeAllRanges: jest.fn()
}));

// Mock console methods to reduce test noise
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Setup window.location mock
delete window.location;
window.location = {
  href: 'https://example.com/test-page',
  hostname: 'example.com',
  pathname: '/test-page',
  search: '',
  hash: ''
};

// Mock document.title
Object.defineProperty(document, 'title', {
  value: 'Test Page Title',
  writable: true
});