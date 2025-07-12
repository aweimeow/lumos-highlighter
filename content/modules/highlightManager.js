// Highlight Manager Module
// Extracted from content.js - Core highlight creation, modification, and removal functionality

// Re-export style functions for backward compatibility

// Apply highlight to selected text
function applyHighlight(color, selection) {
    if (!selection || !selection.range) return;
    
    const range = selection.range;
    const text = selection.text;
    
    // Debug selection to catch truncation issues
    if (window.LumosLogger && (text.startsWith('iang Bin') || text.startsWith('ublic fear'))) {
        window.LumosLogger.debug('Debug: Selection truncation detected:', {
            selectionText: text,
            rangeText: range.toString(),
            startContainer: range.startContainer.textContent?.substring(0, 100),
            startOffset: range.startOffset,
            endContainer: range.endContainer.textContent?.substring(0, 100),
            endOffset: range.endOffset,
            rangeStartChar: range.startContainer.textContent?.charAt(range.startOffset - 1),
            rangeActualStart: range.startContainer.textContent?.charAt(range.startOffset)
        });
    }
    
    // Create highlight data
    const primaryContextBefore = window.LumosContextExtractor.getContextBefore(range);
    const primaryContextAfter = window.LumosContextExtractor.getContextAfter(range);
    const backupContextBefore = primaryContextBefore || getBackupContext('before', range);
    const backupContextAfter = primaryContextAfter || getBackupContext('after', range);
    
    // Debug context extraction
    if (window.LumosLogger && (backupContextBefore === 'l.' || backupContextBefore.length < 5)) {
        window.LumosLogger.debug('Debug: Context extraction during highlight creation:', {
            text: text.substring(0, 50),
            primaryContextBefore: primaryContextBefore,
            primaryContextAfter: primaryContextAfter,
            backupContextBefore: backupContextBefore,
            backupContextAfter: backupContextAfter,
            rangeInfo: {
                startContainer: range.startContainer.textContent?.substring(0, 50),
                startOffset: range.startOffset,
                endContainer: range.endContainer.textContent?.substring(0, 50),
                endOffset: range.endOffset
            }
        });
    }
    
    const highlightData = {
        id: window.LumosDomUtils.generateUUID(),
        timestamp: new Date().toISOString(),
        url: window.location.href,
        page_title: document.title,
        color: color,
        text: text,
        context_before: backupContextBefore,
        context_after: backupContextAfter,
        position: window.LumosPositionDataGenerator.getPositionData(range)
    };
    
    if (window.LumosLogger) {
        window.LumosLogger.debug('Highlight data being saved:', {
            text: highlightData.text,
            context_before: highlightData.context_before,
            context_after: highlightData.context_after,
            domain: new URL(window.location.href).hostname
        });
    }
    
    // Apply highlight to DOM
    const highlightElement = document.createElement('span');
    highlightElement.className = `lumos-highlight lumos-highlight-${color}`;
    highlightElement.setAttribute('data-highlight-id', highlightData.id);
    highlightElement.setAttribute('data-highlight-color', color);
    
    // Apply current styles
    window.LumosStyleManager.applyStylesToHighlight(highlightElement);
    
    try {
        // Validate range before highlighting
        if (range.collapsed) {
            if (window.LumosLogger) { window.LumosLogger.warn('Cannot highlight collapsed range'); }
            return;
        }
        
        // Additional validation - don't trim here as it may cause truncation
        const selectedText = range.toString();
        if (selectedText.trim().length === 0) {
            if (window.LumosLogger) { window.LumosLogger.warn('Cannot highlight empty selection'); }
            return;
        }
        
        if (window.LumosLogger) { 
            window.LumosLogger.debug('Attempting to highlight:', {
                text: selectedText,
                startContainer: range.startContainer.nodeName,
                endContainer: range.endContainer.nodeName,
                startOffset: range.startOffset,
                endOffset: range.endOffset
            }); 
        }
        
        // Use a more robust highlighting method
        if (!highlightRangeRobustly(range, highlightElement)) {
            if (window.LumosLogger) { window.LumosLogger.warn('Cannot highlight this selection'); }
            return;
        }
        
        if (window.LumosLogger) { window.LumosLogger.debug('Highlight successfully applied'); }
        
        // Clear selection first to ensure UI responds properly
        window.getSelection().removeAllRanges();
        
        // Save highlight to storage (async, shouldn't block UI)
        try {
            window.LumosStorageManager.saveHighlight(highlightData);
        } catch (error) {
            if (window.LumosLogger) { window.LumosLogger.debug('Could not save highlight to storage, but highlight applied to DOM:', error); }
        }
        
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.error('Error applying highlight:', error); }
        // Clean up any partially created elements
        if (highlightElement.parentNode) {
            highlightElement.parentNode.removeChild(highlightElement);
        }
        return;
    }
}

// Change highlight color
function changeHighlightColor(highlightElement, newColor) {
    const highlightId = highlightElement.getAttribute('data-highlight-id');
    const oldColor = highlightElement.getAttribute('data-highlight-color');
    
    if (oldColor === newColor) {
        return; // No change needed
    }
    
    // Find all parts of this highlight (in case it spans multiple elements)
    const allParts = document.querySelectorAll(`[data-highlight-id="${highlightId}"]`);
    
    // Update all parts of the highlight
    allParts.forEach(part => {
        part.className = `lumos-highlight lumos-highlight-${newColor}`;
        part.setAttribute('data-highlight-color', newColor);
        
        // Apply current styles
        window.LumosStyleManager.applyStylesToHighlight(part);
    });
    
    // Update storage (async, non-blocking) - with proper error handling
    setTimeout(() => {
        try {
            // Check if chrome.runtime is available
            if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
                if (window.LumosLogger) { 
                    window.LumosLogger.debug('Chrome runtime not available, skipping storage update'); 
                }
                return;
            }
            
            const domain = new URL(window.location.href).hostname;
            chrome.runtime.sendMessage({
                action: 'updateHighlightColor',
                domain: domain,
                highlightId: highlightId,
                newColor: newColor
            }, (response) => {
                if (chrome.runtime.lastError) {
                    if (window.LumosLogger) { 
                        window.LumosLogger.debug('Extension context invalidated, cannot update color in storage:', chrome.runtime.lastError.message); 
                    }
                }
            });
        } catch (error) {
            if (window.LumosLogger) { 
                window.LumosLogger.debug('Extension context invalidated, cannot update color in storage:', error); 
            }
        }
    }, 0);
}

