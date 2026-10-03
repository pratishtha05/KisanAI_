from pathlib import Path

# .../backend/app/llm/paths.py -> parents[2] == .../backend
BACKEND_DIR = Path(__file__).resolve().parents[2]

MODELS = {
    "small":  {"repo": "Qwen/Qwen2.5-0.5B-Instruct", "dir_setting": "LLM_WEIGHTS_DIR_SMALL"},
    "medium": {"repo": "Qwen/Qwen2.5-1.5B-Instruct", "dir_setting": "LLM_WEIGHTS_DIR_MEDIUM"},
}

def model_paths(size: str):
    """-> (size, weights_dir, checkpoint_path_or_None, hf_repo_id)"""
    from app.core.config import settings
    size = size.strip().lower()
    if size not in MODELS:
        raise RuntimeError(f"LLM_MODEL must be one of {list(MODELS)}, got '{size}'")
    weights_dir = resolve_path(settings.LLM_WEIGHTS_DIR or getattr(settings, MODELS[size]["dir_setting"]))
    checkpoint = resolve_path(f"{settings.LLM_CHECKPOINT_DIR}/kisan_{size}.pt") if settings.LLM_USE_PT else None
    return size, weights_dir, checkpoint, MODELS[size]["repo"]

def selected_model():
    from app.core.config import settings
    return model_paths(settings.LLM_MODEL)

def resolve_path(p: str) -> str:
    path = Path(p).expanduser()
    return str(path if path.is_absolute() else (BACKEND_DIR / path).resolve())
