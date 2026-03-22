"""
Test script for Irish text segmentation functionality
Run with: python test_segmentation.py
"""

import re
import time

class IrishEReader:
    def __init__(self):
        self.current_sentence_index = 0
        self.sentences = []
        self.is_playing = False
        self.is_practice_mode = False

    def clean_input_text(self, text):
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove excessive line breaks
        text = re.sub(r'\n{3,}', '\n\n', text)
        # Fix spacing around punctuation
        text = re.sub(r'\s*([.!?])\s*', r'\1 ', text)
        # Remove leading/trailing whitespace
        return text.strip()

    def detect_sentence_boundaries(self, text):
        boundaries = [0]
        
        irish_abbreviations = {
            'srl', 'rl', 'ucht', 'm.sh', 'dr', 'teo', 'teoranta',
            'lch', 'lch.', 'caib', 'caib.', 'b.á.c', 'bác',
            'eag', 'eag.', 'cpt', 'cpt.', 'lth', 'lth.'
        }

        common_abbreviations = {
            'mr', 'mrs', 'ms', 'dr', 'prof', 'st', 'ave', 'rd',
            'inc', 'ltd', 'co', 'corp', 'etc', 'vs', 'ie', 'eg',
            'am', 'pm', 'a.m', 'p.m'
        }

        all_abbreviations = irish_abbreviations.union(common_abbreviations)
        
        # Find sentence-ending punctuation
        for match in re.finditer(r'[.!?]+', text):
            position = match.end()
            
            if self.is_valid_sentence_boundary(text, position, all_abbreviations):
                boundaries.append(position)

        if boundaries[-1] != len(text):
            boundaries.append(len(text))

        return boundaries

    def is_valid_sentence_boundary(self, text, position, abbreviations):
        before_context = text[max(0, position - 10):position]
        after_context = text[position:min(len(text), position + 10)]

        # Check for abbreviations
        if self.is_abbreviation(before_context, abbreviations):
            return False

        # Check for decimal numbers
        if re.search(r'\d\.\d', before_context + (after_context[:1] if after_context else '')):
            return False

        # Check for URLs or email addresses
        if re.search(r'[a-zA-Z]\.[a-zA-Z]', before_context + after_context):
            return False

        # Must have whitespace or end of text after punctuation
        next_char = text[position] if position < len(text) else ''
        if next_char and not re.match(r'\s', next_char):
            return False

        # If next character exists, it should be uppercase or a quote
        next_non_whitespace = after_context.strip()[:1] if after_context else ''
        if (next_non_whitespace and 
            not re.match(r'[A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÄËÏÖÜŶĆÑŇ"""'']', next_non_whitespace)):
            return False

        return True

    def is_abbreviation(self, context, abbreviations):
        words = context.lower().split()
        if not words:
            return False
            
        last_word = words[-1]
        clean_word = re.sub(r'[.!?]+$', '', last_word)
        return clean_word in abbreviations

    def count_words(self, text):
        return len([word for word in text.strip().split() if word])

    def detect_irish_content(self, text):
        irish_characters = re.search(r'[áéíóúàèìòùâêîôûäëïöüŷńñ]', text, re.IGNORECASE)
        irish_words = re.search(
            r'\b(agus|le|ar|i|in|an|na|is|tá|bhí|go|do|de|sa|sna|den|don|faoi|ó|trí|chun|mar|leis|léi|dá|má|ach|nó|mura|sula|nuair|cén|cad|conas|cá|cathain|cé|céard)\b',
            text, re.IGNORECASE
        )
        
        return bool(irish_characters or irish_words)

    def extract_punctuation(self, text):
        return re.findall(r'[.!?;:,"""''()[\]{}—–-]', text)

    def create_sentence_objects(self, text, boundaries):
        sentences = []

        for i in range(len(boundaries) - 1):
            start = boundaries[i]
            end = boundaries[i + 1]
            
            content = text[start:end].strip()
            
            if content:
                sentence = {
                    'id': i,
                    'content': content,
                    'start_position': start,
                    'end_position': end,
                    'length': len(content),
                    'word_count': self.count_words(content),
                    'has_irish_content': self.detect_irish_content(content),
                    'punctuation': self.extract_punctuation(content),
                    'is_valid': True
                }
                sentences.append(sentence)

        return sentences

    def filter_valid_sentences(self, sentences):
        valid_sentences = []
        
        for i, sentence in enumerate(sentences):
            # Remove empty or too short sentences
            if not sentence['content'] or len(sentence['content']) < 2:
                continue

            # Remove sentences that are just punctuation or numbers
            if re.match(r'^[.!?;:,\s\d]+$', sentence['content']):
                continue

            # Handle very long sentences
            if sentence['word_count'] > 200:
                sentence['is_long'] = True
                print(f"Warning: Long sentence detected: {sentence['word_count']} words")

            sentence['number'] = len(valid_sentences) + 1
            sentence['id'] = len(valid_sentences)
            valid_sentences.append(sentence)

        return valid_sentences

    def parse_text_to_sentences(self, text):
        if not text or not isinstance(text, str):
            return []

        cleaned_text = self.clean_input_text(text)
        sentence_boundaries = self.detect_sentence_boundaries(cleaned_text)
        sentences = self.create_sentence_objects(cleaned_text, sentence_boundaries)
        valid_sentences = self.filter_valid_sentences(sentences)
        
        print(f"Parsed {len(valid_sentences)} valid sentences from text")
        return valid_sentences


