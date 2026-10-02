import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌱</span>
          <span className="font-bold text-xl text-green-700">KisanAI</span>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl font-extrabold text-gray-900 mb-6">
          Your smart farming companion.
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          KisanAI brings farm information, weather intelligence, crop health assistance, and personalized agricultural guidance into one simple platform.
        </p>
        
        <div className="flex justify-center gap-4">
          <Link href="/welcome">
            <Button size="lg" className="w-full sm:w-auto">Get Started</Button>
          </Link>
        </div>
        
        <div className="mt-24 grid md:grid-cols-3 gap-8 text-left">
          <div className="p-6 bg-green-50 rounded-2xl">
            <div className="text-3xl mb-4">🌤</div>
            <h3 className="font-bold text-lg mb-2">Weather Intelligence</h3>
            <p className="text-gray-600">Actionable advisories based on precise forecasts for your farm.</p>
          </div>
          <div className="p-6 bg-green-50 rounded-2xl">
            <div className="text-3xl mb-4">🤖</div>
            <h3 className="font-bold text-lg mb-2">AI Farm Advisor</h3>
            <p className="text-gray-600">Ask any question and get personalized guidance for your crop.</p>
          </div>
          <div className="p-6 bg-green-50 rounded-2xl">
            <div className="text-3xl mb-4">🌿</div>
            <h3 className="font-bold text-lg mb-2">Crop Health</h3>
            <p className="text-gray-600">Upload a leaf photo and let AI check for diseases instantly.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
