"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Leaf } from "lucide-react";
import { Noto_Serif } from "next/font/google";

const serif = Noto_Serif({ subsets: ["latin"], weight: ["400", "700"] });

export default function WelcomePage() {
  const router = useRouter();
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Automatically transition to language selection after a short delay
    const timer1 = setTimeout(() => {
      setIsExiting(true);
    }, 1000);

    const timer2 = setTimeout(() => {
      router.push("/language");
    }, 1500); 

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [router]);

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-50"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.1, type: "spring", bounce: 0.3 }}
            className="flex items-center gap-3"
          >
            <Leaf className="text-green-700" size={40} />
            <span className={`${serif.className} font-bold text-4xl tracking-tight text-green-900`}>
              KisanAI
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
