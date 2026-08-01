import unittest
from retrieve import retrieve_query

class TestRetrieve(unittest.TestCase):
    def setUp(self):
        # Set default files and query for testing
        self.test_query = "What are vector embeddings and RAG?"

    def test_retrieval_returns_correct_k(self):
        # If we request k=2, we should get exactly 2 results
        results = retrieve_query(self.test_query, k=2)
        self.assertEqual(len(results), 2, f"Expected 2 results, got {len(results)}")

    def test_retrieval_respects_max_elements(self):
        # If we request more than what exists (e.g. k=10, but database has 3),
        # we should get all existing 3 results, and not crash.
        results = retrieve_query(self.test_query, k=10)
        self.assertLessEqual(len(results), 3)

    def test_retrieval_sorting_order(self):
        # The results must be sorted by distance in ascending order (smallest L2 distance first, i.e., most relevant)
        results = retrieve_query(self.test_query, k=3)
        self.assertGreater(len(results), 1, "Need at least 2 results to check sorting order")
        
        distances = [res["distance"] for res in results]
        # Check if the list of distances is sorted in ascending order
        self.assertEqual(distances, sorted(distances), f"Distances are not sorted ascendingly: {distances}")

if __name__ == "__main__":
    unittest.main()