def run_tests():
    e_reader = IrishEReader()
    tests_run = 0
    tests_passed = 0

    print("=== Irish Text Segmentation Tests ===\n")

    # Test 1: Basic Irish text
    print("Test 1: Basic Irish text")
    test1_text = "Tá mé ag foghlaim na Gaeilge. Is breá liom an teanga seo! Cad é mar atá tú?"
    test1_result = e_reader.parse_text_to_sentences(test1_text)
    tests_run += 1
    
    if len(test1_result) == 3:
        print("✅ PASS: Correctly identified 3 sentences")
        tests_passed += 1
    else:
        print(f"❌ FAIL: Expected 3 sentences, got {len(test1_result)}")

    irish_sentences = [s for s in test1_result if s['has_irish_content']]
    tests_run += 1
    if len(irish_sentences) == 3:
        print("✅ PASS: All sentences detected as Irish content")
        tests_passed += 1
    else:
        print(f"❌ FAIL: Expected 3 Irish sentences, got {len(irish_sentences)}")

    print()

    # Test 2: Abbreviations
    print("Test 2: Irish abbreviations")
    test2_text = "Bhí mé ag caint le Dr. Ó Síocháin inné. Fuair mé litir ó Ucht. na hÉireann."
    test2_result = e_reader.parse_text_to_sentences(test2_text)
    tests_run += 1
    
    if len(test2_result) == 2:
        print("✅ PASS: Correctly handled abbreviations")
        tests_passed += 1
    else:
        print(f"❌ FAIL: Expected 2 sentences, got {len(test2_result)}")
        for i, s in enumerate(test2_result):
            print(f"  {i + 1}: \"{s['content']}\"")

    print()

    # Test 3: Edge cases
    print("Test 3: Edge cases")
    test3_text = "Numbers like 3.14 are decimals. URLs like www.google.com should not split. Email test@example.com too."
    test3_result = e_reader.parse_text_to_sentences(test3_text)
    tests_run += 1
    
    if len(test3_result) == 3:
        print("✅ PASS: Correctly handled edge cases")
        tests_passed += 1
    else:
        print(f"❌ FAIL: Expected 3 sentences, got {len(test3_result)}")
        for i, s in enumerate(test3_result):
            print(f"  {i + 1}: \"{s['content']}\"")

    print()

    # Test 4: Mixed language
    print("Test 4: Mixed language")
    test4_text = "Hello, my name is Seán. Táim ag foghlaim na Gaeilge. I live in Dublin."
    test4_result = e_reader.parse_text_to_sentences(test4_text)
    tests_run += 1
    
    if len(test4_result) == 3:
        print("✅ PASS: Correctly parsed mixed language")
        tests_passed += 1
    else:
        print(f"❌ FAIL: Expected 3 sentences, got {len(test4_result)}")

    mixed_irish = [s for s in test4_result if s['has_irish_content']]
    tests_run += 1
    if len(mixed_irish) == 1:
        print("✅ PASS: Correctly identified 1 Irish sentence in mixed text")
        tests_passed += 1
    else:
        print(f"❌ FAIL: Expected 1 Irish sentence, got {len(mixed_irish)}")

    print()

    # Test 5: Performance test
    print("Test 5: Performance test")
    large_text = "Tá mé ag foghlaim na Gaeilge. " * 1000
    start_time = time.time()
    performance_result = e_reader.parse_text_to_sentences(large_text)
    end_time = time.time()
    processing_time = (end_time - start_time) * 1000  # Convert to milliseconds

    tests_run += 1
    if len(performance_result) == 1000 and processing_time < 1000:
        print(f"✅ PASS: Performance test completed in {processing_time:.2f}ms")
        tests_passed += 1
    else:
        print(f"❌ FAIL: Performance issue - {processing_time:.2f}ms for {len(performance_result)} sentences")

    print()

    # Summary
    print("=== Test Summary ===")
    print(f"Tests run: {tests_run}")
    print(f"Tests passed: {tests_passed}")
    print(f"Tests failed: {tests_run - tests_passed}")
    print(f"Success rate: {(tests_passed / tests_run * 100):.1f}%")

    if tests_passed == tests_run:
        print("\n🎉 All tests passed! Irish text segmentation is working correctly.")
        return True
    else:
        print("\n❌ Some tests failed. Check the implementation.")
        return False


if __name__ == "__main__":
    success = run_tests()
    
    # Demonstrate usage
    if success:
        print("\n=== Usage Example ===")
        reader = IrishEReader()
        sample_text = """
        Fáilte go dtí an léitheoir Gaeilge! Tá sé seo cruthaithe chun cabhrú leat do chuid fuaimnithe a fheabhsú. 
        Is féidir leat téacs a ionchuir anseo, agus déanfaidh an córas anailís air. 
        Beidh tú in ann éisteacht leis an téacs agus do ghutha féin a thaifeadadh.
        """
        
        sentences = reader.parse_text_to_sentences(sample_text)
        print(f"\nParsed {len(sentences)} sentences:")
        for sentence in sentences:
            print(f"  {sentence['number']}: {sentence['content'][:60]}{'...' if len(sentence['content']) > 60 else ''}")
            print(f"    Words: {sentence['word_count']}, Irish: {sentence['has_irish_content']}")