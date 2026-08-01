import unittest
from chunk_docs import chunk_text

class TestChunkDocs(unittest.TestCase):
    def test_short_text(self):
        # Text shorter than chunk_size should yield exactly 1 chunk
        text = "hello world RAG project"
        chunks = chunk_text(text, chunk_size=10, overlap=2)
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0], text)

    def test_exact_chunk_size(self):
        # Text matching chunk_size exactly should yield 1 chunk
        words = ["word"] * 500
        text = " ".join(words)
        chunks = chunk_text(text, chunk_size=500, overlap=50)
        self.assertEqual(len(chunks), 1)
        self.assertEqual(len(chunks[0].split()), 500)

    def test_overlap_and_multi_chunk(self):
        # Text with 550 words should split into 2 chunks with C=500, O=50
        # Chunk 1: words 0 to 500
        # Chunk 2: words 450 to 550
        words = [str(i) for i in range(550)]
        text = " ".join(words)
        chunks = chunk_text(text, chunk_size=500, overlap=50)
        self.assertEqual(len(chunks), 2)
        
        # Verify first chunk
        chunk_1_words = chunks[0].split()
        self.assertEqual(len(chunk_1_words), 500)
        self.assertEqual(chunk_1_words[0], "0")
        self.assertEqual(chunk_1_words[-1], "499")
        
        # Verify second chunk
        chunk_2_words = chunks[1].split()
        self.assertEqual(len(chunk_2_words), 100)  # words 450 to 549 (inclusive)
        self.assertEqual(chunk_2_words[0], "450")
        self.assertEqual(chunk_2_words[-1], "549")

    def test_empty_text(self):
        # Empty text should return a single empty chunk
        chunks = chunk_text("", chunk_size=10, overlap=2)
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0], "")

if __name__ == "__main__":
    unittest.main()
