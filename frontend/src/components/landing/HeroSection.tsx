"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Noto_Serif } from "next/font/google";
const serif = Noto_Serif({ subsets: ["latin"], weight: ["400", "700"] });

export function HeroSection() {
  return (
    <>
      <section className="relative w-full h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
        {/* Full-width Background Image */}
        <img 
          src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2070&auto=format&fit=crop" 
          alt="Lush agricultural landscape"
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Overlays */}
        <div className="absolute inset-0 bg-black/30" />
        {/* Top gradient to ensure white Navbar text pops */}
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-black/50 to-transparent" />
        
        {/* Centered Content */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 max-w-4xl mx-auto px-6 flex flex-col items-center text-center mt-12"
        >
          <h1 className={`${serif.className} text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.2] text-white mb-6 drop-shadow-xl`}>
            Smarter decisions <br className="hidden md:block" />
            for every acre.
          </h1>
          
          <p className="text-base md:text-xl text-gray-50 mb-8 leading-relaxed max-w-2xl font-medium drop-shadow-md">
            KisanAI brings your farm information, weather insights, crop health assistance and intelligent guidance together in one simple platform.
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link 
              href="/welcome" 
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-full text-base font-bold transition-all shadow-xl hover:scale-105"
            >
              Get Started
            </Link>
            
          </div>
        </motion.div>
        {/* Bottom Indicators */}
        <div className="absolute bottom-0 left-0 right-0 w-full z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-20 pb-8">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row items-center justify-center md:divide-x divide-white/30 text-white/90">
              <div className="flex-1 w-full text-center py-3 text-xs md:text-sm font-medium uppercase tracking-widest">
                Farm-Specific Guidance
              </div>
              <div className="flex-1 w-full text-center py-3 text-xs md:text-sm font-medium uppercase tracking-widest">
                Actionable Advisories
              </div>
              <div className="flex-1 w-full text-center py-3 text-xs md:text-sm font-medium uppercase tracking-widest">
                Crop Health Intelligence
              </div>
              <div className="flex-1 w-full text-center py-3 text-xs md:text-sm font-medium uppercase tracking-widest">
                Farmer-Friendly Experience
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
