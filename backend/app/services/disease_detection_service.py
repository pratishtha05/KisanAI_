from app.schemas.disease_detection import DiseaseAnalysisResponse
from app.services.disease_decision_service import disease_decision_service
from app.services.disease_model_service import DiseaseModelError, disease_model_service
from app.services.image_validation_service import (
    ImageValidationError,
    image_validation_service,
)


class DiseaseDetectionService:
    def analyze_image(
        self,
        file_bytes: bytes,
        selected_crop: str,
    ) -> DiseaseAnalysisResponse:
        try:
            # Validate the image before the closed-set disease classifier.
            # This prevents unrelated documents/diagrams from being forced
            # into one of the 43 disease classes.
            image_validation_service.validate(file_bytes)
        except ImageValidationError as exc:
            return DiseaseAnalysisResponse(
                status="uncertain",
                crop=selected_crop.strip(),
                predicted_crop=None,
                predicted_disease=None,
                confidence=0.0,
                message=str(exc),
                model_name="MobileNetV3-Large",
                model_version="kisanai-final",
            )

        try:
            model_result = disease_model_service.predict(file_bytes)
        except DiseaseModelError:
            raise
        except Exception as exc:
            raise DiseaseModelError(
                "Disease model inference failed."
            ) from exc

        return disease_decision_service.analyze(
            model_result=model_result,
            selected_crop=selected_crop,
        )


disease_detection_service = DiseaseDetectionService()