// Remove highlight from DOM and storage
function removeHighlight(highlightElement) {
    const highlightId = highlightElement.getAttribute('data-highlight-id');
    
    // Find all parts of this highlight (in case it spans multiple elements)
    const allParts = document.querySelectorAll(`[data-highlight-id="${highlightId}"]`);
    
    // Remove all parts from DOM
    allParts.forEach(part => {
        const parent = part.parentNode;
        if (parent) {
            while (part.firstChild) {
                parent.insertBefore(part.firstChild, part);
            }
            parent.removeChild(part);
            
            // Normalize text nodes for each parent
            parent.normalize();
        }
    });
    
    // Remove from storage
    window.LumosStorageManager.deleteHighlight(highlightId);
}

// Restore individual highlight using a robust text-based approach
function restoreHighlight(highlightData, addToPending = true) {
    if (window.LumosLogger) { 
        window.LumosLogger.debug('🔄 Attempting to restore highlight:', {
            text: highlightData.text.substring(0, 50) + '...',
            textLength: highlightData.text.length,
            color: highlightData.color,
            id: highlightData.id,
            context_before: highlightData.context_before ? highlightData.context_before.substring(0, 30) + '...' : 'none',
            context_after: highlightData.context_after ? highlightData.context_after.substring(0, 30) + '...' : 'none'
        }); 
    }
    
    // Skip if already highlighted
    if (document.querySelector(`[data-highlight-id="${highlightData.id}"]`)) {
        if (window.LumosLogger) { window.LumosLogger.debug('✅ Highlight already exists, skipping'); }
        return true;
    }
    
    // Use a simple but robust text-based approach
    const success = restoreHighlightByTextContent(highlightData);
    
    if (success) {
        if (window.LumosLogger) { window.LumosLogger.debug('✅ Successfully restored highlight:', highlightData.text.substring(0, 30) + '...'); }
        return true;
    } else {
        if (window.LumosLogger) { window.LumosLogger.debug('❌ Failed to restore highlight:', highlightData.text.substring(0, 30) + '...'); }
        return false;
    }
}

// Attempt to match text across multiple adjacent nodes
function attemptCrossNodeMatching(targetText, context_before, context_after) {
    const candidates = [];
    
    try {
        // Look for the first few words of the target text
        const targetWords = targetText.split(/\s+/);
        if (targetWords.length < 2) return candidates;
        
        const firstWords = targetWords.slice(0, Math.min(4, targetWords.length)).join(' ');
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let node;
        while (node = walker.nextNode()) {
            const nodeText = node.textContent;
            if (nodeText.includes(firstWords) || nodeText.toLowerCase().includes(firstWords.toLowerCase())) {
                // Found potential starting node, try to build complete text from here
                const reconstructedText = reconstructTextFromNode(node, targetText.length * 1.5);
                
                if (window.LumosLogger && targetText.includes('Authorities in Beijing')) {
                    window.LumosLogger.debug('Debug: Cross-node - found starting node, reconstructed:', reconstructedText.substring(0, 100));
                }
                
                // Check if reconstructed text contains our target
                const similarity = window.LumosTextMatcher.calculateTextSimilarity(reconstructedText, targetText);
                if (window.LumosLogger && targetText.includes('Authorities in Beijing')) {
                    window.LumosLogger.debug('Debug: Cross-node similarity:', similarity);
                }
                if (similarity > 0.6) {
                    candidates.push({
                        node: node,
                        index: 0,
                        score: 80 + (similarity * 10),
                        strategy: 'cross-node',
                        reconstructedText: reconstructedText
                    });
                }
            }
        }
        
    } catch (error) {
        if (window.LumosLogger) {
            window.LumosLogger.error('Error in cross-node matching:', error);
        }
    }
    
    return candidates;
}

// Reconstruct text by walking through adjacent text nodes
function reconstructTextFromNode(startNode, maxLength) {
    let text = startNode.textContent || '';
    let currentNode = startNode;
    let addedCount = 0;
    const maxNodes = 10; // Limit to prevent infinite loops
    
    // Walk forward through text nodes to build complete text
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    // Set walker to current node
    walker.currentNode = startNode;
    
    // Get subsequent text nodes
    while (text.length < maxLength && addedCount < maxNodes) {
        const nextNode = walker.nextNode();
        if (!nextNode) break;
        
        const nextText = nextNode.textContent || '';
        
        // Skip empty or whitespace-only nodes
        if (nextText.trim().length === 0) continue;
        
        // Add a space if the previous text doesn't end with whitespace
        // and the new text doesn't start with whitespace or punctuation
        if (text.length > 0 && 
            !text.match(/\s$/) && 
            !nextText.match(/^\s/) && 
            !nextText.match(/^[.,;:!?]/)) {
            text += ' ';
        }
        
        text += nextText;
        addedCount++;
        
        if (window.LumosLogger && text.includes('Authorities in Beijing')) {
            window.LumosLogger.debug(`Debug: Added node ${addedCount}, text now:`, text.substring(0, 150));
        }
    }
    
    return text;
}

