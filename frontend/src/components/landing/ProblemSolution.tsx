"use client";

import { motion } from "framer-motion";
import { Noto_Serif } from "next/font/google";
import { Cloud, ThermometerSun, Bug, LineChart } from "lucide-react";

const serif = Noto_Serif({ subsets: ["latin"], weight: ["400", "700"] });

export function ProblemSolutionSection() {
  return (
    <section className="py-24 bg-white relative overflow-hidden border-y border-gray-200/50">
      <div className="max-w-7xl mx-auto px-6 md:px-12 grid lg:grid-cols-2 gap-16 items-center">
        
        {/* Left: Problem Image with overlay nodes */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative h-[500px] rounded-[2.5rem] overflow-hidden shadow-xl"
        >
          <img 
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSmsyboL8r6TuUthakzpeAxeHCTsp_DNrLPLCK9C5-yBAx88DSOwQDJM-M&s=10https://img.magnific.com/premium-photo/indian-farmer-using-mobile-phone-agriculture-field_54391-2219.jpg" 
            alt="Farming environment"
            className="absolute inset-0 w-full h-full object-cover"
          />
        
        
        </motion.div>

        {/* Right: Copy */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <h2 className={`${serif.className} text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight`}>
            Farming decisions shouldn't have to be complicated.
          </h2>
          <p className="text-lg md:text-xl text-gray-600 mb-10 leading-relaxed">
            Farmers often need to consider multiple things at once: weather forecasts, crop conditions, soil moisture, and farming practices. When this information exists in different places, making decisions becomes much harder.
          </p>
          
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-full -z-10" />
            <h3 className={`${serif.className} text-2xl font-bold text-gray-900 mb-4`}>Meet KisanAI.</h3>
            <p className="text-gray-600 leading-relaxed">
              We bring your relevant farm information and decision-support tools together in one place, so you can focus on farming, not searching for answers.
            </p>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
