import random
from app.schemas.disease_detection import DiseaseAnalysisResponse

class DiseaseDetectionService:
    def analyze_image(self, file_bytes: bytes) -> DiseaseAnalysisResponse:
        raise NotImplementedError

class MockDiseaseDetectionService(DiseaseDetectionService):
    def analyze_image(self, file_bytes: bytes) -> DiseaseAnalysisResponse:
        # Mock logic
        return DiseaseAnalysisResponse(
            possible_issue="Leaf Blight",
            confidence=0.91,
            severity="Moderate",
            what_we_found="Some visible signs are consistent with leaf blight. The brownish spots on the leaves indicate fungal activity.",
            what_you_can_do=[
                "Remove heavily infected leaves if possible.",
                "Avoid overhead irrigation to reduce leaf wetness.",
                "Apply a suitable fungicide as recommended by a local expert."
            ]
        )

disease_detection_service = MockDiseaseDetectionService()