// Create cross-node highlight using a single range that spans multiple nodes
function createCrossNodeHighlight(startNode, startIndex, targetText, highlightData, candidate) {
    try {
        if (window.LumosLogger) {
            window.LumosLogger.debug('Debug: Creating cross-node highlight:', {
                targetLength: targetText.length,
                reconstructedLength: candidate.reconstructedText.length
            });
        }
        
        // Find the end node and offset by walking through text nodes
        let remainingLength = targetText.length;
        let currentNode = startNode;
        let currentOffset = startIndex;
        let endNode = null;
        let endOffset = 0;
        
        // Walk through nodes to find where the text ends
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        walker.currentNode = startNode;
        
        while (remainingLength > 0 && currentNode) {
            const nodeText = currentNode.textContent || '';
            const availableLength = nodeText.length - currentOffset;
            const takeLength = Math.min(remainingLength, availableLength);
            
            if (takeLength > 0) {
                remainingLength -= takeLength;
                
                if (remainingLength === 0) {
                    // Found the end position
                    endNode = currentNode;
                    endOffset = currentOffset + takeLength;
                    break;
                }
            }
            
            // Move to next text node
            currentNode = walker.nextNode();
            currentOffset = 0; // Reset offset for subsequent nodes
        }
        
        if (!endNode) {
            if (window.LumosLogger) {
                window.LumosLogger.warn('Could not find end node for cross-node highlight');
            }
            return false;
        }
        
        if (window.LumosLogger) {
            window.LumosLogger.debug('Debug: Cross-node range:', {
                startNode: startNode.textContent?.substring(0, 30),
                startOffset: startIndex,
                endNode: endNode.textContent?.substring(0, 30),
                endOffset: endOffset
            });
        }
        
        // Create a single range that spans from start to end
        const range = document.createRange();
        range.setStart(startNode, startIndex);
        range.setEnd(endNode, endOffset);
        
        if (range.collapsed) {
            if (window.LumosLogger) {
                window.LumosLogger.warn('Cross-node range is collapsed');
            }
            return false;
        }
        
        // Check if this highlight already exists
        const existingHighlight = document.querySelector(`[data-highlight-id="${highlightData.id}"]`);
        if (existingHighlight) {
            if (window.LumosLogger) {
                window.LumosLogger.warn('Debug: Highlight with this ID already exists:', {
                    id: highlightData.id,
                    existingElement: existingHighlight.outerHTML.substring(0, 100)
                });
            }
            // Remove existing highlight first
            existingHighlight.remove();
        }
        
        // Debug: Check highlight data
        if (window.LumosLogger) {
            window.LumosLogger.debug('Debug: Creating highlight with data:', {
                id: highlightData.id,
                color: highlightData.color,
                fullData: highlightData
            });
        }
        
        // Create the highlight element
        const highlightElement = document.createElement('span');
        highlightElement.className = `lumos-highlight lumos-highlight-${highlightData.color}`;
        highlightElement.setAttribute('data-highlight-id', highlightData.id);
        highlightElement.setAttribute('data-highlight-color', highlightData.color);
        
        // Try to apply the highlight using existing complex highlighting logic
        try {
            if (window.LumosLogger) {
                window.LumosLogger.debug('Debug: Passing highlight element to complex range:', {
                    className: highlightElement.className,
                    id: highlightElement.getAttribute('data-highlight-id'),
                    outerHTML: highlightElement.outerHTML
                });
            }
            const success = highlightComplexRange(range, highlightElement);
            if (success) {
                if (window.LumosLogger) {
                    window.LumosLogger.debug('✅ Cross-node highlight created successfully using complex range');
                }
                return true;
            }
        } catch (e) {
            if (window.LumosLogger) {
                window.LumosLogger.warn('Complex range highlighting failed:', e.message);
            }
        }
        
        // Fallback: use the old segmented approach
        if (window.LumosLogger) {
            window.LumosLogger.debug('Falling back to segmented highlighting');
        }
        return createSegmentedCrossNodeHighlight(startNode, startIndex, targetText, highlightData, candidate);
        
    } catch (error) {
        if (window.LumosLogger) {
            window.LumosLogger.error('Error in cross-node highlighting:', error);
        }
        return false;
    }
}

// Fallback: Create segmented cross-node highlight (old approach)
function createSegmentedCrossNodeHighlight(startNode, startIndex, targetText, highlightData, candidate) {
    try {
        // Find all text nodes that need to be highlighted
        const nodesToHighlight = [];
        let remainingLength = targetText.length;
        let currentNode = startNode;
        let currentOffset = startIndex;
        
        // Walk through nodes starting from the start node
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        walker.currentNode = startNode;
        
        while (remainingLength > 0 && currentNode) {
            const nodeText = currentNode.textContent || '';
            const availableLength = nodeText.length - currentOffset;
            const takeLength = Math.min(remainingLength, availableLength);
            
            if (takeLength > 0) {
                nodesToHighlight.push({
                    node: currentNode,
                    startOffset: currentOffset,
                    endOffset: currentOffset + takeLength
                });
                
                remainingLength -= takeLength;
            }
            
            // Move to next text node
            currentNode = walker.nextNode();
            currentOffset = 0; // Reset offset for subsequent nodes
        }
        
        // Create highlights for each node
        let highlightCount = 0;
        for (const nodeInfo of nodesToHighlight) {
            const range = document.createRange();
            range.setStart(nodeInfo.node, nodeInfo.startOffset);
            range.setEnd(nodeInfo.node, nodeInfo.endOffset);
            
            if (!range.collapsed) {
                const highlightElement = document.createElement('span');
                if (window.LumosLogger) {
                    window.LumosLogger.debug('Debug: Creating segmented highlight with color:', highlightData.color);
                }
                highlightElement.className = `lumos-highlight lumos-highlight-${highlightData.color}`;
                highlightElement.setAttribute('data-highlight-id', highlightData.id);
                highlightElement.setAttribute('data-highlight-color', highlightData.color);
                
                try {
                    range.surroundContents(highlightElement);
                    highlightCount++;
                } catch (e) {
                    // If surroundContents fails, try complex highlighting
                    if (window.LumosLogger) {
                        window.LumosLogger.warn('Segmented surroundContents failed, trying complex method');
                    }
                    const success = highlightComplexRange(range, highlightElement);
                    if (success) highlightCount++;
                }
            }
        }
        
        if (window.LumosLogger) {
            window.LumosLogger.debug(`✅ Segmented cross-node highlight created: ${highlightCount} segments highlighted`);
        }
        
        return highlightCount > 0;
        
    } catch (error) {
        if (window.LumosLogger) {
            window.LumosLogger.error('Error in segmented cross-node highlighting:', error);
        }
        return false;
    }
}


