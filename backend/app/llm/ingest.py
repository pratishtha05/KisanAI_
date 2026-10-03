"""
Document ingestion for the ChromaDB-backed RAG pipeline.

This is the "separate file" for adding knowledge to the database: point it
at a folder of .txt files (or pass individual file paths) and it will:

  1. Read each .txt file.
  2. Hash its content (sha256).
  3. Skip it if a file with that exact content hash is already indexed
     (so re-running ingestion on the same files is always safe/idempotent).
  4. If a file with the same *name* exists but the *content* changed, the
     old chunks are removed and the new content is re-chunked and added
     (so edited files don't leave stale chunks behind).
  5. Otherwise, chunk the text, embed the chunks, and append them to the
     persistent ChromaDB collection -- existing chunks are left untouched.

"""

import argparse
import hashlib
import os

import chromadb
from chromadb.utils import embedding_functions

from app.core.config import settings
from app.llm.paths import resolve_path

# Single source of truth: values come from backend/.env (RAG_PERSIST_DIR, RAG_COLLECTION)
PERSIST_DIR = resolve_path(settings.RAG_PERSIST_DIR)
COLLECTION_NAME = settings.RAG_COLLECTION


def get_client():
    """Persistent on-disk ChromaDB client -- data survives across runs."""
    return chromadb.PersistentClient(path=PERSIST_DIR)


def get_embedding_fn():
    """
    Sentence-embedding function used for both ingestion and querying.

    Uses ChromaDB's bundled ONNX MiniLM model (all-MiniLM-L6-v2). It's
    downloaded once to a local cache on first use and runs fully offline
    after that -- same one-time-download-then-offline pattern as the
    Qwen2.5 weights this project already uses. This gives real semantic
    embeddings (meaning-based similarity) instead of a keyword-overlap
    heuristic.
    """
    return embedding_functions.DefaultEmbeddingFunction()


def get_collection():
    """Get (or create) the single collection all scripts read/write."""
    client = get_client()
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=get_embedding_fn(),
        metadata={"hnsw:space": "cosine"},  # cosine similarity for search
    )


def file_hash(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def chunk_text(text: str, chunk_size: int = 150, overlap: int = 30):
    """Word-based sliding-window chunking with overlap for context continuity."""
    words = text.split()
    if not words:
        return []
    chunks = []
    step = max(chunk_size - overlap, 1)
    for start in range(0, len(words), step):
        chunk_words = words[start:start + chunk_size]
        if not chunk_words:
            break
        chunks.append(" ".join(chunk_words))
        if start + chunk_size >= len(words):
            break
    return chunks


def already_ingested(collection, fhash: str) -> bool:
    """True if a file with this exact content hash is already indexed."""
    existing = collection.get(where={"file_hash": fhash}, limit=1)
    return len(existing["ids"]) > 0


def add_file(collection, path, docs_dir, chunk_size, chunk_overlap):
    source = os.path.relpath(path, docs_dir)

    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    fhash = file_hash(content)

    if already_ingested(collection, fhash):
        print(f"[skip]   {source} -- already indexed (unchanged content)")
        return 0

    # Same source but different content (edited file) -> replace old chunks
    # instead of stacking stale ones on top.
    stale = collection.get(where={"source": source})
    if stale["ids"]:
        print(f"[update] {source} -- content changed, replacing old chunks")
        collection.delete(ids=stale["ids"])

    chunks = chunk_text(content, chunk_size, chunk_overlap)
    # Prefix every chunk with its file title so a chunk from the middle of a file still
    # says what it is about (helps both the embedding search and the small LLM).
    title = os.path.splitext(os.path.basename(path))[0].replace("_", " ").replace("-", " ")
    chunks = [f"{title}: {c}" for c in chunks]
    if not chunks:
        print(f"[warn]   {source} -- empty file, nothing to add")
        return 0

    ids = [f"{fhash}_{i}" for i in range(len(chunks))]
    category = os.path.dirname(source).split(os.sep)[0]

    metadatas = [
        {
            "source": source,
            "category": category,
            "file_hash": fhash,
            "chunk_index": i
        }
        for i in range(len(chunks))
    ]

    collection.add(ids=ids, documents=chunks, metadatas=metadatas)
    print(f"[add]    {source} -- {len(chunks)} chunk(s) added")
    return len(chunks)


def list_indexed(collection):
    all_items = collection.get()
    sources = {}
    for meta in all_items["metadatas"]:
        sources[meta["source"]] = sources.get(meta["source"], 0) + 1

    if not sources:
        print("No documents indexed yet.")
        return

    print(f"{len(sources)} file(s) indexed, {len(all_items['ids'])} chunk(s) total:")
    for src, count in sources.items():
        print(f"  - {src}: {count} chunk(s)")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--docs_dir", type=str, default=resolve_path("./docs"),
                         help="Directory of .txt files to ingest")
    parser.add_argument("--files", nargs="*", default=None,
                         help="Specific .txt file paths to ingest (overrides --docs_dir)")
    parser.add_argument("--chunk_size", type=int, default=150,
                         help="Chunk size in words")
    parser.add_argument("--chunk_overlap", type=int, default=30,
                         help="Overlap between consecutive chunks, in words")
    parser.add_argument("--list", action="store_true", help="List indexed files and exit")
    parser.add_argument("--reset", action="store_true", help="Delete the whole collection and exit")
    args = parser.parse_args()

    client = get_client()

    if args.reset:
        try:
            client.delete_collection(COLLECTION_NAME)
            print("Collection deleted.")
        except Exception:
            print("Nothing to delete.")
        return

    collection = get_collection()

    if args.list:
        list_indexed(collection)
        return

    if args.files:
        paths = args.files
    else:
        if not os.path.isdir(args.docs_dir):
            print(f"Docs directory not found: {args.docs_dir}")
            return
        
        paths = []

        for root, dirs, files in os.walk(args.docs_dir):
            for f in files:
                if f.lower().endswith(".txt"):
                    paths.append(os.path.join(root, f))

        paths.sort()

    if not paths:
        print("No .txt files found to ingest.")
        return

    total_added = 0
    for path in paths:
        if not os.path.isfile(path):
            print(f"[warn]   {path} -- not found, skipping")
            continue
        total_added += add_file(
                collection,
                path,
                args.docs_dir,
                args.chunk_size,
                args.chunk_overlap
            )

    print(f"\nDone. {total_added} new chunk(s) added. "
          f"Collection now has {collection.count()} chunk(s) total.")


if __name__ == "__main__":
    main()
