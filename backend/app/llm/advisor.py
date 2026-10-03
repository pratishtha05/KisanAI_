from __future__ import annotations

import logging
from typing import Iterator, List, Optional

from app.core.config import settings
from app.schemas.farm_advisor import FarmAdvisorQueryRequest, FarmAdvisorResponse
from app.services.advisor_context import AdvisorContext, AdvisorUnavailable
from app.services.advisor_base import FarmAdvisorService

from .engine import get_engine
from .parsing import parse_advice
from .prompt import FEW_SHOT, SYSTEM_PROMPT, build_user_message
from .retriever import Retrieved, detect_category, retrieve

log = logging.getLogger("kisanai.llm")


def _confidence(retrieved: List[Retrieved]) -> float:
    """Grounding score, NOT the model's self-reported certainty (a 0.5B model's
    own certainty is meaningless). Strong knowledge-base match -> higher."""
    if not retrieved:
        return 0.3
    best = max(r.similarity for r in retrieved)
    return round(max(0.3, min(0.95, 0.4 + 0.6 * best)), 2)


class LLMFarmAdvisorService(FarmAdvisorService):
    def __init__(self):
        self.engine = get_engine()

    # ---- lifecycle -------------------------------------------------------
    def warmup(self) -> None:
        self.engine.check_files()     
        self.engine.start_loading()    

    def status(self) -> dict:
        return {"mode": "local", "state": self.engine.state, "error": self.engine.error}

    def _retrieve(
        self,
        request: FarmAdvisorQueryRequest,
        ctx: AdvisorContext,
        category: Optional[str] = None,
    ) -> List[Retrieved]:

        if category:
            query, farm_crop = request.query, None      # general question: no farm context
        else:
            query = f"{request.query} {ctx.stage}" if ctx.stage else request.query
            farm_crop = ctx.crop                        # retrieve() adds/filters by crop itself

        try:
            retrieved = retrieve(
                query,
                farm_crop=farm_crop,
                top_k=settings.RAG_TOP_K,
                min_similarity=settings.RAG_MIN_SIMILARITY,
                category=category,
            )
        except Exception as e:
            log.exception("Knowledge-base retrieval failed")
            raise AdvisorUnavailable(
                "The agricultural knowledge base is temporarily unavailable."
            ) from e

        # Look at this log first whenever an answer is bad: it shows what the model was given.
        log.info(
            "RAG query=%r category=%s -> %s",
            query, category,
            [(r.source, round(r.similarity, 2), len(r.text)) for r in retrieved],
        )
        return retrieved

    def _ensure_ready(self) -> bool:
        if self.engine.ready:
            return False
        if self.engine.state == "error":
            raise AdvisorUnavailable(f"The advisor model failed to load: {self.engine.error}")
        if not self.engine.wait_ready(settings.LLM_LOAD_TIMEOUT):
            raise AdvisorUnavailable("The advisor is still starting up. Please try again in a minute.")
        return True

    def stream_advice(self, request: FarmAdvisorQueryRequest, ctx: Optional[AdvisorContext] = None) -> Iterator[dict]:
        ctx = ctx or AdvisorContext()

        if not self.engine.ready:
            yield {"type": "status", "state": "loading"}
        self._ensure_ready()

        yield {"type": "status", "state": "thinking"}
        category = detect_category(request.query)
        retrieved = self._retrieve(request, ctx, category)

        if not retrieved:
            response = FarmAdvisorResponse(
                recommendation="I do not have enough verified information to answer this safely.",
                reason="No relevant information was found in the agricultural knowledge base.",
                actions=[
                    "Provide your state and district.",
                    "Provide the crop and current crop stage.",
                    "Ask your local agriculture officer or Krishi Vigyan Kendra (KVK).",
                ],
                watch_out="Do not follow a general recommendation without local guidance.",
                confidence=0.3,
                sources=[],
                generated_by="local-llm",
            )

            yield {"type": "result", "data": response.model_dump()}
            return
        
        user_msg = build_user_message(ctx, request.query, retrieved, include_farm=category is None)

        parts: List[str] = []
        for delta in self.engine.stream(
            user_msg, SYSTEM_PROMPT,
            shots=FEW_SHOT,
            max_new_tokens=settings.LLM_MAX_NEW_TOKENS,
            temperature=settings.LLM_TEMPERATURE,
            top_p=settings.LLM_TOP_P,
        ):
            parts.append(delta)
            yield {"type": "token", "text": delta}

        fields = parse_advice("".join(parts))
        sources = list(dict.fromkeys(r.source for r in retrieved))  # unique, ordered
        response = FarmAdvisorResponse(
            **fields, confidence=_confidence(retrieved), sources=sources, generated_by="local-llm"
        )
        yield {"type": "result", "data": response.model_dump()}

    def get_advice(self, request: FarmAdvisorQueryRequest, ctx: Optional[AdvisorContext] = None) -> FarmAdvisorResponse:
        result = None
        for ev in self.stream_advice(request, ctx):
            if ev["type"] == "result":
                result = ev["data"]
        if result is None:
            raise AdvisorUnavailable("The advisor produced no answer.")
        return FarmAdvisorResponse(**result)