// Restore highlight using text content matching
function restoreHighlightByTextContent(highlightData) {
    const { text, context_before, context_after } = highlightData;
    
    try {
        // Find all text nodes in the document
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    // Skip already highlighted text
                    if (node.parentElement && node.parentElement.closest('.lumos-highlight')) {
                        // Debug when we skip highlighted nodes
                        if (window.LumosLogger && text.includes('Jiang Bin accused him on Tuesd')) {
                            const nodeText = node.textContent;
                            if (nodeText.includes('Jiang') || nodeText.includes('accused') || nodeText.includes('Senior Col')) {
                                window.LumosLogger.debug('Debug: Skipping text node in highlight:', {
                                    text: nodeText.substring(0, 100),
                                    highlightElement: node.parentElement.closest('.lumos-highlight')?.textContent?.substring(0, 100)
                                });
                            }
                        }
                        return NodeFilter.FILTER_REJECT;
                    }
                    
                    // Skip hidden elements
                    if (node.parentElement) {
                        const style = window.getComputedStyle(node.parentElement);
                        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                            return NodeFilter.FILTER_REJECT;
                        }
                    }
                    
                    return NodeFilter.FILTER_ACCEPT;
                }
            },
            false
        );
        
        const candidates = [];
        let node;
        
        // Collect all potential text nodes
        let nodeCount = 0;
        while (node = walker.nextNode()) {
            nodeCount++;
            const nodeText = node.textContent;
            
            // Debug: Log each text node being checked
            if (window.LumosLogger && text.includes('Authorities in Beijing')) {
                if (nodeText.includes('Authorities') || nodeText.includes('Beijing') || nodeText.includes('assail')) {
                    window.LumosLogger.debug(`Debug: Found relevant text node ${nodeCount}:`, nodeText.substring(0, 100));
                }
            }
            
            // Special debug for Jiang Bin text
            if (window.LumosLogger && text.includes('Jiang Bin accused him on Tuesd')) {
                if (nodeText.includes('Jiang') || nodeText.includes('accused') || nodeText.includes('Senior Col')) {
                    window.LumosLogger.debug(`Debug: Found Jiang Bin related text node ${nodeCount}:`, {
                        text: nodeText.substring(0, 150),
                        length: nodeText.length,
                        parentTag: node.parentElement?.tagName,
                        parentClass: node.parentElement?.className,
                        isInHighlight: !!node.parentElement?.closest('.lumos-highlight')
                    });
                }
            }
            
            // Try multiple matching strategies
            const matches = window.LumosTextMatcher.findTextMatches(nodeText, text, node);
            if (matches.length > 0 && window.LumosLogger && text.includes('Authorities in Beijing')) {
                window.LumosLogger.debug(`Debug: Found ${matches.length} matches in node ${nodeCount}`);
            }
            candidates.push(...matches);
        }
        
        if (window.LumosLogger && text.includes('Authorities in Beijing')) {
            window.LumosLogger.debug(`Debug: Checked ${nodeCount} text nodes total`);
        }
        
        if (candidates.length === 0) {
            if (window.LumosLogger) { 
                window.LumosLogger.debug('No text matches found for:', text.substring(0, 30));
                window.LumosLogger.debug('Debug: Attempting cross-node matching...');
            }
            
            // Try cross-node matching when single-node matching fails
            const crossNodeCandidates = attemptCrossNodeMatching(text, context_before, context_after);
            if (crossNodeCandidates.length > 0) {
                if (window.LumosLogger) {
                    window.LumosLogger.debug(`Debug: Found ${crossNodeCandidates.length} cross-node candidates`);
                }
                candidates.push(...crossNodeCandidates);
            } else {
                // Additional attempt: try to reconstruct text from adjacent nodes we found
                if (window.LumosLogger && text.includes('Jiang Bin accused him on Tuesd')) {
                    window.LumosLogger.debug('Debug: Attempting manual cross-node reconstruction...');
                    const manualCandidates = attemptManualCrossNodeReconstruction(text);
                    if (manualCandidates.length > 0) {
                        window.LumosLogger.debug(`Debug: Found ${manualCandidates.length} manual cross-node candidates`);
                        candidates.push(...manualCandidates);
                    } else {
                        // Try searching within existing highlight elements
                        const highlightCandidates = searchWithinHighlights(text, context_before, context_after);
                        if (highlightCandidates.length > 0) {
                            if (window.LumosLogger) {
                                window.LumosLogger.debug(`Debug: Found ${highlightCandidates.length} candidates within highlights`);
                            }
                            candidates.push(...highlightCandidates);
                        } else {
                            if (window.LumosLogger) { 
                                window.LumosLogger.debug('Debug: Cross-node matching also failed');
                                window.LumosLogger.debug('Debug: Searched text nodes count:', document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT).nextNode() ? 'Text nodes exist' : 'No text nodes');
                                window.LumosLogger.debug('Debug: Target text full:', text);
                                window.LumosLogger.debug('Debug: Context before:', context_before);
                                window.LumosLogger.debug('Debug: Context after:', context_after);
                                
                                // Special debug for the problematic middle segment
                                if (text.includes('Jiang Bin accused him on Tuesd')) {
                                    window.LumosLogger.debug('Debug: Special analysis for problematic segment');
                                    window.LumosLogger.debug('Debug: Looking for partial matches in page content...');
                                    
                                    // Check if any part of the text exists anywhere
                                    const bodyText = document.body.textContent || '';
                                    const partialMatches = [
                                        'Jiang Bin',
                                        'accused him',
                                        'on Tuesday',
                                        'distorting history',
                                        'twisting the facts'
                                    ];
                                    
                                    partialMatches.forEach(partial => {
                                        const found = bodyText.includes(partial);
                                        const index = bodyText.indexOf(partial);
                                        window.LumosLogger.debug(`Debug: "${partial}" found in page: ${found} at index: ${index}`);
                                        if (found && index >= 0) {
                                            const context = bodyText.substring(Math.max(0, index - 50), index + partial.length + 50);
                                            window.LumosLogger.debug(`Debug: Context around "${partial}": "${context}"`);
                                        }
                                    });
                                    
                                    // Check if full target text exists
                                    const fullTargetFound = bodyText.includes(text);
                                    const fullTargetIndex = bodyText.indexOf(text);
                                    window.LumosLogger.debug(`Debug: Full target text found: ${fullTargetFound} at index: ${fullTargetIndex}`);
                                    if (fullTargetFound && fullTargetIndex >= 0) {
                                        const fullContext = bodyText.substring(Math.max(0, fullTargetIndex - 100), fullTargetIndex + text.length + 100);
                                        window.LumosLogger.debug(`Debug: Full context around target: "${fullContext}"`);
                                    }
                                    
                                    // Try to find where "Senior Col." ends and see what follows
                                    const seniorColIndex = bodyText.indexOf('Senior Col.');
                                    if (seniorColIndex >= 0) {
                                        const afterSeniorCol = bodyText.substring(seniorColIndex, seniorColIndex + 200);
                                        window.LumosLogger.debug(`Debug: Text after "Senior Col.": "${afterSeniorCol}"`);
                                    }
                                    
                                    // Check for potential text node fragmentation
                                    const jiangBinIndex = bodyText.indexOf('Jiang Bin');
                                    if (jiangBinIndex >= 0) {
                                        const aroundJiangBin = bodyText.substring(Math.max(0, jiangBinIndex - 50), jiangBinIndex + 150);
                                        window.LumosLogger.debug(`Debug: Text around "Jiang Bin": "${aroundJiangBin}"`);
                                    }
                                }
                            }
                            return false;
                        }
                    }
                }
            }
        }
        
        // Score candidates based on context
        for (const candidate of candidates) {
            const baseScore = candidate.score || 0;
            const contextScore = scoreTextCandidate(candidate, text, context_before, context_after);
            candidate.score = baseScore + contextScore;
        }
        
        // Sort by score (highest first)
        candidates.sort((a, b) => b.score - a.score);
        
        if (window.LumosLogger) { window.LumosLogger.debug(`Found ${candidates.length} candidates for: "${text.substring(0, 30)}...":`); }
        candidates.forEach((candidate, i) => {
            if (window.LumosLogger) { window.LumosLogger.debug(`  ${i + 1}. Score: ${candidate.score}, Strategy: ${candidate.strategy}`); }
        });
        
        // Try to highlight the best candidate
        const bestCandidate = candidates[0];
        
        // Only proceed if we have a reasonable confidence
        if (bestCandidate.score > 0) {
            // For manual-cross-node strategy, use special cross-node highlighting
            if (bestCandidate.strategy === 'manual-cross-node') {
                return createCrossNodeHighlight(bestCandidate.node, bestCandidate.index, text, highlightData, bestCandidate);
            } else {
                return createSimpleHighlight(bestCandidate.node, bestCandidate.index, text, highlightData, bestCandidate);
            }
        }
        
        return false;
        
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.error('Error in text-based restoration:', error); }
        return false;
    }
}

