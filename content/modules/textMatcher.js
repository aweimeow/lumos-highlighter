// Text Matching Utilities Module
// Extracted from content.js - Core text matching, similarity calculation, and fuzzy matching utilities

// Main text matching function using multiple strategies
function findTextMatches(nodeText, targetText, node) {
    const matches = [];
    
    // Strategy 1: Exact match
    let index = nodeText.indexOf(targetText);
    if (index !== -1) {
        matches.push({ node, index, score: 100, strategy: 'exact' });
        return matches;
    }
    
    // Strategy 2: Case-insensitive match
    index = nodeText.toLowerCase().indexOf(targetText.toLowerCase());
    if (index !== -1) {
        matches.push({ node, index, score: 95, strategy: 'case-insensitive' });
        return matches;
    }
    
    // Strategy 3: Normalized match
    const normalizedNode = normalizeText(nodeText);
    const normalizedTarget = normalizeText(targetText);
    index = normalizedNode.indexOf(normalizedTarget);
    if (index !== -1) {
        const originalIndex = findOriginalIndex(nodeText, normalizedNode, index);
        if (originalIndex !== -1) {
            matches.push({ node, index: originalIndex, score: 90, strategy: 'normalized' });
        }
    }
    
    // Strategy 4: Character-normalized partial matching
    const charNormalizedNode = normalizeTextForMatching(nodeText);
    const charNormalizedTarget = normalizeTextForMatching(targetText);
    
    if (charNormalizedTarget.length >= 6) {
        const substring = charNormalizedTarget.substring(0, Math.max(6, Math.floor(charNormalizedTarget.length * 0.8)));
        const foundIndex = charNormalizedNode.indexOf(substring);
        if (foundIndex !== -1) {
            const originalIndex = mapNormalizedToOriginal(nodeText, charNormalizedNode, foundIndex);
            if (originalIndex !== -1) {
                matches.push({ node, index: originalIndex, score: 70, strategy: 'character-partial' });
            }
        }
    }
    
    // Strategy 5: Fuzzy matching
    const fuzzyMatches = findFuzzyMatches(nodeText, targetText);
    matches.push(...fuzzyMatches.map(match => ({
        ...match, node, score: Math.round(70 * match.similarity), strategy: 'fuzzy'
    })));
    
    return matches;
}

// Normalize text by removing extra whitespace

function normalizeText(text) {
    return text.replace(/\s+/g, ' ').replace(/\n/g, ' ').replace(/\t/g, ' ').trim();
}

// Normalize text for matching (language-agnostic)

function normalizeTextForMatching(text) {
    const removeChars = window.LumosContentConstants?.TEXT_MATCHING?.REMOVE_CHARS || /[^\w\s\u4e00-\u9fff\u3400-\u4dbf\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2b820-\u2ceaf]/g;
    return text.toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/\n/g, ' ')
        .replace(/\t/g, ' ')
        .replace(removeChars, '')
        .trim();
}

// Find the original index in unnormalized text

function findOriginalIndex(originalText, normalizedText, normalizedIndex) {
    let originalIndex = 0;
    let normalizedPos = 0;
    
    while (originalIndex < originalText.length && normalizedPos < normalizedIndex) {
        const originalChar = originalText[originalIndex];
        if (/\s/.test(originalChar)) {
            while (originalIndex < originalText.length && /\s/.test(originalText[originalIndex])) {
                originalIndex++;
            }
            normalizedPos++;
        } else {
            originalIndex++;
            normalizedPos++;
        }
    }
    
    return normalizedPos === normalizedIndex ? originalIndex : -1;
}

// Map normalized text position back to original text position

function mapNormalizedToOriginal(originalText, normalizedText, normalizedPosition) {
    if (normalizedPosition === 0) return 0;
    
    let originalIndex = 0;
    let normalizedIndex = 0;
    
    while (originalIndex < originalText.length && normalizedIndex < normalizedPosition) {
        const originalChar = originalText[originalIndex];
        const normalizedChar = originalChar.toLowerCase();
        const keepChars = window.LumosContentConstants?.TEXT_MATCHING?.KEEP_CHARS || /[\w\s\u4e00-\u9fff\u3400-\u4dbf\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2b820-\u2ceaf]/g;
        const isKept = keepChars.test(normalizedChar);
        
        if (isKept) {
            if (/\s/.test(normalizedChar)) {
                while (originalIndex < originalText.length && /\s/.test(originalText[originalIndex])) {
                    originalIndex++;
                }
                normalizedIndex++;
            } else {
                originalIndex++;
                normalizedIndex++;
            }
        } else {
            originalIndex++;
        }
    }
    
    return normalizedIndex === normalizedPosition ? originalIndex : -1;
}

// Find fuzzy matches using word-based comparison

