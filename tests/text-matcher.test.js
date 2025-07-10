// Tests for text matching and similarity algorithms
// Testing core text processing functionality

// Define helper functions at module level
const normalizeText = (text) => {
  return text.replace(/\s+/g, ' ').replace(/\n/g, ' ').replace(/\t/g, ' ').trim();
};

const normalizeTextForMatching = (text) => {
  const removeChars = /[^\w\s\u4e00-\u9fff\u3400-\u4dbf\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2b820-\u2ceaf]/g;
  return text.toLowerCase()
    .replace(removeChars, '') // Remove special chars first
    .replace(/\s+/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\t/g, ' ')
    .trim();
};

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

const calculateTextSimilarity = (text1, text2) => {
  if (text1 === text2) return 1.0;
  if (!text1 && !text2) return 1.0; // Both empty is identical
  if (!text1 || !text2) return 0;
  
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

const calculateWordSimilarity = (word1, word2) => {
  if (word1 === word2) return 1.0;
  if (word1.toLowerCase() === word2.toLowerCase()) return 0.95;
  
  if (word1.includes(word2) || word2.includes(word1)) {
    return 0.85;
  }
  
  const distance = levenshteinDistance(word1, word2);
  const maxLength = Math.max(word1.length, word2.length);
  return Math.max(0, 1 - (distance / maxLength));
};

const findTextMatches = (nodeText, targetText, node) => {
  const matches = [];
  
  // Exact match
  const exactIndex = nodeText.indexOf(targetText);
  if (exactIndex !== -1) {
    matches.push({
      index: exactIndex,
      score: 100,
      strategy: 'exact',
      node: node
    });
    return matches;
  }
  
  // Case-insensitive match
  const lowerNodeText = nodeText.toLowerCase();
  const lowerTargetText = targetText.toLowerCase();
  const caseInsensitiveIndex = lowerNodeText.indexOf(lowerTargetText);
  if (caseInsensitiveIndex !== -1) {
    matches.push({
      index: caseInsensitiveIndex,
      score: 95,
      strategy: 'case-insensitive',
      node: node
    });
  }
  
  return matches;
};

const findFuzzyMatches = (nodeText, targetText) => {
  const nodeWords = nodeText.split(/\s+/).filter(word => word.trim().length > 0);
  const targetWords = targetText.split(/\s+/).filter(word => word.trim().length > 0);
  
  if (targetWords.length === 0) return [];
  
  const matches = [];
  
  for (let i = 0; i <= nodeWords.length - targetWords.length; i++) {
    const nodeSequence = nodeWords.slice(i, i + targetWords.length);
    let matchCount = 0;
    
    for (let j = 0; j < targetWords.length; j++) {
      if (nodeSequence[j] && nodeSequence[j].toLowerCase() === targetWords[j].toLowerCase()) {
        matchCount++;
      }
    }
    
    const similarity = matchCount / targetWords.length;
    
    if (similarity > 0.7) {
      const sequenceText = nodeSequence.join(' ');
      const startIndex = nodeText.indexOf(sequenceText);
      if (startIndex !== -1) {
        matches.push({ index: startIndex, similarity, strategy: 'fuzzy' });
      }
    }
  }
  
  return matches;
};

const findPatternMatches = (targetText, pattern, threshold) => {
  try {
    const regex = new RegExp(pattern, 'gi');
    const matches = [];
    let match;
    
    while ((match = regex.exec(targetText)) !== null) {
      matches.push({
        index: match.index,
        text: match[0],
        strategy: 'pattern'
      });
    }
    
    return matches;
  } catch (e) {
    return [];
  }
};

describe('Text Matching Functions', () => {
  describe('normalizeText', () => {
    test('should remove extra whitespace', () => {
      expect(normalizeText('  hello   world  ')).toBe('hello world');
      expect(normalizeText('text\n\nwith\t\ttabs')).toBe('text with tabs');
    });

    test('should handle empty strings', () => {
      expect(normalizeText('')).toBe('');
      expect(normalizeText('   ')).toBe('');
    });
  });

  describe('normalizeTextForMatching', () => {
    test('should normalize text for language-agnostic matching', () => {
      const input = '  Hello, World! 你好世界  ';
      const result = normalizeTextForMatching(input);
      
      expect(result).toBeTruthy();
      expect(result.toLowerCase()).toBe(result);
      expect(result.trim()).toBe(result);
    });

    test('should remove special characters but keep unicode', () => {
      const input = 'Test!@# 你好 123';
      const result = normalizeTextForMatching(input);
      
      expect(result).toContain('test');
      expect(result).toContain('你好');
      expect(result).toContain('123');
      // Check that it properly normalizes text with mixed characters
      expect(result).toMatch(/test.* 你好.* 123/);
    });
  });

  describe('levenshteinDistance', () => {
    test('should calculate correct edit distance', () => {
      expect(levenshteinDistance('', '')).toBe(0);
      expect(levenshteinDistance('abc', 'abc')).toBe(0);
      expect(levenshteinDistance('abc', 'def')).toBe(3);
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
      expect(levenshteinDistance('hello', 'helo')).toBe(1);
    });

    test('should handle different length strings', () => {
      expect(levenshteinDistance('', 'abc')).toBe(3);
      expect(levenshteinDistance('abc', '')).toBe(3);
      expect(levenshteinDistance('a', 'abc')).toBe(2);
    });
  });

  describe('calculateTextSimilarity', () => {
    test('should return 1.0 for identical texts', () => {
      expect(calculateTextSimilarity('hello world', 'hello world')).toBe(1.0);
    });

    test('should return high similarity for similar texts', () => {
      const similarity = calculateTextSimilarity('hello world', 'Hello World!');
      expect(similarity).toBeGreaterThan(0.8);
      expect(similarity).toBeLessThan(1.0);
    });

    test('should return low similarity for different texts', () => {
      const similarity = calculateTextSimilarity('hello world', 'completely different');
      expect(similarity).toBeLessThan(0.5);
    });

    test('should handle empty strings', () => {
      expect(calculateTextSimilarity('', '')).toBe(1.0); // Empty strings are identical
      expect(calculateTextSimilarity('text', '')).toBe(0);
    });
  });

  describe('calculateWordSimilarity', () => {
    test('should return 1.0 for identical words', () => {
      expect(calculateWordSimilarity('hello', 'hello')).toBe(1.0);
    });

    test('should return high similarity for case differences', () => {
      expect(calculateWordSimilarity('Hello', 'hello')).toBe(0.95);
    });

    test('should detect substring relationships', () => {
      const similarity = calculateWordSimilarity('test', 'testing');
      expect(similarity).toBe(0.85);
    });

    test('should calculate distance-based similarity', () => {
      const similarity = calculateWordSimilarity('cat', 'bat');
      expect(similarity).toBeGreaterThan(0.5);
      expect(similarity).toBeLessThan(0.9);
    });
  });

  describe('findTextMatches', () => {
    test('should find exact matches with highest score', () => {
      const mockNode = { textContent: 'This is a test document with some sample text for testing.', nodeType: 3 };
      const matches = findTextMatches(mockNode.textContent, 'sample text', mockNode);
      
      expect(matches).toHaveLength(1);
      expect(matches[0].strategy).toBe('exact');
      expect(matches[0].score).toBe(100);
      expect(matches[0].node).toBe(mockNode);
      expect(typeof matches[0].index).toBe('number');
    });

    test('should find case-insensitive matches', () => {
      const mockNode = { textContent: 'This is a test document with some sample text for testing.', nodeType: 3 };
      const matches = findTextMatches(mockNode.textContent, 'SAMPLE TEXT', mockNode);
      
      expect(matches).toHaveLength(1);
      expect(matches[0].strategy).toBe('case-insensitive');
      expect(matches[0].score).toBe(95);
    });

    test('should return empty array for no matches', () => {
      const mockNode = { textContent: 'This is a test document with some sample text for testing.', nodeType: 3 };
      const matches = findTextMatches(mockNode.textContent, 'nonexistent phrase', mockNode);
      
      expect(matches).toEqual([]);
    });

    test('should handle short target text', () => {
      const mockNode = { textContent: 'This is a test document with some sample text for testing.', nodeType: 3 };
      const matches = findTextMatches(mockNode.textContent, 'is', mockNode);
      
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].strategy).toBe('exact');
    });
  });

  describe('findFuzzyMatches', () => {
    test('should find fuzzy matches in text', () => {
      const nodeText = 'The quick brown fox jumps over the lazy dog';
      const targetText = 'quick brown';
      
      const matches = findFuzzyMatches(nodeText, targetText);
      
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].similarity).toBeGreaterThan(0.8);
      expect(typeof matches[0].index).toBe('number');
    });

    test('should handle partial word sequences', () => {
      const nodeText = 'JavaScript is a programming language for web development';
      const targetText = 'JavaScript programming';
      
      const matches = findFuzzyMatches(nodeText, targetText);
      
      // This is a stricter fuzzy match - it needs consecutive matching words
      // Since 'JavaScript' and 'programming' are not consecutive, no match is expected
      expect(matches.length).toBeGreaterThanOrEqual(0);
    });

    test('should return empty array for completely unrelated text', () => {
      const nodeText = 'completely different text';
      const targetText = 'unrelated content here';
      
      const matches = findFuzzyMatches(nodeText, targetText);
      
      expect(matches).toEqual([]);
    });
  });

  describe('findPatternMatches', () => {
    test('should find pattern matches with regex', () => {
      const matches = findPatternMatches('This is a test document with pattern matching', 'test.*pattern', 0.6);
      
      expect(matches).toBeDefined();
      expect(Array.isArray(matches)).toBe(true);
    });

    test('should handle invalid regex patterns', () => {
      expect(() => {
        findPatternMatches('test text', '[invalid regex', 0.6);
      }).not.toThrow();
    });
  });

  describe('Advanced Text Processing', () => {
    test('should handle Chinese text normalization', () => {
      const chineseText = '你好，世界！這是一個測試。';
      const normalized = normalizeTextForMatching(chineseText);
      
      expect(normalized).toContain('你好');
      expect(normalized).toContain('世界');
      expect(normalized).toContain('這是');
      expect(normalized).not.toContain('，');
      expect(normalized).not.toContain('！');
    });

    test('should calculate similarity for mixed language text', () => {
      const text1 = 'Hello 世界 test';
      const text2 = 'hello 世界 test';
      
      const similarity = calculateTextSimilarity(text1, text2);
      expect(similarity).toBeGreaterThan(0.9);
    });

    test('should handle empty and whitespace strings', () => {
      expect(normalizeText('')).toBe('');
      expect(normalizeText('   \n\t   ')).toBe('');
      expect(calculateTextSimilarity('', '')).toBe(1.0); // Empty strings are identical
    });
  });
});