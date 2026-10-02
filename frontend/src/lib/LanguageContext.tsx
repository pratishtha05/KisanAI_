"use client";
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, Globe, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const translations: Record<string, Record<string, string>> = {
  en: {
    "auth.mobile.title": "📱 Enter your mobile number",
    "auth.mobile.subtitle": "We will send you a one-time verification code.",
    "auth.mobile.send": "Send OTP",
    "auth.mobile.sending": "Sending...",
    "auth.mobile.error_length": "Please enter a valid 10-digit number",
    "auth.mobile.error_failed": "Failed to send OTP. Please try again.",

    "auth.otp.title": "🔒 Enter Verification Code",
    "auth.otp.subtitle": "Enter the 6-digit code sent to",
    "auth.otp.verify": "Verify & Login",
    "auth.otp.verifying": "Verifying...",
    "auth.otp.error_length": "Please enter a 6-digit OTP",
    "auth.otp.error_invalid": "Invalid OTP. Please try again.",

    "onboarding.title": "Welcome! Let's get to know your farm.",
    "onboarding.step1.q": "What should we call you?",
    "onboarding.step1.placeholder": "Your name",
    
    "onboarding.step2.q": "What are you growing? (Select all that apply)",
    "onboarding.step2.apple": "Apple",
    "onboarding.step2.cornmaize": "Corn/Maize",
    "onboarding.step2.potato": "Potato",
    "onboarding.step2.rice": "Rice",
    "onboarding.step2.sugarcane": "Sugarcane",
    "onboarding.step2.tea": "Tea",
    "onboarding.step2.cassava": "Cassava",
    "onboarding.step2.tomato": "Tomato",
    "onboarding.step2.wheat": "Wheat",
    
    "onboarding.step2b.q": "Tell us about your selected crops",
    "onboarding.step2b.stage_title": "Current Stage",
    "onboarding.step2b.stage_sown": "Just Sown",
    "onboarding.step2b.stage_veg": "Growing",
    "onboarding.step2b.stage_flower": "Flowering",
    "onboarding.step2b.stage_harvest": "Harvesting",
    "onboarding.step2b.cycle_title": "Expected Cycle",
    "onboarding.step2b.cycle_short": "Short (~3 mo)",
    "onboarding.step2b.cycle_med": "Medium (~4 mo)",
    "onboarding.step2b.cycle_long": "Long (5+ mo)",

    "onboarding.step3.q": "Where is your farm?",
    "onboarding.step3.state": "State",
    "onboarding.step3.district": "District",
    
    "onboarding.step4.choice.gps": "Use My Current Location",
    "onboarding.step4.choice.gps_desc": "Automatically detect location",
    "onboarding.step4.choice.manual": "Enter Location Manually",
    "onboarding.step4.choice.manual_desc": "Select your state, district and village",
    "onboarding.step4.gps.loading": "Finding your location...",
    "onboarding.step4.gps.error": "Couldn't access your location.",
    "onboarding.step4.gps.error_desc": "Please allow location access or enter your location manually.",
    "onboarding.step4.gps.try_again": "Try Again",
    "onboarding.step4.gps.success": "Location Found",
    "onboarding.step4.change": "Change Location Method",
    "onboarding.step4.select_state": "Select State",
    "onboarding.step4.select_district": "Select District",
    "onboarding.step4.manual.village": "Village / Town",
    "onboarding.step4.select_village": "Select Village",
    
    "onboarding.step4.q": "How much land do you farm?",
    "onboarding.step4.acres": "acres",
    
    "onboarding.step5.q": "What type of soil do you have?",
    "onboarding.step5.loamy": "Loamy",
    "onboarding.step5.sandy": "Sandy",
    "onboarding.step5.clay": "Clay",
    "onboarding.step5.black": "Black Soil",
    
    "onboarding.btn.continue": "Continue",
    "onboarding.btn.finish": "Finish",
    "onboarding.error_saving": "Error saving farm data.",
    "lang.switch": "Change Language",
  },
  hi: {
    "auth.mobile.title": "📱 अपना मोबाइल नंबर दर्ज करें",
    "auth.mobile.subtitle": "हम आपको एक वन-टाइम सत्यापन कोड भेजेंगे।",
    "auth.mobile.send": "OTP भेजें",
    "auth.mobile.sending": "भेजा जा रहा है...",
    "auth.mobile.error_length": "कृपया एक वैध 10-अंकीय नंबर दर्ज करें",
    "auth.mobile.error_failed": "OTP भेजने में विफल। कृपया पुनः प्रयास करें।",

    "auth.otp.title": "🔒 सत्यापन कोड दर्ज करें",
    "auth.otp.subtitle": "पर भेजे गए 6-अंकीय कोड को दर्ज करें",
    "auth.otp.verify": "सत्यापित करें और लॉगिन करें",
    "auth.otp.verifying": "सत्यापित किया जा रहा है...",
    "auth.otp.error_length": "कृपया 6-अंकीय OTP दर्ज करें",
    "auth.otp.error_invalid": "अमान्य OTP। कृपया पुनः प्रयास करें।",

    "onboarding.title": "स्वागत है! आइए आपके खेत को जानें।",
    "onboarding.step1.q": "हम आपको क्या कह कर बुलाएँ?",
    "onboarding.step1.placeholder": "आपका नाम",
    
    "onboarding.step2.q": "आप क्या उगा रहे हैं? (सभी लागू चुनें)",
    "onboarding.step2.apple": "सेब",
    "onboarding.step2.cornmaize": "मक्का",
    "onboarding.step2.potato": "आलू",
    "onboarding.step2.rice": "चावल",
    "onboarding.step2.sugarcane": "गन्ना",
    "onboarding.step2.tea": "चाय",
    "onboarding.step2.cassava": "कसावा",
    "onboarding.step2.tomato": "टमाटर",
    "onboarding.step2.wheat": "गेहूँ",
    
    "onboarding.step2b.q": "अपनी फसलों के बारे में बताएं",
    "onboarding.step2b.stage_title": "वर्तमान चरण",
    "onboarding.step2b.stage_sown": "अभी बोया है",
    "onboarding.step2b.stage_veg": "बढ़ रहा है",
    "onboarding.step2b.stage_flower": "फूल आ रहे हैं",
    "onboarding.step2b.stage_harvest": "कटाई",
    "onboarding.step2b.cycle_title": "अपेक्षित चक्र",
    "onboarding.step2b.cycle_short": "छोटा (~3 माह)",
    "onboarding.step2b.cycle_med": "मध्यम (~4 माह)",
    "onboarding.step2b.cycle_long": "लंबा (5+ माह)",

    "onboarding.step3.q": "आपका खेत कहाँ है?",
    "onboarding.step3.state": "राज्य",
    "onboarding.step3.district": "ज़िला",
    
    "onboarding.step4.choice.gps": "मेरे वर्तमान स्थान का उपयोग करें",
    "onboarding.step4.choice.gps_desc": "स्वचालित रूप से स्थान का पता लगाएं",
    "onboarding.step4.choice.manual": "स्थान मैन्युअल रूप से दर्ज करें",
    "onboarding.step4.choice.manual_desc": "अपना राज्य, ज़िला और गाँव चुनें",
    "onboarding.step4.gps.loading": "आपका स्थान खोजा जा रहा है...",
    "onboarding.step4.gps.error": "आपके स्थान तक नहीं पहुंच सके।",
    "onboarding.step4.gps.error_desc": "कृपया स्थान पहुंच की अनुमति दें या अपना स्थान मैन्युअल रूप से दर्ज करें।",
    "onboarding.step4.gps.try_again": "पुनः प्रयास करें",
    "onboarding.step4.gps.success": "स्थान मिल गया",
    "onboarding.step4.change": "स्थान की विधि बदलें",
    "onboarding.step4.select_state": "राज्य चुनें",
    "onboarding.step4.select_district": "ज़िला चुनें",
    "onboarding.step4.manual.village": "गाँव / शहर",
    "onboarding.step4.select_village": "गाँव चुनें",
    
    "onboarding.step4.q": "आप कितने क्षेत्र में खेती करते हैं?",
    "onboarding.step4.acres": "एकड़",
    
    "onboarding.step5.q": "आपके पास किस प्रकार की मिट्टी है?",
    "onboarding.step5.loamy": "दोमट",
    "onboarding.step5.sandy": "बलुई",
    "onboarding.step5.clay": "चिकनी",
    "onboarding.step5.black": "काली मिट्टी",
    
    "onboarding.btn.continue": "आगे बढ़ें",
    "onboarding.btn.finish": "समाप्त करें",
    "onboarding.error_saving": "खेत का डेटा सहेजने में त्रुटि।",
    "lang.switch": "भाषा बदलें",
  },
  pa: {
    "auth.mobile.title": "📱 ਆਪਣਾ ਮੋਬਾਈਲ ਨੰਬਰ ਦਰਜ ਕਰੋ",
    "auth.mobile.subtitle": "ਅਸੀਂ ਤੁਹਾਨੂੰ ਇੱਕ ਵਨ-ਟਾਈਮ ਵੈਰੀਫਿਕੇਸ਼ਨ ਕੋਡ ਭੇਜਾਂਗੇ।",
    "auth.mobile.send": "OTP ਭੇਜੋ",
    "auth.mobile.sending": "ਭੇਜ ਰਿਹਾ ਹੈ...",
    "auth.mobile.error_length": "ਕਿਰਪਾ ਕਰਕੇ ਇੱਕ ਵੈਧ 10-ਅੰਕਾਂ ਵਾਲਾ ਨੰਬਰ ਦਰਜ ਕਰੋ",
    "auth.mobile.error_failed": "OTP ਭੇਜਣ ਵਿੱਚ ਅਸਫਲ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।",

    "auth.otp.title": "🔒 ਵੈਰੀਫਿਕੇਸ਼ਨ ਕੋਡ ਦਰਜ ਕਰੋ",
    "auth.otp.subtitle": "ਤੇ ਭੇਜਿਆ 6-ਅੰਕਾਂ ਵਾਲਾ ਕੋਡ ਦਰਜ ਕਰੋ",
    "auth.otp.verify": "ਪੁਸ਼ਟੀ ਕਰੋ ਅਤੇ ਲਾਗਇਨ ਕਰੋ",
    "auth.otp.verifying": "ਪੁਸ਼ਟੀ ਕੀਤੀ ਜਾ ਰਹੀ ਹੈ...",
    "auth.otp.error_length": "ਕਿਰਪਾ ਕਰਕੇ 6-ਅੰਕਾਂ ਵਾਲਾ OTP ਦਰਜ ਕਰੋ",
    "auth.otp.error_invalid": "ਅਵੈਧ OTP। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।",

    "onboarding.title": "ਜੀ ਆਇਆਂ ਨੂੰ! ਆਓ ਤੁਹਾਡੇ ਖੇਤ ਬਾਰੇ ਜਾਣੀਏ।",
    "onboarding.step1.q": "ਅਸੀਂ ਤੁਹਾਨੂੰ ਕੀ ਕਹਿ ਕੇ ਬੁਲਾਈਏ?",
    "onboarding.step1.placeholder": "ਤੁਹਾਡਾ ਨਾਮ",
    
    "onboarding.step2.q": "ਤੁਸੀਂ ਕੀ ਉਗਾ ਰਹੇ ਹੋ? (ਸਾਰੇ ਲਾਗੂ ਚੁਣੋ)",
    "onboarding.step2.apple": "ਸੇਬ",
    "onboarding.step2.cornmaize": "ਮੱਕੀ",
    "onboarding.step2.potato": "ਆਲੂ",
    "onboarding.step2.rice": "ਚਾਵਲ",
    "onboarding.step2.sugarcane": "ਗੰਨਾ",
    "onboarding.step2.tea": "ਚਾਹ",
    "onboarding.step2.cassava": "ਕਸਾਵਾ",
    "onboarding.step2.tomato": "ਟਮਾਟਰ",
    "onboarding.step2.wheat": "ਕਣਕ",
    
    "onboarding.step2b.q": "ਆਪਣੀਆਂ ਫਸਲਾਂ ਬਾਰੇ ਦੱਸੋ",
    "onboarding.step2b.stage_title": "ਮੌਜੂਦਾ ਪੜਾਅ",
    "onboarding.step2b.stage_sown": "ਹੁਣੇ ਬੀਜਿਆ",
    "onboarding.step2b.stage_veg": "ਵੱਧ ਰਿਹਾ ਹੈ",
    "onboarding.step2b.stage_flower": "ਫੁੱਲ ਆ ਰਹੇ ਹਨ",
    "onboarding.step2b.stage_harvest": "ਕਟਾਈ",
    "onboarding.step2b.cycle_title": "ਉਮੀਦ ਅਨੁਸਾਰ ਚੱਕਰ",
    "onboarding.step2b.cycle_short": "ਛੋਟਾ (~3 ਮਹੀਨੇ)",
    "onboarding.step2b.cycle_med": "ਦਰਮਿਆਨਾ (~4 ਮਹੀਨੇ)",
    "onboarding.step2b.cycle_long": "ਲੰਬਾ (5+ ਮਹੀਨੇ)",

    "onboarding.step3.q": "ਤੁਹਾਡਾ ਖੇਤ ਕਿੱਥੇ ਹੈ?",
    "onboarding.step3.state": "ਰਾਜ",
    "onboarding.step3.district": "ਜ਼ਿਲ੍ਹਾ",

    "onboarding.step4.choice.gps": "ਮੇਰੇ ਮੌਜੂਦਾ ਟਿਕਾਣੇ ਦੀ ਵਰਤੋਂ ਕਰੋ",
    "onboarding.step4.choice.gps_desc": "ਆਪਣੇ ਆਪ ਟਿਕਾਣਾ ਲੱਭੋ",
    "onboarding.step4.choice.manual": "ਆਪਣੇ ਆਪ ਟਿਕਾਣਾ ਦਰਜ ਕਰੋ",
    "onboarding.step4.choice.manual_desc": "ਆਪਣਾ ਰਾਜ, ਜ਼ਿਲ੍ਹਾ ਅਤੇ ਪਿੰਡ ਚੁਣੋ",
    "onboarding.step4.gps.loading": "ਤੁਹਾਡਾ ਟਿਕਾਣਾ ਲੱਭਿਆ ਜਾ ਰਿਹਾ ਹੈ...",
    "onboarding.step4.gps.error": "ਤੁਹਾਡੇ ਟਿਕਾਣੇ ਤੱਕ ਪਹੁੰਚ ਨਹੀਂ ਹੋ ਸਕੀ।",
    "onboarding.step4.gps.error_desc": "ਕਿਰਪਾ ਕਰਕੇ ਟਿਕਾਣੇ ਦੀ ਇਜਾਜ਼ਤ ਦਿਓ ਜਾਂ ਆਪਣਾ ਟਿਕਾਣਾ ਆਪਣੇ ਆਪ ਦਰਜ ਕਰੋ।",
    "onboarding.step4.gps.try_again": "ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ",
    "onboarding.step4.gps.success": "ਟਿਕਾਣਾ ਮਿਲ ਗਿਆ",
    "onboarding.step4.change": "ਟਿਕਾਣੇ ਦਾ ਤਰੀਕਾ ਬਦਲੋ",
    "onboarding.step4.select_state": "ਰਾਜ ਚੁਣੋ",
    "onboarding.step4.select_district": "ਜ਼ਿਲ੍ਹਾ ਚੁਣੋ",
    "onboarding.step4.manual.village": "ਪਿੰਡ / ਸ਼ਹਿਰ",
    "onboarding.step4.select_village": "ਪਿੰਡ ਚੁਣੋ",
    
    "onboarding.step4.q": "ਤੁਸੀਂ ਕਿੰਨੀ ਜ਼ਮੀਨ 'ਤੇ ਖੇਤੀ ਕਰਦੇ ਹੋ?",
    "onboarding.step4.acres": "ਏਕੜ",
    
    "onboarding.step5.q": "ਤੁਹਾਡੇ ਕੋਲ ਕਿਸ ਕਿਸਮ ਦੀ ਮਿੱਟੀ ਹੈ?",
    "onboarding.step5.loamy": "ਦੋਮਟ",
    "onboarding.step5.sandy": "ਰੇਤਲੀ",
    "onboarding.step5.clay": "ਚੀਕਣੀ",
    "onboarding.step5.black": "ਕਾਲੀ ਮਿੱਟੀ",
    
    "onboarding.btn.continue": "ਜਾਰੀ ਰੱਖੋ",
    "onboarding.btn.finish": "ਖਤਮ ਕਰੋ",
    "onboarding.error_saving": "ਖੇਤ ਦਾ ਡੇਟਾ ਸੇਵ ਕਰਨ ਵਿੱਚ ਤਰੁੱਟੀ।",
    "lang.switch": "ਭਾਸ਼ਾ ਬਦਲੋ",
  }
};

