"use client";

import { motion } from "framer-motion";
import { Noto_Serif } from "next/font/google";
import { TrendingDown, ShieldCheck, Clock } from "lucide-react";

const serif = Noto_Serif({ subsets: ["latin"], weight: ["400", "700"] });

export function FarmerFirst() {
  return (
    <section className="py-24 bg-gray-50 border-y border-gray-200/50">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative h-[400px] lg:h-[600px] rounded-[2.5rem] overflow-hidden shadow-xl"
          >
             <img 
               src="https://static.vecteezy.com/system/resources/thumbnails/076/965/126/small/happy-indian-farmer-couple-standing-in-green-wheat-field-holding-rake-and-crops-under-clear-blue-sky-photo.jpeg" 
               alt="Farmer in the field" 
               className="object-cover w-full h-full absolute inset-0"
             />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <h2 className={`${serif.className} text-3xl md:text-4xl font-bold text-gray-900 mb-8 leading-tight`}>
              Farming is hard. We make the decisions easier.
            </h2>
            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="mt-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-700 text-white shadow-lg shadow-green-600/30">
                  <TrendingDown size={26} strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 text-xl mb-2">Reduce Input Costs</h4>
                  <p className="text-gray-600 text-lg leading-relaxed">Stop wasting water and fertilizer. By timing your applications perfectly with the weather, you save resources and money.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="mt-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-700 text-white shadow-lg shadow-green-600/30">
                  <ShieldCheck size={26} strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 text-xl mb-2">Protect Your Yield</h4>
                  <p className="text-gray-600 text-lg leading-relaxed">Catch crop diseases before they spread across your field. Early visual identification means faster, more effective treatment.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="mt-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-700 text-white shadow-lg shadow-green-600/30">
                  <Clock size={26} strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 text-xl mb-2">Save Valuable Time</h4>
                  <p className="text-gray-600 text-lg leading-relaxed">No more checking five different apps and websites. Get all your critical daily farm intelligence unified in one simple dashboard.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
