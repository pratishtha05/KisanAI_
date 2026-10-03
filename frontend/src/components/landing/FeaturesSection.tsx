"use client";

import { motion } from "framer-motion";
import { Noto_Serif } from "next/font/google";
import { CloudSun, Scan } from "lucide-react";

const serif = Noto_Serif({ subsets: ["latin"], weight: ["400", "700"] });

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-gray-50 overflow-hidden border-y border-gray-200/50">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="mb-16 text-center max-w-3xl mx-auto">
          <h2 className={`${serif.className} text-4xl md:text-5xl font-bold text-gray-900 mb-6`}>
            Everything you need to make better farm decisions.
          </h2>
          <p className="text-gray-600 text-lg">
            Powerful tools integrated into one simple workflow.
          </p>
        </div>

        {/* Carousel / Grid Container */}
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-12 scrollbar-hide md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
          
          {/* Feature 1: Weather */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="min-w-[85vw] sm:min-w-[400px] md:min-w-0 snap-center bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden flex flex-col group"
          >
            <div className="relative h-[250px] overflow-hidden">
              <img 
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTGaIbfxtWyCj9lIS-susOo9fveWWq1bbT5yOKQDmbDQWoHjZOktxFighc&s=10" 
                alt="Weather over farmland"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-black/20" />
              {/* Mock UI Overlay */}
              <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-lg">
                <div className="flex items-center gap-3">
                  <CloudSun size={24} className="text-amber-500" />
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">Rain expected tomorrow</h4>
                    <p className="text-xs text-gray-500">Consider delaying irrigation.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-8 flex-1 flex flex-col">
              <span className="text-xs font-bold text-green-700 uppercase tracking-wider mb-2 block">Weather & Advisories</span>
              <h3 className={`${serif.className} text-2xl font-bold text-gray-900 mb-3`}>
                Understand the weather, act on the farm.
              </h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                Receive useful farm-focused guidance instead of just looking at raw weather numbers. We help you connect the forecast to your actual farm planning.
              </p>
            </div>
          </motion.div>

          {/* Feature 2: Ask KisanAI */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="min-w-[85vw] sm:min-w-[400px] md:min-w-0 snap-center bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden flex flex-col group"
          >
            <div className="relative h-[250px] overflow-hidden">
              <img 
                src="https://media.istockphoto.com/id/1287866316/photo/close-up-of-farmer-hands-checking-the-crop-yield-and-pests-by-using-mobile-phone-concept-of.jpg?s=612x612&w=0&k=20&c=tvJmGDmFPqI20yz4WKjMtipemFcO4--xkM0jNtS5v0Q=" 
                alt="Farmer using phone"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              {/* Mock UI Overlay */}
              <div className="absolute inset-0 flex flex-col justify-end p-4 gap-2">
                <div className="self-end bg-green-100 text-green-900 p-3 rounded-2xl rounded-tr-sm text-xs font-medium shadow-sm max-w-[85%]">
                  Should I irrigate my wheat?
                </div>
                <div className="self-start bg-white text-gray-800 p-3 rounded-2xl rounded-tl-sm text-xs font-medium shadow-md max-w-[90%]">
                  Rain is expected tomorrow, so you may want to wait.
                </div>
              </div>
            </div>
            <div className="p-8 flex-1 flex flex-col">
              <span className="text-xs font-bold text-green-700 uppercase tracking-wider mb-2 block">Ask KisanAI</span>
              <h3 className={`${serif.className} text-2xl font-bold text-gray-900 mb-3`}>
                Intelligent farming guidance.
              </h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                Ask questions about your farm and receive easy-to-understand guidance. You can interact with the platform in a simple, conversational way.
              </p>
            </div>
          </motion.div>

          {/* Feature 3: Crop Health */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="min-w-[85vw] sm:min-w-[400px] md:min-w-0 snap-center bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden flex flex-col group"
          >
            <div className="relative h-[250px] overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=800&auto=format&fit=crop" 
                alt="Close up crop leaf"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-black/30" />
              {/* Mock UI Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white/95 backdrop-blur-md w-3/4 rounded-2xl p-4 shadow-xl text-center">
                   <Scan size={24} className="text-green-700 mx-auto mb-2" />
                   <p className="text-xs font-bold text-gray-900 mb-2">Analyzing crop...</p>
                   <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                      <motion.div 
                        animate={{ x: ["-100%", "100%", "-100%"] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="h-full bg-green-500 w-1/2 rounded-full"
                      />
                   </div>
                </div>
              </div>
            </div>
            <div className="p-8 flex-1 flex flex-col">
              <span className="text-xs font-bold text-green-700 uppercase tracking-wider mb-2 block">Crop Health</span>
              <h3 className={`${serif.className} text-2xl font-bold text-gray-900 mb-3`}>
                Identify issues from a photo.
              </h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                Upload a crop image and receive crop-health analysis through the Crop Health experience. Capture, upload, analyze, and understand what your plants might need.
              </p>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
