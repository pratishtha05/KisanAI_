from typing import Any, Dict

from app.knowledge.disease_knowledge import DISEASE_KNOWLEDGE
from app.schemas.disease_detection import (
    DiseaseAnalysisResponse,
    DiseasePrediction,
)
from app.services.disease_detection_config import (
    DISEASE_MIN_CONFIDENCE,
    SUPPORTED_CROPS,
)


def normalize_crop(crop: str) -> str:
    key = crop.strip().lower()

    if key not in SUPPORTED_CROPS:
        raise ValueError(f"Unsupported crop: {crop}")

    return SUPPORTED_CROPS[key]


def parse_model_label(label: str) -> tuple[str, str]:
    try:
        crop, condition = label.split("__", 1)
    except ValueError as exc:
        raise ValueError(f"Invalid model label: {label}") from exc

    return crop, condition


def display_condition(condition: str) -> str:
    return condition.replace("_", " ").strip().title()


class DiseaseDecisionService:

    def analyze(
        self,
        model_result: Dict[str, Any],
        selected_crop: str,
    ) -> DiseaseAnalysisResponse:

        selected_crop = normalize_crop(selected_crop)

        top_predictions = model_result.get("top_predictions", [])

        if not top_predictions:
            raise ValueError("Disease model returned no predictions.")

        best = top_predictions[0]

        predicted_label = best["label"]
        confidence = float(best["confidence"])

        predicted_crop, condition = parse_model_label(predicted_label)

        predictions = [
            DiseasePrediction(
                label=item["label"],
                confidence=float(item["confidence"]),
                class_index=int(item["class_index"]),
            )
            for item in top_predictions
        ]

        # ---------------------------------------------------------
        # 1. LOW CONFIDENCE
        # ---------------------------------------------------------

        if confidence < DISEASE_MIN_CONFIDENCE:
            return DiseaseAnalysisResponse(
                status="uncertain",
                crop=selected_crop,
                predicted_crop=predicted_crop,
                predicted_disease=None,
                confidence=confidence,
                message=(
                    "We could not confidently identify the condition from "
                    "this image. Please take a clearer close-up photograph "
                    "of the affected leaf and make sure the correct crop "
                    "is selected."
                ),
                top_predictions=predictions,
                model_name="MobileNetV3-Large",
                model_version="kisanai-final",
            )

        # ---------------------------------------------------------
        # 2. CROP MISMATCH
        # ---------------------------------------------------------

        if predicted_crop.lower() != selected_crop.lower():
            return DiseaseAnalysisResponse(
                status="crop_mismatch",
                crop=selected_crop,
                predicted_crop=predicted_crop,
                predicted_disease=None,
                confidence=confidence,
                message=(
                    f"The selected crop is {selected_crop}, but the image "
                    f"appears more consistent with {predicted_crop}. "
                    "Please verify the crop selection and upload a clear "
                    "image of the affected leaf."
                ),
                top_predictions=predictions,
                model_name="MobileNetV3-Large",
                model_version="kisanai-final",
            )

        # ---------------------------------------------------------
        # 3. HEALTHY
        # ---------------------------------------------------------

        if condition.lower() == "healthy":
            return DiseaseAnalysisResponse(
                status="healthy",
                crop=selected_crop,
                predicted_crop=predicted_crop,
                predicted_disease=None,
                confidence=confidence,
                message=(
                    f"The {selected_crop} leaf appears healthy based on "
                    "the uploaded image."
                ),
                description=(
                    "No supported disease class was predicted with "
                    "sufficient confidence."
                ),
                recommended_actions=[
                    "Continue monitoring the crop regularly.",
                    (
                        "If you have noticed symptoms elsewhere on the "
                        "plant, upload a clear close-up image of the "
                        "affected area."
                    ),
                ],
                top_predictions=predictions,
                model_name="MobileNetV3-Large",
                model_version="kisanai-final",
            )

        # ---------------------------------------------------------
        # 4. DISEASE KNOWLEDGE
        # ---------------------------------------------------------

        knowledge = DISEASE_KNOWLEDGE.get(predicted_label)

        # Safe fallback if model class exists but knowledge is missing.
        if knowledge is None:
            return DiseaseAnalysisResponse(
                status="detected",
                crop=selected_crop,
                predicted_crop=predicted_crop,
                predicted_disease=display_condition(condition),
                confidence=confidence,
                message=(
                    f"{display_condition(condition)} was detected in the "
                    f"{selected_crop} image."
                ),
                description=(
                    "The model identified a supported disease class, but "
                    "additional disease information is not yet configured."
                ),
                top_predictions=predictions,
                model_name="MobileNetV3-Large",
                model_version="kisanai-final",
            )

        # ---------------------------------------------------------
        # 5. DISEASE DETECTED + SOURCE-BACKED KNOWLEDGE
        # ---------------------------------------------------------

        return DiseaseAnalysisResponse(
            status="detected",
            crop=selected_crop,
            predicted_crop=predicted_crop,
            predicted_disease=str(knowledge["disease_name"]),
            confidence=confidence,

            message=(
                f"{knowledge['disease_name']} was detected in the "
                f"{selected_crop} image."
            ),

            description=str(
                knowledge.get("description", "")
            ),

            symptoms=list(
                knowledge.get("symptoms", [])
            ),

            causes=list(
                knowledge.get("causes", [])
            ),

            favourable_conditions=list(
                knowledge.get("favourable_conditions", [])
            ),

            prevention=list(
                knowledge.get("prevention", [])
            ),

            recommended_actions=list(
                knowledge.get("recommended_actions", [])
            ),

            source=knowledge.get("source"),

            top_predictions=predictions,

            model_name="MobileNetV3-Large",
            model_version="kisanai-final",
        )


disease_decision_service = DiseaseDecisionService()