const languagesList = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ" },
  { code: "mr", name: "Marathi", nativeName: "मराठी" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা" },
];

type LanguageContextType = {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string, fallback?: string) => string;
  setCustomBackAction: (action: (() => void) | null) => void;
};

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key, fallback) => fallback || key,
  setCustomBackAction: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLangState] = useState("en");
  const [mounted, setMounted] = useState(false);
  const [customBackAction, setCustomBackActionState] = useState<(() => void) | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Reset custom back action on route change
  useEffect(() => {
    setCustomBackActionState(null);
  }, [pathname]);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("language");
    if (saved) setLangState(saved);
  }, []);

  const setLanguage = (lang: string) => {
    setLangState(lang);
    localStorage.setItem("language", lang);
  };

  const setCustomBackAction = useCallback((action: (() => void) | null) => {
    setCustomBackActionState(() => action);
  }, []);

  const t = useCallback((key: string, fallback?: string) => {
    return translations[language]?.[key] || translations["en"]?.[key] || fallback || key;
  }, [language]);

  const isDashboard = pathname?.startsWith("/app");
  const isWelcome = pathname === "/" || pathname === "/welcome";
  
  // Back button on Language, Mobile, OTP, Onboarding
  const showBackButton = mounted && pathname && !isWelcome && !isDashboard;
  // Switcher on Mobile, OTP, Onboarding
  const showSwitcher = mounted && pathname && !isWelcome && !isDashboard && pathname !== "/language";

  const handleBackClick = () => {
    if (customBackAction) {
      customBackAction();
    } else {
      router.back();
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, setCustomBackAction }}>
      
      {/* Top Navigation Overlay */}
      {(showBackButton || showSwitcher) && (
        <div className="absolute top-4 left-0 w-full px-4 md:px-8 z-50 flex justify-between items-start pointer-events-none">
          
          {/* Back Button */}
          <div className="pointer-events-auto">
            {showBackButton && (
              <button 
                onClick={handleBackClick}
                className="flex items-center justify-center w-10 h-10 bg-white/90 backdrop-blur-md border border-gray-200 text-gray-700 rounded-full shadow-sm hover:bg-white hover:scale-105 hover:shadow transition-all"
                aria-label="Go Back"
              >
                <ChevronLeft size={24} strokeWidth={2.5} className="ml-[-2px]" />
              </button>
            )}
          </div>

          {/* Language Switcher */}
          <div className="pointer-events-auto">
            {showSwitcher && (
              <LanguageSwitcherDropdown language={language} setLanguage={setLanguage} />
            )}
          </div>

        </div>
      )}

      {children}
    </LanguageContext.Provider>
  );
}

function LanguageSwitcherDropdown({ language, setLanguage }: { language: string, setLanguage: (l: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLang = languagesList.find(l => l.code === language) || languagesList[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white/90 backdrop-blur-md border border-gray-200 text-gray-800 px-4 py-2 rounded-full shadow-sm hover:bg-white hover:shadow transition-all h-10"
      >
        <Globe size={18} className="text-green-600" />
        <span className="font-semibold text-sm">{currentLang.nativeName}</span>
        <ChevronDown size={16} className={`text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-12 mt-1 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
          >
            <div className="max-h-60 overflow-y-auto py-2 flex flex-col scrollbar-thin scrollbar-thumb-gray-200">
              {languagesList.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code);
                    setIsOpen(false);
                  }}
                  className={`px-4 py-3 text-left text-sm font-medium transition-colors ${
                    language === lang.code ? "bg-green-50 text-green-700" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {lang.nativeName} {lang.code !== "en" && <span className="text-gray-400 text-xs ml-1">({lang.name})</span>}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const useLanguage = () => useContext(LanguageContext);
