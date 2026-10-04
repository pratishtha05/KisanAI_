"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/lib/LanguageContext";
import Script from "next/script";
import { useEffect } from "react";

export default function MobileAuth() {
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { t } = useLanguage();


  useEffect(() => {
    const checkAndInit = setInterval(() => {
      // @ts-ignore
      if (typeof window.initSendOTP === "function" && typeof window.sendOtp === "undefined") {
        // @ts-ignore
        window.initSendOTP(window.configuration);
      }
      // @ts-ignore
      if (typeof window.sendOtp === "function") {
        clearInterval(checkAndInit);
      }
    }, 500);
    return () => clearInterval(checkAndInit);
  }, []);

  const handleSendOTP = async () => {
    if (mobile.length !== 10) return alert(t("auth.mobile.error_length"));
    setLoading(true);

    try {
      const fullMobile = "91" + mobile; // Assuming India country code
      // @ts-ignore
      window.sendOtp(
        fullMobile,
        (data: any) => {
          console.log("MSG91 OTP Sent", data);
          localStorage.setItem("auth_mobile", mobile);
          localStorage.setItem("auth_mobile_full", fullMobile);
          router.push("/auth/otp");
        },
                (error: any) => {
          console.error("MSG91 Error", error);
          alert("MSG91 API Error: " + (error?.message || JSON.stringify(error) || "Unknown error"));
          setLoading(false);
        }
      );
        } catch (err: any) {
      console.error(err);
      alert("Script Error: " + (err?.message || "window.sendOtp is not available. Please wait for page to load."));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-white px-6 py-12 relative">
      <div className="w-full max-w-sm mx-auto">
      <Script id="msg91-config" strategy="afterInteractive">
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
          if (window.initSendOTP && typeof window.sendOtp === "undefined") {
            // @ts-ignore
            window.initSendOTP(window.configuration);
          }
        }}
      />

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
