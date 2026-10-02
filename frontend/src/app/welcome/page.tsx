"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function WelcomePage() {
  const router = useRouter();
  const [isExiting, setIsExiting] = useState(false);

  const handleStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsExiting(true);
    setTimeout(() => {
      router.push("/language");
    }, 400);
  };

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div 
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="min-h-screen w-full relative overflow-hidden flex flex-col items-center justify-center bg-gray-900"
        >
          {/* Full Screen Background Image */}
          <motion.img 
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            src="/farm-background.jpg" 
            alt="Farm landscape at sunrise" 
            className="absolute inset-0 w-full h-full object-cover z-0"
          />

          {/* Dark overlay to make centered text perfectly readable */}
          <div className="absolute inset-0 bg-black/40 z-0"></div>

          {/* Centered Content */}
          <div className="relative z-10 flex flex-col items-center justify-center px-4 text-center mt-[-40px]">
            
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="text-6xl md:text-7xl text-white font-dancing drop-shadow-lg font-bold leading-tight mb-4"
            >
              Welcome to <br className="md:hidden" /> KisanAI
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="text-lg md:text-2xl text-gray-200 drop-shadow-md max-w-xl font-medium mb-12"
            >
              Your intelligent partner for modern, data-driven farming decisions.
            </motion.p>

            <motion.div
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ duration: 0.6, delay: 0.7 }}
            >
              <button 
                onClick={handleStart}
                className="flex items-center gap-3 bg-green-600 text-white px-10 md:px-12 py-4 rounded-full font-bold tracking-widest text-lg md:text-xl hover:bg-green-700 hover:scale-105 transition-all shadow-[0_8px_16px_rgba(0,0,0,0.6)] border-2 border-white/20 hover:cursor-pointer"
              >
                <span className="text-xl md:text-2xl"> GET STARTED</span>
              </button>
            </motion.div>
          </div>

        </motion.div>
      )}
    </AnimatePresence>
  );
}