// Create a simple highlight without complex DOM manipulation
function createSimpleHighlight(textNode, startIndex, text, highlightData, candidate = null) {
    try {
        const nodeText = textNode.textContent;
        
        // For flexible matching, find the best actual end position
        let actualLength = text.length;
        let rangeText = nodeText.substring(startIndex, startIndex + actualLength);
        
        // Try to find the best match by extending or reducing the range
        const normalizedTarget = window.LumosTextMatcher.normalizeTextForMatching(text);
        let bestMatch = null;
        let bestScore = 0;
        
        // Try different lengths around the expected length
        for (let lengthOffset = -5; lengthOffset <= 20; lengthOffset++) {
            const testLength = text.length + lengthOffset;
            if (startIndex + testLength > nodeText.length || testLength < 5) continue;
            
            const testText = nodeText.substring(startIndex, startIndex + testLength);
            const normalizedTest = window.LumosTextMatcher.normalizeTextForMatching(testText);
            
            const similarity = window.LumosTextMatcher.calculateTextSimilarity(normalizedTest, normalizedTarget);
            
            if (similarity > bestScore && similarity > 0.8) {
                bestScore = similarity;
                bestMatch = {
                    text: testText,
                    length: testLength,
                    similarity: similarity
                };
            }
        }
        
        // If we found a good match, use that
        if (bestMatch) {
            actualLength = bestMatch.length;
            rangeText = bestMatch.text;
            if (window.LumosLogger) { 
                window.LumosLogger.debug('📍 Using flexible match:', {
                    original: text.substring(0, 30) + '...',
                    matched: rangeText.substring(0, 30) + '...',
                    similarity: bestMatch.similarity
                }); 
            }
        } else {
            // Check if this is a cross-node candidate with reconstructed text
            if ((candidate.strategy === 'cross-node' || candidate.strategy === 'manual-cross-node') && candidate.reconstructedText) {
                // For cross-node matches, use the reconstructed text and extract the target portion
                const reconstructed = candidate.reconstructedText;
                const targetStart = reconstructed.toLowerCase().indexOf(text.toLowerCase().substring(0, 30));
                
                if (targetStart !== -1) {
                    rangeText = reconstructed.substring(targetStart, targetStart + text.length);
                } else {
                    // Fallback: use portion of reconstructed text
                    rangeText = reconstructed.substring(0, Math.min(reconstructed.length, text.length * 1.2));
                }
                
                if (window.LumosLogger && text.includes('Jiang Bin accused him on Tuesd')) {
                    window.LumosLogger.debug('Debug: Using manual cross-node reconstructed text:', {
                        originalReconstructed: reconstructed.substring(0, 100),
                        extractedRange: rangeText.substring(0, 100),
                        targetLength: text.length,
                        strategy: candidate.strategy
                    });
                }
            } else {
                // Fallback to original length for non-cross-node matches
                rangeText = nodeText.substring(startIndex, startIndex + actualLength);
            }
            
            // Check if it's close enough
            const normalizedRange = window.LumosTextMatcher.normalizeTextForMatching(rangeText);
            const similarity = window.LumosTextMatcher.calculateTextSimilarity(normalizedRange, normalizedTarget);
            
            // Debug: Show what's being compared
            if (window.LumosLogger && text.includes('Authorities in Beijing')) {
                window.LumosLogger.debug('Debug: Similarity check details:', {
                    originalText: text.substring(0, 100),
                    rangeText: rangeText.substring(0, 100),
                    normalizedTarget: normalizedTarget.substring(0, 100),
                    normalizedRange: normalizedRange.substring(0, 100),
                    similarity: similarity
                });
            }
            
            if (similarity < 0.7) {
                if (window.LumosLogger) { 
                    window.LumosLogger.warn('Text similarity too low:', {
                        similarity: similarity,
                        expected: text.substring(0, 50),
                        actual: rangeText.substring(0, 50)
                    }); 
                }
                return false;
            }
        }
        
        // Handle cross-node highlighting differently
        if (candidate && candidate.strategy === 'cross-node' && candidate.reconstructedText) {
            return createCrossNodeHighlight(textNode, startIndex, text, highlightData, candidate);
        }
        
        const range = document.createRange();
        range.setStart(textNode, startIndex);
        
        // Ensure we don't exceed the node's length
        const maxOffset = Math.min(startIndex + actualLength, textNode.textContent.length);
        range.setEnd(textNode, maxOffset);
        
        if (range.collapsed) {
            if (window.LumosLogger) { window.LumosLogger.warn('Range is collapsed, cannot highlight'); }
            return false;
        }
        
        const highlightElement = document.createElement('span');
        highlightElement.className = `lumos-highlight lumos-highlight-${highlightData.color}`;
        highlightElement.setAttribute('data-highlight-id', highlightData.id);
        highlightElement.setAttribute('data-highlight-color', highlightData.color);
        
        // Apply current styles
        window.LumosStyleManager.applyStylesToHighlight(highlightElement);
        
        range.surroundContents(highlightElement);
        
        if (window.LumosLogger) { window.LumosLogger.debug('✅ Flexible highlight created successfully:', rangeText.substring(0, 30) + '...'); }
        return true;
        
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.error('Error creating simple highlight:', error); }
        return false;
    }
}


