import os
import json
import argparse
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer

_model_cache = {}

def get_model(model_name: str) -> SentenceTransformer:
    if model_name not in _model_cache:
        # Load the model locally without checking HuggingFace Hub online
        _model_cache[model_name] = SentenceTransformer(model_name, local_files_only=True)
    return _model_cache[model_name]

def retrieve_query(
    query: str,
    k: int = 3,
    index_file: str = "index.faiss",
    metadata_file: str = "metadata.json",
    model_name: str = "all-MiniLM-L6-v2"
) -> list[dict]:
    """
    Embeds the user query and searches the FAISS index for the top-k most similar chunks.
    Returns a list of dictionaries containing match details and metadata.
    """
    if not os.path.exists(index_file) or not os.path.exists(metadata_file):
        raise FileNotFoundError(
            f"Required files not found. Ensure '{index_file}' and '{metadata_file}' exist by running embed_chunks.py first."
        )

    # 1. Load the FAISS index and metadata
    index = faiss.read_index(index_file)
    with open(metadata_file, "r", encoding="utf-8") as f:
        metadata = json.load(f)

    # 2. Get the cached SentenceTransformer model instance
    model = get_model(model_name)

    # 3. Embed the query and convert to float32 numpy array
    query_embedding = model.encode([query])
    query_vector = np.array(query_embedding).astype("float32")

    # 4. Search the FAISS index (IndexFlatL2 uses Euclidean L2 distance)
    # index.search returns a tuple: (distances_matrix, indices_matrix)
    # We pass query_vector (shape: [1, 384]) and k.
    # The output matrices have shape [1, k].
    distances, indices = index.search(query_vector, k)

    # 5. Compile the results
    results = []
    # Flat arrays to process the single query's matches
    query_distances = distances[0]
    query_indices = indices[0]

    for dist, idx in zip(query_distances, query_indices):
        # FAISS returns -1 index if it couldn't find enough matches
        if idx == -1:
            continue
            
        # Retrieve original chunk metadata using the index ID
        chunk_info = metadata[idx]
        results.append({
            "filename": chunk_info["filename"],
            "chunk_index": chunk_info["chunk_index"],
            "text": chunk_info["text"],
            "distance": float(dist)
        })

    return results

def main():
    parser = argparse.ArgumentParser(description="Search the FAISS index for relevant document chunks.")
    parser.add_argument("query", type=str, help="The query/question to search for.")
    parser.add_argument("-k", type=int, default=3, help="The number of top results to return (default: 3).")
    
    args = parser.parse_args()
    
    try:
        results = retrieve_query(args.query, k=args.k)
        
        if not results:
            print("No relevant chunks found.")
            return

        print(f"\nTop {len(results)} matches for query: '{args.query}'\n")
        print("=" * 60)
        
        for rank, res in enumerate(results, 1):
            print(f"Match #{rank} (Distance/L2 Score: {res['distance']:.4f})")
            print(f"Source: {res['filename']} (Chunk {res['chunk_index']})")
            print("-" * 60)
            # Display a clean snippet or full text depending on length
            print(res["text"])
            print("=" * 60)
            print()
            
    except Exception as e:
        print(f"Error during retrieval: {e}")

if __name__ == "__main__":
    main()
