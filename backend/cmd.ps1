# ingest docs
python -m app.llm.ingest --docs_dir ./docs

python -m app.llm.ingest --docs_dir ./docs --chunk_size 500 --chunk_overlap 50
