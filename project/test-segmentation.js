/**
 * Test script for Irish text segmentation functionality
 * Run with: node test-segmentation.js
 */

// Mock DOM elements for testing
global.document = {
    getElementById: () => null,
    createElement: () => ({ 
        className: '', 
        textContent: '', 
        style: {}, 
        addEventListener: () => {},
        appendChild: () => {}
    }),
    addEventListener: () => {}
};

global.window = {};
global.localStorage = {
    getItem: () => null,
    setItem: () => {}
};

global.alert = console.log;
global.console = console;

// Import the e-reader class (we'll need to modify it slightly for testing)
class IrishEReader {
    constructor() {
        this.currentSentenceIndex = 0;
        this.sentences = [];
        this.isPlaying = false;
        this.isPracticeMode = false;
    }

    cleanInputText(text) {
        return text
            .replace(/\s+/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/\s*([.!?])\s*/g, '$1 ')
            .trim();
    }

    detectSentenceBoundaries(text) {
        const boundaries = [0];
        
        const irishAbbreviations = new Set([
            'srl', 'rl', 'ucht', 'm.sh', 'dr', 'teo', 'teoranta',
            'lch', 'lch.', 'caib', 'caib.', 'b.á.c', 'bác',
            'eag', 'eag.', 'cpt', 'cpt.', 'lth', 'lth.'
        ]);

        const commonAbbreviations = new Set([
            'mr', 'mrs', 'ms', 'dr', 'prof', 'st', 'ave', 'rd',
            'inc', 'ltd', 'co', 'corp', 'etc', 'vs', 'ie', 'eg',
            'am', 'pm', 'a.m', 'p.m'
        ]);

        const allAbbreviations = new Set([...irishAbbreviations, ...commonAbbreviations]);
        const sentenceEndPattern = /[.!?]+/g;
        let match;

        while ((match = sentenceEndPattern.exec(text)) !== null) {
            const position = match.index + match[0].length;
            
            if (this.isValidSentenceBoundary(text, position, allAbbreviations)) {
                boundaries.push(position);
            }
        }

        if (boundaries[boundaries.length - 1] !== text.length) {
            boundaries.push(text.length);
        }

        return boundaries;
    }

    isValidSentenceBoundary(text, position, abbreviations) {
        const beforeContext = text.substring(Math.max(0, position - 10), position);
        const afterContext = text.substring(position, Math.min(text.length, position + 10));

        if (this.isAbbreviation(beforeContext, abbreviations)) {
            return false;
        }

        if (/\d\.\d/.test(beforeContext + afterContext.charAt(0))) {
            return false;
        }

        if (/[a-zA-Z]\.[a-zA-Z]/.test(beforeContext + afterContext)) {
            return false;
        }

        const nextChar = text.charAt(position);
        if (nextChar && !/\s/.test(nextChar)) {
            return false;
        }

        const nextNonWhitespace = afterContext.trim().charAt(0);
        if (nextNonWhitespace && 
            !/[A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÄËÏÖÜŶĆÑŇ"""'']/u.test(nextNonWhitespace)) {
            return false;
        }

        return true;
    }

    isAbbreviation(context, abbreviations) {
        const words = context.toLowerCase().split(/\s+/);
        const lastWord = words[words.length - 1];
        
        if (!lastWord) return false;

        const cleanWord = lastWord.replace(/[.!?]+$/, '');
        return abbreviations.has(cleanWord);
    }

    countWords(text) {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    detectIrishContent(text) {
        const irishCharacters = /[áéíóúàèìòùâêîôûäëïöüŷńñ]/i;
        const irishWords = /\b(agus|le|ar|i|in|an|na|is|tá|bhí|go|do|de|sa|sna|den|don|faoi|ó|trí|chun|mar|leis|léi|dá|má|ach|nó|mura|sula|nuair|cén|cad|conas|cá|cathain|cé|céard)\b/i;
        
        return irishCharacters.test(text) || irishWords.test(text);
    }

    extractPunctuation(text) {
        const punctuation = text.match(/[.!?;:,"""''()[\]{}—–-]/g) || [];
        return punctuation;
    }

    createSentenceObjects(text, boundaries) {
        const sentences = [];

        for (let i = 0; i < boundaries.length - 1; i++) {
            const start = boundaries[i];
            const end = boundaries[i + 1];
            
            const content = text.substring(start, end).trim();
            
            if (content) {
                const sentence = {
                    id: i,
                    content: content,
                    startPosition: start,
                    endPosition: end,
                    length: content.length,
                    wordCount: this.countWords(content),
                    hasIrishContent: this.detectIrishContent(content),
                    punctuation: this.extractPunctuation(content),
                    isValid: true
                };

                sentences.push(sentence);
            }
        }

        return sentences;
    }

    filterValidSentences(sentences) {
        return sentences.filter(sentence => {
            if (!sentence.content || sentence.content.length < 2) {
                return false;
            }

            if (/^[.!?;:,\s\d]+$/.test(sentence.content)) {
                return false;
            }

            if (sentence.wordCount > 200) {
                sentence.isLong = true;
                console.warn(`Long sentence detected: ${sentence.wordCount} words`);
            }

            sentence.number = sentences.indexOf(sentence) + 1;
            return true;
        }).map((sentence, index) => {
            sentence.number = index + 1;
            sentence.id = index;
            return sentence;
        });
    }

