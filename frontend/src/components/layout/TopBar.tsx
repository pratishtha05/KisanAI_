"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Globe, User } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

export function TopBar() {
  const { setLanguage, language } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const languages = [
    { code: "en", label: "English" },
    { code: "hi", label: "हिन्दी" },
    { code: "pa", label: "ਪੰਜਾਬੀ" },
    { code: "mr", label: "मराठी" },
    { code: "gu", label: "ગુજરાતી" },
    { code: "bn", label: "বাংলা" },
    { code: "te", label: "తెలుగు" },
    { code: "ta", label: "தமிழ்" },
    { code: "kn", label: "ಕನ್ನಡ" },
    { code: "ml", label: "മലയാളം" }
  ];

  return (
    <div className="sticky top-0 z-40 bg-gray-50/80 backdrop-blur-md px-6 py-2 flex justify-end items-center gap-4">
      {/* Language Switcher */}
      <div className="relative" ref={dropdownRef}>
        <button 
          onClick={() => setLangOpen(!langOpen)}
          className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-200 transition-colors text-gray-700 bg-white shadow-sm border border-gray-100"
        >
          <Globe size={20} className="text-gray-500" />
          <span className="text-sm font-medium uppercase hidden sm:block mr-1">{language}</span>
        </button>

        {langOpen && (
          <div className="absolute right-0 mt-2 w-32 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
            {languages.map(lang => (
              <button
                key={lang.code}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${language === lang.code ? "bg-green-50 text-green-700 font-bold" : "text-gray-700 hover:bg-gray-50"}`}
                onClick={() => {
                  setLanguage(lang.code);
                  setLangOpen(false);
                }}
              >
                {lang.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Profile Icon */}
      <Link href="/app/profile">
        <button className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center hover:bg-green-200 transition-colors shadow-sm border border-green-200">
          <User size={20} />
        </button>
      </Link>
    </div>
  );
}