// Simplified highlighting method for safe ranges
function highlightRangeRobustly(range, highlightElement) {
    try {
        // Since we've filtered out cross-element selections, this should be simpler
        if (range.startContainer === range.endContainer && 
            range.startContainer.nodeType === Node.TEXT_NODE) {
            range.surroundContents(highlightElement);
            return true;
        }
        
        // For any remaining complex cases, try the complex handler
        return highlightComplexRange(range, highlightElement);
        
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.error('Highlighting failed:', error); }
        return false;
    }
}

// Manual cross-node reconstruction for specific cases
function attemptManualCrossNodeReconstruction(targetText) {
    const candidates = [];
    
    try {
        // Look for the start of our target text
        const targetStart = targetText.substring(0, Math.min(20, targetText.length));
        
        if (window.LumosLogger) {
            window.LumosLogger.debug(`Debug: Looking for target start: "${targetStart}"`);
        }
        
        // Find all text nodes that might contain the beginning
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    // Don't skip highlighted nodes for this reconstruction
                    if (node.parentElement) {
                        const style = window.getComputedStyle(node.parentElement);
                        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                            return NodeFilter.FILTER_REJECT;
                        }
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            },
            false
        );
        
        let node;
        while (node = walker.nextNode()) {
            const nodeText = node.textContent || '';
            
            // Check if this node contains the start of our target
            if (nodeText.includes('Jiang Bin')) {
                if (window.LumosLogger) {
                    window.LumosLogger.debug(`Debug: Found potential start node: "${nodeText}"`);
                }
                
                // Try to reconstruct text by walking forward from this node
                const reconstructed = reconstructTextFromNode(node, targetText.length + 20);
                
                if (window.LumosLogger) {
                    window.LumosLogger.debug(`Debug: Reconstructed text: "${reconstructed.substring(0, 100)}..."`);
                }
                
                // Check if reconstructed text contains our target
                const targetStart30 = targetText.substring(0, 30);
                if (reconstructed.includes(targetStart30)) {
                    const startIndex = reconstructed.indexOf(targetStart30);
                    
                    candidates.push({
                        node: node,
                        index: 0, // Start from beginning of reconstructed text
                        score: 85,
                        strategy: 'manual-cross-node',
                        reconstructedText: reconstructed,
                        startIndex: startIndex
                    });
                    
                    if (window.LumosLogger) {
                        window.LumosLogger.debug(`Debug: Created manual cross-node candidate with score 85`);
                    }
                }
            }
        }
        
    } catch (error) {
        if (window.LumosLogger) {
            window.LumosLogger.error('Error in manual cross-node reconstruction:', error);
        }
    }
    
    return candidates;
}

