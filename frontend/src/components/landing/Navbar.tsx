"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Leaf, Menu, X, ChevronRight } from "lucide-react";
import { Noto_Serif } from "next/font/google";

const serif = Noto_Serif({ subsets: ["latin"], weight: ["400", "700"] });

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  



  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Home", href: "#" },
    { name: "How It Works", href: "#how-it-works" },
    { name: "Features", href: "#features" },
  ];

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-white/90 backdrop-blur-md shadow-sm py-3" : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
        <Link href="#" className="flex items-center gap-2 group">
          <Leaf className={`${isScrolled ? "text-green-700 group-hover:text-green-600" : "text-green-400 group-hover:text-green-300"} transition-colors`} size={28} />
          <span className={`${serif.className} font-bold text-2xl tracking-tight ${isScrolled ? "text-green-900" : "text-white"}`}>KisanAI</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link 
              key={link.name} 
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                isScrolled ? "text-gray-700 hover:text-green-700" : "text-white/90 hover:text-white"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        
{/* CTA */}

        <div className="hidden lg:flex items-center">
          <Link 
            href="/welcome"
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-full text-sm font-medium transition-all shadow-sm hover:shadow flex items-center gap-2"
          >
            Get Started 
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button 
          className={`lg:hidden p-2 ${isScrolled ? "text-gray-700" : "text-white"}`}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="lg:hidden absolute top-full left-0 w-full bg-white shadow-xl border-t border-gray-100 flex flex-col p-6 gap-4"
        >
          {navLinks.map((link) => (
            <Link 
              key={link.name} 
              href={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-base font-medium text-gray-800 py-2 border-b border-gray-50"
            >
              {link.name}
            </Link>
          ))}
          <Link 
            href="/welcome"
            onClick={() => setIsMobileMenuOpen(false)}
            className="bg-green-800 text-white px-6 py-3 rounded-xl text-center font-bold mt-2 flex justify-center items-center gap-2"
          >
            Get Started <ChevronRight size={18} />
          </Link>
        </motion.div>
      )}
    </header>
  );
}
