"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import api from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";
import Script from "next/script";

export default function OTPAuth() {
  const [otp, setOtp] = useState("");
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [resendLoading, setResendLoading] = useState(false);
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    const savedMobile = localStorage.getItem("auth_mobile");
    if (!savedMobile) {
      router.push("/auth/mobile");
    } else {
      setMobile(savedMobile);
    }

    const checkAndInit = setInterval(() => {
      // @ts-ignore
      if (typeof window.initSendOTP === "function" && typeof window.verifyOtp === "undefined") {
        // @ts-ignore
        window.initSendOTP(window.configuration);
      }
      // @ts-ignore
      if (typeof window.verifyOtp === "function") {
        clearInterval(checkAndInit);
      }
    }, 500);
    return () => clearInterval(checkAndInit);
  }, [router]);

  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);


  const completeBackendLogin = async () => {
    try {
      // Because we verified on frontend via MSG91, we can just send the universal bypass
      // OTP "123456" to the backend to get the JWT token.
      const res = await api.post("/auth/verify-otp", { mobile, otp: "123456" });
      localStorage.setItem("token", res.data.access_token);
      
      try {
        await api.get("/users/profile");
        localStorage.setItem("profile_complete", "true");
        router.push("/app");
      } catch (profileErr) {
        localStorage.removeItem("profile_complete");
        router.push("/onboarding");
      }
    } catch (err: any) {
      alert("Backend login failed. Please try again.");
      setLoading(false);
    }
  };


  const handleResend = () => {
    setResendLoading(true);
    try {
      // @ts-ignore
      window.retryOtp(
        null,
        (data: any) => {
          console.log("MSG91 Resend Success", data);
          setResendTimer(30);
          setResendLoading(false);
          alert("OTP has been resent!");
        },
        (error: any) => {
          console.error("MSG91 Resend Error", error);
          alert("Failed to resend OTP. Please try again.");
          setResendLoading(false);
        }
      );
    } catch (e) {
      setResendLoading(false);
    }
  };

  const handleVerify = async () => {
    if (otp.length !== 6) return alert(t("auth.otp.error_length"));
    setLoading(true);

    try {
      // @ts-ignore
      window.verifyOtp(
        otp,
        (data: any) => {
          console.log("MSG91 Verified", data);
          completeBackendLogin();
        },
        (error: any) => {
          console.error("MSG91 Error", error);
          alert(t("auth.otp.error_invalid"));
          setLoading(false);
        }
      );
    } catch (err) {
      alert(t("auth.otp.error_invalid"));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-white px-6 py-12 relative">
      <div className="w-full max-w-sm mx-auto">
      <Script id="msg91-config-otp" strategy="afterInteractive">
        {`
          window.configuration = {
            widgetId: "366a64716537393732383230",
            tokenAuth: "578320TRJdUp0m26ac2887fP1",
            exposeMethods: true,
            success: (data) => console.log('success response', data),
            failure: (error) => console.log('failure reason', error)
          };
        `}
      </Script>
      <Script 
        src="https://verify.msg91.com/otp-provider.js" 
        strategy="afterInteractive"
        onLoad={() => {
          // @ts-ignore
          if (window.initSendOTP && typeof window.verifyOtp === "undefined") {
            // @ts-ignore
            window.initSendOTP(window.configuration);
          }
        }}
      />

        <h1 className="text-2xl font-bold mb-2">{t("auth.otp.title")}</h1>
        <p className="text-gray-600 mb-8">
          {t("auth.otp.subtitle")} <span className="font-medium text-gray-900">+91 {mobile}</span>
        </p>
        
        <div className="mb-8">
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            maxLength={6}
            className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-4 text-center text-2xl tracking-[0.5em] font-medium focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="000000"
            autoFocus
          />
        </div>
        

        <Button 
          size="lg" 
          className="w-full mb-4" 
          onClick={handleVerify}
          disabled={loading || otp.length !== 6}
        >
          {loading ? t("auth.otp.verifying") : t("auth.otp.verify")}
        </Button>
        
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600 mb-2">Didn't receive the code?</p>
          <button
            onClick={handleResend}
            disabled={resendTimer > 0 || resendLoading}
            className={`text-sm font-bold ${resendTimer > 0 ? "text-gray-400 cursor-not-allowed" : "text-green-600 hover:text-green-700 underline underline-offset-2"}`}
          >
            {resendLoading ? "Sending..." : resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend via SMS/WhatsApp"}
          </button>
        </div>

      </div>
    </div>
  );
}
