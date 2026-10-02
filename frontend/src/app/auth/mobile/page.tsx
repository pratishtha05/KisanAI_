"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import api from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";

export default function MobileAuth() {
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { t } = useLanguage();

  const handleSendOTP = async () => {
    if (mobile.length !== 10) return alert(t("auth.mobile.error_length"));
    setLoading(true);
    try {
      await api.post("/auth/send-otp", { mobile });
      localStorage.setItem("auth_mobile", mobile);
      router.push("/auth/otp");
    } catch (err) {
      alert(t("auth.mobile.error_failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-white px-6 py-12 relative">
      <div className="w-full max-w-sm mx-auto">
        <h1 className="text-2xl font-bold mb-2">{t("auth.mobile.title")}</h1>
        <p className="text-gray-600 mb-8">{t("auth.mobile.subtitle")}</p>
        
        <div className="flex gap-2 mb-8">
          <div className="bg-gray-100 rounded-xl px-4 py-4 font-medium text-gray-700 flex items-center">
            +91
          </div>
          <input
            type="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
            maxLength={10}
            className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="98765 43210"
            autoFocus
          />
        </div>
        
        <Button 
          size="lg" 
          className="w-full" 
          onClick={handleSendOTP}
          disabled={loading || mobile.length !== 10}
        >
          {loading ? t("auth.mobile.sending") : t("auth.mobile.send")}
        </Button>
      </div>
    </div>
  );
}
