import os
import json
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
from chunk_docs import extract_text_from_txt, extract_text_from_pdf, chunk_text

# ==============================================================================
# CONCEPTUAL EXPLANATION (As requested):
#
# 1. WHAT DOES AN EMBEDDING VECTOR REPRESENT?
#    An embedding vector is a dense, numerical representation of a piece of text
#    in a continuous, high-dimensional vector space (e.g., 384 dimensions for
#    the 'all-MiniLM-L6-v2' model).
#    Unlike keyword searches that look for exact lexical matches, embedding
#    vectors capture the *semantic meaning* (the context, concepts, and intent)
#    of the text. The model is trained on vast amounts of text so that sentences or
#    paragraphs with similar concepts (e.g., "AI assistant" and "large language model")
#    are mapped to nearby coordinates in this high-dimensional space.
#
# 2. WHY DO WE USE COSINE OR L2 DISTANCE TO COMPARE THEM?
#    - L2 Distance (Euclidean Distance): Measures the straight-line distance
#      between two points in space. Mathematically: d(u, v) = sqrt(sum((u_i - v_i)^2)).
#      A smaller L2 distance means the vectors are closer together, indicating high
#      semantic similarity.
#    - Cosine Distance / Similarity: Measures the cosine of the angle between two
#      vectors: (u . v) / (||u|| * ||v||). It focuses on direction rather than
#      magnitude, which makes it invariant to text length (i.e. if one chunk is slightly
#      longer but covers the same topic, the angle remains small).
#    - The Connection: When embedding vectors are normalized to unit length (length = 1.0),
#      which models like 'all-MiniLM-L6-v2' output by default or can easily be configured to
#      do, the L2 distance is directly monotonically related to cosine similarity. Specifically:
#          L2_distance^2 = 2 * (1 - Cosine_Similarity)
#      This means that finding the nearest neighbor using L2 distance (which is extremely
#      fast to compute using FAISS's IndexFlatL2) gives the exact same ordering of results
#      as finding the highest cosine similarity.
# ==============================================================================

def build_vector_db():
    docs_dir = "docs"
    index_file = "index.faiss"
    metadata_file = "metadata.json"
    model_name = "all-MiniLM-L6-v2"
    valid_extensions = (".txt", ".md", ".pdf")
    
    if not os.path.exists(docs_dir):
        print(f"Directory '{docs_dir}' does not exist.")
        return {"success": False, "error": f"Directory '{docs_dir}' does not exist"}
        
    files = [f for f in os.listdir(docs_dir) if f.lower().endswith(valid_extensions)]
    chunks_text_list = []
    chunks_metadata = []
    
    for filename in files:
        file_path = os.path.join(docs_dir, filename)
        ext = os.path.splitext(filename)[1].lower()
        
        try:
            if ext in (".txt", ".md"):
                text = extract_text_from_txt(file_path)
            elif ext == ".pdf":
                text = extract_text_from_pdf(file_path)
            else:
                continue
                
            file_chunks = chunk_text(text, chunk_size=150, overlap=30, filename=filename)
            
            for idx, chunk in enumerate(file_chunks):
                if chunk.strip():
                    chunks_text_list.append(chunk)
                    chunks_metadata.append({
                        "filename": filename,
                        "chunk_index": idx,
                        "text": chunk
                    })
            print(f"  - Processed '{filename}': {len(file_chunks)} chunks generated.")
        except Exception as e:
            print(f"  - Error reading '{filename}': {e}")

    if not chunks_text_list:
        print("No document chunks to embed. Creating empty FAISS index and metadata...")
        dimension = 384
        index = faiss.IndexFlatL2(dimension)
        faiss.write_index(index, index_file)
        with open(metadata_file, "w", encoding="utf-8") as f:
            json.dump([], f, ensure_ascii=False, indent=2)
        return {"success": True, "total_files": 0, "total_chunks": 0, "total_vectors": 0}
        
    print(f"\nTotal chunks to embed: {len(chunks_text_list)}")
    print(f"Step 2: Loading SentenceTransformer model '{model_name}'...")
    model = SentenceTransformer(model_name)
    
    print("Step 3: Generating embedding vectors...")
    embeddings = model.encode(chunks_text_list, show_progress_bar=False)
    
    embeddings_np = np.array(embeddings).astype('float32')
    dimension = embeddings_np.shape[1]
    
    print(f"Step 4: Building FAISS IndexFlatL2 index...")
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings_np)
    
    print(f"Step 5: Saving FAISS index and metadata to disk...")
    faiss.write_index(index, index_file)
    
    with open(metadata_file, "w", encoding="utf-8") as f:
        json.dump(chunks_metadata, f, ensure_ascii=False, indent=2)
        
    print("\nEmbedding and Indexing Complete!")
    return {
        "success": True,
        "total_files": len(files),
        "total_chunks": len(chunks_text_list),
        "total_vectors": index.ntotal
    }

def main():
    build_vector_db()

if __name__ == "__main__":
    main()
