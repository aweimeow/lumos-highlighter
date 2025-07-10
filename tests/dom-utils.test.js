// Tests for DOM utility functions
// Testing core DOM manipulation algorithms

describe('DOM Utilities', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    
    // Mock window.getComputedStyle
    global.window.getComputedStyle = jest.fn(() => ({
      display: 'block',
      visibility: 'visible',
      opacity: '1'
    }));
  });

  describe('generateUUID', () => {
    test('should generate valid UUIDs', () => {
      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };

      const uuid1 = generateUUID();
      const uuid2 = generateUUID();
      
      expect(uuid1).toBeTruthy();
      expect(uuid2).toBeTruthy();
      expect(uuid1).not.toBe(uuid2);
      expect(typeof uuid1).toBe('string');
      
      // Check UUID format
      expect(uuid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    test('should generate unique UUIDs consistently', () => {
      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };

      const uuids = new Set();
      for (let i = 0; i < 100; i++) {
        uuids.add(generateUUID());
      }
      expect(uuids.size).toBe(100);
    });
  });

  describe('getCommonParent', () => {
    const getCommonParent = (element1, element2) => {
      if (!element1 || !element2) return null;
      
      // Get all ancestors of element1
      const ancestors1 = [];
      let current = element1;
      while (current && current !== document.body) {
        ancestors1.push(current);
        current = current.parentElement;
      }
      
      // Find the first common ancestor with element2
      current = element2;
      while (current && current !== document.body) {
        if (ancestors1.includes(current)) {
          return current;
        }
        current = current.parentElement;
      }
      
      return null;
    };

    test('should find common parent of sibling elements', () => {
      document.body.innerHTML = `
        <div id="parent">
          <span id="child1">Text 1</span>
          <span id="child2">Text 2</span>
        </div>
      `;

      const child1 = document.getElementById('child1');
      const child2 = document.getElementById('child2');
      const parent = document.getElementById('parent');

      expect(getCommonParent(child1, child2)).toBe(parent);
    });

    test('should handle nested elements', () => {
      document.body.innerHTML = `
        <div id="grandparent">
          <div id="parent1">
            <span id="child1">Text 1</span>
          </div>
          <div id="parent2">
            <span id="child2">Text 2</span>
          </div>
        </div>
      `;

      const child1 = document.getElementById('child1');
      const child2 = document.getElementById('child2');
      const grandparent = document.getElementById('grandparent');

      expect(getCommonParent(child1, child2)).toBe(grandparent);
    });

    test('should return null for unrelated elements', () => {
      document.body.innerHTML = `
        <div id="element1">Text 1</div>
      `;
      
      const element1 = document.getElementById('element1');
      const element2 = document.createElement('div');

      expect(getCommonParent(element1, element2)).toBeNull();
    });

    test('should handle null inputs', () => {
      expect(getCommonParent(null, null)).toBeNull();
      expect(getCommonParent(document.body, null)).toBeNull();
      expect(getCommonParent(null, document.body)).toBeNull();
    });
  });

  describe('findNearestContentContainer', () => {
    const findNearestContentContainer = (element) => {
      let current = element.nodeType === Node.TEXT_NODE ? element.parentElement : element;
      
      const contentSelectors = [
        'article', 'main', '[role="main"]', '.article', '.content', '.post',
        '.entry', '.story', 'section', 'div.text', 'div[class*="content"]',
        'div[class*="article"]', 'div[class*="post"]', 'div[class*="story"]', 'p'
      ];
      
      const avoidSelectors = [
        'header', 'footer', 'nav', 'aside', '[class*="ad"]', '[id*="ad"]',
        '[class*="advertisement"]', '[class*="menu"]', '[class*="sidebar"]',
        '[class*="navigation"]', '[class*="comment"]', '[class*="reply"]'
      ];
      
      while (current && current !== document.body) {
        const shouldAvoid = avoidSelectors.some(selector => {
          try {
            return current.matches && current.matches(selector);
          } catch (e) {
            return false;
          }
        });
        
        if (!shouldAvoid) {
          const isContentContainer = contentSelectors.some(selector => {
            try {
              return current.matches && current.matches(selector);
            } catch (e) {
              return false;
            }
          });
          
          if (isContentContainer) {
            const textLength = (current.textContent || '').trim().length;
            if (textLength > 50) {
              return current;
            }
          }
        }
        
        current = current.parentElement;
      }
      
      return current === document.body ? document.body : null;
    };

    test('should find article as content container', () => {
      document.body.innerHTML = `
        <article id="main-article">
          <h1>Article Title</h1>
          <p>This is a long article with sufficient content to be considered a valid content container for highlighting purposes.</p>
          <span id="target">Target text</span>
        </article>
      `;

      const target = document.getElementById('target');
      const article = document.getElementById('main-article');
      
      expect(findNearestContentContainer(target)).toBe(article);
    });

    test('should find content container', () => {
      document.body.innerHTML = `
        <main id="main-content">
          <section>
            <p>This is the main content area with enough text to qualify as a content container.</p>
            <span id="target">Target text</span>
          </section>
        </main>
      `;

      const target = document.getElementById('target');
      const result = findNearestContentContainer(target);
      
      expect(result).toBeTruthy();
      // Should find a valid content container (could be section, main, or p)
      expect(['main', 'section', 'p'].includes(result.tagName.toLowerCase())).toBe(true);
    });

    test('should avoid navigation elements', () => {
      document.body.innerHTML = `
        <article id="main-content">
          <nav id="navigation">
            <span id="nav-target">Navigation item</span>
          </nav>
          <p>This is the main article content with sufficient text to be considered valid.</p>
        </article>
      `;

      const navTarget = document.getElementById('nav-target');
      const result = findNearestContentContainer(navTarget);
      
      expect(result).toBeTruthy();
      // Should skip nav and find article or p element
      expect(['article', 'p'].includes(result.tagName.toLowerCase())).toBe(true);
      expect(result.tagName.toLowerCase()).not.toBe('nav');
    });

    test('should handle text nodes', () => {
      document.body.innerHTML = `
        <article id="content">
          <p>Some text content that should be found as a container.</p>
        </article>
      `;

      const textNode = document.querySelector('p').firstChild;
      const result = findNearestContentContainer(textNode);
      
      expect(result).toBeTruthy();
      // Should find a valid content container (could be p or article)
      expect(['article', 'p'].includes(result.tagName.toLowerCase())).toBe(true);
    });
  });

  describe('getVisibleTextContent', () => {
    const getVisibleTextContent = (element) => {
      if (!element) return '';
      
      let text = '';
      function extractText(el) {
        for (let child of el.childNodes) {
          if (child.nodeType === Node.TEXT_NODE) {
            const parent = child.parentElement;
            if (parent) {
              const style = window.getComputedStyle(parent);
              if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
                text += child.textContent;
              }
            }
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            extractText(child);
          }
        }
      }
      
      extractText(element);
      return text;
    };

    test('should extract visible text content', () => {
      document.body.innerHTML = `
        <div>
          <p>Visible paragraph</p>
          <span>Visible span</span>
        </div>
      `;

      const div = document.querySelector('div');
      const text = getVisibleTextContent(div);
      
      expect(text).toContain('Visible paragraph');
      expect(text).toContain('Visible span');
    });

    test('should skip hidden elements', () => {
      // Mock getComputedStyle to return hidden for specific elements
      const originalGetComputedStyle = global.window.getComputedStyle;
      global.window.getComputedStyle = jest.fn((element) => {
        if (element.id === 'hidden') {
          return { display: 'none', visibility: 'visible', opacity: '1' };
        }
        return { display: 'block', visibility: 'visible', opacity: '1' };
      });

      document.body.innerHTML = `
        <div>
          <p>Visible text</p>
          <p id="hidden">Hidden text</p>
        </div>
      `;

      const div = document.querySelector('div');
      const text = getVisibleTextContent(div);
      
      expect(text).toContain('Visible text');
      expect(text).not.toContain('Hidden text');

      // Restore original
      global.window.getComputedStyle = originalGetComputedStyle;
    });

    test('should return empty string for null input', () => {
      expect(getVisibleTextContent(null)).toBe('');
      expect(getVisibleTextContent(undefined)).toBe('');
    });
  });
});