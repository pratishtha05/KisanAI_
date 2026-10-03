"use client";

import { Noto_Serif } from "next/font/google";
import { ChevronRight, Leaf } from "lucide-react";
import Link from "next/link";

const serif = Noto_Serif({ subsets: ["latin"], weight: ["400", "700"] });

export function FinalCTA() {
  return (
    <>
      {/* Final CTA */}
      <section className="py-24 relative overflow-hidden bg-green-900">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=2070&auto=format&fit=crop" 
            alt="Farm" 
            className="w-full h-full object-cover opacity-20 mix-blend-overlay" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-green-950/50 to-transparent" />
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <h2 className={`${serif.className} text-3xl md:text-4xl font-bold text-white mb-6 leading-tight`}>
            Make your next farm decision with KisanAI.
          </h2>
          <p className="text-green-50 text-lg md:text-xl max-w-xl mx-auto mb-10 opacity-90">
            Join a platform built specifically for your farm's unique needs.
          </p>
          <Link 
            href="/welcome" 
            className="inline-flex items-center gap-2 bg-white text-green-900 hover:bg-green-50 px-8 py-4 rounded-full font-bold transition-all shadow-xl hover:-translate-y-1"
          >
            Get Started 
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 py-6 border-t border-gray-900">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 text-gray-500">
            <Link href="#" className="flex items-center gap-2">
              <Leaf className="text-green-500" size={18} />
              <span className={`${serif.className} font-bold text-lg tracking-tight text-white`}>KisanAI</span>
            </Link>
            <span className="hidden md:inline text-gray-700">|</span>
            <p>© {new Date().getFullYear()} KisanAI Project. UIET.</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 font-medium text-gray-400">
            <Link href="#" className="hover:text-white transition-colors">Home</Link>
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#how-it-works" className="hover:text-white transition-colors">How It Works</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
