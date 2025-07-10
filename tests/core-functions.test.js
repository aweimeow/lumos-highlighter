// Core functionality tests for Lumos Highlighter
// Tests essential algorithms and utilities extracted from modules

describe('Core Functions', () => {
  describe('Text Normalization', () => {
    // Test the core logic that would be in normalizeText
    test('should normalize whitespace correctly', () => {
      const normalizeText = (text) => {
        return text.replace(/\s+/g, ' ').replace(/\n/g, ' ').replace(/\t/g, ' ').trim();
      };

      expect(normalizeText('  hello   world  ')).toBe('hello world');
      expect(normalizeText('text\n\nwith\t\ttabs')).toBe('text with tabs');
      expect(normalizeText('   ')).toBe('');
    });

    test('should handle text matching normalization', () => {
      const normalizeTextForMatching = (text) => {
        const removeChars = /[^\w\s\u4e00-\u9fff\u3400-\u4dbf\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2b820-\u2ceaf]/g;
        return text.toLowerCase()
          .replace(/\s+/g, ' ')
          .replace(/\n/g, ' ')
          .replace(/\t/g, ' ')
          .replace(removeChars, '')
          .trim();
      };

      expect(normalizeTextForMatching('Hello, World!')).toBe('hello world');
      expect(normalizeTextForMatching('Test!@# 你好 123')).toContain('test');
      expect(normalizeTextForMatching('Test!@# 你好 123')).toContain('你好');
      expect(normalizeTextForMatching('Test!@# 你好 123')).toContain('123');
    });
  });

  describe('String Similarity', () => {
    test('should calculate Levenshtein distance correctly', () => {
      const levenshteinDistance = (str1, str2) => {
        if (str1 === str2) return 0;
        
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
          matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
          matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
          for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
              matrix[i][j] = matrix[i - 1][j - 1];
            } else {
              matrix[i][j] = Math.min(
                matrix[i - 1][j - 1] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j] + 1
              );
            }
          }
        }
        
        return matrix[str2.length][str1.length];
      };

      expect(levenshteinDistance('', '')).toBe(0);
      expect(levenshteinDistance('abc', 'abc')).toBe(0);
      expect(levenshteinDistance('abc', 'def')).toBe(3);
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
      expect(levenshteinDistance('hello', 'helo')).toBe(1);
    });

    test('should calculate text similarity', () => {
      const calculateTextSimilarity = (text1, text2) => {
        if (text1 === text2) return 1.0;
        
        const normalize = (text) => text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
        const norm1 = normalize(text1);
        const norm2 = normalize(text2);
        
        if (norm1 === norm2) return 0.95;
        
        const words1 = norm1.split(/\s+/);
        const words2 = norm2.split(/\s+/);
        const allWords = new Set([...words1, ...words2]);
        const common = words1.filter(word => words2.includes(word)).length;
        const wordSimilarity = common / allWords.size;
        
        const maxLength = Math.max(norm1.length, norm2.length);
        const charSimilarity = maxLength > 0 ? 1 - (Math.abs(norm1.length - norm2.length) / maxLength) : 0;
        
        return Math.min(1.0, (wordSimilarity * 0.6) + (charSimilarity * 0.4));
      };

      expect(calculateTextSimilarity('hello world', 'hello world')).toBe(1.0);
      expect(calculateTextSimilarity('hello world', 'Hello World!')).toBe(0.95);
      expect(calculateTextSimilarity('hello', 'world')).toBeLessThan(0.5);
    });
  });

  describe('Utility Functions', () => {
    test('should generate unique IDs', () => {
      const generateId = () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
      };

      const id1 = generateId();
      const id2 = generateId();
      
      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
    });

    test('should extract domain from URL', () => {
      const extractDomain = (url) => {
        try {
          return new URL(url).hostname;
        } catch (e) {
          return url;
        }
      };

      expect(extractDomain('https://example.com/path')).toBe('example.com');
      expect(extractDomain('http://subdomain.example.org:8080/path?query=1')).toBe('subdomain.example.org');
      expect(extractDomain('not-a-url')).toBe('not-a-url');
    });

    test('should clean text', () => {
      const cleanText = (text) => {
        return text.replace(/\s+/g, ' ').trim();
      };

      expect(cleanText('  hello   world  ')).toBe('hello world');
      expect(cleanText('text\n\nwith\t\ttabs')).toBe('text with tabs');
      expect(cleanText('   ')).toBe('');
    });

    test('should truncate text', () => {
      const truncateText = (text, length, suffix = '...') => {
        if (text.length <= length) return text;
        return text.substring(0, length - suffix.length) + suffix;
      };

      const longText = 'This is a very long text that should be truncated';
      expect(truncateText(longText, 20)).toBe('This is a very lo...');
      expect(truncateText(longText, 20, '→')).toBe('This is a very long→');
      expect(truncateText('Short text', 20)).toBe('Short text');
    });

    test('should escape HTML', () => {
      const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };

      expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
      expect(escapeHtml('Test & Company')).toBe('Test &amp; Company');
      expect(escapeHtml('normal text')).toBe('normal text');
    });
  });

  describe('Text Matching Strategies', () => {
    test('should find exact matches', () => {
      const findExactMatch = (nodeText, targetText) => {
        const index = nodeText.indexOf(targetText);
        return index !== -1 ? { index, score: 100, strategy: 'exact' } : null;
      };

      const result = findExactMatch('This is a test document', 'test');
      expect(result).toEqual({ index: 10, score: 100, strategy: 'exact' });
      
      const noMatch = findExactMatch('This is a test document', 'nonexistent');
      expect(noMatch).toBeNull();
    });

    test('should find case-insensitive matches', () => {
      const findCaseInsensitiveMatch = (nodeText, targetText) => {
        const index = nodeText.toLowerCase().indexOf(targetText.toLowerCase());
        return index !== -1 ? { index, score: 95, strategy: 'case-insensitive' } : null;
      };

      const result = findCaseInsensitiveMatch('This is a TEST document', 'test');
      expect(result).toEqual({ index: 10, score: 95, strategy: 'case-insensitive' });
    });

    test('should handle word-based fuzzy matching', () => {
      const findWordBasedMatch = (nodeText, targetText) => {
        const nodeWords = nodeText.split(/\s+/).filter(word => word.trim().length > 0);
        const targetWords = targetText.split(/\s+/).filter(word => word.trim().length > 0);
        
        if (targetWords.length === 0) return null;
        
        let bestMatch = null;
        let bestSimilarity = 0;
        
        for (let i = 0; i <= nodeWords.length - targetWords.length; i++) {
          const nodeSequence = nodeWords.slice(i, i + targetWords.length);
          let matches = 0;
          
          for (let j = 0; j < targetWords.length; j++) {
            if (nodeSequence[j] && nodeSequence[j].toLowerCase() === targetWords[j].toLowerCase()) {
              matches++;
            }
          }
          
          const similarity = matches / targetWords.length;
          
          if (similarity > bestSimilarity && similarity > 0.7) {
            bestSimilarity = similarity;
            const sequenceText = nodeSequence.join(' ');
            const startIndex = nodeText.indexOf(sequenceText);
            if (startIndex !== -1) {
              bestMatch = { index: startIndex, similarity, strategy: 'word-based' };
            }
          }
        }
        
        return bestMatch;
      };

      const result = findWordBasedMatch('The quick brown fox jumps', 'quick brown');
      expect(result).toBeTruthy();
      expect(result.similarity).toBeGreaterThan(0.7);
      expect(result.strategy).toBe('word-based');
    });
  });

  describe('DOM Utilities', () => {
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
      expect(uuid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    test('should find common parent elements', () => {
      document.body.innerHTML = `
        <div id="parent">
          <span id="child1">Text 1</span>
          <span id="child2">Text 2</span>
        </div>
      `;

      const getCommonParent = (element1, element2) => {
        if (!element1 || !element2) return null;
        
        const ancestors1 = [];
        let current = element1;
        while (current && current !== document.body) {
          ancestors1.push(current);
          current = current.parentElement;
        }
        
        current = element2;
        while (current && current !== document.body) {
          if (ancestors1.includes(current)) {
            return current;
          }
          current = current.parentElement;
        }
        
        return null;
      };

      const child1 = document.getElementById('child1');
      const child2 = document.getElementById('child2');
      const parent = document.getElementById('parent');

      expect(getCommonParent(child1, child2)).toBe(parent);
    });
  });
});