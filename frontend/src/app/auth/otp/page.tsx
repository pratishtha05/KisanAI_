"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import api from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";

export default function OTPAuth() {
  const [otp, setOtp] = useState("");
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    const savedMobile = localStorage.getItem("auth_mobile");
    if (!savedMobile) {
      router.push("/auth/mobile");
    } else {
      setMobile(savedMobile);
    }
  }, [router]);

  const handleVerify = async () => {
    if (otp.length !== 6) return alert(t("auth.otp.error_length"));
    setLoading(true);
    try {
      const res = await api.post("/auth/verify-otp", { mobile, otp });
      localStorage.setItem("token", res.data.access_token);
      
      try {
        await api.get("/users/profile");
        // Profile exists -> directly to dashboard
        router.push("/app");
      } catch (profileErr) {
        // No profile -> must complete onboarding
        router.push("/onboarding");
      }
    } catch (err: any) {
      alert(t("auth.otp.error_invalid"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-white px-6 py-12 relative">
      <div className="w-full max-w-sm mx-auto">
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
            placeholder="••••••"
            autoFocus
          />
        </div>
        
        <Button 
          size="lg" 
          className="w-full" 
          onClick={handleVerify}
          disabled={loading || otp.length !== 6}
        >
          {loading ? t("auth.otp.verifying") : t("auth.otp.verify")}
        </Button>
      </div>
    </div>
  );
}