// Reconstruct text by walking through adjacent text nodes
function reconstructTextFromNode(startNode, maxLength) {
    let reconstructedText = '';
    let currentLength = 0;
    
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    walker.currentNode = startNode;
    
    // Start with current node
    let node = startNode;
    while (node && currentLength < maxLength) {
        const nodeText = node.textContent || '';
        reconstructedText += nodeText;
        currentLength += nodeText.length;
        
        // Move to next text node
        node = walker.nextNode();
        
        // Stop if we hit a different paragraph or container to avoid crossing boundaries
        if (node && node.parentElement?.tagName !== startNode.parentElement?.tagName) {
            break;
        }
    }
    
    return reconstructedText;
}

// Search for text within existing highlight elements
function searchWithinHighlights(targetText, context_before, context_after) {
    const candidates = [];
    
    try {
        // Find all existing highlight elements
        const highlights = document.querySelectorAll('.lumos-highlight');
        
        if (window.LumosLogger && targetText.includes('Jiang Bin accused him on Tuesd')) {
            window.LumosLogger.debug(`Debug: Searching for "${targetText.substring(0, 50)}..." within ${highlights.length} existing highlights`);
        }
        
        for (const highlight of highlights) {
            const highlightText = highlight.textContent || '';
            
            if (window.LumosLogger && targetText.includes('Jiang Bin accused him on Tuesd')) {
                window.LumosLogger.debug(`Debug: Checking highlight with text: "${highlightText.substring(0, 100)}..."`);
                window.LumosLogger.debug(`Debug: Target text: "${targetText.substring(0, 100)}..."`);
                window.LumosLogger.debug(`Debug: Contains check: ${highlightText.includes(targetText)}`);
            }
            
            // Check if this highlight contains our target text (exact or partial)
            const targetStart = targetText.substring(0, Math.min(30, targetText.length));
            const containsExact = highlightText.includes(targetText);
            const containsPartial = highlightText.includes(targetStart);
            
            if (window.LumosLogger && targetText.includes('Jiang Bin accused him on Tuesd')) {
                window.LumosLogger.debug(`Debug: Checking contains - exact: ${containsExact}, partial: ${containsPartial}`);
                window.LumosLogger.debug(`Debug: Target start: "${targetStart}"`);
                window.LumosLogger.debug(`Debug: Full highlight text: "${highlightText}"`);
            }
            
            if (containsExact || containsPartial) {
                if (window.LumosLogger && targetText.includes('Jiang Bin accused him on Tuesd')) {
                    window.LumosLogger.debug(`Debug: Exact match found in highlight. HighlightText: "${highlightText}"`);
                }
                // Find the text nodes within this highlight element
                const walker = document.createTreeWalker(
                    highlight,
                    NodeFilter.SHOW_TEXT,
                    null,
                    false
                );
                
                let textNode;
                let currentOffset = 0;
                
                // Walk through text nodes to find the one containing our target
                while (textNode = walker.nextNode()) {
                    const nodeText = textNode.textContent || '';
                    const targetIndex = nodeText.indexOf(targetText);
                    
                    if (targetIndex !== -1) {
                        if (window.LumosLogger && targetText.includes('Jiang Bin accused him on Tuesd')) {
                            window.LumosLogger.debug(`Debug: Found target text in text node at index ${targetIndex}`);
                        }
                        
                        candidates.push({
                            node: textNode,
                            index: targetIndex,
                            score: 80, // High score for exact match within existing highlight
                            strategy: 'within-highlight',
                            originalHighlight: highlight
                        });
                        break; // Found it, no need to continue
                    }
                    currentOffset += nodeText.length;
                }
            } else {
                // Try fuzzy matching within this highlight
                const matches = window.LumosTextMatcher.findTextMatches(highlightText, targetText, null);
                for (const match of matches) {
                    if (match.score > 70) { // Only consider good matches
                        // Find the specific text node containing this match
                        const walker = document.createTreeWalker(
                            highlight,
                            NodeFilter.SHOW_TEXT,
                            null,
                            false
                        );
                        
                        let textNode;
                        let currentOffset = 0;
                        
                        while (textNode = walker.nextNode()) {
                            const nodeText = textNode.textContent || '';
                            if (currentOffset <= match.index && match.index < currentOffset + nodeText.length) {
                                // This text node contains our match
                                candidates.push({
                                    node: textNode,
                                    index: match.index - currentOffset,
                                    score: match.score + 5, // Small bonus for being in highlight
                                    strategy: 'fuzzy-within-highlight',
                                    originalHighlight: highlight
                                });
                                break;
                            }
                            currentOffset += nodeText.length;
                        }
                    }
                }
            }
        }
        
        if (window.LumosLogger && candidates.length > 0) {
            window.LumosLogger.debug(`Debug: Found ${candidates.length} matches within existing highlights`);
        }
        
    } catch (error) {
        if (window.LumosLogger) {
            window.LumosLogger.error('Error searching within highlights:', error);
        }
    }
    
    return candidates;
}

