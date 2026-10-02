from app.core.config import settings
import random

class OTPService:
    def send_otp(self, mobile: str) -> str:
        raise NotImplementedError
    
    def verify_otp(self, mobile: str, otp: str) -> bool:
        raise NotImplementedError

class MockOTPService(OTPService):
    def __init__(self):
        self.otps = {}

    def send_otp(self, mobile: str) -> str:
        # Mocking OTP generation, always return 123456 for demo
        otp = "123456"
        self.otps[mobile] = otp
        return otp
        
    def verify_otp(self, mobile: str, otp: str) -> bool:
        # In mock mode, 123456 is always valid
        if otp == "123456":
            return True
        return self.otps.get(mobile) == otp

# Depending on config, select the OTP service
otp_service = MockOTPService()
