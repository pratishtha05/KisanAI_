"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { motion, AnimatePresence } from "framer-motion";

const languages = [
  // Main languages (shown by default)
  { code: "en", name: "English", nativeName: "English", isMain: true },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", isMain: true },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", isMain: true },
  { code: "mr", name: "Marathi", nativeName: "मराठी", isMain: true },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી", isMain: true },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", isMain: true },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", isMain: true },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", isMain: true },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", isMain: true },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം", isMain: true },

  // Additional languages (searchable only)
  { code: "as", name: "Assamese", nativeName: "অসমীয়া", isMain: false },
  { code: "or", name: "Odia", nativeName: "ଓଡ଼ିଆ", isMain: false },
  { code: "ur", name: "Urdu", nativeName: "اردو", isMain: false },
  { code: "ks", name: "Kashmiri", nativeName: "कॉशुर / کأشُر", isMain: false },
  { code: "sd", name: "Sindhi", nativeName: "سنڌي", isMain: false },
  { code: "kok", name: "Konkani", nativeName: "कोंकणी", isMain: false },
  { code: "mai", name: "Maithili", nativeName: "मैथिली", isMain: false },
  { code: "sa", name: "Sanskrit", nativeName: "संस्कृतम्", isMain: false },
  { code: "ne", name: "Nepali", nativeName: "नेपाली", isMain: false },
  { code: "brx", name: "Bodo", nativeName: "बर'", isMain: false },
  { code: "sat", name: "Santali", nativeName: "ᱥᱟᱱᱛᱟᱲᱤ", isMain: false },
  { code: "doi", name: "Dogri", nativeName: "डोगरी", isMain: false },
  { code: "mni", name: "Manipuri", nativeName: "মৈতৈলোন্", isMain: false },
  { code: "bho", name: "Bhojpuri", nativeName: "भोजपुरी", isMain: false },
  { code: "awa", name: "Awadhi", nativeName: "अवधी", isMain: false },
  { code: "mag", name: "Magahi", nativeName: "मगही", isMain: false },
  { code: "hne", name: "Chhattisgarhi", nativeName: "छत्तीसगढ़ी", isMain: false },
  { code: "bgc", name: "Haryanvi", nativeName: "हरियाणवी", isMain: false },
  { code: "mwr", name: "Marwari", nativeName: "मारवाड़ी", isMain: false },
];

const languageWords = [
  "Language",
  "भाषा",
  "ਭਾਸ਼ਾ",
  "ભાષા",
  "ভাষা",
  "భాష",
  "மொழி",
  "ಭಾಷೆ",
  "ഭാഷ"
];

export default function LanguageSelection() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % languageWords.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const selectLanguage = (lang: string) => {
    localStorage.setItem("language", lang);
    router.push("/auth/mobile");
  };

  const filteredLanguages = languages.filter((lang) => {
    if (!searchQuery.trim()) {
      return lang.isMain;
    }
    return (
      lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gray-50 px-4 pt-16 md:pt-24 pb-12">
      <div className="w-full max-w-3xl">
        
        {/* Inline Heading */}
        <h1 className="text-2xl md:text-3xl font-bold mb-8 text-center flex flex-row items-center justify-center gap-2">
          <span>🗣️ Choose your</span>
          <div className="h-10 overflow-hidden relative w-32 md:w-40 flex items-center text-green-600">
            <AnimatePresence>
              <motion.span
                key={wordIndex}
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -30, opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="absolute left-0 font-extrabold text-2xl md:text-3xl"
              >
                {languageWords[wordIndex]}
              </motion.span>
            </AnimatePresence>
          </div>
        </h1>

        {/* Simplified Search Bar */}
        <div className="mb-8 max-w-sm mx-auto">
          <input 
            type="text"
            placeholder="Search for any language..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-5 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all shadow-sm text-gray-700 bg-white text-center"
          />
        </div>
        
        {/* Grid layout */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-8">
          {filteredLanguages.length > 0 ? (
            filteredLanguages.map((lang) => (
              <Card 
                key={lang.code}
                className="p-5 md:p-6 cursor-pointer hover:border-green-500 hover:shadow-md transition-all text-center flex flex-col items-center justify-center group border border-gray-100 h-full bg-white"
                onClick={() => selectLanguage(lang.code)}
              >
                <span className="text-xl font-bold text-gray-900 group-hover:text-green-700 transition-colors block">
                  {lang.nativeName}
                </span>
                {lang.code !== "en" && (
                  <span className="text-gray-500 text-sm mt-1 font-medium block">
                    {lang.name}
                  </span>
                )}
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center text-gray-500 py-12 bg-white rounded-2xl border border-gray-100 border-dashed">
              No languages found matching "{searchQuery}"
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
