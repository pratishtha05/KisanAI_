from app.schemas.farm_advisor import FarmAdvisorQueryRequest, FarmAdvisorResponse

class FarmAdvisorService:
    def get_advice(self, request: FarmAdvisorQueryRequest) -> FarmAdvisorResponse:
        raise NotImplementedError

class MockFarmAdvisorService(FarmAdvisorService):
    def get_advice(self, request: FarmAdvisorQueryRequest) -> FarmAdvisorResponse:
        q_lower = request.query.lower()
        
        if "irrigate" in q_lower:
            return FarmAdvisorResponse(
                recommendation="Wait until tomorrow before irrigating.",
                reason="Rain is expected within the next 24 hours and your current crop stage does not require immediate irrigation.",
                actions=["Skip irrigation today.", "Check the field tomorrow morning.", "Irrigate only if rainfall does not occur."],
                watch_out="Heavy rain can cause waterlogging in low-lying areas.",
                confidence=0.92
            )
        elif "fertilize" in q_lower:
            return FarmAdvisorResponse(
                recommendation="Apply Nitrogen based fertilizer.",
                reason="Your crop is in the vegetative stage where nitrogen demand is high.",
                actions=["Purchase urea or suitable NPK.", "Apply during evening hours."],
                watch_out="Do not apply right before heavy rain to avoid runoff.",
                confidence=0.88
            )
        else:
            return FarmAdvisorResponse(
                recommendation="Keep monitoring your crop.",
                reason="Regular checking helps catch issues early.",
                actions=["Walk through the field daily.", "Check for unusual leaf colors."],
                watch_out="Sudden weather changes.",
                confidence=0.85
            )

farm_advisor_service = MockFarmAdvisorService()
