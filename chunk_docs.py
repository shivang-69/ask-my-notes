import os
import pypdf

def extract_text_from_pdf(file_path: str) -> str:
    """
    Extracts text from a PDF file page by page using pypdf.
    """
    text_parts = []
    with open(file_path, "rb") as f:
        reader = pypdf.PdfReader(f)
        for page_num, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                text_parts.append(text)
    return "\n".join(text_parts)

def extract_text_from_txt(file_path: str) -> str:
    """
    Extracts text from a plain text file.
    """
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()

def chunk_text(text: str, chunk_size: int = 150, overlap: int = 30, filename: str = "") -> list[str]:
    """
    Splits the input text into overlapping chunks of a specified word count.
    If the document is a Markdown (.md) file, splits by headers (### ) to keep questions grouped.
    """
    if filename.lower().endswith(".md"):
        # Split by markdown headers
        raw_chunks = text.split("### ")
        chunks = []
        first_part = raw_chunks[0].strip()
        if first_part:
            chunks.append(first_part)
        for part in raw_chunks[1:]:
            part_strip = part.strip()
            if part_strip:
                chunks.append("### " + part_strip)
        return chunks

    words = text.split()
    
    # Base case: text is short enough to fit in a single chunk
    if len(words) <= chunk_size:
        return [text]
    
    chunks = []
    start_idx = 0
    total_words = len(words)
    
    while start_idx < total_words:
        end_idx = start_idx + chunk_size
        chunk_words = words[start_idx:end_idx]
        chunks.append(" ".join(chunk_words))
        
        # Advance the sliding window
        start_idx += (chunk_size - overlap)
        
        # Stop if we have advanced beyond the word list
        if start_idx >= total_words:
            break
            
        # Stop if the last chunk already read to the end of the document
        if end_idx >= total_words:
            break
            
    return chunks

def main():
    docs_dir = "docs"
    
    if not os.path.exists(docs_dir):
        print(f"Directory '{docs_dir}' does not exist. Creating it now...")
        os.makedirs(docs_dir)
        print(f"Please place your PDF or TXT files inside the '{docs_dir}' folder and run the script again.")
        return

    # Supported file extensions
    valid_extensions = (".txt", ".pdf", ".md")
    files = [f for f in os.listdir(docs_dir) if f.lower().endswith(valid_extensions)]
    
    if not files:
        print(f"No valid files found in the '{docs_dir}' directory.")
        return
        
    print(f"Found {len(files)} files in '{docs_dir}/'. Processing chunking...\n")
    
    for filename in files:
        file_path = os.path.join(docs_dir, filename)
        ext = os.path.splitext(filename)[1].lower()
        
        try:
            # Extract text based on file format
            if ext in (".txt", ".md"):
                text = extract_text_from_txt(file_path)
            elif ext == ".pdf":
                text = extract_text_from_pdf(file_path)
            else:
                continue
                
            # Perform word-based overlapping chunking (150-word chunks, 30-word overlap)
            chunks = chunk_text(text, chunk_size=150, overlap=30, filename=filename)
            
            # Print the results for each file
            total_words = len(text.split())
            print(f"File: {filename}")
            print(f"  - Total words: {total_words}")
            print(f"  - Generated chunks: {len(chunks)}")
            print("-" * 40)
            
        except Exception as e:
            print(f"Error processing {filename}: {e}")
            print("-" * 40)

if __name__ == "__main__":
    main()
