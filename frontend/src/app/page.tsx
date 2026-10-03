"use client";

import { Noto_Sans } from "next/font/google";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemSolutionSection } from "@/components/landing/ProblemSolution";
import { HowItWorksSection } from "@/components/landing/HowItWorks";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { FarmerFirst } from "@/components/landing/FarmerFirst";
import { FinalCTA } from "@/components/landing/FinalCTA";

const sans = Noto_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export default function LandingPage() {
  return (
    <div className={`min-h-screen bg-[#FDFBF7] text-gray-800 ${sans.className} overflow-x-hidden selection:bg-green-200 selection:text-green-900`}>
      <Navbar />
      <HeroSection />
      <ProblemSolutionSection />
      <FeaturesSection />
      <HowItWorksSection />
      <FarmerFirst />
      <FinalCTA />
    </div>
  );
}