// Score a text candidate based on surrounding context
function scoreTextCandidate(candidate, targetText, contextBefore, contextAfter) {
    let score = 1; // Base score for finding the text
    
    try {
        const node = candidate.node;
        const index = candidate.index;
        
        // Get surrounding text
        const nodeText = node.textContent;
        const beforeText = nodeText.substring(0, index);
        const afterText = nodeText.substring(index + targetText.length);
        
        // Get text from adjacent nodes
        const extendedBefore = getExtendedContext(node, 'before', beforeText, 200);
        const extendedAfter = getExtendedContext(node, 'after', afterText, 200);
        
        // Score based on context matching
        if (contextBefore && extendedBefore) {
            const beforeMatch = calculateContextMatchForHighlighting(extendedBefore, contextBefore);
            score += beforeMatch * 10; // Weight context matching heavily
        }
        
        if (contextAfter && extendedAfter) {
            const afterMatch = calculateContextMatchForHighlighting(extendedAfter, contextAfter);
            score += afterMatch * 10;
        }
        
        return score;
        
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.warn('Error scoring candidate:', error); }
        return 0;
    }
}

// Calculate how well two context strings match
function calculateContextMatchForHighlighting(actual, expected) {
    if (!actual || !expected) return 0;
    
    const actualLower = actual.toLowerCase().trim();
    const expectedLower = expected.toLowerCase().trim();
    
    if (actualLower === expectedLower) return 1.0;
    
    // Check for substring matches
    if (actualLower.includes(expectedLower) || expectedLower.includes(actualLower)) {
        return 0.8;
    }
    
    // Check for word overlap
    const actualWords = actualLower.split(/\s+/);
    const expectedWords = expectedLower.split(/\s+/);
    const commonWords = actualWords.filter(word => 
        word.length > 3 && expectedWords.includes(word)
    );
    
    if (commonWords.length > 0) {
        return Math.min(0.6, commonWords.length / Math.max(actualWords.length, expectedWords.length));
    }
    
    return 0;
}

// Get extended context by walking adjacent text nodes
function getExtendedContext(startNode, direction, initialText, maxLength) {
    let context = initialText;
    let currentNode = startNode;
    
    try {
        // Walk through adjacent text nodes
        for (let i = 0; i < 10 && context.length < maxLength; i++) {
            const nextNode = direction === 'before' ? 
                getPreviousTextNode(currentNode) : 
                getNextTextNode(currentNode);
                
            if (!nextNode) break;
            
            const nodeText = nextNode.textContent || '';
            
            if (direction === 'before') {
                context = nodeText + ' ' + context;
            } else {
                context = context + ' ' + nodeText;
            }
            
            currentNode = nextNode;
        }
        
        return context.trim();
        
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.warn('Error getting extended context:', error); }
        return initialText;
    }
}

// Get previous text node
function getPreviousTextNode(node) {
    let current = node.previousSibling;
    while (current && current.nodeType !== Node.TEXT_NODE) {
        current = current.previousSibling;
    }
    return current;
}

// Get next text node
function getNextTextNode(node) {
    let current = node.nextSibling;
    while (current && current.nodeType !== Node.TEXT_NODE) {
        current = current.nextSibling;
    }
    return current;
}


// Backup context extraction
function getBackupContext(direction, range) {
    try {
        const selectedText = range.toString();
        const bodyText = document.body.textContent || '';
        const selectedIndex = bodyText.indexOf(selectedText);
        
        if (selectedIndex >= 0) {
            if (direction === 'before') {
                const beforeText = bodyText.substring(Math.max(0, selectedIndex - 500), selectedIndex);
                const words = beforeText.split(/\s+/).filter(word => word.trim().length > 0);
                const result = words.slice(-30).join(' ');
                
                // Debug for short context results
                if (window.LumosLogger && (result === 'l.' || result.length < 5)) {
                    window.LumosLogger.debug('Debug: Backup context extraction (before):', {
                        selectedText: selectedText.substring(0, 50),
                        selectedIndex: selectedIndex,
                        beforeText: beforeText.substring(Math.max(0, beforeText.length - 100)),
                        words: words,
                        result: result
                    });
                }
                
                return result;
            } else if (direction === 'after') {
                const afterStartIndex = selectedIndex + selectedText.length;
                const afterText = bodyText.substring(afterStartIndex, afterStartIndex + 500);
                const words = afterText.split(/\s+/).filter(word => word.trim().length > 0);
                return words.slice(0, 30).join(' ');
            }
        }
    } catch (error) {
        if (window.LumosLogger) { window.LumosLogger.error('Error in backup context extraction:', error); }
    }
    
    return '';
}

// Assign to global window object
window.LumosHighlightManager = {
    updateHighlightStyles: (styles) => window.LumosStyleManager.updateHighlightStyles(styles),
    applyHighlight,
    changeHighlightColor,
    removeHighlight,
    restoreHighlight,
    restoreHighlightByTextContent,
    createSimpleHighlight,
    highlightRangeRobustly,
    scoreTextCandidate,
    calculateContextMatchForHighlighting,
    getExtendedContext,
    getPreviousTextNode,
    getNextTextNode,
    getBackupContext
};