function findFuzzyMatches(nodeText, targetText) {
    const matches = [];
    const targetWords = targetText.split(/\s+/).filter(word => word.trim().length > 0);
    const nodeWords = nodeText.split(/\s+/).filter(word => word.trim().length > 0);
    
    // Look for exact word sequences
    for (let i = 0; i <= nodeWords.length - targetWords.length; i++) {
        const nodeSequence = nodeWords.slice(i, i + targetWords.length);
        const similarity = calculateWordArraySimilarity(nodeSequence, targetWords);
        
        if (similarity > 0.8) {
            const sequenceText = nodeSequence.join(' ');
            const startIndex = nodeText.indexOf(sequenceText);
            if (startIndex !== -1) {
                matches.push({ index: startIndex, similarity });
            }
        }
    }
    
    // Look for partial sequences
    if (targetWords.length >= 2) {
        const seqLength = Math.max(2, Math.floor(targetWords.length * 0.6));
        for (let i = 0; i <= nodeWords.length - seqLength; i++) {
            const nodeSubsequence = nodeWords.slice(i, i + seqLength);
            const targetSubsequence = targetWords.slice(0, seqLength);
            const similarity = calculateWordArraySimilarity(nodeSubsequence, targetSubsequence);
            
            if (similarity > 0.7) {
                const sequenceText = nodeSubsequence.join(' ');
                const startIndex = nodeText.indexOf(sequenceText);
                if (startIndex !== -1) {
                    matches.push({ index: startIndex, similarity: similarity * 0.9 });
                }
            }
        }
    }
    
    return matches.sort((a, b) => b.similarity - a.similarity).slice(0, 3);
}

// Calculate word-level similarity

function calculateWordSimilarity(word1, word2) {
    if (word1 === word2) return 1.0;
    
    const normalized1 = word1.toLowerCase().replace(/[^\w]/g, '');
    const normalized2 = word2.toLowerCase().replace(/[^\w]/g, '');
    
    if (normalized1 === normalized2) return 0.95;
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) return 0.85;
    
    const maxLength = Math.max(normalized1.length, normalized2.length);
    if (maxLength === 0) return 0;
    
    const distance = levenshteinDistance(normalized1, normalized2);
    return 1 - (distance / maxLength);
}

// Calculate similarity between two word arrays

function calculateWordArraySimilarity(words1, words2) {
    if (words1.length !== words2.length) return 0;
    
    let matches = 0;
    for (let i = 0; i < words1.length; i++) {
        const word1 = words1[i].toLowerCase().replace(/[^\w]/g, '');
        const word2 = words2[i].toLowerCase().replace(/[^\w]/g, '');
        
        if (word1 === word2 || word1.includes(word2) || word2.includes(word1) || levenshteinDistance(word1, word2) <= 2) {
            matches++;
        }
    }
    
    return matches / words1.length;
}

// Calculate Levenshtein distance between two strings

function levenshteinDistance(str1, str2) {
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
}

// Calculate text similarity using multiple metrics

function calculateTextSimilarity(text1, text2) {
    if (text1 === text2) return 1.0;
    
    const normalize = (text) => text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
    const norm1 = normalize(text1);
    const norm2 = normalize(text2);
    
    // Debug for the problematic case (only once per unique text pair)
    if (window.LumosLogger && text1.includes('authorities in beijing') && !window._debuggedTextPairs) {
        window._debuggedTextPairs = new Set();
    }
    if (window.LumosLogger && text1.includes('authorities in beijing')) {
        const debugKey = text1.substring(0, 30) + '|' + text2.substring(0, 30);
        if (!window._debuggedTextPairs.has(debugKey)) {
            window._debuggedTextPairs.add(debugKey);
            window.LumosLogger.debug('Debug: calculateTextSimilarity details:', {
                text1: text1.substring(0, 50),
                text2: text2.substring(0, 50),
                norm1: norm1.substring(0, 50),
                norm2: norm2.substring(0, 50),
                areEqual: norm1 === norm2,
                norm1Length: norm1.length,
                norm2Length: norm2.length
            });
        }
    }
    
    if (norm1 === norm2) return 0.95;
    
    // Word-based similarity
    const words1 = norm1.split(/\s+/);
    const words2 = norm2.split(/\s+/);
    const allWords = new Set([...words1, ...words2]);
    const common = words1.filter(word => words2.includes(word)).length;
    const wordSimilarity = common / allWords.size;
    
    // Character-based similarity
    const maxLength = Math.max(norm1.length, norm2.length);
    const charSimilarity = maxLength > 0 ? 1 - (levenshteinDistance(norm1, norm2) / maxLength) : 0;
    
    // Substring similarity
    const longer = norm1.length > norm2.length ? norm1 : norm2;
    const shorter = norm1.length > norm2.length ? norm2 : norm1;
    const substringScore = longer.includes(shorter) ? 0.8 : 0;
    
    // Combined score with weights
    return Math.min(1.0, (wordSimilarity * 0.4) + (charSimilarity * 0.4) + (substringScore * 0.2));
}

// Simple pattern matching for text

function findPatternMatches(targetText, pattern, minScore = 0.6) {
    const matches = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    
    let node;
    while (node = walker.nextNode()) {
        if (node.textContent.length < 8) continue;
        
        try {
            const match = node.textContent.toLowerCase().match(new RegExp(pattern, 'i'));
            if (match) {
                const matchedText = node.textContent.substring(match.index, match.index + match[0].length);
                const similarity = calculateTextSimilarity(matchedText.toLowerCase(), targetText.toLowerCase());
                
                if (similarity >= minScore) {
                    matches.push({ node, index: match.index, text: matchedText, similarity });
                }
            }
        } catch (error) {
            continue;
        }
    }
    
    return matches.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
}

// Assign all functions to global window object
window.LumosTextMatcher = {
    findTextMatches,
    normalizeTextForMatching,
    findOriginalIndex,
    mapNormalizedToOriginal,
    normalizeText,
    findFuzzyMatches,
    calculateWordSimilarity,
    calculateWordArraySimilarity,
    levenshteinDistance,
    calculateTextSimilarity,
    findPatternMatches,
    // Reference to shared utility function
    calculateSimilarity: (str1, str2) => window.LumosUtils.calculateSimilarity(str1, str2)
};