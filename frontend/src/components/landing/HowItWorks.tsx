"use client";

import React from "react";
import { motion } from "framer-motion";
import { Noto_Serif } from "next/font/google";
import { ClipboardEdit, Cpu, Combine, BellRing, ArrowRight, ArrowDown } from "lucide-react";

const serif = Noto_Serif({ subsets: ["latin"], weight: ["400", "700"] });

export function HowItWorksSection() {
  const steps = [
    {
      num: "01",
      icon: <ClipboardEdit size={24} />,
      title: "Create your profile",
      desc: "Sign in with your mobile number and set up your personal account in seconds."
    },
    {
      num: "02",
      icon: <Cpu size={24} />,
      title: "Tell KisanAI about your farm",
      desc: "Add your crop, soil type, and location so we can give you relevant guidance."
    },
    {
      num: "03",
      icon: <Combine size={24} />,
      title: "Explore your farm insights",
      desc: "Check your dashboard for weather updates, crop health status, and advisories."
    },
    {
      num: "04",
      icon: <BellRing size={24} />,
      title: "Make informed decisions",
      desc: "Use the insights and guidance to plan your farming activities with confidence."
    }
  ];

  return (
    <section id="how-it-works" className="py-24 bg-white border-y border-gray-200/50 relative">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="mb-16 text-center max-w-3xl mx-auto">
          <h2 className={`${serif.className} text-4xl md:text-5xl font-bold text-gray-900 mb-6`}>
            Getting started is simple.
          </h2>
          <p className="text-gray-600 text-lg">
            A simple process that turns complex agricultural data into clear, actionable farming decisions.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-4 lg:gap-6 mt-16">
          {steps.map((step, idx) => (
            <React.Fragment key={step.num}>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.15 }}
                className="flex-1 bg-white rounded-3xl p-8 border border-gray-200 shadow-sm relative w-full lg:w-auto hover:shadow-md transition-shadow z-10"
              >
                <div className="text-[4rem] font-black text-gray-200 absolute top-4 right-6 -z-10 select-none">
                  {step.num}
                </div>
                <div className="w-12 h-12 bg-green-50 text-green-700 rounded-2xl flex items-center justify-center mb-6 border border-green-100">
                  {step.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3 leading-snug">{step.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{step.desc}</p>
              </motion.div>

              {/* Arrow between steps */}
              {idx < steps.length - 1 && (
                <div className="text-gray-300 shrink-0 hidden lg:block">
                  <ArrowRight size={32} />
                </div>
              )}
              {idx < steps.length - 1 && (
                <div className="text-gray-300 shrink-0 lg:hidden my-2">
                  <ArrowDown size={32} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