    parseTextToSentences(text) {
        if (!text || typeof text !== 'string') {
            return [];
        }

        const cleanedText = this.cleanInputText(text);
        const sentenceBoundaries = this.detectSentenceBoundaries(cleanedText);
        const sentences = this.createSentenceObjects(cleanedText, sentenceBoundaries);
        const validSentences = this.filterValidSentences(sentences);
        
        console.log(`Parsed ${validSentences.length} valid sentences from text`);
        return validSentences;
    }
}

// Test cases
function runTests() {
    const eReader = new IrishEReader();
    let testsRun = 0;
    let testsPassed = 0;

    console.log('=== Irish Text Segmentation Tests ===\n');

    // Test 1: Basic Irish text
    console.log('Test 1: Basic Irish text');
    const test1Text = "Tá mé ag foghlaim na Gaeilge. Is breá liom an teanga seo! Cad é mar atá tú?";
    const test1Result = eReader.parseTextToSentences(test1Text);
    testsRun++;
    
    if (test1Result.length === 3) {
        console.log('✅ PASS: Correctly identified 3 sentences');
        testsPassed++;
    } else {
        console.log(`❌ FAIL: Expected 3 sentences, got ${test1Result.length}`);
    }

    const irishSentences = test1Result.filter(s => s.hasIrishContent);
    if (irishSentences.length === 3) {
        console.log('✅ PASS: All sentences detected as Irish content');
        testsPassed++;
    } else {
        console.log(`❌ FAIL: Expected 3 Irish sentences, got ${irishSentences.length}`);
    }
    testsRun++;

    console.log('\n');

    // Test 2: Abbreviations
    console.log('Test 2: Irish abbreviations');
    const test2Text = "Bhí mé ag caint le Dr. Ó Síocháin inné. Fuair mé litir ó Ucht. na hÉireann.";
    const test2Result = eReader.parseTextToSentences(test2Text);
    testsRun++;
    
    if (test2Result.length === 2) {
        console.log('✅ PASS: Correctly handled abbreviations');
        testsPassed++;
    } else {
        console.log(`❌ FAIL: Expected 2 sentences, got ${test2Result.length}`);
        test2Result.forEach((s, i) => console.log(`  ${i + 1}: "${s.content}"`));
    }

    console.log('\n');

    // Test 3: Edge cases
    console.log('Test 3: Edge cases');
    const test3Text = "Numbers like 3.14 are decimals. URLs like www.google.com should not split. Email test@example.com too.";
    const test3Result = eReader.parseTextToSentences(test3Text);
    testsRun++;
    
    if (test3Result.length === 3) {
        console.log('✅ PASS: Correctly handled edge cases');
        testsPassed++;
    } else {
        console.log(`❌ FAIL: Expected 3 sentences, got ${test3Result.length}`);
        test3Result.forEach((s, i) => console.log(`  ${i + 1}: "${s.content}"`));
    }

    console.log('\n');

    // Test 4: Mixed language
    console.log('Test 4: Mixed language');
    const test4Text = "Hello, my name is Seán. Táim ag foghlaim na Gaeilge. I live in Dublin.";
    const test4Result = eReader.parseTextToSentences(test4Text);
    testsRun++;
    
    if (test4Result.length === 3) {
        console.log('✅ PASS: Correctly parsed mixed language');
        testsPassed++;
    } else {
        console.log(`❌ FAIL: Expected 3 sentences, got ${test4Result.length}`);
    }

    const mixedIrish = test4Result.filter(s => s.hasIrishContent);
    testsRun++;
    if (mixedIrish.length === 1) {
        console.log('✅ PASS: Correctly identified 1 Irish sentence in mixed text');
        testsPassed++;
    } else {
        console.log(`❌ FAIL: Expected 1 Irish sentence, got ${mixedIrish.length}`);
    }

    console.log('\n');

    // Test 5: Performance test
    console.log('Test 5: Performance test');
    const largeText = "Tá mé ag foghlaim na Gaeilge. ".repeat(1000);
    const startTime = process.hrtime.bigint();
    const performanceResult = eReader.parseTextToSentences(largeText);
    const endTime = process.hrtime.bigint();
    const processingTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds

    testsRun++;
    if (performanceResult.length === 1000 && processingTime < 1000) {
        console.log(`✅ PASS: Performance test completed in ${processingTime.toFixed(2)}ms`);
        testsPassed++;
    } else {
        console.log(`❌ FAIL: Performance issue - ${processingTime.toFixed(2)}ms for ${performanceResult.length} sentences`);
    }

    console.log('\n');

    // Summary
    console.log('=== Test Summary ===');
    console.log(`Tests run: ${testsRun}`);
    console.log(`Tests passed: ${testsPassed}`);
    console.log(`Tests failed: ${testsRun - testsPassed}`);
    console.log(`Success rate: ${(testsPassed / testsRun * 100).toFixed(1)}%`);

    if (testsPassed === testsRun) {
        console.log('\n🎉 All tests passed! Irish text segmentation is working correctly.');
    } else {
        console.log('\n❌ Some tests failed. Check the implementation.');
    }
}

// Run the tests
runTests();