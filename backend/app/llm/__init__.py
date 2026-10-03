"""KisanAI local LLM package (from-scratch transformer + ChromaDB RAG).

Importing this package must stay cheap: torch / chromadb are only imported
when `app.llm.engine` / `app.llm.retriever` are used (i.e. LLM_MODE=local).
"""
