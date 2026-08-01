import os
import json
import unittest
import faiss

class TestEmbedChunks(unittest.TestCase):
    def test_serialized_files_exist(self):
        # Verify that the generated FAISS index and metadata files exist
        self.assertTrue(os.path.exists("index.faiss"), "index.faiss does not exist")
        self.assertTrue(os.path.exists("metadata.json"), "metadata.json does not exist")

    def test_faiss_index_integrity(self):
        # Verify FAISS index can be read, and has correct dimensions
        index = faiss.read_index("index.faiss")
        self.assertEqual(index.d, 384, "Index dimension is not 384")
        self.assertGreater(index.ntotal, 0, "Index contains no vectors")

    def test_metadata_alignment(self):
        # Verify metadata is valid JSON and matches index size
        index = faiss.read_index("index.faiss")
        with open("metadata.json", "r", encoding="utf-8") as f:
            metadata = json.load(f)
            
        self.assertIsInstance(metadata, list)
        self.assertEqual(len(metadata), index.ntotal, "Metadata count does not match FAISS index count")
        
        # Verify keys in metadata elements
        for item in metadata:
            self.assertIn("filename", item)
            self.assertIn("chunk_index", item)
            self.assertIn("text", item)

if __name__ == "__main__":
    unittest.main()
